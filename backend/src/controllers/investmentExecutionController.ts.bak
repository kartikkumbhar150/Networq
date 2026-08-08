import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';
import CompanyRepresentative from '../models/CompanyRepresentative';
import InvestmentProposal from '../models/InvestmentProposal';
import DirectCommunicationSession from '../models/DirectCommunicationSession';
import { escalateImposterAlert, reportFraud } from '../services/fraudDetectionService';
import { validateBankAccount } from '../services/middlemanDetectionService';

// ─── The 4 verification questions ────────────────────────────────────────────
// These are populated from the proposal's company + rep data at runtime.
function buildVerificationQuestions(
  founderName: string,
  companyLegalName: string,
  repRole: string,
  foundingYear: string
): Array<{ question: string; answer: string }> {
  return [
    { question: `What is the founder's full name?`,             answer: founderName.toLowerCase().trim() },
    { question: `What is the company's legal registered name?`, answer: companyLegalName.toLowerCase().trim() },
    { question: `What is this representative's role?`,          answer: repRole.toLowerCase().trim() },
    { question: `What year was the company founded?`,           answer: foundingYear.trim() },
  ];
}

// ─── POST /api/investment/proposals/:id/verify-rep ────────────────────────────
/**
 * CRITICAL CHECKPOINT — Investor answers 4 questions to confirm the rep is real.
 * Must get >= 3 correct, else the proposal is flagged as potential imposter.
 */
