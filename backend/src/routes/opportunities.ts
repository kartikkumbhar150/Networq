import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// ─── GET /api/opportunities ──────────────────────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const query: any = { isActive: true };
    if (user.accountType === 'user') {
      query.pillar = 'procurement';
    }

    const opportunities = await prisma.opportunity.findMany({
      where: query,
      orderBy: { createdAt: 'desc' }
    });

    const companyIds = Array.from(new Set(opportunities.map(o => o.companyId)));
    const companies = await prisma.user.findMany({
      where: { id: { in: companyIds }, accountType: 'company' },
      select: { id: true, name: true, companyName: true, isVerifiedCompany: true, profile: true }
    });

    const enrichedOpps = opportunities.map(opp => {
      const comp = companies.find(c => c.id === opp.companyId);
      return {
        ...opp,
        company: comp ? {
          name: comp.name,
          companyName: comp.companyName,
          isVerifiedCompany: comp.isVerifiedCompany,
          profilePhoto: (comp.profile as any)?.profilePhoto
        } : null
      };
    });

    res.json({ opportunities: enrichedOpps });
  } catch (error) {
    console.error('[get opportunities]', error);
    res.status(500).json({ message: 'Error fetching opportunities.' });
  }
});

// ─── POST /api/opportunities ─────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
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

    const opportunity = await prisma.opportunity.create({
      data: {
        companyId: user.id,
        isFromVerifiedCompany: user.isVerifiedCompany,
        status: 'open',
        pillar, type, title, description, requirements: requirements || [],
        fundingAmount: fundingAmount ? Number(fundingAmount) : null,
        equityOffered: equityOffered ? Number(equityOffered) : null,
        valuation: valuation ? Number(valuation) : null,
        dataRoomUrl,
        budget: budget ? Number(budget) : null,
        biddingType, milestones: milestones || [],
        allianceType, synergyTags: synergyTags || [],
        contactEmail, contactPhone,
      }
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
    const id = req.params.id as string;
    const { proposalText, bidAmount, milestones } = req.body;

    const opportunity = await prisma.opportunity.findUnique({ where: { id } });
    if (!opportunity || !opportunity.isActive) {
      res.status(404).json({ message: 'Opportunity not found or closed.' });
      return;
    }

    const existing = await prisma.application.findFirst({
      where: { opportunityId: id, applicantId: req.userId }
    });
    
    if (existing) {
      res.status(400).json({ message: 'You have already applied to this opportunity.' });
      return;
    }

    const application = await prisma.application.create({
      data: {
        opportunityId: id,
        applicantId: req.userId!,
        proposalText,
        bidAmount: bidAmount ? Number(bidAmount) : null,
        milestoneAgreements: milestones || [],
        status: 'pending'
      }
    });

    res.status(201).json({ message: 'Application submitted successfully!', application });
  } catch (error) {
    console.error('[apply opportunity]', error);
    res.status(500).json({ message: 'Error submitting application.' });
  }
});

export default router;
