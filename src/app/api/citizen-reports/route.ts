import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { CitizenReport } from '@/models/Alert';
import { Asset } from '@/models/Asset';
import { getSessionUser, badRequest, serverError } from '@/lib/rbac';
import { CitizenReportCreateSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const query: Record<string, any> = {};
    if (status) query.status = status;
    if (user.role === 'DIVISION_ENGINEER' && user.divisionId) {
      query.divisionId = user.divisionId;
    }

    const reports = await CitizenReport.find(query)
      .populate('assetId', 'name assetId classCode status condition')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    return serverError(error.message);
  }
}

// Public Citizen Issue Report submission (from QR page or direct)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CitizenReportCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    // Anti-spam honeypot verification
    if (parsed.data.honeypot && parsed.data.honeypot.length > 0) {
      return badRequest('Spam submission detected');
    }

    await connectDB();

    let assetIdObj: any = undefined;
    let subdivisionId: any = undefined;
    let divisionId: any = undefined;

    if (parsed.data.assetId || parsed.data.assetCode) {
      const asset: any = await Asset.findOne({
        $or: [{ _id: parsed.data.assetId }, { assetId: parsed.data.assetCode }],
      });
      if (asset) {
        assetIdObj = asset._id;
        subdivisionId = asset.subdivisionId;
        divisionId = asset.divisionId;
      }
    }

    const report: any = await CitizenReport.create({
      assetId: assetIdObj,
      assetCode: parsed.data.assetCode,
      description: parsed.data.description,
      photoUrl: parsed.data.photoUrl,
      gpsLat: parsed.data.gpsLat,
      gpsLng: parsed.data.gpsLng,
      reporterName: parsed.data.reporterName || 'Citizen',
      reporterPhone: parsed.data.reporterPhone,
      status: 'NEW',
      subdivisionId,
      divisionId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Grievance / Issue report logged successfully. Reference ID generated.',
        reportId: report._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return serverError(error.message);
  }
}

// Staff update status / resolve report
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { reportId, status, resolution } = body;
    if (!reportId || !status) return badRequest('reportId and status are required');

    await connectDB();
    const report = await CitizenReport.findById(reportId);
    if (!report) return badRequest('Report not found');

    report.status = status;
    if (resolution) report.resolution = resolution;
    if (status === 'IN_PROGRESS') report.assignedTo = user.id as any;
    await report.save();

    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    return serverError(error.message);
  }
}
