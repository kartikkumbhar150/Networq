import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertTriangle } from "lucide-react";

export function meta() {
  return [
    { title: "Sign In – HireX" },
    { name: "description", content: "Sign in to your HireX account." },
  ];
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<"user" | "company">("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, loginType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        return;
      }

      // Store token in localStorage (feed will read it)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/feed");
    } catch {
      setError("Connection error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#F8F9FA" }}>

      <div className="glass-card" style={{ width: "100%", maxWidth: 420, padding: "48px 40px" }}>

        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: "var(--accent-from)", marginBottom: 8 }}>HireX</div>
          <h1 className="page-title" style={{ fontSize: 22, margin: 0 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
            Sign in to continue to your account.
          </p>
        </div>

        {/* Account Type Toggle */}
        <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #EBEBEB", marginBottom: 28 }}>
          {(["user", "company"] as const).map(type => (
            <button
              key={type}
              onClick={() => { setLoginType(type); setError(""); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "0 0 10px", fontSize: 13, fontWeight: 600,
                color: loginType === type ? "var(--text-primary)" : "var(--text-muted)",
                borderBottom: loginType === type ? "2px solid var(--accent-from)" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {type === "user" ? "Individual" : "Company"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", color: "#EF4444", fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form">
          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="login-email" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              {loginType === "user" ? "Email address" : "Work Email"}
            </label>
            <input
              id="login-email"
              type="email"
              placeholder={loginType === "user" ? "you@example.com" : "hr@company.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: "1px solid #EBEBEB", fontSize: 14,
                outline: "none", fontFamily: "'Inter', sans-serif",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
              onBlur={e => e.target.style.borderColor = "#EBEBEB"}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="login-password" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              minLength={6}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8,
                border: "1px solid #EBEBEB", fontSize: 14,
                outline: "none", fontFamily: "'Inter', sans-serif",
                transition: "border-color 0.15s",
              }}
              onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
              onBlur={e => e.target.style.borderColor = "#EBEBEB"}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "var(--accent-from)", color: "#FFFFFF",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontFamily: "'Inter', sans-serif",
              marginBottom: 20,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (
              <><span className="spinner" /> Signing in…</>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
          </div>

          {/* Social */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => window.location.href = `${API}/api/auth/google`}
              style={{
                width: "100%", padding: "11px", borderRadius: 10,
                border: "1px solid #EBEBEB", background: "#FFFFFF",
                color: "var(--text-primary)", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
              onMouseLeave={e => e.currentTarget.style.background = "#FFFFFF"}
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => window.location.href = `${API}/api/auth/github`}
              style={{
                width: "100%", padding: "11px", borderRadius: 10,
                border: "1px solid #EBEBEB", background: "#FFFFFF",
                color: "var(--text-primary)", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
              onMouseLeave={e => e.currentTarget.style.background = "#FFFFFF"}
            >
              Continue with GitHub
            </button>
          </div>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "var(--text-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "var(--accent-from)", textDecoration: "none", fontWeight: 600 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
