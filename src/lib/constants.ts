// ─── Enums and Constants ───
export const ORG_UNIT_TYPES = ['WING', 'CIRCLE', 'DIVISION', 'SUBDIVISION', 'SECTION'] as const;
export type OrgUnitType = typeof ORG_UNIT_TYPES[number];

export const ROLES = [
  'STATE_ADMIN',
  'CIRCLE_ADMIN',
  'DIVISION_ENGINEER',
  'SUBDIVISION_ENGINEER',
  'FIELD_ENGINEER',
  'AUDITOR',
] as const;
export type Role = typeof ROLES[number];

export const CLASS_CODES = ['RDS', 'SEG', 'BRG', 'BLD', 'LND', 'MCH'] as const;
export type ClassCode = typeof CLASS_CODES[number];

export const ROAD_CATEGORIES = ['NH_AGENCY', 'SH', 'MDR', 'ODR', 'VR', 'PANCHAYAT', 'EXPRESSWAY'] as const;
export type RoadCategory = typeof ROAD_CATEGORIES[number];

export const ROAD_OWNERSHIPS = ['STATE', 'NH_AGENCY', 'PANCHAYAT', 'OTHER'] as const;
export type RoadOwnership = typeof ROAD_OWNERSHIPS[number];

export const SURFACE_TYPES = ['BT', 'CC', 'WBM', 'GRAVEL', 'EARTHEN'] as const;
export type SurfaceType = typeof SURFACE_TYPES[number];

export const BRIDGE_TYPES = ['MAJOR_BRIDGE', 'MINOR_BRIDGE', 'CULVERT', 'CAUSEWAY', 'ROB', 'RUB', 'FLYOVER', 'UNDERPASS'] as const;
export type BridgeType = typeof BRIDGE_TYPES[number];

export const BUILDING_TYPES = ['OFFICE', 'HOSPITAL', 'EDUCATIONAL', 'RESIDENTIAL_QUARTERS', 'CIRCUIT_HOUSE', 'RNB_OFFICE_STORE', 'OTHER'] as const;
export type BuildingType = typeof BUILDING_TYPES[number];

export const LAND_PURPOSES = ['ROW', 'OFFICE_SITE', 'RESERVED', 'QUARRY_STORE', 'OTHER'] as const;
export type LandPurpose = typeof LAND_PURPOSES[number];

export const ASSET_STATUSES = [
  'SANCTIONED', 'UNDER_CONSTRUCTION', 'DEFECT_LIABILITY', 'IN_SERVICE',
  'UNDER_MAINTENANCE', 'UPGRADING', 'RESTRICTED', 'CLOSED',
  'HANDED_OVER', 'UNSAFE', 'CONDEMNATION_PENDING', 'DECOMMISSIONED',
  'DISPOSED', 'MISSING',
] as const;
export type AssetStatus = typeof ASSET_STATUSES[number];

export const CONDITION_SCORES = [1, 2, 3, 4, 5] as const;
export type ConditionScore = typeof CONDITION_SCORES[number];

export const CONDITION_BANDS = ['CRITICAL', 'POOR', 'FAIR', 'GOOD', 'VERY_GOOD'] as const;
export type ConditionBand = typeof CONDITION_BANDS[number];

export const TAG_STATUSES = ['TAG_PENDING', 'TAGGED', 'TAG_DAMAGED'] as const;
export type TagStatus = typeof TAG_STATUSES[number];

export const OPERATIONAL_STATUSES = ['OPEN', 'RESTRICTED', 'CLOSED'] as const;
export type OperationalStatus = typeof OPERATIONAL_STATUSES[number];

export const GEOMETRY_TYPES = ['POINT', 'LINE', 'POLYGON'] as const;
export type GeometryType = typeof GEOMETRY_TYPES[number];

export const WORK_TYPES = [
  'ROUTINE', 'PERIODIC_RENEWAL', 'SPECIAL_REPAIR', 'REHABILITATION',
  'RECONSTRUCTION', 'EMERGENCY', 'NEW_CONSTRUCTION',
] as const;
export type WorkType = typeof WORK_TYPES[number];

