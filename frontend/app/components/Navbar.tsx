import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";

export default function Navbar() {
  const [user, setUser] = useState<{ name: string; accountType: string; isVerifiedCompany?: boolean } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (token && u) {
      setUser(JSON.parse(u));
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 48px" }}>
        <Link to="/" className="logo" style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: "var(--accent-from)", textDecoration: "none" }}>HireX</Link>
        <ul style={{ display: "flex", gap: 32, listStyle: "none", margin: 0, padding: 0 }}>
          <li>
            <Link to="/opportunities" style={{ fontFamily: "'Inter', sans-serif", color: location.pathname === "/opportunities" ? "var(--text-primary)" : "var(--text-secondary)", textDecoration: "none", fontWeight: 600, fontSize: 15, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === "/opportunities" ? "var(--text-primary)" : "var(--text-secondary)"}>
              Opportunities
            </Link>
          </li>
          {user && (
            <>
              <li>
                <Link to="/dashboard" style={{ fontFamily: "'Inter', sans-serif", color: location.pathname === "/dashboard" ? "var(--text-primary)" : "var(--text-secondary)", textDecoration: "none", fontWeight: 600, fontSize: 15, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === "/dashboard" ? "var(--text-primary)" : "var(--text-secondary)"}>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/network" style={{ fontFamily: "'Inter', sans-serif", color: location.pathname === "/network" ? "var(--text-primary)" : "var(--text-secondary)", textDecoration: "none", fontWeight: 600, fontSize: 15, transition: "color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"} onMouseLeave={(e) => e.currentTarget.style.color = location.pathname === "/network" ? "var(--text-primary)" : "var(--text-secondary)"}>
                  Network
                </Link>
              </li>
            </>
          )}
        </ul>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {user ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, padding: "6px 14px", background: "var(--bg-base)", borderRadius: 999, border: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.name}</span>
                {user.isVerifiedCompany && <span title="Verified Company" style={{ color: "var(--accent-from)", fontSize: 13, fontWeight: 800 }}>✓</span>}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 999,
                  background: "#F9F9F9", border: "1px solid #F9F9F9",
                  cursor: "pointer", fontSize: 13, fontWeight: 600,
                  color: "var(--text-secondary)",
                  transition: "all 0.15s", fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "var(--error)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F9F9F9"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
