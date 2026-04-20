import { useRef, useEffect, useState, useCallback } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChallengeType = "blink" | "turn_right" | "turn_left";

interface Props {
  onCaptured: (imageBase64: string) => void;
  onError: (msg: string) => void;
}

const CHALLENGES = [
  { type: "blink"      as ChallengeType, label: "Blink your eyes",        emoji: "👁️" },
  { type: "turn_right" as ChallengeType, label: "Turn your head right",   emoji: "➡️" },
  { type: "turn_left"  as ChallengeType, label: "Turn your head left",    emoji: "⬅️" },
];

// MediaPipe 468-landmark eye indices
const LEFT_EYE  = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33,  160, 158, 133, 153, 144];
const NOSE_TIP   = 1;
const LEFT_FACE  = 234;
const RIGHT_FACE = 454;

function getEAR(lm: {x:number;y:number}[], idx: number[]): number {
  const [p1, p2, p3, p4, p5, p6] = idx.map(i => lm[i]);
  const A = Math.hypot(p2.x - p6.x, p2.y - p6.y);
  const B = Math.hypot(p3.x - p5.x, p3.y - p5.y);
  const C = Math.hypot(p1.x - p4.x, p1.y - p4.y);
  return C === 0 ? 0 : (A + B) / (2.0 * C);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function FaceCapture({ onCaptured, onError }: Props) {
  // Store callbacks in refs so effects never need them as dependencies
  const onCapturedRef = useRef(onCaptured);
  const onErrorRef    = useRef(onError);
  useEffect(() => { onCapturedRef.current = onCaptured; }, [onCaptured]);
  useEffect(() => { onErrorRef.current    = onError;    }, [onError]);

  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animRef      = useRef<number>(0);
  const streamRef    = useRef<MediaStream | null>(null);
  const challengeDoneRef = useRef(false);
  const earHistory   = useRef<number[]>([]);

  const [modelReady,    setModelReady]    = useState(false);
  const [cameraReady,   setCameraReady]   = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);
  const [frameState,    setFrameState]    = useState<"idle"|"checking"|"success">("idle");
  const [modelError,    setModelError]    = useState("");
  const [challenge] = useState(
    () => CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]
  );

  // ─── 1. Load MediaPipe model (once on mount) ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });
        if (!cancelled) {
          landmarkerRef.current = lm;
          setModelReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = "Failed to load face detection model. Check your internet connection.";
          setModelError(msg);
          onErrorRef.current(msg);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []); // ← empty deps: runs ONCE

  // ─── 2. Start camera (once model is ready) ────────────────────────────────
  useEffect(() => {
    if (!modelReady) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;

    let active = true;
    let localStream: MediaStream | null = null;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStream = stream;
        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            if (!active) return;
            video.play().then(() => {
              if (active) setCameraReady(true);
            }).catch(() => {});
          };
        }
      } catch (err: any) {
        if (!active) return;
        const msg =
          err?.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access in your browser and reload."
            : "Could not access camera. Make sure no other app is using it.";
        onErrorRef.current(msg);
      }
    })();

    return () => {
      active = false;
      localStream?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      cancelAnimationFrame(animRef.current);
    };
  }, [modelReady]); // ← only depends on modelReady flag

  // ─── 3. Detection loop (once camera is ready, until challenge done) ────────
  useEffect(() => {
    if (!cameraReady || challengeDoneRef.current) return;
    const lm   = landmarkerRef.current;
    const video = videoRef.current;
    if (!lm || !video) return;

    let lastTime = -1;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      if (video.readyState < 2 || challengeDoneRef.current) return;

      const now = performance.now();
      if (now - lastTime < 33) return;
      lastTime = now;

      const result = lm.detectForVideo(video, now);
      if (!result.faceLandmarks.length) {
        setFrameState("idle");
        return;
      }

      setFrameState("checking");
      const landmarks = result.faceLandmarks[0];
      const passed    = detectChallenge(landmarks, challenge.type);

      if (passed) {
        challengeDoneRef.current = true;
        setChallengeDone(true);
        setFrameState("success");
        cancelAnimationFrame(animRef.current);
        setTimeout(() => captureFrame(video), 300);
      }
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [cameraReady, challenge.type]); // ← stable deps only

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function detectChallenge(
    lm: {x:number;y:number;z:number}[],
    type: ChallengeType
  ): boolean {
    if (type === "blink") {
      const ear = (getEAR(lm, LEFT_EYE) + getEAR(lm, RIGHT_EYE)) / 2;
      earHistory.current.push(ear);
      if (earHistory.current.length > 20) earHistory.current.shift();
      const wasOpen  = earHistory.current.slice(0, -3).some(e => e > 0.25);
      const isClosed = ear < 0.15;
      return wasOpen && isClosed;
    }
    if (type === "turn_right" || type === "turn_left") {
      const nose  = lm[NOSE_TIP];
      const left  = lm[LEFT_FACE];
      const right = lm[RIGHT_FACE];
      const width = right.x - left.x;
      if (width === 0) return false;
      const yaw = (nose.x - (left.x + right.x) / 2) / width;
      return type === "turn_right" ? yaw > 0.06 : yaw < -0.06;
    }
    return false;
  }

  function captureFrame(video: HTMLVideoElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    // Mirror-correct the frame for server (un-flip the CSS mirror)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const base64 = canvas
      .toDataURL("image/jpeg", 0.92)
      .replace(/^data:image\/\w+;base64,/, "");
    onCapturedRef.current(base64);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const borderColor =
    frameState === "success"  ? "#10b981" :
    frameState === "checking" ? "#f59e0b" :
    "rgba(242,101,34,0.3)";

  return (
    <div className="camera-wrapper">

      {/* Loading model */}
      {!modelReady && !modelError && (
        <div className="alert alert-info" style={{ width: "100%" }}>
          <span className="spinner" />
          Loading face detection model…
        </div>
      )}

      {/* Model error */}
      {modelError && (
        <div className="alert alert-error" style={{ width: "100%" }}>
          ⚠ {modelError}
        </div>
      )}

      {/* Camera box — always rendered so ref is attached */}
      <div
        className="camera-box"
        style={{
          display: modelReady ? "block" : "none",
          border: `2px solid ${borderColor}`,
          boxShadow: frameState === "success"
            ? "0 0 24px rgba(16,185,129,0.4)"
            : frameState === "checking"
            ? "0 0 16px rgba(245,158,11,0.25)"
            : "none",
          transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <video
          ref={videoRef}
          id="face-capture-video"
          className="camera-video"
          muted
          playsInline
          autoPlay
          style={{ display: "block" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Overlay: waiting for camera */}
        {modelReady && !cameraReady && (
          <div className="camera-overlay">
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
              Starting camera…
            </p>
          </div>
        )}
      </div>

      {/* Challenge badge */}
      {cameraReady && !challengeDone && (
        <div className="challenge-badge">
          {challenge.emoji}&nbsp; {challenge.label}
        </div>
      )}

      {challengeDone && (
        <div className="challenge-badge success">
          ✅ Challenge passed — capturing image…
        </div>
      )}
    </div>
  );
}
