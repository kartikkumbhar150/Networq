import mongoose, { Schema, Document } from 'mongoose';

export interface IProfileRecommendation extends Document {
  userId: string;
  recommendations: {
    type: string;         // 'headline' | 'summary' | 'skills' | 'experience' | 'education' | 'general'
    text: string;
    confidence: 'high' | 'medium' | 'low';
    priority: number;     // 1 = highest
    applied: boolean;
  }[];
  profileScore: number;  // 0–100
  scoreBreakdown: {
    category: string;
    score: number;
    maxScore: number;
    tips: string[];
  }[];
  generatedAt: Date;
  expiresAt: Date;
}

const ProfileRecommendationSchema = new Schema<IProfileRecommendation>(
  {
    userId: { type: String, required: true, index: true },
    recommendations: [
      {
        type:       { type: String, required: true },
        text:       { type: String, required: true },
        confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        priority:   { type: Number, default: 5 },
        applied:    { type: Boolean, default: false },
      },
    ],
    profileScore: { type: Number, default: 0 },
    scoreBreakdown: [
      {
        category: { type: String },
        score:    { type: Number },
        maxScore: { type: Number },
        tips:     [{ type: String }],
      },
    ],
    generatedAt: { type: Date, default: Date.now },
    expiresAt:   { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }, // 24h
  },
  { timestamps: true }
);

export default mongoose.model<IProfileRecommendation>('ProfileRecommendation', ProfileRecommendationSchema);
