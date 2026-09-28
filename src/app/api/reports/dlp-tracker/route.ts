import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { Work } from '@/models/Work';
import { Inspection } from '@/models/Inspection';
import { getSessionUser, buildScopeFilter, unauthorized, serverError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const scopeFilter = buildScopeFilter(user);

    // Assets currently in DLP
    const dlpAssets = await Asset.find({
      ...scopeFilter,
      status: 'DEFECT_LIABILITY',
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ dlpEndDate: 1 })
      .lean();

    const reportRows = await Promise.all(
      dlpAssets.map(async (a) => {
        // Find latest completed work
        const work = await Work.findOne({
          assetId: a._id,
          status: 'COMPLETED',
        }).sort({ actualCompletion: -1 });

        // Find defects flagged contractor liable
        const inspections = await Inspection.find({ assetId: a._id });
        let liableDefectsCount = 0;
        inspections.forEach((i) => {
          liableDefectsCount += i.defects.filter((d) => d.contractorLiable).length;
        });

        const now = new Date();
        const dlpEnd = a.dlpEndDate ? new Date(a.dlpEndDate) : null;
        const daysRemaining = dlpEnd ? Math.ceil((dlpEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          assetId: a.assetId,
          name: a.name,
          classCode: a.classCode,
          division: (a.divisionId as any)?.name || 'Division',
          subdivision: (a.subdivisionId as any)?.name || 'Sub-division',
          contractor: work?.contractor || 'Contractor',
          workType: work?.type || 'CONSTRUCTION',
          workCost: work?.actualCost || work?.estimatedCost || 0,
          completionDate: work?.actualCompletion || work?.updatedAt,
          dlpEndDate: a.dlpEndDate,
          daysRemaining,
          isExpiringSoon: daysRemaining <= 60 && daysRemaining > 0,
          isExpired: daysRemaining <= 0,
          lastInspected: a.lastInspectionAt,
          condition: a.condition || 'GOOD',
          contractorLiableDefects: liableDefectsCount,
        };
      })
    );

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
