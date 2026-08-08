import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

router.use(authMiddleware);

// ─── GET /api/users/search ───────────────────────────────────────────────────
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const currentUserId = req.userId!;

    const searchCriteria: any = { id: { not: currentUserId } };

    if (query) {
      searchCriteria.OR = [
        { name: { contains: query as string, mode: 'insensitive' } },
        { email: { contains: query as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: searchCriteria,
      take: 20,
      select: { id: true, name: true, email: true, accountType: true, profile: true },
    });

    // Fetch all relevant connections in ONE query to avoid N+1 problem
    const userIds = users.map((u: any) => u.id);
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, receiverId: { in: userIds } },
          { requesterId: { in: userIds }, receiverId: currentUserId },
        ],
      },
    });

    const connectionMap = new Map();
    for (const c of connections) {
      const otherId = c.requesterId === currentUserId ? c.receiverId : c.requesterId;
      connectionMap.set(otherId, c);
    }

    const mappedUsers = users.map((u: any) => {
      const connection = connectionMap.get(u.id);

      // Determine connection status explicitly from currentUserId's perspective
      let connectionStatus = 'none';
      let connectionDirection = 'none';
      if (connection) {
         connectionStatus = connection.status;
         connectionDirection = connection.requesterId === currentUserId ? 'sent' : 'received';
      }

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.accountType,
        avatar: (u.profile as any)?.profilePhoto,
        connectionStatus,
        connectionDirection,
        connectionId: connection?.id || null,
      };
    });

    res.json({ success: true, users: mappedUsers });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/users/:userId/profile ──────────────────────────────────────────
router.get('/:userId/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.userId as string;
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, name: true, email: true, authProvider: true, providerId: true,
        accountType: true, companyName: true, cin: true, gstin: true,
        isVerifiedCompany: true, isVerified: true, profile: true, interests: true,
        referralCode: true, referredBy: true, referralCount: true, verifiedReferralCount: true,
        promoCredits: true, milestoneBadges: true, createdAt: true, updatedAt: true
      }
    });
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const postCount = await prisma.post.count({ where: { authorId: targetUserId } });
    const connectionCount = await prisma.connection.count({
      where: {
        OR: [{ requesterId: targetUserId }, { receiverId: targetUserId }],
        status: 'accepted',
      },
    });

    res.json({
      success: true,
      user: {
        ...user,
        postCount,
        connectionCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
