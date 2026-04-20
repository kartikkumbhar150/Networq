import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  venue: string;
  date: Date;           // event start datetime
  endDate: Date;        // event end datetime
  capacity: number;
  ticketPrice: number;
  organizerId: Types.ObjectId;
  status: 'published' | 'ongoing' | 'completed' | 'cancelled' | 'postponed' | 'refunded';
  escrowAmount: number;
  attendanceThreshold: number; // default 70 (percent)
  postponeProposedDate?: Date;
  postponeDeadline?: Date;
  boostedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    ticketPrice: { type: Number, required: true, min: 0 },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['published', 'ongoing', 'completed', 'cancelled', 'postponed', 'refunded'], default: 'published' },
    escrowAmount: { type: Number, default: 0 },
    attendanceThreshold: { type: Number, default: 70 },
    postponeProposedDate: { type: Date },
    postponeDeadline: { type: Date },
    boostedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>('Event', EventSchema);
