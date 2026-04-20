import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  User, Briefcase, GraduationCap, Zap, Award, Rocket, FileText, Medal,
  Globe, HeartHandshake, BookOpen, Camera, MapPin, Link as LinkIcon,
  Check, AlertTriangle, Pencil, Plus, Trash2, X, ChevronDown, ChevronUp,
  Sparkles, Brain, TrendingUp, RefreshCw, CheckCircle2, Info, ExternalLink,
  Shield, Star, Eye, BarChart3, Lightbulb, ArrowLeft
} from "lucide-react";

export function meta() {
  return [
    { title: "My Profile – HireX" },
    { name: "description", content: "Your professional profile on HireX." },
  ];
}

const API = "http://13.206.69.62:5000";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS = Array.from({length: 50}, (_, i) => new Date().getFullYear() - i);
const EMP_TYPES = ["Full-time","Part-time","Self-employed","Freelance","Contract","Internship","Apprenticeship","Seasonal"];
const LOCATION_TYPES = ["On-site","Hybrid","Remote"];
const LANG_PROF = ["Elementary","Limited Working","Professional Working","Full Professional","Native or Bilingual"];
const OPEN_WORK_TYPES = ["Full-time","Part-time","Contract","Internship","Remote"];

type Section = "about" | "experience" | "education" | "skills" | "certifications" | "projects" | "publications" | "honors" | "languages" | "volunteer" | "courses";

interface ProfileData {
  name: string;
  headline: string;
  summary: string;
  location: string;
  pronouns: string;
  profilePhoto: string;
  coverPhoto: string;
  website: string;
  openToWork: boolean;
  openToWorkTypes: string[];
  phone: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  portfolioUrl: string;
  experience: any[];
  education: any[];
  skills: any[];
  certifications: any[];
  projects: any[];
  publications: any[];
  honors: any[];
  languages: any[];
  volunteer: any[];
  courses: any[];
}

const emptyProfile: ProfileData = {
  name: "", headline: "", summary: "", location: "", pronouns: "",
  profilePhoto: "", coverPhoto: "", website: "",
  openToWork: false, openToWorkTypes: [],
  phone: "", linkedinUrl: "", githubUrl: "", twitterUrl: "", portfolioUrl: "",
  experience: [], education: [], skills: [], certifications: [],
  projects: [], publications: [], honors: [], languages: [], volunteer: [], courses: [],
};

interface AiRec {
  _id?: string;
  type: string;
  text: string;
  confidence: string;
  priority: number;
  applied: boolean;
}

interface ScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  tips: string[];
}

