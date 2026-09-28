import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { getSessionUser, buildScopeFilter, unauthorized, serverError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const scopeFilter = buildScopeFilter(user);

    // Fetch road segments
    const segments = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .populate('parentAssetId', 'name assetId')
      .populate('divisionId', 'name code')
      .populate('circleId', 'name code')
      .sort({ 'circleId': 1, 'divisionId': 1, 'linear.startChainageM': 1 })
      .lean();

    const reportRows = segments.map((seg) => {
      const lengthM = seg.linear?.lengthM || 0;
      const lengthKm = Math.round((lengthM / 1000) * 100) / 100;
      const widthM = (seg.attributes as any)?.carriagewayWidth || 7.0;
      const areaM2 = Math.round(lengthM * widthM);
      const surfaceType = (seg.attributes as any)?.surfaceType || 'BT';
      const category = (seg.attributes as any)?.category || 'SH';

      return {
        assetId: seg.assetId,
        roadName: (seg.parentAssetId as any)?.name || seg.name,
        segmentName: seg.name,
        routeCode: seg.linear?.routeCode || 'SH',
        category,
        circle: (seg.circleId as any)?.name || 'State Circle',
        division: (seg.divisionId as any)?.name || 'Division',
        lengthKm,
        carriagewayWidthM: widthM,
        surfaceAreaM2: areaM2,
        surfaceType,
        condition: seg.condition || 'FAIR',
        conditionScore: seg.conditionScore || 3,
        lastRenewalDate: seg.lastRenewalDate,
        nextRenewalDue: seg.nextRenewalDue,
        status: seg.status,
      };
    });

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
