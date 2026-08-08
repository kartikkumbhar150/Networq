import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();

router.use(authMiddleware);

// ─── POST /api/connections/request ───────────────────────────────────────────
router.post('/request', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, receiverName } = req.body;
    const requesterId = req.userId!;

    if (requesterId === receiverId) {
      res.status(400).json({ message: 'Cannot connect to yourself.' });
      return;
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) { res.status(404).json({ message: 'Requester not found' }); return; }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId, status: { in: ['pending', 'accepted'] } },
          { requesterId: receiverId, receiverId: requesterId, status: { in: ['pending', 'accepted'] } },
        ]
      }
    });

    if (existing) {
      res.status(400).json({ message: 'Connection already exists or is pending.' });
      return;
    }

    const connection = await prisma.connection.create({
      data: {
        requesterId,
        requesterName: requester.name,
        requesterAvatar: (requester.profile as any)?.profilePhoto || '', 
        receiverId,
        receiverName,
        status: 'pending',
      }
    });

    res.json({ success: true, connectionId: connection.id });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/connections/:connectionId/respond ─────────────────────────────
router.post('/:connectionId/respond', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action } = req.body; 
    const connection = await prisma.connection.findUnique({ where: { id: (req.params.connectionId as string) } });
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.receiverId !== req.userId) {
      res.status(403).json({ message: 'Unauthorized.' });
      return;
    }

    let newStatus = connection.status;
    if (action === 'accept') {
      newStatus = 'accepted';
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else {
      res.status(400).json({ message: 'Invalid action.' });
      return;
    }

    await prisma.connection.update({
      where: { id: connection.id },
      data: { status: newStatus }
    });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/connections/:connectionId/withdraw ────────────────────────────
router.post('/:connectionId/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connection = await prisma.connection.findUnique({ where: { id: (req.params.connectionId as string) } });
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.requesterId !== req.userId || connection.status !== 'pending') {
      res.status(403).json({ message: 'Unauthorized or not pending.' });
      return;
    }

    await prisma.connection.update({
      where: { id: connection.id },
      data: { status: 'withdrawn' }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── DELETE /api/connections/:connectionId ───────────────────────────────────
router.delete('/:connectionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connection = await prisma.connection.findUnique({ where: { id: (req.params.connectionId as string) } });
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.requesterId !== req.userId && connection.receiverId !== req.userId) {
      res.status(403).json({ message: 'Unauthorized.' });
      return;
    }

    await prisma.connection.delete({ where: { id: connection.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/connections/:userId/list ───────────────────────────────────────
router.get('/:userId/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId as string;
    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: 'accepted',
      }
    });

    const otherIds = connections.map(c =>
      c.requesterId === userId ? c.receiverId : c.requesterId
    );
    const users = await prisma.user.findMany({ 
      where: { id: { in: otherIds } },
      select: { id: true, name: true, accountType: true, profile: true }
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const mapped = connections.map((c) => {
      const isRequester = c.requesterId === userId;
      const otherId = isRequester ? c.receiverId : c.requesterId;
      const otherUser = userMap.get(otherId);
      return {
        connectionId: c.id,
        userId: otherId,
        name: otherUser?.name || 'Unknown User',
        avatar: (otherUser?.profile as any)?.profilePhoto,
        role: otherUser?.accountType,
      };
    });

    res.json({ success: true, connections: mapped });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/connections/:userId/pending ────────────────────────────────────
router.get('/:userId/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const pendingRequests = await prisma.connection.findMany({
      where: {
        receiverId: (req.params.userId as string),
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, pendingRequests });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/connections/status ─────────────────────────────────────────────
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, targetId } = req.query;
    if (!userId || !targetId) { res.status(400).json({ message: 'Missing ids' }); return; }

    const uId = userId as string;
    const tId = targetId as string;

    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: uId, receiverId: tId },
          { requesterId: tId, receiverId: uId },
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!connection) {
      res.json({ success: true, status: 'none', connectionId: null });
      return;
    }

    res.json({
      success: true,
      status: connection.status,
      connectionId: connection.id,
      direction: connection.requesterId === uId ? 'sent' : 'received',
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
