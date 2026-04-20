import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import ConversationListItem from "../components/ConversationListItem";
import ChatBubble from "../components/ChatBubble";
import TypingIndicator from "../components/TypingIndicator";
import { Edit, Search, MessageSquare, User, Paperclip, Image as ImageIcon, Smile, Send } from "lucide-react";

export function meta() {
  return [
    { title: "Messages – HireX" },
  ];
}

const API = "http://13.206.69.62:5000";
const WS_URL = "ws://localhost:5000/api/chat/ws";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const initId = searchParams.get("conversationId");

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initId);
  const [activeOtherUser, setActiveOtherUser] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initId ? 'chat' : 'list');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Read state bypass because we mark them all Read upon entering
  const [forceReadState, setForceReadState] = useState(false);

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  // Use a ref for activeOtherUser so handleSend always gets the latest value
  // without being a stale closure (avoids the guard failing silently)
  const activeOtherUserRef = useRef<any>(null);
  const activeConvIdRef = useRef<string | null>(initId);

  useEffect(() => {
    async function initUser() {
      let u = JSON.parse(localStorage.getItem("user") || "{}");
      if (!u.id) {
        try {
          const res = await fetch(`${API}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          const data = await res.json();
          if (data.user) {
            u = data.user;
            localStorage.setItem("user", JSON.stringify(u));
          } else {
            window.location.href = "/login";
            return;
          }
        } catch {
          window.location.href = "/login";
          return;
        }
      }
      setUser(u);
      fetchConversations(u.id);
    }
    initUser();
  }, []);

  useEffect(() => {
    if (activeConversationId && user) {
      activeConvIdRef.current = activeConversationId;
      fetchMessages(activeConversationId, 1);
      setForceReadState(true);

      // Update local unread visually
      setConversations(prev => prev.map(c => c.conversationId === activeConversationId ? { ...c, unreadCount: 0 } : c));

      // Notify backend to mark read
      fetch(`${API}/api/chat/messages/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ conversationId: activeConversationId })
      });

      // Find other user info — also update the ref so handleSend always has it
      const conv = conversations.find(c => c.conversationId === activeConversationId);
      if (conv) {
        setActiveOtherUser(conv.otherUser);
        activeOtherUserRef.current = conv.otherUser;
      }

      // Tell WebSocket to join this room (ref-safe, doesn't recreate WS)
      if (ws.current && ws.current.readyState === WebSocket.OPEN && user) {
        ws.current.send(JSON.stringify({ type: 'join', userId: user.id, conversationId: activeConversationId }));
      }
    }
  }, [activeConversationId, user, conversations.length]);

  // WebSocket Init & Lifecycle
  useEffect(() => {
    if (!user) return;
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: 'join', userId: user.id, conversationId: activeConversationId || 'global' }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_message') {
           setMessages(prev => [...prev, data.message]);
           fetchConversations(user.id);
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
           if (data.message.senderId !== user.id) {
              fetch(`${API}/api/chat/messages/read`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ conversationId: activeConversationId })
              });
           }
        }
        if (data.type === 'typing') setIsOtherTyping(true);
        if (data.type === 'stop_typing') setIsOtherTyping(false);
        if (data.type === 'notification') {
           fetchConversations(user.id);
        }
      } catch (err) {}
    };

    socket.onclose = () => setIsConnected(false);

    return () => {
      socket.close();
    };
  }, [user]); // ← only create WS once per user session, NOT on every conversation switch

  // When WS opens, join current room
  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && user && activeConversationId) {
       ws.current.send(JSON.stringify({ type: 'join', userId: user.id, conversationId: activeConversationId }));
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isOtherTyping]);

  async function fetchConversations(uId: string) {
    try {
      const res = await fetch(`${API}/api/chat/conversations/${uId}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }});
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        if (initId && !data.conversations.find((c: any) => c.conversationId === initId)) {
        } else if (!initId && data.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(data.conversations[0].conversationId);
        }
      }
    } catch (e) {}
  }

  async function fetchMessages(cId: string, pageNum: number) {
    try {
      const res = await fetch(`${API}/api/chat/messages/${cId}?page=${pageNum}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }});
      const data = await res.json();
      if (data.success) {
        setMessages(pageNum === 1 ? data.messages : [...data.messages, ...messages]);
      }
    } catch(e) {}
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!isTyping && ws.current && ws.current.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      ws.current.send(JSON.stringify({ type: 'typing', userId: user.id, conversationId: activeConversationId }));
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'stop_typing', userId: user.id, conversationId: activeConversationId }));
      }
    }, 2000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Use ref so we never get caught by a stale closure
    const otherUser = activeOtherUserRef.current;
    const convId = activeConvIdRef.current;
    if (!inputText.trim() || !convId || !otherUser) return;

    const content = inputText.trim();
    setInputText("");

    // Optimistically append the message immediately so the user sees it right away
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
       ws.current.send(JSON.stringify({ type: 'stop_typing', userId: user.id, conversationId: convId }));
    }

    try {
      const res = await fetch(`${API}/api/chat/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
           receiverId: otherUser.userId,
           senderName: user.name,
           content,
           type: 'text'
        })
      });
      const data = await res.json();

      if (data.success) {
        // Replace the temp optimistic message with the real one from DB
        setMessages(prev => prev.map(m => m._id === optimisticMsg._id ? data.message : m));

        // Broadcast via WS so the other user sees it in real-time
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
             type: 'message',
             senderId: user.id,
             senderName: user.name,
             receiverId: otherUser.userId,
             conversationId: convId,
             content
          }));
        }

        // Refresh conversation list so lastMessage updates
        fetchConversations(user.id);
      }
    } catch(err) {
      // On failure, remove the optimistic message
      setMessages(prev => prev.filter(m => m._id !== optimisticMsg._id));
    }
  };

  const filteredConversations = conversations.filter(c => c.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "var(--border)", borderTopColor: "var(--accent-from)" }} />
    </div>
  );

  return (
    <div className="chat-page-wrapper" style={{
      maxWidth: 1200, margin: "0 auto", padding: "16px 20px",
      height: "calc(100vh - 48px)", display: "flex", gap: 0,
      background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)", overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
    }}>
      
      {/* ─── LEFT PANEL: CONVERSATION LIST ─── */}
      <div className={`chat-list-panel${mobileView === 'chat' ? ' mobile-hidden' : ''}`} style={{
        width: 340, display: "flex", flexDirection: "column",
        borderRight: "1px solid var(--border)", flexShrink: 0
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{
                margin: 0, fontSize: 20, fontWeight: 800,
                fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)"
              }}>Messaging</h2>
              {totalUnread > 0 && (
                <span style={{
                  background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
                  color: "#fff", padding: "2px 8px", borderRadius: 99,
                  fontSize: 11, fontWeight: 700, lineHeight: "18px"
                }}>
                  {totalUnread}
                </span>
              )}
            </div>
            {/* Compose icon */}
            <button style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--bg-base)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: "var(--text-secondary)",
              transition: "all 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-from)"; e.currentTarget.style.color = "var(--accent-from)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              title="New message"
            >
              <Edit size={16} />
            </button>
          </div>
          
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", pointerEvents: "none", display: "flex", alignItems: "center"
            }}><Search size={14} /></span>
            <input 
              type="text" 
              placeholder="Search messages" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px 10px 36px", fontSize: 13,
                border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
                background: "var(--bg-base)", color: "var(--text-primary)",
                fontFamily: "'Inter', sans-serif", outline: "none",
                transition: "all 0.2s"
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--accent-from)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(242,101,34,0.06)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
        </div>
        
        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
           {filteredConversations.length === 0 ? (
             <div style={{ padding: "60px 24px", textAlign: "center" }}>
               <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "var(--text-muted)" }}><MessageSquare size={40} /></div>
               <p style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>
                 {searchQuery ? "No conversations match your search" : "No conversations yet"}
               </p>
               <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
                 Start a conversation from someone's profile
               </p>
             </div>
           ) : (
             filteredConversations.map(c => (
               <ConversationListItem 
                 key={c.conversationId} 
                 conversation={c} 
                 isActive={activeConversationId === c.conversationId}
                 onClick={() => {
                   setActiveConversationId(c.conversationId);
                   setMobileView('chat');
                 }}
               />
             ))
           )}
        </div>
      </div>

      {/* ─── RIGHT PANEL: CHAT WINDOW ─── */}
      <div className={`chat-window-panel${mobileView === 'list' ? ' mobile-hidden' : ''}`} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {!activeConversationId || !activeOtherUser ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", background: "var(--bg-base)"
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%",
              background: "linear-gradient(135deg, #FEF3E2, #FDE9D0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24
            }}>
              <span style={{ color: "var(--accent-from)", display: "flex" }}><MessageSquare size={40} /></span>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
              Your Messages
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
              Select a conversation from the left or start a new one from someone's profile.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              padding: "14px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--bg-card)", flexShrink: 0
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* Back button — mobile only */}
                <button
                  className="mobile-chat-back"
                  onClick={() => setMobileView('list')}
                  style={{ display: 'none', width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-base)', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  aria-label="Back to conversations"
                >
                  <span style={{ fontSize: 18, lineHeight: 1, color: 'var(--text-secondary)' }}>←</span>
                </button>
                <Link to={`/profile/${activeOtherUser.userId}`} style={{ textDecoration: "none", position: "relative" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 18, fontFamily: "'Outfit', sans-serif",
                    overflow: "hidden", boxShadow: "0 2px 8px rgba(242,101,34,0.15)"
                  }}>
                    {activeOtherUser.avatar
                      ? <img src={activeOtherUser.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : activeOtherUser.name?.[0]?.toUpperCase()}
                  </div>
                  {isConnected && (
                    <div style={{
                      position: "absolute", bottom: 1, right: 1,
                      width: 12, height: 12, background: "#22C55E",
                      borderRadius: "50%", border: "2px solid var(--bg-card)"
                    }} />
                  )}
                </Link>
                <div>
                  <Link to={`/profile/${activeOtherUser.userId}`} style={{
                    textDecoration: "none", color: "var(--text-primary)",
                    fontWeight: 700, fontSize: 15, display: "block"
                  }}>
                    {activeOtherUser.name}
                  </Link>
                  <span style={{
                    fontSize: 12,
                    color: isConnected ? "#22C55E" : "var(--text-muted)",
                    fontWeight: 500
                  }}>
                    {isOtherTyping ? "typing..." : isConnected ? "Active now" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                <Link to={`/profile/${activeOtherUser.userId}`} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--bg-base)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textDecoration: "none", fontSize: 14, color: "var(--text-secondary)",
                  transition: "all 0.2s"
                }}>
                  <User size={18} />
                </Link>
              </div>
            </div>

            {/* Chat Body */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 24px",
              background: "var(--bg-base)",
              display: "flex", flexDirection: "column"
            }}>
              {/* Date indicator for conversation start */}
              {messages.length > 0 && (
                <div style={{
                  textAlign: "center", marginBottom: 20
                }}>
                  <span style={{
                    fontSize: 11, color: "var(--text-muted)", fontWeight: 500,
                    background: "var(--bg-card)", padding: "4px 14px",
                    borderRadius: "var(--radius-full)", border: "1px solid var(--border)"
                  }}>
                    {new Date(messages[0]?.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}

               {messages.map((m, idx) => {
                 const isOwn = m.senderId === user.id;
                 const prev = messages[idx - 1];
                 const showSenderName = !isOwn && (!prev || prev.senderId !== m.senderId);
                 
                 return (
                   <ChatBubble 
                     key={m._id || idx} 
                     message={m} 
                     isOwn={isOwn} 
                     showSenderName={showSenderName} 
                     isReading={forceReadState}
                   />
                 );
               })}
               
               {isOtherTyping && (
                 <div style={{ alignSelf: "flex-start", marginBottom: 12 }}>
                   <TypingIndicator />
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{
              padding: "12px 24px 16px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-card)"
            }}>
              <form onSubmit={handleSend} style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                {/* Emoji / Attach buttons */}
                <div style={{ display: "flex", gap: 4, paddingBottom: 8 }}>
                  {[
                    { key: "attach", icon: <Paperclip size={16} /> },
                    { key: "image", icon: <ImageIcon size={16} /> },
                    { key: "smile", icon: <Smile size={16} /> }
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-secondary)",
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-base)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>

                {/* Input field */}
                <div style={{
                  flex: 1, position: "relative",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  transition: "border-color 0.2s"
                }}>
                  <textarea 
                    style={{
                      width: "100%", resize: "none",
                      minHeight: 42, maxHeight: 120,
                      padding: "11px 16px", fontSize: 14,
                      border: "none", background: "transparent",
                      color: "var(--text-primary)",
                      fontFamily: "'Inter', sans-serif",
                      outline: "none", lineHeight: 1.4
                    }}
                    placeholder="Write a message..."
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: inputText.trim()
                      ? "linear-gradient(135deg, var(--accent-from), var(--accent-to))"
                      : "var(--bg-base)",
                    border: inputText.trim() ? "none" : "1px solid var(--border)",
                    color: inputText.trim() ? "#fff" : "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: inputText.trim() ? "pointer" : "not-allowed",
                    fontSize: 18, transition: "all 0.25s", flexShrink: 0,
                    ...(inputText.trim() ? { boxShadow: "0 2px 10px rgba(242,101,34,0.25)" } : {})
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
              <p style={{
                margin: "6px 0 0 0", fontSize: 11, color: "var(--text-muted)",
                textAlign: "right", opacity: 0.7
              }}>
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
