import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { Inspection } from '@/models/Inspection';
import {
  getSessionUser,
  buildScopeFilter,
  unauthorized,
  serverError,
} from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    await connectDB();
    const scopeFilter = buildScopeFilter(user);
    const now = new Date();
    const oneYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const twoYears = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    const threeYears = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());

    // 1. Road Priority List
    const roadPriorities = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ priorityScore: -1, conditionScore: 1 })
      .limit(50)
      .lean();

    // 2. Bridge Watchlist
    const bridgeWatchlist = await Asset.find({
      ...scopeFilter,
      classCode: 'BRG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ riskScore: -1, conditionScore: 1 })
      .limit(50)
      .lean();

    // 3. Maintenance Backlog & Budget Need (from recent inspection recommendations)
    const backlogInspections = await Inspection.find({
      ...scopeFilter,
      recommendedAction: { $nin: ['NONE', ''] },
      estimatedCost: { $gt: 0 },
    })
      .populate('assetId', 'name assetId classCode condition status divisionId')
      .populate('divisionId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const backlogByAction: Record<string, { count: number; totalCost: number }> = {};
    const backlogByClass: Record<string, { count: number; totalCost: number }> = {};
    let totalBacklogCost = 0;

    backlogInspections.forEach((insp) => {
      const action = insp.recommendedAction;
      const cost = insp.estimatedCost || 0;
      const cls = (insp.assetId as any)?.classCode || 'OTHER';

      totalBacklogCost += cost;

      if (!backlogByAction[action]) backlogByAction[action] = { count: 0, totalCost: 0 };
      backlogByAction[action].count += 1;
      backlogByAction[action].totalCost += cost;

      if (!backlogByClass[cls]) backlogByClass[cls] = { count: 0, totalCost: 0 };
      backlogByClass[cls].count += 1;
      backlogByClass[cls].totalCost += cost;
    });

    // 4. Renewal Forecast (Next 1, 2, 3 Years for Road Segments)
    const yr1Renewals = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      nextRenewalDue: { $gte: now, $lte: oneYear },
      status: { $in: ['IN_SERVICE', 'UNDER_MAINTENANCE'] },
    }).populate('divisionId', 'name code').lean();

    const yr2Renewals = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      nextRenewalDue: { $gt: oneYear, $lte: twoYears },
      status: { $in: ['IN_SERVICE', 'UNDER_MAINTENANCE'] },
    }).populate('divisionId', 'name code').lean();

    const yr3Renewals = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      nextRenewalDue: { $gt: twoYears, $lte: threeYears },
      status: { $in: ['IN_SERVICE', 'UNDER_MAINTENANCE'] },
    }).populate('divisionId', 'name code').lean();

    const yr1CostEstimate = yr1Renewals.reduce((sum, r) => sum + ((r.linear?.lengthM || 1000) / 1000) * 1500000, 0); // ₹15L/km approx
    const yr2CostEstimate = yr2Renewals.reduce((sum, r) => sum + ((r.linear?.lengthM || 1000) / 1000) * 1650000, 0);
    const yr3CostEstimate = yr3Renewals.reduce((sum, r) => sum + ((r.linear?.lengthM || 1000) / 1000) * 1800000, 0);

    return NextResponse.json({
      success: true,
      data: {
        roadPriorities,
        bridgeWatchlist,
        backlog: {
          totalCost: totalBacklogCost,
          byAction: backlogByAction,
          byClass: backlogByClass,
          items: backlogInspections,
        },
        renewalForecast: {
          year1: { count: yr1Renewals.length, totalKm: yr1Renewals.reduce((s, r) => s + (r.linear?.lengthM || 0) / 1000, 0), estimatedCost: yr1CostEstimate, items: yr1Renewals },
          year2: { count: yr2Renewals.length, totalKm: yr2Renewals.reduce((s, r) => s + (r.linear?.lengthM || 0) / 1000, 0), estimatedCost: yr2CostEstimate, items: yr2Renewals },
          year3: { count: yr3Renewals.length, totalKm: yr3Renewals.reduce((s, r) => s + (r.linear?.lengthM || 0) / 1000, 0), estimatedCost: yr3CostEstimate, items: yr3Renewals },
        },
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
