import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import PostCard from "../components/PostCard";
import {
  User, Briefcase, GraduationCap, Zap, Award, Rocket, FileText, Medal,
  Globe, HeartHandshake, BookOpen, MapPin, ExternalLink, Camera, MessageSquare, CheckCircle2
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null); // current logged in user
  const [targetUser, setTargetUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>("none");
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (u.id) {
      setUser(u);
      fetchTargetProfile();
      fetchTargetUserBase();
      fetchConnectionStatus(u.id);
      fetchTargetPosts();
    }
  }, [userId]);

  async function fetchTargetProfile() {
    try {
      const res = await fetch(`${API}/api/profile/${userId}`);
      const data = await res.json();
      if (data.user) {
        const u = data.user;
        setProfileData({ ...u, ...(u.profile || {}) });
      }
    } catch (e) { console.error(e); }
  }

  async function fetchTargetUserBase() {
    try {
      const res = await fetch(`${API}/api/users/${userId}/profile`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setTargetUser(data.user);
    } catch (e) {}
  }

  async function fetchConnectionStatus(currentId: string) {
    try {
      const res = await fetch(`${API}/api/connections/status?userId=${currentId}&targetId=${userId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus(data.status);
        setConnectionId(data.connectionId);
      }
    } catch (e) {}
  }

  async function fetchTargetPosts() {
    try {
      const res = await fetch(`${API}/api/feed/posts?authorId=${userId}&page=1`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch (e) {}
  }

  async function handleConnect() {
    try {
      const res = await fetch(`${API}/api/connections/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ receiverId: userId, receiverName: profileData?.name || targetUser?.name })
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus("pending");
        setConnectionId(data.connectionId);
      }
    } catch (e) {}
  }

  async function handleLike(postId: string) {
    try {
      const res = await fetch(`${API}/api/feed/posts/${postId}/like`, { method: "POST", headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map(p => p._id === postId ? { 
          ...p, 
          likeCount: data.likeCount,
          likes: data.liked ? [...p.likes, { userId: user.id }] : p.likes.filter((l: any) => l.userId !== user.id)
        } : p));
      }
    } catch (e) {}
  }

  async function handleComment(postId: string, content: string) {
    try {
      const res = await fetch(`${API}/api/feed/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.success) setPosts(posts.map(p => p._id === postId ? { ...p, commentCount: p.commentCount + 1, comments: [...p.comments, data.comment] } : p));
    } catch (e) {}
  }

  async function handleMessage() {
    try {
      const res = await fetch(`${API}/api/chat/conversations/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ receiverId: userId, receiverName: profileData?.name || targetUser?.name, senderName: user.name })
      });
      const data = await res.json();
      if (data.success) navigate(`/chat?conversationId=${data.conversationId}`);
    } catch (e) {}
  }

  if (!targetUser || !profileData) return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Loading profile…</p>
      </div>
    </div>
  );

  const isMe = user?.id === userId;
  const p = profileData;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 80px" }}>

      {/* ═══════════════════════════ HERO CARD ═══════════════════════════ */}
      <div style={{
        background: "#FFFFFF", borderRadius: "0 0 20px 20px",
        border: "1px solid #E5E7EB", borderTop: "none",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflow: "hidden", marginBottom: 20,
      }}>
        <div style={{
          height: 200,
          background: p.coverPhoto
            ? `url(${p.coverPhoto}) center/cover`
            : "linear-gradient(135deg, #1A1A2E 0%, #2D1B4E 40%, #4A1942 100%)",
        }}>
          {!p.coverPhoto && (
            <div style={{
              width: "100%", height: "100%", opacity: 0.1,
              backgroundImage: "radial-gradient(circle at 20% 50%, rgba(242,101,34,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(139,92,246,0.3) 0%, transparent 50%)",
            }} />
          )}
        </div>

        <div style={{ padding: "0 32px 28px", position: "relative" }}>
          <div style={{ position: "absolute", top: -56, left: 32 }}>
            <div style={{
              width: 112, height: 112, borderRadius: "50%",
              border: "4px solid #FFFFFF", overflow: "hidden",
              background: "linear-gradient(135deg, #F26522, #E85D10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, fontWeight: 800, color: "#fff",
              fontFamily: "'Outfit', sans-serif",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}>
              {p.profilePhoto
                ? <img src={p.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Profile" />
                : (p.name?.[0]?.toUpperCase() || "?")}
            </div>
          </div>

          <div style={{ marginTop: 68 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1A1A1A", fontFamily: "'Outfit', sans-serif", margin: 0, lineHeight: 1.2 }}>
                    {p.name}
                  </h1>
                  {p.pronouns && <span style={{ fontSize: 12, color: "#9CA3AF", padding: "2px 10px", background: "#F3F4F6", borderRadius: 99, fontWeight: 500 }}>{p.pronouns}</span>}
                  {p.openToWork && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(34,197,94,0.08)", color: "#16A34A", border: "1px solid rgba(34,197,94,0.2)" }}>
                      #OpenToWork
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 16, color: "#4B5563", marginBottom: 8, lineHeight: 1.4 }}>
                  {p.headline || targetUser.accountType}
                </p>
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#9CA3AF", flexWrap: "wrap", alignItems: "center" }}>
                  {p.location && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={14} /> {p.location}</span>}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" style={{ color: "#F26522", display: "flex", alignItems: "center", gap: 5, textDecoration: "none", fontWeight: 500 }}>
                      <ExternalLink size={14} /> {p.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
                {/* Stats */}
                <div style={{ display: "flex", gap: 20, marginTop: 14, fontSize: 13 }}>
                  <span><strong style={{ color: "#1A1A1A" }}>{targetUser.connectionCount || 0}</strong> <span style={{ color: "#9CA3AF" }}>connections</span></span>
                  <span><strong style={{ color: "#1A1A1A" }}>{targetUser.postCount || 0}</strong> <span style={{ color: "#9CA3AF" }}>posts</span></span>
                </div>
                {/* Social Links */}
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {p.githubUrl && <SocialPill href={p.githubUrl} label="GitHub" />}
                  {p.linkedinUrl && <SocialPill href={p.linkedinUrl} label="LinkedIn" />}
                  {p.twitterUrl && <SocialPill href={p.twitterUrl} label="Twitter" />}
                  {p.portfolioUrl && <SocialPill href={p.portfolioUrl} label="Portfolio" />}
                </div>
              </div>

              {/* Action buttons */}
              {!isMe && (
                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                  <button className="btn btn-primary" onClick={handleMessage} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MessageSquare size={14} /> Message
                  </button>
                  {connectionStatus === "accepted" ? (
                    <button className="btn btn-ghost" style={{ color: "#16A34A", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "8px 16px", fontWeight: 600, fontSize: 13 }}>✓ Connected</button>
                  ) : connectionStatus === "pending" ? (
                    <button className="btn btn-ghost" disabled style={{ fontSize: 13 }}>Pending</button>
                  ) : (
                    <button className="btn btn-outline" onClick={handleConnect}>Connect</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SCROLLING SECTIONS ═══════════════════════ */}

      {/* About */}
      {p.summary && (
        <ViewCard>
          <ViewSectionTitle icon={<User size={18} />} title="About" />
          <p style={{ color: "#4B5563", lineHeight: 1.85, whiteSpace: "pre-wrap", fontSize: 15 }}>{p.summary}</p>
        </ViewCard>
      )}

      {/* Experience */}
      {p.experience?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Briefcase size={18} />} title="Experience" />
          {p.experience.map((exp: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < p.experience.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>
                <Briefcase size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{exp.title}</p>
                <div style={{ color: "#6B7280", fontSize: 14, margin: "2px 0", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{exp.company}</span>
                  {exp.isVerified && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "#16A34A", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5 }}>
                      <CheckCircle2 size={11} /> VERIFIED
                    </span>
                  )}
                  {exp.employmentType && <span>· {exp.employmentType}</span>}
                </div>
                <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                  {exp.startMonth ? `${MONTHS[exp.startMonth - 1]} ` : ""}{exp.startYear} – {exp.isCurrentRole ? "Present" : `${exp.endMonth ? MONTHS[exp.endMonth - 1] + " " : ""}${exp.endYear || ""}`}
                  {exp.location && ` · ${exp.location}`}
                </p>
                {exp.description && <p style={{ color: "#4B5563", fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>{exp.description}</p>}
                {exp.skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {exp.skills.map((s: string, si: number) => <SkillTag key={si} label={s} />)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Education */}
      {p.education?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<GraduationCap size={18} />} title="Education" />
          {p.education.map((edu: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < p.education.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}><GraduationCap size={20} /></div>
              <div>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{edu.school}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{edu.degree}{edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}</p>
                <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{edu.startYear} – {edu.endYear || "Present"}{edu.grade && ` · Grade: ${edu.grade}`}</p>
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Skills */}
      {p.skills?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Zap size={18} />} title="Skills" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.skills.map((sk: any, i: number) => <SkillTag key={i} label={sk.name} />)}
          </div>
        </ViewCard>
      )}

      {/* Certifications */}
      {p.certifications?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Award size={18} />} title="Certifications" />
          {p.certifications.map((cert: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < p.certifications.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}><Award size={20} /></div>
              <div>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{cert.name}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{cert.issuingOrg}</p>
                {cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#F26522", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}><ExternalLink size={12} /> Show credential</a>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Projects */}
      {p.projects?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Rocket size={18} />} title="Projects" />
          {p.projects.map((proj: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < p.projects.length - 1 ? "1px solid #F3F4F6" : "none" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}><Rocket size={20} /></div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{proj.name}</p>
                  {proj.url && <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: "#F26522" }}><ExternalLink size={13} /></a>}
                </div>
                {proj.description && <p style={{ color: "#4B5563", fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>{proj.description}</p>}
                {proj.skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {proj.skills.map((s: string, si: number) => <SkillTag key={si} label={s} />)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Languages */}
      {p.languages?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Globe size={18} />} title="Languages" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {p.languages.map((lang: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "#FAFAFA", borderRadius: 10, border: "1px solid #F3F4F6" }}>
                <Globe size={16} color="#9CA3AF" />
                <div>
                  <p style={{ fontWeight: 600, color: "#1A1A1A", fontSize: 14, margin: 0 }}>{lang.name}</p>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{lang.proficiency}</span>
                </div>
              </div>
            ))}
          </div>
        </ViewCard>
      )}

      {/* Interests */}
      {p.interests?.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Zap size={18} />} title="Interests" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.interests.map((interest: string, i: number) => <SkillTag key={i} label={interest} />)}
          </div>
        </ViewCard>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ color: "#F26522" }}><FileText size={18} /></div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", fontFamily: "'Outfit', sans-serif", margin: 0 }}>Activity</h2>
          </div>
          {posts.map(post => (
            <PostCard key={post._id} post={post} currentUserId={user.id} onLike={handleLike} onComment={handleComment} />
          ))}
        </div>
      )}
    </div>
  );
}


// ─── REUSABLE COMPONENTS ────────────────────────────────────────────────────

function ViewCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 16,
      border: "1px solid #E5E7EB",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      padding: 28, marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

function ViewSectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ color: "#F26522" }}>{icon}</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", fontFamily: "'Outfit', sans-serif", margin: 0 }}>{title}</h2>
    </div>
  );
}

function SkillTag({ label }: { label: string }) {
  return (
    <span style={{
      padding: "6px 14px", background: "#FFF7ED", borderRadius: 99,
      color: "#F26522", border: "1px solid rgba(242,101,34,0.12)",
      fontSize: 13, fontWeight: 600,
    }}>{label}</span>
  );
}

function SocialPill({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{
      padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      color: "#6B7280", background: "#F3F4F6", textDecoration: "none",
      display: "flex", alignItems: "center", gap: 4,
    }}>
      <ExternalLink size={11} /> {label}
    </a>
  );
}
