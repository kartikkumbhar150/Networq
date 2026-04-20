import User from '../models/User';
import CompanyRepresentative from '../models/CompanyRepresentative';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ─── Register Founder ─────────────────────────────────────────────────────────
/**
 * Step 1: Validate user is face-verified + company is verified.
 * Step 2: Create CompanyRepresentative as founder (pending_verification).
 * Step 3: Notify admin for manual approval.
 */
export async function registerFounder(
  userId: string,
  companyId: string,
  proof: string          // e.g. incorporation doc URL or description
): Promise<{ success: boolean; message: string; repId?: string }> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found.');

  // CHECKPOINT 1: Must be face-verified
  if (!user.facePointId) {
    return { success: false, message: 'Face verification is required before registering as a founder.' };
  }

  const company = await User.findById(companyId);
  if (!company || company.accountType !== 'company') {
    return { success: false, message: 'Company account not found.' };
  }

  // CHECKPOINT 2: Company must be verified (blue tick)
  if (!company.isVerifiedCompany) {
    return { success: false, message: 'Company must be verified (blue tick) before registering a founder.' };
  }

  // Check if this user is already a rep for this company
  const existing = await CompanyRepresentative.findOne({ companyId, userId });
  if (existing) {
    return { success: false, message: 'You are already registered as a representative for this company.' };
  }

  const rep = await CompanyRepresentative.create({
    companyId,
    userId,
    representativeType: 'founder',
    authorizationScope: ['can_pitch_investment', 'can_execute_investment'],
    verificationStatus: 'pending_verification',
    bankAccountAuthorized: false,
  });

  // Notify admin via email
  await notifyAdminNewFounder(user.name, user.email, company.companyDetails?.companyName || 'Unknown Company', rep.id, proof);

  return {
    success: true,
    message: 'Founder registration submitted. Awaiting admin verification.',
    repId: rep.id,
  };
}

// ─── Register Authorized Representative ──────────────────────────────────────
/**
 * Founder or director adds a rep with limited scope.
 */
export async function registerRepresentative(
  founderId: string,
  companyId: string,
  targetUserId: string,
  representativeType: 'director' | 'authorized_rep' | 'employee',
  authorizationScope: Array<'can_pitch_investment' | 'can_execute_investment'>
): Promise<{ success: boolean; message: string; repId?: string }> {
  // Verify the requester is a verified founder/director of this company
  const founderRep = await CompanyRepresentative.findOne({
    companyId,
    userId: founderId,
    verificationStatus: 'verified',
    representativeType: { $in: ['founder', 'director'] },
  });

  if (!founderRep) {
    return { success: false, message: 'Only a verified founder or director can add representatives.' };
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return { success: false, message: 'Target user not found.' };

  const existing = await CompanyRepresentative.findOne({ companyId, userId: targetUserId });
  if (existing) {
    return { success: false, message: 'User is already a representative for this company.' };
  }

  const rep = await CompanyRepresentative.create({
    companyId,
    userId: targetUserId,
    representativeType,
    authorizationScope,
    verificationStatus: 'pending_verification',
    bankAccountAuthorized: false,
  });

  return {
    success: true,
    message: `${representativeType} registered. Awaiting admin verification.`,
    repId: rep.id,
  };
}

// ─── Admin: Approve Representative ───────────────────────────────────────────
export async function approveRepresentative(
  repId: string,
  adminUserId: string
): Promise<{ success: boolean; message: string }> {
  const rep = await CompanyRepresentative.findById(repId);
  if (!rep) return { success: false, message: 'Representative not found.' };

  rep.verificationStatus = 'verified';
  rep.verifiedAt = new Date();
  rep.verifiedBy = adminUserId as any;
  await rep.save();

  // Notify the rep user
  const user = await User.findById(rep.userId);
  if (user) {
    await transporter.sendMail({
      from: `"HireX" <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: '✅ Your Representative Status Has Been Verified – HireX',
      html: `<p>Hi ${user.name}, your representative role (${rep.representativeType}) has been verified by the HireX admin team. You can now pitch and execute investments on behalf of your company.</p>`,
    });
  }

  return { success: true, message: 'Representative verified successfully.' };
}

// ─── Admin: Revoke Representative ────────────────────────────────────────────
export async function revokeRepresentative(
  repId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const rep = await CompanyRepresentative.findById(repId);
  if (!rep) return { success: false, message: 'Representative not found.' };

  rep.verificationStatus = 'revoked';
  rep.revokedReason = reason;
  await rep.save();

  return { success: true, message: 'Representative revoked.' };
}

// ─── Internal: Notify Admin ───────────────────────────────────────────────────
async function notifyAdminNewFounder(
  userName: string, userEmail: string,
  companyName: string, repId: string, proof: string
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  await transporter.sendMail({
    from: `"HireX System" <${process.env.FROM_EMAIL}>`,
    to: adminEmail,
    subject: `🔔 New Founder Registration — ${companyName}`,
    html: `
      <p><strong>${userName}</strong> (${userEmail}) has registered as founder of <strong>${companyName}</strong>.</p>
      <p><strong>Rep ID:</strong> ${repId}</p>
      <p><strong>Proof submitted:</strong> ${proof}</p>
      <p>Go to the admin panel to approve or reject this registration.</p>
    `,
  });
}
