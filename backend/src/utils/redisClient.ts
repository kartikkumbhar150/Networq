import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
    url: redisUrl
});

let isConnected = false;

redisClient.on('error', (err) => {
    console.error('[db]: Redis Client Error:', err.message);
    isConnected = false;
});

redisClient.on('connect', () => {
    isConnected = true;
    console.log('[db]: Redis connected successfully.');
});

// Non-blocking connection init
redisClient.connect().catch(err => {
    console.warn('[db]: Initial Redis connection failed. Retrying in background...');
});

/**
 * Safely sets a cache value if Redis is connected.
 * TTL is in seconds (Default 900s = 15 minutes)
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 900) {
    if (!isConnected) return;
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
        console.error(`[Redis] Error setting cache for ${key}`, error);
    }
}

/**
 * Safely gets a cache value if Redis is connected.
 */
export async function getCache<T>(key: string): Promise<T | null> {
    if (!isConnected) return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`[Redis] Error getting cache for ${key}`, error);
        return null;
    }
}

/**
 * Sweeps the entire redis cache to ensure fresh data after mutations.
 */
export async function flushAllCache() {
    if (!isConnected) return;
    try {
        await redisClient.flushDb();
    } catch (error) {
        console.error(`[Redis] Error flushing cache`, error);
    }
}
