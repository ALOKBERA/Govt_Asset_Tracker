import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Role } from '@/lib/constants';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: Role;
  orgUnitId: mongoose.Types.ObjectId;
  // Denormalized for fast scoped queries
  subdivisionId?: mongoose.Types.ObjectId;
  divisionId?: mongoose.Types.ObjectId;
  circleId?: mongoose.Types.ObjectId;
  wingId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['STATE_ADMIN', 'CIRCLE_ADMIN', 'DIVISION_ENGINEER', 'SUBDIVISION_ENGINEER', 'FIELD_ENGINEER', 'AUDITOR'],
      required: true,
    },
    orgUnitId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
    subdivisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    divisionId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    circleId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    wingId: { type: Schema.Types.ObjectId, ref: 'OrgUnit' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ orgUnitId: 1 });
UserSchema.index({ divisionId: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
