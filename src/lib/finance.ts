export interface DepreciationResult {
  initialCost: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  annualDepreciationRatePercent: number;
  ageYears: number;
  designLifeYears: number;
}

/**
 * Calculates straight-line depreciation for analytical government asset indicators
 * Typically applied to Machinery (MCH) and Buildings (BLD), disabled for Roads and Land
 */
export function calculateStraightLineDepreciation(params: {
  initialCost?: number;
  constructionOrProcurementYear?: number;
  designLifeYears?: number;
  salvageValuePercent?: number; // default 5%
}): DepreciationResult {
  const initialCost = params.initialCost || 0;
  const currentYear = new Date().getFullYear();
  const year = params.constructionOrProcurementYear || currentYear;
  const ageYears = Math.max(0, currentYear - year);
  const designLife = params.designLifeYears || (year > 2000 ? 30 : 20);
  const salvagePercent = params.salvageValuePercent ?? 5;
  const salvageValue = initialCost * (salvagePercent / 100);

  const depreciableAmount = Math.max(0, initialCost - salvageValue);
  const annualDepreciationAmount = designLife > 0 ? depreciableAmount / designLife : 0;
  const annualDepreciationRatePercent = designLife > 0 ? (100 - salvagePercent) / designLife : 0;

  const accumulatedDepreciation = Math.min(depreciableAmount, annualDepreciationAmount * ageYears);
  const currentBookValue = Math.max(salvageValue, initialCost - accumulatedDepreciation);

  return {
    initialCost,
    currentBookValue: Math.round(currentBookValue),
    accumulatedDepreciation: Math.round(accumulatedDepreciation),
    annualDepreciationRatePercent: Number(annualDepreciationRatePercent.toFixed(2)),
    ageYears,
    designLifeYears: designLife,
  };
}

export interface TotalCostOfOwnership {
  initialCost: number;
  totalMaintenanceSpend: number;
  totalWorksCount: number;
  totalCostOfOwnership: number;
  costPerKmPerYear?: number;
}

export function calculateTCO(params: {
  initialCost?: number;
  works: { actualCost?: number; estimatedCost?: number; status?: string }[];
  constructionYear?: number;
  lengthKm?: number;
}): TotalCostOfOwnership {
  const initialCost = params.initialCost || 0;
  const completedWorks = params.works.filter((w) => w.status === 'COMPLETED' || w.status === 'CLOSED');

  const totalMaintenanceSpend = completedWorks.reduce(
    (acc, w) => acc + (w.actualCost ?? w.estimatedCost ?? 0),
    0
  );

  const totalCostOfOwnership = initialCost + totalMaintenanceSpend;

  let costPerKmPerYear: number | undefined;
  if (params.lengthKm && params.lengthKm > 0) {
    const currentYear = new Date().getFullYear();
    const age = Math.max(1, currentYear - (params.constructionYear || currentYear));
    costPerKmPerYear = Math.round(totalMaintenanceSpend / (params.lengthKm * age));
  }

  return {
    initialCost,
    totalMaintenanceSpend,
    totalWorksCount: params.works.length,
    totalCostOfOwnership,
    costPerKmPerYear,
  };
}
