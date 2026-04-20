import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { extractInterests } from '../utils/extractInterests';
import { generateOTP, sendOTPEmail } from '../utils/email';

const router = Router();

// In-memory OTP store for experience verification
// Format: { `${userId}_${experienceId}`: { otp, email, expiresAt } }
const expVerifyOtpStore = new Map<string, { otp: string; email: string; expiresAt: number }>();

// ─── GET /api/profile/me — own full profile (authenticated) ────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -facePointId');
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/profile/:userId — public profile ────────────────────────────────
// NOTE: No auth required — profile photo and info are public
router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-passwordHash -facePointId -email');
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/profile — update own profile sections ────────────────────────
router.patch('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    // Whitelist of profile fields that can be updated
    const allowedFields = [
      'headline', 'summary', 'location', 'pronouns', 'website',
      'openToWork', 'openToWorkTypes',
      'phone', 'linkedinUrl', 'githubUrl', 'twitterUrl', 'portfolioUrl',
      'experience', 'education', 'skills', 'certifications',
      'projects', 'publications', 'honors', 'languages', 'volunteer', 'courses',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // For experience, preserve isVerified and companyEmail from existing entries
        if (field === 'experience' && Array.isArray(req.body[field])) {
          const existingExp = (user.profile as any)?.experience || [];
          const newExp = req.body[field].map((exp: any) => {
            // Match by _id to preserve verification status
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
          updates[`profile.${field}`] = newExp;
        } else {
          updates[`profile.${field}`] = req.body[field];
        }
      }
    }

    // Handle name at top level
    if (req.body.name) updates['name'] = req.body.name;

    await User.findByIdAndUpdate(req.userId, { $set: updates });

    // Re-fetch updated profile and auto-extract interests
    const updated = await User.findById(req.userId);
    if (updated && updated.profile) {
      const newInterests = extractInterests(updated.profile as Record<string, any>);
      updated.interests = newInterests;
      await updated.save();
    }

    const result = await User.findById(req.userId).select('-passwordHash -facePointId');
    res.json({ message: 'Profile updated successfully.', user: result });
  } catch (err) {
    console.error('[profile:update]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── PATCH /api/profile/photo — update profile or cover photo ────────────────
router.patch('/photo', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, data } = req.body; // type: 'profile' | 'cover', data: base64
    if (!type || !data || !['profile', 'cover'].includes(type)) {
      res.status(400).json({ message: 'type (profile|cover) and data (base64) are required.' });
      return;
    }

    const field = type === 'profile' ? 'profile.profilePhoto' : 'profile.coverPhoto';
    await User.findByIdAndUpdate(req.userId, { $set: { [field]: data } });

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail)) {
      res.status(400).json({ message: 'Invalid email format.' });
      return;
    }

    // Block personal email domains
    const blockedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'yandex.com'];
    const emailDomain = companyEmail.split('@')[1]?.toLowerCase();
    if (blockedDomains.includes(emailDomain)) {
      res.status(400).json({ message: 'Please use your company/organization email, not a personal email.' });
      return;
    }

    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    // Check experienceId exists
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

    // Generate OTP and store
    const otp = generateOTP();
    const key = `${req.userId}_${experienceId}`;
    expVerifyOtpStore.set(key, {
      otp,
      email: companyEmail,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OTP via email
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

    // Mark experience as verified
    await User.updateOne(
      { _id: req.userId, 'profile.experience._id': experienceId },
      { $set: {
        'profile.experience.$.isVerified': true,
        'profile.experience.$.companyEmail': stored.email,
      }}
    );

    expVerifyOtpStore.delete(key);

    const user = await User.findById(req.userId).select('-passwordHash -facePointId');
    res.json({ success: true, message: 'Experience verified successfully!', user });
  } catch (err) {
    console.error('[exp-verify:confirm]', err);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
});

export default router;
