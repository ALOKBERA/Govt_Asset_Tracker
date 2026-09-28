/**
 * Chainage utilities for linear road assets
 * Format convention: "12+400" = 12 km + 400 m = 12400 meters
 */

export function parseChainage(str: string): number {
  if (!str || typeof str !== 'string') return 0;
  const clean = str.trim();
  if (clean.includes('+')) {
    const [kmStr, mStr] = clean.split('+');
    const km = parseFloat(kmStr) || 0;
    const m = parseFloat(mStr) || 0;
    return Math.round(km * 1000 + m);
  }
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : Math.round(val);
}

export function formatChainage(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0+000';
  const km = Math.floor(meters / 1000);
  const m = Math.round(meters % 1000);
  return `${km}+${m.toString().padStart(3, '0')}`;
}

export function formatSegmentLabel(routeCode: string, startM: number, endM: number): string {
  return `${routeCode} · Km ${formatChainage(startM)} to ${formatChainage(endM)}`;
}

export interface ChainageRange {
  startM: number;
  endM: number;
}

/**
 * Checks if a new range [startM, endM] overlaps with any existing ranges
 * Excludes self (by index or id) if specified
 */
export function checkChainageOverlap(
  newRange: ChainageRange,
  existingRanges: ChainageRange[]
): { hasOverlap: boolean; overlappingRange?: ChainageRange } {
  const nStart = Math.min(newRange.startM, newRange.endM);
  const nEnd = Math.max(newRange.startM, newRange.endM);

  for (const range of existingRanges) {
    const eStart = Math.min(range.startM, range.endM);
    const eEnd = Math.max(range.startM, range.endM);

    // Overlap condition: max(nStart, eStart) < min(nEnd, eEnd)
    if (Math.max(nStart, eStart) < Math.min(nEnd, eEnd)) {
      return { hasOverlap: true, overlappingRange: range };
    }
  }

  return { hasOverlap: false };
}
