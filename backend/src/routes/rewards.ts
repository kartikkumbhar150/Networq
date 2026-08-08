import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

// BOOST CONSTANTS
const BOOST_COST = 1000;
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// 1. Activate Basic Boost
router.post('/boost', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.body;
    const userId = req.userId!;

    if (!['post', 'event', 'profile', 'company'].includes(entityType) || !entityId) {
      res.status(400).json({ message: 'Valid entityType and entityId are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (user.promoCredits < BOOST_COST) {
      res.status(400).json({ message: `Insufficient promo credits. ${BOOST_COST} required.` });
      return;
    }

    const boostUntil = new Date(Date.now() + BOOST_DURATION_MS);
    let entityIdent = '';

    if (entityType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: entityId } });
      if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }
      await prisma.post.update({ where: { id: entityId }, data: { boostedUntil: boostUntil } });
      entityIdent = 'Post';
    } 
    else if (entityType === 'event') {
      const event = await prisma.event.findUnique({ where: { id: entityId } });
      if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
      await prisma.event.update({ where: { id: entityId }, data: { boostedUntil: boostUntil } });
      entityIdent = 'Event';
    } 
    else if (entityType === 'profile' || entityType === 'company') {
      const targetUser = await prisma.user.findUnique({ where: { id: entityId } });
      if (!targetUser) { res.status(404).json({ message: 'User not found.' }); return; }
      await prisma.user.update({ where: { id: entityId }, data: { boostedUntil: boostUntil } });
      entityIdent = entityType === 'company' ? 'Company Page' : 'Profile';
    }

    // Deduct credits
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { promoCredits: user.promoCredits - BOOST_COST }
    });

    // Log transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'boost',
        amount: -BOOST_COST,
        description: `Basic Boost applied to ${entityIdent} for 24 hours`,
      }
    });

    res.status(200).json({ message: `${entityIdent} boosted successfully until ${boostUntil.toLocaleString()}`, promoCredits: updatedUser.promoCredits });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Buy More Credits (Top-up Placeholder)
router.post('/topup', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const userId = req.userId!;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Valid amount required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { promoCredits: user.promoCredits + amount }
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: 'topup',
        amount: amount,
        description: `Fiat Wallet Top-Up: ${amount} Credits Added`,
      }
    });

    res.status(200).json({ message: `Successfully topped up ${amount} credits!`, promoCredits: updatedUser.promoCredits });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 3. Leaderboards (Global, City, Fastest 1000)
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const cityParam = req.query.city as string;

    // Global Top Referrers
    const globalReferrers = await prisma.user.findMany({
      where: { referralCount: { gt: 0 } },
      orderBy: { referralCount: 'desc' },
      take: 10,
      select: { name: true, profile: true, accountType: true, referralCount: true, milestoneBadges: true }
    });

    // City Top Referrers - In Prisma querying nested JSON via regex is tricky. 
    // We'll fetch users with >0 referrals and filter in-memory for city.
    let cityReferrers: any[] = [];
    if (cityParam) {
       const cityUsers = await prisma.user.findMany({
          where: { referralCount: { gt: 0 } },
          orderBy: { referralCount: 'desc' },
          select: { name: true, profile: true, accountType: true, referralCount: true, milestoneBadges: true }
       });
       const cityRegex = new RegExp(cityParam, 'i');
       cityReferrers = cityUsers.filter(u => {
          const loc = (u.profile as any)?.location;
          return loc && cityRegex.test(loc);
       }).slice(0, 10);
    }

    // Fastest 1000 Verified Joins
    const fastest1000 = await prisma.user.findMany({
      where: { isVerified: true },
      orderBy: { createdAt: 'asc' },
      take: 1000,
      select: { name: true, profile: true, accountType: true, createdAt: true, isVerifiedCompany: true }
    });

    // Mega Gift Leaderboard
    const megaGiftLeaderboard = await prisma.user.findMany({
      where: { hasReached1000MilestoneAt: { not: null } },
      orderBy: { hasReached1000MilestoneAt: 'asc' },
      take: 30,
      select: { name: true, profile: true, accountType: true, verifiedReferralCount: true, hasReached1000MilestoneAt: true, milestoneBadges: true }
    });

    res.status(200).json({
      success: true,
      globalReferrers: globalReferrers.map(r => ({ ...r, profilePhoto: (r.profile as any)?.profilePhoto })),
      cityReferrers: cityReferrers.map(r => ({ ...r, profilePhoto: (r.profile as any)?.profilePhoto })),
      fastest1000: fastest1000.map(r => ({ ...r, profilePhoto: (r.profile as any)?.profilePhoto })),
      megaGiftLeaderboard: megaGiftLeaderboard.map(r => ({ ...r, profilePhoto: (r.profile as any)?.profilePhoto }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboards.' });
  }
});

// 4. Admin View All Transactions
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
   try {
     const asAdmin = req.query.admin === 'true';
     let whereClause = {};
     if (!asAdmin) {
        whereClause = { userId: req.userId };
     }

     const logs = await prisma.transaction.findMany({
       where: whereClause,
       orderBy: { createdAt: 'desc' },
       take: 100
     });
     res.status(200).json({ success: true, logs });
   } catch(e) {
     res.status(500).json({ message: 'Error fetching logs.' });
   }
});

// 5. User Summary (Fetch own credits/code)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { referralCode: true, referralCount: true, verifiedReferralCount: true, promoCredits: true, milestoneBadges: true }
    });
    if (!user) { res.status(404).json({ message: 'No user' }); return; }
    res.status(200).json({ success: true, user });
  } catch(e) {
    res.status(500).json({ message: 'Failed' });
  }
});

// 6. Admin Award Mega Gift
router.post('/admin/mega-gift', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
     const { targetId, giftName } = req.body;
     const target = await prisma.user.findUnique({ where: { id: targetId } });
     if (!target) { res.status(404).json({ message: 'User not found' }); return; }

     await prisma.transaction.create({
        data: {
          userId: target.id,
          type: 'milestone',
          amount: 0,
          description: `MEGA GIFT AWARDED: ${giftName}!`
        }
     });

     res.status(200).json({ success: true, message: `Mega Gift explicitly awarded to ${target.name}!` });
  } catch(e) {
     res.status(500).json({ message: 'Failed to assign gift.' });
  }
});

export default router;
