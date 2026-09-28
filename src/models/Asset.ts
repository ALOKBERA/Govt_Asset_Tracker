import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAsset extends Document {
  assetId: string; // GJ-RNB-{CLASS}-{DISTRICT}-{SERIAL6}
  name: string;
  classCode: string;
  subType: string;
  attributes: Record<string, unknown>;
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon';
    coordinates: number[] | number[][] | number[][][];
  } | null;
  linear?: {
    routeCode: string;
    startChainageM: number;
    endChainageM: number;
    lengthM: number;
  };
  parentAssetId: mongoose.Types.ObjectId | null;
  // Org unit references (denormalized)
  subdivisionId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  circleId: mongoose.Types.ObjectId;
  wingId?: mongoose.Types.ObjectId;
  districtCode: string;
  talukaCode?: string;
  // Status
  status: string;
  conditionScore: number | null;
  condition: string | null; // CRITICAL, POOR, FAIR, GOOD, VERY_GOOD
  operationalStatus?: string; // OPEN, RESTRICTED, CLOSED
  tagStatus: string;
  // Ownership
  ownership?: string;
  ownerDepartment?: string;
  occupantDepartment?: string;
  maintenanceResponsibility?: string;
  // Acquisition / Construction
  acquisition: {
    cost?: number;
    year?: number;
    sanctionNo?: string;
    fundingScheme?: string;
  };
  // Finance
  finance?: {
    bookValue?: number;
    depreciationRate?: number;
    lastDepreciationDate?: Date;
  };
  // Key dates
  lastInspectionAt: Date | null;
  nextInspectionDue: Date | null;
  lastRenewalDate: Date | null;
  nextRenewalDue: Date | null;
  dlpEndDate: Date | null;
  // Scores
  riskScore: number | null;
  priorityScore: number | null;
  // Media
  photos: string[];
  documents: { name: string; url: string; type: string }[];
  // External references
  externalRefs: {
    wmsWorkId?: string;
    ibmsBridgeId?: string;
    gemOrderNo?: string;
  };
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    assetId: { type: String, required: true, unique: true, immutable: true },
    name: { type: String, required: true },
    classCode: { type: String, required: true, index: true },
    subType: { type: String, default: '' },
    attributes: { type: Schema.Types.Mixed, default: {} },
    geometry: {
      type: {
        type: String,
        enum: ['Point', 'LineString', 'Polygon'],
      },
      coordinates: { type: Schema.Types.Mixed },
    },
    linear: {
      routeCode: { type: String },
      startChainageM: { type: Number },
      endChainageM: { type: Number },
      lengthM: { type: Number },
    },
    parentAssetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null, index: true },
    subdivisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true, index: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    wingId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    districtCode: { type: String, required: true, index: true },
    talukaCode: { type: String },
    status: { type: String, required: true, index: true, default: 'SANCTIONED' },
    conditionScore: { type: Number, default: null },
    condition: { type: String, default: null },
    operationalStatus: { type: String, enum: ['OPEN', 'RESTRICTED', 'CLOSED'], default: 'OPEN' },
    tagStatus: { type: String, enum: ['TAG_PENDING', 'TAGGED', 'TAG_DAMAGED'], default: 'TAG_PENDING' },
    ownership: { type: String },
    ownerDepartment: { type: String },
    occupantDepartment: { type: String },
    maintenanceResponsibility: { type: String },
    acquisition: {
      cost: { type: Number },
      year: { type: Number },
      sanctionNo: { type: String },
      fundingScheme: { type: String },
    },
    finance: {
      bookValue: { type: Number },
      depreciationRate: { type: Number },
      lastDepreciationDate: { type: Date },
    },
    lastInspectionAt: { type: Date, default: null },
    nextInspectionDue: { type: Date, default: null, index: true },
    lastRenewalDate: { type: Date, default: null },
    nextRenewalDue: { type: Date, default: null },
    dlpEndDate: { type: Date, default: null },
    riskScore: { type: Number, default: null },
    priorityScore: { type: Number, default: null },
    photos: [{ type: String }],
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    externalRefs: {
      wmsWorkId: { type: String },
      ibmsBridgeId: { type: String },
      gemOrderNo: { type: String },
    },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere index
AssetSchema.index({ geometry: '2dsphere' });
// Compound indexes for common queries
AssetSchema.index({ classCode: 1, districtCode: 1 });
AssetSchema.index({ classCode: 1, status: 1 });
AssetSchema.index({ divisionId: 1, classCode: 1 });

export const Asset: Model<IAsset> =
  mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
