import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Work } from '@/models/Work';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import {
  getSessionUser,
  buildScopeFilter,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  canWrite,
} from '@/lib/rbac';
import { computeEventHash } from '@/lib/hash';
import { WorkCreateSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const scopeFilter = buildScopeFilter(user);
    const query: Record<string, any> = { ...scopeFilter };

    const assetId = searchParams.get('assetId');
    if (assetId) query.assetId = assetId;

    const status = searchParams.get('status');
    if (status) query.status = status;

    const type = searchParams.get('type');
    if (type) query.type = type;

    const [works, total] = await Promise.all([
      Work.find(query)
        .populate('assetId', 'name assetId classCode status condition')
        .populate('divisionId', 'name code')
        .populate('subdivisionId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Work.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: works,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user)) return forbidden();

    const body = await req.json();
    const parsed = WorkCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    const data = parsed.data;
    await connectDB();

    const asset = await Asset.findById(data.assetId);
    if (!asset) return badRequest('Asset not found');

    const work = await Work.create({
      ...data,
      assetCode: asset.assetId,
      subdivisionId: asset.subdivisionId,
      divisionId: asset.divisionId,
      circleId: asset.circleId,
      createdBy: user.id,
      status: 'APPROVED',
    });

    // Append AssetEvent
    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';
    const now = new Date();

    const eventPayload = {
      assetCode: asset.assetId,
      type: 'WORK_SANCTIONED',
      description: `Work order sanctioned (${data.type}) for ₹${data.estimatedCost}. Contractor: ${data.contractor || 'TBD'}.`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: { workId: work._id, type: data.type, estimatedCost: data.estimatedCost },
    };

    await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'WORK_SANCTIONED',
      description: eventPayload.description,
      data: eventPayload.data,
      userId: user.id,
      userName: user.name,
      prevHash,
      hash: computeEventHash(prevHash, eventPayload),
    });

    return NextResponse.json({
      success: true,
      message: 'Work order created successfully',
      data: work,
    }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
