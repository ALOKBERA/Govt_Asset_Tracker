import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Inspection } from '@/models/Inspection';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { Category } from '@/models/Category';
import {
  getSessionUser,
  buildScopeFilter,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
  canWrite,
} from '@/lib/rbac';
import { conditionBand } from '@/lib/constants';
import { computeEventHash } from '@/lib/hash';
import { calculateBridgeRisk, calculateRoadPriority } from '@/lib/scoring';
import { InspectionCreateSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const scopeFilter = buildScopeFilter(user);
    const query: Record<string, any> = { ...scopeFilter };

    const assetId = searchParams.get('assetId');
    if (assetId) query.assetId = assetId;

    const type = searchParams.get('type');
    if (type) query.type = type;

    const driveId = searchParams.get('driveId');
    if (driveId) query.driveId = driveId;

    const contractorLiable = searchParams.get('contractorLiable');
    if (contractorLiable === 'true') {
      query['defects.contractorLiable'] = true;
    }

    const [inspections, total] = await Promise.all([
      Inspection.find(query)
        .populate('assetId', 'name assetId classCode condition status geometry')
        .populate('subdivisionId', 'name code')
        .populate('divisionId', 'name code')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inspection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: inspections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user)) return forbidden();

    const body = await req.json();
    const parsed = InspectionCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed', parsed.error.format());

    const data = parsed.data;
    await connectDB();

    const asset = await Asset.findById(data.assetId);
    if (!asset) return badRequest('Asset not found');

    const inspDate = new Date(data.date);
    const band = conditionBand(data.conditionScore);

    // Auto flag contractorLiable if asset is currently in DEFECT_LIABILITY
    const isDlp = asset.status === 'DEFECT_LIABILITY';
    const defects = data.defects.map((d) => ({
      ...d,
      contractorLiable: isDlp ? true : d.contractorLiable,
    }));

    // Create Inspection record
    const inspection = await Inspection.create({
      ...data,
      defects,
      assetCode: asset.assetId,
      inspectorId: user.id,
      inspectorName: user.name,
      date: inspDate,
      subdivisionId: asset.subdivisionId,
      divisionId: asset.divisionId,
      circleId: asset.circleId,
    });

    // Calculate next inspection due date from Category template
    const category: any = await Category.findOne({ classCode: asset.classCode as any });
    let nextDue: Date | null = null;
    if (category && category.inspectionSchedule && category.inspectionSchedule.length > 0) {
      const match = category.inspectionSchedule.find((s: any) => s.type === data.type) || category.inspectionSchedule[0];
      const freqMonths = match.frequencyMonths || 6;
      nextDue = new Date(inspDate.getTime() + freqMonths * 30 * 24 * 60 * 60 * 1000);
    } else {
      nextDue = new Date(inspDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
    }

    // Update Asset condition and dates
    asset.conditionScore = data.conditionScore;
    asset.condition = band;
    asset.lastInspectionAt = inspDate;
    asset.nextInspectionDue = nextDue;

    // Recalculate scores
    if (asset.classCode === 'BRG') {
      const critCount = defects.filter((d) => d.severity === 'CRITICAL' || d.severity === 'HIGH').length;
      const risk = calculateBridgeRisk({
        conditionScore: data.conditionScore,
        constructionYear: asset.acquisition?.year,
        designLifeYears: category?.designLifeYears || 50,
        lastInspectionAt: inspDate,
        hasLoadRestriction: asset.operationalStatus === 'RESTRICTED',
        isScourProne: (asset.attributes as any)?.isScourProne,
        openCriticalDefectsCount: critCount,
      });
      asset.riskScore = risk.totalScore;
    } else if (asset.classCode === 'SEG') {
      const highDefects = defects.filter((d) => d.severity === 'HIGH' || d.severity === 'CRITICAL').length;
      const priority = calculateRoadPriority({
        conditionScore: data.conditionScore,
        lastRenewalDate: asset.lastRenewalDate,
        nextRenewalDue: asset.nextRenewalDue,
        category: (asset.attributes as any)?.category || 'SH',
        openHighDefectsCount: highDefects,
      });
      asset.priorityScore = priority.totalScore;
    }

    await asset.save();

    // Append AssetEvent with hash
    const lastEvent = await AssetEvent.findOne({ assetId: asset._id }).sort({ createdAt: -1 });
    const prevHash = lastEvent?.hash || 'GENESIS';
    const now = new Date();

    const eventPayload = {
      assetCode: asset.assetId,
      type: 'INSPECTION',
      description: `Inspection (${data.type}) completed by ${user.name}. Condition: ${band} (${data.conditionScore}/5). ${defects.length} defect(s) logged.`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: {
        inspectionId: inspection._id,
        conditionScore: data.conditionScore,
        recommendedAction: data.recommendedAction,
        defectsCount: defects.length,
      },
    };

    await AssetEvent.create({
      assetId: asset._id,
      assetCode: asset.assetId,
      type: 'INSPECTION',
      description: eventPayload.description,
      data: eventPayload.data,
      userId: user.id,
      userName: user.name,
      prevHash,
      hash: computeEventHash(prevHash, eventPayload),
    });

    return NextResponse.json({
      success: true,
      message: 'Inspection submitted successfully and asset condition updated',
      data: inspection,
    }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
