import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  type: 'text' | 'event_share' | 'achievement';
  attachedEventId?: mongoose.Types.ObjectId;
  likes: { userId: string; likedAt: Date }[];
  likeCount: number;
  comments: {
    commentId: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }[];
  commentCount: number;
  boostedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    content: { type: String, required: true, maxlength: 2000 },
    type: { type: String, enum: ['text', 'event_share', 'achievement'], default: 'text' },
    attachedEventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    likes: [
      {
        userId: { type: String, required: true },
        likedAt: { type: Date, default: Date.now },
      },
    ],
    likeCount: { type: Number, default: 0 },
    comments: [
      {
        commentId: { type: String, required: true },
        authorId: { type: String, required: true },
        authorName: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    commentCount: { type: Number, default: 0 },
    boostedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

export default mongoose.model<IPost>('Post', postSchema);
