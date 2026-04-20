import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Opportunity from '../models/Opportunity';
import Event from '../models/Event';
import Connection from '../models/Connection';
import Post from '../models/Post';
import Registration from '../models/Registration';
import { getCache, setCache } from '../utils/redisClient';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/dashboard ──────────────────────────────────────────────────────
// Returns everything needed to render the Dashboard page in one round trip.
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `dashboard:usr:${req.userId}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      // Return the cached personalized data instantly
      res.json(cachedData);
      return;
    }

    const user = await User.findById(req.userId)
      .select('name email accountType profile interests referralCode referralCount verifiedReferralCount promoCredits milestoneBadges isVerifiedCompany isDigilockerVerified');
    if (!user) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const isCompany = user.accountType === 'company';

    // ── 1. Top Picks ─────────────────────────────────────────────────────────
    // For users: procurement opportunities (jobs/freelance)
    // For companies: capital & alliance opportunities
    const pillarFilter = isCompany
      ? { pillar: { $in: ['capital', 'alliance'] } }
      : { pillar: 'procurement' };

    const topPicks = await Opportunity.find({ isActive: true, status: 'open', ...pillarFilter })
      .populate('companyId', 'name companyDetails.companyName isVerifiedCompany profile.profilePhoto')
      .sort({ createdAt: -1 })
      .limit(5);

    // ── 2. Profile Strength Score ─────────────────────────────────────────────
    const p = user.profile as any;
    let score = 0;
    let maxScore = 0;
    const checks = [
      { label: 'Profile Photo', done: !!p?.profilePhoto, weight: 10 },
      { label: 'Headline', done: !!p?.headline, weight: 10 },
      { label: 'Summary', done: !!p?.summary, weight: 10 },
      { label: 'Location', done: !!p?.location, weight: 5 },
      { label: 'Experience', done: p?.experience?.length > 0, weight: 15 },
      { label: 'Education', done: p?.education?.length > 0, weight: 10 },
      { label: 'Skills', done: p?.skills?.length > 0, weight: 10 },
      { label: 'Projects', done: p?.projects?.length > 0, weight: 10 },
      { label: 'Certifications', done: p?.certifications?.length > 0, weight: 10 },
      { label: 'DigiLocker Verified', done: user.isDigilockerVerified, weight: 10 },
    ];
    checks.forEach(c => {
      maxScore += c.weight;
      if (c.done) score += c.weight;
    });
    const profileScore = Math.round((score / maxScore) * 100);
    const missingItems = checks.filter(c => !c.done).map(c => c.label);

    // ── 3. Referral Stats ─────────────────────────────────────────────────────
    const referralStats = {
      code: user.referralCode || 'N/A',
      totalReferrals: user.referralCount || 0,
      verifiedReferrals: user.verifiedReferralCount || 0,
      promoCredits: user.promoCredits || 0,
      milestoneBadges: user.milestoneBadges || [],
    };

    // ── 4. Upcoming Events ────────────────────────────────────────────────────
    const now = new Date();
    const upcomingEvents = await Event.find({
      status: { $in: ['published', 'ongoing'] },
      date: { $gte: now },
    })
      .sort({ date: 1 })
      .limit(4)
      .select('title venue date ticketPrice capacity registrationCount organizerId');

    // ── 5. Activity Stats ─────────────────────────────────────────────────────
    const [postCount, connectionCount, registrationCount] = await Promise.all([
      Post.countDocuments({ authorId: req.userId }),
      Connection.countDocuments({
        $or: [{ requesterId: req.userId }, { receiverId: req.userId }],
        status: 'accepted',
      }),
      Registration.countDocuments({ userId: req.userId, status: { $nin: ['refunded', 'cancelled'] } }),
    ]);

    // ── 6. Network Recommendations ────────────────────────────────────────────
    // Find users the current user is NOT yet connected to, ranked by shared interests
    const existingConnections = await Connection.find({
      $or: [{ requesterId: req.userId }, { receiverId: req.userId }],
      status: { $in: ['pending', 'accepted'] },
    }).select('requesterId receiverId');

    // Build set of already-known user IDs (self + connected)
    const knownIds = new Set<string>([req.userId!]);
    existingConnections.forEach(c => {
      knownIds.add(c.requesterId.toString());
      knownIds.add(c.receiverId.toString());
    });

    // Find candidates: users not in knownIds
    const userInterests = (user.interests || []) as string[];
    const candidateQuery: any = { _id: { $nin: Array.from(knownIds) } };

    // Prefer users sharing interests; fallback to same account type
    if (userInterests.length > 0) {
      candidateQuery.interests = { $in: userInterests };
    } else {
      candidateQuery.accountType = user.accountType;
    }

    let recommendations = await User.find(candidateQuery)
      .select('name accountType profile interests isVerifiedCompany companyDetails')
      .limit(5);

    // If interest-based gives < 3, top-up with general strangers
    if (recommendations.length < 3) {
      const fallback = await User.find({
        _id: { $nin: [...Array.from(knownIds), ...recommendations.map(r => r._id.toString())] },
      })
        .select('name accountType profile interests isVerifiedCompany companyDetails')
        .limit(5 - recommendations.length);
      recommendations = [...recommendations, ...fallback];
    }

    const networkRecommendations = recommendations.map(u => ({
      userId: u._id,
      name: u.name,
      accountType: u.accountType,
      headline: (u.profile as any)?.headline || u.accountType,
      location: (u.profile as any)?.location || '',
      profilePhoto: (u.profile as any)?.profilePhoto || '',
      isVerifiedCompany: u.isVerifiedCompany,
      companyName: (u.companyDetails as any)?.companyName || '',
      mutualInterests: userInterests.filter(i => (u.interests || []).includes(i)),
    }));

    const responsePayload = {
      success: true,
      user: {
        name: user.name,
        accountType: user.accountType,
        headline: p?.headline || '',
        location: p?.location || '',
        profilePhoto: p?.profilePhoto || '',
        isVerifiedCompany: user.isVerifiedCompany,
        isDigilockerVerified: user.isDigilockerVerified,
      },
      topPicks,
      profileStrength: { score: profileScore, missingItems },
      referralStats,
      upcomingEvents,
      activityStats: { postCount, connectionCount, registrationCount },
      networkRecommendations,
    };

    // Cache the fully constructed individual dashboard state for 15 minutes
    await setCache(cacheKey, responsePayload, 900);

    res.json(responsePayload);
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ message: 'Error building dashboard.' });
  }
});

export default router;
