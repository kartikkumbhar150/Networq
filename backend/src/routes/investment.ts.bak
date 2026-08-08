import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  createProposal,
  publishProposal,
  inviteInvestors,
  getProposalDetails,
  getMyProposals,
  getAuditTrail,
} from '../controllers/investmentProposalController';
import {
  verifyRepresentative,
  executeInvestment,
  confirmInvestment,
  reportFraudEndpoint,
} from '../controllers/investmentExecutionController';
import { registerFounder, registerRepresentative } from '../services/founderVerificationService';


const router = Router();
router.use(authMiddleware);

// ─── Representative Registration ──────────────────────────────────────────────

// POST /api/investment/register-founder
router.post('/register-founder', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId, proof } = req.body;
    if (!companyId || !proof) {
      res.status(400).json({ message: 'companyId and proof are required.' }); return;
    }
    const result = await registerFounder(req.userId!, companyId, proof);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    console.error('[investment:registerFounder]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/investment/register-rep
router.post('/register-rep', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyId, targetUserId, representativeType, authorizationScope } = req.body;
    if (!companyId || !targetUserId || !representativeType) {
      res.status(400).json({ message: 'companyId, targetUserId, and representativeType are required.' }); return;
    }
    const result = await registerRepresentative(
      req.userId!, companyId, targetUserId, representativeType, authorizationScope || []
    );
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    console.error('[investment:registerRep]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── Proposal CRUD ────────────────────────────────────────────────────────────

// POST   /api/investment/create-proposal
router.post('/create-proposal', createProposal);

// PATCH  /api/investment/proposals/:id/publish
router.patch('/proposals/:id/publish', publishProposal);

// POST   /api/investment/proposals/:id/invite-investors
router.post('/proposals/:id/invite-investors', inviteInvestors);

// GET    /api/investment/proposals/:id
router.get('/proposals/:id', getProposalDetails);

// GET    /api/investment/my-proposals
router.get('/my-proposals', getMyProposals);

// GET    /api/investment/proposals/:id/audit-trail
router.get('/proposals/:id/audit-trail', getAuditTrail);

// ─── Investment Execution Flow ────────────────────────────────────────────────

// POST   /api/investment/proposals/:id/verify-rep   ← CRITICAL CHECKPOINT
router.post('/proposals/:id/verify-rep', verifyRepresentative);

// POST   /api/investment/proposals/:id/execute-investment
router.post('/proposals/:id/execute-investment', executeInvestment);

// POST   /api/investment/proposals/:id/confirm-investment
router.post('/proposals/:id/confirm-investment', confirmInvestment);

// ─── Fraud Reporting ──────────────────────────────────────────────────────────

// POST   /api/incidents/report-fraud  (mounted separately in index.ts)
// Exposed here as a sub-route too for convenience
router.post('/report-fraud', reportFraudEndpoint);

export default router;
