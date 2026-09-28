import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { InspectionDrive, Inspection } from '@/models/Inspection';
import { Asset } from '@/models/Asset';
import { getSessionUser, badRequest, unauthorized, serverError } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');

    const query: Record<string, any> = {};
    if (year) query.year = parseInt(year);

    const drives = await InspectionDrive.find(query)
      .populate('divisionId', 'name code')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich drives with completion stats
    const enriched = await Promise.all(
      drives.map(async (drive) => {
        const totalTargetQuery: Record<string, any> = {
          status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
        };
        if (drive.divisionId) totalTargetQuery.divisionId = (drive.divisionId as any)._id;
        if (drive.targetAssetClass) totalTargetQuery.classCode = drive.targetAssetClass;

        const totalTarget = await Asset.countDocuments(totalTargetQuery);
        const completedCount = await Inspection.countDocuments({ driveId: drive._id });

        return {
          ...drive,
          totalTarget,
          completedCount,
          progressPercent: totalTarget > 0 ? Math.round((completedCount / totalTarget) * 100) : 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const body = await req.json();
    if (!body.name || !body.windowStart || !body.windowEnd) {
      return badRequest('Name, windowStart and windowEnd are required');
    }

    await connectDB();
    const drive = await InspectionDrive.create({
      ...body,
      createdBy: user.id,
      year: body.year || new Date().getFullYear(),
    });

    return NextResponse.json({ success: true, data: drive }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
