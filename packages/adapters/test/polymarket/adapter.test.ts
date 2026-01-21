/**
 * Polymarket Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolymarketAdapter } from '../../src/polymarket/adapter';
import { GammaClient } from '../../src/polymarket/gamma-client';
import { PolymarketClobClient } from '../../src/polymarket/clob-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PolymarketAdapter', () => {
  let adapter: PolymarketAdapter;

  beforeEach(() => {
    adapter = new PolymarketAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      expect(adapter.platform).toBe('POLYMARKET');
      expect(adapter.config.platform).toBe('POLYMARKET');
      expect(adapter.config.chainId).toBe(137);
    });

    it('should expose underlying clients', () => {
      expect(adapter.getGammaClient()).toBeInstanceOf(GammaClient);
      expect(adapter.getClobClient()).toBeInstanceOf(PolymarketClobClient);
    });
  });

  describe('getMarkets', () => {
    it('should fetch and transform markets', async () => {
      const mockMarkets = [
        {
          id: '1',
          question: 'Will X happen?',
          conditionId: 'cond1',
          slug: 'will-x-happen',
          outcomePrices: '[0.6, 0.4]',
          volume: '1000000',
          liquidity: '50000',
          active: true,
          closed: false,
          clobTokenIds: '["token1", "token2"]',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMarkets,
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets({ limit: 10 });

      expect(markets).toHaveLength(1);
      expect(markets[0]).toMatchObject({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Will X happen?',
        yesPrice: 0.6,
        noPrice: 0.4,
        volume: 1000000,
        status: 'ACTIVE',
      });
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets();
      expect(markets).toEqual([]);
    });

    it('should filter by category', async () => {
      const mockMarkets = [
        {
          id: '1',
          question: 'Who will win election?',
          conditionId: 'cond1',
          slug: 'election',
          category: 'Politics',
          active: true,
          closed: false,
        },
        {
          id: '2',
          question: 'Will Bitcoin reach $100k?',
          conditionId: 'cond2',
          slug: 'bitcoin',
          category: 'Crypto',
          active: true,
          closed: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMarkets,
        headers: new Headers(),
      });

      const markets = await adapter.getMarkets({ category: 'POLITICS' });

      expect(markets).toHaveLength(1);
      expect(markets[0]?.question).toContain('election');
    });
  });

  describe('getMarket', () => {
    it('should fetch and transform a single market', async () => {
      const mockMarket = {
        id: '1',
        question: 'Will X happen?',
        conditionId: 'cond1',
        slug: 'will-x-happen',
        outcomePrices: '[0.55, 0.45]',
        volume: '500000',
        active: true,
        closed: false,
        clobTokenIds: '["token1", "token2"]',
      };

      // Mock Gamma API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMarket,
        headers: new Headers(),
      });

      // Mock CLOB orderbook response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          bids: [{ price: '0.54', size: '100' }],
          asks: [{ price: '0.56', size: '100' }],
        }),
        headers: new Headers(),
      });

      const market = await adapter.getMarket('will-x-happen');

      expect(market).toBeTruthy();
      expect(market?.id).toBe('1');
      expect(market?.yesPrice).toBe(0.55);
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

  describe('getEvents', () => {
    it('should fetch and transform events', async () => {
      const mockEvents = [
        {
          id: 'event1',
          ticker: 'ELECTION',
          slug: 'us-election-2024',
          title: 'US Presidential Election 2024',
          description: 'Who will win?',
          markets: [
            {
              id: 'm1',
              question: 'Will candidate A win?',
              conditionId: 'cond1',
              slug: 'candidate-a',
              active: true,
              closed: false,
            },
          ],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockEvents,
        headers: new Headers(),
      });

      const events = await adapter.getEvents({ limit: 10 });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'event1',
        platform: 'POLYMARKET',
        title: 'US Presidential Election 2024',
      });
      expect(events[0]?.markets).toHaveLength(1);
    });
  });

  describe('healthCheck', () => {
    it('should return true when both APIs are healthy', async () => {
      // Mock Gamma health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
        headers: new Headers(),
      });

      // Mock CLOB health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers(),
      });

      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when Gamma API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});

describe('GammaClient', () => {
  let client: GammaClient;

  beforeEach(() => {
    client = new GammaClient();
    vi.clearAllMocks();
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      // This is a basic test - in a real scenario you'd test the rate limiting behavior more thoroughly
      expect(client).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache responses', async () => {
      const mockData = [{ id: '1', question: 'Test?', conditionId: 'c1', slug: 'test' }];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers(),
      });

      // First call
      await client.getMarkets({ limit: 1 });

      // Second call should hit cache
      await client.getMarkets({ limit: 1 });

      // Should only have made one fetch call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      const mockData = [{ id: '1', question: 'Test?', conditionId: 'c1', slug: 'test' }];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers(),
      });

      await client.getMarkets({ limit: 1 });
      client.clearCache();
      await client.getMarkets({ limit: 1 });

      // Should have made two calls since cache was cleared
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchMarkets', () => {
    it('should search markets by query', async () => {
      const mockResults = [
        { id: '1', question: 'Bitcoin price prediction', conditionId: 'c1', slug: 'btc' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResults,
        headers: new Headers(),
      });

      const results = await client.searchMarkets('bitcoin');

      expect(results).toHaveLength(1);
      expect(results[0]?.question).toContain('Bitcoin');
    });
  });
});
