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
from face_utils.qdrant_store import (
    ensure_collection,
    base64_to_cv2,
    extract_arcface_embedding,
    check_duplicate_face,
    store_face_embedding,
)

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
        ensure_collection()
        print("  [OK] All systems go. HireX ML Service is ready.\n")
    except Exception as e:
        print(f"  [WARN] Qdrant unavailable: {e}")
        print("  Server started but face dedup endpoints will fail.")
        print("  -> Make sure Docker is running: docker-compose up -d\n")

    yield  # ← server runs here

    # ── Shutdown (runs on Ctrl+C / SIGTERM — no more ugly traceback) ──
    print("\n[server]: Shutting down HireX ML Service cleanly...")


app = FastAPI(
    title="HireX ML Service",
    description="Biometric verification — liveness, ArcFace embeddings, Qdrant dedup",
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

class EmbeddingPayload(BaseModel):
    embedding: list[float]

class StorePayload(BaseModel):
    embedding: list[float]
    user_id: str
    email: str


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


@app.post("/extract-embedding")
def extract_embedding(payload: ImagePayload):
    """
    Extract 512-dim ArcFace embedding from image.
    Returns: { embedding, face_detected }
    """
    embedding = extract_arcface_embedding(payload.image)
    if embedding is None:
        return {"embedding": [], "face_detected": False}
    return {"embedding": embedding, "face_detected": True}


@app.post("/check-duplicate")
def check_duplicate(payload: EmbeddingPayload):
    """
    Query Qdrant for a matching face.
    Returns: { is_duplicate, score, matched_point_id, message }
    """
    result = check_duplicate_face(payload.embedding)
    return result


@app.post("/store-embedding")
def store_embedding(payload: StorePayload):
    """
    Insert face embedding into Qdrant with user metadata.
    Returns: { point_id, success }
    """
    result = store_face_embedding(payload.embedding, payload.user_id, payload.email)
    return result


@app.get("/health")
def health():
    return {"status": "ok", "service": "HireX ML Service"}
