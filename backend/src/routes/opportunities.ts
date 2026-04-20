import { Router, Request, Response } from 'express';
import Opportunity from '../models/Opportunity';
import Application from '../models/Application';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';

const router = Router();

// ─── GET /api/opportunities ──────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Role-Based Access Control
    // Users only see Procurement pillar (Jobs, Freelance, Internships)
    const query: any = { isActive: true };
    if (user.accountType === 'user') {
      query.pillar = 'procurement';
    }

    const opportunities = await Opportunity.find(query)
      .populate('companyId', 'name companyDetails.companyName isVerifiedCompany profile.profilePhoto')
      .sort({ createdAt: -1 });

    res.json({ opportunities });
  } catch (error) {
    console.error('[get opportunities]', error);
    res.status(500).json({ message: 'Error fetching opportunities.' });
  }
});

// ─── POST /api/opportunities ─────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.accountType !== 'company') {
      res.status(403).json({ message: 'Only companies can post opportunities.' });
      return;
    }

    const { 
      pillar, type, title, description, requirements,
      fundingAmount, equityOffered, valuation, dataRoomUrl, // Capital
      budget, biddingType, milestones, // Procurement
      allianceType, synergyTags, // Alliance
      contactEmail, contactPhone, // Contact Info
    } = req.body;

    if (!pillar || !type || !title || !description) {
      res.status(400).json({ message: 'Pillar, type, title, and description are required.' });
      return;
    }

    const opportunity = await Opportunity.create({
      companyId: user._id,
      isFromVerifiedCompany: user.isVerifiedCompany,
      status: 'open',
      pillar, type, title, description, requirements: requirements || [],
      fundingAmount, equityOffered, valuation, dataRoomUrl,
      budget, biddingType, milestones,
      allianceType, synergyTags,
      contactEmail, contactPhone,
    });

    res.status(201).json({ message: 'Opportunity posted!', opportunity });
  } catch (error) {
    console.error('[post opportunity]', error);
    res.status(500).json({ message: 'Error posting opportunity.' });
  }
});

// ─── POST /api/opportunities/:id/apply ───────────────────────────────────────
router.post('/:id/apply', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { proposalText, bidAmount, milestones } = req.body;

    const opportunity = await Opportunity.findById(id);
    if (!opportunity || !opportunity.isActive) {
      res.status(404).json({ message: 'Opportunity not found or closed.' });
      return;
    }

    // Check if previously applied
    const existing = await Application.findOne({ opportunityId: id, applicantId: req.userId });
    if (existing) {
      res.status(400).json({ message: 'You have already applied to this opportunity.' });
      return;
    }

    const application = await Application.create({
      opportunityId: id,
      applicantId: req.userId,
      proposalText,
      bidAmount,
      milestoneAgreements: milestones || [],
      status: 'pending'
    });

    res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (error) {
    console.error('[apply opportunity]', error);
    res.status(500).json({ message: 'Error submitting application.' });
  }
});

export default router;
