/**
 * Polymarket Gamma API Client
 * Handles all read-only market data operations via the Gamma API
 */

import { z } from 'zod';
import type { RateLimitConfig, RateLimitState, CacheConfig, CacheEntry } from '../types';

// =============================================================================
// Gamma API Response Schemas
// =============================================================================

export const GammaMarketSchema = z.object({
  id: z.string(),
  question: z.string(),
  conditionId: z.string(),
  slug: z.string(),
  resolutionSource: z.string().optional(),
  endDate: z.string().optional(),
  liquidity: z.string().optional(),
  startDate: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  outcomes: z.string().optional(),
  outcomePrices: z.string().optional(),
  volume: z.string().optional(),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  marketMakerAddress: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  new: z.boolean().optional(),
  featured: z.boolean().optional(),
  submitted_by: z.string().optional(),
  category: z.string().optional(),
  volume24hr: z.string().optional(),
  clobTokenIds: z.string().optional(),
  umaBond: z.string().optional(),
  umaReward: z.string().optional(),
  volume24hrClob: z.string().optional(),
  volumeClob: z.string().optional(),
  liquidityClob: z.string().optional(),
  acceptingOrders: z.boolean().optional(),
  negRisk: z.boolean().optional(),
  negRiskMarketId: z.string().optional(),
  negRiskRequestId: z.string().optional(),
});

export type GammaMarket = z.infer<typeof GammaMarketSchema>;

export const GammaEventSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  creationDate: z.string().optional(),
  endDate: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  archived: z.boolean().optional(),
  new: z.boolean().optional(),
  featured: z.boolean().optional(),
  restricted: z.boolean().optional(),
  liquidity: z.string().optional(),
  volume: z.string().optional(),
  openInterest: z.string().optional(),
  competitionId: z.string().optional(),
  markets: z.array(GammaMarketSchema).optional(),
});

export type GammaEvent = z.infer<typeof GammaEventSchema>;

// =============================================================================
// Client Configuration
// =============================================================================

export interface GammaClientConfig {
  baseUrl?: string;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
}

const DEFAULT_CONFIG: Required<GammaClientConfig> = {
  baseUrl: 'https://gamma-api.polymarket.com',
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000, // 100 requests per minute
    retryAfterMs: 1000,
  },
  cache: {
    ttlMs: 30000, // 30 second cache
    maxSize: 1000,
  },
};

// =============================================================================
// Gamma API Client
// =============================================================================

export class GammaClient {
  private config: Required<GammaClientConfig>;
  private rateLimitState: RateLimitState;
  private cache: Map<string, CacheEntry<unknown>>;
  private requestQueue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(config: GammaClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit },
      cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
    };

    this.rateLimitState = {
      remaining: this.config.rateLimit.maxRequests,
      resetAt: new Date(Date.now() + this.config.rateLimit.windowMs),
      isLimited: false,
    };

    this.cache = new Map();
  }

  // ===========================================================================
  // Market Endpoints
  // ===========================================================================

  /**
   * Get all markets with optional filtering
   */
  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    order?: 'volume' | 'liquidity' | 'created_at' | 'end_date_min';
    ascending?: boolean;
  }): Promise<GammaMarket[]> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.active !== undefined) queryParams.set('active', params.active.toString());
    if (params?.closed !== undefined) queryParams.set('closed', params.closed.toString());
    if (params?.order) queryParams.set('order', params.order);
    if (params?.ascending !== undefined) queryParams.set('ascending', params.ascending.toString());

    const url = `/markets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const data = await this.request<GammaMarket[]>(url);

    return z.array(GammaMarketSchema).parse(data);
  }

  /**
   * Get a single market by ID or slug
   */
  async getMarket(idOrSlug: string): Promise<GammaMarket | null> {
    try {
      const data = await this.request<GammaMarket>(`/markets/${idOrSlug}`);
      return GammaMarketSchema.parse(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search markets by query
   */
  async searchMarkets(query: string, limit = 20): Promise<GammaMarket[]> {
    const queryParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const data = await this.request<GammaMarket[]>(`/markets?${queryParams.toString()}`);
    return z.array(GammaMarketSchema).parse(data);
  }

  // ===========================================================================
  // Event Endpoints
  // ===========================================================================

  /**
   * Get all events with optional filtering
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  }): Promise<GammaEvent[]> {
    const queryParams = new URLSearchParams();

    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.active !== undefined) queryParams.set('active', params.active.toString());
    if (params?.closed !== undefined) queryParams.set('closed', params.closed.toString());

    const url = `/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const data = await this.request<GammaEvent[]>(url);

    return z.array(GammaEventSchema).parse(data);
  }

  /**
   * Get a single event by ID or slug
   */
  async getEvent(idOrSlug: string): Promise<GammaEvent | null> {
    try {
      const data = await this.request<GammaEvent>(`/events/${idOrSlug}`);
      return GammaEventSchema.parse(data);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  /**
   * Make a rate-limited, cached request to the Gamma API
   */
  private async request<T>(endpoint: string, useCache = true): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const cacheKey = url;

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Check rate limit
    await this.waitForRateLimit();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Calibr.ly/1.0',
        },
      });

      // Update rate limit state from headers
      this.updateRateLimitFromResponse(response);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          await this.handleRateLimit();
          return this.request(endpoint, useCache);
        }
        throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as T;

      // Cache the response
      if (useCache) {
        this.setCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gamma API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Wait for rate limit to reset if needed
   */
  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimitState.isLimited) {
      const waitTime = this.rateLimitState.resetAt.getTime() - Date.now();
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      this.rateLimitState.isLimited = false;
      this.rateLimitState.remaining = this.config.rateLimit.maxRequests;
    }

    // Check if window has reset
    if (Date.now() > this.rateLimitState.resetAt.getTime()) {
      this.rateLimitState.remaining = this.config.rateLimit.maxRequests;
      this.rateLimitState.resetAt = new Date(Date.now() + this.config.rateLimit.windowMs);
    }

    // Decrement remaining
    this.rateLimitState.remaining--;
    if (this.rateLimitState.remaining <= 0) {
      this.rateLimitState.isLimited = true;
    }
  }

  /**
   * Update rate limit state from response headers
   */
  private updateRateLimitFromResponse(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining) {
      this.rateLimitState.remaining = parseInt(remaining, 10);
    }
    if (reset) {
      this.rateLimitState.resetAt = new Date(parseInt(reset, 10) * 1000);
    }
  }

  /**
   * Handle rate limit by waiting
   */
  private async handleRateLimit(): Promise<void> {
    this.rateLimitState.isLimited = true;
    const waitTime = this.config.rateLimit.retryAfterMs || 1000;
    await this.sleep(waitTime);
  }

  /**
   * Get item from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  private setCache<T>(key: string, data: T): void {
    // Enforce max size by removing oldest entries
    if (this.config.cache.maxSize && this.cache.size >= this.config.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + this.config.cache.ttlMs),
    });
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getMarkets({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
