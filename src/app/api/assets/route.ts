import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { AssetEvent } from '@/models/AssetEvent';
import { Category } from '@/models/Category';
import {
  getSessionUser,
  buildScopeFilter,
  badRequest,
  unauthorized,
  serverError,
  canWrite,
} from '@/lib/rbac';
import { generateAssetId } from '@/lib/ids';
import { computeEventHash } from '@/lib/hash';
import { AssetCreateSchema } from '@/lib/validators';
import { checkChainageOverlap } from '@/lib/chainage';
import { calculateRoadPriority } from '@/lib/scoring';

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

    // Filters
    const search = searchParams.get('search');
    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ name: reg }, { assetId: reg }, { 'linear.routeCode': reg }];
    }

    const classCode = searchParams.get('classCode');
    if (classCode) query.classCode = classCode;

    const districtCode = searchParams.get('districtCode');
    if (districtCode) query.districtCode = districtCode;

    const divisionId = searchParams.get('divisionId');
    if (divisionId) query.divisionId = divisionId;

    const subdivisionId = searchParams.get('subdivisionId');
    if (subdivisionId) query.subdivisionId = subdivisionId;

    const status = searchParams.get('status');
    if (status) query.status = status;

    const condition = searchParams.get('condition');
    if (condition) query.condition = condition;

    const parentAssetId = searchParams.get('parentAssetId');
    if (parentAssetId) query.parentAssetId = parentAssetId;

    const inspectionOverdue = searchParams.get('inspectionOverdue');
    if (inspectionOverdue === 'true') {
      query.nextInspectionDue = { $lt: new Date(), $ne: null };
      query.status = { $nin: ['DECOMMISSIONED', 'DISPOSED'] };
    }

    const dlpActive = searchParams.get('dlpActive');
    if (dlpActive === 'true') {
      query.status = 'DEFECT_LIABILITY';
    }

    // Bounding box for Map queries [minLng, minLat, maxLng, maxLat]
    const bbox = searchParams.get('bbox');
    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        query.geometry = {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
          },
        };
      }
    }

    const [assets, total] = await Promise.all([
      Asset.find(query)
        .populate('subdivisionId', 'name code')
        .populate('divisionId', 'name code')
        .populate('parentAssetId', 'name assetId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Asset.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: assets,
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
    if (!canWrite(user)) return badRequest('Auditors cannot register or modify assets');

    const body = await req.json();
    const parsed = AssetCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Validation failed', parsed.error.format());
    }

    const data = parsed.data;
    await connectDB();

    // 1. Duplicate Checks
    // Check A: Same class + name + district
    const duplicateName = await Asset.findOne({
      classCode: data.classCode,
      districtCode: data.districtCode,
      name: new RegExp(`^${data.name.trim()}$`, 'i'),
    });
    if (duplicateName) {
      return badRequest(
        `Duplicate asset warning: An asset with name "${data.name}" in district ${data.districtCode} already exists (${duplicateName.assetId}).`,
        { existingAssetId: duplicateName.assetId }
      );
    }

    // Check B: Serial/Registration number check
    const regNo = (data.attributes as any)?.registrationNumber || (data.attributes as any)?.serialNumber;
    if (regNo) {
      const duplicateReg = await Asset.findOne({
        $or: [
          { 'attributes.registrationNumber': regNo },
          { 'attributes.serialNumber': regNo },
        ],
      });
      if (duplicateReg) {
        return badRequest(
          `Duplicate registration/serial warning: Serial/Reg "${regNo}" is already registered to ${duplicateReg.assetId}.`,
          { existingAssetId: duplicateReg.assetId }
        );
      }
    }

    // Check C: Road Segment Chainage Overlap
    if (data.classCode === 'SEG' && data.parentAssetId && data.linear) {
      const existingSegments = await Asset.find({
        classCode: 'SEG',
        parentAssetId: data.parentAssetId,
      }).select('linear name assetId');

      const existingRanges = existingSegments
        .filter((s) => s.linear?.startChainageM !== undefined && s.linear?.endChainageM !== undefined)
        .map((s) => ({
          startM: s.linear!.startChainageM,
          endM: s.linear!.endChainageM,
        }));

      const overlap = checkChainageOverlap(
        { startM: data.linear.startChainageM, endM: data.linear.endChainageM },
        existingRanges
      );

      if (overlap.hasOverlap) {
        return badRequest(
          `Chainage overlap detected: Range ${data.linear.startChainageM}m - ${data.linear.endChainageM}m overlaps with existing segment on the same road.`,
          { overlap: overlap.overlappingRange }
        );
      }
    }

    // 2. Generate unique immutable Asset ID
    const assetId = await generateAssetId(data.classCode, data.districtCode);

    // 3. Set default inspection schedule from Category template
    const category = await Category.findOne({ classCode: data.classCode });
    let nextInspectionDue: Date | null = null;
    let nextRenewalDue: Date | null = null;

    const now = new Date();
    if (category && category.inspectionSchedule && category.inspectionSchedule.length > 0) {
      const defaultFreq = category.inspectionSchedule[0].frequencyMonths || 6;
      nextInspectionDue = new Date(now.getTime() + defaultFreq * 30 * 24 * 60 * 60 * 1000);
    }

    if (data.classCode === 'SEG') {
      const renewalYears = category?.renewalCycleYears || 7;
      nextRenewalDue = new Date(now.getTime() + renewalYears * 365 * 24 * 60 * 60 * 1000);
    }

    // Initial priority score if road segment
    let priorityScore: number | null = null;
    if (data.classCode === 'SEG') {
      const priority = calculateRoadPriority({
        conditionScore: 5,
        nextRenewalDue,
        category: (data.attributes as any)?.category || 'SH',
      });
      priorityScore = priority.totalScore;
    }

    // 4. Create Asset
    const newAsset = await Asset.create({
      ...data,
      assetId,
      conditionScore: 5,
      condition: 'VERY_GOOD',
      nextInspectionDue,
      nextRenewalDue,
      priorityScore,
    });

    // 5. Append Genesis AssetEvent with SHA-256 Hash
    const genesisPayload = {
      assetCode: assetId,
      type: 'CREATED',
      toStatus: data.status,
      description: `Asset registered in system by ${user.name} (${user.role})`,
      userId: user.id,
      userName: user.name,
      createdAtTimestamp: now.getTime(),
      data: { initialStatus: data.status, classCode: data.classCode },
    };
    const genesisHash = computeEventHash('GENESIS', genesisPayload);

    await AssetEvent.create({
      assetId: newAsset._id,
      assetCode: assetId,
      type: 'CREATED',
      toStatus: data.status,
      description: genesisPayload.description,
      data: genesisPayload.data,
      userId: user.id,
      userName: user.name,
      prevHash: 'GENESIS',
      hash: genesisHash,
    });

    return NextResponse.json({ success: true, data: newAsset }, { status: 201 });
  } catch (error: any) {
    return serverError(error.message);
  }
}
