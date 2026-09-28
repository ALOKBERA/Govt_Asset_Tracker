import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { getSessionUser, notFound, unauthorized, serverError } from '@/lib/rbac';
import { verifyEventChain } from '@/lib/hash';

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

    const asset = await Asset.findOne(query).select('_id assetId name');
    if (!asset) return notFound('Asset not found');

    const events = await AssetEvent.find({ assetId: asset._id })
      .sort({ createdAt: 1 })
      .lean();

    const verification = verifyEventChain(events as any);

    return NextResponse.json({
      success: true,
      data: {
        assetId: asset.assetId,
        verification,
        events,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
