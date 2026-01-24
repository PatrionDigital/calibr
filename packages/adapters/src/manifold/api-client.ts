/**
 * Manifold Markets API Client
 * API Docs: https://docs.manifold.markets/api
 */

import { z } from 'zod';

// =============================================================================
// Configuration
// =============================================================================

export interface ManifoldClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<Omit<ManifoldClientConfig, 'apiKey'>> = {
  baseUrl: 'https://api.manifold.markets',
  timeout: 30000,
};

// =============================================================================
// API Response Schemas
// =============================================================================

export const ManifoldAnswerSchema = z.object({
  id: z.string(),
  text: z.string(),
  probability: z.number().optional(),
  index: z.number().optional(),
  contractId: z.string().optional(),
  poolYes: z.number().optional(),
  poolNo: z.number().optional(),
  resolution: z.string().optional(),
  resolutionProbability: z.number().optional(),
});

export const ManifoldMarketSchema = z.object({
  id: z.string(),
  slug: z.string(),
  question: z.string(),
  description: z.unknown().optional(),
  textDescription: z.string().optional(),

  creatorId: z.string(),
  creatorUsername: z.string(),
  creatorName: z.string().optional(),
  creatorAvatarUrl: z.string().optional(),

  createdTime: z.number(),
  closeTime: z.number().optional(),
  resolutionTime: z.number().optional(),

  mechanism: z.enum(['cpmm-1', 'cpmm-multi-1', 'dpm-2', 'none']).optional(),
  outcomeType: z.enum(['BINARY', 'MULTIPLE_CHOICE', 'FREE_RESPONSE', 'NUMERIC', 'PSEUDO_NUMERIC', 'STONK', 'BOUNTIED_QUESTION', 'POLL', 'QUADRATIC_FUNDING', 'CERT', 'NUMBER']).optional(),

  isResolved: z.boolean(),
  resolution: z.string().optional(),
  resolutionProbability: z.number().optional(),

  probability: z.number().optional(),
  p: z.number().optional(),

  totalLiquidity: z.number().optional(),
  pool: z.record(z.number()).optional(),
  volume: z.number().optional(),
  volume24Hours: z.number().optional(),

  answers: z.array(ManifoldAnswerSchema).optional(),

  groupSlugs: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),

  url: z.string().optional(),
  coverImageUrl: z.string().optional(),

  uniqueBettorCount: z.number().optional(),
  lastUpdatedTime: z.number().optional(),
  lastBetTime: z.number().optional(),
});

export const ManifoldBetSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  userId: z.string(),
  amount: z.number(),
  shares: z.number(),
  outcome: z.string(),
  probBefore: z.number().optional(),
  probAfter: z.number().optional(),
  createdTime: z.number(),
  isRedemption: z.boolean().optional(),
  isFilled: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  limitProb: z.number().optional(),
  orderAmount: z.number().optional(),
  fills: z.array(z.unknown()).optional(),
});

export const ManifoldUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
  balance: z.number(),
  totalDeposits: z.number().optional(),
  profitCached: z.record(z.number()).optional(),
  createdTime: z.number(),
});

// =============================================================================
// Types
// =============================================================================

export type ManifoldMarket = z.infer<typeof ManifoldMarketSchema>;
export type ManifoldAnswer = z.infer<typeof ManifoldAnswerSchema>;
export type ManifoldBet = z.infer<typeof ManifoldBetSchema>;
export type ManifoldUser = z.infer<typeof ManifoldUserSchema>;

// =============================================================================
// API Client
// =============================================================================

