import CompanyRepresentative from '../models/CompanyRepresentative';
import InvestmentProposal from '../models/InvestmentProposal';
import User from '../models/User';
import { Types } from 'mongoose';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ─── Report Fraud ─────────────────────────────────────────────────────────────
/**
 * Called when an investor or admin reports fraud.
 * Actions (in order):
 *  1. FREEZE the representative's account immediately
 *  2. FREEZE all their active proposals
 *  3. Initiate investor refund notifications
 *  4. Notify admin
 */
export async function reportFraud(
  reportedRepId: string,
  proposalId: string,
  reportedByUserId: string,
  description: string
): Promise<{
  success: boolean;
  frozenProposals: number;
  notifiedInvestors: number;
  message: string;
}> {
  // Step 1: Freeze the representative
  const rep = await CompanyRepresentative.findById(reportedRepId);
  if (!rep) throw new Error('Representative not found.');

  rep.verificationStatus = 'revoked';
  rep.revokedReason = `Fraud reported: ${description}`;
  await rep.save();

  // Step 2: Find and freeze ALL active proposals by this rep
  const activeProposals = await InvestmentProposal.find({
    createdBy: reportedRepId,
    status: { $in: ['draft', 'active', 'owner_verified'] },
  });

  let frozenCount = 0;
  let totalNotified = 0;

  for (const proposal of activeProposals) {
    proposal.isFrozen = true;
    proposal.status = 'frozen';
    proposal.frozenReason = `Fraud reported against representative (Rep ID: ${reportedRepId})`;
    proposal.auditTrail.push({
      action: 'Proposal FROZEN — fraud reported',
      performedBy: new Types.ObjectId(reportedByUserId),
      performedAt: new Date(),
      metadata: { description, reportedRepId },
    });
    await proposal.save();
    frozenCount++;

    // Step 3: Notify all investors involved in this proposal
    const notified = await notifyInvestorsOfFraud(
      proposal.investorsInvolved.map(id => id.toString()),
      proposal.proposalTitle,
      description
    );
    totalNotified += notified;
  }

  // Step 4: Notify admin
  await notifyAdminFraudReport(reportedRepId, proposalId, reportedByUserId, description, frozenCount);

  return {
    success: true,
    frozenProposals: frozenCount,
    notifiedInvestors: totalNotified,
    message: `Fraud report processed. ${frozenCount} proposal(s) frozen, ${totalNotified} investor(s) notified.`,
  };
}

// ─── Escalate to Admin ────────────────────────────────────────────────────────
/**
 * Called when the 4-question quiz fails (< 3 correct).
 * Flags the proposal and alerts admin for review.
 */
export async function escalateImposterAlert(
  proposalId: string,
  investorId: string,
  correctCount: number,
  answers: Array<{ question: string; givenAnswer: string; isCorrect: boolean }>
): Promise<void> {
  const proposal = await InvestmentProposal.findById(proposalId);
  if (!proposal) return;

  proposal.fraudFlags.push({
    flagType: 'founder_not_communicating',
    severity: 'critical',
    description: `Investor verification FAILED — ${correctCount}/4 correct. Potential imposter.`,
    createdAt: new Date(),
  } as any);

  proposal.riskScore = Math.min(proposal.riskScore + 20, 100);
  proposal.auditTrail.push({
    action: `IMPOSTER ALERT — investor quiz failed (${correctCount}/4)`,
    performedBy: new Types.ObjectId(investorId),
    performedAt: new Date(),
    metadata: { correctCount, answers },
  });

  if (proposal.riskScore >= 60 && !proposal.isFrozen) {
    proposal.isFrozen = true;
    proposal.status = 'frozen';
    proposal.frozenReason = 'Imposter alert: investor verification failed + risk score threshold reached';
  }

  await proposal.save();

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (adminEmail) {
    await transporter.sendMail({
      from: `"HireX Security" <${process.env.FROM_EMAIL}>`,
      to: adminEmail,
      subject: `🚨 IMPOSTER ALERT — Proposal ${proposalId}`,
      html: `
        <p>An investor failed the representative verification quiz for proposal <strong>${proposalId}</strong>.</p>
        <p><strong>Correct answers:</strong> ${correctCount}/4</p>
        <p><strong>Risk score:</strong> ${proposal.riskScore}/100</p>
        <p>Please review this proposal immediately in the admin panel.</p>
      `,
    });
  }
}

// ─── Check Proposal Health ────────────────────────────────────────────────────
/**
 * Run a full health check on a proposal — used by admin or on-demand.
 * Returns a summary of all fraud indicators.
 */
export async function getProposalHealthReport(proposalId: string): Promise<{
  proposalId: string;
  riskScore: number;
  isFrozen: boolean;
  flagCount: number;
  flags: Array<{ flagType: string; severity: string; createdAt: Date }>;
  checkpoints: {
    repVerified: boolean;
    bankAccountVerified: boolean;
    investorVerifiedRep: boolean;
  };
}> {
  // Do NOT populate createdBy — keep it as ObjectId so findById works below
  const proposal = await InvestmentProposal.findById(proposalId);
  if (!proposal) throw new Error('Proposal not found.');

  // createdBy is an ObjectId here — safe to pass directly
  const rep = await CompanyRepresentative.findById(proposal.createdBy);

  return {
    proposalId,
    riskScore: proposal.riskScore,
    isFrozen: proposal.isFrozen,
    flagCount: proposal.fraudFlags.length,
    flags: proposal.fraudFlags.map(f => ({
      flagType: f.flagType,
      severity: f.severity,
      createdAt: f.createdAt,
    })),
    checkpoints: {
      repVerified: rep?.verificationStatus === 'verified',
      bankAccountVerified: proposal.bankAccountForInvestment?.verified ?? false,
      investorVerifiedRep: proposal.creatorVerificationCheckpoint,
    },
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────
async function notifyInvestorsOfFraud(
  investorIds: string[],
  proposalTitle: string,
  description: string
): Promise<number> {
  const investors = await User.find({ _id: { $in: investorIds } });
  let count = 0;
  for (const investor of investors) {
    try {
      await transporter.sendMail({
        from: `"HireX Security" <${process.env.FROM_EMAIL}>`,
        to: investor.email,
        subject: `🚨 Fraud Alert — Investment Proposal Frozen`,
        html: `
          <p>Hi ${investor.name},</p>
          <p>We have detected fraudulent activity in an investment proposal you were invited to: <strong>${proposalTitle}</strong>.</p>
          <p>This proposal has been <strong>immediately frozen</strong> and the representative's account has been suspended.</p>
          <p>If you have made any payment outside the HireX platform, please contact support immediately.</p>
          <p><strong>Reported issue:</strong> ${description}</p>
        `,
      });
      count++;
    } catch { /* continue notifying others */ }
  }
  return count;
}

async function notifyAdminFraudReport(
  repId: string, proposalId: string,
  reportedBy: string, description: string, frozenCount: number
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;
  await transporter.sendMail({
    from: `"HireX Security" <${process.env.FROM_EMAIL}>`,
    to: adminEmail,
    subject: `🚨 FRAUD REPORT — Representative ${repId}`,
    html: `
      <p><strong>Fraud Report Filed</strong></p>
      <p><strong>Rep ID:</strong> ${repId}</p>
      <p><strong>Proposal ID:</strong> ${proposalId}</p>
      <p><strong>Reported By:</strong> ${reportedBy}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p><strong>Proposals frozen:</strong> ${frozenCount}</p>
      <p>Please review immediately in the admin panel.</p>
    `,
  });
}
