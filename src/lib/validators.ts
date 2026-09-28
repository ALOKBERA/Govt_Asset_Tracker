import { z } from 'zod';
import {
  ASSET_STATUSES,
  CLASS_CODES,
  CONDITION_SCORES,
  DEFECT_SEVERITIES,
  INSPECTION_TYPES,
  OPERATIONAL_STATUSES,
  ORG_UNIT_TYPES,
  RECOMMENDED_ACTIONS,
  ROAD_CATEGORIES,
  ROAD_OWNERSHIPS,
  ROLES,
  SURFACE_TYPES,
  TAG_STATUSES,
  WORK_STATUSES,
  WORK_TYPES,
} from './constants';

export const OrgUnitSchema = z.object({
  type: z.enum(ORG_UNIT_TYPES),
  code: z.string().min(2).max(20),
  name: z.string().min(2),
  parentId: z.string().optional().nullable(),
  districtCode: z.string().optional(),
  talukaCode: z.string().optional(),
});

export const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(ROLES),
  orgUnitId: z.string(),
  subdivisionId: z.string().optional(),
  divisionId: z.string().optional(),
  circleId: z.string().optional(),
  wingId: z.string().optional(),
});

export const AssetCreateSchema = z.object({
  name: z.string().min(2),
  classCode: z.enum(CLASS_CODES),
  subType: z.string().optional(),
  attributes: z.record(z.string(), z.any()).default({}),
  geometry: z
    .object({
      type: z.enum(['Point', 'LineString', 'Polygon']),
      coordinates: z.any(),
    })
    .optional()
    .nullable(),
  linear: z
    .object({
      routeCode: z.string(),
      startChainageM: z.number().min(0),
      endChainageM: z.number().min(0),
      lengthM: z.number().min(0),
    })
    .optional(),
  parentAssetId: z.string().optional().nullable(),
  subdivisionId: z.string(),
  divisionId: z.string(),
  circleId: z.string(),
  wingId: z.string().optional(),
  districtCode: z.string().length(3),
  talukaCode: z.string().optional(),
  status: z.enum(ASSET_STATUSES).default('SANCTIONED'),
  operationalStatus: z.enum(OPERATIONAL_STATUSES).default('OPEN'),
  tagStatus: z.enum(TAG_STATUSES).default('TAG_PENDING'),
  ownership: z.string().optional(),
  ownerDepartment: z.string().optional(),
  occupantDepartment: z.string().optional(),
  maintenanceResponsibility: z.string().optional(),
  acquisition: z
    .object({
      cost: z.number().optional(),
      year: z.number().optional(),
      sanctionNo: z.string().optional(),
      fundingScheme: z.string().optional(),
    })
    .default({}),
  photos: z.array(z.string()).default([]),
  documents: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        type: z.string(),
      })
    )
    .default([]),
  externalRefs: z
    .object({
      wmsWorkId: z.string().optional(),
      ibmsBridgeId: z.string().optional(),
      gemOrderNo: z.string().optional(),
    })
    .default({}),
});

export const SegmentSplitSchema = z.object({
  splitChainageM: z.number().min(1),
  newSegmentNameA: z.string().min(1),
  newSegmentNameB: z.string().min(1),
  coordinatesA: z.array(z.array(z.number())).optional(),
  coordinatesB: z.array(z.array(z.number())).optional(),
});

export const StatusTransitionSchema = z.object({
  toStatus: z.enum(ASSET_STATUSES),
  reason: z.string().min(3),
  photoUrl: z.string().optional(),
  estimatedValue: z.number().optional(),
  notes: z.string().optional(),
});

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().min(2),
});

export const WorkCreateSchema = z.object({
  assetId: z.string(),
  type: z.enum(WORK_TYPES),
  aaNo: z.string().optional(),
  aaDate: z.string().optional(),
  tsNo: z.string().optional(),
  tsDate: z.string().optional(),
  tenderNo: z.string().optional(),
  workOrderNo: z.string().optional(),
  contractor: z.string().optional(),
  estimatedCost: z.number().min(0),
  actualCost: z.number().optional(),
  startDate: z.string().optional(),
  scheduledCompletion: z.string().optional(),
  dlpMonths: z.number().min(0).default(36),
  description: z.string().default(''),
  externalRefs: z
    .object({
      wmsWorkId: z.string().optional(),
    })
    .default({}),
});

export const WorkCompleteSchema = z.object({
  actualCost: z.number().min(0),
  actualCompletion: z.string().optional(),
  dlpMonths: z.number().min(0).default(36),
  notes: z.string().optional(),
});

export const DefectSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(DEFECT_SEVERITIES),
  location: z.string().optional(),
  chainage: z.string().optional(),
  note: z.string().default(''),
  photoUrl: z.string().optional(),
  contractorLiable: z.boolean().default(false),
});

export const InspectionCreateSchema = z.object({
  assetId: z.string(),
  type: z.enum(INSPECTION_TYPES),
  date: z.string().default(() => new Date().toISOString()),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  conditionScore: z.number().min(1).max(5),
  defects: z.array(DefectSchema).default([]),
  recommendedAction: z.enum(RECOMMENDED_ACTIONS).default('NONE'),
  estimatedCost: z.number().optional(),
  remarks: z.string().default(''),
  photos: z.array(z.string()).default([]),
  driveId: z.string().optional(),
});

export const CitizenReportCreateSchema = z.object({
  assetId: z.string().optional(),
  assetCode: z.string().optional(),
  description: z.string().min(5),
  photoUrl: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  honeypot: z.string().max(0).optional(), // Honeypot field for anti-spam
});
