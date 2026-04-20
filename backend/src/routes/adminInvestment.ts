import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import CompanyRepresentative from '../models/CompanyRepresentative';
import InvestmentProposal from '../models/InvestmentProposal';
import { approveRepresentative, revokeRepresentative } from '../services/founderVerificationService';
import { getProposalHealthReport } from '../services/fraudDetectionService';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/admin/representatives/:id/verify ───────────────────────────────
router.post('/representatives/:id/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const result = await approveRepresentative(req.params.id as string, req.userId!);
    res.json(result);
  } catch (err) {
    console.error('[adminInvestment:verify]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/admin/representatives/:id/revoke ───────────────────────────────
router.post('/representatives/:id/revoke', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const { reason } = req.body;
    if (!reason) { res.status(400).json({ message: 'reason is required.' }); return; }
    const result = await revokeRepresentative(req.params.id as string, reason);
    res.json(result);
  } catch (err) {
    console.error('[adminInvestment:revoke]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/admin/investment/escalations ────────────────────────────────────
router.get('/investment/escalations', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const escalations = await InvestmentProposal.find({
      $or: [{ isFrozen: true }, { riskScore: { $gte: 40 } }],
    })
      .sort({ riskScore: -1, updatedAt: -1 })
      .populate('companyId', 'name companyDetails')
      .populate('createdBy')
      .lean();

    res.json({ count: escalations.length, escalations });
  } catch (err) {
    console.error('[adminInvestment:escalations]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/admin/escalations/:id/review ──────────────────────────────────
router.post('/escalations/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const { action, notes } = req.body;
    if (!['unfreeze', 'cancel'].includes(action)) {
      res.status(400).json({ message: 'action must be "unfreeze" or "cancel".' }); return;
    }

    const proposal = await InvestmentProposal.findById(req.params.id);
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    if (action === 'unfreeze') {
      proposal.isFrozen = false;
      proposal.status = 'active';
      // frozenReason is optional — clear it safely
      (proposal as any).frozenReason = undefined;
    } else {
      proposal.status = 'cancelled';
    }

    // Use type assertion on push — Mongoose subdoc array expects _id which is auto-added
    (proposal.auditTrail as any[]).push({
      action: `Admin ${action}d proposal. Notes: ${notes || 'none'}`,
      performedBy: new Types.ObjectId(req.userId!),
      performedAt: new Date(),
      metadata: { action, notes, adminId: req.userId },
    });

    await proposal.save();
    res.json({ message: `Proposal ${action}d successfully.`, proposal });
  } catch (err) {
    console.error('[adminInvestment:review]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/admin/investment/proposals/:id/health ──────────────────────────
router.get('/investment/proposals/:id/health', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const report = await getProposalHealthReport(req.params.id as string);
    res.json(report);
  } catch (err) {
    console.error('[adminInvestment:health]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/admin/representatives ──────────────────────────────────────────
router.get('/representatives', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.userRole !== 'admin') { res.status(403).json({ message: 'Admin access required.' }); return; }
  try {
    const statusFilter = typeof req.query.status === 'string'
      ? req.query.status
      : 'pending_verification';

    const reps = await CompanyRepresentative.find({ verificationStatus: statusFilter })
      .populate('userId', 'name email facePointId')
      .populate('companyId', 'name companyDetails isVerifiedCompany')
      .lean();

    res.json({ count: reps.length, representatives: reps });
  } catch (err) {
    console.error('[adminInvestment:listReps]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
