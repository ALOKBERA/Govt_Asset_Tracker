import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWork extends Document {
  assetId: mongoose.Types.ObjectId;
  assetCode: string;
  type: string;
  aaNo?: string; // Administrative Approval number
  aaDate?: Date;
  tsNo?: string; // Technical Sanction number
  tsDate?: Date;
  tenderNo?: string;
  workOrderNo?: string;
  contractor?: string;
  estimatedCost?: number;
  actualCost?: number;
  startDate?: Date;
  scheduledCompletion?: Date;
  actualCompletion?: Date;
  dlpMonths?: number;
  dlpEndDate?: Date;
  status: string;
  progressPercent: number;
  description: string;
  documents: { name: string; url: string; type: string }[];
  externalRefs: {
    wmsWorkId?: string;
  };
  // Scoping
  subdivisionId: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  circleId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkSchema = new Schema<IWork>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    assetCode: { type: String, required: true },
    type: {
      type: String,
      enum: ['ROUTINE', 'PERIODIC_RENEWAL', 'SPECIAL_REPAIR', 'REHABILITATION', 'RECONSTRUCTION', 'EMERGENCY', 'NEW_CONSTRUCTION'],
      required: true,
    },
    aaNo: { type: String },
    aaDate: { type: Date },
    tsNo: { type: String },
    tsDate: { type: Date },
    tenderNo: { type: String },
    workOrderNo: { type: String },
    contractor: { type: String },
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    startDate: { type: Date },
    scheduledCompletion: { type: Date },
    actualCompletion: { type: Date },
    dlpMonths: { type: Number },
    dlpEndDate: { type: Date },
    status: {
      type: String,
      enum: ['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'],
      default: 'PLANNED',
      index: true,
    },
    progressPercent: { type: Number, default: 0 },
    description: { type: String, default: '' },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
      },
    ],
    externalRefs: {
      wmsWorkId: { type: String },
    },
    subdivisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true, index: true },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Work: Model<IWork> =
  mongoose.models.Work || mongoose.model<IWork>('Work', WorkSchema);
