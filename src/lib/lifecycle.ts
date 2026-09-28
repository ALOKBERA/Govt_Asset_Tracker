import { AssetStatus, ClassCode, Role } from './constants';

export interface TransitionRule {
  from: AssetStatus;
  to: AssetStatus;
  label: string;
  requiresApproval: boolean;
  isImmediateSafety: boolean;
  minRoleToInitiate?: Role;
  description: string;
}

// Allowed transitions by class code
const ROAD_TRANSITIONS: TransitionRule[] = [
  { from: 'SANCTIONED', to: 'UNDER_CONSTRUCTION', label: 'Commence Construction', requiresApproval: false, isImmediateSafety: false, description: 'Work awarded and construction started on site' },
  { from: 'UNDER_CONSTRUCTION', to: 'DEFECT_LIABILITY', label: 'Complete Construction (Enter DLP)', requiresApproval: false, isImmediateSafety: false, description: 'Physical construction complete, entering Defect Liability Period' },
  { from: 'DEFECT_LIABILITY', to: 'IN_SERVICE', label: 'DLP Exit to In Service', requiresApproval: false, isImmediateSafety: false, description: 'Defect liability period completed satisfactorily' },
  { from: 'IN_SERVICE', to: 'UNDER_MAINTENANCE', label: 'Begin Maintenance', requiresApproval: false, isImmediateSafety: false, description: 'Routine or periodic maintenance work underway' },
  { from: 'UNDER_MAINTENANCE', to: 'IN_SERVICE', label: 'Maintenance Completed', requiresApproval: false, isImmediateSafety: false, description: 'Maintenance work concluded, returned to regular service' },
  { from: 'IN_SERVICE', to: 'UPGRADING', label: 'Start Widening / Strengthening', requiresApproval: false, isImmediateSafety: false, description: 'Major upgrading/widening work started' },
  { from: 'UPGRADING', to: 'DEFECT_LIABILITY', label: 'Upgrading Complete (Enter DLP)', requiresApproval: false, isImmediateSafety: false, description: 'Upgrading work finished, entering DLP' },
  { from: 'IN_SERVICE', to: 'CLOSED', label: 'Emergency Close (Flood/Damage)', requiresApproval: false, isImmediateSafety: true, description: 'Road closed due to flood, washaway or severe structural hazard' },
  { from: 'CLOSED', to: 'IN_SERVICE', label: 'Reopen Road', requiresApproval: false, isImmediateSafety: false, description: 'Road cleared and safe for traffic reopening' },
  { from: 'CLOSED', to: 'UNDER_MAINTENANCE', label: 'Initiate Flood/Damage Repairs', requiresApproval: false, isImmediateSafety: false, description: 'Special repair work started on closed stretch' },
  { from: 'IN_SERVICE', to: 'HANDED_OVER', label: 'Request Handover (to Municipality/NHAI/Panchayat)', requiresApproval: true, isImmediateSafety: false, description: 'Formal transfer of custody to other agency' },
  { from: 'IN_SERVICE', to: 'DECOMMISSIONED', label: 'Request Decommissioning', requiresApproval: true, isImmediateSafety: false, description: 'Permanent bypass or realignment abandonment' },
];

