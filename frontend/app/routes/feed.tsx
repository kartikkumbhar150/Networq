import { useEffect, useState } from "react";
import { Link } from "react-router";
import PostCard from "../components/PostCard";
import { Copy, Users, Trophy, Ticket, Briefcase, Camera, Video, Calendar, FileText, MessageSquare } from "lucide-react";

export function meta() {
  return [
    { title: "Feed – HireX" },
    { name: "description", content: "Your professional network feed." },
  ];
}

const API = "http://13.206.69.62:5000";

export default function Feed() {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [postContent, setPostContent] = useState("");
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function initUser() {
      let u = JSON.parse(localStorage.getItem("user") || "{}");
      
      // If no valid user in localStorage, immediately attempt to fetch via cookie
      if (!u.id) {
        try {
          const res = await fetch(`${API}/api/auth/me`);
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
      fetchUserStats(u.id);
      fetchPosts();
      fetchSuggestions();
      fetchPendingRequests(u.id);
    }

    initUser();
  }, []);

  async function fetchUserStats(userId: string) {
    try {
      const res = await fetch(`${API}/api/users/${userId}/profile`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setProfileData(data.user);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPosts(page = 1) {
    try {
      const res = await fetch(`${API}/api/feed/posts?userId=current&page=${page}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(page === 1 ? data.posts : [...posts, ...data.posts]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchSuggestions() {
    try {
      const res = await fetch(`${API}/api/users/search`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuggestedPeople(data.users.filter((u: any) => u.connectionStatus === 'none').slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPendingRequests(userId: string) {
    try {
      const res = await fetch(`${API}/api/connections/${userId}/pending`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setPendingRequests(data.pendingRequests.slice(0, 3));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPosting(true);

    try {
      const res = await fetch(`${API}/api/feed/posts/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ content: postContent })
      });
      const data = await res.json();
      if (data.success) {
        setPostContent("");
        setPosts([data.post, ...posts]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  }

  async function handleLike(postId: string) {
    try {
      const res = await fetch(`${API}/api/feed/posts/${postId}/like`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => p._id === postId ? { 
          ...p, 
          likeCount: data.likeCount,
          likes: data.liked 
            ? [...p.likes, { userId: user.id }] 
            : p.likes.filter((l: any) => l.userId !== user.id)
        } : p));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleComment(postId: string, content: string) {
    try {
      const res = await fetch(`${API}/api/feed/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => p._id === postId ? {
          ...p,
          commentCount: p.commentCount + 1,
          comments: [...p.comments, data.comment]
        } : p));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`${API}/api/feed/posts/${postId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.filter(p => p._id !== postId));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleConnect(targetId: string, targetName: string) {
    try {
      const res = await fetch(`${API}/api/connections/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ receiverId: targetId, receiverName: targetName })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestedPeople(suggestedPeople.filter(u => u.userId !== targetId));
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: "var(--border)", borderTopColor: "var(--accent-from)" }} />
    </div>
  );

  const userInitial = user.name?.[0]?.toUpperCase() || "?";
  const headline = profileData?.profile?.headline || user.accountType;

  // Profile completion score (Naukri-style)
  const completionScore = Math.min(100, Math.round(
    (profileData?.profile?.headline ? 20 : 0) +
    (profileData?.profile?.profilePhoto ? 20 : 0) +
    (profileData?.profile?.bio ? 20 : 0) +
    (profileData?.profile?.skills?.length > 0 ? 20 : 0) +
    (profileData?.profile?.experience?.length > 0 ? 20 : 0)
  ));

  // SVG progress ring for profile completion
  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = (completionScore / 100) * ringCircumference;

  return (
    <div className="feed-page-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 24, alignItems: "start" }}>
      


      {/* ─────────────────────── CENTER COLUMN ─────────────────────── */}
      <div>
        {/* Ultra-Minimalist Post Composer */}
        <div style={{
          background: "var(--bg-card)",
          borderRadius: "24px", // More rounded, modern feel
          position: "relative",
          boxShadow: postContent.length > 0 
            ? "0 12px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02)" 
            : "0 4px 16px rgba(0,0,0,0.03)",
          marginBottom: 24,
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
          border: "1px solid var(--border)"
        }}>
          {/* Subtle Brand Accent Line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: "linear-gradient(90deg, var(--accent-from), var(--accent-to))",
            opacity: postContent.length > 0 ? 1 : 0.3,
            transition: "opacity 0.4s ease"
          }} />

          <form onSubmit={handleCreatePost} style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", gap: 16 }}>
              {/* Clean Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: "var(--bg-base)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 600, fontSize: 16, color: "var(--text-secondary)",
                overflow: "hidden"
              }}>
                {profileData?.profile?.profilePhoto
                  ? <img src={profileData.profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : userInitial}
              </div>

              {/* Input Area */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <textarea 
                  placeholder="Share a thought, milestone, or idea..."
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  style={{
                    width: "100%", resize: "none", border: "none",
                    background: "transparent", outline: "none",
                    fontSize: 16, fontFamily: "'Inter', sans-serif",
                    color: "var(--text-primary)",
                    minHeight: 24, // starts small, perfectly aligned with avatar
                    paddingTop: 10,
                    lineHeight: 1.6,
                    transition: "min-height 0.3s ease"
                  }}
                  onFocus={e => e.currentTarget.style.minHeight = "100px"}
                  onBlur={e => { if (!postContent) e.currentTarget.style.minHeight = "24px"; }}
                />

                {/* Extensible Action Bar */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginTop: 16, paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                  transition: "all 0.3s ease"
                }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { icon: <Camera size={18} strokeWidth={1.75} />, label: "Media" },
                      { icon: <Video size={18} strokeWidth={1.75} />, label: "Video" },
                      { icon: <Calendar size={18} strokeWidth={1.75} />, label: "Event" },
                      { icon: <FileText size={18} strokeWidth={1.75} />, label: "Article" },
                    ].map(item => (
                      <button
                        key={item.label} type="button" title={item.label}
                        style={{
                          width: 38, height: 38, borderRadius: "50%",
                          background: "var(--bg-base)", border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--text-secondary)", cursor: "pointer",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--accent-from)";
                          e.currentTarget.style.background = "rgba(242,101,34,0.08)";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--text-secondary)";
                          e.currentTarget.style.background = "var(--bg-base)";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!postContent.trim() || posting}
                    style={{
                      background: "var(--accent-from)",
                      color: "#fff",
                      border: "none", borderRadius: "24px",
                      padding: "8px 24px",
                      fontSize: 14, fontWeight: 600, letterSpacing: 0.3,
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                      fontFamily: "'Inter', sans-serif",
                      opacity: postContent.trim() ? 1 : 0,
                      transform: postContent.trim() ? "translateY(0)" : "translateY(10px)",
                      pointerEvents: postContent.trim() ? "auto" : "none",
                      boxShadow: "0 4px 14px rgba(242,101,34,0.3)"
                    }}
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Separator Line */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20
        }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
            {posts.length > 0 ? `${posts.length} post${posts.length !== 1 ? "s" : ""}` : "No posts yet"}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Post Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.length === 0 ? (
            <div style={{
              background: "var(--bg-card)", borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)", padding: "60px 40px", textAlign: "center"
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16, color: "var(--text-muted)" }}><MessageSquare size={48} /></div>
              <h3 className="card-title" style={{ marginBottom: 8 }}>
                Start a conversation
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 360, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
                Share your thoughts, insights, or updates with your professional network.
              </p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                currentUserId={user.id} 
                onLike={handleLike} 
                onComment={handleComment}
                onDelete={handleDeletePost} 
              />
            ))
          )}
        </div>

      </div>

      {/* ─────────────────────── RIGHT COLUMN ─────────────────────── */}
      <div className="feed-right-col" style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{
              padding: "20px 20px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start"
            }}>
              <div>
                <span className="section-label-pill" style={{ marginBottom: 4 }}>INVITES</span>
                <h4 className="card-title" style={{ margin: 0 }}>
                  Invitations
                </h4>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px",
                borderRadius: "var(--radius-full)", background: "rgba(242,101,34,0.08)",
                color: "var(--accent-from)"
              }}>
                {pendingRequests.length}
              </span>
            </div>
            <div style={{ padding: "8px 12px" }}>
              {pendingRequests.map(req => (
                <div key={req._id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 8px",
                  borderRadius: "var(--radius-sm)", transition: "background 0.2s"
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "linear-gradient(135deg, #FDBA74, #FDE9D0)",
                    color: "var(--accent-from)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0
                  }}>
                    {req.requesterName?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/profile/${req.requesterId}`} style={{
                      textDecoration: "none", color: "var(--text-primary)",
                      fontWeight: 600, fontSize: 13, display: "block",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {req.requesterName}
                    </Link>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>wants to connect</span>
                  </div>
                  <Link to="/network" style={{
                    fontSize: 12, fontWeight: 600, color: "var(--accent-from)",
                    textDecoration: "none", padding: "4px 10px",
                    borderRadius: "var(--radius-full)", border: "1px solid var(--border-accent)",
                    transition: "all 0.2s"
                  }}>
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* People You May Know */}
        {suggestedPeople.length > 0 && (
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{
              padding: "20px 20px 16px", borderBottom: "1px solid var(--border)"
            }}>
              <span className="section-label-pill" style={{ marginBottom: 4 }}>NETWORK</span>
              <h4 className="card-title" style={{ margin: 0 }}>
                People you may know
              </h4>
            </div>
            <div style={{ padding: "8px 12px" }}>
              {suggestedPeople.map((u: any) => (
                <div key={u.userId} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 8px", borderRadius: "var(--radius-sm)", transition: "background 0.2s"
                }}>
                  <Link to={`/profile/${u.userId}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      background: "linear-gradient(135deg, #FEF3E2, #FDE9D0)",
                      color: "var(--accent-from)", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: 17, overflow: "hidden"
                    }}>
                      {u.avatar
                        ? <img src={u.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : u.name[0]?.toUpperCase()}
                    </div>
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/profile/${u.userId}`} style={{
                      textDecoration: "none", color: "var(--text-primary)",
                      fontWeight: 600, fontSize: 13, display: "block",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {u.name}
                    </Link>
                    <p style={{
                      fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0",
                      textTransform: "capitalize",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {u.role}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleConnect(u.userId, u.name)}
                    style={{
                      background: "none", border: "1px solid var(--border-accent)",
                      color: "var(--accent-from)", padding: "5px 14px",
                      borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "var(--accent-light)";
                      e.currentTarget.style.borderColor = "var(--accent-from)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "none";
                      e.currentTarget.style.borderColor = "var(--border-accent)";
                    }}
                  >
                    + Connect
                  </button>
                </div>
              ))}
            </div>
            <Link to="/network" style={{
              display: "block", textAlign: "center", padding: "14px 20px",
              borderTop: "1px solid var(--border)", color: "var(--text-secondary)",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
              transition: "all 0.2s"
            }}>
              View all recommendations →
            </Link>
          </div>
        )}
        {/* Footer links */}
        <div style={{ padding: "4px 6px", fontSize: 10.5, color: "var(--text-muted)", lineHeight: 2 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 10px", marginBottom: 4 }}>
            {["About", "Help", "Privacy", "Terms", "Accessibility"].map(link => (
              <span key={link} style={{ cursor: "pointer", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLSpanElement).style.color = "var(--accent-from)"}
                onMouseLeave={e => (e.currentTarget as HTMLSpanElement).style.color = "var(--text-muted)"}
              >{link}</span>
            ))}
          </div>
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>HireX</span>
          {" "}© {new Date().getFullYear()}
        </div>

      </div>
    </div>
  );
}
