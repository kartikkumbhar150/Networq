import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  opportunityId: mongoose.Types.ObjectId | any;
  applicantId: mongoose.Types.ObjectId | any; // Could be a User or Company pretending to be User
  
  // Custom bid/proposal
  bidAmount?: number;
  proposalText: string;
  ndaSignedAt?: Date;

  // Escrow & Milestone agreements for Procurement
  milestoneAgreements?: { title: string; amount: number; completed: boolean }[];
  escrowStatus?: 'pending' | 'funded' | 'released' | 'disputed';

  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    bidAmount: { type: Number },
    proposalText: { type: String, required: true },
    ndaSignedAt: { type: Date },

    milestoneAgreements: [
      {
        title: { type: String },
        amount: { type: Number },
        completed: { type: Boolean, default: false }
      }
    ],
    escrowStatus: { type: String, enum: ['pending', 'funded', 'released', 'disputed'] },

    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'in_progress'], default: 'pending' },
  },
  { timestamps: true }
);

ApplicationSchema.index({ opportunityId: 1, applicantId: 1 }, { unique: true });

export default mongoose.model<IApplication>('Application', ApplicationSchema);
