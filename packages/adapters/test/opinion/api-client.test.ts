/**
 * Tests for Opinion (O.LAB) API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  OpinionClient,
  opinionClient,
  OpinionOutcomeSchema,
  OpinionMarketSchema,
  OpinionPriceSchema,
  OpinionOrderBookSchema,
  OpinionOrderBookLevelSchema,
  OpinionQuoteTokenSchema,
  OpinionApiResponseSchema,
  type OpinionMarket,
  type OpinionOutcome,
  type OpinionPrice,
  type OpinionOrderBook,
  type OpinionQuoteToken,
  type OpinionClientConfig,
} from '../../src/opinion/api-client';
import { z } from 'zod';

// =============================================================================
// Test Data Helpers
// =============================================================================

function createMockMarket(overrides: Partial<OpinionMarket> = {}): OpinionMarket {
  return {
    marketId: 'market-123',
    title: 'Will Fed raise rates in March 2025?',
    description: 'Federal Reserve interest rate decision',
    status: 'ACTIVE',
    category: 'Economics',
    createdAt: '2024-01-01T00:00:00Z',
    expirationTime: '2025-03-15T00:00:00Z',
    volume: 100000,
    liquidity: 50000,
    outcomes: [
      { tokenId: 'token-yes', title: 'Yes', price: 0.65, index: 0 },
      { tokenId: 'token-no', title: 'No', price: 0.35, index: 1 },
    ],
    quoteToken: 'USDT',
    imageUrl: 'https://example.com/image.jpg',
    ...overrides,
  };
}

function createMockPrice(overrides: Partial<OpinionPrice> = {}): OpinionPrice {
  return {
    tokenId: 'token-yes',
    price: 0.65,
    timestamp: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

function createMockOrderBook(overrides: Partial<OpinionOrderBook> = {}): OpinionOrderBook {
  return {
    tokenId: 'token-yes',
    bids: [
      { price: 0.64, size: 1000 },
      { price: 0.63, size: 2000 },
    ],
    asks: [
      { price: 0.66, size: 1500 },
      { price: 0.67, size: 2500 },
    ],
    timestamp: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

function createMockQuoteToken(overrides: Partial<OpinionQuoteToken> = {}): OpinionQuoteToken {
  return {
    symbol: 'USDT',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    ...overrides,
  };
}

function mockApiResponse<T>(result: T, code = 0, msg = 'success'): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ code, msg, result }),
  });
}

function mockErrorResponse(status: number, statusText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({ code: status, msg: statusText }),
  });
}

// =============================================================================
// Zod Schema Tests
// =============================================================================

describe('Zod Schemas', () => {
  describe('OpinionOutcomeSchema', () => {
    it('should validate valid outcome', () => {
      const outcome = { tokenId: 't1', title: 'Yes', price: 0.65, index: 0 };
      const result = OpinionOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const outcome = { tokenId: 't1', title: 'Yes' };
      const result = OpinionOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const outcome = { title: 'No token ID' };
      const result = OpinionOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(false);
    });
  });

  describe('OpinionMarketSchema', () => {
    it('should validate valid market', () => {
      const market = createMockMarket();
      const result = OpinionMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should validate all status types', () => {
      for (const status of ['ACTIVE', 'PAUSED', 'RESOLVED', 'CANCELLED'] as const) {
        const market = createMockMarket({ status });
        const result = OpinionMarketSchema.safeParse(market);
        expect(result.success).toBe(true);
      }
    });

    it('should require marketId and title', () => {
      const market = { description: 'Missing required fields' };
      const result = OpinionMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    it('should validate market with outcomes', () => {
      const market = createMockMarket({
        outcomes: [
          { tokenId: 't1', title: 'Yes', price: 0.6 },
          { tokenId: 't2', title: 'No', price: 0.4 },
        ],
      });
      const result = OpinionMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });
  });

  describe('OpinionPriceSchema', () => {
    it('should validate valid price', () => {
      const price = createMockPrice();
      const result = OpinionPriceSchema.safeParse(price);
      expect(result.success).toBe(true);
    });

    it('should require tokenId and price', () => {
      const price = { timestamp: '2024-01-01' };
      const result = OpinionPriceSchema.safeParse(price);
      expect(result.success).toBe(false);
    });
  });

  describe('OpinionOrderBookLevelSchema', () => {
    it('should validate valid level', () => {
      const level = { price: 0.65, size: 1000 };
      const result = OpinionOrderBookLevelSchema.safeParse(level);
      expect(result.success).toBe(true);
    });

    it('should require both price and size', () => {
      const level = { price: 0.65 };
      const result = OpinionOrderBookLevelSchema.safeParse(level);
      expect(result.success).toBe(false);
    });
  });

  describe('OpinionOrderBookSchema', () => {
    it('should validate valid order book', () => {
      const orderBook = createMockOrderBook();
      const result = OpinionOrderBookSchema.safeParse(orderBook);
      expect(result.success).toBe(true);
    });

    it('should allow empty bids and asks', () => {
      const orderBook = { tokenId: 't1', bids: [], asks: [] };
      const result = OpinionOrderBookSchema.safeParse(orderBook);
      expect(result.success).toBe(true);
    });
  });

  describe('OpinionQuoteTokenSchema', () => {
    it('should validate valid quote token', () => {
      const token = createMockQuoteToken();
      const result = OpinionQuoteTokenSchema.safeParse(token);
      expect(result.success).toBe(true);
    });

    it('should require all fields', () => {
      const token = { symbol: 'USDT' };
      const result = OpinionQuoteTokenSchema.safeParse(token);
      expect(result.success).toBe(false);
    });
  });

  describe('OpinionApiResponseSchema', () => {
    it('should validate API response wrapper', () => {
      const schema = OpinionApiResponseSchema(z.array(OpinionMarketSchema));
      const response = {
        code: 0,
        msg: 'success',
        result: [createMockMarket()],
      };
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate error response', () => {
      const schema = OpinionApiResponseSchema(z.array(OpinionMarketSchema));
      const response = {
        code: 400,
        msg: 'Bad Request',
        result: [],
      };
      const result = schema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// OpinionClient Tests
// =============================================================================

describe('OpinionClient', () => {
  let client: OpinionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new OpinionClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const c = new OpinionClient();
      expect(c).toBeInstanceOf(OpinionClient);
    });

    it('should accept custom config', () => {
      const config: OpinionClientConfig = {
        baseUrl: 'https://custom.api.com',
        apiKey: 'test-key',
        timeout: 60000,
      };
      const c = new OpinionClient(config);
      expect(c).toBeInstanceOf(OpinionClient);
    });

    it('should merge partial config with defaults', () => {
      const c = new OpinionClient({ apiKey: 'my-key' });
      expect(c).toBeInstanceOf(OpinionClient);
    });
  });

  describe('getMarkets', () => {
    it('should fetch markets', async () => {
      const markets = [createMockMarket()];
      mockApiResponse(markets);

      const result = await client.getMarkets();

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/market'),
        expect.any(Object)
      );
    });

    it('should filter by status', async () => {
      mockApiResponse([]);

      await client.getMarkets({ status: 'ACTIVE' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ACTIVE'),
        expect.any(Object)
      );
    });

    it('should filter by category', async () => {
      mockApiResponse([]);

      await client.getMarkets({ category: 'Economics' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=Economics'),
        expect.any(Object)
      );
    });

    it('should include pagination params', async () => {
      mockApiResponse([]);

      await client.getMarkets({ page: 2, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should use default limit of 20', async () => {
      mockApiResponse([]);

      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
    });

    it('should cache market responses', async () => {
      const markets = [createMockMarket()];
      mockApiResponse(markets);

      await client.getMarkets();
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMarket', () => {
    it('should fetch market by ID', async () => {
      const market = createMockMarket();
      mockApiResponse(market);

      const result = await client.getMarket('market-123');

      expect(result).not.toBeNull();
      expect(result?.marketId).toBe('market-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/market/market-123'),
        expect.any(Object)
      );
    });

    it('should return null for 404', async () => {
      mockErrorResponse(404, 'Not Found');

      const result = await client.getMarket('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockErrorResponse(500, 'Internal Server Error');

      await expect(client.getMarket('test')).rejects.toThrow('500');
    });
  });

  describe('getLatestPrice', () => {
    it('should fetch latest price for token', async () => {
      const price = createMockPrice();
      mockApiResponse(price);

      const result = await client.getLatestPrice('token-yes');

      expect(result).not.toBeNull();
      expect(result?.price).toBe(0.65);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/token/latest-price'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tokenId=token-yes'),
        expect.any(Object)
      );
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.getLatestPrice('token-yes');

      expect(result).toBeNull();
    });

    it('should use short cache TTL for prices', async () => {
      const price = createMockPrice();
      mockApiResponse(price);
      mockApiResponse({ ...price, price: 0.70 });

      await client.getLatestPrice('token-yes');

      // Advance past 5 second cache
      vi.advanceTimersByTime(6000);

      const result = await client.getLatestPrice('token-yes');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.price).toBe(0.70);
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book for token', async () => {
      const orderBook = createMockOrderBook();
      mockApiResponse(orderBook);

      const result = await client.getOrderBook('token-yes');

      expect(result.tokenId).toBe('token-yes');
      expect(result.bids).toHaveLength(2);
      expect(result.asks).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/token/orderbook'),
        expect.any(Object)
      );
    });

    it('should include tokenId param', async () => {
      mockApiResponse(createMockOrderBook());

      await client.getOrderBook('token-abc');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tokenId=token-abc'),
        expect.any(Object)
      );
    });
  });

  describe('getPriceHistory', () => {
    it('should fetch price history for token', async () => {
      const prices = [createMockPrice(), createMockPrice({ price: 0.60 })];
      mockApiResponse(prices);

      const result = await client.getPriceHistory('token-yes');

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/token/price-history'),
        expect.any(Object)
      );
    });

    it('should include time range params', async () => {
      mockApiResponse([]);

      await client.getPriceHistory('token-yes', {
        startTime: '2024-01-01',
        endTime: '2024-01-31',
        interval: '1h',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startTime=2024-01-01'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endTime=2024-01-31'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('interval=1h'),
        expect.any(Object)
      );
    });
  });

  describe('getQuoteTokens', () => {
    it('should fetch quote tokens', async () => {
      const tokens = [
        createMockQuoteToken(),
        createMockQuoteToken({ symbol: 'USDC', address: '0xUSDC' }),
      ];
      mockApiResponse(tokens);

      const result = await client.getQuoteTokens();

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/quoteToken'),
        expect.any(Object)
      );
    });

    it('should use long cache TTL for quote tokens', async () => {
      const tokens = [createMockQuoteToken()];
      mockApiResponse(tokens);

      await client.getQuoteTokens();
      await client.getQuoteTokens();

      // Should still be cached
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance past 5 minute cache
      vi.advanceTimersByTime(301000);
      mockApiResponse([createMockQuoteToken({ symbol: 'NEW' })]);

      const result = await client.getQuoteTokens();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result[0]?.symbol).toBe('NEW');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockApiResponse([createMockMarket()]);

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      const market = createMockMarket();
      mockApiResponse(market);
      mockApiResponse({ ...market, title: 'Updated Title' });

      await client.getMarket('test');
      client.clearCache();
      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('caching', () => {
    it('should cache GET responses', async () => {
      const market = createMockMarket();
      mockApiResponse(market);

      await client.getMarket('test');
      await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      const market = createMockMarket();
      mockApiResponse(market);
      mockApiResponse({ ...market, title: 'Updated' });

      await client.getMarket('test');

      // Advance past cache TTL (30 seconds)
      vi.advanceTimersByTime(31000);

      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.title).toBe('Updated');
    });

    it('should use different cache keys for different params', async () => {
      mockApiResponse([createMockMarket({ marketId: '1' })]);
      mockApiResponse([createMockMarket({ marketId: '2' })]);

      await client.getMarkets({ status: 'ACTIVE' });
      await client.getMarkets({ status: 'RESOLVED' });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('API key handling', () => {
    it('should include apikey header when configured', async () => {
      const authClient = new OpinionClient({ apiKey: 'test-api-key' });
      mockApiResponse([]);

      await authClient.getMarkets();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            apikey: 'test-api-key',
          }),
        })
      );
    });

    it('should not include apikey header without config', async () => {
      mockApiResponse([]);

      await client.getMarkets();

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs?.[1]?.headers).not.toHaveProperty('apikey');
    });
  });

  describe('API error handling', () => {
    it('should throw on non-zero code response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ code: 400, msg: 'Bad Request', result: null }),
      });

      await expect(client.getMarkets()).rejects.toThrow('Bad Request');
    });

    it('should throw on HTTP error', async () => {
      mockErrorResponse(500, 'Internal Server Error');

      await expect(client.getMarkets()).rejects.toThrow('Opinion API error: 500');
    });
  });

  describe('timeout handling', () => {
    it('should handle request timeout', async () => {
      const shortTimeoutClient = new OpinionClient({ timeout: 100 });

      mockFetch.mockImplementationOnce((_, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }
        });
      });

      vi.useRealTimers();
      await expect(shortTimeoutClient.getMarkets()).rejects.toThrow('timed out');
      vi.useFakeTimers();
    });
  });
});

// =============================================================================
// Singleton Export Tests
// =============================================================================

describe('opinionClient singleton', () => {
  it('should be an instance of OpinionClient', () => {
    expect(opinionClient).toBeInstanceOf(OpinionClient);
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe('Type definitions', () => {
  it('OpinionClientConfig should accept all options', () => {
    const config: OpinionClientConfig = {
      baseUrl: 'https://test.com',
      apiKey: 'key-123',
      timeout: 5000,
    };
    expect(config.baseUrl).toBe('https://test.com');
  });

  it('OpinionMarket should have all market fields', () => {
    const market: OpinionMarket = {
      marketId: 'test',
      title: 'Test Market',
      status: 'ACTIVE',
      volume: 1000,
    };
    expect(market.marketId).toBe('test');
  });

  it('OpinionOutcome should have outcome fields', () => {
    const outcome: OpinionOutcome = {
      tokenId: 't1',
      title: 'Yes',
      price: 0.5,
    };
    expect(outcome.tokenId).toBe('t1');
  });

  it('OpinionPrice should have price fields', () => {
    const price: OpinionPrice = {
      tokenId: 't1',
      price: 0.65,
    };
    expect(price.price).toBe(0.65);
  });

  it('OpinionOrderBook should have order book fields', () => {
    const orderBook: OpinionOrderBook = {
      tokenId: 't1',
      bids: [{ price: 0.6, size: 100 }],
      asks: [{ price: 0.7, size: 100 }],
    };
    expect(orderBook.bids).toHaveLength(1);
  });

  it('OpinionQuoteToken should have token fields', () => {
    const token: OpinionQuoteToken = {
      symbol: 'USDT',
      address: '0x123',
      decimals: 18,
    };
    expect(token.symbol).toBe('USDT');
  });
});
