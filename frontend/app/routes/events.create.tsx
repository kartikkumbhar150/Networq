import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { AlertTriangle, Lightbulb } from "lucide-react";

export function meta() {
  return [{ title: "Create Event – HireX" }];
}

const API = "http://13.206.69.62:5000";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [threshold, setThreshold] = useState("70");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (!token || !u) { navigate("/login"); return; }
    const user = JSON.parse(u);
    if (user.accountType !== "company") navigate("/events");
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, venue,
          date: new Date(date).toISOString(),
          endDate: new Date(endDate).toISOString(),
          capacity: Number(capacity),
          ticketPrice: Number(ticketPrice),
          attendanceThreshold: Number(threshold),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to create event."); return; }
      navigate(`/events/${data.event._id}`);
    } catch {
      setError("Connection error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <Link to="/events" className="btn btn-ghost btn-sm">← Back</Link>
        <div>
          <h1 className="dashboard-title">Create Event</h1>
          <p className="dashboard-subtitle">Set up a new event. Attendee payments are held in escrow.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={16} /> {error}</div>}

      <form className="glass-card" onSubmit={handleSubmit} style={{ padding: 36, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="form-group">
          <label className="form-label">Event Title *</label>
          <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Annual Tech Summit 2026" required />
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell attendees what this event is about…" required rows={4} />
        </div>

        <div className="form-group">
          <label className="form-label">Venue *</label>
          <input type="text" className="form-input" value={venue} onChange={e => setVenue(e.target.value)} placeholder="Bharat Mandapam, New Delhi" required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Start Date & Time *</label>
            <input type="datetime-local" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">End Date & Time *</label>
            <input type="datetime-local" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Capacity *</label>
            <input type="number" className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="200" min="1" required />
          </div>
          <div className="form-group">
            <label className="form-label">Ticket Price (₹) *</label>
            <input type="number" className="form-input" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} placeholder="0 for free" min="0" required />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Attendance Threshold for Escrow Release (%)</label>
          <input type="number" className="form-input" value={threshold} onChange={e => setThreshold(e.target.value)} min="1" max="100" />
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            If ≥{threshold}% of registrants have both check-in and check-out scans, funds are released to you. Otherwise, full refunds are issued automatically.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, padding: "16px", background: "rgba(242,101,34,0.04)", borderRadius: 12, border: "1px solid rgba(242,101,34,0.12)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <Lightbulb size={20} style={{ flexShrink: 0, color: "var(--accent-from)" }} />
          <div>
            <strong style={{ color: "var(--text-primary)" }}>Escrow Protection:</strong> All ticket payments are held in escrow until 1 minute after your event ends. Settlement is automatic based on QR attendance scans.
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
          {loading ? <><span className="spinner" /> Creating…</> : "Create Event →"}
        </button>
      </form>
    </div>
  );
}
