import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  conversationId: string;
  participants: string[];
  participantNames: Map<string, string>;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  lastMessageAt: Date;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true, unique: true },
    participants: { type: [String], required: true, index: true },
    participantNames: { type: Map, of: String },
    lastMessage: {
      content: { type: String },
      senderId: { type: String },
      createdAt: { type: Date },
    },
    lastMessageAt: { type: Date, index: true },
    unreadCount: { type: Map, of: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IConversation>('Conversation', conversationSchema);
