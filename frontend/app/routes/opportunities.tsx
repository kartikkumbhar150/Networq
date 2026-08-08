import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Building, Briefcase, DollarSign, Handshake, CheckCircle2, Plus, X,
  Sparkles, Send, Search, Clock, Users, MessageSquare, Bot,
  Loader2, Shield, Phone, Mail, Zap
} from "lucide-react";

export function meta() {
  return [
    { title: "Opportunities – HireX" },
    { name: "description", content: "Find jobs, partnerships, and investment deals." },
  ];
}

const API = "http://localhost:5000";

interface User {
  id: string;
  name: string;
  email: string;
  accountType: string;
  isVerifiedCompany?: boolean;
}

interface Opportunity {
  _id: string;
  pillar: "capital" | "procurement" | "alliance";
  type: string;
  title: string;
  description: string;
  requirements: string[];
  companyId: {
    _id: string;
    companyDetails?: { companyName: string };
    name: string;
    isVerifiedCompany: boolean;
    profile?: { profilePhoto?: string; website?: string };
  };
  status: string;
  fundingAmount?: number;
  equityOffered?: number;
  valuation?: number;
  dataRoomUrl?: string;
  budget?: number;
  biddingType?: string;
  allianceType?: string;
  synergyTags?: string[];
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

// Simplified tab labels
const TABS = [
  { id: "procurement", icon: <Briefcase size={16} />, label: "Jobs & Gigs", desc: "Full-time, freelance, internships" },
  { id: "capital", icon: <DollarSign size={16} />, label: "Funding", desc: "Seed rounds, Series A-C" },
  { id: "alliance", icon: <Handshake size={16} />, label: "Partnerships", desc: "Joint ventures & collaborations" },
] as const;

// Pillar badge colors
const PILLAR_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  procurement: { bg: "rgba(242,101,34,0.08)", color: "#F26522", label: "Job / Gig" },
  capital:     { bg: "rgba(16,185,129,0.08)", color: "#10B981", label: "Funding" },
  alliance:    { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6", label: "Partnership" },
};

export default function Opportunities() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<"capital" | "procurement" | "alliance">("procurement");
  const [showForm, setShowForm] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  // AI Research Panel
  const [researchOpp, setResearchOpp] = useState<Opportunity | null>(null);
  const [researchResult, setResearchResult] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Detail modal
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);

  const [formData, setFormData] = useState<Partial<Opportunity> & { contactEmail?: string; contactPhone?: string }>({
    pillar: "procurement",
    title: "",
    description: "",
    requirements: [],
    contactEmail: "",
    contactPhone: "",
  });
  const [reqString, setReqString] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    fetchUserAndData(token);
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function fetchUserAndData(token: string) {
    try {
      const uRes = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!uRes.ok) throw new Error();
      const uData = await uRes.json();
      setUser(uData.user);

      const oRes = await fetch(`${API}/api/opportunities`, { headers: { Authorization: `Bearer ${token}` } });
      const oData = await oRes.json();
      setOpportunities(oData.opportunities || []);
      setLoading(false);
    } catch {
      navigate("/login");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          requirements: reqString.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ pillar: activeTab, title: "", description: "", requirements: [], contactEmail: "", contactPhone: "" });
        setReqString("");
        fetchUserAndData(token);
      }
    } catch (err) { console.error(err); }
  }

  async function chatWithPoster(opp: Opportunity) {
    if (!user) return;
    const token = localStorage.getItem("token");
    const posterId = opp.companyId._id;
    const posterName = opp.companyId.companyDetails?.companyName || opp.companyId.name;
    try {
      const res = await fetch(`${API}/api/chat/conversations/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiverId: posterId,
          receiverName: posterName,
          senderName: user.name,
        }),
      });
      if (res.ok) {
        navigate("/messages");
      }
    } catch (err) { console.error(err); }
  }

  // ─── AI Research ─────────────────────────────────────────────────────────
  async function startResearch(opp: Opportunity) {
    setResearchOpp(opp);
    setResearchResult("");
    setChatHistory([]);
    setResearchLoading(true);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/ai/company-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: opp.companyId.companyDetails?.companyName || opp.companyId.name,
          opportunityTitle: opp.title,
          opportunityDescription: opp.description,
          domain: opp.companyId.profile?.website || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResearchResult(data.research);
        setChatHistory([{ role: "assistant", content: data.research }]);
      } else {
        setResearchResult("Unable to generate research at this time.");
        setChatHistory([{ role: "assistant", content: "Sorry, I couldn't generate a research report right now. Please try again later." }]);
      }
    } catch {
      setResearchResult("Connection error.");
      setChatHistory([{ role: "assistant", content: "Connection error. Please try again." }]);
    }
    setResearchLoading(false);
  }

  async function askFollowUp() {
    if (!chatInput.trim() || !researchOpp) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatHistory(h => [...h, { role: "user", content: q }]);
    setResearchLoading(true);

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/ai/company-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: researchOpp.companyId.companyDetails?.companyName || researchOpp.companyId.name,
          opportunityTitle: researchOpp.title,
          opportunityDescription: researchOpp.description,
          domain: researchOpp.companyId.profile?.website || "",
          question: q,
        }),
      });
      const data = await res.json();
      setChatHistory(h => [...h, { role: "assistant", content: data.research || data.message || "No response." }]);
    } catch {
      setChatHistory(h => [...h, { role: "assistant", content: "Connection error." }]);
    }
    setResearchLoading(false);
  }

  async function askQuickQuestion(q: string) {
    if (!researchOpp) return;
    setChatInput("");
    setChatHistory(h => [...h, { role: "user", content: q }]);
    setResearchLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/api/ai/company-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: researchOpp.companyId.companyDetails?.companyName || researchOpp.companyId.name,
          opportunityTitle: researchOpp.title,
          opportunityDescription: researchOpp.description,
          domain: researchOpp.companyId.profile?.website || "",
          question: q,
        }),
      });
      const data = await res.json();
      setChatHistory(h => [...h, { role: "assistant", content: data.research || data.message || "No response." }]);
    } catch {
      setChatHistory(h => [...h, { role: "assistant", content: "Connection error." }]);
    }
    setResearchLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#9CA3AF" }}>Loading opportunities…</p>
        </div>
      </div>
    );
  }

  const isCompany = user?.accountType === "company";
  const filtered = (isCompany ? opportunities.filter(o => o.pillar === activeTab) : opportunities)
    .filter(o => !searchQ || o.title.toLowerCase().includes(searchQ.toLowerCase()) || (o.companyId.companyDetails?.companyName || o.companyId.name).toLowerCase().includes(searchQ.toLowerCase()));

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 80px" }}>

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {isCompany ? "Opportunities" : "Find Work"}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          {isCompany
            ? "Post jobs, raise funding, or find partners — all in one place."
            : "Browse jobs, freelance gigs, and internships from companies hiring now."}
        </p>
      </div>

      {/* ═══════════════════ SEARCH + CREATE ═══════════════════ */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", borderRadius: 12,
          background: "#fff", border: "1px solid #E5E7EB",
        }}>
          <Search size={16} color="#9CA3AF" />
          <input
            type="text" placeholder="Search by title or company…"
            value={searchQ} onChange={e => setSearchQ(e.target.value)}
            style={{
              flex: 1, border: "none", background: "none", outline: "none",
              fontSize: 14, color: "#1A1A1A", fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
        {isCompany && (
          <button
            onClick={() => { setShowForm(!showForm); setFormData(f => ({ ...f, pillar: activeTab })); }}
            style={{
              background: showForm ? "#fff" : "#F26522", color: showForm ? "#6B7280" : "#fff",
              border: showForm ? "1px solid #E5E7EB" : "none",
              padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
            }}
          >
            {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Post Opportunity</>}
          </button>
        )}
      </div>

      {/* ═══════════════════ TABS (Companies Only) ═══════════════════ */}
      {isCompany && !showForm && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 12,
                border: activeTab === tab.id ? "1px solid #F26522" : "1px solid #E5E7EB",
                background: activeTab === tab.id ? "#FFF7ED" : "#fff",
                color: activeTab === tab.id ? "#F26522" : "#6B7280",
                cursor: "pointer", fontSize: 14, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════════ CREATE FORM ═══════════════════ */}
      {showForm && isCompany && (
        <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 className="section-title" style={{ margin: "0 0 20px" }}>
            Create New Opportunity
          </h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input form-select" value={formData.pillar} onChange={e => setFormData({ ...formData, pillar: e.target.value as any })}>
                  <option value="procurement">Jobs & Gigs</option>
                  <option value="capital">Funding</option>
                  <option value="alliance">Partnerships</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <input className="form-input" placeholder="e.g. Full-time, Freelance, Seed Round" required
                  value={formData.type || ""} onChange={e => setFormData({ ...formData, type: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="What's the opportunity?" required
                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" placeholder="Describe the role, deal, or partnership in detail…" required rows={4}
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            {/* Dynamic fields */}
            {formData.pillar === "capital" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16, background: "#F9FAFB", borderRadius: 12 }}>
                <div className="form-group">
                  <label className="form-label">How much are you raising? ($)</label>
                  <input className="form-input" type="number" placeholder="500000"
                    onChange={e => setFormData({ ...formData, fundingAmount: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Equity offered (%)</label>
                  <input className="form-input" type="number" placeholder="10"
                    onChange={e => setFormData({ ...formData, equityOffered: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company valuation ($)</label>
                  <input className="form-input" type="number" placeholder="5000000"
                    onChange={e => setFormData({ ...formData, valuation: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data room link (optional)</label>
                  <input className="form-input" type="url" placeholder="https://drive.google.com/..."
                    onChange={e => setFormData({ ...formData, dataRoomUrl: e.target.value })} />
                </div>
              </div>
            )}

            {formData.pillar === "procurement" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16, background: "#F9FAFB", borderRadius: 12 }}>
                <div className="form-group">
                  <label className="form-label">Budget (optional, $)</label>
                  <input className="form-input" type="number" placeholder="5000"
                    onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment type</label>
                  <select className="form-input form-select" onChange={e => setFormData({ ...formData, biddingType: e.target.value })}>
                    <option value="">Select…</option>
                    <option value="fixed">Fixed Price</option>
                    <option value="milestone">Milestone Based</option>
                  </select>
                </div>
              </div>
            )}

            {formData.pillar === "alliance" && (
              <div style={{ padding: 16, background: "#F9FAFB", borderRadius: 12 }}>
                <div className="form-group">
                  <label className="form-label">Partnership type</label>
                  <input className="form-input" placeholder="e.g. Co-Marketing, API Integration, Joint Venture"
                    onChange={e => setFormData({ ...formData, allianceType: e.target.value })} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Skills / Tags (comma separated)</label>
              <input className="form-input" placeholder="React, Node.js, Marketing, Sales"
                value={reqString} onChange={e => setReqString(e.target.value)} />
            </div>

            {/* Contact Info */}
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Contact Information
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input className="form-input" type="email" placeholder="hiring@company.com"
                    value={formData.contactEmail || ""} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone (optional)</label>
                  <input className="form-input" type="tel" placeholder="+91 98765 43210"
                    value={formData.contactPhone || ""} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Publish
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════ OPP FEED ═══════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: 48, textAlign: "center", background: "#fff",
            borderRadius: 16, border: "1px dashed #E5E7EB",
          }}>
            <Briefcase size={32} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "#9CA3AF", fontSize: 14 }}>
              {searchQ ? "No results found. Try different keywords." : "No opportunities posted yet."}
            </p>
          </div>
        ) : (
          filtered.map(opp => {
            const companyName = opp.companyId.companyDetails?.companyName || opp.companyId.name;
            const pillar = PILLAR_STYLE[opp.pillar] || PILLAR_STYLE.procurement;

            return (
              <div key={opp._id} 
                className="glass-card"
                onClick={() => setDetailOpp(opp)}
                style={{ cursor: "pointer", padding: 24 }}
              >
                {/* Top row: company + pillar badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, overflow: "hidden",
                      background: "var(--bg-base)", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid var(--border)", flexShrink: 0,
                    }}>
                      {opp.companyId.profile?.profilePhoto
                        ? <img src={opp.companyId.profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <Building size={18} color="var(--text-muted)" />}
                    </div>
                    <div>
                      <h3 className="card-title" style={{ margin: 0, lineHeight: 1.3 }}>
                        {opp.title}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 13, color: "#6B7280", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#374151" }}>{companyName}</span>
                        {opp.companyId.isVerifiedCompany && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.08)", padding: "1px 6px", borderRadius: 4 }}>
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                        <span>·</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={12} /> {timeAgo(opp.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span style={{
                    padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: pillar.bg, color: pillar.color, whiteSpace: "nowrap",
                  }}>
                    {pillar.label}
                  </span>
                </div>

                {/* Description */}
                <p style={{ color: "#4B5563", fontSize: 14, lineHeight: 1.65, margin: "0 0 14px" }}>
                  {opp.description.length > 220 ? opp.description.slice(0, 220) + "…" : opp.description}
                </p>

                {/* Key metrics */}
                <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  {opp.fundingAmount && (
                    <MetricBadge icon={<DollarSign size={12} />} label={`$${(opp.fundingAmount / 1e6).toFixed(1)}M raising`} color="#10B981" />
                  )}
                  {opp.equityOffered && (
                    <MetricBadge icon={<Users size={12} />} label={`${opp.equityOffered}% equity`} color="#6366F1" />
                  )}
                  {opp.budget && (
                    <MetricBadge icon={<DollarSign size={12} />} label={`$${opp.budget.toLocaleString()} budget`} color="#F26522" />
                  )}
                  {opp.allianceType && (
                    <MetricBadge icon={<Handshake size={12} />} label={opp.allianceType} color="#8B5CF6" />
                  )}
                  {opp.biddingType && (
                    <MetricBadge icon={<Shield size={12} />} label={opp.biddingType === "milestone" ? "Milestone Pay" : "Fixed Price"} color="#0EA5E9" />
                  )}
                </div>

                {/* Contact info row */}
                {(opp.contactEmail || opp.contactPhone) && (
                  <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                    {opp.contactEmail && (
                      <a href={`mailto:${opp.contactEmail}`} 
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, color: "#6B7280", textDecoration: "none",
                          padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB",
                          background: "#F9FAFB", fontWeight: 500, transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#F26522"; e.currentTarget.style.color = "#F26522"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; }}
                      >
                        <Mail size={11} /> {opp.contactEmail}
                      </a>
                    )}
                    {opp.contactPhone && (
                      <a href={`tel:${opp.contactPhone}`} 
                        onClick={e => e.stopPropagation()}
                        style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 12, color: "#6B7280", textDecoration: "none",
                        padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB",
                        background: "#F9FAFB", fontWeight: 500, transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#F26522"; e.currentTarget.style.color = "#F26522"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; }}
                      >
                        <Phone size={11} /> {opp.contactPhone}
                      </a>
                    )}
                  </div>
                )}

                {/* Tags + Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {opp.requirements.slice(0, 4).map((req, i) => (
                      <span key={i} style={{
                        fontSize: 12, padding: "3px 10px", background: "#F3F4F6",
                        borderRadius: 6, color: "#6B7280", fontWeight: 500,
                      }}>
                        {req}
                      </span>
                    ))}
                    {opp.requirements.length > 4 && (
                      <span style={{ fontSize: 12, padding: "3px 8px", color: "#9CA3AF" }}>+{opp.requirements.length - 4}</span>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Chat Live button — hide if you are the poster */}
                    {user?.id !== opp.companyId._id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); chatWithPoster(opp); }}
                        style={{
                          background: "linear-gradient(135deg, #F26522, #E85D10)",
                          border: "none", padding: "6px 14px", borderRadius: 10,
                          fontSize: 13, fontWeight: 600, color: "#fff",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                          fontFamily: "'Inter', sans-serif", transition: "opacity 0.2s",
                          boxShadow: "0 2px 8px rgba(242,101,34,0.25)",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                      >
                        <Zap size={13} /> Chat Live
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); startResearch(opp); }}
                      style={{
                        background: "none", border: "1px solid #E5E7EB",
                        padding: "6px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                        fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#6B7280"; }}
                    >
                      <Sparkles size={13} /> Research
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════ DETAIL MODAL ═══════════════════ */}
      {detailOpp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}>
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setDetailOpp(null)}
          />

          {/* Modal */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 650,
            maxHeight: "85vh", background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column",
            animation: "modalPop 0.2s ease-out",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #E5E7EB",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, overflow: "hidden",
                  background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid #E5E7EB", flexShrink: 0,
                }}>
                  {detailOpp.companyId.profile?.profilePhoto
                    ? <img src={detailOpp.companyId.profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : <Building size={20} color="#9CA3AF" />}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A", margin: "0 0 4px", fontFamily: "'Outfit', sans-serif" }}>
                    {detailOpp.title}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280" }}>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{detailOpp.companyId.companyDetails?.companyName || detailOpp.companyId.name}</span>
                    {detailOpp.companyId.isVerifiedCompany && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "#3B82F6", background: "rgba(59,130,246,0.08)", padding: "1px 6px", borderRadius: 4 }}>
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    )}
                    <span>·</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={12} /> {timeAgo(detailOpp.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailOpp(null)} style={{
                background: "none", border: "none", cursor: "pointer", color: "#9CA3AF",
                padding: 4, borderRadius: 8,
              }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Pillar Badge */}
              <div>
                <span style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: PILLAR_STYLE[detailOpp.pillar]?.bg || "#F3F4F6", 
                  color: PILLAR_STYLE[detailOpp.pillar]?.color || "#374151",
                }}>
                  {PILLAR_STYLE[detailOpp.pillar]?.label || "Opportunity"} · {detailOpp.type}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: "0 0 8px", fontFamily: "'Outfit', sans-serif" }}>About this Opportunity</h4>
                <p style={{ color: "#4B5563", fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                  {detailOpp.description}
                </p>
              </div>

              {/* Metrics */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "16px", background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB" }}>
                {detailOpp.fundingAmount && (
                  <MetricBadge icon={<DollarSign size={14} />} label={`Raising: $${(detailOpp.fundingAmount).toLocaleString()}`} color="#10B981" />
                )}
                {detailOpp.equityOffered !== undefined && (
                  <MetricBadge icon={<Users size={14} />} label={`Equity: ${detailOpp.equityOffered}%`} color="#6366F1" />
                )}
                {detailOpp.valuation && (
                  <MetricBadge icon={<Building size={14} />} label={`Valuation: $${(detailOpp.valuation).toLocaleString()}`} color="#8B5CF6" />
                )}
                {detailOpp.budget && (
                  <MetricBadge icon={<DollarSign size={14} />} label={`Budget: $${detailOpp.budget.toLocaleString()}`} color="#F26522" />
                )}
                {detailOpp.allianceType && (
                  <MetricBadge icon={<Handshake size={14} />} label={`Type: ${detailOpp.allianceType}`} color="#8B5CF6" />
                )}
                {detailOpp.biddingType && (
                  <MetricBadge icon={<Shield size={14} />} label={detailOpp.biddingType === "milestone" ? "Milestone Based" : "Fixed Price"} color="#0EA5E9" />
                )}
              </div>

              {/* Requirements/Tags */}
              {detailOpp.requirements && detailOpp.requirements.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: "0 0 10px", fontFamily: "'Outfit', sans-serif" }}>Skills & Requirements</h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {detailOpp.requirements.map((req, i) => (
                      <span key={i} style={{
                        fontSize: 13, padding: "5px 12px", background: "#F3F4F6",
                        borderRadius: 8, color: "#4B5563", fontWeight: 500, border: "1px solid #E5E7EB"
                      }}>
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(detailOpp.contactEmail || detailOpp.contactPhone) && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", margin: "0 0 10px", fontFamily: "'Outfit', sans-serif" }}>Contact Details</h4>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {detailOpp.contactEmail && (
                      <a href={`mailto:${detailOpp.contactEmail}`} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 14, color: "#1A1A1A", textDecoration: "none",
                        padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
                        background: "#fff", fontWeight: 500, transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#F26522"; e.currentTarget.style.color = "#F26522"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#1A1A1A"; }}
                      >
                        <Mail size={14} color="#6B7280" /> {detailOpp.contactEmail}
                      </a>
                    )}
                    {detailOpp.contactPhone && (
                      <a href={`tel:${detailOpp.contactPhone}`} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        fontSize: 14, color: "#1A1A1A", textDecoration: "none",
                        padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
                        background: "#fff", fontWeight: 500, transition: "all 0.15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#F26522"; e.currentTarget.style.color = "#F26522"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#1A1A1A"; }}
                      >
                        <Phone size={14} color="#6B7280" /> {detailOpp.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: "16px 24px", borderTop: "1px solid #E5E7EB", background: "#FAFAFA",
              display: "flex", justifyContent: "flex-end", gap: 12, flexShrink: 0
            }}>
              <button
                onClick={() => { setDetailOpp(null); startResearch(detailOpp); }}
                style={{
                  background: "#fff", border: "1px solid #E5E7EB",
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; e.currentTarget.style.background = "#F5F3FF"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#fff"; }}
              >
                <Sparkles size={16} /> AI Research
              </button>

              {user?.id !== detailOpp.companyId._id && (
                <button
                  onClick={() => { setDetailOpp(null); chatWithPoster(detailOpp); }}
                  style={{
                    background: "linear-gradient(135deg, #F26522, #E85D10)",
                    border: "none", padding: "10px 24px", borderRadius: 10,
                    fontSize: 14, fontWeight: 600, color: "#fff",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    fontFamily: "'Inter', sans-serif", transition: "opacity 0.2s",
                    boxShadow: "0 4px 12px rgba(242,101,34,0.25)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <MessageSquare size={16} /> Chat with Poster
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ AI RESEARCH MODAL (Centered Window) ═══════════════════ */}
      {researchOpp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}>
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={() => setResearchOpp(null)}
          />

          {/* Modal Window */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 860,
            height: "min(85vh, 700px)",
            background: "#fff", borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            display: "flex", flexDirection: "column",
            animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            overflow: "hidden",
          }}>

            {/* ── Modal Header ── */}
            <div style={{
              padding: "18px 24px", borderBottom: "1px solid #E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0, background: "#fff",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(139,92,246,0.35)",
                }}>
                  <Bot size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                    AI Company Research
                  </h3>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>
                    Powered by Groq LLaMA 3.3 · <strong style={{ color: "#6B7280" }}>{researchOpp.companyId.companyDetails?.companyName || researchOpp.companyId.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setResearchOpp(null)} style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#F3F4F6", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6B7280", transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#E5E7EB")}
                onMouseLeave={e => (e.currentTarget.style.background = "#F3F4F6")}
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Two-column body ── */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* LEFT: Chat messages */}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
                borderRight: "1px solid #F3F4F6",
              }}>
                {/* Scrollable messages */}
                <div style={{
                  flex: 1, overflowY: "auto", padding: "20px 20px",
                  display: "flex", flexDirection: "column", gap: 16,
                }}>
                  {researchLoading && chatHistory.length === 0 && (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", height: "100%", gap: 14,
                    }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Loader2 size={24} color="#8B5CF6" className="spinner" />
                      </div>
                      <p style={{ fontSize: 14, color: "#6B7280", margin: 0, textAlign: "center" }}>
                        Researching <strong>{researchOpp.companyId.companyDetails?.companyName || researchOpp.companyId.name}</strong>…<br />
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Generating investor briefing</span>
                      </p>
                    </div>
                  )}

                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: msg.role === "user" ? "78%" : "100%",
                    }}>
                      {msg.role === "assistant" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Bot size={11} color="#fff" />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6", letterSpacing: 0.3 }}>HIREX AI</span>
                        </div>
                      )}
                      <div style={{
                        padding: "12px 16px", borderRadius: 14,
                        background: msg.role === "user"
                          ? "linear-gradient(135deg, #F26522, #E85D10)"
                          : "#F8F9FA",
                        color: msg.role === "user" ? "#fff" : "#374151",
                        fontSize: 13, lineHeight: 1.75,
                        borderTopRightRadius: msg.role === "user" ? 4 : 14,
                        borderTopLeftRadius: msg.role === "assistant" ? 4 : 14,
                        border: msg.role === "assistant" ? "1px solid #E5E7EB" : "none",
                        boxShadow: msg.role === "user" ? "0 2px 8px rgba(242,101,34,0.2)" : "none",
                      }}>
                        {msg.content.split("\n").map((line, li) => {
                          if (line.startsWith("## ")) return <p key={li} style={{ fontWeight: 700, fontSize: 14, margin: "10px 0 4px", color: "#1A1A1A" }}>{line.replace("## ", "")}</p>;
                          if (line.startsWith("**") && line.endsWith("**")) return <p key={li} style={{ fontWeight: 600, margin: "3px 0" }}>{line.replace(/\*\*/g, "")}</p>;
                          if (line.startsWith("- ")) return <p key={li} style={{ margin: "2px 0", paddingLeft: 10 }}>• {line.replace("- ", "")}</p>;
                          if (line.trim() === "") return <br key={li} />;
                          return <span key={li}>{line}<br /></span>;
                        })}
                      </div>
                    </div>
                  ))}

                  {researchLoading && chatHistory.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={13} color="#8B5CF6" className="spinner" />
                      <span style={{ fontSize: 13, color: "#9CA3AF" }}>Thinking…</span>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div style={{
                  padding: "12px 16px", borderTop: "1px solid #E5E7EB",
                  display: "flex", gap: 8, alignItems: "center",
                  background: "#FAFAFA", flexShrink: 0,
                }}>
                  <input
                    type="text" placeholder="Ask anything about this company…"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askFollowUp()}
                    disabled={researchLoading}
                    style={{
                      flex: 1, padding: "9px 14px", borderRadius: 10,
                      border: "1px solid #E5E7EB", background: "#fff",
                      fontSize: 14, outline: "none", color: "#1A1A1A",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                  <button
                    onClick={askFollowUp}
                    disabled={researchLoading || !chatInput.trim()}
                    style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: chatInput.trim() ? "#8B5CF6" : "#E5E7EB",
                      border: "none", cursor: chatInput.trim() ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.2s",
                    }}
                  >
                    <Send size={15} color="#fff" />
                  </button>
                </div>
              </div>

              {/* RIGHT: Context + Quick Questions */}
              <div style={{
                width: 240, flexShrink: 0, padding: "20px 18px",
                display: "flex", flexDirection: "column", gap: 18,
                background: "#FAFAFA", overflowY: "auto",
              }}>
                {/* Opportunity info */}
                <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, overflow: "hidden",
                      background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid #E5E7EB", flexShrink: 0,
                    }}>
                      {researchOpp.companyId.profile?.profilePhoto
                        ? <img src={researchOpp.companyId.profile.profilePhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <Building size={16} color="#9CA3AF" />}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {researchOpp.companyId.companyDetails?.companyName || researchOpp.companyId.name}
                      </p>
                      {researchOpp.companyId.isVerifiedCompany && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", display: "flex", alignItems: "center", gap: 3 }}>
                          <CheckCircle2 size={9} /> Verified Company
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: "0 0 4px", lineHeight: 1.4 }}>{researchOpp.title}</p>
                  <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>{researchOpp.type} · {timeAgo(researchOpp.createdAt)}</p>
                </div>

                {/* Quick Questions */}
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", margin: "0 0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Quick Questions
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      "What are the main risks?",
                      "Who are the competitors?",
                      "Is this a good investment?",
                      "What's their estimated revenue?",
                      "What's the market size?",
                      "Who are the founders?",
                    ].map(q => (
                      <button key={q} onClick={() => askQuickQuestion(q)}
                        disabled={researchLoading}
                        style={{
                          fontSize: 12, padding: "8px 12px", borderRadius: 8, textAlign: "left",
                          border: "1px solid #E5E7EB", background: "#fff", color: "#374151",
                          cursor: researchLoading ? "not-allowed" : "pointer",
                          fontWeight: 500, transition: "all 0.15s", lineHeight: 1.4,
                          opacity: researchLoading ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!researchLoading) { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; e.currentTarget.style.background = "#F5F3FF"; } }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "#fff"; }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI disclaimer */}
                <p style={{ fontSize: 10, color: "#C4C9D4", lineHeight: 1.5, marginTop: "auto" }}>
                  AI responses are generated by Groq LLaMA and may not always be 100% accurate. Verify critical information independently before making investment decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL ANIMATION CSS ═══════════════════ */}
      <style>{`
        @keyframes modalPop {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
      background: `${color}10`, color, border: `1px solid ${color}15`,
    }}>
      {icon} {label}
    </span>
  );
}
