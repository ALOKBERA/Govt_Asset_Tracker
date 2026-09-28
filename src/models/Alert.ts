import mongoose, { Schema, Document, Model } from 'mongoose';

// Alert model
export interface IAlert extends Document {
  type: string;
  assetId?: mongoose.Types.ObjectId;
  assetCode?: string;
  message: string;
  dedupeKey: string;
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  divisionId?: mongoose.Types.ObjectId;
  circleId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: { type: String, required: true, index: true },
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    assetCode: { type: String },
    message: { type: String, required: true },
    dedupeKey: { type: String, required: true, unique: true },
    isResolved: { type: Boolean, default: false, index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
  },
  { timestamps: true }
);

export const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);


// Citizen Report model
export interface ICitizenReport extends Document {
  assetId?: mongoose.Types.ObjectId;
  assetCode?: string;
  description: string;
  photoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  reporterName?: string;
  reporterPhone?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'INVALID';
  assignedTo?: mongoose.Types.ObjectId;
  resolution?: string;
  subdivisionId?: mongoose.Types.ObjectId;
  divisionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CitizenReportSchema = new Schema<ICitizenReport>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    assetCode: { type: String },
    description: { type: String, required: true },
    photoUrl: { type: String },
    gpsLat: { type: Number },
    gpsLng: { type: Number },
    reporterName: { type: String },
    reporterPhone: { type: String },
    status: { type: String, enum: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'INVALID'], default: 'NEW', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String },
    subdivisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
  },
  { timestamps: true }
);

export const CitizenReport: Model<ICitizenReport> =
  mongoose.models.CitizenReport || mongoose.model<ICitizenReport>('CitizenReport', CitizenReportSchema);


// Counter model for atomic serial numbers
export interface ICounter extends Document {
  key: string; // e.g. "RDS-AHM", "BRG-VAD"
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
