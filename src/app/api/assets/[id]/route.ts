import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { Inspection } from '@/models/Inspection';
import { Work } from '@/models/Work';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import {
  getSessionUser,
  canAccessRecord,
  canWrite,
  notFound,
  unauthorized,
  forbidden,
  serverError,
} from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { id } = await params;
    await connectDB();

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId ? { $or: [{ _id: id }, { assetId: id }] } : { assetId: id };

    const asset = await Asset.findOne(query)
      .populate('subdivisionId', 'name code')
      .populate('divisionId', 'name code')
      .populate('circleId', 'name code')
      .populate('parentAssetId', 'name assetId classCode')
      .lean();

    if (!asset) return notFound('Asset not found');

    if (
      !canAccessRecord(user, {
        subdivisionId: (asset.subdivisionId as any)?._id?.toString() || asset.subdivisionId?.toString(),
        divisionId: (asset.divisionId as any)?._id?.toString() || asset.divisionId?.toString(),
        circleId: (asset.circleId as any)?._id?.toString() || asset.circleId?.toString(),
      })
    ) {
      return forbidden();
    }

    // Fetch child assets (e.g. road segments or building components)
    const childAssets = await Asset.find({ parentAssetId: asset._id })
      .sort({ 'linear.startChainageM': 1, createdAt: 1 })
      .lean();

    // Fetch inspections
    const inspections = await Inspection.find({ assetId: asset._id })
      .sort({ date: -1 })
      .limit(20)
      .lean();

    // Fetch works
    const works = await Work.find({ assetId: asset._id })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch pending approval requests
    const pendingApprovals = await ApprovalRequest.find({
      assetId: asset._id,
      status: 'PENDING',
    }).lean();

    // Fetch event timeline (chronological)
    const events = await AssetEvent.find({ assetId: asset._id })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        asset,
        childAssets,
        inspections,
        works,
        pendingApprovals,
        events,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user)) return forbidden();

    const { id } = await params;
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

    const body = await req.json();

    // Protect immutable fields
    delete body.assetId;
    delete body._id;
    delete body.createdAt;
    delete body.status; // Status must use /transition endpoint

    Object.assign(asset, body);
    await asset.save();

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    return serverError(error.message);
  }
}
