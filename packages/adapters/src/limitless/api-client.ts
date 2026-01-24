/**
 * Limitless Exchange API Client
 * Handles market data operations via the Limitless REST API
 */

import { z } from 'zod';
import type { RateLimitConfig, CacheConfig, CacheEntry } from '../types';

// =============================================================================
// Limitless API Response Schemas
// =============================================================================

export const LimitlessOutcomeSchema = z.object({
  index: z.number(),
  title: z.string(),
  price: z.number().optional(),
});

export type LimitlessOutcome = z.infer<typeof LimitlessOutcomeSchema>;

export const LimitlessVenueSchema = z.object({
  exchange: z.string(), // Contract address for EIP-712 signing
  adapter: z.string().optional(), // For NegRisk markets
  collateral: z.string().optional(),
});

export type LimitlessVenue = z.infer<typeof LimitlessVenueSchema>;

// Define the market type to match actual API response
export interface LimitlessMarket {
  // Core identifiers
  id?: number;
  slug: string;
  conditionId?: string;
  address?: string; // FPMM contract address for AMM markets

  // Display info
  title: string;
  description?: string;
  logo?: string | null;
  proxyTitle?: string | null;

  // Status and type
  status?: string; // 'FUNDED', 'RESOLVED', etc.
  marketType?: string;
  tradeType?: string;
  expired?: boolean;

  // Prices - API returns [noPrice, yesPrice]
  prices?: number[];

  // Volume and liquidity
  volume?: string | number;
  volumeFormatted?: string;
  liquidity?: number;
  liquidityFormatted?: string;

  // Timing
  createdAt?: string;
  updatedAt?: string;
  expirationDate?: string;
  expirationTimestamp?: number;
  deadline?: string;
  resolutionDate?: string;

  // Contract/venue info
  venue?: LimitlessVenue;
  tokens?: {
    yes?: string;
    no?: string;
    [key: string]: string | undefined;
  };
  collateralToken?: {
    symbol?: string;
    address?: string;
    decimals?: number;
  };

  // Categorization
  categories?: string[];
  tags?: string[];
  category?: string;
  categoryId?: string;

  // Creator
  creator?: {
    name?: string;
    imageUrl?: string;
    [key: string]: unknown;
  };

  // Additional metadata
  metadata?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  isRewardable?: boolean;
  priorityIndex?: number;
  winningOutcomeIndex?: number | null;
  negRiskRequestId?: string | null;

  // Legacy/compatibility fields
  imageUrl?: string;
  outcomes?: LimitlessOutcome[];
  ticker?: string;
  strikePrice?: number;
  tokenId?: string;
  yesTokenId?: string;
  noTokenId?: string;
  groupSlug?: string;
  isGroup?: boolean;
  markets?: LimitlessMarket[];
}

// Base schema without recursive markets field
const LimitlessMarketBaseSchema = z.object({
  slug: z.string(),
  address: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['active', 'closed', 'resolved', 'cancelled']).optional(),
  createdAt: z.string().optional(),
  deadline: z.string().optional(),
  expirationDate: z.string().optional(),
  resolutionDate: z.string().optional(),
  volume: z.number().optional(),
  volumeFormatted: z.string().optional(),
  liquidity: z.number().optional(),
  liquidityFormatted: z.string().optional(),
  outcomes: z.array(LimitlessOutcomeSchema).optional(),
  venue: LimitlessVenueSchema.optional(),
  tags: z.array(z.string()).optional(),
  ticker: z.string().optional(),
  strikePrice: z.number().optional(),
  tokenId: z.string().optional(),
  yesTokenId: z.string().optional(),
  noTokenId: z.string().optional(),
  groupSlug: z.string().optional(),
  isGroup: z.boolean().optional(),
});

// Full schema with recursive markets field (typed explicitly)
export const LimitlessMarketSchema: z.ZodType<LimitlessMarket> = LimitlessMarketBaseSchema.extend({
  markets: z.lazy(() => z.array(LimitlessMarketSchema)).optional(),
});

export const LimitlessGroupSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  volume: z.number().optional(),
  liquidity: z.number().optional(),
  markets: z.array(LimitlessMarketSchema).optional(),
  deadline: z.string().optional(),
  status: z.string().optional(),
});

export type LimitlessGroup = z.infer<typeof LimitlessGroupSchema>;

export const LimitlessOrderBookSchema = z.object({
  adjustedMidpoint: z.number().optional(),
  asks: z.array(z.object({
    price: z.number(),
    size: z.number(),
  })).optional(),
  bids: z.array(z.object({
    price: z.number(),
    size: z.number(),
  })).optional(),
  lastTradePrice: z.number().optional(),
  maxSpread: z.number().optional(),
  minimumSize: z.number().optional(),
});

export type LimitlessOrderBook = z.infer<typeof LimitlessOrderBookSchema>;

export const LimitlessCategoryCountSchema = z.object({
  categoryId: z.string(),
  category: z.string(),
  count: z.number(),
});

export type LimitlessCategoryCount = z.infer<typeof LimitlessCategoryCountSchema>;

// =============================================================================
// Client Configuration
// =============================================================================

export interface LimitlessClientConfig {
  baseUrl?: string;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
}

