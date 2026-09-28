import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { notFound, serverError } from '@/lib/rbac';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    await connectDB();

    const asset = await Asset.findOne({ assetId })
      .populate('subdivisionId', 'name')
      .populate('divisionId', 'name')
      .populate('circleId', 'name')
      .lean();

    if (!asset) return notFound('Government asset not found or invalid QR code');

    // Safe public projection (no sensitive internal audit details)
    const publicData = {
      assetId: asset.assetId,
      name: asset.name,
      classCode: asset.classCode,
      subType: asset.subType,
      status: asset.status,
      operationalStatus: asset.operationalStatus || 'OPEN',
      condition: asset.condition,
      conditionScore: asset.conditionScore,
      circle: (asset.circleId as any)?.name,
      division: (asset.divisionId as any)?.name,
      subdivision: (asset.subdivisionId as any)?.name,
      lastInspectionAt: asset.lastInspectionAt,
      tagStatus: asset.tagStatus,
      ownership: asset.ownership || 'Government of Gujarat - R&B Department',
      linear: asset.linear,
      photos: asset.photos?.slice(0, 3) || [],
      loadRestriction: (asset.attributes as any)?.loadRestriction,
      riverObstacle: (asset.attributes as any)?.riverObstacle,
      occupantDepartment: asset.occupantDepartment,
    };

    return NextResponse.json({ success: true, data: publicData });
  } catch (error: any) {
    return serverError(error.message);
  }
}
