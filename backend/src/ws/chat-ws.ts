import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Basic typing
interface ChatMessageData {
  type: string;
  userId?: string;
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  content?: string;
}

export const rooms = new Map<string, Set<WebSocket>>();
export const userSockets = new Map<string, WebSocket>();

export function initChatWebSockets(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    
    // Check if path is for chat
    if (req.url && !req.url.startsWith('/api/chat/ws')) {
       return; // Handle elsewhere if needed
    }

    let currentUserId: string | null = null;
    let currentConversationId: string | null = null;

    ws.on('message', (data: Buffer | string) => {
      try {
        const payload: ChatMessageData = JSON.parse(data.toString());

        if (payload.type === 'join') {
          if (!payload.userId || !payload.conversationId) return;
          currentUserId = payload.userId;
          currentConversationId = payload.conversationId;

          // Add to local map for direct addressing
          userSockets.set(currentUserId, ws);

          // Add to conversation room map for broadcasting
          if (!rooms.has(currentConversationId)) {
            rooms.set(currentConversationId, new Set());
          }
          rooms.get(currentConversationId)!.add(ws);

          ws.send(JSON.stringify({ type: 'joined', conversationId: currentConversationId }));
        }

        if (payload.type === 'message') {
          // Payload: senderId, senderName, receiverId, conversationId, content
          // In an ideal system, we would insert to DB here if we weren't doing it via REST endpoint directly before emitting.
          // Since the spec calls for REST endpoint to handle the DB insertion, this `message` event purely behaves as a broadvaster.

          // Broadcast to room
          const pConv = payload.conversationId!;
          if (rooms.has(pConv)) {
            const msgObj = {
              type: 'new_message',
              message: {
                senderId: payload.senderId,
                senderName: payload.senderName,
                content: payload.content,
                createdAt: new Date().toISOString()
              }
            };
            rooms.get(pConv)!.forEach(client => {
               if (client.readyState === WebSocket.OPEN) {
                 client.send(JSON.stringify(msgObj));
               }
            });
          }

          // Direct map notification if the receiver is online but in a different room
          if (payload.receiverId && userSockets.has(payload.receiverId)) {
            const receiverSocket = userSockets.get(payload.receiverId)!;
            // Only send toast if they aren't looking at this exact room currently
            // We can determine this by checking if the receiver is in the room's set
            let isInRoom = false;
            if (rooms.has(pConv)) {
               isInRoom = rooms.get(pConv)!.has(receiverSocket);
            }
            
            if (!isInRoom && receiverSocket.readyState === WebSocket.OPEN) {
              receiverSocket.send(JSON.stringify({
                type: 'notification',
                conversationId: pConv,
                senderId: payload.senderId,
                senderName: payload.senderName,
                preview: payload.content ? payload.content.slice(0, 50) : ''
              }));
            }
          }
        }

        if (payload.type === 'typing' || payload.type === 'stop_typing') {
          const pConv = payload.conversationId!;
          if (rooms.has(pConv)) {
             rooms.get(pConv)!.forEach(client => {
                // don't echo to sender
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                   client.send(JSON.stringify({ type: payload.type, userId: payload.userId }));
                }
             });
          }
        }

      } catch (err) {
        console.error('WS parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUserId) {
        userSockets.delete(currentUserId);
      }
      if (currentConversationId && rooms.has(currentConversationId)) {
        rooms.get(currentConversationId)!.delete(ws);
        if (rooms.get(currentConversationId)!.size === 0) {
          rooms.delete(currentConversationId);
        }
      }
    });

  });
}
