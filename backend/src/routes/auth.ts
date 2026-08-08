import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import { generateOTP, sendOTPEmail } from '../utils/email';
import { checkLiveness } from '../utils/fastapi';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { verifyCompanyBackground } from '../utils/verifyCompany';
import passport from '../utils/passport';

const router = Router();
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;

function signJWT(userId: string, email: string, accountType: string): string {
  return jwt.sign(
    { userId, email, accountType },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

// ─── FRAUD-RESISTANT MILESTONE REWARDS ENGINE ────────────────────────────────
async function processVerifiedReferral(referralCode: string, verifiedUserName: string) {
  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer) return;

  const count = referrer.verifiedReferralCount + 1;
  let earnedBadge = '';
  let transactionDesc = '';
  let bonus = 0;
  let hasReached1000 = referrer.hasReached1000MilestoneAt;

  if (count === 100) {
    earnedBadge = '100 Verified Joins Club';
    transactionDesc = 'Gift Reward 1 Unlocked! (100 Verified Referrals)';
    bonus = 100000;
  } else if (count === 500) {
    earnedBadge = '500 Verified Joins Elite';
    transactionDesc = 'Bigger Gift Reward 2 Unlocked! (500 Verified Referrals)';
    bonus = 500000;
  } else if (count === 1000) {
    earnedBadge = '1K Club Mega Referrer';
    transactionDesc = 'Fastest 1,000 Verified Joins Entry Unlocked!';
    hasReached1000 = new Date();
  }

  const updatedBadges = earnedBadge ? [...referrer.milestoneBadges, earnedBadge] : referrer.milestoneBadges;

  await prisma.user.update({
    where: { id: referrer.id },
    data: {
      verifiedReferralCount: count,
      milestoneBadges: updatedBadges,
      promoCredits: referrer.promoCredits + bonus,
      hasReached1000MilestoneAt: hasReached1000,
    }
  });

  if (earnedBadge || bonus > 0) {
    await prisma.transaction.create({
      data: {
        userId: referrer.id,
        type: 'milestone',
        amount: bonus,
        description: transactionDesc
      }
    });
  }
}

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
// Step 1: Validate details + send OTP (no face image required)
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, accountType, companyName, cin, gstin } = req.body;

    if (!name || !email || !password || !accountType) {
      res.status(400).json({ message: 'Name, email, password, and account type are required.' });
      return;
    }

    // Check if email already exists in users
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    // Remove existing pending user if re-attempting
    await prisma.pendingUser.deleteMany({ where: { email: email.toLowerCase() } });

    // 1. Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 2. Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 3. Save pending user (no face data needed)
    await prisma.pendingUser.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        accountType: accountType === 'company' ? 'company' : 'user',
        companyDetails: accountType === 'company' ? { companyName, cin, gstin } : undefined,
        otp,
        otpExpiry,
      }
    });

    // 4. Send OTP email
    await sendOTPEmail(email, name, otp);

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete signup.',
    });
  } catch (error) {
    console.error('[signup]', error);
    res.status(500).json({ message: 'Internal server error during signup.' });
  }
});

// ─── POST /api/auth/verify-otp ─────────────────────────────────────────────
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, referralCode } = req.body;
    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required.' });
      return;
    }

    const pending = await prisma.pendingUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!pending) {
      res.status(404).json({ message: 'No pending signup found. Please start over.' });
      return;
    }

    if (pending.otp !== otp) {
      res.status(400).json({ message: 'Invalid OTP.' });
      return;
    }

    if (new Date() > pending.otpExpiry) {
      await prisma.pendingUser.deleteMany({ where: { email: email.toLowerCase() } });
      res.status(400).json({ message: 'OTP has expired. Please start over.' });
      return;
    }

    // Generate unique referral code: UPPERCASE 8 chars.
    const newRefCode = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const cd = pending.companyDetails as any;

    // Create the verified user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        passwordHash: pending.passwordHash,
        accountType: pending.accountType,
        companyName: cd?.companyName,
        cin: cd?.cin,
        gstin: cd?.gstin,
        isVerified: true,
        referralCode: newRefCode,
        referredBy: referralCode || pending.enteredReferralCode,
      }
    });

    // Handle Referral Payouts securely
    const codeToCredit = referralCode || pending.enteredReferralCode;
    if (codeToCredit) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: codeToCredit } });
      if (referrer) {
        // Base Grant
        const updatedCredits = referrer.promoCredits + 500;
        const count = referrer.referralCount + 1;
        
        let milestoneBonus = 0;
        let earnedBadge = '';
        
        // Milestone Triggers
        if (count === 5) {
           milestoneBonus = 2500;
           earnedBadge = 'Connector';
        } else if (count === 10) {
           milestoneBonus = 5000;
           earnedBadge = 'Bronze Networker';
        } else if (count === 25) {
           milestoneBonus = 15000;
           earnedBadge = 'Silver Influencer';
        } else if (count === 50) {
           milestoneBonus = 40000;
           earnedBadge = 'Gold Ambassador';
        }

        const badges = earnedBadge ? [...referrer.milestoneBadges, earnedBadge] : referrer.milestoneBadges;

        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            promoCredits: updatedCredits + milestoneBonus,
            referralCount: count,
            milestoneBadges: badges,
          }
        });

        if (milestoneBonus > 0) {
           await prisma.transaction.create({ data: { userId: referrer.id, type: 'milestone', amount: milestoneBonus, description: `Milestone Unlocked: ${earnedBadge} (${count} referrals)` } });
        }

        // Log base transaction
        await prisma.transaction.create({ data: { userId: referrer.id, type: 'referral', amount: 500, description: `Referral bonus for verifying ${user.name}` } });
      }
    }

    // Clean up pending
    await prisma.pendingUser.deleteMany({ where: { email: email.toLowerCase() } });

    // Trigger async company verification if applicable
    if (user.accountType === 'company') {
      verifyCompanyBackground(user.id);
    }

    const token = signJWT(user.id, user.email, user.accountType);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isVerifiedCompany: user.isVerifiedCompany,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/auth/liveness ─────────────────────────────────────────────
