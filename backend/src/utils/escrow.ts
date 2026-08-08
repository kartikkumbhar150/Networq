import prisma from '../db/prisma';
import { sendRefundEmail, sendReleaseEmail } from './email';

/**
 * Runs escrow settlement for a given event.
 * Called automatically 1 minute after event endDate.
 */
export async function settleEscrow(eventId: string): Promise<void> {
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      console.error(`[escrow] Event ${eventId} not found`);
      return;
    }

    // Skip if already settled
    if (event.status === 'completed' || event.status === 'refunded' || event.status === 'cancelled') {
      return;
    }

    const registrations = await prisma.registration.findMany({ 
      where: { eventId, paymentStatus: 'held' }
    });

    const total = registrations.length;
    if (total === 0) {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'completed' }
      });
      return;
    }

    // Count full participants (both check-in AND check-out)
    const fullAttendees = registrations.filter((r: any) => r.checkIn && r.checkOut).length;
    const attendancePct = (fullAttendees / total) * 100;

    console.log(`[escrow] Event ${event.title}: ${fullAttendees}/${total} full attendees (${attendancePct.toFixed(1)}%)`);

    if (attendancePct >= event.attendanceThreshold) {
      // ─── Release funds to organizer ───────────────────────────────────
      const totalEscrow = registrations.reduce((sum: number, r: any) => sum + r.amountPaid, 0);

      await prisma.registration.updateMany({
        where: { eventId, paymentStatus: 'held' },
        data: { paymentStatus: 'released', status: 'completed' }
      });

      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'completed', escrowAmount: 0 }
      });

      // Notify organizer
      const organizer = await prisma.user.findUnique({ where: { id: event.organizerId } });
      if (organizer) {
        await sendReleaseEmail(organizer.email, organizer.name, event.title, totalEscrow);
      }

      console.log(`[escrow] ✅ Released ₹${totalEscrow} to organizer for "${event.title}"`);
    } else {
      // ─── Issue full refunds to all attendees ───────────────────────────
      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'refunded', escrowAmount: 0 }
      });

      const userIds = registrations.map((r: any) => r.userId);
      const users = await prisma.user.findMany({ where: { id: { in: userIds } } });

      for (const reg of registrations) {
        await prisma.registration.update({
          where: { id: reg.id },
          data: { paymentStatus: 'refunded', status: 'refunded' }
        });
        const attendee = users.find((u: any) => u.id === reg.userId);
        if (attendee) {
          await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);
        }
      }

      console.log(`[escrow] ❌ Threshold not met for "${event.title}". Refunded ${total} attendees.`);
    }
  } catch (err) {
    console.error('[escrow] Settlement error:', err);
  }
}
