import { Link } from "react-router";

interface ConnectionRequestCardProps {
  request: any;
  onAccept: (connectionId: string) => void;
  onReject: (connectionId: string) => void;
  isSent?: boolean;
  onWithdraw?: (connectionId: string) => void;
}

export default function ConnectionRequestCard({ request, onAccept, onReject, isSent, onWithdraw }: ConnectionRequestCardProps) {
  return (
    <div className="glass-card" style={{ padding: 16, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link to={`/profile/${isSent ? request.receiverId : request.requesterId}`} style={{ textDecoration: "none" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 18, overflow: "hidden", border: "2px solid #FFFFFF" }}>
            {(isSent ? request.receiverAvatar : request.requesterAvatar) ? <img src={isSent ? request.receiverAvatar : request.requesterAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (isSent ? request.receiverName : request.requesterName)[0]?.toUpperCase()}
          </div>
        </Link>
        <div>
          <Link to={`/profile/${isSent ? request.receiverId : request.requesterId}`} style={{ textDecoration: "none", color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>
            {isSent ? request.receiverName : request.requesterName}
          </Link>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{new Date(request.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 8 }}>
        {isSent ? (
          <button className="btn btn-outline btn-sm" style={{ color: "var(--error)", borderColor: "var(--error)" }} onClick={() => onWithdraw && onWithdraw(request._id)}>Withdraw</button>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => onAccept(request._id)}>Accept</button>
            <button className="btn btn-outline btn-sm" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }} onClick={() => onReject(request._id)}>Ignore</button>
          </>
        )}
      </div>
    </div>
  );
}
