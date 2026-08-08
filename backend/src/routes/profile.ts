import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';
import { extractInterests } from '../utils/extractInterests';
import { generateOTP, sendOTPEmail } from '../utils/email';

const router = Router();

const expVerifyOtpStore = new Map<string, { otp: string; email: string; expiresAt: number }>();

// ─── GET /api/profile/me — own full profile (authenticated) ────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, accountType: true,
        companyName: true, cin: true, gstin: true,
        isVerifiedCompany: true, isVerified: true, profile: true, interests: true,
        referralCode: true, referralCount: true, verifiedReferralCount: true, promoCredits: true,
        milestoneBadges: true, isDigilockerVerified: true, digilockerData: true, createdAt: true
      }
    });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/profile/:userId — public profile ────────────────────────────────
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId as string },
      select: {
        id: true, name: true, accountType: true,
        companyName: true,
        isVerifiedCompany: true, profile: true, interests: true,
        milestoneBadges: true, isDigilockerVerified: true, createdAt: true
      }
    });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/profile — update own profile sections ────────────────────────
router.patch('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const allowedFields = [
      'headline', 'summary', 'location', 'pronouns', 'website',
      'openToWork', 'openToWorkTypes',
      'phone', 'linkedinUrl', 'githubUrl', 'twitterUrl', 'portfolioUrl',
      'experience', 'education', 'skills', 'certifications',
      'projects', 'publications', 'honors', 'languages', 'volunteer', 'courses',
    ];

    let currentProfile = (user.profile as any) || {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'experience' && Array.isArray(req.body[field])) {
          const existingExp = currentProfile.experience || [];
          currentProfile.experience = req.body[field].map((exp: any) => {
            if (exp._id) {
              const existing = existingExp.find((e: any) => e._id?.toString() === exp._id);
              if (existing) {
                return {
                  ...exp,
                  isVerified: existing.isVerified || false,
                  companyEmail: existing.companyEmail || '',
                };
              }
            }
            return { ...exp, isVerified: false, companyEmail: '' };
          });
        } else {
          currentProfile[field] = req.body[field];
        }
      }
    }

    const dataToUpdate: any = { profile: currentProfile };
    if (req.body.name) dataToUpdate.name = req.body.name;

    const newInterests = extractInterests(currentProfile);
    dataToUpdate.interests = newInterests;

    const result = await prisma.user.update({
      where: { id: req.userId },
      data: dataToUpdate,
      select: {
        id: true, name: true, email: true, accountType: true,
        companyName: true, cin: true, gstin: true,
        isVerifiedCompany: true, isVerified: true, profile: true, interests: true,
        referralCode: true, referralCount: true, verifiedReferralCount: true, promoCredits: true,
        milestoneBadges: true, isDigilockerVerified: true, digilockerData: true, createdAt: true
      }
    });

    res.json({ message: 'Profile updated successfully.', user: result });
  } catch (err) {
    console.error('[profile:update]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/profile/photo — update profile or cover photo ────────────────
router.patch('/photo', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, data } = req.body;
    if (!type || !data || !['profile', 'cover'].includes(type)) {
      res.status(400).json({ message: 'type (profile|cover) and data (base64) are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const currentProfile = (user.profile as any) || {};
    if (type === 'profile') {
      currentProfile.profilePhoto = data;
    } else {
      currentProfile.coverPhoto = data;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { profile: currentProfile }
    });

    res.json({ message: `${type === 'profile' ? 'Profile' : 'Cover'} photo updated.` });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/profile/experience/verify-request — send OTP to company email ─
router.post('/experience/verify-request', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { experienceId, companyEmail } = req.body;
    if (!experienceId || !companyEmail) {
      res.status(400).json({ message: 'experienceId and companyEmail are required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      res.status(400).json({ message: 'Invalid email format.' });
      return;
    }

    const blockedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com'];
    const emailDomain = companyEmail.split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(emailDomain)) {
      res.status(400).json({ message: 'Please use your company/organization email, not a personal email.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const experience = (user.profile as any)?.experience || [];
    const expEntry = experience.find((e: any) => e._id?.toString() === experienceId);
    if (!expEntry) {
      res.status(404).json({ message: 'Experience entry not found.' });
      return;
    }

    if (expEntry.isVerified) {
      res.status(400).json({ message: 'This experience is already verified.' });
      return;
    }

    const otp = generateOTP();
    const key = `${req.userId}_${experienceId}`;
    expVerifyOtpStore.set(key, {
      otp,
      email: companyEmail,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await sendOTPEmail(companyEmail, user.name, otp);

    res.json({ success: true, message: `Verification code sent to ${companyEmail}` });
  } catch (err) {
    console.error('[exp-verify:request]', err);
    res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
  }
});

// ─── POST /api/profile/experience/verify-confirm — confirm OTP ───────────────
router.post('/experience/verify-confirm', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { experienceId, otp } = req.body;
    if (!experienceId || !otp) {
      res.status(400).json({ message: 'experienceId and otp are required.' });
      return;
    }

    const key = `${req.userId}_${experienceId}`;
    const stored = expVerifyOtpStore.get(key);

    if (!stored) {
      res.status(400).json({ message: 'No verification request found. Please request a new code.' });
      return;
    }

    if (Date.now() > stored.expiresAt) {
      expVerifyOtpStore.delete(key);
      res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
      return;
    }

    if (stored.otp !== otp) {
      res.status(400).json({ message: 'Incorrect verification code.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const currentProfile = (user.profile as any) || {};
    const experience = currentProfile.experience || [];
    
    currentProfile.experience = experience.map((e: any) => {
      if (e._id?.toString() === experienceId) {
        return { ...e, isVerified: true, companyEmail: stored.email };
      }
      return e;
    });

    await prisma.user.update({
      where: { id: req.userId },
      data: { profile: currentProfile }
    });

    expVerifyOtpStore.delete(key);

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, accountType: true,
        companyName: true, cin: true, gstin: true,
        isVerifiedCompany: true, isVerified: true, profile: true, interests: true,
        referralCode: true, referralCount: true, verifiedReferralCount: true, promoCredits: true,
        milestoneBadges: true, isDigilockerVerified: true, digilockerData: true, createdAt: true
      }
    });

    res.json({ success: true, message: 'Experience verified successfully!', user: updatedUser });
  } catch (err) {
    console.error('[exp-verify:confirm]', err);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

export default router;
