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

    const bridges = await Asset.find({
      ...scopeFilter,
      classCode: 'BRG',
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .populate('circleId', 'name code')
      .sort({ riskScore: -1, conditionScore: 1 })
      .lean();

    const reportRows = bridges.map((b) => ({
      assetId: b.assetId,
      name: b.name,
      subType: b.subType || 'MAJOR_BRIDGE',
      riverObstacle: (b.attributes as any)?.riverObstacle || 'River',
      circle: (b.circleId as any)?.name || 'Circle',
      division: (b.divisionId as any)?.name || 'Division',
      subdivision: (b.subdivisionId as any)?.name || 'Sub-division',
      status: b.status,
      operationalStatus: b.operationalStatus || 'OPEN',
      condition: b.condition || 'FAIR',
      conditionScore: b.conditionScore || 3,
      riskScore: b.riskScore || 0,
      constructionYear: b.acquisition?.year || 'N/A',
      lastInspected: b.lastInspectionAt,
      nextInspectionDue: b.nextInspectionDue,
      loadRestriction: (b.attributes as any)?.loadRestriction || 'None',
      isScourProne: (b.attributes as any)?.isScourProne ? 'Yes' : 'No',
      ibmsId: b.externalRefs?.ibmsBridgeId || 'N/A',
    }));

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
