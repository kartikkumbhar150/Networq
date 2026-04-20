import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
  companyId: mongoose.Types.ObjectId | any;
  isFromVerifiedCompany: boolean;
  
  pillar: 'capital' | 'procurement' | 'alliance';
  type: string; // e.g. 'seed_funding', 'job', 'freelance', 'jv'
  title: string;
  description: string;
  requirements: string[];
  status: 'open' | 'negotiation' | 'escrow' | 'closed';

  // Pillar A: Capital
  fundingAmount?: number;
  equityOffered?: number;
  valuation?: number;
  dataRoomUrl?: string;

  // Pillar B: Procurement
  budget?: number;
  biddingType?: 'fixed' | 'milestone';
  milestones?: { title: string; amount: number; completed: boolean }[];

  // Pillar C: Alliance
  allianceType?: string;
  synergyTags?: string[];

  // Contact Info
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isFromVerifiedCompany: { type: Boolean, default: false },

    pillar: { type: String, enum: ['capital', 'procurement', 'alliance'], required: true },
    type: { type: String, required: true }, // 'job', 'seed_funding', 'freelance', etc.
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    status: { type: String, enum: ['open', 'negotiation', 'escrow', 'closed'], default: 'open' },

    // Capital
    fundingAmount: { type: Number },
    equityOffered: { type: Number },
    valuation: { type: Number },
    dataRoomUrl: { type: String },

    // Procurement
    budget: { type: Number },
    biddingType: { type: String, enum: ['fixed', 'milestone'] },
    milestones: [
      {
        title: { type: String },
        amount: { type: Number },
        completed: { type: Boolean, default: false }
      }
    ],

    // Alliance
    allianceType: { type: String },
    synergyTags: { type: [String], default: [] },

    // Contact Info
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Optimize searches since users will retrieve all opportunities frequently
OpportunitySchema.index({ createdAt: -1 });
OpportunitySchema.index({ pillar: 1, type: 1 });

export default mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
