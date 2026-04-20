import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Globe, Calendar, MapPin, ThumbsUp, MessageSquare, Repeat, Send } from "lucide-react";

const API = "http://13.206.69.62:5000";

interface PostProps {
  post: any;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
}

export default function PostCard({ post, currentUserId, onLike, onComment, onDelete }: PostProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const isAuthor = post.authorId === currentUserId;
  const hasLiked = post.likes?.some((l: any) => l.userId === currentUserId);
  const navigate = useNavigate();

  async function handleMessage() {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await fetch(`${API}/api/chat/conversations/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ receiverId: post.authorId, receiverName: post.authorName, senderName: u.name })
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/chat?conversationId=${data.conversationId}`);
      }
    } catch (e) {}
  }

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(post._id, commentText);
    setCommentText("");
  }

  function getTimeSince(date: string) {
    const min = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isHovered ? "var(--border-accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: isHovered ? "0 4px 16px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.03)",
        transition: "all 0.25s ease",
        overflow: "hidden"
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to={`/profile/${post.authorId}`} style={{ textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 19, fontFamily: "'Outfit', sans-serif",
              overflow: "hidden", boxShadow: "0 2px 8px rgba(242,101,34,0.15)"
            }}>
              {post.authorAvatar
                ? <img src={post.authorAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : post.authorName[0]?.toUpperCase()}
            </div>
          </Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link to={`/profile/${post.authorId}`} style={{
                textDecoration: "none", color: "var(--text-primary)",
                fontWeight: 700, fontSize: 14, lineHeight: 1.3
              }}>
                {post.authorName}
              </Link>
              {!isAuthor && (
                <button
                  onClick={handleMessage}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--accent-from)", fontSize: 11, fontWeight: 600,
                    padding: "1px 6px", borderRadius: 4
                  }}
                >
                  · Message
                </button>
              )}
            </div>
            <p style={{
              color: "var(--text-muted)", fontSize: 12, marginTop: 2,
              display: "flex", alignItems: "center", gap: 4
            }}>
              {getTimeSince(post.createdAt)}
              <span style={{ fontSize: 3, display: "inline-block", width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)" }} />
              <span style={{ fontSize: 11, display: "flex" }}><Globe size={11} /></span>
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isAuthor && onDelete && (
            <button
              onClick={() => onDelete(post._id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 18, padding: "4px 8px",
                borderRadius: 4, transition: "all 0.2s", lineHeight: 1
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "var(--error)";
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.background = "none";
              }}
              title="Delete post"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div style={{ padding: "14px 20px 16px" }}>
        <p style={{
          color: "var(--text-primary)", fontSize: 14, lineHeight: 1.65,
          whiteSpace: "pre-wrap", wordBreak: "break-word"
        }}>
          {post.content}
        </p>
      </div>

      {/* ─── Attached Event Mini-Card ─── */}
      {post.type === "event_share" && post.attachedEventId && typeof post.attachedEventId !== 'string' && (
        <div style={{ margin: "0 20px 16px", padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, rgba(242,101,34,0.03), rgba(255,140,66,0.05))" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{post.attachedEventId.title}</h4>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-flex", alignItems: "center" }}><Calendar size={12} /></span> {new Date(post.attachedEventId.date).toLocaleDateString()} · <span style={{ display: "inline-flex", alignItems: "center" }}><MapPin size={12} /></span> {post.attachedEventId.location}
          </p>
          <Link to={`/events/${post.attachedEventId._id}`} style={{
            display: "inline-block", marginTop: 10, fontSize: 12, fontWeight: 600,
            color: "var(--accent-from)", textDecoration: "none"
          }}>
            View Event →
          </Link>
        </div>
      )}

      {/* ─── Engagement Stats ─── */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0 20px 10px", fontSize: 12, color: "var(--text-muted)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {post.likeCount > 0 && (
              <>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 18, height: 18, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
                }}><ThumbsUp size={10} /></span>
                <span>{post.likeCount}</span>
              </>
            )}
          </div>
          {post.commentCount > 0 && (
            <button
              onClick={() => setShowComments(!showComments)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 12
              }}
            >
              {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      {/* ─── Action Buttons ─── */}
      <div style={{ borderTop: "1px solid var(--border)", display: "flex", padding: "4px 8px" }}>
        {[
          {
            icon: <ThumbsUp size={16} />,
            label: hasLiked ? "Liked" : "Like",
            active: hasLiked,
            onClick: () => onLike(post._id)
          },
          {
            icon: <MessageSquare size={16} />,
            label: "Comment",
            active: false,
            onClick: () => setShowComments(!showComments)
          },
          {
            icon: <Repeat size={16} />,
            label: "Repost",
            active: false,
            onClick: () => {}
          },
          {
            icon: <Send size={16} />,
            label: "Send",
            active: false,
            onClick: handleMessage
          }
        ].map(action => (
          <button
            key={action.label}
            onClick={action.onClick}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "12px 8px", border: "none", background: "none",
              cursor: "pointer", borderRadius: "var(--radius-sm)",
              color: action.active ? "var(--accent-from)" : "var(--text-secondary)",
              fontSize: 13, fontWeight: action.active ? 700 : 600,
              transition: "all 0.15s", fontFamily: "'Inter', sans-serif"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--bg-base)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "none";
            }}
          >
            <span style={{ display: "flex", alignItems: "center" }}>{action.icon}</span>
            <span style={{ fontSize: 12 }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Comments Section ─── */}
      {showComments && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
          {/* Comment Input */}
          <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: 10, marginBottom: post.comments?.length > 0 ? 16 : 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 12
            }}>
              {JSON.parse(localStorage.getItem("user") || "{}").name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1, display: "flex", gap: 8 }}>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                value={commentText} 
                onChange={e => setCommentText(e.target.value)}
                style={{
                  flex: 1, padding: "8px 14px", fontSize: 13,
                  border: "1px solid var(--border)", borderRadius: "var(--radius-full)",
                  background: "var(--bg-base)", color: "var(--text-primary)",
                  fontFamily: "'Inter', sans-serif", outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--accent-from)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
              {commentText.trim() && (
                <button
                  type="submit"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))",
                    color: "#fff", border: "none", borderRadius: "var(--radius-full)",
                    padding: "8px 16px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    boxShadow: "0 2px 8px rgba(242,101,34,0.15)"
                  }}
                >
                  Post
                </button>
              )}
            </div>
          </form>

          {/* Comment List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {post.comments?.map((comment: any) => (
              <div key={comment.commentId} style={{ display: "flex", gap: 10 }}>
                <Link to={`/profile/${comment.authorId}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "linear-gradient(135deg, #FEF3E2, #FDE9D0)",
                    color: "var(--accent-from)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: 13
                  }}>
                    {comment.authorName[0]?.toUpperCase()}
                  </div>
                </Link>
                <div style={{
                  flex: 1, background: "var(--bg-base)", padding: "10px 14px",
                  borderRadius: "0 var(--radius-md) var(--radius-md) var(--radius-md)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Link to={`/profile/${comment.authorId}`} style={{
                      fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                      textDecoration: "none", lineHeight: 1
                    }}>
                      {comment.authorName}
                    </Link>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {getTimeSince(comment.createdAt)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5
                  }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