export const WORK_STATUSES = ['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const;
export type WorkStatus = typeof WORK_STATUSES[number];

export const INSPECTION_TYPES = [
  'ROUTINE', 'PRE_MONSOON', 'POST_MONSOON', 'DETAILED',
  'SAFETY_AUDIT', 'PHYSICAL_VERIFICATION',
] as const;
export type InspectionType = typeof INSPECTION_TYPES[number];

export const DEFECT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type DefectSeverity = typeof DEFECT_SEVERITIES[number];

export const RECOMMENDED_ACTIONS = [
  'NONE', 'ROUTINE_MAINTENANCE', 'SPECIAL_REPAIR', 'REHABILITATION',
  'RESTRICT', 'CLOSE', 'RECONSTRUCT',
] as const;
export type RecommendedAction = typeof RECOMMENDED_ACTIONS[number];

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

export const ALERT_TYPES = [
  'INSPECTION_OVERDUE', 'INSPECTION_DUE_SOON', 'MONSOON_WINDOW_CLOSING',
  'DLP_ENDING_NO_INSPECTION', 'RENEWAL_DUE', 'RENEWAL_OVERDUE',
  'POOR_ASSET_NO_WORK', 'CLOSURE_NOT_RATIFIED', 'FIRE_NOC_EXPIRY',
  'LIFT_INSPECTION_EXPIRY', 'STRUCTURAL_AUDIT_DUE', 'AMC_EXPIRY',
  'CALIBRATION_DUE', 'APPROVAL_PENDING_LONG',
] as const;
export type AlertType = typeof ALERT_TYPES[number];

export const RISK_BANDS = ['LOW', 'MEDIUM', 'HIGH', 'SEVERE'] as const;
export type RiskBand = typeof RISK_BANDS[number];

// District codes for Gujarat
export const DISTRICT_CODES: Record<string, string> = {
  'Ahmedabad': 'AHM',
  'Gandhinagar': 'GNR',
  'Vadodara': 'VAD',
  'Surat': 'SUR',
  'Rajkot': 'RAJ',
  'Bhavnagar': 'BHV',
  'Junagadh': 'JUN',
  'Jamnagar': 'JAM',
  'Kutch': 'KUT',
  'Mehsana': 'MEH',
  'Patan': 'PAT',
  'Banaskantha': 'BAN',
  'Sabarkantha': 'SAB',
  'Aravalli': 'ARV',
  'Kheda': 'KHE',
  'Anand': 'ANA',
  'Panchmahal': 'PAN',
  'Dahod': 'DAH',
  'Mahisagar': 'MAH',
  'Chhota Udaipur': 'CHU',
  'Bharuch': 'BHA',
  'Narmada': 'NAR',
  'Tapi': 'TAP',
  'Navsari': 'NAV',
  'Valsad': 'VAL',
  'Dang': 'DAN',
  'Surendranagar': 'SUR2',
  'Morbi': 'MOR',
  'Porbandar': 'POR',
  'Devbhumi Dwarka': 'DDW',
  'Gir Somnath': 'GIR',
  'Botad': 'BOT',
  'Amreli': 'AMR',
};

// Condition score to band mapping
export function conditionBand(score: number): ConditionBand {
  if (score <= 1) return 'CRITICAL';
  if (score <= 2) return 'POOR';
  if (score <= 3) return 'FAIR';
  if (score <= 4) return 'GOOD';
  return 'VERY_GOOD';
}

// Condition band colors
export const CONDITION_COLORS: Record<ConditionBand, string> = {
  CRITICAL: '#ef4444',
  POOR: '#f97316',
  FAIR: '#eab308',
  GOOD: '#22c55e',
  VERY_GOOD: '#16a34a',
};

// Risk band colors
export const RISK_COLORS: Record<RiskBand, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  SEVERE: '#ef4444',
};

// Class code labels
export const CLASS_LABELS: Record<ClassCode, string> = {
  RDS: 'Road',
  SEG: 'Road Segment',
  BRG: 'Bridge / Structure',
  BLD: 'Building',
  LND: 'Land / ROW',
  MCH: 'Machinery / Vehicle',
};

// Defect type presets by class
export const DEFECT_PRESETS: Record<string, string[]> = {
  RDS: ['Pothole', 'Cracking', 'Rutting', 'Raveling', 'Edge break', 'Waterlogging', 'Shoulder erosion', 'Missing signage'],
  SEG: ['Pothole', 'Cracking', 'Rutting', 'Raveling', 'Edge break', 'Waterlogging', 'Shoulder erosion', 'Missing signage'],
  BRG: ['Bearing damage', 'Expansion joint failure', 'Spalling/exposed rebar', 'Cracks', 'Scour at foundation', 'Railing damage', 'Drainage blocked'],
  BLD: ['Seepage', 'Structural crack', 'Plaster/finish', 'Electrical hazard', 'Lift/fire safety'],
  LND: ['Encroachment', 'Boundary dispute', 'Unauthorized construction'],
  MCH: ['Mechanical failure', 'Wear and tear', 'Calibration needed'],
};
