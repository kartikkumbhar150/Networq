import { Link, useNavigate } from "react-router";

const API = "http://13.206.69.62:5000";

interface UserCardProps {
  user: any;
  currentUserId: string;
  onConnect: (targetId: string, targetName: string) => void;
  onWithdraw: (targetId: string, connectionId: string) => void;
  onAccept: (connectionId: string) => void;
  onReject: (connectionId: string) => void;
}

export default function UserCard({ user, currentUserId, onConnect, onWithdraw, onAccept, onReject }: UserCardProps) {
  const isMe = user.userId === currentUserId;
  const navigate = useNavigate();

  async function handleMessage() {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API}/api/chat/conversations/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ receiverId: user.userId, receiverName: user.name, senderName: u.name })
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/chat?conversationId=${data.conversationId}`);
      }
    } catch (e) {}
  }

  let buttonUI;
  
  if (isMe) {
    buttonUI = <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>It's You</span>;
  } else if (user.connectionStatus === 'accepted') {
    buttonUI = <span style={{ fontSize: 12, padding: "6px 14px", borderRadius: 99, background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", fontWeight: 600, border: "1px solid rgba(34, 197, 94, 0.2)" }}>✓ Connected</span>;
  } else if (user.connectionStatus === 'pending') {
    if (user.connectionDirection === 'sent') {
      buttonUI = (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.6 }}>Pending</button>
          <button className="btn btn-outline btn-sm" style={{ color: "var(--error)", borderColor: "var(--error)" }} onClick={() => onWithdraw(user.userId, user.connectionId)}>Withdraw</button>
        </div>
      );
    } else {
      // Received
      buttonUI = (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => onAccept(user.connectionId)}>Accept</button>
          <button className="btn btn-outline btn-sm" style={{ color: "var(--error)", borderColor: "var(--error)" }} onClick={() => onReject(user.connectionId)}>Reject</button>
        </div>
      );
    }
  } else {
    // none, rejected, withdrawn
    buttonUI = <button className="btn btn-outline btn-sm" onClick={() => onConnect(user.userId, user.name)}>Connect</button>;
  }

  return (
    <div className="glass-card" style={{ padding: 20, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Link to={`/profile/${user.userId}`} style={{ textDecoration: "none" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 24, overflow: "hidden", border: "2px solid #FFFFFF", boxShadow: "0 2px 8px rgba(242, 101, 34, 0.12)", marginBottom: 12 }}>
          {user.avatar ? <img src={user.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.name[0]?.toUpperCase()}
        </div>
      </Link>
      
      <Link to={`/profile/${user.userId}`} style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
        {user.name}
      </Link>
      
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 8, textTransform: "capitalize" }}>{user.role || 'User'}</p>
      
      <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {!isMe && (
          <button className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={handleMessage}>Message</button>
        )}
        {buttonUI}
      </div>
    </div>
  );
}
