import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Post from '../models/Post';
import Connection from '../models/Connection';
import Event from '../models/Event';
import User from '../models/User';

const router = Router();

router.use(authMiddleware);

// ─── POST /api/feed/posts/create ─────────────────────────────────────────────
router.post('/posts/create', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, type, attachedEventId } = req.body;
    const authorId = req.userId!;

    if (!content || content.length > 2000) {
      res.status(400).json({ message: 'Content must be 1-2000 chars.' });
      return;
    }

    if (attachedEventId) {
      const event = await Event.findById(attachedEventId);
      if (!event) {
        res.status(404).json({ message: 'Attached event not found.' });
        return;
      }
    }

    const author = await User.findById(authorId);
    if (!author) { res.status(404).json({ message: 'Author not found.' }); return; }

    const post = new Post({
      authorId,
      authorName: author.name,
      authorAvatar: (author as any).profile?.profilePhoto,
      content,
      type: type || 'text',
      attachedEventId,
    });

    await post.save();
    res.json({ success: true, postId: post._id, post });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── GET /api/feed/posts ─────────────────────────────────────────────────────
router.get('/posts', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.query.userId === 'current' ? req.userId! : req.query.userId as string;
    const authorIdFilter = req.query.authorId as string;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    let posts;

    if (authorIdFilter) {
      // Direct user wall fetch
      posts = await Post.find({ authorId: authorIdFilter })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('attachedEventId');
    } else {
      // Build connection allow-list
      const allowList: string[] = [currentUserId];
      const connections = await Connection.find({
        $or: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
        status: 'accepted',
      });
      const friendIds = connections.map(c => c.requesterId === currentUserId ? c.receiverId : c.requesterId);
      allowList.push(...friendIds);

      // Fetch connection posts first
      posts = await Post.find({ authorId: { $in: allowList } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('attachedEventId');

      // If not enough posts from connections, fill with public/global posts
      if (posts.length < limit) {
        const existingIds = posts.map(p => p._id);
        const remaining = limit - posts.length;
        const publicPosts = await Post.find({
          _id: { $nin: existingIds },
          authorId: { $nin: allowList }
        })
          .sort({ createdAt: -1 })
          .skip(skip > 0 ? Math.max(0, skip - posts.length) : 0)
          .limit(remaining)
          .populate('attachedEventId');
        posts = [...posts, ...publicPosts];
      }
    }

    res.json({ success: true, posts, currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/feed/posts/:postId/like ───────────────────────────────────────
router.post('/posts/:postId/like', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    const userId = req.userId!;
    const idx = post.likes.findIndex(l => l.userId === userId);

    let liked = false;
    if (idx === -1) {
      post.likes.push({ userId, likedAt: new Date() });
      post.likeCount += 1;
      liked = true;
    } else {
      post.likes.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    }

    await post.save();
    res.json({ success: true, liked, likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/feed/posts/:postId/comment ────────────────────────────────────
router.post('/posts/:postId/comment', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content) { res.status(400).json({ message: 'Content required.' }); return; }

    const post = await Post.findById(req.params.postId);
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    const author = await User.findById(req.userId);

    const newComment = {
      commentId: uuidv4(),
      authorId: req.userId!,
      authorName: author?.name || 'Unknown',
      content,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    post.commentCount += 1;
    await post.save();

    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── DELETE /api/feed/posts/:postId ──────────────────────────────────────────
router.delete('/posts/:postId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    if (post.authorId !== req.userId) {
      res.status(403).json({ message: 'Forbidden: You did not write this post.' });
      return;
    }

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
