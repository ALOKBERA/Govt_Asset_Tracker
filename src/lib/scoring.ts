import { RiskBand } from './constants';

export interface RoadPriorityBreakdown {
  conditionPenalty: number; // Max 40
  renewalOverduePenalty: number; // Max 25
  trafficImportanceWeight: number; // Max 15
  defectsPenalty: number; // Max 15
  noWorkPenalty: number; // Max 5
  totalScore: number; // 0 - 100
  explanation: string[];
}

export function calculateRoadPriority(params: {
  conditionScore?: number | null;
  lastRenewalDate?: Date | null;
  nextRenewalDue?: Date | null;
  renewalCycleYears?: number;
  category?: string; // SH, MDR, ODR, VR, NH_AGENCY
  trafficClass?: string; // HEAVY, MEDIUM, LIGHT
  openHighDefectsCount?: number;
  hasOpenWork?: boolean;
}): RoadPriorityBreakdown {
  const explanation: string[] = [];

  // 1. Condition Penalty (Max 40)
  let conditionPenalty = 0;
  const score = params.conditionScore ?? 3;
  if (score <= 1) {
    conditionPenalty = 40;
    explanation.push('Critical condition (Score 1/5): +40 pts');
  } else if (score <= 2) {
    conditionPenalty = 30;
    explanation.push('Poor condition (Score 2/5): +30 pts');
  } else if (score <= 3) {
    conditionPenalty = 15;
    explanation.push('Fair condition (Score 3/5): +15 pts');
  } else {
    conditionPenalty = 0;
  }

  // 2. Renewal Overdue Penalty (Max 25)
  let renewalOverduePenalty = 0;
  if (params.nextRenewalDue) {
    const dueTime = new Date(params.nextRenewalDue).getTime();
    const now = Date.now();
    if (now > dueTime) {
      const daysOverdue = Math.floor((now - dueTime) / (1000 * 60 * 60 * 24));
      const factor = Math.min(daysOverdue / 365, 2.5); // Caps at 2.5 years
      renewalOverduePenalty = Math.round(Math.min(factor * 10, 25));
      explanation.push(`Resurfacing overdue by ${daysOverdue} days: +${renewalOverduePenalty} pts`);
    }
  }

  // 3. Traffic / Importance Weight (Max 15)
  let trafficImportanceWeight = 5;
  const cat = params.category?.toUpperCase() || 'VR';
  if (cat === 'SH' || cat === 'EXPRESSWAY' || cat === 'NH_AGENCY') {
    trafficImportanceWeight = 15;
    explanation.push(`High corridor priority (${cat}): +15 pts`);
  } else if (cat === 'MDR') {
    trafficImportanceWeight = 10;
    explanation.push('Major District Road (MDR): +10 pts');
  } else {
    trafficImportanceWeight = 5;
    explanation.push('Local / Village Road: +5 pts');
  }

  // 4. Open Defects Penalty (Max 15)
  const highDefects = params.openHighDefectsCount || 0;
  const defectsPenalty = Math.min(highDefects * 5, 15);
  if (defectsPenalty > 0) {
    explanation.push(`${highDefects} unresolved high/critical defects: +${defectsPenalty} pts`);
  }

  // 5. No Open Work Penalty (Max 5)
  let noWorkPenalty = 0;
  if (!params.hasOpenWork && (score <= 3 || renewalOverduePenalty > 0)) {
    noWorkPenalty = 5;
    explanation.push('No sanctioned or planned repair work in pipeline: +5 pts');
  }

  const totalScore = Math.min(
    100,
    Math.round(conditionPenalty + renewalOverduePenalty + trafficImportanceWeight + defectsPenalty + noWorkPenalty)
  );

  return {
    conditionPenalty,
    renewalOverduePenalty,
    trafficImportanceWeight,
    defectsPenalty,
    noWorkPenalty,
    totalScore,
    explanation,
  };
}

