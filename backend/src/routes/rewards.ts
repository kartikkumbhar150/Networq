import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Post from '../models/Post';
import Event from '../models/Event';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

const router = Router();

// BOOST CONSTANTS
const BOOST_COST = 1000;
const BOOST_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// 1. Activate Basic Boost
router.post('/boost', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.body;
    const userId = req.userId;

    if (!['post', 'event', 'profile', 'company'].includes(entityType) || !entityId) {
      res.status(400).json({ message: 'Valid entityType and entityId are required.' });
      return;
    }

    const user = await User.findById(userId);
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
      const post = await Post.findById(entityId);
      if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }
      post.boostedUntil = boostUntil;
      await post.save();
      entityIdent = 'Post';
    } 
    else if (entityType === 'event') {
      const event = await Event.findById(entityId);
      if (!event) { res.status(404).json({ message: 'Event not found.' }); return; }
      event.boostedUntil = boostUntil;
      await event.save();
      entityIdent = 'Event';
    } 
    else if (entityType === 'profile' || entityType === 'company') {
      const targetUser = await User.findById(entityId);
      if (!targetUser) { res.status(404).json({ message: 'User not found.' }); return; }
      targetUser.boostedUntil = boostUntil;
      await targetUser.save();
      entityIdent = entityType === 'company' ? 'Company Page' : 'Profile';
    }

    // Deduct credits
    user.promoCredits -= BOOST_COST;
    await user.save();

    // Log transaction
    await Transaction.create({
      userId: user.id,
      type: 'boost',
      amount: -BOOST_COST,
      description: `Basic Boost applied to ${entityIdent} for 24 hours`,
    });

    res.status(200).json({ message: `${entityIdent} boosted successfully until ${boostUntil.toLocaleString()}`, promoCredits: user.promoCredits });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 2. Buy More Credits (Top-up Placeholder)
router.post('/topup', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    const userId = req.userId;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Valid amount required.' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) return;

    user.promoCredits += amount;
    await user.save();

    await Transaction.create({
      userId: user.id,
      type: 'topup',
      amount: amount,
      description: `Fiat Wallet Top-Up: ${amount} Credits Added`,
    });

    res.status(200).json({ message: `Successfully topped up ${amount} credits!`, promoCredits: user.promoCredits });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// 3. Leaderboards (Global, City, Fastest 1000)
router.get('/leaderboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const cityParam = req.query.city as string;

    // Global Top Referrers
    const globalReferrers = await User.find({ referralCount: { $gt: 0 } })
      .sort({ referralCount: -1 })
      .limit(10)
      .select('name profile.location profilePhoto accountType referralCount milestoneBadges');

    // City Top Referrers
    let cityReferrers: any[] = [];
    if (cityParam) {
       cityReferrers = await User.find({ 'profile.location': { $regex: new RegExp(cityParam, 'i') }, referralCount: { $gt: 0 } })
        .sort({ referralCount: -1 })
        .limit(10)
        .select('name profile.location profilePhoto accountType referralCount milestoneBadges');
    }

    // Fastest 1000 Verified Joins (the first 1000 members overall)
    const fastest1000 = await User.find({ isVerified: true })
      .sort({ createdAt: 1 })
      .limit(1000)
      .select('name profile.location profilePhoto accountType createdAt isVerifiedCompany');

    // First & Fastest 1,000 Verified Joins Promoters Leaderboard
    const megaGiftLeaderboard = await User.find({ hasReached1000MilestoneAt: { $ne: null } })
      .sort({ hasReached1000MilestoneAt: 1 })
      .limit(30)
      .select('name profile.location profilePhoto accountType verifiedReferralCount hasReached1000MilestoneAt milestoneBadges');

    res.status(200).json({
      success: true,
      globalReferrers,
      cityReferrers,
      fastest1000,
      megaGiftLeaderboard
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboards.' });
  }
});

// 4. Admin View All Transactions
router.get('/transactions', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
   // In a real app we check req.user isAdmin. We assume anyone hitting this in the hackathon MVP can view their own, or global if no param
   try {
     const asAdmin = req.query.admin === 'true';
     let query = {};
     if (!asAdmin) {
        query = { userId: req.userId };
     }

     const logs = await Transaction.find(query).sort({ createdAt: -1 }).limit(100);
     res.status(200).json({ success: true, logs });
   } catch(e) {
     res.status(500).json({ message: 'Error fetching logs.' });
   }
});

// 5. User Summary (Fetch own credits/code)
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('referralCode referralCount verifiedReferralCount promoCredits milestoneBadges');
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
     const target = await User.findById(targetId);
     if (!target) { res.status(404).json({ message: 'User not found' }); return; }

     await Transaction.create({
        userId: target.id,
        type: 'milestone',
        amount: 0,
        description: `MEGA GIFT AWARDED: ${giftName}!`
     });

     res.status(200).json({ success: true, message: `Mega Gift explicitly awarded to ${target.name}!` });
  } catch(e) {
     res.status(500).json({ message: 'Failed to assign gift.' });
  }
});

export default router;
