import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Connection from '../models/Connection';
import User from '../models/User';

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

    const requester = await User.findById(requesterId);
    if (!requester) { res.status(404).json({ message: 'Requester not found' }); return; }

    const existing = await Connection.findOne({
      $or: [
        { requesterId, receiverId, status: { $in: ['pending', 'accepted'] } },
        { requesterId: receiverId, receiverId: requesterId, status: { $in: ['pending', 'accepted'] } },
      ],
    });

    if (existing) {
      res.status(400).json({ message: 'Connection already exists or is pending.' });
      return;
    }

    const connection = new Connection({
      requesterId,
      requesterName: requester.name,
      requesterAvatar: (requester as any).profile?.profilePhoto, // simplified extraction
      receiverId,
      receiverName,
      status: 'pending',
    });

    await connection.save();
    res.json({ success: true, connectionId: connection._id });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/connections/:connectionId/respond ─────────────────────────────
router.post('/:connectionId/respond', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action } = req.body; // accept or reject
    const connection = await Connection.findById(req.params.connectionId);
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.receiverId !== req.userId) {
      res.status(403).json({ message: 'Unauthorized.' });
      return;
    }

    if (action === 'accept') {
      connection.status = 'accepted';
    } else if (action === 'reject') {
      connection.status = 'rejected';
    } else {
      res.status(400).json({ message: 'Invalid action.' });
      return;
    }

    await connection.save();
    res.json({ success: true, status: connection.status });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/connections/:connectionId/withdraw ────────────────────────────
router.post('/:connectionId/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connection = await Connection.findById(req.params.connectionId);
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.requesterId !== req.userId || connection.status !== 'pending') {
      res.status(403).json({ message: 'Unauthorized or not pending.' });
      return;
    }

    connection.status = 'withdrawn';
    await connection.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── DELETE /api/connections/:connectionId ───────────────────────────────────
router.delete('/:connectionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const connection = await Connection.findById(req.params.connectionId);
    if (!connection) { res.status(404).json({ message: 'Connection not found' }); return; }

    if (connection.requesterId !== req.userId && connection.receiverId !== req.userId) {
      res.status(403).json({ message: 'Unauthorized.' });
      return;
    }

    await Connection.findByIdAndDelete(req.params.connectionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/connections/:userId/list ───────────────────────────────────────
router.get('/:userId/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const connections = await Connection.find({
      $or: [{ requesterId: userId }, { receiverId: userId }],
      status: 'accepted',
    });

    // Batch fetch all related users in ONE query instead of N individual queries
    const otherIds = connections.map(c =>
      c.requesterId === userId ? c.receiverId : c.requesterId
    );
    const users = await User.find({ _id: { $in: otherIds } }).select('name accountType profile');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const mapped = connections.map((c) => {
      const isRequester = c.requesterId === userId;
      const otherId = isRequester ? c.receiverId : c.requesterId;
      const otherUser = userMap.get(otherId);
      return {
        connectionId: c._id,
        userId: otherId,
        name: otherUser?.name || 'Unknown User',
        avatar: (otherUser as any)?.profile?.profilePhoto,
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
    const pendingRequests = await Connection.find({
      receiverId: req.params.userId,
      status: 'pending',
    }).sort({ createdAt: -1 });

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

    const connection = await Connection.findOne({
      $or: [
        { requesterId: uId, receiverId: tId },
        { requesterId: tId, receiverId: uId },
      ],
    }).sort({ createdAt: -1 });

    if (!connection) {
      res.json({ success: true, status: 'none', connectionId: null });
      return;
    }

    res.json({
      success: true,
      status: connection.status,
      connectionId: connection._id,
      direction: connection.requesterId === userId ? 'sent' : 'received',
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
