import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Event from '../models/Event';
import Registration from '../models/Registration';
import User from '../models/User';
import { scheduleSettlement } from '../utils/scheduler';
import { sendRefundEmail } from '../utils/email';

const router = Router();

// All event routes require authentication
router.use(authMiddleware);

// ─── POST /api/events ─────────────────────────────────────────────────────────
// Create a new event (company only)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.accountType !== 'company') {
      res.status(403).json({ message: 'Only company accounts can create events.' });
      return;
    }

    const { title, description, venue, date, endDate, capacity, ticketPrice, attendanceThreshold } = req.body;

    if (!title || !description || !venue || !date || !endDate || !capacity || ticketPrice === undefined) {
      res.status(400).json({ message: 'All event fields are required.' });
      return;
    }

    if (new Date(endDate) <= new Date(date)) {
      res.status(400).json({ message: 'End date must be after start date.' });
      return;
    }

    const event = await Event.create({
      title, description, venue,
      date: new Date(date),
      endDate: new Date(endDate),
      capacity: Number(capacity),
      ticketPrice: Number(ticketPrice),
      organizerId: req.userId,
      attendanceThreshold: attendanceThreshold ? Number(attendanceThreshold) : 70,
    });

    // Schedule escrow settlement 1 min after endDate
    scheduleSettlement(event.id, event.endDate);

    res.status(201).json({ message: 'Event created.', event });
  } catch (err) {
    console.error('[events:create]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events ──────────────────────────────────────────────────────────
// List all published events
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    let query: any = { status: { $in: ['published', 'ongoing'] } };

    // Companies see all published events, PLUS their own events regardless of status
    if (user?.accountType === 'company') {
      query = {
        $or: [
          { status: { $in: ['published', 'ongoing'] } },
          { organizerId: req.userId }
        ]
      };
    }

    const events = await Event.find(query)
      .populate('organizerId', 'name companyDetails isVerifiedCompany')
      .sort({ date: 1 });

    // Attach registration count to each event
    const enriched = await Promise.all(events.map(async (ev) => {
      const registrationCount = await Registration.countDocuments({ eventId: ev._id });
      return { ...ev.toObject(), registrationCount };
    }));

    res.json({ events: enriched });
  } catch (err) {
    console.error('[events:list]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email companyDetails isVerifiedCompany');
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }

    const registrationCount = await Registration.countDocuments({ eventId: event._id });
    const fullAttendees = await Registration.countDocuments({ eventId: event._id, checkIn: { $exists: true }, checkOut: { $exists: true } });
    const checkInCount = await Registration.countDocuments({ eventId: event._id, checkIn: { $exists: true } });

    res.json({
      event: event.toObject(),
      stats: { registrationCount, checkInCount, fullAttendees, attendancePct: registrationCount ? ((fullAttendees / registrationCount) * 100).toFixed(1) : '0' }
    });
  } catch (err) {
    console.error('[events:get]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/events/:id/start ─────────────────────────────────────────────
router.patch('/:id/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }

    event.status = 'ongoing';
    await event.save();
    res.json({ message: 'Event marked as ongoing.', event });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/events/:id/cancel ────────────────────────────────────────────
router.patch('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }
    if (!['published', 'postponed'].includes(event.status)) {
      res.status(400).json({ message: 'Event cannot be cancelled in its current state.' }); return;
    }

    // Refund all held payments
    const registrations = await Registration.find({ eventId: event._id, paymentStatus: 'held' })
      .populate<{ userId: { name: string; email: string } }>('userId');

    for (const reg of registrations) {
      await Registration.findByIdAndUpdate(reg._id, { paymentStatus: 'refunded', status: 'cancelled' });
      const attendee = reg.userId as { name: string; email: string };
      await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);
    }

    event.status = 'cancelled';
    event.escrowAmount = 0;
    await event.save();

    res.json({ message: `Event cancelled. ${registrations.length} refund(s) issued.` });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/events/:id/postpone ──────────────────────────────────────────
router.patch('/:id/postpone', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }
    if (event.status !== 'published') { res.status(400).json({ message: 'Only published events can be postponed.' }); return; }

    const { newDate, newEndDate } = req.body;
    if (!newDate || !newEndDate) { res.status(400).json({ message: 'newDate and newEndDate are required.' }); return; }

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hrs

    event.status = 'postponed';
    event.postponeProposedDate = new Date(newDate);
    event.postponeDeadline = deadline;
    await event.save();

    // Notify all registrants
    const { sendPostponeNotification } = await import('../utils/email');
    const registrations = await Registration.find({ eventId: event._id, status: { $nin: ['refunded', 'cancelled'] } })
      .populate<{ userId: { _id: string; name: string; email: string } }>('userId');

    const newDateStr = new Date(newDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const deadlineStr = deadline.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    for (const reg of registrations) {
      const attendee = reg.userId as { _id: string; name: string; email: string };
      await Registration.findByIdAndUpdate(reg._id, { postponeResponse: 'pending' });
      await sendPostponeNotification(
        attendee.email, attendee.name, event.title,
        newDateStr, reg.id, deadlineStr
      );
    }

    res.json({ message: `Event postponed. ${registrations.length} attendee(s) notified.` });
  } catch (err) {
    console.error('[events:postpone]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events/:id/registrations ───────────────────────────────────────
// Organizer only: see all registrations + attendance
router.get('/:id/registrations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId.toString() !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }

    const regs = await Registration.find({ eventId: event._id })
      .populate('userId', 'name email accountType');

    res.json({ registrations: regs });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