export async function verifyRepresentative(req: AuthRequest, res: Response): Promise<void> {
  try {
    const proposal = await InvestmentProposal.findById(req.params.id)
      .populate('companyId');
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    // Investor must be invited
    const isInvited = proposal.investorsInvolved.some(id => id.toString() === req.userId);
    if (!isInvited) { res.status(403).json({ message: 'You are not invited to this proposal.' }); return; }

    // Already verified?
    if (proposal.creatorVerificationCheckpoint) {
      res.json({ message: 'Representative already verified for this proposal.', passed: true }); return;
    }

    const { answers } = req.body; // Array of 4 strings, in order
    if (!Array.isArray(answers) || answers.length !== 4) {
      res.status(400).json({ message: 'Exactly 4 answers are required.' }); return;
    }

    // Get company + rep data for question building
    const rep = await CompanyRepresentative.findById(proposal.createdBy)
      .populate<{ userId: { name: string } }>('userId', 'name');
    const company = await CompanyRepresentative.findById(proposal.createdBy)
      .populate<{ companyId: { companyDetails?: { companyName?: string }; createdAt: Date } }>('companyId', 'companyDetails createdAt');

    if (!rep || !company) { res.status(500).json({ message: 'Could not load representative data.' }); return; }

    const repUser = rep.userId as unknown as { name: string };
    const companyUser = company.companyId as unknown as { companyDetails?: { companyName?: string }; createdAt: Date };

    const questions = buildVerificationQuestions(
      repUser?.name || '',
      companyUser?.companyDetails?.companyName || '',
      rep.representativeType,
      new Date(companyUser?.createdAt).getFullYear().toString()
    );

    // Score the answers
    const scoredAnswers = questions.map((q, i) => ({
      question: q.question,
      givenAnswer: (answers[i] || '').toLowerCase().trim(),
      isCorrect: (answers[i] || '').toLowerCase().trim() === q.answer,
    }));
    const correctCount = scoredAnswers.filter(a => a.isCorrect).length;
    const passed = correctCount >= 3;

    // Update or create communication session
    let session = await DirectCommunicationSession.findOne({
      investmentProposalId: proposal._id,
      investorId: req.userId,
    });

    if (!session) {
      session = await DirectCommunicationSession.create({
        investmentProposalId: proposal._id,
        companyId: proposal.companyId,
        companyRepId: rep._id,
        investorId: req.userId,
        sessionType: 'platform_messaging',
        investorVerificationCheckpoint: {
          investorConfirmsRealRep: passed,
          questionAnswers: scoredAnswers,
          correctCount,
          passed,
          verifiedAt: passed ? new Date() : undefined,
        },
      });
    } else {
      session.investorVerificationCheckpoint = {
        investorConfirmsRealRep: passed,
        questionAnswers: scoredAnswers,
        correctCount,
        passed,
        verifiedAt: passed ? new Date() : undefined,
      };
      await session.save();
    }

    if (passed) {
      // Mark proposal checkpoint as passed
      proposal.creatorVerificationCheckpoint = true;
      proposal.auditTrail.push({
        action: `Investor verified representative — ${correctCount}/4 correct (PASSED)`,
        performedBy: new Types.ObjectId(req.userId!),
        performedAt: new Date(),
        metadata: { correctCount, scoredAnswers },
      });
      await proposal.save();

      res.json({
        passed: true,
        correctCount,
        message: `✅ Verification passed (${correctCount}/4 correct). You can now proceed with the investment.`,
      });
    } else {
      // FAILED — escalate as potential imposter
      await escalateImposterAlert(proposal.id, req.userId!, correctCount, scoredAnswers);

      res.status(403).json({
        passed: false,
        correctCount,
        message: `❌ Verification failed (${correctCount}/4 correct). This incident has been escalated to admin as a potential imposter alert.`,
      });
    }
  } catch (err) {
    console.error('[investmentExecution:verifyRep]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── POST /api/investment/proposals/:id/execute-investment ────────────────────
/**
 * Investor commits to invest. All 3 checkpoints must pass:
 *  1. creatorVerificationCheckpoint === true
 *  2. Rep has can_execute_investment scope
 *  3. Bank account matches company's verified account
 */
export async function executeInvestment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { amount, bankAccount, ifscCode } = req.body;
    if (!amount || !bankAccount || !ifscCode) {
      res.status(400).json({ message: 'amount, bankAccount, and ifscCode are required.' }); return;
    }

    const proposal = await InvestmentProposal.findById(req.params.id);
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }

    // CHECKPOINT 1: Investor must have verified the rep
    if (!proposal.creatorVerificationCheckpoint) {
      res.status(403).json({ message: 'You must verify the representative before executing investment. Complete the verification quiz first.' });
      return;
    }

    // CHECKPOINT 2: Rep must have execute authorization
    const rep = await CompanyRepresentative.findById(proposal.createdBy);
    if (!rep || !rep.authorizationScope.includes('can_execute_investment')) {
      res.status(403).json({ message: 'The representative is not authorized to execute investments.' }); return;
    }
    if (rep.verificationStatus !== 'verified') {
      res.status(403).json({ message: 'Representative is not verified.' }); return;
    }

    // CHECKPOINT 3: Bank account must match
    const bankValidation = await validateBankAccount(
      proposal.id, req.userId!, bankAccount, ifscCode
    );
    if (!bankValidation.matched) {
      res.status(403).json({
        message: bankValidation.message,
        isFrozen: bankValidation.isFrozen,
      });
      return;
    }

    // All checkpoints passed — create pending investment record
    proposal.status = 'owner_verified';
    proposal.investorsInvolved = proposal.investorsInvolved.filter(
      id => id.toString() !== req.userId
    );
    // Re-add at front with "confirmed" marker via audit trail
    proposal.auditTrail.push({
      action: `Investment execution initiated — ₹${amount}`,
      performedBy: new Types.ObjectId(req.userId!),
      performedAt: new Date(),
      metadata: { amount, bankAccount: bankAccount.slice(-4).padStart(bankAccount.length, '*'), ifscCode },
    });
    await proposal.save();

    res.status(201).json({
      message: '✅ Investment execution initiated. Both the founder and investor must now confirm to complete the transfer.',
      nextStep: 'POST /api/investment/proposals/:id/confirm-investment',
      proposal,
    });
  } catch (err) {
    console.error('[investmentExecution:execute]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── POST /api/investment/proposals/:id/confirm-investment ────────────────────
/**
 * DUAL CONFIRMATION — both founder (rep) AND investor must confirm.
 * Only when both have confirmed does the status become investment_completed.
 */
export async function confirmInvestment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const proposal = await InvestmentProposal.findById(req.params.id);
    if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }
    if (proposal.status !== 'owner_verified') {
      res.status(400).json({ message: 'Proposal is not in the execution phase.' }); return;
    }

    const rep = await CompanyRepresentative.findById(proposal.createdBy);
    const isRep = rep?.userId.toString() === req.userId;
    const isInvestor = proposal.investorsInvolved.some(id => id.toString() === req.userId);

    if (!isRep && !isInvestor) {
      res.status(403).json({ message: 'Only the representative or an invited investor can confirm.' }); return;
    }

    const role = isRep ? 'founder/rep' : 'investor';
    proposal.auditTrail.push({
      action: `Investment confirmed by ${role}`,
      performedBy: new Types.ObjectId(req.userId!),
      performedAt: new Date(),
      metadata: { role },
    });

    // Check if both sides have already confirmed
    const repConfirmed  = proposal.auditTrail.some(e => e.action.includes('confirmed by founder/rep'));
    const invConfirmed  = proposal.auditTrail.some(e => e.action.includes('confirmed by investor'));

    if (repConfirmed && invConfirmed) {
      proposal.status = 'investment_completed';
      proposal.auditTrail.push({
        action: '🎉 Investment COMPLETED — both parties confirmed. Funds transfer initiated.',
        performedBy: new Types.ObjectId(req.userId!),
        performedAt: new Date(),
      });
    }

    await proposal.save();

    const bothConfirmed = proposal.status === 'investment_completed';
    res.json({
      message: bothConfirmed
        ? '🎉 Both parties confirmed! Investment completed and funds transfer initiated.'
        : `Your confirmation recorded. Waiting for the ${isRep ? 'investor' : 'founder'} to confirm.`,
      status: proposal.status,
    });
  } catch (err) {
    console.error('[investmentExecution:confirm]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

// ─── POST /api/incidents/report-fraud ─────────────────────────────────────────
export async function reportFraudEndpoint(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { representativeId, proposalId, description } = req.body;
    if (!representativeId || !proposalId || !description) {
      res.status(400).json({ message: 'representativeId, proposalId, and description are required.' }); return;
    }

    const result = await reportFraud(representativeId, proposalId, req.userId!, description);
    res.json(result);
  } catch (err) {
    console.error('[investmentExecution:reportFraud]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
}
