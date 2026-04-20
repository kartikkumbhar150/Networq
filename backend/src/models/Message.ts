import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  type: 'text' | 'event_share' | 'image';
  attachedEventId?: mongoose.Types.ObjectId;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 1000 },
    type: { type: String, enum: ['text', 'event_share', 'image'], default: 'text' },
    attachedEventId: { type: Schema.Types.ObjectId, ref: 'Event', default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
