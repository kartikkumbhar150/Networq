import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { Building2, Calendar, Flag, MapPin, Users, CheckCircle, AlertTriangle, Play, Camera, Mail, Trash2 } from "lucide-react";

export function meta() {
  return [{ title: "Event Details – HireX" }];
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface IUser { id: string; name: string; accountType: string; }
interface Stats { registrationCount: number; checkInCount: number; fullAttendees: number; attendancePct: string; }
interface IEvent {
  _id: string; title: string; description: string; venue: string;
  date: string; endDate: string; capacity: number; ticketPrice: number;
  status: string; escrowAmount: number; attendanceThreshold: number;
  organizerId: { _id: string; name: string; email: string; isVerifiedCompany: boolean; companyDetails?: { companyName: string } };
}
interface Registration {
  _id: string;
  userId: { name: string; email: string };
  checkIn?: string; checkOut?: string;
  paymentStatus: string; status: string; amountPaid: number;
}

const STATUS_COLORS: Record<string, string> = {
  published: "#6366f1", ongoing: "#10b981", completed: "#64748b",
  cancelled: "#ef4444", postponed: "#f59e0b", refunded: "#f87171",
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<IUser | null>(null);
  const [event, setEvent] = useState<IEvent | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [postponeDate, setPostponeDate] = useState("");
  const [postponeEndDate, setPostponeEndDate] = useState("");
  const [showPostponeForm, setShowPostponeForm] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    loadEvent();
  }, [id]);

  async function loadEvent() {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API}/api/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { navigate("/events"); return; }
      setEvent(data.event);
      setStats(data.stats);
      setLoading(false);

      // Load registrations if organizer
      const u = localStorage.getItem("user");
      if (u) {
        const parsedUser = JSON.parse(u);
        if (parsedUser.accountType === "company" && data.event.organizerId._id === parsedUser.id) {
          const regRes = await fetch(`${API}/api/events/${id}/registrations`, { headers: { Authorization: `Bearer ${token}` } });
          const regData = await regRes.json();
          if (regRes.ok) setRegistrations(regData.registrations || []);
        }
      }
    } catch { setLoading(false); }
  }

  async function doAction(action: string, extra?: object) {
    if (!token || !id) return;
    setActionLoading(action);
    setFeedback(null);
    try {
      let url = `${API}/api/events/${id}/${action}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(extra || {}),
      });
      const data = await res.json();
      setFeedback({ msg: data.message, ok: res.ok });
      if (res.ok) loadEvent();
    } catch { setFeedback({ msg: "Connection error.", ok: false }); }
    setActionLoading("");
  }

  async function sendQRBlast(type: "checkin" | "checkout") {
    if (!token || !id) return;
    setActionLoading(`qr_${type}`);
    setFeedback(null);
    try {
      const res = await fetch(`${API}/api/registrations/events/${id}/send-qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setFeedback({ msg: data.message, ok: res.ok });
    } catch { setFeedback({ msg: "Connection error.", ok: false }); }
    setActionLoading("");
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-base)" }}><div className="spinner" /></div>;
  if (!event) return null;

  const isOrganizer = user?.accountType === "company" && event.organizerId._id === user.id;
  const companyName = event.organizerId.companyDetails?.companyName || event.organizerId.name;
  const attendancePct = parseFloat(stats?.attendancePct || "0");
  const willRelease = attendancePct >= event.attendanceThreshold;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      {/* Back */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/events" className="btn btn-ghost btn-sm">← All Events</Link>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`alert ${feedback.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          {feedback.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} <span>{feedback.msg}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
        {/* ─── Left: Event Info ─── */}
        <div>
          <div className="glass-card" style={{ padding: 32, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, textTransform: "uppercase",
                  background: `${STATUS_COLORS[event.status]}20`, color: STATUS_COLORS[event.status],
                  border: `1px solid ${STATUS_COLORS[event.status]}40`, marginBottom: 10, display: "inline-block"
                }}>{event.status}</span>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, marginTop: 6 }}>{event.title}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex" }}><Building2 size={13} /></span><strong>{companyName}</strong>
                  {event.organizerId.isVerifiedCompany && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>
                  {event.ticketPrice === 0 ? "Free" : `₹${event.ticketPrice}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>per ticket</div>
              </div>
            </div>

            <p style={{ color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 24 }}>{event.description}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Start", value: new Date(event.date).toLocaleString("en-IN"), icon: <Calendar size={11} /> },
                { label: "End", value: new Date(event.endDate).toLocaleString("en-IN"), icon: <Flag size={11} /> },
                { label: "Venue", value: event.venue, icon: <MapPin size={11} /> },
                { label: "Capacity", value: `${stats?.registrationCount || 0} / ${event.capacity} registered`, icon: <Users size={11} /> },
              ].map(item => (
                <div key={item.label} style={{ padding: "12px 16px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>{item.icon} {item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Attendance Tracker (organizer) ─── */}
          {isOrganizer && stats && (
            <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Live Attendance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Registered", value: stats.registrationCount, color: "#6366f1" },
                  { label: "Checked In", value: stats.checkInCount, color: "#10b981" },
                  { label: "Full Participation", value: stats.fullAttendees, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center", padding: 16, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Attendance Rate</span>
                  <span style={{ fontWeight: 700, color: willRelease ? "#10b981" : "#ef4444" }}>{attendancePct}%</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-layer, #1a1a2e)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(attendancePct, 100)}%`, height: "100%", background: willRelease ? "#10b981" : "#ef4444", borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Threshold: {event.attendanceThreshold}%</span>
                </div>
              </div>

              <div style={{ padding: "12px 16px", borderRadius: 10, background: willRelease ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${willRelease ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, fontSize: 13, color: willRelease ? "#6ee7b7" : "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
                {willRelease ? <><CheckCircle size={14} /> On track to release ₹{event.escrowAmount} to you</> : <><AlertTriangle size={14} /> Below threshold — refunds will be issued automatically</>}
              </div>
            </div>
          )}

          {/* ─── Registrations Table (organizer) ─── */}
          {isOrganizer && registrations.length > 0 && (
            <div className="glass-card" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Registrations ({registrations.length})</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Attendee", "Check-In", "Check-Out", "Payment", "Status"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map(reg => (
                      <tr key={reg._id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{reg.userId.name}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{reg.userId.email}</div>
                        </td>
                        <td style={{ padding: "10px 12px", color: reg.checkIn ? "#6ee7b7" : "var(--text-muted)" }}>
                          {reg.checkIn ? new Date(reg.checkIn).toLocaleTimeString() : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", color: reg.checkOut ? "#f59e0b" : "var(--text-muted)" }}>
                          {reg.checkOut ? new Date(reg.checkOut).toLocaleTimeString() : "—"}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: reg.paymentStatus === "held" ? "rgba(242,101,34,0.10)" : reg.paymentStatus === "released" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: reg.paymentStatus === "held" ? "var(--accent-from)" : reg.paymentStatus === "released" ? "#6ee7b7" : "#fca5a5" }}>
                            {reg.paymentStatus} · ₹{reg.amountPaid}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{reg.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: Actions Sidebar ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Organizer Controls</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {event.status === "published" && (
                  <button className="btn btn-primary btn-sm" onClick={() => doAction("start")} disabled={!!actionLoading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {actionLoading === "start" ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Starting…</> : <><Play size={14} /> Start Event</>}
                  </button>
                )}

                <Link to={`/events/${id}/scan`} className="btn btn-outline btn-sm" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Camera size={14} /> Open QR Scanner
                </Link>

                {["published", "ongoing"].includes(event.status) && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => sendQRBlast("checkin")} disabled={!!actionLoading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {actionLoading === "qr_checkin" ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : <><Mail size={14} /> Blast Check-In QR</>}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => sendQRBlast("checkout")} disabled={!!actionLoading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      {actionLoading === "qr_checkout" ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : <><Mail size={14} /> Blast Check-Out QR</>}
                    </button>
                  </>
                )}

                {event.status === "published" && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPostponeForm(!showPostponeForm)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Calendar size={14} /> Postpone Event
                    </button>
                    {showPostponeForm && (
                      <div style={{ padding: 16, background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
                        <div className="form-group" style={{ marginBottom: 10 }}>
                          <label className="form-label">New Start Date</label>
                          <input type="datetime-local" className="form-input" value={postponeDate} onChange={e => setPostponeDate(e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 10 }}>
                          <label className="form-label">New End Date</label>
                          <input type="datetime-local" className="form-input" value={postponeEndDate} onChange={e => setPostponeEndDate(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ width: "100%" }}
                          onClick={() => { doAction("postpone", { newDate: new Date(postponeDate).toISOString(), newEndDate: new Date(postponeEndDate).toISOString() }); setShowPostponeForm(false); }}
                          disabled={!postponeDate || !postponeEndDate}>
                          Confirm Postpone
                        </button>
                      </div>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ width: "100%", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      onClick={() => { if (confirm("Cancel this event? All attendees will be refunded.")) doAction("cancel"); }}>
                      <Trash2 size={14} /> Cancel Event
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Escrow Status */}
          {isOrganizer && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Escrow</h3>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#6ee7b7", marginBottom: 4 }}>₹{event.escrowAmount}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>held in escrow · auto-settles 1 min after event ends</div>
            </div>
          )}

          {/* User: Register */}
          {!isOrganizer && user?.accountType === "user" && ["published", "ongoing"].includes(event.status) && (
            <div className="glass-card" style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {event.ticketPrice === 0 ? "Free Entry" : `₹${event.ticketPrice}`}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>held securely in escrow</div>
              <Link to="/events" className="btn btn-primary" style={{ width: "100%" }}>Register on Events Page</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
