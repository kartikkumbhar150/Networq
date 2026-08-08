import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Gift, Copy, Trophy, Sparkles, TrendingUp, Medal } from "lucide-react";

export function meta() {
  return [{ title: "Leaderboard – HireX" }];
}

const API = "http://localhost:5000";

export default function Leaderboard() {
  const [data, setData] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'city' | 'fastest'>('global');
  const [cityFilter, setCityFilter] = useState("Pune");

  useEffect(() => {
    fetchLeaderboard();
    fetchUserStats();
  }, []);

  async function fetchLeaderboard() {
    try {
      const res = await fetch(`${API}/api/rewards/leaderboard`);
      const body = await res.json();
      if (body.success) setData(body);
    } catch(e) {}
  }

  async function fetchUserStats() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/rewards/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json();
      if (body.success) setUserStats(body.user);
    } catch(e) {}
  }

  function copyCode() {
    if (userStats?.referralCode) {
      navigator.clipboard.writeText(userStats.referralCode);
      alert("Referral code copied to clipboard!");
    }
  }

  if (!data) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px", paddingBottom: 80 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title" style={{ margin: "0 0 8px" }}>
          Leaderboards & Rewards
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 16, margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Track your referrals, earn rewards, and climb the Global Leaderboard.
        </p>
      </div>

      {/* ── Top Dashboard Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 40 }}>
        
        {/* Your Referral Activity Card */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 className="card-title" style={{ margin: 0 }}>Your Referral Activity</h3>
            <div style={{ background: "rgba(242,101,34,0.1)", padding: 8, borderRadius: 10, display: "flex", color: "#F26522" }}><TrendingUp size={18} /></div>
          </div>

          <div style={{ flex: 1 }}>
            {userStats ? (
              <>
                <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  <div style={{ flex: 1, padding: 16, background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Verified Joins</p>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#10B981" }}>{userStats.verifiedReferralCount}</p>
                  </div>
                  <div style={{ flex: 1, padding: 16, background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>Total Invites</p>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#F26522" }}>{userStats.referralCount}</p>
                  </div>
                </div>

                <div>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Your Unique Invite Code</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{
                      flex: 1, background: "#F3F4F6", border: "1px dashed #D1D5DB",
                      borderRadius: 10, padding: "10px 16px", fontSize: 16, fontWeight: 800,
                      color: "#1A1A1A", letterSpacing: 1, textAlign: "center"
                    }}>
                      {userStats.referralCode || "N/A"}
                    </div>
                    <button onClick={copyCode} style={{
                      background: "#1A1A1A", color: "#fff", border: "none",
                      borderRadius: 10, padding: "0 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
                      transition: "opacity 0.2s"
                    }} onMouseEnter={e => e.currentTarget.style.opacity = "0.8"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                      <Copy size={16} /> Copy
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Log in to view your activity.</div>
            )}
          </div>
        </div>

        {/* Milestone Rewards Card */}
        <div className="glass-card" style={{
          background: "linear-gradient(135deg, #FFF7ED, #FEF2F2)", padding: "24px",
          border: "1px solid rgba(242,101,34,0.2)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 className="card-title" style={{ margin: 0 }}>Milestone Rewards</h3>
            <div style={{ background: "rgba(139,92,246,0.1)", padding: 8, borderRadius: 10, display: "flex", color: "#8B5CF6" }}><Gift size={18} /></div>
          </div>
          <p style={{ fontSize: 14, color: "#4B5563", margin: "0 0 20px", lineHeight: 1.5 }}>
            Unlock exclusive rewards automatically when you hit verified invite milestones.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#fff", padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", border: "1px solid #FEE2E2" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FEE2E2", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>100</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>100 Verified Joins</p>
                <p style={{ margin: 0, fontSize: 12, color: "#EF4444", fontWeight: 600 }}>Unlocks Base Gift Reward</p>
              </div>
            </div>

            <div style={{ background: "#fff", padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", border: "1px solid #FEF08A" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FEF08A", color: "#CA8A04", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>500</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>500 Verified Joins</p>
                <p style={{ margin: 0, fontSize: 12, color: "#CA8A04", fontWeight: 600 }}>Unlocks Bigger Gift Reward</p>
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", padding: "12px 16px", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 12px rgba(49,46,129,0.2)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={18} /></div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>First & Fastest 1,000 Joins</p>
                <p style={{ margin: 0, fontSize: 12, color: "#A5B4FC", fontWeight: 600 }}>Eligible for 3 Mega Gifts</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Global Leaderboard Table ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Trophy size={20} color="#F59E0B" />
        <h2 className="section-title" style={{ margin: 0 }}>Global Leaderboard</h2>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
             <thead>
               <tr style={{ background: "#F9FAFB", textAlign: "left", fontSize: 13, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                 <th style={{ padding: "16px 24px", width: 80, fontWeight: 700 }}>Rank</th>
                 <th style={{ padding: "16px 24px", fontWeight: 700 }}>User / Company</th>
                 <th style={{ padding: "16px 24px", fontWeight: 700 }}>Location</th>
                 <th style={{ padding: "16px 24px", fontWeight: 700 }}>Badges</th>
                 <th style={{ padding: "16px 24px", textAlign: "right", fontWeight: 700 }}>Referrals</th>
               </tr>
             </thead>
             <tbody>
               {data.globalReferrers.map((u: any, i: number) => (
                 <tr key={u._id} style={{ borderBottom: "1px solid #E5E7EB", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                   <td style={{ padding: "16px 24px", fontWeight: 800, fontSize: 16, color: i < 3 ? "#F59E0B" : "#6B7280" }}>
                     {i === 0 ? "🥇 1" : i === 1 ? "🥈 2" : i === 2 ? "🥉 3" : `#${i + 1}`}
                   </td>
                   <td style={{ padding: "16px 24px", fontWeight: 600 }}>
                     <Link to={`/profile/${u._id}`} style={{ textDecoration: "none", color: "#1A1A1A", display: "flex", alignItems: "center", gap: 10 }}>
                       <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E5E7EB", overflow: "hidden", flexShrink: 0 }}>
                         {u.profilePhoto ? <img src={u.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                       </div>
                       {u.name}
                       {u.accountType === "company" && <span style={{ fontSize: 10, background: "#DBEAFE", color: "#1D4ED8", padding: "2px 6px", borderRadius: 4 }}>Company</span>}
                     </Link>
                   </td>
                   <td style={{ padding: "16px 24px", color: "#6B7280", fontSize: 14 }}>{u.profile?.location || "—"}</td>
                   <td style={{ padding: "16px 24px" }}>
                     <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                       {u.milestoneBadges?.map((b: string) => (
                         <span key={b} style={{ fontSize: 11, background: "rgba(242,101,34,0.1)", color: "#F26522", padding: "3px 8px", borderRadius: 6, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                           <Medal size={12} /> {b}
                         </span>
                       ))}
                     </div>
                   </td>
                   <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: 800, color: "#1A1A1A", fontSize: 16 }}>
                     {u.referralCount}
                   </td>
                 </tr>
               ))}
               {data.globalReferrers.length === 0 && (
                 <tr><td colSpan={5} style={{ padding: 48, textAlign: "center", color: "#9CA3AF" }}>No referrers found.</td></tr>
               )}
             </tbody>
          </table>
      </div>
    </div>
  );
}
