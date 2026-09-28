import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Asset } from '@/models/Asset';
import { Work } from '@/models/Work';
import { Inspection } from '@/models/Inspection';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import { Alert } from '@/models/Alert';
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

    // 1. Asset Counts by Class
    const assetsByClass = await Asset.aggregate([
      { $match: { ...scopeFilter, status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] } } },
      { $group: { _id: '$classCode', count: { $sum: 1 } } },
    ]);

    const countsMap: Record<string, number> = {};
    assetsByClass.forEach((item) => {
      countsMap[item._id] = item.count;
    });

    // 2. Road Length (km) by Category
    const roadSegments = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    }).select('linear attributes');

    let totalRoadLengthKm = 0;
    const roadLengthByCategory: Record<string, number> = {
      SH: 0,
      MDR: 0,
      ODR: 0,
      VR: 0,
      NH_AGENCY: 0,
      OTHER: 0,
    };

    roadSegments.forEach((seg) => {
      const lengthKm = (seg.linear?.lengthM || 0) / 1000;
      totalRoadLengthKm += lengthKm;
      const cat = (seg.attributes as any)?.category || (seg.linear?.routeCode?.startsWith('SH') ? 'SH' : 'MDR');
      if (roadLengthByCategory[cat] !== undefined) {
        roadLengthByCategory[cat] += lengthKm;
      } else {
        roadLengthByCategory.OTHER += lengthKm;
      }
    });

    // 3. Bridge Risk Summary & Watchlist (Top 10)
    const bridgeWatchlist = await Asset.find({
      ...scopeFilter,
      classCode: 'BRG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ riskScore: -1, conditionScore: 1 })
      .limit(10)
      .lean();

    const severeBridgesCount = await Asset.countDocuments({
      ...scopeFilter,
      classCode: 'BRG',
      riskScore: { $gte: 75 },
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    });

    const highBridgesCount = await Asset.countDocuments({
      ...scopeFilter,
      classCode: 'BRG',
      riskScore: { $gte: 50, $lt: 75 },
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    });

    // 4. Road Priority List (Top 10)
    const roadPriorityList = await Asset.find({
      ...scopeFilter,
      classCode: 'SEG',
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .populate('divisionId', 'name code')
      .populate('subdivisionId', 'name code')
      .sort({ priorityScore: -1, conditionScore: 1 })
      .limit(10)
      .lean();

    // 5. Inspection stats
    const now = new Date();
    const overdueInspectionsCount = await Asset.countDocuments({
      ...scopeFilter,
      nextInspectionDue: { $lt: now, $ne: null },
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    });

    const totalActiveAssets = await Asset.countDocuments({
      ...scopeFilter,
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    });

    const inspectedCount = await Asset.countDocuments({
      ...scopeFilter,
      lastInspectionAt: { $gte: new Date(now.getFullYear(), 0, 1) }, // Inspected this year
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    });

    const inspectionCompliancePercent =
      totalActiveAssets > 0 ? Math.round((inspectedCount / totalActiveAssets) * 100) : 0;

    // 6. Pending Approvals & Alerts
    const pendingApprovalsCount = await ApprovalRequest.countDocuments({ status: 'PENDING' });
    const activeAlertsCount = await Alert.countDocuments({ isResolved: false });
    const safetyClosuresCount = await Asset.countDocuments({
      ...scopeFilter,
      status: { $in: ['RESTRICTED', 'CLOSED', 'UNSAFE'] },
    });

    // 7. Map Data (All geo-located assets for Leaflet map preview)
    const mapAssets = await Asset.find({
      ...scopeFilter,
      geometry: { $ne: null },
      status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
    })
      .select('assetId name classCode status condition conditionScore riskScore priorityScore geometry operationalStatus linear attributes')
      .limit(300)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          totalAssets: totalActiveAssets,
          roads: countsMap['RDS'] || 0,
          segments: countsMap['SEG'] || 0,
          bridges: countsMap['BRG'] || 0,
          buildings: countsMap['BLD'] || 0,
          land: countsMap['LND'] || 0,
          machinery: countsMap['MCH'] || 0,
        },
        roadStats: {
          totalRoadLengthKm: Math.round(totalRoadLengthKm * 10) / 10,
          byCategory: roadLengthByCategory,
        },
        bridgeStats: {
          severe: severeBridgesCount,
          high: highBridgesCount,
        },
        compliance: {
          overdueInspections: overdueInspectionsCount,
          inspectedThisYear: inspectedCount,
          inspectionCompliancePercent,
          pendingApprovals: pendingApprovalsCount,
          activeAlerts: activeAlertsCount,
          safetyClosures: safetyClosuresCount,
        },
        bridgeWatchlist,
        roadPriorityList,
        mapAssets,
      },
    });
  } catch (error: any) {
    return serverError(error.message);
  }
}
