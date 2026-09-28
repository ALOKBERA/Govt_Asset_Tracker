import connectDB from './db';
import { Asset } from '@/models/Asset';
import { Work } from '@/models/Work';
import { ApprovalRequest } from '@/models/ApprovalRequest';
import { Alert } from '@/models/Alert';

export interface AlertGenerationResult {
  generated: number;
  existing: number;
  totalActive: number;
}

/**
 * Scans assets, works, inspections, approvals to generate and deduplicate system alerts
 */
export async function scanAndGenerateAlerts(): Promise<AlertGenerationResult> {
  await connectDB();

  const now = new Date();
  const nowMs = now.getTime();
  const in15Days = new Date(nowMs + 15 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(nowMs + 60 * 24 * 60 * 60 * 1000);
  const in180Days = new Date(nowMs + 180 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(nowMs - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);

  let generated = 0;
  let existing = 0;

  const alertsToUpsert: Array<{
    type: string;
    assetId?: any;
    assetCode?: string;
    message: string;
    dedupeKey: string;
    divisionId?: any;
    circleId?: any;
  }> = [];

  // 1. Overdue Inspections
  const overdueAssets = await Asset.find({
    nextInspectionDue: { $lt: now, $ne: null },
    status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
  }).select('assetId name nextInspectionDue divisionId circleId classCode');

  for (const a of overdueAssets) {
    const daysOverdue = Math.floor((nowMs - new Date(a.nextInspectionDue!).getTime()) / (1000 * 60 * 60 * 24));
    alertsToUpsert.push({
      type: 'INSPECTION_OVERDUE',
      assetId: a._id,
      assetCode: a.assetId,
      message: `Inspection overdue by ${daysOverdue} days for ${a.assetId} (${a.name})`,
      dedupeKey: `INSPECTION_OVERDUE_${a.assetId}_${now.getFullYear()}_${now.getMonth() + 1}`,
      divisionId: a.divisionId,
      circleId: a.circleId,
    });
  }

  // 2. Inspection Due Soon (next 15 days)
  const dueSoonAssets = await Asset.find({
    nextInspectionDue: { $gte: now, $lte: in15Days },
    status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
  }).select('assetId name nextInspectionDue divisionId circleId');

  for (const a of dueSoonAssets) {
    alertsToUpsert.push({
      type: 'INSPECTION_DUE_SOON',
      assetId: a._id,
      assetCode: a.assetId,
      message: `Inspection due soon on ${new Date(a.nextInspectionDue!).toLocaleDateString('en-IN')} for ${a.assetId}`,
      dedupeKey: `INSPECTION_DUE_SOON_${a.assetId}_${now.toISOString().slice(0, 10)}`,
      divisionId: a.divisionId,
      circleId: a.circleId,
    });
  }

  // 3. DLP Ending within 60 days without inspection in last 90 days
  const dlpEndingAssets = await Asset.find({
    status: 'DEFECT_LIABILITY',
    dlpEndDate: { $gte: now, $lte: in60Days },
  }).select('assetId name dlpEndDate lastInspectionAt divisionId circleId');

  for (const a of dlpEndingAssets) {
    const hasRecentInspection = a.lastInspectionAt && new Date(a.lastInspectionAt) >= ninetyDaysAgo;
    if (!hasRecentInspection) {
      alertsToUpsert.push({
        type: 'DLP_ENDING_NO_INSPECTION',
        assetId: a._id,
        assetCode: a.assetId,
        message: `DLP expires on ${new Date(a.dlpEndDate!).toLocaleDateString('en-IN')} for ${a.assetId}. Mandatory final inspection pending!`,
        dedupeKey: `DLP_EXPIRY_INSPECTION_${a.assetId}_${now.getFullYear()}_${now.getMonth() + 1}`,
        divisionId: a.divisionId,
        circleId: a.circleId,
      });
    }
  }

  // 4. Periodic Renewal Overdue (Road Segments)
  const renewalOverdueSegments = await Asset.find({
    classCode: 'SEG',
    nextRenewalDue: { $lt: now, $ne: null },
    status: { $in: ['IN_SERVICE', 'UNDER_MAINTENANCE'] },
  }).select('assetId name nextRenewalDue divisionId circleId linear');

  for (const s of renewalOverdueSegments) {
    alertsToUpsert.push({
      type: 'RENEWAL_OVERDUE',
      assetId: s._id,
      assetCode: s.assetId,
      message: `Periodic resurfacing/renewal overdue on ${s.assetId} (${s.name})`,
      dedupeKey: `RENEWAL_OVERDUE_${s.assetId}_${now.getFullYear()}`,
      divisionId: s.divisionId,
      circleId: s.circleId,
    });
  }

  // 5. Critical / Poor Assets with No Open Work
  const poorAssets = await Asset.find({
    conditionScore: { $lte: 2, $ne: null },
    status: { $in: ['IN_SERVICE', 'RESTRICTED', 'CLOSED', 'UNSAFE'] },
    updatedAt: { $lt: thirtyDaysAgo },
  }).select('assetId name conditionScore condition divisionId circleId');

  for (const p of poorAssets) {
    const openWork = await Work.findOne({
      assetId: p._id,
      status: { $in: ['PLANNED', 'APPROVED', 'IN_PROGRESS'] },
    });
    if (!openWork) {
      alertsToUpsert.push({
        type: 'POOR_ASSET_NO_WORK',
        assetId: p._id,
        assetCode: p.assetId,
        message: `Asset ${p.assetId} in ${p.condition || 'CRITICAL'} condition has no maintenance work scheduled (>30 days)`,
        dedupeKey: `POOR_NO_WORK_${p.assetId}_${now.getFullYear()}_${now.getMonth() + 1}`,
        divisionId: p.divisionId,
        circleId: p.circleId,
      });
    }
  }

  // 6. Safety Closures awaiting Ratification
  const unratifiedClosures = await Asset.find({
    status: { $in: ['RESTRICTED', 'CLOSED', 'UNSAFE'] },
  }).select('assetId name status operationalStatus divisionId circleId');

  for (const c of unratifiedClosures) {
    alertsToUpsert.push({
      type: 'CLOSURE_NOT_RATIFIED',
      assetId: c._id,
      assetCode: c.assetId,
      message: `Safety status ${c.status} on ${c.assetId} (${c.name}) requires formal EE ratification`,
      dedupeKey: `UNRATIFIED_CLOSURE_${c.assetId}_${c.status}`,
      divisionId: c.divisionId,
      circleId: c.circleId,
    });
  }

  // 7. Approvals Pending > 7 Days
  const longPendingApprovals = await ApprovalRequest.find({
    status: 'PENDING',
    createdAt: { $lt: sevenDaysAgo },
  }).select('assetCode type requesterName createdAt');

  for (const ap of longPendingApprovals) {
    const days = Math.floor((nowMs - new Date(ap.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    alertsToUpsert.push({
      type: 'APPROVAL_PENDING_LONG',
      assetCode: ap.assetCode,
      message: `Approval request (${ap.type}) for ${ap.assetCode} by ${ap.requesterName} pending for ${days} days`,
      dedupeKey: `APPROVAL_STALLED_${ap._id}`,
    });
  }

  // 8. Building Fire NOC & Lift Compliance
  const buildings = await Asset.find({
    classCode: 'BLD',
    status: { $nin: ['DECOMMISSIONED', 'DISPOSED'] },
  }).select('assetId name attributes divisionId circleId');

  for (const b of buildings) {
    const fireNoc = (b.attributes as any)?.fireNocExpiry;
    if (fireNoc && new Date(fireNoc) < in60Days) {
      alertsToUpsert.push({
        type: 'FIRE_NOC_EXPIRY',
        assetId: b._id,
        assetCode: b.assetId,
        message: `Fire NOC expiring on ${new Date(fireNoc).toLocaleDateString('en-IN')} for ${b.assetId} (${b.name})`,
        dedupeKey: `FIRE_NOC_${b.assetId}_${new Date(fireNoc).getFullYear()}`,
        divisionId: b.divisionId,
        circleId: b.circleId,
      });
    }
  }

  // Upsert all alerts
  for (const alertData of alertsToUpsert) {
    const res = await Alert.updateOne(
      { dedupeKey: alertData.dedupeKey },
      { $setOnInsert: { ...alertData, isResolved: false } },
      { upsert: true }
    );
    if (res.upsertedCount > 0) {
      generated++;
    } else {
      existing++;
    }
  }

  const totalActive = await Alert.countDocuments({ isResolved: false });

  return {
    generated,
    existing,
    totalActive,
  };
}