// ─── AI ASSIST PANEL COMPONENT ───────────────────────────────────────────────
function AiAssistPanel({ token }: { token: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [profileScore, setProfileScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown[]>([]);
  const [recommendations, setRecommendations] = useState<AiRec[]>([]);
  const [source, setSource] = useState<string>("");
  const [hasScanned, setHasScanned] = useState(false);

  async function scanProfile(force = false) {
    if (!token) return;
    setIsScanning(true);
    try {
      const res = await fetch(`${API}/api/ai/profile-scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: force }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileScore(data.profileScore || 0);
        setScoreBreakdown(data.scoreBreakdown || []);
        setRecommendations(data.recommendations || []);
        setSource(data.source || "");
        setHasScanned(true);
      }
    } catch {}
    setIsScanning(false);
  }

  async function dismissRec(recId: string) {
    try {
      await fetch(`${API}/api/ai/recommendation/${recId}/dismiss`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      setRecommendations(r => r.filter(x => x._id !== recId));
    } catch {}
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); if (!hasScanned) scanProfile(); }}
        style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 50,
          background: "linear-gradient(135deg, #F26522, #E85D10)",
          color: "#fff", border: "none", borderRadius: "50%",
          width: 52, height: 52, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(242,101,34,0.3)",
          transition: "transform 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
        title="AI Profile Assistant"
      >
        <Sparkles size={22} />
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 90, right: 24, zIndex: 50,
      width: 340, maxHeight: "70vh", overflow: "auto",
      background: "#fff", borderRadius: 16,
      border: "1px solid #E5E7EB",
      boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid #F3F4F6",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Brain size={18} color="#F26522" />
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}>AI Assistant</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => scanProfile(true)} disabled={isScanning}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}
            title="Re-scan">
            <RefreshCw size={14} className={isScanning ? "spinning" : ""} />
          </button>
          <button onClick={() => setIsOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
            <X size={14} />
          </button>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {isScanning ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>Analyzing your profile…</p>
          </div>
        ) : (
          <>
            {/* Score */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto" }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none"
                    stroke={profileScore >= 80 ? "#22C55E" : profileScore >= 50 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(profileScore / 100) * 213.6} 213.6`}
                    transform="rotate(-90 40 40)" />
                </svg>
                <span style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 20, fontWeight: 800,
                  color: profileScore >= 80 ? "#22C55E" : profileScore >= 50 ? "#F59E0B" : "#EF4444",
                }}>{profileScore}</span>
              </div>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>Profile Score</p>
            </div>
            {/* Breakdown */}
            {scoreBreakdown.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {scoreBreakdown.map((b, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#6B7280", fontWeight: 500 }}>{b.category}</span>
                      <span style={{ color: "#9CA3AF" }}>{b.score}/{b.maxScore}</span>
                    </div>
                    <div style={{ height: 4, background: "#F3F4F6", borderRadius: 99 }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${(b.score / b.maxScore) * 100}%`,
                        background: b.score >= b.maxScore * 0.7 ? "#22C55E" : b.score >= b.maxScore * 0.4 ? "#F59E0B" : "#EF4444",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Suggestions</h4>
                {recommendations.map((rec, i) => (
                  <div key={rec._id || i} style={{
                    display: "flex", gap: 10, padding: "10px 12px",
                    background: "#FAFAFA", borderRadius: 10,
                    border: "1px solid #F3F4F6", marginBottom: 6,
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, margin: 0 }}>{rec.text}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                        color: rec.confidence === "high" ? "#EF4444" : rec.confidence === "medium" ? "#f59e0b" : "#22C55E",
                      }}>{rec.confidence} priority</span>
                    </div>
                    {rec._id && (
                      <button onClick={() => dismissRec(rec._id!)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#D1D5DB", padding: 2 }}>
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ─── MAIN PROFILE COMPONENT ─────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string; ok: boolean} | null>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const coverPhotoRef = useRef<HTMLInputElement>(null);

  // Experience verification state
  const [verifyingExpId, setVerifyingExpId] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyStep, setVerifyStep] = useState<"email" | "otp">("email");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{msg: string; ok: boolean} | null>(null);

  // Section refs for scrolling
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    basic: useRef<HTMLDivElement>(null),
    about: useRef<HTMLDivElement>(null),
    experience: useRef<HTMLDivElement>(null),
    education: useRef<HTMLDivElement>(null),
    skills: useRef<HTMLDivElement>(null),
    certifications: useRef<HTMLDivElement>(null),
    projects: useRef<HTMLDivElement>(null),
    publications: useRef<HTMLDivElement>(null),
    honors: useRef<HTMLDivElement>(null),
    languages: useRef<HTMLDivElement>(null),
    volunteer: useRef<HTMLDivElement>(null),
    courses: useRef<HTMLDivElement>(null),
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch(`${API}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.user) {
        const u = data.user;
        setProfile({ ...emptyProfile, name: u.name, ...u.profile });
        setInterests(u.interests || []);
      }
    } catch {}
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      setFeedback({ msg: data.message, ok: res.ok });
      if (res.ok) {
        setInterests(data.user.interests || []);
        setIsEditing(false);
        // Update localStorage name
        const u = typeof window !== "undefined" ? localStorage.getItem("user") : null;
        if (u) {
          const parsed = JSON.parse(u);
          parsed.name = profile.name;
          localStorage.setItem("user", JSON.stringify(parsed));
        }
      }
    } catch { setFeedback({ msg: "Connection error.", ok: false }); }
    setSaving(false);
  }

  async function uploadPhoto(type: "profile" | "cover", file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = e.target?.result as string;
      await fetch(`${API}/api/profile/photo`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (type === "profile") setProfile(p => ({ ...p, profilePhoto: data }));
      else setProfile(p => ({ ...p, coverPhoto: data }));
    };
    reader.readAsDataURL(file);
  }

  function updateField(key: string, value: any) {
    setProfile(p => ({ ...p, [key]: value }));
  }

  function updateArrayItem(section: keyof ProfileData, idx: number, key: string, value: any) {
    setProfile(p => {
      const arr = [...(p[section] as any[])];
      arr[idx] = { ...arr[idx], [key]: value };
      return { ...p, [section]: arr };
    });
  }

  function addItem(section: keyof ProfileData, template: object) {
    setProfile(p => ({ ...p, [section]: [...(p[section] as any[]), template] }));
  }

  function removeItem(section: keyof ProfileData, idx: number) {
    setProfile(p => {
      const arr = [...(p[section] as any[])];
      arr.splice(idx, 1);
      return { ...p, [section]: arr };
    });
  }

  function scrollToSection(key: string) {
    sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openVerifyModal(expId: string) {
    setVerifyingExpId(expId);
    setVerifyEmail("");
    setVerifyOtp("");
    setVerifyStep("email");
    setVerifyMsg(null);
  }

  async function requestExpVerify() {
    if (!verifyingExpId || !verifyEmail) return;
    setVerifyLoading(true);
    setVerifyMsg(null);
    try {
      const res = await fetch(`${API}/api/profile/experience/verify-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId: verifyingExpId, companyEmail: verifyEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setVerifyStep("otp");
        setVerifyMsg({ msg: data.message, ok: true });
      } else {
        setVerifyMsg({ msg: data.message, ok: false });
      }
    } catch { setVerifyMsg({ msg: "Connection error.", ok: false }); }
    setVerifyLoading(false);
  }

  async function confirmExpVerify() {
    if (!verifyingExpId || !verifyOtp) return;
    setVerifyLoading(true);
    setVerifyMsg(null);
    try {
      const res = await fetch(`${API}/api/profile/experience/verify-confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId: verifyingExpId, otp: verifyOtp }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile({ ...emptyProfile, name: data.user.name, ...data.user.profile });
        setVerifyingExpId(null);
        setFeedback({ msg: "Experience verified! ✓", ok: true });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setVerifyMsg({ msg: data.message, ok: false });
      }
    } catch { setVerifyMsg({ msg: "Connection error.", ok: false }); }
    setVerifyLoading(false);
  }

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#F8F9FA" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 16px" }} />
        <p style={{ fontSize: 14, color: "#9CA3AF" }}>Loading profile…</p>
      </div>
    </div>
  );

  const sidebarSections: { key: string; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "basic", label: "Basic Info", icon: <User size={15} /> },
    { key: "about", label: "About", icon: <User size={15} /> },
    { key: "experience", label: "Experience", icon: <Briefcase size={15} />, count: profile.experience.length },
    { key: "education", label: "Education", icon: <GraduationCap size={15} />, count: profile.education.length },
    { key: "skills", label: "Skills", icon: <Zap size={15} />, count: profile.skills.length },
    { key: "certifications", label: "Certifications", icon: <Award size={15} />, count: profile.certifications.length },
    { key: "projects", label: "Projects", icon: <Rocket size={15} />, count: profile.projects.length },
    { key: "publications", label: "Publications", icon: <FileText size={15} />, count: profile.publications.length },
    { key: "honors", label: "Honors", icon: <Medal size={15} />, count: profile.honors.length },
    { key: "languages", label: "Languages", icon: <Globe size={15} />, count: profile.languages.length },
    { key: "volunteer", label: "Volunteer", icon: <HeartHandshake size={15} />, count: profile.volunteer.length },
    { key: "courses", label: "Courses", icon: <BookOpen size={15} />, count: profile.courses.length },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT MODE — Full page continuous form with sticky sidebar
  // ═══════════════════════════════════════════════════════════════════════════
  if (isEditing) {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 100px" }}>
        {/* Feedback Toast */}
        {feedback && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 1000,
            padding: "14px 20px", borderRadius: 12,
            background: feedback.ok ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${feedback.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: feedback.ok ? "#16A34A" : "#DC2626",
            fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)", animation: "fadeInUp 0.3s ease",
          }}>
            {feedback.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {feedback.msg}
            <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "inherit" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Top bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #E5E7EB",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setIsEditing(false)} style={{
              background: "none", border: "1px solid #E5E7EB", borderRadius: 10,
              padding: "8px 12px", cursor: "pointer", color: "#6B7280",
              display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
            }}>
              <ArrowLeft size={15} /> Back to Profile
            </button>
            <h1 className="page-title" style={{ fontSize: 22, margin: 0 }}>
              Edit Profile
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : <><Check size={14} /> Save All Changes</>}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "start" }}>
          {/* Sticky sidebar nav */}
          <nav style={{
            position: "sticky", top: 24,
            background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)", padding: "12px 8px",
          }}>
            {sidebarSections.map(s => (
              <button key={s.key} onClick={() => scrollToSection(s.key)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                background: "transparent", color: "#6B7280",
                border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
                textAlign: "left", transition: "all 0.15s", fontFamily: "'Inter', sans-serif",
                marginBottom: 2,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FFF7ED"; e.currentTarget.style.color = "#F26522"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6B7280"; }}
              >
                <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{s.icon}</span>
                <span style={{ flex: 1 }}>{s.label}</span>
                {s.count !== undefined && s.count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: "#F3F4F6", color: "#9CA3AF" }}>{s.count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Continuous form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── BASIC INFO ── */}
            <div ref={sectionRefs.basic} style={cardStyle}>
              <FormSectionTitle icon={<User size={18} />} title="Basic Information" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={profile.name} onChange={e => updateField("name", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Pronouns</label><input className="form-input" value={profile.pronouns} onChange={e => updateField("pronouns", e.target.value)} placeholder="He/Him" /></div>
              </div>
              <div className="form-group"><label className="form-label">Headline</label><input className="form-input" value={profile.headline} onChange={e => updateField("headline", e.target.value)} placeholder="Software Engineer at Google" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={profile.location} onChange={e => updateField("location", e.target.value)} placeholder="Mumbai, India" /></div>
                <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={profile.website} onChange={e => updateField("website", e.target.value)} placeholder="https://yoursite.com" /></div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={profile.openToWork} onChange={e => updateField("openToWork", e.target.checked)} />
                  <span>Open to Work</span>
                </label>
                {profile.openToWork && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {OPEN_WORK_TYPES.map(t => (
                      <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                        <input type="checkbox" checked={profile.openToWorkTypes.includes(t)} onChange={e => updateField("openToWorkTypes", e.target.checked ? [...profile.openToWorkTypes, t] : profile.openToWorkTypes.filter(x => x !== t))} />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── ABOUT ── */}
            <div ref={sectionRefs.about} style={cardStyle}>
              <FormSectionTitle icon={<User size={18} />} title="About" />
              <div className="form-group"><label className="form-label">Professional Summary</label><textarea className="form-input" value={profile.summary} onChange={e => updateField("summary", e.target.value)} rows={5} placeholder="Tell your professional story…" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={profile.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
                <div className="form-group"><label className="form-label">LinkedIn URL</label><input className="form-input" value={profile.linkedinUrl} onChange={e => updateField("linkedinUrl", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">GitHub URL</label><input className="form-input" value={profile.githubUrl} onChange={e => updateField("githubUrl", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Twitter URL</label><input className="form-input" value={profile.twitterUrl} onChange={e => updateField("twitterUrl", e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Portfolio URL</label><input className="form-input" value={profile.portfolioUrl} onChange={e => updateField("portfolioUrl", e.target.value)} /></div>
              </div>
            </div>

            {/* ── EXPERIENCE ── */}
            <div ref={sectionRefs.experience} style={cardStyle}>
              <FormSectionTitle icon={<Briefcase size={18} />} title="Experience" />
              {profile.experience.map((exp, i) => (
                <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={exp.title || ""} onChange={e => updateArrayItem("experience", i, "title", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Company *</label><input className="form-input" value={exp.company || ""} onChange={e => updateArrayItem("experience", i, "company", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Employment Type</label><select className="form-input form-select" value={exp.employmentType || ""} onChange={e => updateArrayItem("experience", i, "employmentType", e.target.value)}><option value="">Select…</option>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Location Type</label><select className="form-input form-select" value={exp.locationType || ""} onChange={e => updateArrayItem("experience", i, "locationType", e.target.value)}><option value="">Select…</option>{LOCATION_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={exp.location || ""} onChange={e => updateArrayItem("experience", i, "location", e.target.value)} placeholder="Mumbai, India" /></div>
                    <div className="form-group"><label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={exp.isCurrentRole || false} onChange={e => updateArrayItem("experience", i, "isCurrentRole", e.target.checked)} /> Currently working here</label></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div className="form-group"><label className="form-label">Start Month</label><select className="form-input form-select" value={exp.startMonth || ""} onChange={e => updateArrayItem("experience", i, "startMonth", Number(e.target.value))}><option value="">Month</option>{MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Start Year</label><select className="form-input form-select" value={exp.startYear || ""} onChange={e => updateArrayItem("experience", i, "startYear", Number(e.target.value))}><option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select></div>
                    {!exp.isCurrentRole && <>
                      <div className="form-group"><label className="form-label">End Month</label><select className="form-input form-select" value={exp.endMonth || ""} onChange={e => updateArrayItem("experience", i, "endMonth", Number(e.target.value))}><option value="">Month</option>{MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">End Year</label><select className="form-input form-select" value={exp.endYear || ""} onChange={e => updateArrayItem("experience", i, "endYear", Number(e.target.value))}><option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select></div>
                    </>}
                  </div>
                  <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">Description</label><textarea className="form-input" value={exp.description || ""} onChange={e => updateArrayItem("experience", i, "description", e.target.value)} rows={3} /></div>
                  <div className="form-group"><label className="form-label">Skills (comma separated)</label><input className="form-input" value={(exp.skills || []).join(", ")} onChange={e => updateArrayItem("experience", i, "skills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} /></div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                    <button onClick={() => removeItem("experience", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> Remove</button>
                    {exp._id && !exp.isVerified && (
                      <button onClick={() => openVerifyModal(exp._id)} style={{
                        background: "none", border: "1px solid #D1D5DB", borderRadius: 8,
                        padding: "4px 12px", cursor: "pointer", color: "#6B7280",
                        fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                        transition: "all 0.2s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#22C55E"; e.currentTarget.style.color = "#22C55E"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.color = "#6B7280"; }}
                      ><Shield size={12} /> Verify with Company Email</button>
                    )}
                    {exp.isVerified && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)" }}>
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <AddButton label="Add Experience" onClick={() => addItem("experience", { title: "", company: "", isCurrentRole: false, skills: [] })} />
            </div>

            {/* ── Verify Experience Modal ── */}
            {verifyingExpId && (
              <div style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }} onClick={() => setVerifyingExpId(null)}>
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "32px",
                  width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E" }}>
                        <Shield size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A", margin: 0, fontFamily: "'Outfit', sans-serif" }}>Verify Experience</h3>
                        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Confirm with your company email</p>
                      </div>
                    </div>
                    <button onClick={() => setVerifyingExpId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}><X size={18} /></button>
                  </div>

                  {verifyMsg && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10, marginBottom: 16,
                      background: verifyMsg.ok ? "#F0FDF4" : "#FEF2F2",
                      border: `1px solid ${verifyMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      color: verifyMsg.ok ? "#16A34A" : "#DC2626",
                      fontSize: 13, fontWeight: 500,
                    }}>
                      {verifyMsg.msg}
                    </div>
                  )}

                  {verifyStep === "email" ? (
                    <>
                      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>
                        Enter the email address provided by your company/organization (e.g. <strong>you@google.com</strong>). 
                        Personal emails (Gmail, Yahoo, etc.) are not accepted.
                      </p>
                      <div className="form-group">
                        <label className="form-label">Company Email</label>
                        <input className="form-input" type="email" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)}
                          placeholder="you@company.com" style={{ fontSize: 15 }} />
                      </div>
                      <button className="btn btn-primary" onClick={requestExpVerify} disabled={verifyLoading || !verifyEmail}
                        style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {verifyLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : "Send Verification Code"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>
                        A 6-digit code has been sent to <strong>{verifyEmail}</strong>. Enter it below.
                      </p>
                      <div className="form-group">
                        <label className="form-label">Verification Code</label>
                        <input className="form-input" value={verifyOtp} onChange={e => setVerifyOtp(e.target.value)}
                          placeholder="000000" maxLength={6} style={{ fontSize: 22, letterSpacing: 6, textAlign: "center", fontWeight: 700 }} />
                      </div>
                      <button className="btn btn-primary" onClick={confirmExpVerify} disabled={verifyLoading || verifyOtp.length < 6}
                        style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {verifyLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Verifying…</> : <><CheckCircle2 size={14} /> Verify</>}
                      </button>
                      <button onClick={() => setVerifyStep("email")} style={{
                        width: "100%", marginTop: 8, background: "none", border: "none",
                        cursor: "pointer", color: "#9CA3AF", fontSize: 13, textAlign: "center",
                      }}>← Change email</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── EDUCATION ── */}
            <div ref={sectionRefs.education} style={cardStyle}>
              <FormSectionTitle icon={<GraduationCap size={18} />} title="Education" />
              {profile.education.map((edu, i) => (
                <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="form-group"><label className="form-label">School *</label><input className="form-input" value={edu.school || ""} onChange={e => updateArrayItem("education", i, "school", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Degree</label><input className="form-input" value={edu.degree || ""} onChange={e => updateArrayItem("education", i, "degree", e.target.value)} placeholder="Bachelor of Technology" /></div>
                    <div className="form-group"><label className="form-label">Field of Study</label><input className="form-input" value={edu.fieldOfStudy || ""} onChange={e => updateArrayItem("education", i, "fieldOfStudy", e.target.value)} placeholder="Computer Science" /></div>
                    <div className="form-group"><label className="form-label">Grade / GPA</label><input className="form-input" value={edu.grade || ""} onChange={e => updateArrayItem("education", i, "grade", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Start Year</label><select className="form-input form-select" value={edu.startYear || ""} onChange={e => updateArrayItem("education", i, "startYear", Number(e.target.value))}><option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">End Year</label><select className="form-input form-select" value={edu.endYear || ""} onChange={e => updateArrayItem("education", i, "endYear", Number(e.target.value))}><option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select></div>
                  </div>
                  <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">Activities</label><input className="form-input" value={edu.activities || ""} onChange={e => updateArrayItem("education", i, "activities", e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={edu.description || ""} onChange={e => updateArrayItem("education", i, "description", e.target.value)} rows={2} /></div>
                  <button onClick={() => removeItem("education", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> Remove</button>
                </div>
              ))}
              <AddButton label="Add Education" onClick={() => addItem("education", { school: "" })} />
            </div>

            {/* ── SKILLS ── */}
            <div ref={sectionRefs.skills} style={cardStyle}>
              <FormSectionTitle icon={<Zap size={18} />} title="Skills" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {profile.skills.map((sk, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#F9FAFB", borderRadius: 99, border: "1px solid #E5E7EB", fontSize: 13 }}>
                    <input style={{ background: "transparent", border: "none", outline: "none", color: "#1A1A1A", width: 120, fontSize: 13 }} value={sk.name || ""} onChange={e => updateArrayItem("skills", i, "name", e.target.value)} />
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 16, lineHeight: 1 }} onClick={() => removeItem("skills", i)}>×</button>
                  </div>
                ))}
              </div>
              <AddButton label="Add Skill" onClick={() => addItem("skills", { name: "", endorsements: 0 })} />
            </div>

            {/* ── CERTIFICATIONS ── */}
            <div ref={sectionRefs.certifications} style={cardStyle}>
              <FormSectionTitle icon={<Award size={18} />} title="Certifications" />
              {profile.certifications.map((cert, i) => (
                <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={cert.name || ""} onChange={e => updateArrayItem("certifications", i, "name", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Issuing Organization</label><input className="form-input" value={cert.issuingOrg || ""} onChange={e => updateArrayItem("certifications", i, "issuingOrg", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Credential ID</label><input className="form-input" value={cert.credentialId || ""} onChange={e => updateArrayItem("certifications", i, "credentialId", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Credential URL</label><input className="form-input" value={cert.credentialUrl || ""} onChange={e => updateArrayItem("certifications", i, "credentialUrl", e.target.value)} /></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div className="form-group"><label className="form-label">Issue Month</label><select className="form-input form-select" value={cert.issueMonth || ""} onChange={e => updateArrayItem("certifications", i, "issueMonth", Number(e.target.value))}><option value="">Month</option>{MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Issue Year</label><select className="form-input form-select" value={cert.issueYear || ""} onChange={e => updateArrayItem("certifications", i, "issueYear", Number(e.target.value))}><option value="">Year</option>{YEARS.map(y => <option key={y}>{y}</option>)}</select></div>
                  </div>
                  <button onClick={() => removeItem("certifications", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}><Trash2 size={13} /> Remove</button>
                </div>
              ))}
              <AddButton label="Add Certification" onClick={() => addItem("certifications", { name: "" })} />
            </div>

            {/* ── PROJECTS ── */}
            <div ref={sectionRefs.projects} style={cardStyle}>
              <FormSectionTitle icon={<Rocket size={18} />} title="Projects" />
              {profile.projects.map((proj, i) => (
                <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="form-group"><label className="form-label">Project Name *</label><input className="form-input" value={proj.name || ""} onChange={e => updateArrayItem("projects", i, "name", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Project URL</label><input className="form-input" value={proj.url || ""} onChange={e => updateArrayItem("projects", i, "url", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Associated With</label><input className="form-input" value={proj.associatedWith || ""} onChange={e => updateArrayItem("projects", i, "associatedWith", e.target.value)} /></div>
                  </div>
                  <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">Description</label><textarea className="form-input" value={proj.description || ""} onChange={e => updateArrayItem("projects", i, "description", e.target.value)} rows={3} /></div>
                  <div className="form-group"><label className="form-label">Skills (comma separated)</label><input className="form-input" value={(proj.skills || []).join(", ")} onChange={e => updateArrayItem("projects", i, "skills", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} /></div>
                  <button onClick={() => removeItem("projects", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><Trash2 size={13} /> Remove</button>
                </div>
              ))}
              <AddButton label="Add Project" onClick={() => addItem("projects", { name: "", skills: [] })} />
            </div>

            {/* ── GENERIC: Publications, Honors, Courses ── */}
            <EditGenericSection ref={sectionRefs.publications} icon={<FileText size={18} />} title="Publications" section="publications" profile={profile} updateArrayItem={updateArrayItem} removeItem={removeItem} addItem={addItem} fields={[{key:"title",label:"Title"},{key:"publisher",label:"Publisher"},{key:"publishDate",label:"Date"},{key:"url",label:"URL"},{key:"description",label:"Description",multiline:true}]} template={{title:""}} />
            <EditGenericSection ref={sectionRefs.honors} icon={<Medal size={18} />} title="Honors & Awards" section="honors" profile={profile} updateArrayItem={updateArrayItem} removeItem={removeItem} addItem={addItem} fields={[{key:"title",label:"Title"},{key:"issuer",label:"Issuer"},{key:"date",label:"Date"},{key:"associatedWith",label:"Associated With"},{key:"description",label:"Description",multiline:true}]} template={{title:""}} />

            {/* ── LANGUAGES ── */}
            <div ref={sectionRefs.languages} style={cardStyle}>
              <FormSectionTitle icon={<Globe size={18} />} title="Languages" />
              {profile.languages.map((lang, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label">Language</label><input className="form-input" value={lang.name || ""} onChange={e => updateArrayItem("languages", i, "name", e.target.value)} /></div>
                  <div className="form-group" style={{ flex: 1 }}><label className="form-label">Proficiency</label><select className="form-input form-select" value={lang.proficiency || ""} onChange={e => updateArrayItem("languages", i, "proficiency", e.target.value)}><option value="">Select…</option>{LANG_PROF.map(p => <option key={p}>{p}</option>)}</select></div>
                  <button onClick={() => removeItem("languages", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 8, marginBottom: 4 }}><Trash2 size={14} /></button>
                </div>
              ))}
              <AddButton label="Add Language" onClick={() => addItem("languages", { name: "", proficiency: "" })} />
            </div>

            {/* ── VOLUNTEER ── */}
            <div ref={sectionRefs.volunteer} style={cardStyle}>
              <FormSectionTitle icon={<HeartHandshake size={18} />} title="Volunteer Experience" />
              {profile.volunteer.map((vol, i) => (
                <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="form-group"><label className="form-label">Organization *</label><input className="form-input" value={vol.organization || ""} onChange={e => updateArrayItem("volunteer", i, "organization", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={vol.role || ""} onChange={e => updateArrayItem("volunteer", i, "role", e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Cause</label><input className="form-input" value={vol.cause || ""} onChange={e => updateArrayItem("volunteer", i, "cause", e.target.value)} placeholder="Education, Environment…" /></div>
                  </div>
                  <div className="form-group" style={{ marginTop: 8 }}><label className="form-label">Description</label><textarea className="form-input" value={vol.description || ""} onChange={e => updateArrayItem("volunteer", i, "description", e.target.value)} rows={2} /></div>
                  <button onClick={() => removeItem("volunteer", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> Remove</button>
                </div>
              ))}
              <AddButton label="Add Volunteer Experience" onClick={() => addItem("volunteer", { organization: "" })} />
            </div>

            {/* ── COURSES ── */}
            <EditGenericSection ref={sectionRefs.courses} icon={<BookOpen size={18} />} title="Courses" section="courses" profile={profile} updateArrayItem={updateArrayItem} removeItem={removeItem} addItem={addItem} fields={[{key:"name",label:"Name"},{key:"number",label:"Number"},{key:"associatedWith",label:"Associated With"}]} template={{name:""}} />

            {/* Bottom save */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
              <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 28px" }}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : <><Check size={14} /> Save All Changes</>}
              </button>
            </div>
          </div>
        </div>

        <AiAssistPanel token={token} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE — LinkedIn-style scrolling profile
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px 80px" }}>

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          padding: "14px 20px", borderRadius: 12,
          background: feedback.ok ? "#F0FDF4" : "#FEF2F2",
          border: `1px solid ${feedback.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: feedback.ok ? "#16A34A" : "#DC2626",
          fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)", animation: "fadeInUp 0.3s ease",
        }}>
          {feedback.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {feedback.msg}
          <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "inherit" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════ HERO CARD ═══════════════════════════ */}
      <div className="glass-card" style={{
        overflow: "hidden", 
        marginBottom: 24,
      }}>
        {/* Cover Photo */}
        <div
          style={{
            position: "relative", height: 180,
            background: profile.coverPhoto
              ? `url(${profile.coverPhoto}) center/cover`
              : "url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop') center/cover",
            cursor: "pointer",
          }}
          onClick={() => coverPhotoRef.current?.click()}
        >
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: 16,
            opacity: 0.85, transition: "opacity 0.25s", background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%)",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.85")}
          >
             <button style={{
               background: "rgba(255,255,255,0.9)", color: "#374151", border: "none",
               borderRadius: 20, padding: "6px 12px", fontSize: 13, fontWeight: 600,
               display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
               boxShadow: "0 2px 4px rgba(0,0,0,0.1)", backdropFilter: "blur(4px)"
             }}>
                 <Camera size={15} /> Edit cover
             </button>
          </div>
          <input ref={coverPhotoRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => e.target.files?.[0] && uploadPhoto("cover", e.target.files[0])} />
        </div>

        {/* Profile Info Section */}
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Avatar Group */}
            <div style={{ marginTop: -65, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
               {/* Profile Photo */}
               <div
                 style={{ 
                   position: "relative", cursor: "pointer",
                   width: 140, height: 140, borderRadius: "50%",
                   border: "4px solid #FFFFFF", overflow: "hidden",
                   background: "#F3F4F6",
                   display: "flex", alignItems: "center", justifyContent: "center",
                   fontSize: 48, fontWeight: 800, color: "#9CA3AF",
                   fontFamily: "'Outfit', sans-serif",
                   boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                   zIndex: 2,
                 }}
                 onClick={e => { e.stopPropagation(); profilePhotoRef.current?.click(); }}
                 onMouseEnter={e => {
                   const overlay = e.currentTarget.querySelector('.hover-overlay') as HTMLDivElement;
                   if (overlay) overlay.style.opacity = "1";
                 }}
                 onMouseLeave={e => {
                   const overlay = e.currentTarget.querySelector('.hover-overlay') as HTMLDivElement;
                   if (overlay) overlay.style.opacity = "0";
                 }}
               >
                 {profile.profilePhoto
                   ? <img src={profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Profile" />
                   : (profile.name?.[0]?.toUpperCase() || "?")}
                 
                 <div className="hover-overlay" style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", opacity: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                    transition: "opacity 0.2s", backdropFilter: "blur(2px)"
                 }}>
                   <Camera size={28} />
                 </div>
               </div>
               <input ref={profilePhotoRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => e.target.files?.[0] && uploadPhoto("profile", e.target.files[0])} />
               
               {/* Name + Headline */}
               <div style={{ marginTop: 16 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                   <h1 className="page-title" style={{ margin: 0, lineHeight: 1.2 }}>
                     {profile.name || "Your Name"}
                   </h1>
                   {profile.pronouns && (
                     <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 400 }}>({profile.pronouns})</span>
                   )}
                 </div>
                 <p style={{ fontSize: 16, color: "#111827", marginBottom: 8, lineHeight: 1.4, fontWeight: 500 }}>
                   {profile.headline || "Add a headline to stand out…"}
                 </p>
                 <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#6B7280", flexWrap: "wrap", alignItems: "center" }}>
                   {profile.location && (
                     <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                       {profile.location}
                     </span>
                   )}
                   {profile.location && profile.website && <span style={{color: "#D1D5DB"}}>•</span>}
                   {profile.website && (
                     <a href={profile.website} target="_blank" rel="noreferrer" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
                       Contact info
                     </a>
                   )}
                 </div>
               </div>
            </div>

            {/* Right Side Actions & OpenToWork */}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
               <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: "#0A66C2", border: "none",
                    borderRadius: 20, padding: "6px 20px", cursor: "pointer",
                    color: "#FFF", fontSize: 15, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.2s", fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#004182"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0A66C2"; }}
                >
                  <Pencil size={15} color="#FFF" /> Edit Profile
                </button>

                {profile.openToWork && (
                   <span style={{
                     fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 8,
                     background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0", 
                     display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
                     boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                   }}>
                     #OpenToWork
                     <span style={{fontSize: 11, fontWeight: 500, color: "#10B981"}}>Open to new opportunities</span>
                   </span>
                )}
            </div>
          </div>
          
          {/* Social Links Container */}
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
             {profile.githubUrl && <SocialPill href={profile.githubUrl} label="GitHub" />}
             {profile.linkedinUrl && <SocialPill href={profile.linkedinUrl} label="LinkedIn" />}
             {profile.twitterUrl && <SocialPill href={profile.twitterUrl} label="Twitter" />}
             {profile.portfolioUrl && <SocialPill href={profile.portfolioUrl} label="Portfolio" />}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ SCROLLING SECTIONS ═══════════════════════ */}

      {/* About */}
      {profile.summary && (
        <ViewCard>
          <ViewSectionTitle icon={<User size={18} />} title="About" />
          <p style={{ color: "#4B5563", lineHeight: 1.85, whiteSpace: "pre-wrap", fontSize: 15 }}>{profile.summary}</p>
        </ViewCard>
      )}

      {/* Experience */}
      {profile.experience.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Briefcase size={18} />} title="Experience" />
          {profile.experience.map((exp, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.experience.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #FFF7ED 0%, #FFF1E6 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#F26522", border: "1px solid rgba(242,101,34,0.08)" }}>
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
                  {exp.location && ` · ${exp.location}`}{exp.locationType && ` · ${exp.locationType}`}
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
      {profile.education.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<GraduationCap size={18} />} title="Education" />
          {profile.education.map((edu, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.education.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #EFF6FF 0%, #E0EDFF 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.08)" }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{edu.school}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{edu.degree}{edu.fieldOfStudy && `, ${edu.fieldOfStudy}`}</p>
                <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{edu.startYear} – {edu.endYear || "Present"}{edu.grade && ` · Grade: ${edu.grade}`}</p>
                {edu.activities && <p style={{ fontSize: 13, color: "#6B7280", marginTop: 6 }}>Activities: {edu.activities}</p>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Skills */}
      {profile.skills.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Zap size={18} />} title="Skills" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.skills.map((sk, i) => <SkillTag key={i} label={sk.name} />)}
          </div>
        </ViewCard>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Award size={18} />} title="Certifications" />
          {profile.certifications.map((cert, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.certifications.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #FEFCE8 0%, #FEF9C3 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EAB308", border: "1px solid rgba(234,179,8,0.08)" }}><Award size={20} /></div>
              <div>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{cert.name}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{cert.issuingOrg}</p>
                <p style={{ color: "#9CA3AF", fontSize: 12 }}>{cert.issueMonth ? `${MONTHS[cert.issueMonth - 1]} ` : ""}{cert.issueYear}</p>
                {cert.credentialUrl && <a href={cert.credentialUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#F26522", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}><ExternalLink size={12} /> Show credential</a>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Projects */}
      {profile.projects.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Rocket size={18} />} title="Projects" />
          {profile.projects.map((proj, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.projects.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#22C55E", border: "1px solid rgba(34,197,94,0.08)" }}><Rocket size={20} /></div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{proj.name}</p>
                  {proj.url && <a href={proj.url} target="_blank" rel="noreferrer" style={{ color: "#F26522", display: "flex", alignItems: "center" }}><ExternalLink size={13} /></a>}
                </div>
                {proj.associatedWith && <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Associated with {proj.associatedWith}</p>}
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
      {profile.languages.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Globe size={18} />} title="Languages" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {profile.languages.map((lang, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.08)" }}>
                  <Globe size={16} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: "#1A1A1A", fontSize: 14, margin: 0 }}>{lang.name}</p>
                  <span style={{ fontSize: 12, color: "#9CA3AF" }}>{lang.proficiency}</span>
                </div>
              </div>
            ))}
          </div>
        </ViewCard>
      )}

      {/* Volunteer */}
      {profile.volunteer.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<HeartHandshake size={18} />} title="Volunteer Experience" />
          {profile.volunteer.map((vol, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.volunteer.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EC4899", border: "1px solid rgba(236,72,153,0.08)" }}><HeartHandshake size={20} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{vol.role}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{vol.organization}{vol.cause && ` · ${vol.cause}`}</p>
                {vol.description && <p style={{ color: "#4B5563", fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>{vol.description}</p>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Publications */}
      {profile.publications.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<FileText size={18} />} title="Publications" />
          {profile.publications.map((p: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.publications.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EA580C", border: "1px solid rgba(234,88,12,0.08)" }}><FileText size={20} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{p.title}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{p.publisher}</p>
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#F26522", fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}><ExternalLink size={12} /> View</a>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Honors */}
      {profile.honors.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Medal size={18} />} title="Honors & Awards" />
          {profile.honors.map((h: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: i < profile.honors.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #FEFCE8 0%, #FEF3C7 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706", border: "1px solid rgba(217,119,6,0.08)" }}><Medal size={20} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>{h.title}</p>
                <p style={{ color: "#6B7280", fontSize: 14, margin: "2px 0" }}>{h.issuer}</p>
                {h.date && <p style={{ color: "#9CA3AF", fontSize: 12 }}>{h.date}</p>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Courses */}
      {profile.courses.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<BookOpen size={18} />} title="Courses" />
          {profile.courses.map((c: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: i < profile.courses.length - 1 ? "1px solid #F3F4F6" : "none", alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669", border: "1px solid rgba(5,150,105,0.08)" }}><BookOpen size={18} /></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "#1A1A1A", fontSize: 14, margin: 0 }}>{c.name}</p>
                {c.number && <p style={{ color: "#6B7280", fontSize: 13, margin: "2px 0" }}>#{c.number}</p>}
                {c.associatedWith && <p style={{ color: "#9CA3AF", fontSize: 12 }}>{c.associatedWith}</p>}
              </div>
            </div>
          ))}
        </ViewCard>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <ViewCard>
          <ViewSectionTitle icon={<Sparkles size={18} />} title="Interests" subtitle="Auto-extracted" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {interests.map((interest, i) => <SkillTag key={i} label={interest} />)}
          </div>
        </ViewCard>
      )}

      {/* If profile is empty, show CTA */}
      {!profile.summary && profile.experience.length === 0 && profile.education.length === 0 && profile.skills.length === 0 && (
        <div style={{
          background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)", borderRadius: 16, border: "1px dashed #BFDBFE",
          padding: "50px 32px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          marginBottom: 20,
        }}>
          <div style={{ width: 64, height: 64, background: "#DBEAFE", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <User size={32} color="#2563EB" />
          </div>
          <h3 className="section-title" style={{ marginTop: 0 }}>Complete your profile</h3>
          <p style={{ color: "#64748B", fontSize: 15, maxWidth: 450, margin: "8px auto 24px", lineHeight: 1.6 }}>
            A complete profile helps you stand out to companies, investors, and potential partners. Add your experience, skills, and projects now!
          </p>
          <button onClick={() => setIsEditing(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 8, fontWeight: 600, fontSize: 15, background: "#0A66C2", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(10, 102, 194, 0.3)" }} onMouseEnter={e => e.currentTarget.style.background = "#004182"} onMouseLeave={e => e.currentTarget.style.background = "#0A66C2"}>
            <Pencil size={16} color="#fff" /> Start Editing
          </button>
        </div>
      )}

      <AiAssistPanel token={token} />
    </div>
  );
}


// ─── REUSABLE COMPONENTS ────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)", borderRadius: 24,
  border: "1px solid var(--border)",
  padding: 28,
};

function ViewCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
      {children}
    </div>
  );
}

function ViewSectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border-inner)" }}>
      <div style={{ color: "var(--brand-primary)" }}>{icon}</div>
      <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
      {subtitle && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>· {subtitle}</span>}
    </div>
  );
}

function FormSectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid var(--border-inner)" }}>
      <div style={{ color: "var(--brand-primary)" }}>{icon}</div>
      <h3 className="section-title" style={{ margin: 0 }}>{title}</h3>
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
      display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s",
    }}>
      <ExternalLink size={11} /> {label}
    </a>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        background: "none", border: "1px dashed #D1D5DB", borderRadius: 10,
        padding: "12px 20px", cursor: "pointer", color: "#6B7280",
        fontSize: 13, fontWeight: 600, width: "100%",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "all 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#F26522"; e.currentTarget.style.color = "#F26522"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#D1D5DB"; e.currentTarget.style.color = "#6B7280"; }}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

import { forwardRef } from "react";

const EditGenericSection = forwardRef<HTMLDivElement, any>(({ icon, title, section, profile, updateArrayItem, removeItem, addItem, fields, template }, ref) => {
  const items: any[] = profile[section] || [];
  return (
    <div ref={ref} style={cardStyle}>
      <FormSectionTitle icon={icon} title={title} />
      {items.map((item: any, i: number) => (
        <div key={i} style={{ padding: "16px", background: "#FAFAFA", borderRadius: 12, border: "1px solid #F3F4F6", marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {fields.map((f: any) => (
              <div key={f.key} className="form-group" style={f.multiline ? { gridColumn: "1 / -1" } : {}}>
                <label className="form-label">{f.label}</label>
                {f.multiline
                  ? <textarea className="form-input" value={item[f.key] || ""} onChange={e => updateArrayItem(section, i, f.key, e.target.value)} rows={2} />
                  : <input className="form-input" value={item[f.key] || ""} onChange={e => updateArrayItem(section, i, f.key, e.target.value)} />}
              </div>
            ))}
          </div>
          <button onClick={() => removeItem(section, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}><Trash2 size={13} /> Remove</button>
        </div>
      ))}
      <AddButton label={`Add ${title.replace(/ & .*/, "")}`} onClick={() => addItem(section, template)} />
    </div>
  );
});
