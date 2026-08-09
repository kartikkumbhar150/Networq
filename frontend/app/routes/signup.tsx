import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { FaceCapture } from "../components/FaceCapture";
import { AlertTriangle, CheckCircle, Lock, PartyPopper } from "lucide-react";

export function meta() {
  return [
    { title: "Create Account – HireX" },
    { name: "description", content: "Sign up for HireX with biometric identity verification." },
  ];
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
type Step = "details" | "face" | "otp" | "digilocker" | "done";

export default function Signup() {
  const navigate = useNavigate();

  // ─── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("details");

  // Step 1 — Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"user" | "company">("user");
  const [companyName, setCompanyName] = useState("");
  const [cin, setCin] = useState("");
  const [gstin, setGstin] = useState("");

  // Step 2 — Face
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceError, setFaceError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [faceStatus, setFaceStatus] = useState("");

  // Step 3 — OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpError, setOtpError] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const [globalError, setGlobalError] = useState("");

  // ─── Step 1: Submit details ───────────────────────────────────────────────────
  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    if (password.length < 8) {
      setGlobalError("Password must be at least 8 characters.");
      return;
    }
    
    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          accountType, 
          companyName, 
          cin, 
          gstin 
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.message || "Failed to submit details.");
        return;
      }
      setStep("otp");
    } catch {
      setGlobalError("Connection error. Is the backend running?");
    }
  }

  // ─── Step 3: Face captured → send to backend ──────────────────────────────────
  async function handleFaceCaptured(base64: string) {
    setFaceImage(base64);
    setVerifying(true);
    setFaceError("");
    setFaceStatus("Checking liveness…");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/liveness`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ faceImage: base64 }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFaceError(data.message || "Verification failed. Please try again.");
        setFaceImage(null);
        setVerifying(false);
        setFaceStatus("");
        return;
      }

      setFaceStatus("Liveness verified!");
      setTimeout(() => setStep("digilocker"), 1000);
    } catch {
      setFaceError("Connection error. Is the backend running?");
      setFaceImage(null);
    } finally {
      setVerifying(false);
    }
  }

  function handleFaceError(msg: string) {
    setFaceError(msg);
  }

  // ─── OTP input handling ───────────────────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ─── Step 2: Verify OTP ──────────────────────────────────────────────────────
  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");

    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString, referralCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.message || "Invalid OTP.");
        setOtpVerifying(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setStep("face");
    } catch {
      setOtpError("Connection error.");
      setOtpVerifying(false);
    }
  }

  // ─── Step indicators ──────────────────────────────────────────────────────────
  const steps = [
    { label: "Details", id: "details" },
    { label: "Verify Email", id: "otp" },
    { label: "Face Scan", id: "face" },
    { label: "DigiLocker", id: "digilocker" },
  ];
  const stepIndex: Record<string, number> = { details: 0, otp: 1, face: 2, digilocker: 3, done: 4 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "#F8F9FA" }}>

      <div className="glass-card" style={{
        width: "100%",
        maxWidth: step === "face" ? 520 : 440,
        padding: "48px 40px",
      }}>

        {/* Logo & Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: "var(--accent-from)", marginBottom: 8 }}>HireX</div>
          <h1 className="page-title" style={{ fontSize: 22, margin: 0 }}>
            Create your account
          </h1>
        </div>

        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
          {steps.map((s, i) => {
            const currentIdx = stepIndex[step];
            const isDone = currentIdx > i;
            const isActive = currentIdx === i;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    background: isDone ? "var(--accent-from)" : isActive ? "var(--accent-from)" : "#F3F3F3",
                    color: isDone || isActive ? "#FFFFFF" : "var(--text-muted)",
                    transition: "all 0.2s",
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 24, height: 1,
                    background: isDone ? "var(--accent-from)" : "#EBEBEB",
                    margin: "0 6px",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Global error */}
        {globalError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", color: "#EF4444", fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
            <AlertTriangle size={14} /> {globalError}
          </div>
        )}

        {/* ─── Step 1: Details ─── */}
        {step === "details" && (
          <form onSubmit={handleDetailsSubmit} id="signup-details-form">

            {/* Account Type Toggle */}
            <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #EBEBEB", marginBottom: 24 }}>
              {(["user", "company"] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAccountType(type)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "0 0 10px", fontSize: 13, fontWeight: 600,
                    color: accountType === type ? "var(--text-primary)" : "var(--text-muted)",
                    borderBottom: accountType === type ? "2px solid var(--accent-from)" : "2px solid transparent",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                >
                  {type === "user" ? "Individual" : "Company"}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="signup-name" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {accountType === "user" ? "Full name" : "Representative Full Name"}
              </label>
              <input id="signup-name" type="text" placeholder="Jane Smith"
                value={name} onChange={(e) => setName(e.target.value)} required
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
                onBlur={e => e.target.style.borderColor = "#EBEBEB"}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="signup-email" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                {accountType === "company" ? "Work Email" : "Email"}
              </label>
              <input id="signup-email" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
                onBlur={e => e.target.style.borderColor = "#EBEBEB"}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="signup-password" style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Password</label>
              <input id="signup-password" type="password" placeholder="Min. 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", transition: "border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
                onBlur={e => e.target.style.borderColor = "#EBEBEB"}
              />
            </div>

            {accountType === "company" && (
              <div style={{ padding: 16, background: "#FAFAFA", borderRadius: 10, border: "1px solid #EBEBEB", marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, margin: "0 0 14px 0", color: "var(--text-primary)", fontWeight: 600 }}>Company Details</h3>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>Company Legal Name</label>
                  <input type="text" placeholder="Acme Corp Pvt Ltd"
                    value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>CIN</label>
                  <input type="text" placeholder="L12345MH2020PTC123456"
                    value={cin} onChange={(e) => setCin(e.target.value)} required
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4 }}>GSTIN (Optional)</label>
                  <input type="text" placeholder="27AAAAA0000A1Z5"
                    value={gstin} onChange={(e) => setGstin(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #EBEBEB", fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif" }}
                  />
                </div>
              </div>
            )}

            <button id="signup-next" type="submit" style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "var(--accent-from)", color: "#FFFFFF",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Inter', sans-serif", marginBottom: 20,
            }}>
              Continue
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => window.location.href = `${API}/api/auth/google`}
                style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  border: "1px solid #EBEBEB", background: "#FFFFFF",
                  color: "var(--text-primary)", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                }}
              >
                Sign up with Google
              </button>
              <button type="button" onClick={() => window.location.href = `${API}/api/auth/github`}
                style={{
                  width: "100%", padding: "11px", borderRadius: 10,
                  border: "1px solid #EBEBEB", background: "#FFFFFF",
                  color: "var(--text-primary)", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                }}
              >
                Sign up with GitHub
              </button>
            </div>
          </form>
        )}

        {/* ─── Step 2: Face Scan ─── */}
        {step === "face" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", lineHeight: 1.7 }}>
              Verify your identity by completing the on-screen challenge.
              Each face can only be linked to <strong style={{ color: "var(--text-primary)" }}>one account</strong>.
            </p>

            {faceError && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", color: "#EF4444", fontSize: 13 }}>
                <AlertTriangle size={14} /> {faceError}
                <button
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                  onClick={() => { setFaceError(""); setFaceImage(null); }}
                >×</button>
              </div>
            )}

            {verifying && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FFF7ED", color: "var(--accent-from)", fontSize: 13 }}>
                <span className="spinner" /> {faceStatus}
              </div>
            )}

            {!faceImage && !verifying && (
              <FaceCapture onCaptured={handleFaceCaptured} onError={handleFaceError} />
            )}

            {faceImage && !verifying && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#F0FDF4", color: "#16A34A", fontSize: 13 }}>
                <CheckCircle size={14} /> {faceStatus}
              </div>
            )}

            <button
              onClick={() => { setStep("details"); setFaceError(""); setFaceImage(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ─── Step 3: OTP ─── */}
        {step === "otp" && (
          <form onSubmit={handleOtpVerify} id="otp-form">
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
            </p>

            {otpError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#FEF2F2", color: "#EF4444", fontSize: 13, marginBottom: 16 }}>
                <AlertTriangle size={14} /> {otpError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: 44, height: 52, textAlign: "center",
                    fontSize: 20, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                    border: "1px solid #EBEBEB", borderRadius: 8,
                    outline: "none", color: "var(--text-primary)",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--accent-from)"}
                  onBlur={e => e.target.style.borderColor = "#EBEBEB"}
                />
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="referral-code" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6 }}>Referral code (optional)</label>
              <input
                id="referral-code"
                type="text"
                placeholder="e.g. OM-PUNE-7X9K2"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid #EBEBEB", fontSize: 13,
                  outline: "none", fontFamily: "'Inter', sans-serif",
                  textTransform: "uppercase", letterSpacing: 1,
                }}
              />
            </div>

            <button
              id="otp-submit"
              type="submit"
              disabled={otpVerifying}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: "var(--accent-from)", color: "#FFFFFF",
                border: "none", fontSize: 14, fontWeight: 600,
                cursor: otpVerifying ? "not-allowed" : "pointer",
                opacity: otpVerifying ? 0.6 : 1,
                fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {otpVerifying ? (
                <><span className="spinner" /> Verifying…</>
              ) : (
                "Verify & Create Account"
              )}
            </button>
          </form>
        )}

        {/* ─── Step 4: DigiLocker ─── */}
        {step === "digilocker" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <Lock size={32} style={{ color: "#0066B3", marginBottom: 12 }} />
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                Verify Your Identity
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, maxWidth: 340, margin: "0 auto" }}>
                Verify via <strong style={{ color: "var(--text-primary)" }}>DigiLocker</strong> to earn a
                <span style={{ color: "var(--accent-from)", fontWeight: 600 }}> Verified Badge</span>.
              </p>
            </div>

            {/* Info */}
            <div style={{ width: "100%", padding: 16, borderRadius: 10, background: "#FAFAFA", border: "1px solid #EBEBEB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: "#0066B3",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "#fff", fontWeight: 800
                }}>DL</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>DigiLocker</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Government of India</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#22C55E" }}>✓</span> Verifies your Aadhaar-linked name
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#22C55E" }}>✓</span> Prevents impersonation
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#22C55E" }}>✓</span> Earns a verified badge
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                const btn = document.getElementById("digilocker-btn") as HTMLButtonElement;
                if (btn) { btn.disabled = true; btn.textContent = "Connecting to DigiLocker..."; }

                await new Promise(r => setTimeout(r, 1500));
                if (btn) btn.textContent = "Verifying Aadhaar identity...";
                await new Promise(r => setTimeout(r, 1500));

                try {
                  const res = await fetch(`${API}/api/auth/digilocker/demo-verify`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                  });
                  const data = await res.json();
                  if (data.success) {
                    if (btn) btn.textContent = "Identity Verified!";
                    await new Promise(r => setTimeout(r, 1000));
                    setStep("done");
                    setTimeout(() => navigate("/feed"), 1500);
                  } else {
                    if (btn) { btn.disabled = false; btn.textContent = "Verify with DigiLocker"; }
                  }
                } catch {
                  if (btn) { btn.disabled = false; btn.textContent = "Verify with DigiLocker"; }
                }
              }}
              id="digilocker-btn"
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: "#0066B3", color: "#FFFFFF",
                border: "none", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Lock size={16} /> Verify with DigiLocker
            </button>

            <button
              onClick={() => {
                setStep("done");
                setTimeout(() => navigate("/feed"), 1500);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 12, fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ─── Done ─── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <PartyPopper size={40} style={{ color: "var(--accent-from)", marginBottom: 12 }} />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>Welcome to HireX!</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Redirecting to your dashboard…</p>
          </div>
        )}

        {step === "details" && (
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
            Already have an account? <Link to="/login" style={{ color: "var(--accent-from)", textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
