/**
 * Opinion (O.LAB) API Client
 * BNB Chain prediction market platform
 * API Docs: https://docs.opinion.trade/developer-guide/opinion-open-api/overview
 */

import { z } from 'zod';

// =============================================================================
// Configuration
// =============================================================================

export interface OpinionClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<Omit<OpinionClientConfig, 'apiKey'>> = {
  baseUrl: 'https://proxy.opinion.trade:8443/openapi',
  timeout: 30000,
};

// =============================================================================
// API Response Schemas
// =============================================================================

export const OpinionOutcomeSchema = z.object({
  tokenId: z.string(),
  title: z.string(),
  price: z.number().optional(),
  index: z.number().optional(),
});

export const OpinionMarketSchema = z.object({
  marketId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'RESOLVED', 'CANCELLED']).optional(),
  category: z.string().optional(),
  createdAt: z.string().optional(),
  expirationTime: z.string().optional(),
  resolutionTime: z.string().optional(),
  volume: z.number().optional(),
  liquidity: z.number().optional(),
  outcomes: z.array(OpinionOutcomeSchema).optional(),
  quoteToken: z.string().optional(),
  winningOutcome: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const OpinionPriceSchema = z.object({
  tokenId: z.string(),
  price: z.number(),
  timestamp: z.string().optional(),
});

export const OpinionOrderBookLevelSchema = z.object({
  price: z.number(),
  size: z.number(),
});

export const OpinionOrderBookSchema = z.object({
  tokenId: z.string(),
  bids: z.array(OpinionOrderBookLevelSchema),
  asks: z.array(OpinionOrderBookLevelSchema),
  timestamp: z.string().optional(),
});

export const OpinionQuoteTokenSchema = z.object({
  symbol: z.string(),
  address: z.string(),
  decimals: z.number(),
});

export const OpinionApiResponseSchema = <T extends z.ZodType>(resultSchema: T) =>
  z.object({
    code: z.number(),
    msg: z.string(),
    result: resultSchema,
  });

// =============================================================================
// Types
// =============================================================================

export type OpinionMarket = z.infer<typeof OpinionMarketSchema>;
export type OpinionOutcome = z.infer<typeof OpinionOutcomeSchema>;
export type OpinionPrice = z.infer<typeof OpinionPriceSchema>;
export type OpinionOrderBook = z.infer<typeof OpinionOrderBookSchema>;
export type OpinionQuoteToken = z.infer<typeof OpinionQuoteTokenSchema>;

// =============================================================================
// API Client
// =============================================================================

export class OpinionClient {
  private config: Required<Omit<OpinionClientConfig, 'apiKey'>> & { apiKey?: string };
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  constructor(config: OpinionClientConfig = {}) {
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
      params?: Record<string, string | number | undefined>;
      cacheTtl?: number;
    } = {}
  ): Promise<T> {
    const { params, cacheTtl = 30000 } = options;

    // Build URL with query params
    const url = new URL(`${this.config.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Check cache
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    // Make request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['apikey'] = this.config.apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Opinion API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json() as { code: number; msg?: string; result: T };

      // Opinion API wraps results in { code, msg, result }
      if (json.code !== 0) {
        throw new Error(`Opinion API error: ${json.msg || 'Unknown error'}`);
      }

      const data = json.result;

      // Cache successful response
      this.setCache(cacheKey, data, cacheTtl);

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Opinion API request timed out');
      }
      throw error;
    }
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Get all markets with optional filtering
   */
  async getMarkets(params?: {
    status?: 'ACTIVE' | 'PAUSED' | 'RESOLVED' | 'CANCELLED';
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<OpinionMarket[]> {
    const result = await this.fetch<OpinionMarket[]>('/market', {
      params: {
        status: params?.status,
        category: params?.category,
        page: params?.page,
        limit: params?.limit || 20, // API max is 20
      },
      cacheTtl: 60000, // 1 minute cache for market list
    });

    return result;
  }

  /**
   * Get a single market by ID
   */
  async getMarket(marketId: string): Promise<OpinionMarket | null> {
    try {
      const result = await this.fetch<OpinionMarket>(`/market/${marketId}`, {
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
   * Get latest price for a token
   */
  async getLatestPrice(tokenId: string): Promise<OpinionPrice | null> {
    try {
      const result = await this.fetch<OpinionPrice>('/token/latest-price', {
        params: { tokenId },
        cacheTtl: 5000, // 5 second cache for prices
      });
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get orderbook for a token
   */
  async getOrderBook(tokenId: string): Promise<OpinionOrderBook> {
    const result = await this.fetch<OpinionOrderBook>('/token/orderbook', {
      params: { tokenId },
      cacheTtl: 5000, // 5 second cache for orderbook
    });
    return result;
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(
    tokenId: string,
    params?: {
      startTime?: string;
      endTime?: string;
      interval?: string;
    }
  ): Promise<OpinionPrice[]> {
    const result = await this.fetch<OpinionPrice[]>('/token/price-history', {
      params: {
        tokenId,
        startTime: params?.startTime,
        endTime: params?.endTime,
        interval: params?.interval,
      },
      cacheTtl: 60000, // 1 minute cache for history
    });
    return result;
  }

  /**
   * Get available quote tokens
   */
  async getQuoteTokens(): Promise<OpinionQuoteToken[]> {
    const result = await this.fetch<OpinionQuoteToken[]>('/quoteToken', {
      cacheTtl: 300000, // 5 minute cache for quote tokens
    });
    return result;
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

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Default client instance
export const opinionClient = new OpinionClient();
