import os
import io
import base64
import uuid
import time
import numpy as np
from PIL import Image
import cv2

from deepface import DeepFace

# ─── Configuration ────────────────────────────────────────────────────────────
QDRANT_URL             = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY         = os.getenv("QDRANT_API_KEY", "")
QDRANT_COLLECTION_NAME = os.getenv("QDRANT_COLLECTION_NAME", "hirex_faces")
COSINE_THRESHOLD       = float(os.getenv("COSINE_THRESHOLD", "0.60"))
EMBEDDING_DIM          = 512
IS_LOCAL_MODE          = QDRANT_URL.strip().lower() == "local"

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    SearchParams,
    ScoredPoint,
)

# ─── Client Initialisation ────────────────────────────────────────────────────
if IS_LOCAL_MODE:
    # On-disk mode (no Docker/cloud needed)
    LOCAL_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "qdrant_data")
    os.makedirs(LOCAL_DATA_PATH, exist_ok=True)
    qdrant = QdrantClient(path=LOCAL_DATA_PATH)
    _qdrant_mode = f"LOCAL DISK  →  {os.path.abspath(LOCAL_DATA_PATH)}"
else:
    # Docker / Cloud mode (HTTP)
    qdrant = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY if QDRANT_API_KEY else None,
        timeout=10,
    )
    _qdrant_mode = f"REMOTE HTTP  →  {QDRANT_URL}"


def _banner(msg: str, char: str = "─", width: int = 60) -> str:
    pad = max(0, width - len(msg) - 2)
    return f"{char * (pad // 2)} {msg} {char * (pad - pad // 2)}"


def ensure_collection():
    """
    Create Qdrant collection if it does not exist.
    Prints a rich status banner to the terminal.
    """
    print()
    print(_banner("QDRANT STATUS", "="))
    print(f"  Mode       : {_qdrant_mode}")
    print(f"  Collection : {QDRANT_COLLECTION_NAME}")
    print(f"  Threshold  : cosine similarity >= {COSINE_THRESHOLD}  (same person)")

    # Wait for Docker container to be ready (retry up to 10s)
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            existing = [c.name for c in qdrant.get_collections().collections]
            break
        except Exception as e:
            if attempt == max_retries:
                print(f"  Status     : [FAILED] after {max_retries} attempts")
                print(f"  Error      : {e}")
                print(_banner("", "="))
                raise
            print(f"  Status     : [WAIT] Waiting for Qdrant... (attempt {attempt}/{max_retries})")
            time.sleep(2)

    if QDRANT_COLLECTION_NAME not in existing:
        qdrant.create_collection(
            collection_name=QDRANT_COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
        print(f"  Collection : [OK]  Created '{QDRANT_COLLECTION_NAME}' (dim={EMBEDDING_DIM}, cosine)")
    else:
        count = qdrant.get_collection(QDRANT_COLLECTION_NAME).points_count
        print(f"  Collection : [OK]  '{QDRANT_COLLECTION_NAME}' exists  ({count} face vectors stored)")

    print(f"  Status     : [CONNECTED & READY]")
    print(_banner("", "="))
    print()


def base64_to_cv2(b64_string: str) -> np.ndarray:
    """Convert base64 image string to an OpenCV BGR image."""
    image_bytes = base64.b64decode(b64_string)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)


def extract_arcface_embedding(image_b64: str) -> list[float] | None:
    """Extract 512-dim ArcFace embedding from a base64 image."""
    try:
        img = base64_to_cv2(image_b64)
        result = DeepFace.represent(
            img_path=img,
            model_name="ArcFace",
            detector_backend="opencv",
            enforce_detection=True,
        )
        return result[0]["embedding"]
    except Exception as e:
        print(f"[embedding] Error: {e}")
        return None


def check_duplicate_face(embedding: list[float]) -> dict:
    """
    Search Qdrant for a similar face.
    Returns is_duplicate=True if cosine similarity >= COSINE_THRESHOLD.
    """
    # query_points() replaces the deprecated search() in qdrant-client >= 1.7
    response = qdrant.query_points(
        collection_name=QDRANT_COLLECTION_NAME,
        query=embedding,
        limit=1,
        search_params=SearchParams(hnsw_ef=128, exact=False),
        with_payload=True,
    )
    results: list[ScoredPoint] = response.points
    if results:
        top = results[0]
        score = top.score
        if score >= COSINE_THRESHOLD:
            return {
                "is_duplicate": True,
                "score": score,
                "matched_point_id": str(top.id),
                "message": f"Face already registered (similarity: {score:.3f})",
            }
    return {
        "is_duplicate": False,
        "score": results[0].score if results else 0.0,
        "matched_point_id": None,
        "message": "No duplicate found",
    }


def store_face_embedding(
    embedding: list[float], user_id: str, email: str
) -> dict:
    """Insert a face embedding into Qdrant with user metadata."""
    point_id = str(uuid.uuid4())
    qdrant.upsert(
        collection_name=QDRANT_COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={"user_id": user_id, "email": email},
            )
        ],
    )
    return {"point_id": point_id, "success": True}
