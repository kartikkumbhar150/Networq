import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  accountType: 'user' | 'company';
  companyDetails?: {
    companyName: string;
    cin: string;
    gstin: string;
  };
  otp: string;
  otpExpiry: Date;
  faceEmbeddingStored: boolean; // true once embedding is in Qdrant temp collection
  tempQdrantPointId: string | null;
  enteredReferralCode?: string;
  createdAt: Date;
}

const PendingUserSchema = new Schema<IPendingUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    accountType: { type: String, enum: ['user', 'company'], default: 'user' },
    companyDetails: {
      companyName: { type: String },
      cin: { type: String },
      gstin: { type: String }
    },
    otp: { type: String, required: true },
    otpExpiry: { type: Date, required: true },
    faceEmbeddingStored: { type: Boolean, default: false },
    tempQdrantPointId: { type: String, default: null },
    enteredReferralCode: { type: String },
  },
  { timestamps: true }
);

// Auto-delete pending users after 15 minutes
PendingUserSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export default mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);
