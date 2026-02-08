/**
 * Polymarket Gamma API Client Tests
 * Tests for the GammaClient class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GammaClient, type GammaMarket, type GammaEvent } from '../../src/polymarket/gamma-client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockGammaMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: 'market-123',
    question: 'Will Bitcoin reach $100k by end of 2025?',
    conditionId: 'condition-456',
    slug: 'will-bitcoin-reach-100k',
    description: 'Resolution based on CoinGecko price',
    endDate: '2025-12-31T23:59:59Z',
    liquidity: '50000',
    volume: '100000',
    active: true,
    closed: false,
    ...overrides,
  };
}

function createMockGammaEvent(overrides: Partial<GammaEvent> = {}): GammaEvent {
  return {
    id: 'event-789',
    ticker: 'BTC-100K',
    slug: 'bitcoin-price-predictions',
    title: 'Bitcoin Price Predictions 2025',
    description: 'Markets about BTC price milestones',
    active: true,
    closed: false,
    liquidity: '75000',
    volume: '150000',
    ...overrides,
  };
}

function mockFetchResponse(data: unknown, status = 200, headers?: Record<string, string>): void {
  const headersMap = new Map(Object.entries({
    'Content-Type': 'application/json',
    ...headers,
  }));

  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (key: string) => headersMap.get(key) ?? null,
    },
    json: () => Promise.resolve(data),
  });
}

// =============================================================================
// Configuration Tests
// =============================================================================

describe('GammaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should use default config values', () => {
      const client = new GammaClient();
      expect(client).toBeDefined();
    });

    it('should accept custom base URL', () => {
      const client = new GammaClient({
        baseUrl: 'https://custom-gamma.example.com',
      });
      expect(client).toBeDefined();
    });

    it('should accept custom rate limit config', () => {
      const client = new GammaClient({
        rateLimit: {
          maxRequests: 50,
          windowMs: 30000,
          retryAfterMs: 500,
        },
      });
      expect(client).toBeDefined();
    });

    it('should accept custom cache config', () => {
      const client = new GammaClient({
        cache: {
          ttlMs: 60000,
          maxSize: 500,
        },
      });
      expect(client).toBeDefined();
    });
  });

  // ===========================================================================
  // Market Endpoint Tests
  // ===========================================================================

  describe('getMarkets', () => {
    it('should fetch and return markets', async () => {
      const mockMarkets = [
        createMockGammaMarket(),
        createMockGammaMarket({ id: 'market-456', question: 'Will ETH flip BTC?' }),
      ];
      mockFetchResponse(mockMarkets);

      const client = new GammaClient();
      const markets = await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
      expect(markets).toHaveLength(2);
      expect(markets[0]?.id).toBe('market-123');
    });

    it('should pass limit parameter', async () => {
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      await client.getMarkets({ limit: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });

    it('should pass offset parameter', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.getMarkets({ offset: 100 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=100'),
        expect.any(Object)
      );
    });

    it('should pass active filter', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.getMarkets({ active: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.any(Object)
      );
    });

    it('should pass closed filter', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.getMarkets({ closed: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('closed=false'),
        expect.any(Object)
      );
    });

    it('should pass order parameter', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.getMarkets({ order: 'volume' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('order=volume'),
        expect.any(Object)
      );
    });

    it('should pass ascending parameter', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.getMarkets({ ascending: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ascending=true'),
        expect.any(Object)
      );
    });

    it('should validate response with Zod schema', async () => {
      const invalidMarket = { id: 123 }; // id should be string
      mockFetchResponse([invalidMarket]);

      const client = new GammaClient();
      await expect(client.getMarkets()).rejects.toThrow();
    });

    it('should handle number values for stringOrNumber fields', async () => {
      const market = createMockGammaMarket({
        liquidity: 50000 as unknown as string,
        volume: 100000 as unknown as string,
      });
      mockFetchResponse([market]);

      const client = new GammaClient();
      const markets = await client.getMarkets();

      expect(markets[0]?.liquidity).toBe('50000');
      expect(markets[0]?.volume).toBe('100000');
    });
  });

  describe('getMarket', () => {
    it('should fetch single market by ID', async () => {
      const mockMarket = createMockGammaMarket();
      mockFetchResponse(mockMarket);

      const client = new GammaClient();
      const market = await client.getMarket('market-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets/market-123',
        expect.any(Object)
      );
      expect(market?.id).toBe('market-123');
    });

    it('should fetch single market by slug', async () => {
      const mockMarket = createMockGammaMarket();
      mockFetchResponse(mockMarket);

      const client = new GammaClient();
      const market = await client.getMarket('will-bitcoin-reach-100k');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/markets/will-bitcoin-reach-100k',
        expect.any(Object)
      );
      expect(market).not.toBeNull();
    });

    it('should return null for 404 errors', async () => {
      mockFetchResponse({}, 404);

      const client = new GammaClient();
      const market = await client.getMarket('non-existent');

      expect(market).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetchResponse({}, 500);

      const client = new GammaClient();
      await expect(client.getMarket('market-123')).rejects.toThrow();
    });
  });

  describe('searchMarkets', () => {
    it('should search markets by query', async () => {
      const mockMarkets = [createMockGammaMarket()];
      mockFetchResponse(mockMarkets);

      const client = new GammaClient();
      const markets = await client.searchMarkets('bitcoin');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=bitcoin'),
        expect.any(Object)
      );
      expect(markets).toHaveLength(1);
    });

    it('should use default limit of 20', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.searchMarkets('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
    });

    it('should accept custom limit', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.searchMarkets('test', 50);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });

    it('should encode special characters in query', async () => {
      mockFetchResponse([]);

      const client = new GammaClient();
      await client.searchMarkets('bitcoin & ethereum');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=bitcoin+%26+ethereum'),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // Event Endpoint Tests
  // ===========================================================================

  describe('getEvents', () => {
    it('should fetch and return events', async () => {
      const mockEvents = [
        createMockGammaEvent(),
        createMockGammaEvent({ id: 'event-456', title: 'Ethereum Price Predictions' }),
      ];
      mockFetchResponse(mockEvents);

      const client = new GammaClient();
      const events = await client.getEvents();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events',
        expect.any(Object)
      );
      expect(events).toHaveLength(2);
    });

    it('should pass limit parameter', async () => {
      mockFetchResponse([createMockGammaEvent()]);

      const client = new GammaClient();
      await client.getEvents({ limit: 25 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=25'),
        expect.any(Object)
      );
    });

    it('should pass offset parameter', async () => {
      mockFetchResponse([createMockGammaEvent()]);

      const client = new GammaClient();
      await client.getEvents({ offset: 50 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=50'),
        expect.any(Object)
      );
    });

    it('should pass active filter', async () => {
      mockFetchResponse([createMockGammaEvent()]);

      const client = new GammaClient();
      await client.getEvents({ active: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.any(Object)
      );
    });

    it('should pass closed filter', async () => {
      mockFetchResponse([createMockGammaEvent()]);

      const client = new GammaClient();
      await client.getEvents({ closed: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('closed=false'),
        expect.any(Object)
      );
    });

    it('should include nested markets in events', async () => {
      const event = createMockGammaEvent({
        markets: [
          createMockGammaMarket({ id: 'nested-market-1' }),
          createMockGammaMarket({ id: 'nested-market-2' }),
        ],
      });
      mockFetchResponse([event]);

      const client = new GammaClient();
      const events = await client.getEvents();

      expect(events[0]?.markets).toHaveLength(2);
      expect(events[0]?.markets?.[0]?.id).toBe('nested-market-1');
    });
  });

  describe('getEvent', () => {
    it('should fetch single event by ID', async () => {
      const mockEvent = createMockGammaEvent();
      mockFetchResponse(mockEvent);

      const client = new GammaClient();
      const event = await client.getEvent('event-789');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gamma-api.polymarket.com/events/event-789',
        expect.any(Object)
      );
      expect(event?.id).toBe('event-789');
    });

    it('should return null for 404 errors', async () => {
      mockFetchResponse({}, 404);

      const client = new GammaClient();
      const event = await client.getEvent('non-existent');

      expect(event).toBeNull();
    });

    it('should throw for other errors', async () => {
      mockFetchResponse({}, 500);

      const client = new GammaClient();
      await expect(client.getEvent('event-789')).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Caching Tests
  // ===========================================================================

  describe('Caching', () => {
    it('should cache responses', async () => {
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      await client.getMarkets();
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache keys for different URLs', async () => {
      mockFetchResponse([createMockGammaMarket()]);
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      await client.getMarkets({ limit: 10 });
      await client.getMarkets({ limit: 20 });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when requested', async () => {
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      await client.getMarkets();

      client.clearCache();

      mockFetchResponse([createMockGammaMarket()]);
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Rate Limit Header Tests
  // ===========================================================================

  describe('Rate Limit Headers', () => {
    it('should update rate limit state from response headers', async () => {
      mockFetchResponse([createMockGammaMarket()], 200, {
        'X-RateLimit-Remaining': '50',
        'X-RateLimit-Reset': Math.floor(Date.now() / 1000 + 60).toString(),
      });

      const client = new GammaClient();
      await client.getMarkets();

      // Clear cache for next request
      client.clearCache();
      mockFetchResponse([createMockGammaMarket()]);
      await client.getMarkets();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should wrap fetch errors with context', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new GammaClient();
      await expect(client.getMarkets()).rejects.toThrow(
        'Gamma API request failed: Network error'
      );
    });

    it('should throw on non-OK responses', async () => {
      mockFetchResponse({}, 500);

      const client = new GammaClient();
      await expect(client.getMarkets()).rejects.toThrow('Gamma API error: 500');
    });
  });

  // ===========================================================================
  // Health Check Tests
  // ===========================================================================

  describe('healthCheck', () => {
    it('should return true when API is accessible', async () => {
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const client = new GammaClient();
      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it('should use limit=1 for efficiency', async () => {
      mockFetchResponse([createMockGammaMarket()]);

      const client = new GammaClient();
      await client.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=1'),
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // Schema Validation Tests
  // ===========================================================================

  describe('Schema Validation', () => {
    describe('GammaMarketSchema', () => {
      it('should accept valid market data', async () => {
        const validMarket = createMockGammaMarket();
        mockFetchResponse([validMarket]);

        const client = new GammaClient();
        const markets = await client.getMarkets();

        expect(markets[0]?.id).toBe('market-123');
      });

      it('should accept markets with all optional fields', async () => {
        const fullMarket = createMockGammaMarket({
          resolutionSource: 'CoinGecko',
          image: 'https://example.com/image.png',
          icon: 'https://example.com/icon.png',
          outcomes: '["Yes", "No"]',
          outcomePrices: '[0.65, 0.35]',
          marketMakerAddress: '0x123...',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          new: true,
          featured: true,
          submitted_by: 'user123',
          category: 'crypto',
          volume24hr: '5000',
          clobTokenIds: '["token1", "token2"]',
          umaBond: '100',
          umaReward: '50',
          volume24hrClob: '3000',
          volumeClob: '80000',
          liquidityClob: '40000',
          acceptingOrders: true,
          negRisk: false,
        });
        mockFetchResponse([fullMarket]);

        const client = new GammaClient();
        const markets = await client.getMarkets();

        expect(markets[0]?.category).toBe('crypto');
        expect(markets[0]?.featured).toBe(true);
      });

      it('should transform string and number values for stringOrNumber fields', async () => {
        const marketWithNumbers = {
          ...createMockGammaMarket(),
          liquidity: 50000,
          volume: 100000,
          volume24hr: 5000,
        };
        mockFetchResponse([marketWithNumbers]);

        const client = new GammaClient();
        const markets = await client.getMarkets();

        // Should be converted to strings
        expect(typeof markets[0]?.liquidity).toBe('string');
        expect(typeof markets[0]?.volume).toBe('string');
      });
    });

    describe('GammaEventSchema', () => {
      it('should accept valid event data', async () => {
        const validEvent = createMockGammaEvent();
        mockFetchResponse([validEvent]);

        const client = new GammaClient();
        const events = await client.getEvents();

        expect(events[0]?.id).toBe('event-789');
        expect(events[0]?.title).toBe('Bitcoin Price Predictions 2025');
      });

      it('should accept events with all optional fields', async () => {
        const fullEvent = createMockGammaEvent({
          startDate: '2024-01-01T00:00:00Z',
          creationDate: '2023-12-15T00:00:00Z',
          endDate: '2025-12-31T23:59:59Z',
          image: 'https://example.com/event.png',
          icon: 'https://example.com/event-icon.png',
          archived: false,
          new: true,
          featured: true,
          restricted: false,
          openInterest: '25000',
          competitionId: 'comp-123',
        });
        mockFetchResponse([fullEvent]);

        const client = new GammaClient();
        const events = await client.getEvents();

        expect(events[0]?.featured).toBe(true);
        expect(events[0]?.competitionId).toBe('comp-123');
      });
    });
  });
});
