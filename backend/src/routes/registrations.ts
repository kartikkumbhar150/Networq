import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Event from '../models/Event';
import Registration from '../models/Registration';
import User from '../models/User';
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
// User registers for an event (payment goes to escrow)
router.post('/events/:id/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(401).json({ message: 'Unauthorized.' }); return; }
    if (user.accountType !== 'user') {
      res.status(403).json({ message: 'Only individual user accounts can register for events.' }); return;
    }

    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (!['published', 'ongoing'].includes(event.status)) {
      res.status(400).json({ message: 'Event is not accepting registrations.' }); return;
    }

    // Check capacity
    const currentCount = await Registration.countDocuments({ eventId: event._id });
    if (currentCount >= event.capacity) {
      res.status(409).json({ message: 'Event is fully booked.' }); return;
    }

    // Check already registered
    const existing = await Registration.findOne({ eventId: event._id, userId: req.userId });
    if (existing) { res.status(409).json({ message: 'You are already registered for this event.' }); return; }

    // Generate unique Dual-QR tokens
    const entryQrToken = uuidv4();
    const exitQrToken = uuidv4();
    const entryQrDataUrl = await generateQRDataUrl(entryQrToken);
    const exitQrDataUrl = await generateQRDataUrl(exitQrToken);

    const registration = await Registration.create({
      eventId: event._id,
      userId: req.userId,
      qrToken: uuidv4(), // Prevents legacy E11000 duplicate key index collision
      entryQrToken,
      exitQrToken,
      amountPaid: event.ticketPrice,
      paymentStatus: 'held',
    });

    // Update event escrow amount
    event.escrowAmount += event.ticketPrice;
    await event.save();

    // Send ticket email with BOTH QRs
    const eventDateStr = new Date(event.date).toLocaleDateString('en-IN', {
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
// Organizer scans a QR → toggles check-in / check-out
router.post('/events/:id/scan', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the event organizer can scan QR codes.' }); return;
    }

    const { qrToken } = req.body;
    if (!qrToken) { res.status(400).json({ message: 'qrToken is required.' }); return; }

    const reg = await Registration.findOne({ 
      eventId: event._id, 
      $or: [{ entryQrToken: qrToken }, { exitQrToken: qrToken }, { qrToken }] 
    }).populate<{ userId: { name: string; email: string } }>('userId');
    
    if (!reg) { res.status(404).json({ message: 'Invalid QR code — registration not found.' }); return; }

    const attendee = reg.userId as { name: string; email: string };
    let action = '';

    if (qrToken === reg.entryQrToken || (!reg.entryQrToken && qrToken === reg.qrToken && !reg.checkIn)) {
      if (reg.checkIn) {
        res.json({ message: 'Attendee has already checked in.', attendeeName: attendee.name }); return;
      }
      reg.checkIn = new Date();
      action = 'check_in';
    } else if (qrToken === reg.exitQrToken || (!reg.exitQrToken && qrToken === reg.qrToken && reg.checkIn)) {
      if (!reg.checkIn) {
        res.status(400).json({ message: 'Cannot checkout before check-in! Please scan Entry QR first.' }); return;
      }
      if (reg.checkOut) {
        res.json({ message: 'Attendee has already checked out.', attendeeName: attendee.name }); return;
      }
      reg.checkOut = new Date();
      reg.status = 'completed';
      action = 'check_out';
    } else {
      res.status(400).json({ message: 'Invalid QR token scanned for this action.' }); return;
    }

    await reg.save();

    res.json({
      message: action === 'check_in' ? `✅ Check-in recorded for ${attendee.name}` : `🚪 Check-out recorded for ${attendee.name}`,
      action,
      attendeeName: attendee.name,
      checkIn: reg.checkIn,
      checkOut: reg.checkOut,
    });
  } catch (err) {
    console.error('[registrations:scan]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/registrations/events/:id/send-qr ───────────────────────────────
// Organizer blasts QR emails — check-in or check-out
router.post('/events/:id/send-qr', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized.' }); return;
    }

    const { type } = req.body; // 'checkin' | 'checkout'
    if (!['checkin', 'checkout'].includes(type)) {
      res.status(400).json({ message: 'type must be "checkin" or "checkout".' }); return;
    }

    const registrations = await Registration.find({
      eventId: event._id,
      status: { $nin: ['refunded', 'cancelled'] },
    }).populate<{ userId: { name: string; email: string } }>('userId');

    let sent = 0;
    for (const reg of registrations) {
      const attendee = reg.userId as { name: string; email: string };
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
// Logged-in user sees their own registrations
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const registrations = await Registration.find({ userId: req.userId })
      .populate('eventId', 'title venue date endDate status ticketPrice')
      .sort({ createdAt: -1 });
    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/registrations/postpone-response ───────────────────────────────
// Attendee responds to event postponement (via email link token = registrationId)
router.patch('/postpone-response', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token, action } = req.body; // token = registrationId, action = 'accept' | 'refund'
    if (!token || !['accept', 'refund'].includes(action)) {
      res.status(400).json({ message: 'Invalid request.' }); return;
    }

    const reg = await Registration.findById(token)
      .populate<{ userId: { _id: string; name: string; email: string } }>('userId')
      .populate<{ eventId: { title: string; status: string; date: Date } }>('eventId');
    if (!reg) { res.status(404).json({ message: 'Registration not found.' }); return; }

    const attendee = reg.userId as { _id: string; name: string; email: string };
    const event = reg.eventId as { title: string; status: string; date: Date };

    if (action === 'refund') {
      reg.postponeResponse = 'refund_requested';
      reg.paymentStatus = 'refunded';
      reg.status = 'refunded';
      await reg.save();

      // Update escrow
      await Event.findByIdAndUpdate(reg.eventId, { $inc: { escrowAmount: -reg.amountPaid } });
      await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);

      res.json({ message: 'Refund processed. Your ticket has been cancelled.' });
    } else {
      reg.postponeResponse = 'accepted';
      await reg.save();
      res.json({ message: 'You have accepted the new event date. See you there!' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
