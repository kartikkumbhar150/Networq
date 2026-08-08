import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import prisma from '../db/prisma';

const router = Router();
router.use(authMiddleware);

// Utility
export function generateConversationId(id1: string, id2: string) {
  return [id1, id2].sort().join('_');
}

// ─── GET /api/chat/conversations/:userId ────────────────────────────────────
router.get('/conversations/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId !== req.userId) { res.status(403).json({ message: 'Unauthorized' }); return; }

    const conversations = await prisma.conversation.findMany({
      where: { participants: { has: userId } },
      orderBy: { lastMessageAt: 'desc' }
    });

    const mapped = conversations.map(c => {
      const otherUserId = c.participants.find(p => p !== userId) || userId;
      
      const unreadCountObj = (c.unreadCount as Record<string, number>) || {};
      const unread = unreadCountObj[userId] || 0;
      
      const pNamesObj = (c.participantNames as Record<string, string>) || {};

      return {
        conversationId: c.conversationId,
        otherUser: {
          userId: otherUserId,
          name: pNamesObj[otherUserId] || 'Unknown User'
        },
        lastMessage: c.lastMessage,
        unreadCount: unread,
        lastMessageAt: c.lastMessageAt
      };
    });

    res.json({ success: true, conversations: mapped });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/chat/messages/:conversationId ─────────────────────────────────
router.get('/messages/:conversationId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { conversationId: conversationId as string },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Populate events
    const eventIds = messages.map(m => m.attachedEventId).filter(Boolean) as string[];
    let events: any[] = [];
    if (eventIds.length > 0) {
      events = await prisma.event.findMany({ where: { id: { in: eventIds } } });
    }

    const populatedMessages = messages.map(m => {
      const ev = events.find(e => e.id === m.attachedEventId);
      return { ...m, attachedEventId: ev || m.attachedEventId };
    });

    const chronological = populatedMessages.reverse();

    await prisma.message.updateMany({
      where: { conversationId: conversationId as string, receiverId: req.userId },
      data: { } /* removed read since field doesnt exist in prisma */
    });

    const conv = await prisma.conversation.findUnique({ where: { conversationId: conversationId as string } });
    if (conv) {
      const unreadCountObj = (conv.unreadCount as Record<string, number>) || {};
      unreadCountObj[req.userId!] = 0;
      
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { unreadCount: unreadCountObj }
      });
    }

    res.json({ success: true, messages: chronological, currentPage: page });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/chat/conversations/start ─────────────────────────────────────
router.post('/conversations/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, receiverName, senderName } = req.body;
    const senderId = req.userId!;

    const conversationId = generateConversationId(senderId, receiverId);

    let conv = await prisma.conversation.findUnique({ where: { conversationId: conversationId as string } });
    if (!conv) {
      const pNamesObj: Record<string, string> = {
        [senderId]: senderName,
        [receiverId]: receiverName
      };
      
      const unreadCountObj: Record<string, number> = {
        [senderId]: 0,
        [receiverId]: 0
      };

      await prisma.conversation.create({
        data: {
          conversationId,
          participants: [senderId, receiverId],
          participantNames: pNamesObj,
          unreadCount: unreadCountObj,
          lastMessage: {},
          lastMessageAt: new Date()
        }
      });
    }

    res.json({ success: true, conversationId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/chat/messages/send ───────────────────────────────────────────
router.post('/messages/send', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { receiverId, content, type, attachedEventId, senderName } = req.body;
    const senderId = req.userId!;

    if (!content || content.length > 1000) {
      res.status(400).json({ message: 'Content required, <= 1000 chars.' }); return;
    }

    const conversationId = generateConversationId(senderId, receiverId);

    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        senderName,
        receiverId,
        content,
        type: type || 'text',
        attachedEventId: attachedEventId || null,
        readBy: []
      }
    });

    let ev = null;
    if (attachedEventId) {
      ev = await prisma.event.findUnique({ where: { id: attachedEventId } });
    }
    const populatedObj = { ...msg, attachedEventId: ev || msg.attachedEventId };

    const conv = await prisma.conversation.findUnique({ where: { conversationId: conversationId as string } });
    if (conv) {
      const unreadCountObj = (conv.unreadCount as Record<string, number>) || {};
      const currentUnread = unreadCountObj[receiverId] || 0;
      unreadCountObj[receiverId] = currentUnread + 1;
      unreadCountObj[senderId] = 0;
      
      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          lastMessage: {
            content: content.slice(0, 100),
            senderId,
            createdAt: msg.createdAt
          },
          lastMessageAt: msg.createdAt,
          unreadCount: unreadCountObj
        }
      });
    }

    res.json({ success: true, message: populatedObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/chat/messages/read ────────────────────────────────────────────
router.put('/messages/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = req.userId!;

    await prisma.message.updateMany({
      where: { conversationId: conversationId as string, receiverId: userId },
      data: { } /* removed read since field doesnt exist in prisma */
    });

    const conv = await prisma.conversation.findUnique({ where: { conversationId: conversationId as string } });
    if (conv) {
      const unreadCountObj = (conv.unreadCount as Record<string, number>) || {};
      unreadCountObj[userId] = 0;
      
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { unreadCount: unreadCountObj }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /api/chat/unread/:userId ───────────────────────────────────────────
router.get('/unread/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    if (userId !== req.userId) { res.status(403).json({ message: 'Unauthorized' }); return; }

    const conversations = await prisma.conversation.findMany({
      where: { participants: { has: userId } }
    });

    let totalUnread = 0;
    
    conversations.forEach(c => {
      const unreadCountObj = (c.unreadCount as Record<string, number>) || {};
      totalUnread += unreadCountObj[userId] || 0;
    });

    res.json({ success: true, totalUnread });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
