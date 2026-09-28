import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { getSessionUser, buildScopeFilter, unauthorized, serverError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const scopeFilter = buildScopeFilter(user);

    const { searchParams } = new URL(req.url);
    const classCode = searchParams.get('classCode');
    const districtCode = searchParams.get('districtCode');
    const status = searchParams.get('status');

    const query: Record<string, any> = { ...scopeFilter };
    if (classCode) query.classCode = classCode;
    if (districtCode) query.districtCode = districtCode;
    if (status) query.status = status;

    const assets = await Asset.find(query)
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .populate('circleId', 'name code')
      .sort({ classCode: 1, assetId: 1 })
      .lean();

    const flattened = assets.map((a) => ({
      Asset_ID: a.assetId,
      Name: a.name,
      Class: a.classCode,
      Sub_Type: a.subType || '',
      Status: a.status,
      Condition: a.condition || '',
      Condition_Score: a.conditionScore || '',
      Operational_Status: a.operationalStatus || 'OPEN',
      Circle: (a.circleId as any)?.name || '',
      Division: (a.divisionId as any)?.name || '',
      Subdivision: (a.subdivisionId as any)?.name || '',
      District: a.districtCode,
      Route_Code: a.linear?.routeCode || '',
      Start_Chainage_M: a.linear?.startChainageM ?? '',
      End_Chainage_M: a.linear?.endChainageM ?? '',
      Length_M: a.linear?.lengthM ?? '',
      Construction_Cost: a.acquisition?.cost ?? '',
      Construction_Year: a.acquisition?.year ?? '',
      Last_Inspected: a.lastInspectionAt ? new Date(a.lastInspectionAt).toISOString().slice(0, 10) : '',
      Next_Inspection_Due: a.nextInspectionDue ? new Date(a.nextInspectionDue).toISOString().slice(0, 10) : '',
      Last_Renewal_Date: a.lastRenewalDate ? new Date(a.lastRenewalDate).toISOString().slice(0, 10) : '',
      Next_Renewal_Due: a.nextRenewalDue ? new Date(a.nextRenewalDue).toISOString().slice(0, 10) : '',
      DLP_End_Date: a.dlpEndDate ? new Date(a.dlpEndDate).toISOString().slice(0, 10) : '',
      Risk_Score: a.riskScore ?? '',
      Priority_Score: a.priorityScore ?? '',
      Tag_Status: a.tagStatus || 'TAG_PENDING',
    }));

    const csv = Papa.unparse(flattened);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rnb_assets_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
