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

    const buildings = await Asset.find({
      ...scopeFilter,
      classCode: 'BLD',
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ occupantDepartment: 1, name: 1 })
      .lean();

    const reportRows = buildings.map((b) => ({
      assetId: b.assetId,
      name: b.name,
      buildingType: b.subType || 'OFFICE',
      occupantDepartment: b.occupantDepartment || (b.attributes as any)?.occupantDepartment || 'R&B Department',
      ownerDepartment: b.ownerDepartment || 'R&B Department',
      maintenanceResponsibility: b.maintenanceResponsibility || 'RNB',
      division: (b.divisionId as any)?.name || 'Division',
      subdivision: (b.subdivisionId as any)?.name || 'Sub-division',
      status: b.status,
      condition: b.condition || 'GOOD',
      conditionScore: b.conditionScore || 4,
      plinthAreaSqM: (b.attributes as any)?.plinthArea || 0,
      floors: (b.attributes as any)?.floors || 1,
      fireNocExpiry: (b.attributes as any)?.fireNocExpiry || 'N/A',
      liftInspectionDue: (b.attributes as any)?.liftInspectionDue || 'N/A',
      structuralAuditDue: (b.attributes as any)?.structuralAuditDue || 'N/A',
    }));

    return NextResponse.json({ success: true, data: reportRows });
  } catch (error: any) {
    return serverError(error.message);
  }
}
