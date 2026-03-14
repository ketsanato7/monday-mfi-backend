/**
 * Redis Cache Configuration (Phase 14)
 * ═════════════════════════════════════
 * Cache-aside pattern for hot data:
 *   - User sessions & permissions
 *   - Exchange rates (TTL 5min)
 *   - Dashboard stats (TTL 1min)
 *   - Frequently accessed lookup tables
 *
 * Requires: npm install ioredis
 * Falls back gracefully if Redis is unavailable.
 */
const logger = require('../config/logger');

let redis = null;

// Try to connect to Redis (graceful fallback)
try {
    const Redis = require('ioredis');
    redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            if (times > 3) return null; // Stop retrying
            return Math.min(times * 200, 2000);
        },
        lazyConnect: true, // Don't connect immediately
    });

    redis.on('connect', () => logger.info('✅ Redis connected'));
    redis.on('error', (err) => {
        logger.warn('⚠️ Redis error (falling back to no-cache)', { error: err.message });
        redis = null;
    });

    // Try connecting
    redis.connect().catch(() => {
        logger.warn('⚠️ Redis not available — cache disabled');
        redis = null;
    });
} catch {
    logger.info('ℹ️ ioredis not installed — cache disabled. Run: npm install ioredis');
}

const cache = {
    /**
     * Get cached value
     * @param {string} key
     * @returns {any|null}
     */
    async get(key) {
        if (!redis) return null;
        try {
            const val = await redis.get(key);
            return val ? JSON.parse(val) : null;
        } catch (err) {
            logger.warn('Cache get error', { key, error: err.message });
            return null;
        }
    },

    /**
     * Set value with TTL
     * @param {string} key
     * @param {any} value
     * @param {number} ttlSeconds - Default 60 seconds
     */
    async set(key, value, ttlSeconds = 60) {
        if (!redis) return;
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch (err) {
            logger.warn('Cache set error', { key, error: err.message });
        }
    },

    /**
     * Delete cached key
     */
    async del(key) {
        if (!redis) return;
        try {
            await redis.del(key);
        } catch (err) {
            logger.warn('Cache del error', { key, error: err.message });
        }
    },

    /**
     * Delete by pattern (e.g., 'user:*')
     */
    async delPattern(pattern) {
        if (!redis) return;
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (err) {
            logger.warn('Cache delPattern error', { pattern, error: err.message });
        }
    },

    /**
     * Cache-aside pattern helper
     * @param {string} key
     * @param {Function} fetchFn - Function to call on cache miss
     * @param {number} ttlSeconds
     */
    async getOrFetch(key, fetchFn, ttlSeconds = 60) {
        // Try cache first
        const cached = await this.get(key);
        if (cached !== null) return cached;

        // Cache miss — fetch from source
        const data = await fetchFn();
        await this.set(key, data, ttlSeconds);
        return data;
    },

    /**
     * Check if Redis is available
     */
    isAvailable() {
        return redis !== null;
    },

    // ═══ Pre-defined cache key patterns ═══
    keys: {
        permissions: (roleId) => `perm:role:${roleId}`,
        userSession: (userId) => `session:${userId}`,
        exchangeRate: (from, to) => `fx:${from}:${to}`,
        dashboardStats: (tenantId) => `dashboard:${tenantId || 'global'}`,
        lookupTable: (tableName) => `lookup:${tableName}`,
    },

    // ═══ Pre-defined TTLs (seconds) ═══
    ttl: {
        SHORT: 60,        // 1 min (dashboard stats)
        MEDIUM: 300,      // 5 min (exchange rates)
        LONG: 3600,       // 1 hour (lookup tables)
        SESSION: 28800,   // 8 hours (user session)
    },
};

module.exports = cache;
