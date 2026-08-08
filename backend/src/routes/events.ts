import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';
import { scheduleSettlement } from '../utils/scheduler';
import { sendRefundEmail } from '../utils/email';

const router = Router();

// All event routes require authentication
router.use(authMiddleware);

// ─── POST /api/events ─────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
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

    const event = await prisma.event.create({
      data: {
        title, description, venue,
        date: new Date(date),
        endDate: new Date(endDate),
        capacity: Number(capacity),
        ticketPrice: Number(ticketPrice),
        organizerId: req.userId!,
        attendanceThreshold: attendanceThreshold ? Number(attendanceThreshold) : 70,
      }
    });

    scheduleSettlement(event.id, event.endDate);

    res.status(201).json({ message: 'Event created.', event });
  } catch (err) {
    console.error('[events:create]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events ──────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    
    let whereClause: any = { status: { in: ['published', 'ongoing'] } };

    if (user?.accountType === 'company') {
      whereClause = {
        OR: [
          { status: { in: ['published', 'ongoing'] } },
          { organizerId: req.userId }
        ]
      };
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Populate organizer and registration count
    const organizerIds = Array.from(new Set(events.map(e => e.organizerId)));
    const organizers = await prisma.user.findMany({
      where: { id: { in: organizerIds } },
      select: { id: true, name: true, companyName: true, isVerifiedCompany: true }
    });

    const eventIds = events.map(e => e.id);
    
    // Group registrations by eventId
    const registrations = await prisma.registration.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventIds } },
      _count: { _all: true }
    });

    const enriched = events.map(ev => {
      const org = organizers.find(o => o.id === ev.organizerId);
      const reg = registrations.find(r => r.eventId === ev.id);
      return {
        ...ev,
        organizerId: org ? { name: org.name, companyDetails: { companyName: org.companyName }, isVerifiedCompany: org.isVerifiedCompany } : null,
        registrationCount: reg?._count._all || 0
      };
    });

    res.json({ events: enriched });
  } catch (err) {
    console.error('[events:list]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }

    const organizer = await prisma.user.findUnique({
      where: { id: event.organizerId },
      select: { name: true, email: true, companyName: true, isVerifiedCompany: true }
    });

    const [registrationCount, fullAttendees, checkInCount] = await Promise.all([
      prisma.registration.count({ where: { eventId: event.id } }),
      prisma.registration.count({ where: { eventId: event.id, checkIn: { not: null }, checkOut: { not: null } } }),
      prisma.registration.count({ where: { eventId: event.id, checkIn: { not: null } } })
    ]);

    const evWithOrg = {
      ...event,
      organizerId: organizer ? { name: organizer.name, email: organizer.email, companyDetails: { companyName: organizer.companyName }, isVerifiedCompany: organizer.isVerifiedCompany } : null
    };

    res.json({
      event: evWithOrg,
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
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'ongoing' }
    });
    res.json({ message: 'Event marked as ongoing.', event: updated });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/events/:id/cancel ────────────────────────────────────────────
router.patch('/:id/cancel', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }
    if (!['published', 'postponed'].includes(event.status)) {
      res.status(400).json({ message: 'Event cannot be cancelled in its current state.' }); return;
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId: event.id, paymentStatus: 'held' }
    });

    const userIds = registrations.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    for (const reg of registrations) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { paymentStatus: 'refunded', status: 'cancelled' }
      });
      const attendee = users.find(u => u.id === reg.userId);
      if (attendee) {
        await sendRefundEmail(attendee.email, attendee.name, event.title, reg.amountPaid);
      }
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { status: 'cancelled', escrowAmount: 0 }
    });

    res.json({ message: `Event cancelled. ${registrations.length} refund(s) issued.` });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/events/:id/postpone ──────────────────────────────────────────
router.patch('/:id/postpone', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }
    if (event.status !== 'published') { res.status(400).json({ message: 'Only published events can be postponed.' }); return; }

    const { newDate, newEndDate } = req.body;
    if (!newDate || !newEndDate) { res.status(400).json({ message: 'newDate and newEndDate are required.' }); return; }

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hrs

    await prisma.event.update({
      where: { id: event.id },
      data: {
        status: 'postponed',
        postponeProposedDate: new Date(newDate),
        postponeDeadline: deadline
      }
    });

    const { sendPostponeNotification } = await import('../utils/email');
    const registrations = await prisma.registration.findMany({
      where: { eventId: event.id, status: { notIn: ['refunded', 'cancelled'] } }
    });

    const userIds = registrations.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const newDateStr = new Date(newDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const deadlineStr = deadline.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    for (const reg of registrations) {
      const attendee = users.find(u => u.id === reg.userId);
      await prisma.registration.update({
        where: { id: reg.id },
        data: { postponeResponse: 'pending' }
      });
      if (attendee) {
        await sendPostponeNotification(
          attendee.email, attendee.name, event.title,
          newDateStr, reg.id, deadlineStr
        );
      }
    }

    res.json({ message: `Event postponed. ${registrations.length} attendee(s) notified.` });
  } catch (err) {
    console.error('[events:postpone]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/events/:id/registrations ───────────────────────────────────────
router.get('/:id/registrations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
    if (event.organizerId !== req.userId) { res.status(403).json({ message: 'Not authorized.' }); return; }

    const regs = await prisma.registration.findMany({
      where: { eventId: event.id }
    });

    const userIds = regs.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, accountType: true }
    });

    const enrichedRegs = regs.map(r => {
      const u = users.find(user => user.id === r.userId);
      return {
        ...r,
        userId: u ? { name: u.name, email: u.email, accountType: u.accountType } : null
      };
    });

    res.json({ registrations: enrichedRegs });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
