import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Briefcase, Calendar, MapPin, Copy, Check, CheckCircle2,
  TrendingUp, Users, FileText, Ticket, Star, ArrowRight,
  Building, Zap, Award, Globe, UserPlus
} from "lucide-react";

export function meta() {
  return [
    { title: "Dashboard – HireX" },
    { name: "description", content: "Your personalised professional dashboard on HireX." },
  ];
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface DashboardData {
  user: {
    name: string;
    accountType: string;
    headline: string;
    location: string;
    profilePhoto: string;
    isVerifiedCompany: boolean;
    isDigilockerVerified: boolean;
  };
  topPicks: any[];
  profileStrength: { score: number; missingItems: string[] };
  referralStats: {
    code: string;
    totalReferrals: number;
    verifiedReferrals: number;
    promoCredits: number;
    milestoneBadges: string[];
  };
  upcomingEvents: any[];
  activityStats: { postCount: number; connectionCount: number; registrationCount: number };
  networkRecommendations: {
    userId: string;
    name: string;
    accountType: string;
    headline: string;
    location: string;
    profilePhoto: string;
    isVerifiedCompany: boolean;
    companyName: string;
    mutualInterests: string[];
  }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    fetch(`${API}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [navigate]);

  function copyCode() {
    if (!data?.referralStats.code) return;
    navigator.clipboard.writeText(data.referralStats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConnect(targetId: string, targetName: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    setConnecting(targetId);
    try {
      const res = await fetch(`${API}/api/connections/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: targetId, receiverName: targetName }),
      });
      if (res.ok) setConnected(prev => new Set([...prev, targetId]));
    } catch {}
    finally { setConnecting(null); }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data) return null;

  const { user, topPicks, profileStrength, referralStats, upcomingEvents, activityStats, networkRecommendations } = data;
  const isCompany = user.accountType === "company";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const scoreColor = profileStrength.score >= 80 ? "#10b981" : profileStrength.score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 32px" }}>

      {/* ── Greeting Header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {greeting}, {user.name.split(" ")[0]} 👋
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: "var(--text-secondary)", fontFamily: "'Inter', sans-serif" }}>
          {isCompany ? "Here's your company activity snapshot." : "Here are your personalised picks and insights."}
        </p>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { icon: <Users size={18} color="#6366f1" />, label: "Connections", value: activityStats.connectionCount, bg: "rgba(99,102,241,0.08)" },
          { icon: <FileText size={18} color="var(--accent-from)" />, label: "Posts", value: activityStats.postCount, bg: "var(--accent-light)" },
          { icon: <Ticket size={18} color="#10b981" />, label: "Events Joined", value: activityStats.registrationCount, bg: "rgba(16,185,129,0.08)" },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, fontFamily: "'Outfit', sans-serif", letterSpacing: "-1px" }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Body Grid ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Top Picks */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="section-header-row">
              <div>
                <span className="section-label-pill">PICKS</span>
                <h2 className="section-title" style={{ margin: 0 }}>Top Picks for You</h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                  {isCompany ? "Active investment & alliance opportunities" : "Matching jobs and freelance roles"}
                </p>
              </div>
              <Link to="/opportunities" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-from)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {topPicks.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                No picks available yet. Check back soon.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {topPicks.map((opp: any, idx) => {
                  const co = opp.companyId?.companyDetails?.companyName || opp.companyId?.name || "Unknown";
                  return (
                    <div key={opp._id} style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "14px 0",
                      borderBottom: idx < topPicks.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      {/* Company avatar */}
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-layer)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {opp.companyId?.profile?.profilePhoto
                          ? <img src={opp.companyId.profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <Building size={18} color="var(--text-secondary)" />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {opp.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{co}</span>
                          {opp.companyId?.isVerifiedCompany && <CheckCircle2 size={11} color="#3b82f6" />}
                          {opp.budget && <><span>·</span><span style={{ color: "var(--accent-from)", fontWeight: 600 }}>${opp.budget.toLocaleString()}</span></>}
                          {opp.fundingAmount && <><span>·</span><span style={{ color: "#10b981", fontWeight: 600 }}>${(opp.fundingAmount / 1000000).toFixed(1)}M Ask</span></>}
                        </div>
                      </div>

                      {/* Type badge */}
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 99, flexShrink: 0,
                        background: opp.pillar === "capital" ? "rgba(16,185,129,0.1)" : opp.pillar === "alliance" ? "rgba(139,92,246,0.1)" : "var(--accent-light)",
                        color: opp.pillar === "capital" ? "#10b981" : opp.pillar === "alliance" ? "#8b5cf6" : "var(--accent-from)",
                        fontWeight: 700, textTransform: "capitalize"
                      }}>
                        {opp.type.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="section-header-row">
              <div>
                <span className="section-label-pill">EVENTS</span>
                <h2 className="section-title" style={{ margin: 0 }}>Upcoming Events</h2>
              </div>
              <Link to="/events" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-from)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No upcoming events right now.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {upcomingEvents.map(ev => {
                  const d = new Date(ev.date);
                  const spotsLeft = ev.capacity - ev.registrationCount;
                  return (
                    <Link to={`/events/${ev._id}`} key={ev._id} style={{ textDecoration: "none", display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 14, background: "var(--accent-light)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--accent-from)" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { month: "short" })}</span>
                        <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{d.getDate()}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 3 }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} /> {ev.venue}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users size={11} /> {spotsLeft} spots left</span>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", flexShrink: 0 }}>
                        {ev.ticketPrice === 0 ? "Free" : `₹${ev.ticketPrice}`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* People You May Know */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="section-header-row">
              <div>
                <span className="section-label-pill">NETWORK</span>
                <h2 className="section-title" style={{ margin: 0 }}>People You May Know</h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontFamily: "'Inter', sans-serif" }}>Expand your professional network</p>
              </div>
              <Link to="/network" style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-from)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: "'Inter', sans-serif" }}>
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {networkRecommendations.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>You're connected with everyone! 🎉</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {networkRecommendations.map((person, idx) => {
                  const isConnected = connected.has(person.userId);
                  const isConnecting = connecting === person.userId;
                  return (
                    <div key={person.userId} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
                      borderBottom: idx < networkRecommendations.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      {/* Avatar */}
                      <Link to={`/profile/${person.userId}`} style={{ flexShrink: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid var(--border)", background: "var(--bg-layer)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer" }}>
                          {person.profilePhoto
                            ? <img src={person.profilePhoto} alt={person.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-from)" }}>{person.name[0].toUpperCase()}</span>}
                        </div>
                      </Link>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Link to={`/profile/${person.userId}`} style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {person.name}
                          </Link>
                          {person.isVerifiedCompany && <CheckCircle2 size={12} color="#3b82f6" />}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {person.headline || person.accountType}
                        </div>
                        {person.mutualInterests.length > 0 && (
                          <div style={{ fontSize: 11, color: "var(--accent-from)", marginTop: 2 }}>
                            {person.mutualInterests.slice(0, 2).join(" · ")}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleConnect(person.userId, person.name)}
                        disabled={isConnected || isConnecting}
                        style={{
                          flexShrink: 0,
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                          border: isConnected ? "1px solid #10b981" : "1px solid var(--border)",
                          background: isConnected ? "rgba(16,185,129,0.08)" : "transparent",
                          color: isConnected ? "#10b981" : "var(--text-primary)",
                          cursor: isConnected ? "default" : "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {isConnected ? <Check size={12} /> : <UserPlus size={12} />}
                        {isConnecting ? "..." : isConnected ? "Sent" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Profile Strength */}
          {!isCompany && (
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <span className="section-label-pill">PROFILE</span>
                  <h3 className="card-title" style={{ margin: 0 }}>Profile Strength</h3>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, fontFamily: "'Inter', sans-serif" }}>Complete your profile to unlock more</p>
                </div>
                <div style={{ width: 52, height: 52, position: "relative" }}>
                  <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreColor} strokeWidth="3" strokeDasharray={`${profileStrength.score}, 100`} strokeLinecap="round" />
                  </svg>
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: scoreColor }}>{profileStrength.score}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, borderRadius: 99, background: "var(--bg-layer)", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${profileStrength.score}%`, borderRadius: 99, background: scoreColor, transition: "width 0.8s ease" }} />
              </div>

              {profileStrength.missingItems.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Add to improve</p>
                  {profileStrength.missingItems.slice(0, 3).map(item => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 99, background: scoreColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item}</span>
                    </div>
                  ))}
                  <Link to="/profile" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--accent-from)", textDecoration: "none" }}>
                    Complete Profile <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Referral & Rewards */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Award size={18} color="var(--accent-from)" />
              </div>
              <div>
                <span className="section-label-pill" style={{ marginBottom: 4 }}>REWARDS</span>
                <h3 className="card-title" style={{ margin: 0 }}>Referrals & Rewards</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>Invite friends, earn credits</p>
              </div>
            </div>

            {/* Referral Code */}
            <div style={{ background: "var(--bg-layer)", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Your Referral Code</div>
                <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 3, color: "var(--accent-from)" }}>{referralStats.code}</div>
              </div>
              <button onClick={copyCode} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: copied ? "var(--accent-light)" : "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
                {copied ? <Check size={15} color="var(--accent-from)" /> : <Copy size={15} color="var(--text-secondary)" />}
              </button>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total Referrals", value: referralStats.totalReferrals, icon: <Users size={14} color="#6366f1" />, color: "rgba(99,102,241,0.1)" },
                { label: "Verified", value: referralStats.verifiedReferrals, icon: <CheckCircle2 size={14} color="#10b981" />, color: "rgba(16,185,129,0.1)" },
              ].map(s => (
                <div key={s.label} style={{ background: s.color, borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Credits */}
            <div style={{ background: "linear-gradient(135deg, rgba(242,101,34,0.1), rgba(245,166,35,0.08))", borderRadius: 14, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Promo Credits</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent-from)" }}>{referralStats.promoCredits.toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={28} color="var(--accent-from)" />
              </div>
            </div>

            {referralStats.milestoneBadges.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {referralStats.milestoneBadges.map(badge => (
                  <span key={badge} style={{ fontSize: 11, padding: "4px 10px", background: "var(--bg-layer)", border: "1px solid var(--border)", borderRadius: 99, color: "var(--text-secondary)" }}>
                    🏅 {badge}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="glass-card" style={{ padding: 20 }}>
            <span className="section-label-pill" style={{ marginBottom: 4 }}>SHORTCUTS</span>
            <h3 className="card-title" style={{ margin: "0 0 14px" }}>Quick Actions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: <Globe size={15} />, label: "Browse Opportunities", href: "/opportunities" },
                { icon: <Ticket size={15} />, label: "Find Events", href: "/events" },
                { icon: <Users size={15} />, label: "Grow Your Network", href: "/network" },
                { icon: <TrendingUp size={15} />, label: "Leaderboard", href: "/leaderboard" },
              ].map(link => (
                <Link key={link.href} to={link.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, fontWeight: 500, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-layer)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: "var(--accent-from)" }}>{link.icon}</span> {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
