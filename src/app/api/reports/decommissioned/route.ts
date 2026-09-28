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

    const disposedAssets = await Asset.find({
      ...scopeFilter,
      status: { $in: ['CONDEMNATION_PENDING', 'DECOMMISSIONED', 'DISPOSED', 'MISSING'] },
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ updatedAt: -1 })
      .lean();

    const reportRows = disposedAssets.map((a) => ({
      assetId: a.assetId,
      name: a.name,
      classCode: a.classCode,
      status: a.status,
      division: (a.divisionId as any)?.name || 'Division',
      subdivision: (a.subdivisionId as any)?.name || 'Sub-division',
      initialCost: a.acquisition?.cost || 0,
      constructionYear: a.acquisition?.year || 'N/A',
      lastCondition: a.condition || 'CRITICAL',
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
