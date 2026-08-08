"""
HireX – Python FastAPI ML Service
Endpoints:
  POST /verify-liveness
  POST /extract-embedding
  POST /check-duplicate
  POST /store-embedding
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from face_utils.liveness import check_liveness

# ─── Lifespan (replaces deprecated @app.on_event) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    print()
    print("==========================================================")
    print("          HireX  --  Python ML Service  v1.0              ")
    print("==========================================================")
    print("  FastAPI   : http://localhost:8000                       ")
    print("  API Docs  : http://localhost:8000/docs                  ")
    print("==========================================================")
    print()
    try:
        print("  [OK] All systems go. HireX ML Service is ready.\n")
    except Exception as e:
        print(f"  [WARN] Exception: {e}")

    yield  # ← server runs here

    # ── Shutdown (runs on Ctrl+C / SIGTERM — no more ugly traceback) ──
    print("\n[server]: Shutting down HireX ML Service cleanly...")


app = FastAPI(
    title="HireX ML Service",
    description="Biometric verification — liveness",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)



# ─── Schemas ─────────────────────────────────────────────────────────────────
class ImagePayload(BaseModel):
    image: str  # base64 encoded image (no data-url prefix)

class ImagePayload(BaseModel):
    image: str  # base64 encoded image (no data-url prefix)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/verify-liveness")
def verify_liveness(payload: ImagePayload):
    """
    Anti-spoofing check using MiniFASNet heuristic.
    Returns: { is_live, confidence, message }
    """
    result = check_liveness(payload.image)
    if not result["is_live"]:
        raise HTTPException(status_code=403, detail=result)
    return result





@app.get("/health")
def health():
    return {"status": "ok", "service": "HireX ML Service"}
