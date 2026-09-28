import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { OrgUnit } from '@/models/OrgUnit';
import { getSessionUser, buildScopeFilter, unauthorized, serverError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const scopeFilter = buildScopeFilter(user);

    // Get all divisions
    const divisions = await OrgUnit.find({ type: 'DIVISION', isActive: true }).lean();

    const now = new Date();
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const reportRows = await Promise.all(
      divisions.map(async (div) => {
        const total = await Asset.countDocuments({
          ...scopeFilter,
          divisionId: div._id,
          status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
        });

        const inspected = await Asset.countDocuments({
          ...scopeFilter,
          divisionId: div._id,
          lastInspectionAt: { $gte: thisYear },
          status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
        });

        const overdue = await Asset.countDocuments({
          ...scopeFilter,
          divisionId: div._id,
          nextInspectionDue: { $lt: now, $ne: null },
          status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
        });

        const complianceRate = total > 0 ? Math.round((inspected / total) * 100) : 100;

        return {
          divisionCode: div.code,
          divisionName: div.name,
          totalAssets: total,
          inspectedThisYear: inspected,
          overdueInspections: overdue,
          complianceRatePercent: complianceRate,
          status: complianceRate >= 80 ? 'EXCELLENT' : complianceRate >= 60 ? 'MODERATE' : 'POOR',
        };
      })
    );

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
