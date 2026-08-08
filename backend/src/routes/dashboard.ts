import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';
import { getCache, setCache } from '../utils/redisClient';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/dashboard ──────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `dashboard:usr:${req.userId}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      res.json(cachedData);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, name: true, email: true, accountType: true, profile: true, interests: true, 
        referralCode: true, referralCount: true, verifiedReferralCount: true, promoCredits: true, 
        milestoneBadges: true, isVerifiedCompany: true, isDigilockerVerified: true, companyName: true 
      }
    });

    if (!user) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const isCompany = user.accountType === 'company';

    // ── 1. Top Picks ─────────────────────────────────────────────────────────
    const pillarFilter = isCompany
      ? { in: ['capital', 'alliance'] }
      : { equals: 'procurement' };

    const topPicks = await prisma.opportunity.findMany({
      where: { isActive: true, status: 'open', pillar: pillarFilter as any },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // We can't directly populate company details in Prisma like Mongoose populate if it's not a true relation.
    // In the new Prisma schema, `Opportunity` has `companyId` as string but no direct relation setup?
    // Let's manually fetch companies
    const companyIds = topPicks.map(o => o.companyId);
    const companies = await prisma.user.findMany({
      where: { id: { in: companyIds }, accountType: 'company' },
      select: { id: true, name: true, companyName: true, isVerifiedCompany: true, profile: true }
    });
    
    const enrichedTopPicks = topPicks.map(op => {
      const comp = companies.find(c => c.id === op.companyId);
      return {
        ...op,
        company: comp ? {
          name: comp.name,
          companyName: comp.companyName,
          isVerifiedCompany: comp.isVerifiedCompany,
          profilePhoto: (comp.profile as any)?.profilePhoto
        } : null
      };
    });

    // ── 2. Profile Strength Score ─────────────────────────────────────────────
    const p = (user.profile as any) || {};
    let score = 0;
    let maxScore = 0;
    const checks = [
      { label: 'Profile Photo', done: !!p.profilePhoto, weight: 10 },
      { label: 'Headline', done: !!p.headline, weight: 10 },
      { label: 'Summary', done: !!p.summary, weight: 10 },
      { label: 'Location', done: !!p.location, weight: 5 },
      { label: 'Experience', done: p.experience?.length > 0, weight: 15 },
      { label: 'Education', done: p.education?.length > 0, weight: 10 },
      { label: 'Skills', done: p.skills?.length > 0, weight: 10 },
      { label: 'Projects', done: p.projects?.length > 0, weight: 10 },
      { label: 'Certifications', done: p.certifications?.length > 0, weight: 10 },
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
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: { in: ['published', 'ongoing'] },
        date: { gte: now },
      },
      orderBy: { date: 'asc' },
      take: 4,
      select: { id: true, title: true, venue: true, date: true, ticketPrice: true, capacity: true, organizerId: true }
    });

    // ── 5. Activity Stats ─────────────────────────────────────────────────────
    const [postCount, connectionCount, registrationCount] = await Promise.all([
      prisma.post.count({ where: { authorId: req.userId } }),
      prisma.connection.count({
        where: {
          OR: [{ requesterId: req.userId }, { receiverId: req.userId }],
          status: 'accepted',
        },
      }),
      prisma.registration.count({ 
        where: { userId: req.userId, status: { notIn: ['refunded', 'cancelled'] } } 
      }),
    ]);

    // ── 6. Network Recommendations ────────────────────────────────────────────
    const existingConnections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: req.userId }, { receiverId: req.userId }],
        status: { in: ['pending', 'accepted'] },
      },
      select: { requesterId: true, receiverId: true }
    });

    const knownIds = new Set<string>([req.userId!]);
    existingConnections.forEach(c => {
      knownIds.add(c.requesterId);
      knownIds.add(c.receiverId);
    });

    const userInterests = user.interests || [];
    
    let recommendations = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(knownIds) },
        ...(userInterests.length > 0 ? { interests: { hasSome: userInterests } } : { accountType: user.accountType })
      },
      select: { id: true, name: true, accountType: true, profile: true, interests: true, isVerifiedCompany: true, companyName: true },
      take: 5
    });

    if (recommendations.length < 3) {
      const fallback = await prisma.user.findMany({
        where: { id: { notIn: [...Array.from(knownIds), ...recommendations.map(r => r.id)] } },
        select: { id: true, name: true, accountType: true, profile: true, interests: true, isVerifiedCompany: true, companyName: true },
        take: 5 - recommendations.length
      });
      recommendations = [...recommendations, ...fallback];
    }

    const networkRecommendations = recommendations.map(u => ({
      userId: u.id,
      name: u.name,
      accountType: u.accountType,
      headline: (u.profile as any)?.headline || u.accountType,
      location: (u.profile as any)?.location || '',
      profilePhoto: (u.profile as any)?.profilePhoto || '',
      isVerifiedCompany: u.isVerifiedCompany,
      companyName: u.companyName || '',
      mutualInterests: userInterests.filter(i => (u.interests || []).includes(i)),
    }));

    const responsePayload = {
      success: true,
      user: {
        name: user.name,
        accountType: user.accountType,
        headline: p.headline || '',
        location: p.location || '',
        profilePhoto: p.profilePhoto || '',
        isVerifiedCompany: user.isVerifiedCompany,
        isDigilockerVerified: user.isDigilockerVerified,
      },
      topPicks: enrichedTopPicks,
      profileStrength: { score: profileScore, missingItems },
      referralStats,
      upcomingEvents,
      activityStats: { postCount, connectionCount, registrationCount },
      networkRecommendations,
    };

    await setCache(cacheKey, responsePayload, 900);

    res.json(responsePayload);
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ message: 'Error building dashboard.' });
  }
});

export default router;
