import Event from '../models/Event';
import Registration from '../models/Registration';
import User from '../models/User';
import { sendRefundEmail, sendReleaseEmail } from './email';

/**
 * Runs escrow settlement for a given event.
 * Called automatically 1 minute after event endDate.
 */
export async function settleEscrow(eventId: string): Promise<void> {
  try {
    const event = await Event.findById(eventId).populate<{ organizerId: { _id: string; name: string; email: string } }>('organizerId');
    if (!event) {
      console.error(`[escrow] Event ${eventId} not found`);
      return;
    }

    // Skip if already settled
    if (event.status === 'completed' || event.status === 'refunded' || event.status === 'cancelled') {
      return;
    }

    const registrations = await Registration.find({ eventId, paymentStatus: 'held' })
      .populate<{ userId: { _id: string; name: string; email: string } }>('userId');

    const total = registrations.length;
    if (total === 0) {
      event.status = 'completed';
      await event.save();
      return;
    }

    // Count full participants (both check-in AND check-out)
    const fullAttendees = registrations.filter(r => r.checkIn && r.checkOut).length;
    const attendancePct = (fullAttendees / total) * 100;

    console.log(`[escrow] Event ${event.title}: ${fullAttendees}/${total} full attendees (${attendancePct.toFixed(1)}%)`);

    if (attendancePct >= event.attendanceThreshold) {
      // ─── Release funds to organizer ───────────────────────────────────
      const totalEscrow = registrations.reduce((sum, r) => sum + r.amountPaid, 0);

      await Registration.updateMany(
        { eventId, paymentStatus: 'held' },
        { $set: { paymentStatus: 'released', status: 'completed' } }
      );

      event.status = 'completed';
      event.escrowAmount = 0;
      await event.save();

      // Notify organizer
      const organizer = event.organizerId as { name: string; email: string };
      await sendReleaseEmail(organizer.email, organizer.name, event.title, totalEscrow);

      console.log(`[escrow] ✅ Released ₹${totalEscrow} to organizer for "${event.title}"`);
    } else {
      // ─── Issue full refunds to all attendees ───────────────────────────
      event.status = 'refunded';
      event.escrowAmount = 0;
      await event.save();

      for (const reg of registrations) {
        await Registration.findByIdAndUpdate(reg._id, { paymentStatus: 'refunded', status: 'refunded' });
        const attendee = reg.userId as { name: string; email: string };
        await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);
      }

      console.log(`[escrow] ❌ Threshold not met for "${event.title}". Refunded ${total} attendees.`);
    }
  } catch (err) {
    console.error('[escrow] Settlement error:', err);
  }
}