export interface BridgeRiskBreakdown {
  conditionScorePenalty: number; // Max 35
  agePenalty: number; // Max 20
  inspectionOverduePenalty: number; // Max 15
  loadRestrictionPenalty: number; // Max 10
  scourPenalty: number; // Max 10
  criticalDefectsPenalty: number; // Max 10
  totalScore: number; // 0 - 100
  band: RiskBand;
  explanation: string[];
}

export function calculateBridgeRisk(params: {
  conditionScore?: number | null;
  constructionYear?: number | null;
  designLifeYears?: number;
  lastInspectionAt?: Date | null;
  hasLoadRestriction?: boolean;
  isScourProne?: boolean;
  openCriticalDefectsCount?: number;
}): BridgeRiskBreakdown {
  const explanation: string[] = [];

  // 1. Condition Penalty (Max 35)
  let conditionScorePenalty = 0;
  const score = params.conditionScore ?? 4;
  if (score <= 1) {
    conditionScorePenalty = 35;
    explanation.push('Critical structural condition (1/5): +35 pts');
  } else if (score <= 2) {
    conditionScorePenalty = 25;
    explanation.push('Poor structural condition (2/5): +25 pts');
  } else if (score <= 3) {
    conditionScorePenalty = 12;
    explanation.push('Fair condition with minor distress (3/5): +12 pts');
  }

  // 2. Age vs Design Life (Max 20)
  let agePenalty = 0;
  const currentYear = new Date().getFullYear();
  if (params.constructionYear) {
    const age = currentYear - params.constructionYear;
    const designLife = params.designLifeYears || 50;
    if (age > designLife) {
      agePenalty = 20;
      explanation.push(`Exceeded design life (${age} yrs > ${designLife} yrs): +20 pts`);
    } else if (age > designLife * 0.75) {
      agePenalty = 10;
      explanation.push(`Near end of design life (${age}/${designLife} yrs): +10 pts`);
    }
  }

  // 3. Inspection Overdue Penalty (Max 15)
  let inspectionOverduePenalty = 0;
  if (params.lastInspectionAt) {
    const daysSince = Math.floor((Date.now() - new Date(params.lastInspectionAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 365) {
      inspectionOverduePenalty = 15;
      explanation.push(`No structural inspection for >1 year (${daysSince} days): +15 pts`);
    } else if (daysSince > 180) {
      inspectionOverduePenalty = 7;
      explanation.push(`Inspection overdue (${daysSince} days since last): +7 pts`);
    }
  } else {
    inspectionOverduePenalty = 15;
    explanation.push('Never inspected by department: +15 pts');
  }

  // 4. Load Restriction (Max 10)
  const loadRestrictionPenalty = params.hasLoadRestriction ? 10 : 0;
  if (loadRestrictionPenalty > 0) {
    explanation.push('Emergency load/speed restriction currently imposed: +10 pts');
  }

  // 5. Scour Prone (Max 10)
  const scourPenalty = params.isScourProne ? 10 : 0;
  if (scourPenalty > 0) {
    explanation.push('Foundation classified as scour-vulnerable in monsoon: +10 pts');
  }

  // 6. Open Critical Defects (Max 10)
  const critCount = params.openCriticalDefectsCount || 0;
  const criticalDefectsPenalty = Math.min(critCount * 5, 10);
  if (criticalDefectsPenalty > 0) {
    explanation.push(`${critCount} open critical/high defects (spalling, bearing, expansion joint): +${criticalDefectsPenalty} pts`);
  }

  const totalScore = Math.min(
    100,
    Math.round(
      conditionScorePenalty +
        agePenalty +
        inspectionOverduePenalty +
        loadRestrictionPenalty +
        scourPenalty +
        criticalDefectsPenalty
    )
  );

  let band: RiskBand = 'LOW';
  if (totalScore >= 75) band = 'SEVERE';
  else if (totalScore >= 50) band = 'HIGH';
  else if (totalScore >= 25) band = 'MEDIUM';

  return {
    conditionScorePenalty,
    agePenalty,
    inspectionOverduePenalty,
    loadRestrictionPenalty,
    scourPenalty,
    criticalDefectsPenalty,
    totalScore,
    band,
    explanation,
  };
}
