import { format } from "date-fns";
import { Link } from "react-router";
import { MapPin, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  message: any;
  isOwn: boolean;
  showSenderName: boolean;
  isReading: boolean;
}

export default function ChatBubble({ message, isOwn, showSenderName, isReading }: ChatBubbleProps) {
  const timeStr = format(new Date(message.createdAt), 'HH:mm');

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isOwn ? "flex-end" : "flex-start",
      marginBottom: showSenderName ? 14 : 3,
      maxWidth: "100%"
    }}>
      {showSenderName && !isOwn && (
        <span style={{
          fontSize: 11, color: "var(--text-muted)",
          marginLeft: 14, marginBottom: 4, fontWeight: 600
        }}>
          {message.senderName}
        </span>
      )}
      
      <div 
        style={{
          maxWidth: "70%",
          padding: "10px 16px",
          background: isOwn
            ? "linear-gradient(135deg, var(--accent-from), var(--accent-to))"
            : "var(--bg-card)",
          color: isOwn ? "#fff" : "var(--text-primary)",
          borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          boxShadow: isOwn
            ? "0 2px 12px rgba(242,101,34,0.15)"
            : "0 1px 4px rgba(0,0,0,0.04)",
          border: isOwn ? "none" : "1px solid var(--border)",
          position: "relative"
        }}
      >
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.55,
          wordWrap: "break-word", whiteSpace: "pre-wrap"
        }}>
          {message.content}
        </p>

        {/* Attached Event Card Injection */}
        {message.type === "event_share" && message.attachedEventId && typeof message.attachedEventId !== 'string' && (
          <div style={{
            marginTop: 12, padding: 12, borderRadius: 10,
            background: isOwn ? "rgba(255,255,255,0.12)" : "var(--bg-base)",
            border: isOwn ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--border)"
          }}>
            <h4 style={{
              margin: 0, fontSize: 13, fontWeight: 700,
              color: isOwn ? "#fff" : "var(--text-primary)"
            }}>
              {message.attachedEventId.title}
            </h4>
            <p style={{
              margin: "4px 0 8px", fontSize: 11,
              color: isOwn ? "rgba(255,255,255,0.75)" : "var(--text-secondary)"
            }}>
              <MapPin size={11} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 2 }} /> {message.attachedEventId.location}
            </p>
            <Link
              to={`/events/${message.attachedEventId._id}`}
              style={{
                display: "inline-block", fontSize: 12, fontWeight: 600,
                color: isOwn ? "var(--accent-from)" : "#fff",
                background: isOwn ? "#fff" : "var(--accent-from)",
                padding: "4px 14px", borderRadius: "var(--radius-full)",
                textDecoration: "none", transition: "opacity 0.2s"
              }}
            >
              View Event →
            </Link>
          </div>
        )}
      </div>

      {/* Timestamp + Read receipt */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        marginTop: 3,
        marginRight: isOwn ? 6 : 0,
        marginLeft: isOwn ? 0 : 6
      }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{timeStr}</span>
        {isOwn && (
          <span style={{
            fontSize: 10,
            color: (isReading || message.read) ? "var(--accent-from)" : "var(--text-muted)",
            fontWeight: 600, letterSpacing: -1
          }}>
            <CheckCheck size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
