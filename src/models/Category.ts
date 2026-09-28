import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ClassCode, GeometryType } from '@/lib/constants';

export interface ICategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  unit?: string;
}

export interface ICategory extends Document {
  classCode: ClassCode;
  name: string;
  description: string;
  fields: ICategoryField[];
  geometryType: GeometryType;
  inspectionSchedule: {
    type: string;
    frequencyMonths: number;
    windowStart?: string; // e.g. "04-01"
    windowEnd?: string;   // e.g. "05-31"
  }[];
  designLifeYears: number;
  renewalCycleYears: number;
  depreciable: boolean;
  lifecycleProfile: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryFieldSchema = new Schema<ICategoryField>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'select', 'boolean'], required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    unit: { type: String },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    classCode: { type: String, enum: ['RDS', 'SEG', 'BRG', 'BLD', 'LND', 'MCH'], required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    fields: [CategoryFieldSchema],
    geometryType: { type: String, enum: ['POINT', 'LINE', 'POLYGON'], required: true },
    inspectionSchedule: [
      {
        type: { type: String, required: true },
        frequencyMonths: { type: Number, required: true },
        windowStart: { type: String },
        windowEnd: { type: String },
      },
    ],
    designLifeYears: { type: Number, default: 30 },
    renewalCycleYears: { type: Number, default: 10 },
    depreciable: { type: Boolean, default: false },
    lifecycleProfile: { type: String, default: 'ROAD' },
    isLocked: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
