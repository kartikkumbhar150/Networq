import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useParams } from "react-router";
import { Camera, AlertTriangle, CheckCircle, LogOut } from "lucide-react";

export function meta() {
  return [{ title: "Scan QR – HireX Events" }];
}

const API = "http://13.206.69.62:5000";

interface ScanResult {
  attendeeName: string;
  action: "check_in" | "check_out";
  checkIn?: string;
  checkOut?: string;
  message: string;
}

export default function EventScan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setScanning(true);
        scanLoop();
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    setScanning(false);
    setStreamActive(false);
  }

  function scanLoop() {
    animFrameRef.current = requestAnimationFrame(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) { scanLoop(); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { scanLoop(); return; }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Dynamically import jsQR to avoid SSR issues
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code?.data) {
        stopCamera();
        await submitScan(code.data);
      } else {
        scanLoop();
      }
    });
  }

  async function submitScan(qrToken: string) {
    const token = localStorage.getItem("token");
    if (!token || !id) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API}/api/registrations/events/${id}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || "Scan failed.");
      }
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
    startCamera();
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
        <Link to={`/events/${id}`} className="btn btn-ghost btn-sm">← Back</Link>
        <h1 className="dashboard-title">QR Scanner</h1>
      </div>

      <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
        {/* Camera View */}
        <div style={{ position: "relative", width: "100%", maxWidth: 400, margin: "0 auto 24px", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {!streamActive && !loading && !result && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: "#fff" }}><Camera size={48} /></div>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>Camera off</p>
              </div>
            </div>
          )}

          {scanning && (
            <div style={{ position: "absolute", inset: 0, border: "3px solid var(--accent-from)", borderRadius: 16, pointerEvents: "none" }}>
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                width: 180, height: 180, border: "2px solid rgba(242,101,34,0.7)", borderRadius: 8,
                boxShadow: "0 0 0 999px rgba(0,0,0,0.4)"
              }} />
            </div>
          )}

          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
            </div>
          )}
        </div>

        {/* Action */}
        {!scanning && !result && !loading && (
          <button className="btn btn-primary" onClick={startCamera} style={{ width: "100%" }}>
            Start Scanning
          </button>
        )}

        {scanning && (
          <div>
            <p style={{ color: "var(--text-secondary)", marginBottom: 12, fontSize: 14 }}>Point camera at attendee's QR code…</p>
            <button className="btn btn-ghost btn-sm" onClick={stopCamera}>Stop Camera</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <span style={{ display: "inline-flex", alignItems: "center", marginRight: 6 }}><AlertTriangle size={16} /></span> {error}
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={reset}>Try Again</button>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              padding: 24, borderRadius: 16, marginBottom: 20,
              background: result.action === "check_in" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${result.action === "check_in" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: result.action === "check_in" ? "#10b981" : "#f59e0b" }}>{result.action === "check_in" ? <CheckCircle size={40} /> : <LogOut size={40} />}</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {result.action === "check_in" ? "Check-In Recorded!" : "Check-Out Recorded!"}
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>{result.attendeeName}</p>
              {result.checkIn && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>In: {new Date(result.checkIn).toLocaleTimeString()}</p>}
              {result.checkOut && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Out: {new Date(result.checkOut).toLocaleTimeString()}</p>}
            </div>
            <button className="btn btn-primary" onClick={reset} style={{ width: "100%" }}>Scan Next Attendee</button>
          </div>
        )}
      </div>
    </div>
  );
}
