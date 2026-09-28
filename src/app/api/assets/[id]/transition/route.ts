import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import { Alert } from '@/models/Alert';
import {
  getSessionUser,
  canAccessRecord,
  canWrite,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  getRequiredApprovalLevel,
} from '@/lib/rbac';
import { isValidTransition, isSafetyException } from '@/lib/lifecycle';
import { computeEventHash } from '@/lib/hash';
import { StatusTransitionSchema } from '@/lib/validators';
import type { AssetStatus } from '@/lib/constants';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user)) return forbidden();

    const { id } = await params;
    const body = await req.json();
    const parsed = StatusTransitionSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    const { toStatus, reason, photoUrl, estimatedValue } = parsed.data;

    await connectDB();
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { $or: [{ _id: id }, { assetId: id }] } : { assetId: id };

    const asset = await Asset.findOne(query);
    if (!asset) return notFound('Asset not found');

    if (
      !canAccessRecord(user, {
        subdivisionId: asset.subdivisionId?.toString(),
        divisionId: asset.divisionId?.toString(),
        circleId: asset.circleId?.toString(),
      })
    ) {
      return forbidden();
    }

    const currentStatus = asset.status as AssetStatus;
    const rule = isValidTransition(asset.classCode, currentStatus, toStatus as AssetStatus);

    if (!rule) {
      return badRequest(
        `Invalid lifecycle transition: Cannot transition ${asset.classCode} from ${currentStatus} to ${toStatus}.`
      );
    }

    const now = new Date();

    // Case 1: Transition requires maker-checker approval
    if (rule.requiresApproval) {
      const requiredLevel = getRequiredApprovalLevel(estimatedValue || 0);

      const approval = await ApprovalRequest.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: `TRANSITION_${toStatus}`,
        requestedTransition: { from: currentStatus, to: toStatus },
        reason,
        estimatedValue: estimatedValue || 0,
        requesterId: user.id,
        requesterName: user.name,
        requiredLevel,
        status: 'PENDING',
      });

      // Log event that approval was requested
      const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
      const prevHash = lastEvent?.hash || 'GENESIS';

      const payload = {
        assetCode: asset.assetId,
        type: 'APPROVAL_REQUESTED',
        fromStatus: currentStatus,
        toStatus,
        description: `Approval requested to transition to ${toStatus} (${reason}) by ${user.name}`,
        userId: user.id,
        userName: user.name,
        createdAtTimestamp: now.getTime(),
        data: { approvalId: approval._id, requiredLevel, estimatedValue },
      };

      const hash = computeEventHash(prevHash, payload);

      await AssetEvent.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: 'APPROVAL_REQUESTED',
        fromStatus: currentStatus,
        toStatus,
        description: payload.description,
        data: payload.data,
        userId: user.id,
        userName: user.name,
        prevHash,
        hash,
      });

      return NextResponse.json({
        success: true,
        requiresApproval: true,
        message: `Approval request submitted to ${requiredLevel}`,
        data: approval,
      });
    }

    // Case 2: Immediate Safety Exception (Bridge restricted/closed or building unsafe)
    if (rule.isImmediateSafety || isSafetyException(toStatus as AssetStatus)) {
      const from = asset.status;
      asset.status = toStatus;
      if (toStatus === 'RESTRICTED') asset.operationalStatus = 'RESTRICTED';
      if (toStatus === 'CLOSED') asset.operationalStatus = 'CLOSED';
      if (photoUrl) asset.photos.unshift(photoUrl);

      await asset.save();

      // Create event with safety closure flag
      const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
      const prevHash = lastEvent?.hash || 'GENESIS';

      const payload = {
        assetCode: asset.assetId,
        type: 'SAFETY_CLOSURE',
        fromStatus: from,
        toStatus,
        description: `Immediate safety action taken: Status set to ${toStatus}. Reason: ${reason} (Requires Executive Engineer ratification)`,
        userId: user.id,
        userName: user.name,
        createdAtTimestamp: now.getTime(),
        data: { photoUrl, requiresRatification: true },
      };

      const hash = computeEventHash(prevHash, payload);

      const event = await AssetEvent.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: 'SAFETY_CLOSURE',
        fromStatus: from,
        toStatus,
        description: payload.description,
        data: payload.data,
        userId: user.id,
        userName: user.name,
        prevHash,
        hash,
      });

      // Raise active alert for ratification
      await Alert.create({
        type: 'CLOSURE_NOT_RATIFIED',
        assetId: asset._id,
        assetCode: asset.assetId,
        message: `Emergency safety action ${toStatus} on ${asset.assetId} by ${user.name} requires formal EE ratification`,
        dedupeKey: `RATIFICATION_NEEDED_${event._id}`,
        divisionId: asset.divisionId,
        circleId: asset.circleId,
      });

      return NextResponse.json({
        success: true,
        message: `Asset ${asset.assetId} marked as ${toStatus} immediately. Executive Engineer ratification alert raised.`,
        data: asset,
      });
    }

    // Case 3: Standard Direct Transition
    const from = asset.status;
    asset.status = toStatus;
    if (toStatus === 'IN_SERVICE') asset.operationalStatus = 'OPEN';
    await asset.save();

    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';

    const payload = {
      assetCode: asset.assetId,
      type: 'STATUS_CHANGE',
      fromStatus: from,
      toStatus,
      description: `Status changed from ${from} to ${toStatus}: ${reason}`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: { notes: body.notes },
    };

    const hash = computeEventHash(prevHash, payload);

    await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'STATUS_CHANGE',
      fromStatus: from,
      toStatus,
      description: payload.description,
      data: payload.data,
      userId: user.id,
      userName: user.name,
      prevHash,
      hash,
    });

    return NextResponse.json({
      success: true,
      message: `Asset status successfully transitioned to ${toStatus}`,
      data: asset,
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
