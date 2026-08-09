/**
 * In-memory cache replacing the former Redis implementation.
 * Ensures the app can run via `npm run dev` without needing a dockerized Redis.
 */
const memoryCache = new Map<string, { value: any, expiry: number }>();

/**
 * Safely sets a cache value in memory.
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 900) {
    try {
        const expiry = Date.now() + (ttlSeconds * 1000);
        memoryCache.set(key, { value, expiry });
    } catch (error) {
        console.error(`[Cache] Error setting cache for ${key}`, error);
    }
}

/**
 * Safely gets a cache value from memory.
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const item = memoryCache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            memoryCache.delete(key);
            return null;
        }

        return item.value as T;
    } catch (error) {
        console.error(`[Cache] Error getting cache for ${key}`, error);
        return null;
    }
}

/**
 * Sweeps the entire cache to ensure fresh data after mutations.
 */
export async function flushAllCache() {
    try {
        memoryCache.clear();
    } catch (error) {
        console.error(`[Cache] Error flushing cache`, error);
    }
}