const BRIDGE_TRANSITIONS: TransitionRule[] = [
  { from: 'SANCTIONED', to: 'UNDER_CONSTRUCTION', label: 'Commence Construction', requiresApproval: false, isImmediateSafety: false, description: 'Bridge construction commenced' },
  { from: 'UNDER_CONSTRUCTION', to: 'DEFECT_LIABILITY', label: 'Complete Construction (Enter DLP)', requiresApproval: false, isImmediateSafety: false, description: 'Bridge opened, entering Defect Liability Period' },
  { from: 'DEFECT_LIABILITY', to: 'IN_SERVICE', label: 'DLP Exit to In Service', requiresApproval: false, isImmediateSafety: false, description: 'DLP concluded satisfactorily' },
  { from: 'IN_SERVICE', to: 'UNDER_MAINTENANCE', label: 'Start Special Repair / Rehabilitation', requiresApproval: false, isImmediateSafety: false, description: 'Structural maintenance underway' },
  { from: 'UNDER_MAINTENANCE', to: 'IN_SERVICE', label: 'Maintenance Completed', requiresApproval: false, isImmediateSafety: false, description: 'Repairs finished, restored to full service' },
  { from: 'IN_SERVICE', to: 'RESTRICTED', label: 'Impose Load / Speed Restriction', requiresApproval: false, isImmediateSafety: true, description: 'Immediate safety restriction due to structural deficiency' },
  { from: 'RESTRICTED', to: 'IN_SERVICE', label: 'Lift Restriction (Restored)', requiresApproval: false, isImmediateSafety: false, description: 'Structure certified safe, lifting restriction' },
  { from: 'RESTRICTED', to: 'CLOSED', label: 'Close Bridge to Traffic', requiresApproval: false, isImmediateSafety: true, description: 'Condition deteriorated further, closing bridge' },
  { from: 'IN_SERVICE', to: 'CLOSED', label: 'Emergency Close Bridge', requiresApproval: false, isImmediateSafety: true, description: 'Immediate closure due to scour, structural failure or flood danger' },
  { from: 'CLOSED', to: 'UNDER_MAINTENANCE', label: 'Begin Structural Rehabilitation', requiresApproval: false, isImmediateSafety: false, description: 'Rehabilitation work commenced' },
  { from: 'CLOSED', to: 'UPGRADING', label: 'Begin Complete Reconstruction', requiresApproval: false, isImmediateSafety: false, description: 'Bridge reconstruction started' },
  { from: 'UPGRADING', to: 'DEFECT_LIABILITY', label: 'Reconstruction Complete (Enter DLP)', requiresApproval: false, isImmediateSafety: false, description: 'Rebuilt bridge opened' },
  { from: 'CLOSED', to: 'IN_SERVICE', label: 'Reopen Bridge', requiresApproval: false, isImmediateSafety: false, description: 'Inspection certified structure safe to reopen' },
  { from: 'CLOSED', to: 'DECOMMISSIONED', label: 'Request Bridge Decommissioning', requiresApproval: true, isImmediateSafety: false, description: 'Permanent closure/condemnation of bridge' },
  { from: 'IN_SERVICE', to: 'HANDED_OVER', label: 'Request Handover', requiresApproval: true, isImmediateSafety: false, description: 'Handover to another agency' },
];

const BUILDING_TRANSITIONS: TransitionRule[] = [
  { from: 'SANCTIONED', to: 'UNDER_CONSTRUCTION', label: 'Commence Construction', requiresApproval: false, isImmediateSafety: false, description: 'Building construction started' },
  { from: 'UNDER_CONSTRUCTION', to: 'DEFECT_LIABILITY', label: 'Complete Construction (Enter DLP)', requiresApproval: false, isImmediateSafety: false, description: 'Building completed, entering DLP' },
  { from: 'DEFECT_LIABILITY', to: 'HANDED_OVER', label: 'Handover to Occupant Dept', requiresApproval: false, isImmediateSafety: false, description: 'Custody handed over to occupant department' },
  { from: 'DEFECT_LIABILITY', to: 'IN_SERVICE', label: 'Place in Service (R&B Occupied)', requiresApproval: false, isImmediateSafety: false, description: 'Building occupied and operational' },
  { from: 'HANDED_OVER', to: 'IN_SERVICE', label: 'Re-assume Direct Custody', requiresApproval: false, isImmediateSafety: false, description: 'Direct custody re-assumed' },
  { from: 'IN_SERVICE', to: 'HANDED_OVER', label: 'Handover to Occupant Dept', requiresApproval: false, isImmediateSafety: false, description: 'Transferred to occupant department' },
  { from: 'IN_SERVICE', to: 'UNDER_MAINTENANCE', label: 'Commence Building Renovation/Repair', requiresApproval: false, isImmediateSafety: false, description: 'Major renovation underway' },
  { from: 'UNDER_MAINTENANCE', to: 'IN_SERVICE', label: 'Renovation Complete', requiresApproval: false, isImmediateSafety: false, description: 'Restored to service' },
  { from: 'IN_SERVICE', to: 'UNSAFE', label: 'Declare Building Unsafe (Emergency Evacuate)', requiresApproval: false, isImmediateSafety: true, description: 'Severe structural or fire hazard, immediate unsafe declaration' },
  { from: 'UNSAFE', to: 'UNDER_MAINTENANCE', label: 'Commence Structural Retrofitting', requiresApproval: false, isImmediateSafety: false, description: 'Retrofit/strengthening repairs started' },
  { from: 'UNSAFE', to: 'IN_SERVICE', label: 'Declare Safe Post-Audit', requiresApproval: false, isImmediateSafety: false, description: 'Structural audit certifies safe condition' },
  { from: 'UNSAFE', to: 'CONDEMNATION_PENDING', label: 'Request Condemnation / Demolition', requiresApproval: true, isImmediateSafety: false, description: 'Recommend building for condemnation' },
  { from: 'CONDEMNATION_PENDING', to: 'DECOMMISSIONED', label: 'Confirm Demolition / Decommission', requiresApproval: true, isImmediateSafety: false, description: 'Building decommissioned and scheduled for demolition' },
  { from: 'DECOMMISSIONED', to: 'DISPOSED', label: 'Dispose / Scrap Building Site', requiresApproval: true, isImmediateSafety: false, description: 'Debris auctioned/cleared' },
];

