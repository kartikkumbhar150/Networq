import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEncryptedMessage {
  _id: Types.ObjectId;
  senderId: Types.ObjectId;      // ref → User
  messageBody: string;           // AES-encrypted at application layer
  timestamp: Date;
  readAt?: Date;
}

export interface IInvestorVerificationCheckpoint {
  investorConfirmsRealRep: boolean;
  questionAnswers: Array<{
    question: string;
    givenAnswer: string;
    isCorrect: boolean;
  }>;
  correctCount: number;          // must be >= 3 out of 4 to pass
  passed: boolean;
  verifiedAt?: Date;
}

export interface IDirectCommunicationSession extends Document {
  investmentProposalId: Types.ObjectId;   // ref → InvestmentProposal
  companyId: Types.ObjectId;              // ref → User (company)
  companyRepId: Types.ObjectId;           // ref → CompanyRepresentative
  investorId: Types.ObjectId;             // ref → User (investor)
  sessionType: 'platform_messaging' | 'video_call';
  isActive: boolean;
  encryptedMessages: IEncryptedMessage[];
  investorVerificationCheckpoint?: IInvestorVerificationCheckpoint;
  createdAt: Date;
  updatedAt: Date;
}

const EncryptedMessageSchema = new Schema<IEncryptedMessage>(
  {
    senderId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    messageBody: { type: String, required: true },    // stored encrypted
    timestamp:   { type: Date, default: Date.now },
    readAt:      { type: Date },
  },
  { _id: true }
);

const InvestorVerificationCheckpointSchema = new Schema<IInvestorVerificationCheckpoint>(
  {
    investorConfirmsRealRep: { type: Boolean, default: false },
    questionAnswers: [
      {
        question:    { type: String, required: true },
        givenAnswer: { type: String, required: true },
        isCorrect:   { type: Boolean, required: true },
      },
    ],
    correctCount: { type: Number, default: 0 },
    passed:       { type: Boolean, default: false },
    verifiedAt:   { type: Date },
  },
  { _id: false }
);

const DirectCommunicationSessionSchema = new Schema<IDirectCommunicationSession>(
  {
    investmentProposalId: { type: Schema.Types.ObjectId, ref: 'InvestmentProposal', required: true },
    companyId:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    companyRepId:         { type: Schema.Types.ObjectId, ref: 'CompanyRepresentative', required: true },
    investorId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionType:          {
      type: String,
      enum: ['platform_messaging', 'video_call'],
      default: 'platform_messaging',
    },
    isActive:                       { type: Boolean, default: true },
    encryptedMessages:              { type: [EncryptedMessageSchema], default: [] },
    investorVerificationCheckpoint: { type: InvestorVerificationCheckpointSchema },
  },
  { timestamps: true }
);

// One session per investor per proposal
DirectCommunicationSessionSchema.index(
  { investmentProposalId: 1, investorId: 1 },
  { unique: true }
);

export default mongoose.model<IDirectCommunicationSession>(
  'DirectCommunicationSession',
  DirectCommunicationSessionSchema
);
