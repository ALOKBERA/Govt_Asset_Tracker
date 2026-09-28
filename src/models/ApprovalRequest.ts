import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IApprovalRequest extends Document {
  assetId: mongoose.Types.ObjectId;
  assetCode: string;
  type: string; // TRANSITION, DISPOSAL, HANDOVER, CONDEMNATION etc.
  requestedTransition?: { from: string; to: string };
  reason: string;
  estimatedValue?: number;
  requesterId: mongoose.Types.ObjectId;
  requesterName: string;
  requiredLevel: string; // DIVISION_ENGINEER, CIRCLE_ADMIN, STATE_ADMIN
  deciderId?: mongoose.Types.ObjectId;
  deciderName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decisionNote?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    assetCode: { type: String, required: true },
    type: { type: String, required: true },
    requestedTransition: {
      from: { type: String },
      to: { type: String },
    },
    reason: { type: String, required: true },
    estimatedValue: { type: Number },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String, required: true },
    requiredLevel: { type: String, required: true },
    deciderId: { type: Schema.Types.ObjectId, ref: 'User' },
    deciderName: { type: String },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    decisionNote: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

export const ApprovalRequest: Model<IApprovalRequest> =
  mongoose.models.ApprovalRequest || mongoose.model<IApprovalRequest>('ApprovalRequest', ApprovalRequestSchema);