const LAND_TRANSITIONS: TransitionRule[] = [
  { from: 'SANCTIONED', to: 'IN_SERVICE', label: 'Acquisition Finalized', requiresApproval: false, isImmediateSafety: false, description: 'Land possession taken' },
  { from: 'IN_SERVICE', to: 'HANDED_OVER', label: 'Request Transfer to Dept/Agency', requiresApproval: true, isImmediateSafety: false, description: 'Land transfer' },
  { from: 'IN_SERVICE', to: 'DISPOSED', label: 'Request Land Disposal / Relinquishment', requiresApproval: true, isImmediateSafety: false, description: 'Land disposal' },
];

const MACHINERY_TRANSITIONS: TransitionRule[] = [
  { from: 'SANCTIONED', to: 'IN_SERVICE', label: 'Commission / Put into Service', requiresApproval: false, isImmediateSafety: false, description: 'Machine commissioned after inspection' },
  { from: 'IN_SERVICE', to: 'UNDER_MAINTENANCE', label: 'Send for Overhaul / Workshop Repair', requiresApproval: false, isImmediateSafety: false, description: 'Machine under repair' },
  { from: 'UNDER_MAINTENANCE', to: 'IN_SERVICE', label: 'Repair Completed', requiresApproval: false, isImmediateSafety: false, description: 'Returned from workshop' },
  { from: 'IN_SERVICE', to: 'MISSING', label: 'Mark as Missing / Untraceable', requiresApproval: false, isImmediateSafety: false, description: 'Physical verification failed' },
  { from: 'MISSING', to: 'IN_SERVICE', label: 'Found / Traced Back', requiresApproval: false, isImmediateSafety: false, description: 'Asset traced and verified' },
  { from: 'MISSING', to: 'DISPOSED', label: 'Request Loss Write-Off', requiresApproval: true, isImmediateSafety: false, description: 'Write-off approval' },
  { from: 'IN_SERVICE', to: 'CONDEMNATION_PENDING', label: 'Request Condemnation (Beyond Repair)', requiresApproval: true, isImmediateSafety: false, description: 'Technical committee condemnation proposal' },
  { from: 'CONDEMNATION_PENDING', to: 'DECOMMISSIONED', label: 'Confirm Condemnation', requiresApproval: true, isImmediateSafety: false, description: 'Condemnation finalized' },
  { from: 'DECOMMISSIONED', to: 'DISPOSED', label: 'Auction / Scrap Disposal', requiresApproval: true, isImmediateSafety: false, description: 'Scrap auction completed' },
];

export function getTransitionsForClass(classCode: string): TransitionRule[] {
  switch (classCode) {
    case 'RDS':
    case 'SEG':
      return ROAD_TRANSITIONS;
    case 'BRG':
      return BRIDGE_TRANSITIONS;
    case 'BLD':
      return BUILDING_TRANSITIONS;
    case 'LND':
      return LAND_TRANSITIONS;
    case 'MCH':
      return MACHINERY_TRANSITIONS;
    default:
      return ROAD_TRANSITIONS;
  }
}

export function getValidNextTransitions(classCode: string, currentStatus: AssetStatus): TransitionRule[] {
  const all = getTransitionsForClass(classCode);
  return all.filter((t) => t.from === currentStatus);
}

export function isValidTransition(classCode: string, from: AssetStatus, to: AssetStatus): TransitionRule | null {
  const all = getTransitionsForClass(classCode);
  return all.find((t) => t.from === from && t.to === to) || null;
}

export function isSafetyException(toStatus: AssetStatus): boolean {
  return toStatus === 'RESTRICTED' || toStatus === 'CLOSED' || toStatus === 'UNSAFE';
}
