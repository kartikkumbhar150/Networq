import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';

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

    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 });

    const mapped = conversations.map(c => {
      const otherUserId = c.participants.find(p => p !== userId) || userId;
      const unread = c.unreadCount?.get(userId) || 0;
      return {
        conversationId: c.conversationId,
        otherUser: {
          userId: otherUserId,
          name: c.participantNames?.get(otherUserId) || 'Unknown User'
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

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('attachedEventId'); // pull mini event structures

    // Reverse them to chronological order for client
    const chronological = messages.reverse();

    // Mark unread messages as read
    await Message.updateMany(
      { conversationId, receiverId: req.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // Reset unread count
    const conv = await Conversation.findOne({ conversationId });
    if (conv && conv.unreadCount) {
      conv.unreadCount.set(req.userId!, 0);
      await conv.save();
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

    let conv = await Conversation.findOne({ conversationId });
    if (!conv) {
      const pNames = new Map();
      pNames.set(senderId, senderName);
      pNames.set(receiverId, receiverName);
      
      const unreadCount = new Map();
      unreadCount.set(senderId, 0);
      unreadCount.set(receiverId, 0);

      conv = new Conversation({
        conversationId,
        participants: [senderId, receiverId],
        participantNames: pNames,
        unreadCount,
        lastMessage: {},
        lastMessageAt: new Date()
      });
      await conv.save();
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

    const msg = new Message({
      conversationId,
      senderId,
      senderName,
      receiverId,
      content,
      type: type || 'text',
      attachedEventId: attachedEventId || null,
      read: false
    });
    await msg.save();
    const populatedObj = await msg.populate('attachedEventId');

    const conv = await Conversation.findOne({ conversationId });
    if (conv) {
      conv.lastMessage = {
        content: content.slice(0, 100),
        senderId,
        createdAt: msg.createdAt
      };
      conv.lastMessageAt = msg.createdAt;
      
      if (!conv.unreadCount) conv.unreadCount = new Map();
      const currentUnread = conv.unreadCount.get(receiverId) || 0;
      conv.unreadCount.set(receiverId, currentUnread + 1);
      conv.unreadCount.set(senderId, 0);
      
      await conv.save();
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

    await Message.updateMany(
      { conversationId, receiverId: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    const conv = await Conversation.findOne({ conversationId });
    if (conv && conv.unreadCount) {
      conv.unreadCount.set(userId, 0);
      await conv.save();
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

    const conversations = await Conversation.find({ participants: userId });
    let totalUnread = 0;
    
    conversations.forEach(c => {
      totalUnread += c.unreadCount?.get(userId) || 0;
    });

    res.json({ success: true, totalUnread });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
