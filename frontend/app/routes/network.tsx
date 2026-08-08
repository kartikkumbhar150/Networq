import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Search, UserPlus, Users, Clock, X, MessageSquare, UserCheck, UserX, ChevronRight } from "lucide-react";
import UserCard from "../components/UserCard";
import ConnectionRequestCard from "../components/ConnectionRequestCard";

export function meta() {
  return [
    { title: "My Network – HireX" },
    { name: "description", content: "Manage your professional network and discover new connections." },
  ];
}

const API = "http://localhost:5000";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type TabKey = "connections" | "invitations" | "discover";

export default function Network() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [initLoading, setInitLoading] = useState(true);

  // ─── Connections state ───
  const [connections, setConnections] = useState<any[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);

  // ─── Pending requests state ───
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // ─── Search / Discover state ───
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ─── Tab state ───
  const [activeTab, setActiveTab] = useState<TabKey>("connections");

  // ─── Init ───
  useEffect(() => {
    async function initUser() {
      let u = JSON.parse(localStorage.getItem("user") || "{}");
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
      await Promise.all([fetchConnections(u.id), fetchPendingRequests(u.id)]);
      setInitLoading(false);
    }
    initUser();
  }, []);

  // ─── Fetch connections ───
  async function fetchConnections(userId: string) {
    setConnectionsLoading(true);
    try {
      const res = await fetch(`${API}/api/connections/${userId}/list`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        const adapted = data.connections.map((c: any) => ({
          ...c,
          connectionStatus: 'accepted'
        }));
        setConnections(adapted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConnectionsLoading(false);
    }
  }

  // ─── Fetch pending requests ───
  async function fetchPendingRequests(userId: string) {
    try {
      const res = await fetch(`${API}/api/connections/${userId}/pending`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) setPendingRequests(data.pendingRequests);
    } catch (e) {
      console.error(e);
    }
  }

  // ─── Search users ───
  const doSearch = useCallback(async (q: string) => {
    setSearchLoading(true);
    try {
      const res = await fetch(`${API}/api/users/search?query=${encodeURIComponent(q)}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setSearchUsers(data.users);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === "discover") {
      doSearch(debouncedQuery);
    }
  }, [debouncedQuery, doSearch, user, activeTab]);

  // ─── Connection actions ───
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
        setSearchUsers(searchUsers.map(u => u.userId === targetId ? { ...u, connectionStatus: 'pending', connectionDirection: 'sent', connectionId: data.connectionId } : u));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleWithdraw(targetId: string, connectionId: string) {
    try {
      const res = await fetch(`${API}/api/connections/${connectionId}/withdraw`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setSearchUsers(searchUsers.map(u => u.userId === targetId ? { ...u, connectionStatus: 'none', connectionId: null } : u));
      }
    } catch (e) { console.error(e); }
  }

  async function handleAccept(connectionId: string) {
    try {
      const res = await fetch(`${API}/api/connections/${connectionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ action: 'accept' })
      });
      if (res.ok) {
        setPendingRequests(pendingRequests.filter(r => r._id !== connectionId));
        setSearchUsers(searchUsers.map(u => u.connectionId === connectionId ? { ...u, connectionStatus: 'accepted' } : u));
        if (user) fetchConnections(user.id);
      }
    } catch (e) { console.error(e); }
  }

  async function handleReject(connectionId: string) {
    try {
      const res = await fetch(`${API}/api/connections/${connectionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ action: 'reject' })
      });
      if (res.ok) {
        setPendingRequests(pendingRequests.filter(r => r._id !== connectionId));
        setSearchUsers(searchUsers.map(u => u.connectionId === connectionId ? { ...u, connectionStatus: 'none', connectionId: null } : u));
      }
    } catch (e) { console.error(e); }
  }

  async function handleDisconnect(targetId: string, connectionId: string) {
    if (!confirm("Remove this connection?")) return;
    try {
      const res = await fetch(`${API}/api/connections/${connectionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        setConnections(connections.filter(c => c.connectionId !== connectionId));
      }
    } catch (e) { console.error(e); }
  }

  // ─── Loading state ───
  if (initLoading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: "connections", label: "My Network", icon: <Users size={16} />, count: connections.length },
    { key: "invitations", label: "Invitations", icon: <Clock size={16} />, count: pendingRequests.length },
    { key: "discover", label: "Discover People", icon: <UserPlus size={16} /> },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          My Network
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
          {connections.length} connections · {pendingRequests.length} pending
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 32, borderBottom: "1px solid #EBEBEB", marginBottom: 28 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0 0 12px", fontSize: 14, fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--accent-from)" : "2px solid transparent",
              transition: "color 0.15s, border-color 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 6px",
                borderRadius: 99,
                background: activeTab === tab.key ? "var(--accent-from)" : "#EBEBEB",
                color: activeTab === tab.key ? "#FFFFFF" : "var(--text-muted)",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── MY CONNECTIONS ─── */}
      {activeTab === "connections" && (
        <div>
          {connectionsLoading ? (
            <div style={{ display: "grid", placeItems: "center", padding: 80 }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            </div>
          ) : connections.length === 0 ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <Users size={32} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                No connections yet
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 320, margin: "0 auto 20px" }}>
                Start building your network by discovering people.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("discover")}>
                Discover People
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {connections.map(c => (
                <div key={c.connectionId} style={{ position: "relative" }}>
                  <UserCard
                    user={c}
                    currentUserId={user.id}
                    onConnect={() => {}}
                    onAccept={() => {}}
                    onReject={() => {}}
                    onWithdraw={() => {}}
                  />
                  <button
                    onClick={() => handleDisconnect(c.userId, c.connectionId)}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: "#FFFFFF", color: "var(--text-muted)",
                      border: "1px solid #EBEBEB",
                      width: 26, height: 26, borderRadius: "50%",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "#FEF2F2";
                      e.currentTarget.style.color = "#EF4444";
                      e.currentTarget.style.borderColor = "#FECACA";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.borderColor = "#EBEBEB";
                    }}
                    title="Remove Connection"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── INVITATIONS ─── */}
      {activeTab === "invitations" && (
        <div>
          {pendingRequests.length === 0 ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <Clock size={32} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                No pending invitations
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320, margin: "0 auto" }}>
                Connection requests you receive will appear here.
              </p>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{
                padding: "16px 20px", borderBottom: "1px solid #EBEBEB",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <h4 className="card-title" style={{ margin: 0 }}>
                  Pending Invitations
                </h4>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {pendingRequests.length}
                </span>
              </div>
              <div style={{ padding: "8px 12px" }}>
                {pendingRequests.map(req => (
                  <ConnectionRequestCard
                    key={req._id}
                    request={req}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── DISCOVER PEOPLE ─── */}
      {activeTab === "discover" && (
        <div>
          {/* Search */}
            <div className="glass-card" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px", marginBottom: 24,
            }}>
            <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by name, role, or company..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "var(--text-primary)", fontFamily: "'Inter', sans-serif",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", display: "flex", alignItems: "center", padding: 2,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Results */}
          {searchLoading ? (
            <div style={{ display: "grid", placeItems: "center", padding: 80 }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            </div>
          ) : searchUsers.length === 0 ? (
            <div style={{ padding: "80px 40px", textAlign: "center" }}>
              <Search size={32} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                {query ? `No results for "${query}"` : "Find people"}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320, margin: "0 auto" }}>
                {query ? "Try a different search." : "Search by name, role, or company."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {searchUsers.map(u => (
                <UserCard
                  key={u.userId}
                  user={u}
                  currentUserId={user.id}
                  onConnect={handleConnect}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onWithdraw={handleWithdraw}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
