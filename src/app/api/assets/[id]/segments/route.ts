import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import {
  getSessionUser,
  canAccessRecord,
  canWrite,
  notFound,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from '@/lib/rbac';
import { generateAssetId } from '@/lib/ids';
import { computeEventHash } from '@/lib/hash';
import { checkChainageOverlap, formatSegmentLabel } from '@/lib/chainage';
import { SegmentSplitSchema } from '@/lib/validators';

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

    // Action A: Split existing road segment
    if (body.action === 'split') {
      if (asset.classCode !== 'SEG') {
        return badRequest('Only road segments can be split');
      }

      const parsed = SegmentSplitSchema.safeParse(body);
      if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

      const { splitChainageM, newSegmentNameA, newSegmentNameB, coordinatesA, coordinatesB } = parsed.data;

      const startM = asset.linear?.startChainageM ?? 0;
      const endM = asset.linear?.endChainageM ?? 0;

      if (splitChainageM <= startM || splitChainageM >= endM) {
        return badRequest(
          `Split chainage (${splitChainageM}m) must be strictly between start (${startM}m) and end (${endM}m)`
        );
      }

      const routeCode = asset.linear?.routeCode || 'SH';
      const districtCode = asset.districtCode;

      // Generate 2 new segment IDs
      const idA = await generateAssetId('SEG', districtCode);
      const idB = await generateAssetId('SEG', districtCode);

      const lengthA = splitChainageM - startM;
      const lengthB = endM - splitChainageM;

      // Create segment A
      const segA = await Asset.create({
        ...asset.toObject(),
        _id: new mongoose.Types.ObjectId(),
        assetId: idA,
        name: newSegmentNameA || formatSegmentLabel(routeCode, startM, splitChainageM),
        parentAssetId: asset.parentAssetId,
        linear: {
          routeCode,
          startChainageM: startM,
          endChainageM: splitChainageM,
          lengthM: lengthA,
        },
        geometry: coordinatesA
          ? { type: 'LineString', coordinates: coordinatesA }
          : asset.geometry,
        status: asset.status,
      });

      // Create segment B
      const segB = await Asset.create({
        ...asset.toObject(),
        _id: new mongoose.Types.ObjectId(),
        assetId: idB,
        name: newSegmentNameB || formatSegmentLabel(routeCode, splitChainageM, endM),
        parentAssetId: asset.parentAssetId,
        linear: {
          routeCode,
          startChainageM: splitChainageM,
          endChainageM: endM,
          lengthM: lengthB,
        },
        geometry: coordinatesB
          ? { type: 'LineString', coordinates: coordinatesB }
          : asset.geometry,
        status: asset.status,
      });

      // Mark original segment as DECOMMISSIONED (split into A & B)
      const prevStatus = asset.status;
      asset.status = 'DECOMMISSIONED';
      await asset.save();

      // Log event on old segment
      const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
      const prevHash = lastEvent?.hash || 'GENESIS';
      const now = new Date();

      const splitPayload = {
        assetCode: asset.assetId,
        type: 'SEGMENT_SPLIT',
        fromStatus: prevStatus,
        toStatus: 'DECOMMISSIONED',
        description: `Segment split at Km ${splitChainageM}m into ${idA} and ${idB}`,
        userId: user.id,
        userName: user.name,
        createdAtTimestamp: now.getTime(),
        data: { newSegments: [idA, idB], splitChainageM },
      };

      await AssetEvent.create({
        assetId: asset._id,
        assetCode: asset.assetId,
        type: 'SEGMENT_SPLIT',
        fromStatus: prevStatus,
        toStatus: 'DECOMMISSIONED',
        description: splitPayload.description,
        data: splitPayload.data,
        userId: user.id,
        userName: user.name,
        prevHash,
        hash: computeEventHash(prevHash, splitPayload),
      });

      return NextResponse.json({
        success: true,
        message: `Segment ${asset.assetId} successfully split into ${idA} and ${idB}`,
        data: { segmentA: segA, segmentB: segB },
      });
    }

    return badRequest('Invalid action');
  } catch (error: any) {
    return serverError(error.message);
  }
}
