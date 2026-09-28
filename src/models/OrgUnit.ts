import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OrgUnitType } from '@/lib/constants';

export interface IOrgUnit extends Document {
  type: OrgUnitType;
  code: string;
  name: string;
  parentId: mongoose.Types.ObjectId | null;
  districtCode?: string;
  talukaCode?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrgUnitSchema = new Schema<IOrgUnit>(
  {
    type: { type: String, enum: ['WING', 'CIRCLE', 'DIVISION', 'SUBDIVISION', 'SECTION'], required: true },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', default: null },
    districtCode: { type: String },
    talukaCode: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OrgUnitSchema.index({ type: 1 });
OrgUnitSchema.index({ parentId: 1 });

export const OrgUnit: Model<IOrgUnit> =
  mongoose.models.OrgUnit || mongoose.model<IOrgUnit>('OrgUnit', OrgUnitSchema);
