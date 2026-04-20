import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Connection from '../models/Connection';
import Post from '../models/Post';

const router = Router();

router.use(authMiddleware);

// ─── GET /api/users/search ───────────────────────────────────────────────────
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const currentUserId = req.userId!;

    const searchCriteria: any = { _id: { $ne: currentUserId } };

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
    }

    const users = await User.find(searchCriteria).limit(20).select('name email accountType profile');

    // Fetch all relevant connections in ONE query to avoid N+1 problem
    const userIds = users.map(u => u._id.toString());
    const connections = await Connection.find({
      $or: [
        { requesterId: currentUserId, receiverId: { $in: userIds } },
        { requesterId: { $in: userIds }, receiverId: currentUserId },
      ],
    });

    const connectionMap = new Map();
    for (const c of connections) {
      const otherId = c.requesterId === currentUserId ? c.receiverId : c.requesterId;
      connectionMap.set(otherId, c);
    }

    const mappedUsers = users.map((u) => {
      const connection = connectionMap.get(u._id.toString());

      // Determine connection status explicitly from currentUserId's perspective
      let connectionStatus = 'none';
      let connectionDirection = 'none';
      if (connection) {
         connectionStatus = connection.status;
         connectionDirection = connection.requesterId === currentUserId ? 'sent' : 'received';
      }

      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        role: u.accountType,
        avatar: u.profile?.profilePhoto,
        connectionStatus,
        connectionDirection,
        connectionId: connection?._id || null,
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
    const user = await User.findById(req.params.userId).select('-passwordHash -facePointId');
    if (!user) { res.status(404).json({ message: 'User not found.' }); return; }

    const postCount = await Post.countDocuments({ authorId: req.params.userId });
    const connectionCount = await Connection.countDocuments({
      $or: [{ requesterId: req.params.userId }, { receiverId: req.params.userId }],
      status: 'accepted',
    });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        postCount,
        connectionCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
