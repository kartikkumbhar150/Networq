import mongoose, { Schema, Document } from 'mongoose';

export interface IConnection extends Document {
  requesterId: string;
  requesterName: string;
  requesterAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: Date;
  updatedAt: Date;
}

const connectionSchema = new Schema<IConnection>(
  {
    requesterId: { type: String, required: true, index: true },
    requesterName: { type: String, required: true },
    requesterAvatar: { type: String },
    receiverId: { type: String, required: true, index: true },
    receiverName: { type: String, required: true },
    receiverAvatar: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending/accepted requests between identical ID pairs
connectionSchema.index({ requesterId: 1, receiverId: 1 }, { unique: false });

export default mongoose.model<IConnection>('Connection', connectionSchema);
