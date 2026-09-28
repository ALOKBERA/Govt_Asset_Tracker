import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDefect {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  chainage?: string;
  note: string;
  photoUrl?: string;
  contractorLiable: boolean;
}

export interface IInspection extends Document {
  assetId: mongoose.Types.ObjectId;
  assetCode: string;
  type: string;
  inspectorId: mongoose.Types.ObjectId;
  inspectorName: string;
  date: Date;
  gpsLat?: number;
  gpsLng?: number;
  conditionScore: number;
  defects: IDefect[];
  recommendedAction: string;
  estimatedCost?: number;
  remarks: string;
  photos: string[];
  driveId?: mongoose.Types.ObjectId;
  // Scoping
  subdivisionId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  circleId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DefectSchema = new Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
    location: { type: String },
    chainage: { type: String },
    note: { type: String, default: '' },
    photoUrl: { type: String },
    contractorLiable: { type: Boolean, default: false },
  },
  { _id: false }
);

const InspectionSchema = new Schema<IInspection>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    assetCode: { type: String, required: true },
    type: {
      type: String,
      enum: ['ROUTINE', 'PRE_MONSOON', 'POST_MONSOON', 'DETAILED', 'SAFETY_AUDIT', 'PHYSICAL_VERIFICATION'],
      required: true,
    },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inspectorName: { type: String, required: true },
    date: { type: Date, required: true },
    gpsLat: { type: Number },
    gpsLng: { type: Number },
    conditionScore: { type: Number, required: true, min: 1, max: 5 },
    defects: [DefectSchema],
    recommendedAction: {
      type: String,
      enum: ['NONE', 'ROUTINE_MAINTENANCE', 'SPECIAL_REPAIR', 'REHABILITATION', 'RESTRICT', 'CLOSE', 'RECONSTRUCT'],
      default: 'NONE',
    },
    estimatedCost: { type: Number },
    remarks: { type: String, default: '' },
    photos: [{ type: String }],
    driveId: { type: Schema.Types.ObjectId, ref: 'InspectionDrive' },
    subdivisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true, index: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  },
  { timestamps: true }
);

export const Inspection: Model<IInspection> =
  mongoose.models.Inspection || mongoose.model<IInspection>('Inspection', InspectionSchema);


// Inspection Drive
export interface IInspectionDrive extends Document {
  name: string;
  type: string;
  year: number;
  windowStart: Date;
  windowEnd: Date;
  divisionId?: mongoose.Types.ObjectId;
  circleId?: mongoose.Types.ObjectId;
  targetAssetClass?: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InspectionDriveSchema = new Schema<IInspectionDrive>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    year: { type: Number, required: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    targetAssetClass: { type: String },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const InspectionDrive: Model<IInspectionDrive> =
  mongoose.models.InspectionDrive || mongoose.model<IInspectionDrive>('InspectionDrive', InspectionDriveSchema);
