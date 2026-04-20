import axios from 'axios';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

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

export async function checkLiveness(imageBase64: string): Promise<LivenessResult> {
  const res = await axios.post(`${FASTAPI_URL}/verify-liveness`, {
    image: imageBase64,
  });
  return res.data;
}

export async function extractEmbedding(imageBase64: string): Promise<EmbeddingResult> {
  const res = await axios.post(`${FASTAPI_URL}/extract-embedding`, {
    image: imageBase64,
  });
  return res.data;
}

export async function checkDuplicate(
  embedding: number[]
): Promise<DuplicateCheckResult> {
  const res = await axios.post(`${FASTAPI_URL}/check-duplicate`, {
    embedding,
  });
  return res.data;
}

export async function storeEmbedding(
  embedding: number[],
  userId: string,
  email: string
): Promise<StoreEmbeddingResult> {
  const res = await axios.post(`${FASTAPI_URL}/store-embedding`, {
    embedding,
    user_id: userId,
    email,
  });
  return res.data;
}
