import { format } from "date-fns";

interface ConversationListItemProps {
  conversation: any;
  isActive: boolean;
  onClick: () => void;
}

export default function ConversationListItem({ conversation, isActive, onClick }: ConversationListItemProps) {
  const { otherUser, lastMessage, unreadCount, lastMessageAt } = conversation;
  
  let timeStr = "";
  if (lastMessageAt) {
    const d = new Date(lastMessageAt);
    const now = new Date();
    timeStr = (d.toDateString() === now.toDateString()) ? format(d, 'HH:mm') : format(d, 'MMM d');
  }

  return (
    <div 
      onClick={onClick}
      style={{
        display: "flex", gap: 12, padding: "14px 20px", cursor: "pointer",
        background: isActive
          ? "linear-gradient(90deg, rgba(242,101,34,0.06) 0%, rgba(242,101,34,0.02) 100%)"
          : "transparent",
        borderLeft: isActive ? "3px solid var(--accent-from)" : "3px solid transparent",
        transition: "all 0.2s ease",
        position: "relative"
      }}
      onMouseEnter={e => {
        if (!isActive) e.currentTarget.style.background = "rgba(242,101,34,0.03)";
      }}
      onMouseLeave={e => {
        if (!isActive) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 18, fontFamily: "'Outfit', sans-serif",
          overflow: "hidden",
          boxShadow: isActive ? "0 2px 8px rgba(242,101,34,0.15)" : "0 1px 3px rgba(0,0,0,0.08)"
        }}>
          {otherUser.avatar
            ? <img src={otherUser.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : otherUser.name[0]?.toUpperCase()}
        </div>
        {/* Online dot */}
        {unreadCount > 0 && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 14, height: 14, borderRadius: "50%",
            background: "var(--accent-from)", border: "2px solid var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, color: "#fff", fontWeight: 800
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <h4 style={{
            margin: 0, fontSize: 14,
            fontWeight: unreadCount > 0 ? 700 : 500,
            color: "var(--text-primary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {otherUser.name}
          </h4>
          <span style={{
            fontSize: 11, flexShrink: 0, marginLeft: 8,
            color: unreadCount > 0 ? "var(--accent-from)" : "var(--text-muted)",
            fontWeight: unreadCount > 0 ? 600 : 400
          }}>
            {timeStr}
          </span>
        </div>
        
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.4,
          color: unreadCount > 0 ? "var(--text-primary)" : "var(--text-muted)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          fontWeight: unreadCount > 0 ? 500 : 400
        }}>
          {lastMessage?.content || "Started a conversation"}
        </p>
      </div>
    </div>
  );
}
