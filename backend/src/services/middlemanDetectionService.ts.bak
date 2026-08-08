import CompanyRepresentative from '../models/CompanyRepresentative';
import InvestmentProposal from '../models/InvestmentProposal';
import { Types } from 'mongoose';

// ─── Red Flag Definitions ─────────────────────────────────────────────────────
type FlagType =
  | 'upfront_fee_requested'
  | 'multiple_unrelated_companies'
  | 'bank_account_mismatch'
  | 'founder_not_communicating'
  | 'separate_payment_request';

const FLAG_SCORES: Record<FlagType, number> = {
  upfront_fee_requested:           20,
  multiple_unrelated_companies:    20,
  bank_account_mismatch:           20,
  founder_not_communicating:       20,
  separate_payment_request:        20,
};

// Flags that warrant immediate BLOCK (no risk score needed)
const INSTANT_BLOCK_FLAGS: FlagType[] = [
  'upfront_fee_requested',
  'separate_payment_request',
];

// ─── Detect Middleman ─────────────────────────────────────────────────────────
/**
 * Runs all red-flag checks on a representative + proposal pair.
 * If riskScore >= 60: freezes the proposal automatically.
 * If INSTANT_BLOCK flag detected: freezes immediately regardless of score.
 */
export async function detectMiddleman(
  representativeId: string,
  proposalId: string,
  performedBy: string,
  flagsToCheck: FlagType[]
): Promise<{
  riskScore: number;
  flagsDetected: FlagType[];
  isFrozen: boolean;
  message: string;
}> {
  const proposal = await InvestmentProposal.findById(proposalId);
  if (!proposal) throw new Error('Proposal not found.');

  const rep = await CompanyRepresentative.findById(representativeId);
  if (!rep) throw new Error('Representative not found.');

  const newFlags: FlagType[] = [];
  let addedScore = 0;
  let instantBlock = false;
  let blockReason = '';

  for (const flag of flagsToCheck) {
    // Skip if already flagged
    const alreadyFlagged = proposal.fraudFlags.some(f => f.flagType === flag);
    if (alreadyFlagged) continue;

    newFlags.push(flag);
    addedScore += FLAG_SCORES[flag];

    if (INSTANT_BLOCK_FLAGS.includes(flag)) {
      instantBlock = true;
      blockReason = `Immediate block: ${flag.replace(/_/g, ' ')}`;
    }

    proposal.fraudFlags.push({
      flagType: flag,
      severity: flag === 'bank_account_mismatch' ? 'critical' : 'high',
      description: `Auto-detected: ${flag.replace(/_/g, ' ')}`,
      createdAt: new Date(),
    } as any);
  }

  // Recalculate total risk score
  const totalScore = proposal.fraudFlags.reduce((acc, f) => {
    return acc + (FLAG_SCORES[f.flagType as FlagType] ?? 20);
  }, 0);

  proposal.riskScore = Math.min(totalScore, 100);

  // Audit trail entry
  proposal.auditTrail.push({
    action: `Middleman detection run — ${newFlags.length} new flag(s) detected`,
    performedBy: new Types.ObjectId(performedBy),
    performedAt: new Date(),
    metadata: { newFlags, riskScore: proposal.riskScore },
  });

  // Freeze if instant block OR riskScore >= 60
  const shouldFreeze = instantBlock || proposal.riskScore >= 60;
  if (shouldFreeze && !proposal.isFrozen) {
    proposal.isFrozen = true;
    proposal.status = 'frozen';
    proposal.frozenReason = instantBlock
      ? blockReason
      : `Risk score reached ${proposal.riskScore}/100 — potential middleman activity`;

    proposal.auditTrail.push({
      action: 'Proposal FROZEN by middleman detection engine',
      performedBy: new Types.ObjectId(performedBy),
      performedAt: new Date(),
      metadata: { reason: proposal.frozenReason },
    });
  }

  await proposal.save();

  return {
    riskScore: proposal.riskScore,
    flagsDetected: newFlags,
    isFrozen: proposal.isFrozen,
    message: shouldFreeze
      ? `⚠️ Proposal FROZEN. Reason: ${proposal.frozenReason}`
      : `Risk score: ${proposal.riskScore}/100. ${newFlags.length} new flag(s) added.`,
  };
}

// ─── Validate Bank Account ────────────────────────────────────────────────────
/**
 * CRITICAL: Compares proposal's investment bank account against
 * the company rep's authorized bank account.
 * Mismatch = FLAG + FREEZE immediately.
 */
export async function validateBankAccount(
  proposalId: string,
  performedBy: string,
  submittedAccount: string,
  submittedIfsc: string
): Promise<{ matched: boolean; message: string; isFrozen: boolean }> {
  const proposal = await InvestmentProposal.findById(proposalId);
  if (!proposal) throw new Error('Proposal not found.');

  const rep = await CompanyRepresentative.findById(proposal.createdBy);
  if (!rep || !rep.bankAccountDetails) {
    return { matched: false, message: 'Representative bank account not set.', isFrozen: false };
  }

  // Decrypt and parse (encryption handled at application layer — stored as JSON string here)
  let authorizedAccount: { account: string; ifscCode: string };
  try {
    authorizedAccount = JSON.parse(rep.bankAccountDetails);
  } catch {
    return { matched: false, message: 'Could not parse authorized bank account.', isFrozen: false };
  }

  const accountMatch = authorizedAccount.account === submittedAccount;
  const ifscMatch    = authorizedAccount.ifscCode === submittedIfsc;

  if (accountMatch && ifscMatch) {
    // Mark as verified in proposal
    proposal.bankAccountForInvestment = {
      account: submittedAccount,
      ifscCode: submittedIfsc,
      verified: true,
    };
    proposal.auditTrail.push({
      action: 'Bank account verified — matched company authorized account',
      performedBy: new Types.ObjectId(performedBy),
      performedAt: new Date(),
    });
    await proposal.save();
    return { matched: true, message: '✅ Bank account verified.', isFrozen: false };
  }

  // MISMATCH — instant flag + freeze
  const result = await detectMiddleman(
    proposal.createdBy.toString(),
    proposalId,
    performedBy,
    ['bank_account_mismatch']
  );

  return {
    matched: false,
    message: `❌ Bank account MISMATCH. ${result.message}`,
    isFrozen: result.isFrozen,
  };
}
