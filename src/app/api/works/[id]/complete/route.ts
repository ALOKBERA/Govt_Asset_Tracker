import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Work } from '@/models/Work';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { Category } from '@/models/Category';
import {
  getSessionUser,
  badRequest,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  canWrite,
} from '@/lib/rbac';
import { computeEventHash } from '@/lib/hash';
import { WorkCompleteSchema } from '@/lib/validators';

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
    const parsed = WorkCompleteSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    const { actualCost, actualCompletion, dlpMonths } = parsed.data;
    const completionDate = actualCompletion ? new Date(actualCompletion) : new Date();

    await connectDB();
    const work = await Work.findById(id);
    if (!work) return notFound('Work not found');

    const asset = await Asset.findById(work.assetId);
    if (!asset) return notFound('Associated asset not found');

    // Calculate DLP End Date
    const months = dlpMonths !== undefined ? dlpMonths : work.dlpMonths || 36;
    const dlpEndDate = new Date(completionDate.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // Update Work
    work.status = 'COMPLETED';
    work.actualCost = actualCost;
    work.actualCompletion = completionDate;
    work.dlpMonths = months;
    work.dlpEndDate = dlpEndDate;
    work.progressPercent = 100;
    await work.save();

    const fromStatus = asset.status;

    // Update Asset based on work type
    if (work.type === 'PERIODIC_RENEWAL' || work.type === 'REHABILITATION') {
      asset.lastRenewalDate = completionDate;
      const category: any = await Category.findOne({ classCode: asset.classCode as any });
      const renewalYears = category?.renewalCycleYears || 7;
      asset.nextRenewalDue = new Date(completionDate.getTime() + renewalYears * 365 * 24 * 60 * 60 * 1000);
      asset.status = 'DEFECT_LIABILITY';
      asset.dlpEndDate = dlpEndDate;
      asset.conditionScore = 5;
      asset.condition = 'VERY_GOOD';
    } else if (work.type === 'NEW_CONSTRUCTION' && asset.status === 'UNDER_CONSTRUCTION') {
      asset.status = 'DEFECT_LIABILITY';
      asset.dlpEndDate = dlpEndDate;
      asset.conditionScore = 5;
      asset.condition = 'VERY_GOOD';
    } else if (work.type === 'SPECIAL_REPAIR' || work.type === 'ROUTINE') {
      asset.conditionScore = Math.min(5, (asset.conditionScore || 3) + 1);
      asset.condition = asset.conditionScore >= 4 ? 'GOOD' : 'FAIR';
    }

    await asset.save();

    // Log AssetEvent
    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';
    const now = new Date();

    const eventPayload = {
      assetCode: asset.assetId,
      type: 'WORK_COMPLETED',
      fromStatus,
      toStatus: asset.status,
      description: `Work order (${work.type}) completed for ₹${actualCost}. Defect Liability Period active until ${dlpEndDate.toLocaleDateString('en-IN')}.`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: {
        workId: work._id,
        actualCost,
        dlpEndDate,
        dlpMonths: months,
      },
    };

    await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'WORK_COMPLETED',
      fromStatus,
      toStatus: asset.status,
      description: eventPayload.description,
      data: eventPayload.data,
      userId: user.id,
      userName: user.name,
      prevHash,
      hash: computeEventHash(prevHash, eventPayload),
    });

    return NextResponse.json({
      success: true,
      message: 'Work marked as completed. Defect liability clock started.',
      data: { work, asset },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
