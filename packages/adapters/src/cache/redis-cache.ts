/**
 * Redis Cache Layer
 * Production-ready caching with Redis for market data
 */

import { createClient, type RedisClientType } from 'redis';

// =============================================================================
// Types
// =============================================================================

export interface RedisCacheConfig {
  /** Time to live in milliseconds */
  ttlMs?: number;
  /** Maximum cache size */
  maxSize?: number;
  /** Redis connection URL */
  url?: string;
  /** Key prefix for namespacing */
  keyPrefix?: string;
  /** Whether to use JSON serialization (default: true) */
  useJson?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

// =============================================================================
// Redis Cache Implementation
// =============================================================================

export class RedisCache {
  private client: RedisClientType | null = null;
  private config: Required<RedisCacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };
  private connected = false;
  private connecting = false;

  constructor(config: RedisCacheConfig = {}) {
    this.config = {
      ttlMs: config.ttlMs ?? 30000, // 30 seconds default
      maxSize: config.maxSize ?? 10000,
      url: config.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      keyPrefix: config.keyPrefix ?? 'calibr:cache:',
      useJson: config.useJson ?? true,
    };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      this.client = createClient({
        url: this.config.url,
      });

      this.client.on('error', (err) => {
        console.error('Redis cache error:', err);
      });

      this.client.on('connect', () => {
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        this.connected = false;
      });

      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.client = null;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      this.client = null;
    }
  }

  /**
   * Check if connected to Redis
   */
  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  // ===========================================================================
  // Cache Operations
  // ===========================================================================

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected() || !this.client) {
      return null;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      if (this.config.useJson) {
        return JSON.parse(value) as T;
      }

      return value as unknown as T;
    } catch (error) {
      console.error('Redis cache get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const ttl = ttlMs ?? this.config.ttlMs;
      const serialized = this.config.useJson ? JSON.stringify(value) : String(value);

      await this.client.setEx(fullKey, Math.ceil(ttl / 1000), serialized);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Redis cache set error:', error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.client.del(fullKey);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error('Redis cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      const fullKey = this.config.keyPrefix + key;
      const result = await this.client.exists(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Redis cache has error:', error);
      return false;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Clear all keys with our prefix
   */
  async clear(): Promise<void> {
    if (!this.isConnected() || !this.client) {
      return;
    }

    try {
      const pattern = this.config.keyPrefix + '*';
      let cursor = 0;

      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } while (cursor !== 0);
    } catch (error) {
      console.error('Redis cache clear error:', error);
    }
  }

  // ===========================================================================
  // Batch Operations
  // ===========================================================================

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    if (!this.isConnected() || !this.client || keys.length === 0) {
      keys.forEach((key) => results.set(key, null));
      return results;
    }

    try {
      const fullKeys = keys.map((k) => this.config.keyPrefix + k);
      const values = await this.client.mGet(fullKeys);

      keys.forEach((key, index) => {
        const value = values[index];
        if (value === null || value === undefined) {
          this.stats.misses++;
          results.set(key, null);
        } else {
          this.stats.hits++;
          results.set(
            key,
            this.config.useJson ? (JSON.parse(value) as T) : (value as unknown as T)
          );
        }
      });

      this.updateHitRate();
    } catch (error) {
      console.error('Redis cache mget error:', error);
      keys.forEach((key) => results.set(key, null));
    }

    return results;
  }

  /**
   * Set multiple values
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttlMs?: number }>): Promise<void> {
    if (!this.isConnected() || !this.client || entries.length === 0) {
      return;
    }

    try {
      const pipeline = this.client.multi();

      for (const entry of entries) {
        const fullKey = this.config.keyPrefix + entry.key;
        const ttl = entry.ttlMs ?? this.config.ttlMs;
        const serialized = this.config.useJson
          ? JSON.stringify(entry.value)
          : String(entry.value);

        pipeline.setEx(fullKey, Math.ceil(ttl / 1000), serialized);
        this.stats.sets++;
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Redis cache mset error:', error);
    }
  }

  // ===========================================================================
  // Stats & Monitoring
  // ===========================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConnected() || !this.client) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// =============================================================================
// Cache Key Builders
// =============================================================================

export const CacheKeys = {
  /** Market data cache key */
  market: (platform: string, marketId: string) =>
    `market:${platform}:${marketId}`,

  /** Markets list cache key */
  markets: (platform: string, params?: string) =>
    `markets:${platform}${params ? `:${params}` : ''}`,

  /** Event cache key */
  event: (platform: string, eventId: string) =>
    `event:${platform}:${eventId}`,

  /** Events list cache key */
  events: (platform: string, params?: string) =>
    `events:${platform}${params ? `:${params}` : ''}`,

  /** Order book cache key */
  orderbook: (platform: string, tokenId: string) =>
    `orderbook:${platform}:${tokenId}`,

  /** Price cache key */
  price: (platform: string, tokenId: string) =>
    `price:${platform}:${tokenId}`,

  /** Trades cache key */
  trades: (platform: string, tokenId: string) =>
    `trades:${platform}:${tokenId}`,
};

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultCache: RedisCache | null = null;

/**
 * Get or create the default Redis cache instance
 */
export function getDefaultCache(config?: RedisCacheConfig): RedisCache {
  if (!defaultCache) {
    defaultCache = new RedisCache(config);
  }
  return defaultCache;
}

/**
 * Initialize the default cache and connect
 */
export async function initializeCache(config?: RedisCacheConfig): Promise<RedisCache> {
  const cache = getDefaultCache(config);
  await cache.connect();
  return cache;
}
