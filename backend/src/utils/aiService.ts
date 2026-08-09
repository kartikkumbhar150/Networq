export interface LivenessResult {
  is_live: boolean;
  confidence: number;
  message: string;
}

export interface EmbeddingResult {
  embedding: number[];
  face_detected: boolean;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  score: number;
  matched_point_id: string | null;
  message: string;
}

export interface StoreEmbeddingResult {
  point_id: string;
  success: boolean;
}

/**
 * Validates liveness from a base64 image.
 * This is currently a mocked implementation ported from the Python backend 
 * (which also bypassed the heuristic). It always returns true to allow signups.
 */
export async function checkLiveness(imageBase64: string): Promise<LivenessResult> {
  // A real implementation would parse the image and calculate Laplacian variance.
  return {
    is_live: true,
    confidence: 1.0,
    message: "Live (Mocked locally)"
  };
}

export async function extractEmbedding(imageBase64: string): Promise<EmbeddingResult> {
  return {
    embedding: Array(128).fill(0), // Mocked 128-d embedding
    face_detected: true
  };
}

export async function checkDuplicate(
  embedding: number[]
): Promise<DuplicateCheckResult> {
  return {
    is_duplicate: false,
    score: 0.0,
    matched_point_id: null,
    message: "No duplicates found (Mocked locally)"
  };
}

export async function storeEmbedding(
  embedding: number[],
  userId: string,
  email: string
): Promise<StoreEmbeddingResult> {
  return {
    point_id: userId,
    success: true
  };
}
