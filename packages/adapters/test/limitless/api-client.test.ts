/**
 * Tests for Limitless Exchange API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  LimitlessClient,
  limitlessClient,
  LimitlessOutcomeSchema,
  LimitlessVenueSchema,
  LimitlessMarketSchema,
  LimitlessGroupSchema,
  LimitlessOrderBookSchema,
  LimitlessCategoryCountSchema,
  type LimitlessMarket,
  type LimitlessGroup,
  type LimitlessOrderBook,
  type LimitlessCategoryCount,
  type LimitlessClientConfig,
} from '../../src/limitless/api-client';

// =============================================================================
// Test Data Helpers
// =============================================================================

function createMockMarket(overrides: Partial<LimitlessMarket> = {}): LimitlessMarket {
  return {
    id: 1,
    slug: 'will-btc-reach-100k',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    description: 'Market description',
    status: 'active', // Schema expects 'active', 'closed', 'resolved', 'cancelled'
    prices: [0.35, 0.65],
    volume: 10000,
    liquidity: 5000,
    createdAt: '2024-01-01T00:00:00Z',
    expirationDate: '2024-12-31T23:59:59Z',
    venue: {
      exchange: '0x1234567890123456789012345678901234567890',
      collateral: '0xUSDC',
    },
    outcomes: [
      { index: 0, title: 'Yes', price: 0.65 },
      { index: 1, title: 'No', price: 0.35 },
    ],
    ...overrides,
  };
}

function createMockGroup(overrides: Partial<LimitlessGroup> = {}): LimitlessGroup {
  return {
    slug: 'crypto-predictions',
    title: 'Crypto Predictions',
    description: 'Group of crypto-related markets',
    markets: [createMockMarket()],
    volume: 50000,
    liquidity: 25000,
    ...overrides,
  };
}

function createMockOrderBook(overrides: Partial<LimitlessOrderBook> = {}): LimitlessOrderBook {
  return {
    adjustedMidpoint: 0.65,
    bids: [
      { price: 0.64, size: 100 },
      { price: 0.63, size: 200 },
    ],
    asks: [
      { price: 0.66, size: 150 },
      { price: 0.67, size: 250 },
    ],
    lastTradePrice: 0.65,
    maxSpread: 0.02,
    minimumSize: 1,
    ...overrides,
  };
}

function mockFetchResponse(data: unknown, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Map(),
  });
}

// =============================================================================
// Zod Schema Tests
// =============================================================================

describe('Zod Schemas', () => {
  describe('LimitlessOutcomeSchema', () => {
    it('should validate valid outcome', () => {
      const outcome = { index: 0, title: 'Yes', price: 0.65 };
      const result = LimitlessOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(true);
    });

    it('should allow optional price', () => {
      const outcome = { index: 0, title: 'Yes' };
      const result = LimitlessOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(true);
    });

    it('should reject invalid outcome', () => {
      const outcome = { index: 'invalid', title: 123 };
      const result = LimitlessOutcomeSchema.safeParse(outcome);
      expect(result.success).toBe(false);
    });
  });

  describe('LimitlessVenueSchema', () => {
    it('should validate valid venue', () => {
      const venue = {
        exchange: '0x1234',
        adapter: '0x5678',
        collateral: '0xUSDC',
      };
      const result = LimitlessVenueSchema.safeParse(venue);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields', () => {
      const venue = { exchange: '0x1234' };
      const result = LimitlessVenueSchema.safeParse(venue);
      expect(result.success).toBe(true);
    });
  });

  describe('LimitlessMarketSchema', () => {
    it('should validate valid market', () => {
      const market = createMockMarket();
      const result = LimitlessMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });

    it('should require slug', () => {
      const market = { title: 'Test' };
      const result = LimitlessMarketSchema.safeParse(market);
      expect(result.success).toBe(false);
    });

    it('should allow nested markets', () => {
      const market = {
        slug: 'group-market',
        title: 'Group',
        markets: [createMockMarket()],
      };
      const result = LimitlessMarketSchema.safeParse(market);
      expect(result.success).toBe(true);
    });
  });

  describe('LimitlessGroupSchema', () => {
    it('should validate valid group', () => {
      const group = createMockGroup();
      const result = LimitlessGroupSchema.safeParse(group);
      expect(result.success).toBe(true);
    });
  });

  describe('LimitlessOrderBookSchema', () => {
    it('should validate valid order book', () => {
      const orderBook = createMockOrderBook();
      const result = LimitlessOrderBookSchema.safeParse(orderBook);
      expect(result.success).toBe(true);
    });

    it('should allow empty bids/asks', () => {
      const orderBook = { adjustedMidpoint: 0.5, bids: [], asks: [] };
      const result = LimitlessOrderBookSchema.safeParse(orderBook);
      expect(result.success).toBe(true);
    });
  });

  describe('LimitlessCategoryCountSchema', () => {
    it('should validate valid category count', () => {
      const category = {
        categoryId: 'crypto',
        category: 'Cryptocurrency',
        count: 42,
      };
      const result = LimitlessCategoryCountSchema.safeParse(category);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// LimitlessClient Tests
// =============================================================================

describe('LimitlessClient', () => {
  let client: LimitlessClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    client = new LimitlessClient();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const c = new LimitlessClient();
      expect(c).toBeInstanceOf(LimitlessClient);
    });

    it('should accept custom config', () => {
      const config: LimitlessClientConfig = {
        baseUrl: 'https://custom.api.com',
        rateLimit: { maxRequests: 50, windowMs: 30000, retryAfterMs: 500 },
        cache: { ttlMs: 60000, maxSize: 500 },
      };
      const c = new LimitlessClient(config);
      expect(c).toBeInstanceOf(LimitlessClient);
    });

    it('should merge partial config with defaults', () => {
      const c = new LimitlessClient({ baseUrl: 'https://test.com' });
      expect(c).toBeInstanceOf(LimitlessClient);
    });
  });

  describe('getActiveMarkets', () => {
    it('should fetch active markets', async () => {
      const markets = [createMockMarket()];
      mockFetchResponse({ data: markets, totalMarketsCount: 1 });

      const result = await client.getActiveMarkets();

      expect(result.markets).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.limitless.exchange/markets/active',
        expect.any(Object)
      );
    });

    it('should handle markets response format', async () => {
      const markets = [createMockMarket()];
      const groups = [createMockGroup()];
      mockFetchResponse({ markets, groups, totalMarketsCount: 2 });

      const result = await client.getActiveMarkets();

      expect(result.markets).toHaveLength(1);
      expect(result.groups).toHaveLength(1);
    });

    it('should fetch markets by category', async () => {
      mockFetchResponse({ data: [], totalMarketsCount: 0 });

      await client.getActiveMarkets({ categoryId: 'crypto' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.limitless.exchange/markets/active/crypto',
        expect.any(Object)
      );
    });

    it('should include page parameter', async () => {
      mockFetchResponse({ data: [], totalMarketsCount: 0 });

      await client.getActiveMarkets({ page: 2 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.limitless.exchange/markets/active?page=2',
        expect.any(Object)
      );
    });

    it('should sort markets by volume client-side', async () => {
      const markets = [
        createMockMarket({ slug: 'low-vol', volume: 100 }),
        createMockMarket({ slug: 'high-vol', volume: 10000 }),
      ];
      mockFetchResponse({ data: markets, totalMarketsCount: 2 });

      const result = await client.getActiveMarkets({ sortBy: 'volume' });

      expect(result.markets[0]?.slug).toBe('high-vol');
      expect(result.markets[1]?.slug).toBe('low-vol');
    });

    it('should sort markets by liquidity', async () => {
      const markets = [
        createMockMarket({ slug: 'low-liq', liquidity: 100 }),
        createMockMarket({ slug: 'high-liq', liquidity: 10000 }),
      ];
      mockFetchResponse({ data: markets });

      const result = await client.getActiveMarkets({ sortBy: 'liquidity' });

      expect(result.markets[0]?.slug).toBe('high-liq');
    });

    it('should sort markets by createdAt', async () => {
      const markets = [
        createMockMarket({ slug: 'old', createdAt: '2023-01-01T00:00:00Z' }),
        createMockMarket({ slug: 'new', createdAt: '2024-01-01T00:00:00Z' }),
      ];
      mockFetchResponse({ data: markets });

      const result = await client.getActiveMarkets({ sortBy: 'createdAt' });

      expect(result.markets[0]?.slug).toBe('new');
    });

    it('should handle string volume for sorting', async () => {
      const markets = [
        createMockMarket({ slug: 'low', volume: '500' as unknown as number }),
        createMockMarket({ slug: 'high', volume: '5000' as unknown as number }),
      ];
      mockFetchResponse({ data: markets });

      const result = await client.getActiveMarkets({ sortBy: 'volume' });

      expect(result.markets[0]?.slug).toBe('high');
    });
  });

  describe('getMarket', () => {
    it('should fetch market by slug', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);

      const result = await client.getMarket('will-btc-reach-100k');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('will-btc-reach-100k');
    });

    it('should return null for 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const result = await client.getMarket('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getMarket('test')).rejects.toThrow('Limitless API error: 500');
    });
  });

  describe('searchMarkets', () => {
    it('should search markets by query', async () => {
      const markets = [createMockMarket()];
      mockFetchResponse({ markets });

      const result = await client.searchMarkets('bitcoin');

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/markets/search?query=bitcoin'),
        expect.any(Object)
      );
    });

    it('should include limit and similarity threshold', async () => {
      mockFetchResponse({ markets: [] });

      await client.searchMarkets('test', 10, 0.7);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('similarityThreshold=0.7'),
        expect.any(Object)
      );
    });

    it('should handle empty results', async () => {
      mockFetchResponse({});

      const result = await client.searchMarkets('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getActiveSlugs', () => {
    it('should fetch active slugs', async () => {
      mockFetchResponse({
        markets: [{ slug: 'market-1' }, { slug: 'market-2' }],
        groups: [],
      });

      const result = await client.getActiveSlugs();

      expect(result).toHaveLength(2);
      expect(result[0]?.slug).toBe('market-1');
    });

    it('should include group market slugs', async () => {
      mockFetchResponse({
        markets: [{ slug: 'market-1' }],
        groups: [
          {
            slug: 'group-1',
            markets: [{ slug: 'group-market-1' }, { slug: 'group-market-2' }],
          },
        ],
      });

      const result = await client.getActiveSlugs();

      expect(result).toHaveLength(3);
    });

    it('should include ticker and strikePrice', async () => {
      mockFetchResponse({
        markets: [{ slug: 'btc-100k', ticker: 'BTCUSD', strikePrice: 100000 }],
        groups: [],
      });

      const result = await client.getActiveSlugs();

      expect(result[0]?.ticker).toBe('BTCUSD');
      expect(result[0]?.strikePrice).toBe(100000);
    });
  });

  describe('getCategoryCounts', () => {
    it('should fetch category counts', async () => {
      const categories: LimitlessCategoryCount[] = [
        { categoryId: 'crypto', category: 'Crypto', count: 42 },
        { categoryId: 'politics', category: 'Politics', count: 15 },
      ];
      mockFetchResponse({ categories, total: 57 });

      const result = await client.getCategoryCounts();

      expect(result.categories).toHaveLength(2);
      expect(result.total).toBe(57);
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book', async () => {
      const orderBook = createMockOrderBook();
      mockFetchResponse(orderBook);

      const result = await client.getOrderBook('test-market');

      expect(result.adjustedMidpoint).toBe(0.65);
      expect(result.bids).toHaveLength(2);
      expect(result.asks).toHaveLength(2);
    });

    it('should skip cache for order book', async () => {
      const orderBook = createMockOrderBook();
      mockFetchResponse(orderBook);
      mockFetchResponse({ ...orderBook, adjustedMidpoint: 0.70 });

      await client.getOrderBook('test-market');
      const result2 = await client.getOrderBook('test-market');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result2.adjustedMidpoint).toBe(0.70);
    });
  });

  describe('getHistoricalPrices', () => {
    it('should fetch historical prices', async () => {
      const prices = [
        { timestamp: '2024-01-01T00:00:00Z', price: 0.5 },
        { timestamp: '2024-01-02T00:00:00Z', price: 0.55 },
      ];
      mockFetchResponse({ prices });

      const result = await client.getHistoricalPrices('test-market', '1d');

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('interval=1d'),
        expect.any(Object)
      );
    });

    it('should include from and to params', async () => {
      mockFetchResponse({ prices: [] });

      await client.getHistoricalPrices(
        'test-market',
        '1h',
        '2024-01-01',
        '2024-01-31'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('from=2024-01-01'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('to=2024-01-31'),
        expect.any(Object)
      );
    });

    it('should handle empty prices', async () => {
      mockFetchResponse({});

      const result = await client.getHistoricalPrices('test-market');

      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetchResponse({ categories: [], total: 0 });

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
      mockFetchResponse(market);
      mockFetchResponse({ ...market, title: 'Updated Title' });

      await client.getMarket('test');
      client.clearCache();
      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('caching', () => {
    it('should cache responses', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);

      await client.getMarket('test');
      await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache TTL', async () => {
      const market = createMockMarket();
      mockFetchResponse(market);
      mockFetchResponse({ ...market, title: 'Updated' });

      await client.getMarket('test');

      // Advance time past cache TTL (30 seconds default)
      vi.advanceTimersByTime(31000);

      const result = await client.getMarket('test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result?.title).toBe('Updated');
    });

    it('should enforce max cache size', async () => {
      const smallCacheClient = new LimitlessClient({
        cache: { ttlMs: 30000, maxSize: 2 },
      });

      mockFetchResponse(createMockMarket({ slug: 'market-1' }));
      mockFetchResponse(createMockMarket({ slug: 'market-2' }));
      mockFetchResponse(createMockMarket({ slug: 'market-3' }));
      mockFetchResponse(createMockMarket({ slug: 'market-1' })); // Re-fetch

      await smallCacheClient.getMarket('market-1');
      await smallCacheClient.getMarket('market-2');
      await smallCacheClient.getMarket('market-3');
      await smallCacheClient.getMarket('market-1'); // Should be evicted

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('rate limiting', () => {
    it('should track request count', async () => {
      mockFetchResponse(createMockMarket());
      mockFetchResponse(createMockMarket());

      await client.getMarket('test1');
      await client.getMarket('test2');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should reset window after windowMs', async () => {
      mockFetchResponse(createMockMarket());

      await client.getMarket('test');

      // Advance past rate limit window
      vi.advanceTimersByTime(61000);

      mockFetchResponse(createMockMarket());
      await client.getMarket('test2');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should wait when rate limit exceeded', async () => {
      const limitedClient = new LimitlessClient({
        rateLimit: { maxRequests: 1, windowMs: 60000, retryAfterMs: 100 },
      });

      mockFetchResponse(createMockMarket());
      mockFetchResponse(createMockMarket());
      mockFetchResponse(createMockMarket());

      const promise1 = limitedClient.getMarket('test1');
      await vi.advanceTimersByTimeAsync(0);
      await promise1;

      const promise2 = limitedClient.getMarket('test2');

      // Should wait for retryAfterMs
      await vi.advanceTimersByTimeAsync(100);
      await promise2;

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry logic', () => {
    let retryClient: LimitlessClient;

    beforeEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
      mockFetch.mockReset();
      // Create fresh client for each retry test
      retryClient = new LimitlessClient();
    });

    afterEach(() => {
      vi.useFakeTimers();
    });

    it('should retry on 429 response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: { get: () => '0' },
          json: () => Promise.resolve({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(createMockMarket()),
          headers: new Map(),
        });

      const result = await retryClient.getMarket('test');

      expect(result).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent 429', async () => {
      // Mock 5 consecutive 429 responses (more than max retries)
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: { get: () => '0' },
          json: () => Promise.resolve({}),
        })
      );

      await expect(retryClient.getMarket('test')).rejects.toThrow();
      // Initial + 3 retries = 4 calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should not retry on non-429 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server Error' }),
      });

      await expect(retryClient.getMarket('test')).rejects.toThrow('500');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Singleton Export Tests
// =============================================================================

describe('limitlessClient singleton', () => {
  it('should be an instance of LimitlessClient', () => {
    expect(limitlessClient).toBeInstanceOf(LimitlessClient);
  });
});

// =============================================================================
// Type Tests
// =============================================================================

describe('Type definitions', () => {
  it('LimitlessClientConfig should accept all options', () => {
    const config: LimitlessClientConfig = {
      baseUrl: 'https://test.com',
      rateLimit: {
        maxRequests: 100,
        windowMs: 60000,
        retryAfterMs: 1000,
      },
      cache: {
        ttlMs: 30000,
        maxSize: 500,
      },
    };
    expect(config.baseUrl).toBe('https://test.com');
  });

  it('LimitlessMarket should have all market fields', () => {
    const market: LimitlessMarket = {
      slug: 'test',
      title: 'Test Market',
      status: 'FUNDED',
      prices: [0.5, 0.5],
      volume: 1000,
    };
    expect(market.slug).toBe('test');
  });

  it('LimitlessGroup should contain markets', () => {
    const group: LimitlessGroup = {
      slug: 'group',
      title: 'Group Title',
      markets: [{ slug: 'child', title: 'Child' }],
    };
    expect(group.markets).toHaveLength(1);
  });

  it('LimitlessOrderBook should have bids and asks', () => {
    const orderBook: LimitlessOrderBook = {
      bids: [{ price: 0.5, size: 100 }],
      asks: [{ price: 0.6, size: 100 }],
    };
    expect(orderBook.bids).toHaveLength(1);
    expect(orderBook.asks).toHaveLength(1);
  });

  it('LimitlessCategoryCount should have count', () => {
    const category: LimitlessCategoryCount = {
      categoryId: 'crypto',
      category: 'Crypto',
      count: 42,
    };
    expect(category.count).toBe(42);
  });
});