const DEFAULT_CONFIG: Required<LimitlessClientConfig> = {
  baseUrl: 'https://api.limitless.exchange',
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
// Limitless API Client
// =============================================================================

export class LimitlessClient {
  private config: Required<LimitlessClientConfig>;
  private cache = new Map<string, CacheEntry<unknown>>();
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(config: LimitlessClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      rateLimit: { ...DEFAULT_CONFIG.rateLimit, ...config.rateLimit },
      cache: { ...DEFAULT_CONFIG.cache, ...config.cache },
    };
  }

  // ===========================================================================
  // Market Data Methods
  // ===========================================================================

  /**
   * Get active markets with optional filtering
   * API returns: { data: Market[], totalMarketsCount: number }
   * Pagination: API accepts `page` parameter (25 items per page)
   */
  async getActiveMarkets(params?: {
    categoryId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<{ markets: LimitlessMarket[]; groups: LimitlessGroup[]; totalCount: number }> {
    // Build query string - API accepts `page` parameter for pagination
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }
    // Note: sortBy and limit params cause 400 errors - not supported by API

    const endpoint = params?.categoryId
      ? `/markets/active/${params.categoryId}`
      : '/markets/active';

    const url = `${endpoint}${queryParams.toString() ? `?${queryParams}` : ''}`;

    // API returns { data: [...], totalMarketsCount: N }
    const response = await this.request<{
      data?: LimitlessMarket[];
      markets?: LimitlessMarket[];
      groups?: LimitlessGroup[];
      totalMarketsCount?: number;
    }>(url);

    // Handle both response formats (data array or markets/groups)
    let markets = response.data || response.markets || [];
    const groups = response.groups || [];
    const totalCount = response.totalMarketsCount || markets.length;

    // Apply client-side sorting if requested (API doesn't support sortBy)
    if (params?.sortBy) {
      markets = [...markets].sort((a, b) => {
        switch (params.sortBy) {
          case 'volume': {
            const volA = typeof a.volume === 'string' ? parseFloat(a.volume) : (a.volume || 0);
            const volB = typeof b.volume === 'string' ? parseFloat(b.volume) : (b.volume || 0);
            return volB - volA;
          }
          case 'liquidity':
            return (b.liquidity || 0) - (a.liquidity || 0);
          case 'createdAt':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          default:
            return 0;
        }
      });
    }

    return {
      markets,
      groups,
      totalCount,
    };
  }

  /**
   * Get market by slug or address
   */
  async getMarket(slugOrAddress: string): Promise<LimitlessMarket | null> {
    try {
      const data = await this.request<LimitlessMarket>(`/markets/${slugOrAddress}`);
      return data;
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search markets using semantic similarity
   */
  async searchMarkets(
    query: string,
    limit = 20,
    similarityThreshold = 0.5
  ): Promise<LimitlessMarket[]> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
      similarityThreshold: similarityThreshold.toString(),
    });

    const data = await this.request<{ markets: LimitlessMarket[] }>(
      `/markets/search?${params}`
    );

    return data.markets || [];
  }

  /**
   * Get market slugs for all active markets
   */
  async getActiveSlugs(): Promise<Array<{
    slug: string;
    ticker?: string;
    strikePrice?: number;
    deadline?: string;
  }>> {
    const data = await this.request<{
      markets: Array<{ slug: string; ticker?: string; strikePrice?: number; deadline?: string }>;
      groups: Array<{ slug: string; markets: Array<{ slug: string }> }>;
    }>('/markets/active/slugs');

    const slugs: Array<{ slug: string; ticker?: string; strikePrice?: number; deadline?: string }> = [];

    // Add individual markets
    if (data.markets) {
      slugs.push(...data.markets);
    }

    // Add group markets
    if (data.groups) {
      for (const group of data.groups) {
        if (group.markets) {
          for (const market of group.markets) {
            slugs.push({ slug: market.slug });
          }
        }
      }
    }

    return slugs;
  }

  /**
   * Get category counts
   */
  async getCategoryCounts(): Promise<{ categories: LimitlessCategoryCount[]; total: number }> {
    const data = await this.request<{
      categories: LimitlessCategoryCount[];
      total: number;
    }>('/markets/categories/count');

    return data;
  }

  // ===========================================================================
  // Order Book Methods
  // ===========================================================================

  /**
   * Get order book for a market
   */
  async getOrderBook(slug: string): Promise<LimitlessOrderBook> {
    const data = await this.request<LimitlessOrderBook>(
      `/markets/${slug}/orderbook`,
      { skipCache: true } // Order books should be fresh
    );

    return data;
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(
    slug: string,
    interval: '1h' | '6h' | '1d' | '1w' | '1m' | 'all' = '1d',
    from?: string,
    to?: string
  ): Promise<Array<{ timestamp: string; price: number }>> {
    const params = new URLSearchParams({ interval });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const data = await this.request<{ prices: Array<{ timestamp: string; price: number }> }>(
      `/markets/${slug}/historical-price?${params}`
    );

    return data.prices || [];
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/markets/categories/count', { skipCache: true });
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

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  /**
   * Make a rate-limited, cached request with retry logic
   */
  private async request<T>(
    path: string,
    options: { skipCache?: boolean; retries?: number } = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const cacheKey = url;
    const maxRetries = options.retries ?? 3;

    // Check cache first
    if (!options.skipCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Rate limiting
    await this.checkRateLimit();

    // Make request with retry logic for 429 errors
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429) {
          // Rate limited - wait and retry with exponential backoff
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Limitless API error: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as T;

        // Cache response
        if (!options.skipCache) {
          this.setCache(cacheKey, data);
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Don't retry on non-429 errors
        if (!lastError.message.includes('429')) {
          throw lastError;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset window if needed
    if (now - this.windowStart > this.config.rateLimit.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if rate limited
    if (this.requestCount >= this.config.rateLimit.maxRequests) {
      const waitTime = this.config.rateLimit.retryAfterMs || 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Get from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T): void {
    // Enforce max size
    if (this.cache.size >= (this.config.cache.maxSize || 1000)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: new Date(Date.now() + this.config.cache.ttlMs),
    });
  }
}

// Export singleton
export const limitlessClient = new LimitlessClient();
