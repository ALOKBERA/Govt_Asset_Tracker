import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import {
  getSessionUser,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  hasMinRole,
} from '@/lib/rbac';
import { computeEventHash } from '@/lib/hash';
import { ApprovalDecisionSchema } from '@/lib/validators';
import type { Role } from '@/lib/constants';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = await req.json();
    const parsed = ApprovalDecisionSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    const { decision, note } = parsed.data;

    await connectDB();
    const approval = await ApprovalRequest.findById(id);
    if (!approval) return notFound('Approval request not found');

    if (approval.status !== 'PENDING') {
      return badRequest(`Approval request is already ${approval.status}`);
    }

    // MAKER-CHECKER ENFORCEMENT: Requester CANNOT approve their own request!
    if (approval.requesterId.toString() === user.id) {
      return forbidden();
    }

    // Role level check: decider must have at least the required role
    if (!hasMinRole(user.role, approval.requiredLevel as Role)) {
      return forbidden();
    }

    const now = new Date();
    approval.status = decision;
    approval.decisionNote = note;
    approval.deciderId = user.id as any;
    approval.deciderName = user.name;
    approval.decidedAt = now;
    await approval.save();

    const asset = await Asset.findById(approval.assetId);
    if (!asset) return notFound('Asset not found');

    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';

    if (decision === 'APPROVED') {
      // Execute the requested transition
      const fromStatus = asset.status;
      const toStatus = approval.requestedTransition?.to || 'IN_SERVICE';
      asset.status = toStatus;
      await asset.save();

      const eventPayload = {
        assetCode: asset.assetId,
        type: 'APPROVAL_APPROVED',
        fromStatus,
        toStatus,
        description: `Approval granted by ${user.name} (${user.role}). Transitioned to ${toStatus}. Note: ${note}`,
        userId: user.id,
        userName: user.name,
        createdAtTimestamp: now.getTime(),
        data: { approvalId: approval._id, decisionNote: note },
      };

      await AssetEvent.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: 'APPROVAL_APPROVED',
        fromStatus,
        toStatus,
        description: eventPayload.description,
        data: eventPayload.data,
        userId: user.id,
        userName: user.name,
        prevHash,
        hash: computeEventHash(prevHash, eventPayload),
      });

      return NextResponse.json({
        success: true,
        message: `Approval request APPROVED and asset transitioned to ${toStatus}`,
        data: approval,
      });
    } else {
      // REJECTED
      const eventPayload = {
        assetCode: asset.assetId,
        type: 'APPROVAL_REJECTED',
        description: `Approval rejected by ${user.name} (${user.role}). Note: ${note}`,
        userId: user.id,
        userName: user.name,
        createdAtTimestamp: now.getTime(),
        data: { approvalId: approval._id, decisionNote: note },
      };

      await AssetEvent.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: 'APPROVAL_REJECTED',
        description: eventPayload.description,
        data: eventPayload.data,
        userId: user.id,
        userName: user.name,
        prevHash,
        hash: computeEventHash(prevHash, eventPayload),
      });

      return NextResponse.json({
        success: true,
        message: `Approval request REJECTED`,
        data: approval,
      });
    }
  } catch (error: any) {
    return serverError(error.message);
  }
}
