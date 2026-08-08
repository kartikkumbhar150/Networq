import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

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
      const event = await prisma.event.findUnique({ where: { id: attachedEventId } });
      if (!event) {
        res.status(404).json({ message: 'Attached event not found.' });
        return;
      }
    }

    const author = await prisma.user.findUnique({ where: { id: authorId } });
    if (!author) { res.status(404).json({ message: 'Author not found.' }); return; }

    const post = await prisma.post.create({
      data: {
        authorId,
        authorName: author.name,
        authorAvatar: (author.profile as any)?.profilePhoto,
        content,
        type: type || 'text',
        attachedEventId,
      }
    });

    res.json({ success: true, postId: post.id, post });
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

    let posts: any[] = [];

    if (authorIdFilter) {
      posts = await prisma.post.findMany({
        where: { authorId: authorIdFilter },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });
    } else {
      const allowList: string[] = [currentUserId];
      const connections = await prisma.connection.findMany({
        where: {
          OR: [{ requesterId: currentUserId }, { receiverId: currentUserId }],
          status: 'accepted',
        }
      });
      const friendIds = connections.map(c => c.requesterId === currentUserId ? c.receiverId : c.requesterId);
      allowList.push(...friendIds);

      posts = await prisma.post.findMany({
        where: { authorId: { in: allowList } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      if (posts.length < limit) {
        const existingIds = posts.map(p => p.id);
        const remaining = limit - posts.length;
        const publicPosts = await prisma.post.findMany({
          where: {
            id: { notIn: existingIds },
            authorId: { notIn: allowList }
          },
          orderBy: { createdAt: 'desc' },
          skip: skip > 0 ? Math.max(0, skip - posts.length) : 0,
          take: remaining
        });
        posts = [...posts, ...publicPosts];
      }
    }

    // Populate attached events
    const eventIds = posts.map(p => p.attachedEventId).filter(Boolean) as string[];
    let events: any[] = [];
    if (eventIds.length > 0) {
      events = await prisma.event.findMany({ where: { id: { in: eventIds } } });
    }

    const enrichedPosts = posts.map(p => {
      const ev = events.find(e => e.id === p.attachedEventId);
      return { ...p, attachedEventId: ev || p.attachedEventId };
    });

    res.json({ success: true, posts: enrichedPosts, currentPage: page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/feed/posts/:postId/like ───────────────────────────────────────
router.post('/posts/:postId/like', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.postId as string } });
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    const userId = req.userId!;
    const likes = (post.likes as any[]) || [];
    const idx = likes.findIndex(l => l.userId === userId);

    let liked = false;
    let likeCount = post.likeCount;
    
    if (idx === -1) {
      likes.push({ userId, likedAt: new Date() });
      likeCount += 1;
      liked = true;
    } else {
      likes.splice(idx, 1);
      likeCount = Math.max(0, likeCount - 1);
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { likes, likeCount }
    });

    res.json({ success: true, liked, likeCount });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── POST /api/feed/posts/:postId/comment ────────────────────────────────────
router.post('/posts/:postId/comment', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;
    if (!content) { res.status(400).json({ message: 'Content required.' }); return; }

    const post = await prisma.post.findUnique({ where: { id: req.params.postId as string } });
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    const author = await prisma.user.findUnique({ where: { id: req.userId! } });

    const newComment = {
      commentId: uuidv4(),
      authorId: req.userId!,
      authorName: author?.name || 'Unknown',
      content,
      createdAt: new Date(),
    };

    const comments = (post.comments as any[]) || [];
    comments.push(newComment);

    await prisma.post.update({
      where: { id: post.id },
      data: {
        comments,
        commentCount: post.commentCount + 1
      }
    });

    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ─── DELETE /api/feed/posts/:postId ──────────────────────────────────────────
router.delete('/posts/:postId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.postId as string } });
    if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }

    if (post.authorId !== req.userId) {
      res.status(403).json({ message: 'Forbidden: You did not write this post.' });
      return;
    }

    await prisma.post.delete({ where: { id: post.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;
