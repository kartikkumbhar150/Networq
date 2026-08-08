import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Building, Calendar, MapPin, Users, Coins, CheckCircle2, Ticket } from "lucide-react";

export function meta() {
  return [
    { title: "Events – HireX" },
    { name: "description", content: "Discover, register, and attend premium verified events." },
  ];
}

const API = "http://localhost:5000";

interface User {
  id: string;
  name: string;
  accountType: string;
  isVerifiedCompany?: boolean;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  venue: string;
  date: string;
  endDate: string;
  capacity: number;
  ticketPrice: number;
  status: string;
  escrowAmount: number;
  registrationCount: number;
  organizerId: {
    name: string;
    isVerifiedCompany: boolean;
    companyDetails?: { companyName: string };
    profile?: { profilePhoto?: string };
  };
}

const STATUS_COLORS: Record<string, string> = {
  published: "#6366f1",
  ongoing: "#10b981",
  completed: "#64748b",
  cancelled: "#ef4444",
  postponed: "#f59e0b",
  refunded: "#f87171",
};

export default function Events() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));

    fetch(`${API}/api/events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [navigate]);

  async function handleRegister(eventId: string) {
    const token = localStorage.getItem("token");
    if (!token) return;
    setRegistering(eventId);
    setFeedback(null);

    try {
      const res = await fetch(`${API}/api/registrations/events/${eventId}/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      setFeedback({ id: eventId, msg: data.message, ok: res.ok });
    } catch {
      setFeedback({ id: eventId, msg: "Connection error.", ok: false });
    } finally {
      setRegistering(null);
    }
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div className="spinner" /></div>;
  }

  const isCompanyOwner = user?.accountType === "company";

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 24px" }}>
      
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Industry Events
          </h1>
          <p style={{ marginTop: 8, fontSize: 16, color: "var(--text-secondary)", maxWidth: 500, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
            {isCompanyOwner
              ? "Host exclusive meetups, webinars, and conferences."
              : "Expand your network. Register for verified tech & business events."}
          </p>
        </div>
        {isCompanyOwner && (
          <Link to="/events/create" style={{
            background: "var(--text-primary)", color: "var(--bg-base)", textDecoration: "none",
            border: "none", padding: "12px 24px", borderRadius: "32px", fontSize: 14, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s"
          }}>
            <Calendar size={16} /> Create Event
          </Link>
        )}
      </div>

      {/* Feed Area */}
      {events.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: 24, border: "1px dashed var(--border)" }}>
          <Ticket size={32} style={{ opacity: 0.2, margin: "0 auto 16px" }} />
          No upcoming events scheduled right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {events.map((ev) => {
            const companyName = ev.organizerId?.companyDetails?.companyName || ev.organizerId?.name || "Unknown";
            const spotsLeft = ev.capacity - ev.registrationCount;
            const isFull = spotsLeft <= 0;
            const fb = feedback?.id === ev._id ? feedback : null;
            const eventDate = new Date(ev.date);

            return (
              <div key={ev._id} className="glass-card" style={{ 
                padding: "20px 24px", display: "flex", gap: 24, alignItems: "center",
                position: "relative", overflow: "hidden"
              }}>
                {/* Left Date Block */}
                <div style={{
                  width: 80, height: 80, flexShrink: 0, borderRadius: 16,
                  background: "var(--accent-light)", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", color: "var(--accent-from)"
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                    {eventDate.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
                    {eventDate.getDate()}
                  </span>
                </div>

                {/* Center Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h2 className="card-title" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <Link to={`/events/${ev._id}`} style={{ color: "inherit", textDecoration: "none" }}>{ev.title}</Link>
                    </h2>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 99, 
                      textTransform: "uppercase", background: `${STATUS_COLORS[ev.status]}15`, color: STATUS_COLORS[ev.status]
                    }}>
                      {ev.status}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{companyName}</span>
                    {ev.organizerId?.isVerifiedCompany && <CheckCircle2 size={13} color="#3b82f6" />}
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {ev.venue}</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={13} /> {eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {ev.description}
                  </p>

                  {fb && (
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: fb.ok ? "#10b981" : "#ef4444" }}>
                      {fb.ok ? "✓ " : "⚠ "} {fb.msg}
                    </div>
                  )}
                </div>

                {/* Right Action Block */}
                <div style={{ 
                  flexShrink: 0, width: 200, display: "flex", flexDirection: "column", 
                  alignItems: "flex-end", borderLeft: "1px dashed var(--border)", paddingLeft: 24
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                    {ev.ticketPrice === 0 ? "Free" : `₹${ev.ticketPrice.toLocaleString()}`}
                  </div>
                  
                  <div style={{ fontSize: 13, fontWeight: 600, color: isFull ? "#ef4444" : "var(--text-secondary)", marginBottom: 16 }}>
                    {isFull ? "Fully Booked" : `${spotsLeft} spots available`}
                  </div>

                  {!isCompanyOwner && ["published", "ongoing"].includes(ev.status) && !isFull && (
                    <button
                      onClick={() => handleRegister(ev._id)}
                      disabled={registering === ev._id}
                      style={{
                        background: registering === ev._id ? "var(--bg-layer)" : "var(--accent-from)",
                        color: registering === ev._id ? "var(--text-muted)" : "#fff",
                        border: "none", width: "100%", padding: "10px 0", borderRadius: "12px",
                        fontSize: 14, fontWeight: 600, cursor: registering === ev._id ? "wait" : "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {registering === ev._id ? "Processing..." : "Get Ticket"}
                    </button>
                  )}

                  {isCompanyOwner && (
                    <Link to={`/events/${ev._id}`} style={{
                      background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border)",
                      width: "100%", padding: "10px 0", borderRadius: "12px", fontSize: 14, fontWeight: 600,
                      cursor: "pointer", textAlign: "center", textDecoration: "none", transition: "all 0.2s"
                    }}>
                      Manage Event
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