// Step 3: Liveness check to mark user as human (no duplicates checked)
router.post('/liveness', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { faceImage } = req.body;
    if (!faceImage) {
      res.status(400).json({ message: 'Face image is required.' });
      return;
    }
    
    const base64Image = faceImage.replace(/^data:image\/\w+;base64,/, '');
    
    // Check liveness via FastAPI ML Service
    const livenessResult = await checkLiveness(base64Image);
    if (!livenessResult.is_live) {
      res.status(403).json({
        message: 'Liveness check failed. Please use a real face, not a photo or screen.',
        detail: livenessResult.message,
      });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user && !user.isDigilockerVerified && user.referredBy) {
      // NOTE: Removed facePointId check since Qdrant is removed
      await processVerifiedReferral(user.referredBy, user.name);
    }

    res.json({ success: true, message: 'Liveness verified.' });
  } catch (error) {
    console.error('[liveness]', error);
    res.status(500).json({ message: 'Internal server error during liveness check.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, loginType } = req.body;
    if (!email || !password || !loginType) {
      res.status(400).json({ message: 'Email, password, and login type are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    if (user.accountType !== loginType) {
      res.status(403).json({ message: `Access denied. Please login via the correct portal.` });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ message: 'Email not verified. Please complete signup.' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ message: 'Please sign in using the OAuth provider you registered with.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const token = signJWT(user.id, user.email, user.accountType);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        isVerifiedCompany: user.isVerifiedCompany,
        companyDetails: { companyName: user.companyName, cin: user.cin, gstin: user.gstin },
      },
    });
  } catch (error) {
    console.error('[login]', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, accountType: true,
        isVerifiedCompany: true, referralCode: true,
      }
    });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error('[me]', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// ─── OAUTH: GOOGLE ───────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signJWT(user.id, user.email, user.accountType);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/`);
  }
);

// ─── OAUTH: GITHUB ───────────────────────────────────────────────────────────
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', session: false }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signJWT(user.id, user.email, user.accountType);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/`);
  }
);

// ─── DIGILOCKER: IDENTITY VERIFICATION ───────────────────────────────────────
const DIGILOCKER_AUTH_URL = 'https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize';
const DIGILOCKER_TOKEN_URL = 'https://digilocker.meripehchaan.gov.in/public/oauth2/2/token';
const DIGILOCKER_USER_URL = 'https://digilocker.meripehchaan.gov.in/public/oauth2/1/user';

router.get('/digilocker', authMiddleware, (req: AuthRequest, res: Response) => {
  const clientId = process.env.DIGILOCKER_CLIENT_ID;
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).json({ message: 'DigiLocker credentials not configured.' });
    return;
  }

  (req as any).session.digilockerUserId = req.userId;

  const authUrl = `${DIGILOCKER_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${req.userId}&scope=openid`;
  res.redirect(authUrl);
});

router.get('/digilocker/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, state: userId } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code || !userId) {
    res.redirect(`${frontendUrl}/signup?digilocker=error&reason=missing_params`);
    return;
  }

  try {
    const clientId = process.env.DIGILOCKER_CLIENT_ID!;
    const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET!;
    const redirectUri = process.env.DIGILOCKER_REDIRECT_URI!;

    const tokenResponse = await fetch(DIGILOCKER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      res.redirect(`${frontendUrl}/signup?digilocker=error&reason=token_exchange_failed`);
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const userResponse = await fetch(DIGILOCKER_USER_URL, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!userResponse.ok) {
      res.redirect(`${frontendUrl}/signup?digilocker=error&reason=user_fetch_failed`);
      return;
    }

    const digilockerUser = await userResponse.json();

    const existingUser = await prisma.user.findUnique({ where: { id: userId as string } });
    if (existingUser && !existingUser.isDigilockerVerified && existingUser.referredBy) {
       await processVerifiedReferral(existingUser.referredBy, existingUser.name);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId as string },
      data: {
        isDigilockerVerified: true,
        digilockerData: {
          aadhaarName: digilockerUser.name || digilockerUser.digilockerid,
          dob: digilockerUser.dob,
          gender: digilockerUser.gender,
          digilockerId: digilockerUser.digilockerid,
          verifiedAt: new Date()
        }
      }
    });

    res.redirect(`${frontendUrl}/feed?digilocker=success`);

  } catch (error) {
    res.redirect(`${frontendUrl}/signup?digilocker=error&reason=internal_error`);
  }
});

router.get('/digilocker/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isDigilockerVerified: true, digilockerData: true, name: true }
    });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }
    const dData = user.digilockerData as any;
    res.json({
      success: true,
      isVerified: user.isDigilockerVerified,
      digilockerData: user.digilockerData,
      nameMatch: dData?.aadhaarName
        ? user.name.toLowerCase().includes(dData.aadhaarName.split(' ')[0].toLowerCase())
        : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.post('/digilocker/demo-verify', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    if (!user.isDigilockerVerified && user.referredBy) {
       await processVerifiedReferral(user.referredBy, user.name);
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        isDigilockerVerified: true,
        digilockerData: {
          aadhaarName: user.name,
          dob: '1999-01-01',
          gender: 'M',
          digilockerId: `DL-${user.id.slice(-8).toUpperCase()}`,
          verifiedAt: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Identity verified via DigiLocker (demo).' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
