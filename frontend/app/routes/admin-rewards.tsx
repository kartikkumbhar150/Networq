import { useEffect, useState } from "react";
import { Gift } from "lucide-react";

export function meta() {
  return [{ title: "Admin Rewards – HireX" }];
}

const API = "http://localhost:5000";

export default function AdminRewards() {
  const [logs, setLogs] = useState<any[]>([]);
  const [targetId, setTargetId] = useState("");
  const [giftName, setGiftName] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const res = await fetch(`${API}/api/rewards/transactions?admin=true`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {}
  }

  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Processing...");
    try {
      const res = await fetch(`${API}/api/rewards/admin/mega-gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ targetId, giftName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatus(data.message);
      setTargetId("");
      setGiftName("");
      fetchLogs();
    } catch(e: any) {
      setStatus(e.message || "Failed.");
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 32, fontWeight: 800 }}>Admin: Rewards Dashboard</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Award Mega Gifts and monitor all network transactions.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 32 }}>
        {/* Award Form */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#16a34a", display: "flex", alignItems: "center", gap: 8 }}><Gift size={18} /> Award Mega Gift</h3>
          <form onSubmit={handleAward} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="form-label">Target User ID</label>
              <input type="text" className="form-input" value={targetId} onChange={e => setTargetId(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Gift Description</label>
              <input type="text" className="form-input" placeholder="e.g. iPhone 15 Pro Max" value={giftName} onChange={e => setGiftName(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ background: "#16a34a", borderColor: "#16a34a" }}>Award Gift</button>
            {status && <div style={{ fontSize: 13, fontWeight: 600, color: status.includes("failed") ? "var(--error)" : "var(--accent-from)" }}>{status}</div>}
          </form>
        </div>

        {/* Global Logs */}
        <div className="glass-card" style={{ padding: 24, overflow: "hidden" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Global Transaction Ledger</h3>
          <div style={{ height: 300, overflowY: "auto" }}>
            {logs.map((log: any) => (
              <div key={log._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{log.description}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>User: {log.userId} · {new Date(log.createdAt).toLocaleString()} · {log.type.toUpperCase()}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: log.amount > 0 ? "#16a34a" : log.amount < 0 ? "var(--error)" : "var(--accent-from)" }}>
                   {log.amount > 0 ? "+" : ""}{log.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
