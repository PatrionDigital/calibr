/**
 * Opinion Platform Adapter Tests
 * Tests for the OpinionAdapter class that implements IPlatformAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpinionAdapter } from '../../src/opinion/adapter';
import type { OpinionMarket, OpinionOrderBook, OpinionPrice } from '../../src/opinion/api-client';

// Mock the OpinionClient
vi.mock('../../src/opinion/api-client', () => {
  const mockClient = {
    getMarkets: vi.fn(),
    getMarket: vi.fn(),
    getLatestPrice: vi.fn(),
    getOrderBook: vi.fn(),
    healthCheck: vi.fn(),
    clearCache: vi.fn(),
  };

  return {
    OpinionClient: vi.fn(() => mockClient),
  };
});

// Get reference to mock client
function getMockClient() {
  const adapter = new OpinionAdapter();
  return adapter.getClient() as unknown as {
    getMarkets: ReturnType<typeof vi.fn>;
    getMarket: ReturnType<typeof vi.fn>;
    getLatestPrice: ReturnType<typeof vi.fn>;
    getOrderBook: ReturnType<typeof vi.fn>;
    healthCheck: ReturnType<typeof vi.fn>;
    clearCache: ReturnType<typeof vi.fn>;
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockOpinionMarket(overrides: Partial<OpinionMarket> = {}): OpinionMarket {
  return {
    marketId: 'market-123',
    title: 'Will inflation exceed 3% in Q1 2025?',
    description: 'Resolution based on CPI data from the Bureau of Labor Statistics',
    status: 'ACTIVE',
    category: 'Economics',
    volume: 50000,
    liquidity: 25000,
    createdAt: '2025-01-01T00:00:00Z',
    expirationTime: '2025-03-31T23:59:59Z',
    outcomes: [
      { index: 0, title: 'Yes', tokenId: 'token-yes', price: 0.65 },
      { index: 1, title: 'No', tokenId: 'token-no', price: 0.35 },
    ],
    ...overrides,
  };
}

function createMockOrderBook(overrides: Partial<OpinionOrderBook> = {}): OpinionOrderBook {
  return {
    bids: [
      { price: 0.64, size: 100 },
      { price: 0.63, size: 200 },
    ],
    asks: [
      { price: 0.66, size: 100 },
      { price: 0.67, size: 150 },
    ],
    timestamp: '2025-01-15T12:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Adapter Configuration Tests
// =============================================================================

describe('OpinionAdapter', () => {
  describe('Configuration', () => {
    it('should have correct platform identifier', () => {
      const adapter = new OpinionAdapter();
      expect(adapter.platform).toBe('OPINION');
    });

    it('should have correct config values', () => {
      const adapter = new OpinionAdapter();
      expect(adapter.config.platform).toBe('OPINION');
      expect(adapter.config.apiBaseUrl).toBe('https://proxy.opinion.trade:8443/openapi');
      expect(adapter.config.chainId).toBe(56); // BNB Chain
      expect(adapter.config.wsUrl).toBeUndefined();
    });

    it('should accept client configuration', () => {
      const adapter = new OpinionAdapter({
        client: {
          apiKey: 'test-api-key',
          timeout: 5000,
        },
      });
      expect(adapter.platform).toBe('OPINION');
    });
  });

  // ===========================================================================
  // Market Data Tests
  // ===========================================================================

  describe('getMarkets', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should fetch and map markets correctly', async () => {
      const mockMarkets = [
        createMockOpinionMarket(),
        createMockOpinionMarket({
          marketId: 'market-456',
          title: 'Will Fed raise rates?',
        }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets();

      expect(mockClient.getMarkets).toHaveBeenCalledWith({
        status: undefined,
        page: 1,
        limit: 20,
      });
      expect(markets).toHaveLength(2);
      expect(markets[0]?.platform).toBe('OPINION');
      expect(markets[0]?.id).toBe('market-123');
      expect(markets[0]?.question).toBe('Will inflation exceed 3% in Q1 2025?');
    });

    it('should map status filter to API parameters', async () => {
      mockClient.getMarkets.mockResolvedValueOnce([]);

      const adapter = new OpinionAdapter();
      await adapter.getMarkets({ status: 'ACTIVE' });
      expect(mockClient.getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );

      mockClient.getMarkets.mockResolvedValueOnce([]);
      await adapter.getMarkets({ status: 'CLOSED' });
      expect(mockClient.getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAUSED' })
      );

      mockClient.getMarkets.mockResolvedValueOnce([]);
      await adapter.getMarkets({ status: 'RESOLVED' });
      expect(mockClient.getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'RESOLVED' })
      );

      mockClient.getMarkets.mockResolvedValueOnce([]);
      await adapter.getMarkets({ status: 'CANCELLED' });
      expect(mockClient.getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' })
      );
    });

    it('should handle pagination parameters', async () => {
      mockClient.getMarkets.mockResolvedValueOnce([]);

      const adapter = new OpinionAdapter();
      await adapter.getMarkets({ offset: 40, limit: 20 });

      expect(mockClient.getMarkets).toHaveBeenCalledWith({
        status: undefined,
        page: 3, // Math.floor(40 / 20) + 1
        limit: 20,
      });
    });

    it('should cap limit at API maximum of 20', async () => {
      mockClient.getMarkets.mockResolvedValueOnce([]);

      const adapter = new OpinionAdapter();
      await adapter.getMarkets({ limit: 100 });

      expect(mockClient.getMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 })
      );
    });

    it('should filter by category client-side', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ category: 'Economics' }),
        createMockOpinionMarket({ marketId: 'market-2', category: 'Sports' }),
        createMockOpinionMarket({ marketId: 'market-3', category: 'Crypto' }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ category: 'ECONOMICS' });

      expect(markets).toHaveLength(1);
      expect(markets[0]?.category).toBe('ECONOMICS');
    });

    it('should filter by search term client-side', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ title: 'Will inflation exceed 3%?' }),
        createMockOpinionMarket({ marketId: 'market-2', title: 'Will Fed raise rates?' }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ search: 'inflation' });

      expect(markets).toHaveLength(1);
      expect(markets[0]?.question).toContain('inflation');
    });

    it('should search in description as well', async () => {
      const mockMarkets = [
        createMockOpinionMarket({
          title: 'Market Question',
          description: 'Based on CPI inflation data',
        }),
        createMockOpinionMarket({
          marketId: 'market-2',
          title: 'Another Question',
          description: 'Based on Fed data',
        }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ search: 'inflation' });

      expect(markets).toHaveLength(1);
    });

    it('should sort by volume', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ marketId: 'm1', volume: 1000 }),
        createMockOpinionMarket({ marketId: 'm2', volume: 5000 }),
        createMockOpinionMarket({ marketId: 'm3', volume: 2000 }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ sortBy: 'volume' });

      expect(markets[0]?.id).toBe('m2');
      expect(markets[1]?.id).toBe('m3');
      expect(markets[2]?.id).toBe('m1');
    });

    it('should sort by liquidity', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ marketId: 'm1', liquidity: 500 }),
        createMockOpinionMarket({ marketId: 'm2', liquidity: 2000 }),
        createMockOpinionMarket({ marketId: 'm3', liquidity: 1000 }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ sortBy: 'liquidity' });

      expect(markets[0]?.id).toBe('m2');
      expect(markets[1]?.id).toBe('m3');
      expect(markets[2]?.id).toBe('m1');
    });

    it('should sort by created date', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ marketId: 'm1', createdAt: '2025-01-01T00:00:00Z' }),
        createMockOpinionMarket({ marketId: 'm2', createdAt: '2025-01-03T00:00:00Z' }),
        createMockOpinionMarket({ marketId: 'm3', createdAt: '2025-01-02T00:00:00Z' }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ sortBy: 'created' });

      expect(markets[0]?.id).toBe('m2');
      expect(markets[1]?.id).toBe('m3');
      expect(markets[2]?.id).toBe('m1');
    });

    it('should sort by closes date', async () => {
      const mockMarkets = [
        createMockOpinionMarket({
          marketId: 'm1',
          expirationTime: '2025-03-31T23:59:59Z',
        }),
        createMockOpinionMarket({
          marketId: 'm2',
          expirationTime: '2025-01-31T23:59:59Z',
        }),
        createMockOpinionMarket({ marketId: 'm3' }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ sortBy: 'closes' });

      expect(markets[0]?.id).toBe('m2'); // Earliest closing
      expect(markets[1]?.id).toBe('m1');
      expect(markets[2]?.id).toBe('m3'); // No close date goes last
    });

    it('should support ascending sort order', async () => {
      const mockMarkets = [
        createMockOpinionMarket({ marketId: 'm1', volume: 1000 }),
        createMockOpinionMarket({ marketId: 'm2', volume: 5000 }),
        createMockOpinionMarket({ marketId: 'm3', volume: 2000 }),
      ];
      mockClient.getMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets({ sortBy: 'volume', sortOrder: 'asc' });

      expect(markets[0]?.id).toBe('m1');
      expect(markets[1]?.id).toBe('m3');
      expect(markets[2]?.id).toBe('m2');
    });

    it('should return empty array when no markets found', async () => {
      mockClient.getMarkets.mockResolvedValueOnce([]);

      const adapter = new OpinionAdapter();
      const markets = await adapter.getMarkets();

      expect(markets).toEqual([]);
    });
  });

  describe('getMarket', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should fetch and map a single market', async () => {
      const mockMarket = createMockOpinionMarket();
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);
      mockClient.getLatestPrice.mockResolvedValue(null);

      const adapter = new OpinionAdapter();
      const market = await adapter.getMarket('market-123');

      expect(mockClient.getMarket).toHaveBeenCalledWith('market-123');
      expect(market).not.toBeNull();
      expect(market?.id).toBe('market-123');
      expect(market?.platform).toBe('OPINION');
    });

    it('should return null for non-existent market', async () => {
      mockClient.getMarket.mockResolvedValueOnce(null);

      const adapter = new OpinionAdapter();
      const market = await adapter.getMarket('non-existent');

      expect(market).toBeNull();
    });

    it('should enrich outcomes with latest price data', async () => {
      const mockMarket = createMockOpinionMarket({
        outcomes: [
          { index: 0, title: 'Yes', tokenId: 'token-yes', price: 0.60 },
          { index: 1, title: 'No', tokenId: 'token-no', price: 0.40 },
        ],
      });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);
      mockClient.getLatestPrice
        .mockResolvedValueOnce({ price: 0.68, timestamp: '2025-01-15T12:00:00Z' } as OpinionPrice)
        .mockResolvedValueOnce({ price: 0.32, timestamp: '2025-01-15T12:00:00Z' } as OpinionPrice);

      const adapter = new OpinionAdapter();
      const market = await adapter.getMarket('market-123');

      expect(market?.outcomes?.[0]?.price).toBe(0.68);
      expect(market?.outcomes?.[1]?.price).toBe(0.32);
      expect(market?.yesPrice).toBe(0.68);
      expect(market?.noPrice).toBe(0.32);
    });

    it('should handle price fetch errors gracefully', async () => {
      const mockMarket = createMockOpinionMarket();
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);
      mockClient.getLatestPrice.mockRejectedValue(new Error('Price API error'));

      const adapter = new OpinionAdapter();
      const market = await adapter.getMarket('market-123');

      expect(market).not.toBeNull();
      expect(market?.id).toBe('market-123');
      // Should use original prices from market data
      expect(market?.outcomes?.[0]?.price).toBe(0.65);
    });
  });

  describe('getEvents', () => {
    it('should return empty array (Opinion does not support events)', async () => {
      const adapter = new OpinionAdapter();
      const events = await adapter.getEvents();

      expect(events).toEqual([]);
    });

    it('should ignore any parameters', async () => {
      const adapter = new OpinionAdapter();
      const events = await adapter.getEvents({
        status: 'ACTIVE',
        category: 'POLITICS',
      });

      expect(events).toEqual([]);
    });
  });

  // ===========================================================================
  // Order Book Tests
  // ===========================================================================

  describe('getOrderBook', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should fetch and transform order book', async () => {
      const mockMarket = createMockOpinionMarket();
      const mockOrderBook = createMockOrderBook();
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);
      mockClient.getOrderBook.mockResolvedValueOnce(mockOrderBook);

      const adapter = new OpinionAdapter();
      const orderbook = await adapter.getOrderBook('market-123');

      expect(mockClient.getMarket).toHaveBeenCalledWith('market-123');
      expect(mockClient.getOrderBook).toHaveBeenCalledWith('token-yes');
      expect(orderbook.marketId).toBe('market-123');
      expect(orderbook.platform).toBe('OPINION');
      expect(orderbook.bids).toHaveLength(2);
      expect(orderbook.asks).toHaveLength(2);
      expect(orderbook.bestBid).toBe(0.64);
      expect(orderbook.bestAsk).toBe(0.66);
      expect(orderbook.spread).toBeCloseTo(0.02);
      expect(orderbook.midPrice).toBeCloseTo(0.65);
    });

    it('should return empty orderbook when market not found', async () => {
      mockClient.getMarket.mockResolvedValueOnce(null);

      const adapter = new OpinionAdapter();
      const orderbook = await adapter.getOrderBook('non-existent');

      expect(orderbook.marketId).toBe('non-existent');
      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should return empty orderbook when no outcomes', async () => {
      const mockMarket = createMockOpinionMarket({ outcomes: [] });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new OpinionAdapter();
      const orderbook = await adapter.getOrderBook('market-123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should return empty orderbook when no token ID', async () => {
      const mockMarket = createMockOpinionMarket({
        outcomes: [{ index: 0, title: 'Yes' }],
      });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new OpinionAdapter();
      const orderbook = await adapter.getOrderBook('market-123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should handle orderbook with empty sides', async () => {
      const mockMarket = createMockOpinionMarket();
      const mockOrderBook = createMockOrderBook({ bids: [], asks: [] });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);
      mockClient.getOrderBook.mockResolvedValueOnce(mockOrderBook);

      const adapter = new OpinionAdapter();
      const orderbook = await adapter.getOrderBook('market-123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
      expect(orderbook.bestBid).toBeUndefined();
      expect(orderbook.bestAsk).toBeUndefined();
      expect(orderbook.spread).toBeUndefined();
      expect(orderbook.midPrice).toBeUndefined();
    });
  });

  describe('getTrades', () => {
    it('should return empty array (Opinion API does not expose trades)', async () => {
      const adapter = new OpinionAdapter();
      const trades = await adapter.getTrades('market-123');

      expect(trades).toEqual([]);
    });

    it('should ignore limit parameter', async () => {
      const adapter = new OpinionAdapter();
      const trades = await adapter.getTrades('market-123', 500);

      expect(trades).toEqual([]);
    });
  });

  // ===========================================================================
  // Utility Method Tests
  // ===========================================================================

  describe('healthCheck', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should delegate to client health check', async () => {
      mockClient.healthCheck.mockResolvedValueOnce(true);

      const adapter = new OpinionAdapter();
      const result = await adapter.healthCheck();

      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when health check fails', async () => {
      mockClient.healthCheck.mockResolvedValueOnce(false);

      const adapter = new OpinionAdapter();
      const result = await adapter.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should delegate to client clear cache', () => {
      const adapter = new OpinionAdapter();
      adapter.clearCache();

      expect(mockClient.clearCache).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return the underlying client instance', () => {
      const adapter = new OpinionAdapter();
      const client = adapter.getClient();

      expect(client).toBeDefined();
      expect(client.getMarkets).toBeDefined();
      expect(client.getMarket).toBeDefined();
    });
  });

  // ===========================================================================
  // Market Mapping Tests
  // ===========================================================================

  describe('Market Mapping', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    describe('Status Mapping', () => {
      it.each([
        ['ACTIVE', 'ACTIVE'],
        ['TRADING', 'ACTIVE'],
        ['PAUSED', 'CLOSED'],
        ['CLOSED', 'CLOSED'],
        ['RESOLVED', 'RESOLVED'],
        ['SETTLED', 'RESOLVED'],
        ['CANCELLED', 'CANCELLED'],
        ['VOIDED', 'CANCELLED'],
        [undefined, 'ACTIVE'],
        ['UNKNOWN', 'ACTIVE'],
      ])('should map status %s to %s', async (input, expected) => {
        const mockMarket = createMockOpinionMarket({ status: input });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.status).toBe(expected);
      });
    });

    describe('Category Mapping', () => {
      it.each([
        ['Inflation', 'ECONOMICS'],
        ['Fed Rate Decision', 'ECONOMICS'],
        ['Interest Rates', 'ECONOMICS'],
        ['Employment Data', 'ECONOMICS'],
        ['GDP Growth', 'ECONOMICS'],
        ['CPI Report', 'ECONOMICS'],
        ['Economic Outlook', 'ECONOMICS'],
        ['Finance Markets', 'ECONOMICS'],
        ['Politics', 'POLITICS'],
        ['Election Results', 'POLITICS'],
        ['Government Policy', 'POLITICS'],
        ['Geopolitical Events', 'POLITICS'],
        ['Crypto Markets', 'CRYPTO'],
        ['Bitcoin Price', 'CRYPTO'],
        ['Ethereum Update', 'CRYPTO'],
        ['BTC/USD', 'CRYPTO'],
        ['ETH Merge', 'CRYPTO'],
        ['DeFi Protocol', 'CRYPTO'],
        ['Sports Results', 'SPORTS'],
        ['Technology Trends', 'TECHNOLOGY'],
        ['AI Development', 'TECHNOLOGY'],
        ['Science Discovery', 'TECHNOLOGY'],
        ['Celebrity News', 'ENTERTAINMENT'],
        ['Celebrity Gossip', 'ENTERTAINMENT'],
        ['Other Category', 'OTHER'],
        [undefined, undefined],
      ])('should map category "%s" to %s', async (input, expected) => {
        const mockMarket = createMockOpinionMarket({ category: input });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.category).toBe(expected);
      });
    });

    describe('Market Type Mapping', () => {
      it('should map binary market correctly', async () => {
        const mockMarket = createMockOpinionMarket({
          outcomes: [
            { index: 0, title: 'Yes', tokenId: 'yes', price: 0.6 },
            { index: 1, title: 'No', tokenId: 'no', price: 0.4 },
          ],
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('BINARY');
        expect(markets[0]?.outcomes).toHaveLength(2);
      });

      it('should map multi-choice market correctly', async () => {
        const mockMarket = createMockOpinionMarket({
          outcomes: [
            { index: 0, title: 'Option A', tokenId: 'a', price: 0.3 },
            { index: 1, title: 'Option B', tokenId: 'b', price: 0.3 },
            { index: 2, title: 'Option C', tokenId: 'c', price: 0.4 },
          ],
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('MULTIPLE_CHOICE');
        expect(markets[0]?.outcomes).toHaveLength(3);
      });

      it('should create default binary outcomes when none provided', async () => {
        const mockMarket = createMockOpinionMarket({ outcomes: undefined });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('BINARY');
        expect(markets[0]?.outcomes).toHaveLength(2);
        expect(markets[0]?.outcomes?.[0]?.label).toBe('Yes');
        expect(markets[0]?.outcomes?.[1]?.label).toBe('No');
        expect(markets[0]?.outcomes?.[0]?.price).toBe(0.5);
        expect(markets[0]?.outcomes?.[1]?.price).toBe(0.5);
      });
    });

    describe('Winning Outcome Mapping', () => {
      it('should map winning outcome by tokenId', async () => {
        const mockMarket = createMockOpinionMarket({
          winningOutcome: 'token-yes',
          outcomes: [
            { index: 0, title: 'Yes', tokenId: 'token-yes', price: 1 },
            { index: 1, title: 'No', tokenId: 'token-no', price: 0 },
          ],
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.outcomes?.[0]?.isWinner).toBe(true);
        expect(markets[0]?.outcomes?.[1]?.isWinner).toBe(false);
        expect(markets[0]?.winningOutcomeIndex).toBe(0);
      });

      it('should map winning outcome by title', async () => {
        const mockMarket = createMockOpinionMarket({
          winningOutcome: 'Yes',
          outcomes: [
            { index: 0, title: 'Yes', tokenId: 'token-yes', price: 1 },
            { index: 1, title: 'No', tokenId: 'token-no', price: 0 },
          ],
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.outcomes?.[0]?.isWinner).toBe(true);
        expect(markets[0]?.winningOutcomeIndex).toBe(0);
      });
    });

    describe('Date Mapping', () => {
      it('should map dates correctly', async () => {
        const mockMarket = createMockOpinionMarket({
          createdAt: '2025-01-01T00:00:00Z',
          expirationTime: '2025-03-31T23:59:59Z',
          resolutionTime: '2025-04-01T12:00:00Z',
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
        expect(markets[0]?.closesAt).toEqual(new Date('2025-03-31T23:59:59Z'));
        expect(markets[0]?.resolvedAt).toEqual(new Date('2025-04-01T12:00:00Z'));
      });

      it('should use current date when createdAt is missing', async () => {
        const mockMarket = createMockOpinionMarket({ createdAt: undefined });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const before = new Date();
        const markets = await adapter.getMarkets();
        const after = new Date();

        expect(markets[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(markets[0]?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('URL Generation', () => {
      it('should generate correct market URL', async () => {
        const mockMarket = createMockOpinionMarket({ marketId: 'test-market-id' });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.url).toBe('https://opinion.trade/market/test-market-id');
      });
    });

    describe('Platform Data', () => {
      it('should include platform-specific data', async () => {
        const mockMarket = createMockOpinionMarket({
          marketId: 'market-123',
          quoteToken: 'USDC',
          outcomes: [
            { index: 0, title: 'Yes', tokenId: 'token-yes', price: 0.65 },
            { index: 1, title: 'No', tokenId: 'token-no', price: 0.35 },
          ],
        });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.platformData).toEqual({
          marketId: 'market-123',
          quoteToken: 'USDC',
          outcomes: mockMarket.outcomes,
        });
      });
    });

    describe('Tags', () => {
      it('should include category as tag', async () => {
        const mockMarket = createMockOpinionMarket({ category: 'Economics' });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.tags).toContain('Economics');
      });

      it('should have empty tags when no category', async () => {
        const mockMarket = createMockOpinionMarket({ category: undefined });
        mockClient.getMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new OpinionAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.tags).toEqual([]);
      });
    });
  });
});
