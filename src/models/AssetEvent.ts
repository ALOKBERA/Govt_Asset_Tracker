import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAssetEvent extends Document {
  assetId: mongoose.Types.ObjectId;
  assetCode: string; // The GJ-RNB-... ID
  type: string; // CREATED, STATUS_CHANGE, INSPECTION, WORK, APPROVAL, SAFETY_CLOSURE, RATIFICATION, NOTE, LEGACY, etc.
  fromStatus?: string;
  toStatus?: string;
  description: string;
  data?: Record<string, unknown>;
  userId: mongoose.Types.ObjectId;
  userName: string;
  prevHash: string;
  hash: string;
  createdAt: Date;
}

const AssetEventSchema = new Schema<IAssetEvent>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    assetCode: { type: String, required: true },
    type: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    description: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    prevHash: { type: String, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevent updates and deletes on events
AssetEventSchema.pre('updateOne', function () {
  throw new Error('AssetEvent records are immutable');
});
AssetEventSchema.pre('findOneAndUpdate', function () {
  throw new Error('AssetEvent records are immutable');
});
AssetEventSchema.pre('deleteOne', function () {
  throw new Error('AssetEvent records cannot be deleted');
});

export const AssetEvent: Model<IAssetEvent> =
  mongoose.models.AssetEvent || mongoose.model<IAssetEvent>('AssetEvent', AssetEventSchema);
