import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICompanyRepresentative extends Document {
  companyId: Types.ObjectId;           // ref → User (accountType='company')
  userId: Types.ObjectId;              // ref → User (the actual human rep)
  representativeType: 'founder' | 'director' | 'authorized_rep' | 'employee';
  authorizationScope: Array<'can_pitch_investment' | 'can_execute_investment'>;
  verificationStatus: 'pending_verification' | 'verified' | 'revoked';
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;         // admin user who approved
  bankAccountAuthorized: boolean;
  bankAccountDetails?: string;         // encrypted JSON string: { account, ifscCode, bankName }
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyRepresentativeSchema = new Schema<ICompanyRepresentative>(
  {
    companyId:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
    representativeType:   {
      type: String,
      enum: ['founder', 'director', 'authorized_rep', 'employee'],
      required: true,
    },
    authorizationScope:   {
      type: [String],
      enum: ['can_pitch_investment', 'can_execute_investment'],
      default: [],
    },
    verificationStatus:   {
      type: String,
      enum: ['pending_verification', 'verified', 'revoked'],
      default: 'pending_verification',
    },
    verifiedAt:           { type: Date },
    verifiedBy:           { type: Schema.Types.ObjectId, ref: 'User' },
    bankAccountAuthorized:{ type: Boolean, default: false },
    bankAccountDetails:   { type: String },   // encrypted at application layer
    revokedReason:        { type: String },
  },
  { timestamps: true }
);

// One user can represent a company in only one role
CompanyRepresentativeSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export default mongoose.model<ICompanyRepresentative>('CompanyRepresentative', CompanyRepresentativeSchema);
