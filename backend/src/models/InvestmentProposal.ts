import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFraudFlag {
  flagType:
    | 'upfront_fee_requested'
    | 'multiple_unrelated_companies'
    | 'bank_account_mismatch'
    | 'founder_not_communicating'
    | 'separate_payment_request';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  createdAt: Date;
}

export interface IBankAccountForInvestment {
  account: string;
  ifscCode: string;
  bankName?: string;
  verified: boolean;   // true only after matched against company's verified bank account
}

export interface IInvestmentProposal extends Document {
  companyId: Types.ObjectId;           // ref → User (company)
  createdBy: Types.ObjectId;           // ref → CompanyRepresentative  (NOT User._id)
  proposalTitle: string;
  description: string;
  investmentAmount: number;            // in INR
  equityOffering: number;              // percentage 0-100
  investmentType: 'equity' | 'debt' | 'convertible_note' | 'safe';
  status: 'draft' | 'active' | 'owner_verified' | 'investment_completed' | 'frozen' | 'cancelled';
  investorsInvolved: Types.ObjectId[]; // ref → User
  // CRITICAL CHECKPOINT: investor verified that they're talking to the real rep
  creatorVerificationCheckpoint: boolean;
  bankAccountForInvestment?: IBankAccountForInvestment;
  fraudFlags: IFraudFlag[];
  riskScore: number;                   // 0-100, auto-computed from fraudFlags (+20 per flag)
  isFrozen: boolean;                   // true when riskScore >= 60
  frozenReason?: string;
  auditTrail: Array<{
    action: string;
    performedBy: Types.ObjectId;
    performedAt: Date;
    metadata?: Record<string, any>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const FraudFlagSchema = new Schema<IFraudFlag>(
  {
    flagType: {
      type: String,
      enum: [
        'upfront_fee_requested',
        'multiple_unrelated_companies',
        'bank_account_mismatch',
        'founder_not_communicating',
        'separate_payment_request',
      ],
      required: true,
    },
    severity:    { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    description: { type: String },
    createdAt:   { type: Date, default: Date.now },
  },
  { _id: true }
);

const BankAccountSchema = new Schema<IBankAccountForInvestment>(
  {
    account:  { type: String, required: true },
    ifscCode: { type: String, required: true },
    bankName: { type: String },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const InvestmentProposalSchema = new Schema<IInvestmentProposal>(
  {
    companyId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy:        { type: Schema.Types.ObjectId, ref: 'CompanyRepresentative', required: true },
    proposalTitle:    { type: String, required: true, trim: true },
    description:      { type: String, required: true },
    investmentAmount: { type: Number, required: true, min: 0 },
    equityOffering:   { type: Number, required: true, min: 0, max: 100 },
    investmentType:   {
      type: String,
      enum: ['equity', 'debt', 'convertible_note', 'safe'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'owner_verified', 'investment_completed', 'frozen', 'cancelled'],
      default: 'draft',
    },
    investorsInvolved:            { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    creatorVerificationCheckpoint:{ type: Boolean, default: false },
    bankAccountForInvestment:     { type: BankAccountSchema },
    fraudFlags:                   { type: [FraudFlagSchema], default: [] },
    riskScore:                    { type: Number, default: 0 },
    isFrozen:                     { type: Boolean, default: false },
    frozenReason:                 { type: String },
    auditTrail: [
      {
        action:      { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        performedAt: { type: Date, default: Date.now },
        metadata:    { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

// Index for quick company + status lookups
InvestmentProposalSchema.index({ companyId: 1, status: 1 });

export default mongoose.model<IInvestmentProposal>('InvestmentProposal', InvestmentProposalSchema);
