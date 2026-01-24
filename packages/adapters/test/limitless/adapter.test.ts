/**
 * Limitless Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LimitlessAdapter } from '../../src/limitless/adapter';
import { LimitlessClient } from '../../src/limitless/api-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LimitlessAdapter', () => {
  let adapter: LimitlessAdapter;

  beforeEach(() => {
    adapter = new LimitlessAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      expect(adapter.platform).toBe('LIMITLESS');
      expect(adapter.config.platform).toBe('LIMITLESS');
      expect(adapter.config.chainId).toBe(8453); // Base mainnet
    });

    it('should expose underlying client', () => {
      expect(adapter.getClient()).toBeInstanceOf(LimitlessClient);
    });
  });

  describe('getMarkets', () => {
    it('should fetch and transform markets', async () => {
      const mockResponse = {
        markets: [
          {
            slug: 'will-btc-reach-100k',
            title: 'Will BTC reach $100k?',
            description: 'Bitcoin price prediction',
            status: 'active',
            volume: 50000000000, // 50000 USDC in micro-USDC (6 decimals)
            liquidity: 10000,
            outcomes: [
              { index: 0, title: 'Yes', price: 0.65 },
              { index: 1, title: 'No', price: 0.35 },
            ],
            category: 'crypto',
            deadline: '2025-12-31T00:00:00Z',
          },
        ],
        groups: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets({ limit: 10 });

      expect(markets).toHaveLength(1);
      expect(markets[0]).toMatchObject({
        externalId: 'will-btc-reach-100k',
        platform: 'LIMITLESS',
        question: 'Will BTC reach $100k?',
        yesPrice: 0.65,
        noPrice: 0.35,
        volume: 50000,
        status: 'ACTIVE',
      });
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ markets: [], groups: [] }),
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets();
      expect(markets).toEqual([]);
    });

    it('should filter by status', async () => {
      const mockResponse = {
        markets: [
          {
            slug: 'active-market',
            title: 'Active Market',
            status: 'active',
            outcomes: [
              { index: 0, title: 'Yes', price: 0.5 },
              { index: 1, title: 'No', price: 0.5 },
            ],
          },
        ],
        groups: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets({ status: 'ACTIVE' });

      expect(markets).toHaveLength(1);
      expect(markets[0]?.status).toBe('ACTIVE');
    });
  });

  describe('getMarket', () => {
    it('should fetch and transform a single market', async () => {
      const mockMarket = {
        slug: 'test-market',
        title: 'Test Market Question',
        description: 'Test description',
        status: 'active',
        volume: 25000,
        liquidity: 5000,
        outcomes: [
          { index: 0, title: 'Yes', price: 0.7 },
          { index: 1, title: 'No', price: 0.3 },
        ],
        venue: {
          exchange: '0x1234567890123456789012345678901234567890',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMarket,
        headers: new Headers(),
      });

      const market = await adapter.getMarket('test-market');

      expect(market).toBeTruthy();
      expect(market?.externalId).toBe('test-market');
      expect(market?.yesPrice).toBe(0.7);
      expect(market?.noPrice).toBe(0.3);
    });

    it('should return null for non-existent market', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
      });

      const market = await adapter.getMarket('non-existent');
      expect(market).toBeNull();
    });
  });

  describe('getOrderBook', () => {
    it('should fetch order book data', async () => {
      const mockOrderbook = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      const orderbook = await adapter.getOrderBook('test-market');

      expect(orderbook.bids).toHaveLength(2);
      expect(orderbook.asks).toHaveLength(2);
      expect(orderbook.bids[0]?.price).toBe(0.64);
      expect(orderbook.asks[0]?.price).toBe(0.66);
    });
  });

  describe('getMarketPrices', () => {
    it('should return current market prices', async () => {
      const mockOrderbook = {
        adjustedMidpoint: 0.55,
        bids: [{ price: 0.54, size: 100 }],
        asks: [{ price: 0.56, size: 100 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      const prices = await adapter.getMarketPrices('test-market');

      expect(prices.yesPrice).toBe(0.55);
      expect(prices.noPrice).toBeCloseTo(0.45, 5);
      expect(prices.spread).toBeCloseTo(0.02, 5);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ categories: [], total: 0 }),
        headers: new Headers(),
      });

      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});

describe('LimitlessClient', () => {
  let client: LimitlessClient;

  beforeEach(() => {
    client = new LimitlessClient();
    vi.clearAllMocks();
  });

  describe('caching', () => {
    it('should cache responses', async () => {
      const mockData = { markets: [], groups: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers(),
      });

      // First call
      await client.getActiveMarkets({ limit: 1 });

      // Second call should hit cache
      await client.getActiveMarkets({ limit: 1 });

      // Should only have made one fetch call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockData = { markets: [], groups: [] };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers(),
      });

      await client.getActiveMarkets({ limit: 1 });
      client.clearCache();
      await client.getActiveMarkets({ limit: 1 });

      // Should have made two calls since cache was cleared
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchMarkets', () => {
    it('should search markets by query', async () => {
      const mockResults = {
        markets: [
          { slug: 'btc-market', title: 'Bitcoin price prediction' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResults,
        headers: new Headers(),
      });

      const results = await client.searchMarkets('bitcoin');

      expect(results).toHaveLength(1);
      expect(results[0]?.title).toContain('Bitcoin');
    });
  });

  describe('getOrderBook', () => {
    it('should skip cache for order book requests', async () => {
      const mockOrderbook = {
        bids: [{ price: 0.5, size: 100 }],
        asks: [{ price: 0.51, size: 100 }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      // First call
      await client.getOrderBook('test-market');

      // Second call should NOT hit cache (fresh orderbook data needed)
      await client.getOrderBook('test-market');

      // Should have made two calls since orderbook bypasses cache
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
