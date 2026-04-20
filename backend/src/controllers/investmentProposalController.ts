import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';
import CompanyRepresentative from '../models/CompanyRepresentative';
import InvestmentProposal from '../models/InvestmentProposal';
import User from '../models/User';

// ─── POST /api/investment/create-proposal ─────────────────────────────────────
export async function createProposal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { representativeId, proposalTitle, description, investmentAmount, equityOffering, investmentType } = req.body;

    if (!representativeId || !proposalTitle || !description || !investmentAmount || !equityOffering || !investmentType) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    // Verify the rep belongs to this user and is verified + can pitch
    const rep = await CompanyRepresentative.findOne({
      _id: representativeId,
      userId: req.userId,
      verificationStatus: 'verified',
      authorizationScope: 'can_pitch_investment',
    });

    if (!rep) {
      res.status(403).json({ message: 'You must be a verified representative with pitch authorization to create proposals.' });
      return;
    }

    const proposal = await InvestmentProposal.create({
      companyId: rep.companyId,
      createdBy: rep._id,
      proposalTitle: proposalTitle.trim(),
      description,
      investmentAmount: Number(investmentAmount),
      equityOffering: Number(equityOffering),
      investmentType,
      status: 'draft',
      auditTrail: [{
        action: 'Proposal created',
        performedBy: new Types.ObjectId(req.userId!),
        performedAt: new Date(),
        metadata: { representativeId, representativeType: rep.representativeType },
      }],
    });

    res.status(201).json({ message: 'Investment proposal created.', proposal });
  } catch (err) {
    console.error('[investmentProposal:create]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── PATCH /api/investment/proposals/:id/publish ──────────────────────────────
export async function publishProposal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const proposal = await InvestmentProposal.findById(req.params.id);
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    const rep = await CompanyRepresentative.findById(proposal.createdBy);
    if (!rep || rep.userId.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized.' }); return;
    }
    if (proposal.status !== 'draft') {
      res.status(400).json({ message: 'Only draft proposals can be published.' }); return;
    }
    if (proposal.isFrozen) {
      res.status(403).json({ message: 'Proposal is frozen and cannot be published.' }); return;
    }

    proposal.status = 'active';
    proposal.auditTrail.push({
      action: 'Proposal published',
      performedBy: new Types.ObjectId(req.userId!),
      performedAt: new Date(),
    });
    await proposal.save();

    res.json({ message: 'Proposal is now active.', proposal });
  } catch (err) {
    console.error('[investmentProposal:publish]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── POST /api/investment/proposals/:id/invite-investors ──────────────────────
export async function inviteInvestors(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { investorIds } = req.body; // array of User IDs
    if (!Array.isArray(investorIds) || investorIds.length === 0) {
      res.status(400).json({ message: 'investorIds array is required.' }); return;
    }

    const proposal = await InvestmentProposal.findById(req.params.id);
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    const rep = await CompanyRepresentative.findById(proposal.createdBy);
    if (!rep || rep.userId.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized.' }); return;
    }
    if (!['active', 'owner_verified'].includes(proposal.status)) {
      res.status(400).json({ message: 'Proposal must be active to invite investors.' }); return;
    }

    // Validate all investor IDs exist and are user-type accounts
    const investors = await User.find({ _id: { $in: investorIds }, accountType: 'user' });
    if (investors.length === 0) {
      res.status(400).json({ message: 'No valid investor accounts found.' }); return;
    }

    const validIds = investors.map(i => i._id as Types.ObjectId);
    // Add only new ones (avoid duplicates)
    const existingIds = proposal.investorsInvolved.map(id => id.toString());
    const newIds = validIds.filter(id => !existingIds.includes(id.toString()));
    proposal.investorsInvolved.push(...newIds);

    proposal.auditTrail.push({
      action: `${newIds.length} investor(s) invited`,
      performedBy: new Types.ObjectId(req.userId!),
      performedAt: new Date(),
      metadata: { newInvestorIds: newIds.map(id => id.toString()) },
    });
    await proposal.save();

    res.json({ message: `${newIds.length} investor(s) added to proposal.`, proposal });
  } catch (err) {
    console.error('[investmentProposal:inviteInvestors]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /api/investment/proposals/:id ────────────────────────────────────────
export async function getProposalDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const proposal = await InvestmentProposal.findById(req.params.id)
      .populate('companyId', 'name companyDetails isVerifiedCompany')
      .populate<{ createdBy: { _id: string; userId: { toString(): string } } }>('createdBy', 'userId representativeType');

    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    // Investors can only see proposals they've been invited to (or their own company's)
    const isInvited = proposal.investorsInvolved.some(id => id.toString() === req.userId);
    // createdBy is now populated — check the rep's userId directly
    const populatedRep = proposal.createdBy as unknown as { userId: { toString(): string } };
    const isOwner = populatedRep?.userId?.toString() === req.userId;

    if (!isInvited && !isOwner) {
      res.status(403).json({ message: 'You are not authorized to view this proposal.' }); return;
    }

    // Build health summary inline — proposal already loaded, no extra DB call needed
    const healthReport = {
      proposalId: req.params.id,
      riskScore: proposal.riskScore,
      isFrozen: proposal.isFrozen,
      flagCount: proposal.fraudFlags.length,
      flags: proposal.fraudFlags.map((f: any) => ({
        flagType: f.flagType,
        severity: f.severity,
        createdAt: f.createdAt,
      })),
      checkpoints: {
        bankAccountVerified: proposal.bankAccountForInvestment?.verified ?? false,
        investorVerifiedRep: proposal.creatorVerificationCheckpoint,
      },
    };

    res.json({ proposal, healthReport });
  } catch (err) {
    console.error('[investmentProposal:getDetails]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /api/investment/my-proposals ─────────────────────────────────────────
export async function getMyProposals(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Find all reps for this user
    const myReps = await CompanyRepresentative.find({ userId: req.userId });
    const repIds = myReps.map(r => r._id);

    const proposals = await InvestmentProposal.find({ createdBy: { $in: repIds } })
      .populate('companyId', 'name companyDetails')
      .sort({ createdAt: -1 });

    res.json({ proposals });
  } catch (err) {
    console.error('[investmentProposal:getMyProposals]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── GET /api/investment/proposals/:id/audit-trail ───────────────────────────
export async function getAuditTrail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const proposal = await InvestmentProposal.findById(req.params.id)
      .select('auditTrail proposalTitle riskScore isFrozen fraudFlags');

    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    res.json({
      proposalTitle: proposal.proposalTitle,
      riskScore: proposal.riskScore,
      isFrozen: proposal.isFrozen,
      fraudFlags: proposal.fraudFlags,
      auditTrail: proposal.auditTrail,
    });
  } catch (err) {
    console.error('[investmentProposal:auditTrail]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}