export class ManifoldClient {
  private config: Required<Omit<ManifoldClientConfig, 'apiKey'>> & { apiKey?: string };
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  constructor(config: ManifoldClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private getCacheKey(endpoint: string, params?: Record<string, unknown>): string {
    return `${endpoint}:${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private async fetch<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      cacheTtl?: number;
      requiresAuth?: boolean;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      params,
      body,
      cacheTtl = 30000,
      requiresAuth = false,
    } = options;

    // Build URL with query params
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Check cache for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, params);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) return cached;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Key ${this.config.apiKey}`;
    } else if (requiresAuth) {
      throw new Error('Manifold API key required for authenticated requests');
    }

    // Make request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Manifold API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as T;

      // Cache successful GET responses
      if (method === 'GET') {
        const cacheKey = this.getCacheKey(endpoint, params);
        this.setCache(cacheKey, data, cacheTtl);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Manifold API request timed out');
      }
      throw error;
    }
  }

  // ===========================================================================
  // Market Methods
  // ===========================================================================

  /**
   * Get all markets with optional filtering
   */
  async getMarkets(params?: {
    limit?: number;
    before?: string;
    sort?: 'created-time' | 'updated-time' | 'last-bet-time' | 'last-comment-time';
    order?: 'asc' | 'desc';
  }): Promise<ManifoldMarket[]> {
    const result = await this.fetch<ManifoldMarket[]>('/v0/markets', {
      params: {
        limit: params?.limit || 500,
        before: params?.before,
        sort: params?.sort || 'created-time',
        order: params?.order || 'desc',
      },
      cacheTtl: 60000, // 1 minute cache
    });

    return result;
  }

  /**
   * Search markets
   */
  async searchMarkets(params: {
    term?: string;
    filter?: 'all' | 'open' | 'closed' | 'resolved' | 'closing-this-month' | 'closing-next-month';
    sort?: 'relevance' | 'newest' | 'score' | 'daily-score' | '24-hour-vol' | 'most-popular' | 'liquidity' | 'last-updated' | 'close-date' | 'resolve-date' | 'random';
    contractType?: 'BINARY' | 'MULTIPLE_CHOICE' | 'FREE_RESPONSE' | 'PSEUDO_NUMERIC' | 'STONK' | 'BOUNTIED_QUESTION' | 'POLL' | 'ALL';
    topicSlug?: string;
    limit?: number;
    offset?: number;
  }): Promise<ManifoldMarket[]> {
    const result = await this.fetch<ManifoldMarket[]>('/v0/search-markets', {
      params: {
        term: params.term,
        filter: params.filter || 'open',
        sort: params.sort || 'score',
        contractType: params.contractType || 'ALL',
        topicSlug: params.topicSlug,
        limit: params.limit || 100,
        offset: params.offset || 0,
      },
      cacheTtl: 30000,
    });

    return result;
  }

  /**
   * Get a single market by ID
   */
  async getMarket(marketId: string): Promise<ManifoldMarket | null> {
    try {
      const result = await this.fetch<ManifoldMarket>(`/v0/market/${marketId}`, {
        cacheTtl: 30000,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get market by slug
   */
  async getMarketBySlug(slug: string): Promise<ManifoldMarket | null> {
    try {
      const result = await this.fetch<ManifoldMarket>(`/v0/slug/${slug}`, {
        cacheTtl: 30000,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get bets for a market
   */
  async getBets(params?: {
    contractId?: string;
    userId?: string;
    limit?: number;
    before?: string;
  }): Promise<ManifoldBet[]> {
    const result = await this.fetch<ManifoldBet[]>('/v0/bets', {
      params: {
        contractId: params?.contractId,
        userId: params?.userId,
        limit: params?.limit || 100,
        before: params?.before,
      },
      cacheTtl: 10000,
    });

    return result;
  }

  /**
   * Get positions for a market
   */
  async getPositions(marketId: string, params?: {
    userId?: string;
    top?: number;
    bottom?: number;
    order?: 'profit' | 'shares';
  }): Promise<unknown[]> {
    const result = await this.fetch<unknown[]>(`/v0/market/${marketId}/positions`, {
      params: {
        userId: params?.userId,
        top: params?.top,
        bottom: params?.bottom,
        order: params?.order || 'profit',
      },
      cacheTtl: 30000,
    });

    return result;
  }

  // ===========================================================================
  // User Methods
  // ===========================================================================

  /**
   * Get user by username
   */
  async getUser(username: string): Promise<ManifoldUser | null> {
    try {
      const result = await this.fetch<ManifoldUser>(`/v0/user/${username}`, {
        cacheTtl: 60000,
      });
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get authenticated user
   */
  async getMe(): Promise<ManifoldUser> {
    return this.fetch<ManifoldUser>('/v0/me', {
      requiresAuth: true,
      cacheTtl: 10000,
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

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

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Default client instance
export const manifoldClient = new ManifoldClient();
