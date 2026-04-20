import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRegistration extends Document {
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  qrToken?: string;         // Legacy (Optional for backwards compatibility)
  entryQrToken: string;     // UUID for Entry
  exitQrToken: string;      // UUID for Exit
  status: 'registered' | 'check_in_sent' | 'completed' | 'refunded' | 'cancelled';
  paymentStatus: 'held' | 'released' | 'refunded';
  amountPaid: number;
  checkIn?: Date;
  checkOut?: Date;
  postponeResponse: 'pending' | 'accepted' | 'refund_requested';
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    eventId:          { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    qrToken:          { type: String }, // Legacy
    entryQrToken:     { type: String, required: true, unique: true },
    exitQrToken:      { type: String, required: true, unique: true },
    status:           { type: String, enum: ['registered','check_in_sent','completed','refunded','cancelled'], default: 'registered' },
    paymentStatus:    { type: String, enum: ['held','released','refunded'], default: 'held' },
    amountPaid:       { type: Number, required: true },
    checkIn:          { type: Date },
    checkOut:         { type: Date },
    postponeResponse: { type: String, enum: ['pending','accepted','refund_requested'], default: 'pending' },
  },
  { timestamps: true }
);

// Compound index → one registration per user per event
RegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IRegistration>('Registration', RegistrationSchema);
