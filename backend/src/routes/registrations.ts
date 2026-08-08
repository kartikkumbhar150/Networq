import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';
import { generateQRDataUrl } from '../utils/qr';
import {
  sendTicketEmail,
  sendCheckInQREmail,
  sendCheckOutQREmail,
  sendRefundEmail,
} from '../utils/email';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/registrations/events/:id/register ──────────────────────────────
router.post('/events/:id/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(401).json({ message: 'Unauthorized.' }); return; }
    if (user.accountType !== 'user') {
      res.status(403).json({ message: 'Only individual user accounts can register for events.' }); return;
    }

    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (!['published', 'ongoing'].includes(event.status)) {
      res.status(400).json({ message: 'Event is not accepting registrations.' }); return;
    }

    const currentCount = await prisma.registration.count({ where: { eventId: event.id } });
    if (currentCount >= event.capacity) {
      res.status(409).json({ message: 'Event is fully booked.' }); return;
    }

    const existing = await prisma.registration.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: req.userId! } }
    });
    if (existing) { res.status(409).json({ message: 'You are already registered for this event.' }); return; }

    const entryQrToken = uuidv4();
    const exitQrToken = uuidv4();
    const entryQrDataUrl = await generateQRDataUrl(entryQrToken);
    const exitQrDataUrl = await generateQRDataUrl(exitQrToken);

    const registration = await prisma.registration.create({
      data: {
        eventId: event.id,
        userId: req.userId!,
        qrToken: uuidv4(),
        entryQrToken,
        exitQrToken,
        amountPaid: event.ticketPrice,
        paymentStatus: 'held',
      }
    });

    await prisma.event.update({
      where: { id: event.id },
      data: { escrowAmount: event.escrowAmount + event.ticketPrice }
    });

    const eventDateStr = event.date.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    await sendTicketEmail(user.email, user.name, event.title, entryQrDataUrl, exitQrDataUrl, eventDateStr, event.venue);

    res.status(201).json({
      message: `Registered successfully! Your Entry/Exit QR tickets have been emailed to ${user.email}.`,
      registration: { id: registration.id, eventTitle: event.title },
    });
  } catch (err) {
    console.error('[registrations:register]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/registrations/events/:id/scan ──────────────────────────────────
router.post('/events/:id/scan', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) {
      res.status(403).json({ message: 'Only the event organizer can scan QR codes.' }); return;
    }

    const { qrToken } = req.body;
    if (!qrToken) { res.status(400).json({ message: 'qrToken is required.' }); return; }

    const reg = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        OR: [{ entryQrToken: qrToken }, { exitQrToken: qrToken }, { qrToken }]
      }
    });

    if (!reg) { res.status(404).json({ message: 'Invalid QR code — registration not found.' }); return; }

    const attendee = await prisma.user.findUnique({ where: { id: reg.userId } });
    if (!attendee) { res.status(404).json({ message: 'Attendee not found.' }); return; }

    let action = '';
    let updateData: any = {};

    if (qrToken === reg.entryQrToken || (!reg.entryQrToken && qrToken === reg.qrToken && !reg.checkIn)) {
      if (reg.checkIn) {
        res.json({ message: 'Attendee has already checked in.', attendeeName: attendee.name }); return;
      }
      updateData.checkIn = new Date();
      action = 'check_in';
    } else if (qrToken === reg.exitQrToken || (!reg.exitQrToken && qrToken === reg.qrToken && reg.checkIn)) {
      if (!reg.checkIn) {
        res.status(400).json({ message: 'Cannot checkout before check-in! Please scan Entry QR first.' }); return;
      }
      if (reg.checkOut) {
        res.json({ message: 'Attendee has already checked out.', attendeeName: attendee.name }); return;
      }
      updateData.checkOut = new Date();
      updateData.status = 'completed';
      action = 'check_out';
    } else {
      res.status(400).json({ message: 'Invalid QR token scanned for this action.' }); return;
    }

    const updatedReg = await prisma.registration.update({
      where: { id: reg.id },
      data: updateData
    });

    res.json({
      message: action === 'check_in' ? `✅ Check-in recorded for ${attendee.name}` : `🚪 Check-out recorded for ${attendee.name}`,
      action,
      attendeeName: attendee.name,
      checkIn: updatedReg.checkIn,
      checkOut: updatedReg.checkOut,
    });
  } catch (err) {
    console.error('[registrations:scan]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/registrations/events/:id/send-qr ───────────────────────────────
router.post('/events/:id/send-qr', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) {
      res.status(403).json({ message: 'Not authorized.' }); return;
    }

    const { type } = req.body; 
    if (!['checkin', 'checkout'].includes(type)) {
      res.status(400).json({ message: 'type must be "checkin" or "checkout".' }); return;
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId: event.id, status: { notIn: ['refunded', 'cancelled'] } }
    });

    const userIds = registrations.map(r => r.userId);
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });

    let sent = 0;
    for (const reg of registrations) {
      const attendee = users.find(u => u.id === reg.userId);
      if (!attendee) continue;

      const tokenToUse = type === 'checkin' ? reg.entryQrToken : reg.exitQrToken;
      const qrDataUrl = await generateQRDataUrl(tokenToUse || reg.qrToken || '');

      if (type === 'checkin') {
        await sendCheckInQREmail(attendee.email, attendee.name, event.title, qrDataUrl);
      } else {
        await sendCheckOutQREmail(attendee.email, attendee.name, event.title, qrDataUrl);
      }
      sent++;
    }

    res.json({ message: `${type === 'checkin' ? 'Check-in' : 'Check-out'} QR emails sent to ${sent} attendee(s).` });
  } catch (err) {
    console.error('[registrations:send-qr]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/registrations/my ────────────────────────────────────────────────
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });

    const eventIds = registrations.map(r => r.eventId);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true, venue: true, date: true, endDate: true, status: true, ticketPrice: true }
    });

    const enriched = registrations.map(reg => {
      const ev = events.find(e => e.id === reg.eventId);
      return { ...reg, eventId: ev || reg.eventId };
    });

    res.json({ registrations: enriched });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/registrations/postpone-response ───────────────────────────────
router.patch('/postpone-response', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, action } = req.body; 
    if (!token || !['accept', 'refund'].includes(action)) {
      res.status(400).json({ message: 'Invalid request.' }); return;
    }

    const reg = await prisma.registration.findUnique({ where: { id: token } });
    if (!reg) { res.status(404).json({ message: 'Registration not found.' }); return; }

    const attendee = await prisma.user.findUnique({ where: { id: reg.userId } });
    const event = await prisma.event.findUnique({ where: { id: reg.eventId } });
    if (!attendee || !event) { res.status(404).json({ message: 'Associated records not found.' }); return; }

    if (action === 'refund') {
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          postponeResponse: 'refund_requested',
          paymentStatus: 'refunded',
          status: 'refunded'
        }
      });

      await prisma.event.update({
        where: { id: event.id },
        data: { escrowAmount: event.escrowAmount - reg.amountPaid }
      });
      
      await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);

      res.json({ message: 'Refund processed. Your ticket has been cancelled.' });
    } else {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { postponeResponse: 'accepted' }
      });
      res.json({ message: 'You have accepted the new event date. See you there!' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
