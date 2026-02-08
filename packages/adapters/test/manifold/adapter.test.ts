/**
 * Manifold Markets Platform Adapter Tests
 * Tests for the ManifoldAdapter class that implements IPlatformAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifoldAdapter } from '../../src/manifold/adapter';
import type { ManifoldMarket, ManifoldBet } from '../../src/manifold/api-client';

// Mock the ManifoldClient
vi.mock('../../src/manifold/api-client', () => {
  const mockClient = {
    getMarkets: vi.fn(),
    getMarket: vi.fn(),
    getMarketBySlug: vi.fn(),
    searchMarkets: vi.fn(),
    getBets: vi.fn(),
    healthCheck: vi.fn(),
    clearCache: vi.fn(),
  };

  return {
    ManifoldClient: vi.fn(() => mockClient),
  };
});

// Get reference to mock client
function getMockClient() {
  const adapter = new ManifoldAdapter();
  return adapter.getClient() as unknown as {
    getMarkets: ReturnType<typeof vi.fn>;
    getMarket: ReturnType<typeof vi.fn>;
    getMarketBySlug: ReturnType<typeof vi.fn>;
    searchMarkets: ReturnType<typeof vi.fn>;
    getBets: ReturnType<typeof vi.fn>;
    healthCheck: ReturnType<typeof vi.fn>;
    clearCache: ReturnType<typeof vi.fn>;
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockManifoldMarket(overrides: Partial<ManifoldMarket> = {}): ManifoldMarket {
  return {
    id: 'market-abc123',
    slug: 'will-btc-hit-100k',
    question: 'Will Bitcoin hit $100k by end of 2025?',
    textDescription: 'Resolution based on CoinGecko price at midnight UTC',
    url: 'https://manifold.markets/user/will-btc-hit-100k',
    createdTime: 1704067200000, // 2024-01-01
    closeTime: 1735689600000, // 2025-01-01
    isResolved: false,
    probability: 0.65,
    volume: 50000,
    totalLiquidity: 10000,
    outcomeType: 'BINARY',
    mechanism: 'cpmm-1',
    creatorId: 'user-123',
    creatorUsername: 'cryptofan',
    groupSlugs: ['crypto', 'bitcoin'],
    ...overrides,
  };
}

function createMockBet(overrides: Partial<ManifoldBet> = {}): ManifoldBet {
  return {
    id: 'bet-123',
    contractId: 'market-abc123',
    userId: 'user-456',
    amount: 100,
    shares: 150,
    outcome: 'YES',
    probBefore: 0.60,
    probAfter: 0.65,
    createdTime: 1704153600000,
    isRedemption: false,
    ...overrides,
  };
}

// =============================================================================
// Adapter Configuration Tests
// =============================================================================

describe('ManifoldAdapter', () => {
  describe('Configuration', () => {
    it('should have correct platform identifier', () => {
      const adapter = new ManifoldAdapter();
      expect(adapter.platform).toBe('MANIFOLD');
    });

    it('should have correct config values', () => {
      const adapter = new ManifoldAdapter();
      expect(adapter.config.platform).toBe('MANIFOLD');
      expect(adapter.config.apiBaseUrl).toBe('https://api.manifold.markets');
      expect(adapter.config.wsUrl).toBe('wss://api.manifold.markets/ws');
      expect(adapter.config.chainId).toBeUndefined(); // Play money
    });

    it('should accept client configuration', () => {
      const adapter = new ManifoldAdapter({
        client: {
          apiKey: 'test-api-key',
          timeout: 5000,
        },
      });
      expect(adapter.platform).toBe('MANIFOLD');
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
        createMockManifoldMarket(),
        createMockManifoldMarket({
          id: 'market-def456',
          question: 'Will ETH flip BTC?',
        }),
      ];
      mockClient.searchMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new ManifoldAdapter();
      const markets = await adapter.getMarkets();

      expect(mockClient.searchMarkets).toHaveBeenCalledWith({
        term: undefined,
        filter: 'open',
        sort: 'score',
        limit: 100,
        offset: 0,
      });
      expect(markets).toHaveLength(2);
      expect(markets[0]?.platform).toBe('MANIFOLD');
      expect(markets[0]?.id).toBe('market-abc123');
      expect(markets[0]?.question).toBe('Will Bitcoin hit $100k by end of 2025?');
    });

    it('should map status filter to API parameters', async () => {
      mockClient.searchMarkets.mockResolvedValue([]);

      const adapter = new ManifoldAdapter();

      await adapter.getMarkets({ status: 'ACTIVE' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'open' })
      );

      await adapter.getMarkets({ status: 'CLOSED' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'closed' })
      );

      await adapter.getMarkets({ status: 'RESOLVED' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'resolved' })
      );
    });

    it('should map sort parameters', async () => {
      mockClient.searchMarkets.mockResolvedValue([]);

      const adapter = new ManifoldAdapter();

      await adapter.getMarkets({ sortBy: 'volume' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ sort: '24-hour-vol' })
      );

      await adapter.getMarkets({ sortBy: 'liquidity' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'liquidity' })
      );

      await adapter.getMarkets({ sortBy: 'created' });
      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'newest' })
      );
    });

    it('should pass search term to API', async () => {
      mockClient.searchMarkets.mockResolvedValueOnce([]);

      const adapter = new ManifoldAdapter();
      await adapter.getMarkets({ search: 'bitcoin price' });

      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ term: 'bitcoin price' })
      );
    });

    it('should handle pagination parameters', async () => {
      mockClient.searchMarkets.mockResolvedValueOnce([]);

      const adapter = new ManifoldAdapter();
      await adapter.getMarkets({ offset: 50, limit: 25 });

      expect(mockClient.searchMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 50, limit: 25 })
      );
    });

    it('should filter by category client-side', async () => {
      const mockMarkets = [
        createMockManifoldMarket({ groupSlugs: ['crypto', 'bitcoin'] }),
        createMockManifoldMarket({ id: 'market-2', groupSlugs: ['sports', 'nfl'] }),
        createMockManifoldMarket({ id: 'market-3', groupSlugs: ['politics', 'election'] }),
      ];
      mockClient.searchMarkets.mockResolvedValueOnce(mockMarkets);

      const adapter = new ManifoldAdapter();
      const markets = await adapter.getMarkets({ category: 'CRYPTO' });

      expect(markets).toHaveLength(1);
      expect(markets[0]?.category).toBe('CRYPTO');
    });

    it('should return empty array when no markets found', async () => {
      mockClient.searchMarkets.mockResolvedValueOnce([]);

      const adapter = new ManifoldAdapter();
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

    it('should fetch market by ID', async () => {
      const mockMarket = createMockManifoldMarket();
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new ManifoldAdapter();
      const market = await adapter.getMarket('market-abc123');

      expect(mockClient.getMarket).toHaveBeenCalledWith('market-abc123');
      expect(market).not.toBeNull();
      expect(market?.id).toBe('market-abc123');
      expect(market?.platform).toBe('MANIFOLD');
    });

    it('should fall back to slug lookup if ID not found', async () => {
      mockClient.getMarket.mockResolvedValueOnce(null);
      const mockMarket = createMockManifoldMarket();
      mockClient.getMarketBySlug.mockResolvedValueOnce(mockMarket);

      const adapter = new ManifoldAdapter();
      const market = await adapter.getMarket('will-btc-hit-100k');

      expect(mockClient.getMarket).toHaveBeenCalledWith('will-btc-hit-100k');
      expect(mockClient.getMarketBySlug).toHaveBeenCalledWith('will-btc-hit-100k');
      expect(market).not.toBeNull();
    });

    it('should return null when market not found by ID or slug', async () => {
      mockClient.getMarket.mockResolvedValueOnce(null);
      mockClient.getMarketBySlug.mockResolvedValueOnce(null);

      const adapter = new ManifoldAdapter();
      const market = await adapter.getMarket('non-existent');

      expect(market).toBeNull();
    });
  });

  describe('getEvents', () => {
    it('should return empty array (Manifold does not support events)', async () => {
      const adapter = new ManifoldAdapter();
      const events = await adapter.getEvents();

      expect(events).toEqual([]);
    });

    it('should ignore any parameters', async () => {
      const adapter = new ManifoldAdapter();
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

    it('should generate synthetic orderbook from probability', async () => {
      const mockMarket = createMockManifoldMarket({
        probability: 0.70,
        pool: { YES: 5000, NO: 5000 },
      });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new ManifoldAdapter();
      const orderbook = await adapter.getOrderBook('market-abc123');

      expect(orderbook.marketId).toBe('market-abc123');
      expect(orderbook.platform).toBe('MANIFOLD');
      expect(orderbook.bids).toHaveLength(1);
      expect(orderbook.asks).toHaveLength(1);
      expect(orderbook.bids[0]?.price).toBeCloseTo(0.69); // prob - 0.01
      expect(orderbook.asks[0]?.price).toBeCloseTo(0.71); // prob + 0.01
      expect(orderbook.spread).toBeCloseTo(0.02);
      expect(orderbook.midPrice).toBeCloseTo(0.70);
    });

    it('should return empty orderbook when market not found', async () => {
      mockClient.getMarket.mockResolvedValueOnce(null);

      const adapter = new ManifoldAdapter();
      const orderbook = await adapter.getOrderBook('non-existent');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should return empty orderbook when no pool data', async () => {
      const mockMarket = createMockManifoldMarket({ pool: undefined });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new ManifoldAdapter();
      const orderbook = await adapter.getOrderBook('market-abc123');

      expect(orderbook.bids).toEqual([]);
      expect(orderbook.asks).toEqual([]);
    });

    it('should use p field if probability not available', async () => {
      const mockMarket = createMockManifoldMarket({
        probability: undefined,
        p: 0.55,
        pool: { YES: 1000, NO: 1000 },
      });
      mockClient.getMarket.mockResolvedValueOnce(mockMarket);

      const adapter = new ManifoldAdapter();
      const orderbook = await adapter.getOrderBook('market-abc123');

      expect(orderbook.midPrice).toBeCloseTo(0.55);
    });
  });

  describe('getTrades', () => {
    let mockClient: ReturnType<typeof getMockClient>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = getMockClient();
    });

    it('should fetch and transform bets into trades', async () => {
      const mockBets = [
        createMockBet({ amount: 100, probAfter: 0.65 }),
        createMockBet({ id: 'bet-456', amount: -50, probAfter: 0.60 }),
      ];
      mockClient.getBets.mockResolvedValueOnce(mockBets);

      const adapter = new ManifoldAdapter();
      const trades = await adapter.getTrades('market-abc123', 50);

      expect(mockClient.getBets).toHaveBeenCalledWith({
        contractId: 'market-abc123',
        limit: 50,
      });
      expect(trades).toHaveLength(2);
      expect(trades[0]?.price).toBe(0.65);
      expect(trades[0]?.size).toBe(100);
      expect(trades[0]?.side).toBe('BUY');
      expect(trades[1]?.side).toBe('SELL');
    });

    it('should use default limit of 100', async () => {
      mockClient.getBets.mockResolvedValueOnce([]);

      const adapter = new ManifoldAdapter();
      await adapter.getTrades('market-abc123');

      expect(mockClient.getBets).toHaveBeenCalledWith({
        contractId: 'market-abc123',
        limit: 100,
      });
    });

    it('should transform trade data correctly', async () => {
      const mockBet = createMockBet({
        id: 'bet-789',
        contractId: 'market-xyz',
        userId: 'trader-123',
        createdTime: 1704240000000,
        probAfter: 0.75,
        amount: 200,
      });
      mockClient.getBets.mockResolvedValueOnce([mockBet]);

      const adapter = new ManifoldAdapter();
      const trades = await adapter.getTrades('market-xyz');

      expect(trades[0]).toMatchObject({
        id: 'bet-789',
        marketId: 'market-xyz',
        platform: 'MANIFOLD',
        price: 0.75,
        size: 200,
        side: 'BUY',
        taker: 'trader-123',
        maker: undefined,
      });
      expect(trades[0]?.timestamp).toEqual(new Date(1704240000000));
    });

    it('should use probBefore if probAfter not available', async () => {
      const mockBet = createMockBet({
        probAfter: undefined,
        probBefore: 0.55,
      });
      mockClient.getBets.mockResolvedValueOnce([mockBet]);

      const adapter = new ManifoldAdapter();
      const trades = await adapter.getTrades('market-abc123');

      expect(trades[0]?.price).toBe(0.55);
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

      const adapter = new ManifoldAdapter();
      const result = await adapter.healthCheck();

      expect(mockClient.healthCheck).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when health check fails', async () => {
      mockClient.healthCheck.mockResolvedValueOnce(false);

      const adapter = new ManifoldAdapter();
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
      const adapter = new ManifoldAdapter();
      adapter.clearCache();

      expect(mockClient.clearCache).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return the underlying client instance', () => {
      const adapter = new ManifoldAdapter();
      const client = adapter.getClient();

      expect(client).toBeDefined();
      expect(client.getMarket).toBeDefined();
      expect(client.searchMarkets).toBeDefined();
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
      it('should map resolved market to RESOLVED status', async () => {
        const mockMarket = createMockManifoldMarket({ isResolved: true });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.status).toBe('RESOLVED');
      });

      it('should map past close time to CLOSED status', async () => {
        const mockMarket = createMockManifoldMarket({
          isResolved: false,
          closeTime: Date.now() - 86400000, // Yesterday
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.status).toBe('CLOSED');
      });

      it('should map open market to ACTIVE status', async () => {
        const mockMarket = createMockManifoldMarket({
          isResolved: false,
          closeTime: Date.now() + 86400000, // Tomorrow
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.status).toBe('ACTIVE');
      });
    });

    describe('Category Mapping', () => {
      it.each([
        [['politics', 'election'], 'POLITICS'],
        [['president', 'trump'], 'POLITICS'],
        [['government', 'congress'], 'POLITICS'],
        [['biden', 'whitehouse'], 'POLITICS'],
        [['sports', 'nfl'], 'SPORTS'],
        [['nba', 'basketball'], 'SPORTS'],
        [['mlb', 'baseball'], 'SPORTS'],
        [['soccer', 'football'], 'SPORTS'],
        [['tennis', 'tournament'], 'SPORTS'],
        [['crypto', 'bitcoin'], 'CRYPTO'],
        [['ethereum', 'eth'], 'CRYPTO'],
        [['btc', 'price'], 'CRYPTO'],
        [['blockchain', 'defi'], 'CRYPTO'],
        [['nft', 'collectibles'], 'CRYPTO'],
        [['economics', 'fed'], 'ECONOMICS'],
        [['finance', 'stock'], 'ECONOMICS'],
        [['market', 'inflation'], 'ECONOMICS'],
        [['technology', 'ai'], 'TECHNOLOGY'],
        [['science', 'space'], 'TECHNOLOGY'],
        [['tech', 'climate'], 'TECHNOLOGY'],
        [['movie', 'tv'], 'ENTERTAINMENT'],
        [['celebrity', 'gossip'], 'ENTERTAINMENT'],
        [['music', 'awards'], 'ENTERTAINMENT'],
        [['misc', 'random'], 'OTHER'],
      ])('should map tags %j to category %s', async (tags, expectedCategory) => {
        const mockMarket = createMockManifoldMarket({ groupSlugs: tags });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.category).toBe(expectedCategory);
      });

      it('should also check tags field', async () => {
        const mockMarket = createMockManifoldMarket({
          groupSlugs: [],
          tags: ['bitcoin', 'crypto'],
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.category).toBe('CRYPTO');
      });
    });

    describe('Market Type Mapping', () => {
      it('should map BINARY outcomeType to BINARY', async () => {
        const mockMarket = createMockManifoldMarket({ outcomeType: 'BINARY' });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('BINARY');
      });

      it('should map MULTIPLE_CHOICE outcomeType to MULTIPLE_CHOICE', async () => {
        const mockMarket = createMockManifoldMarket({
          outcomeType: 'MULTIPLE_CHOICE',
          answers: [
            { id: 'a', text: 'Option A', index: 0, probability: 0.3 },
            { id: 'b', text: 'Option B', index: 1, probability: 0.4 },
            { id: 'c', text: 'Option C', index: 2, probability: 0.3 },
          ],
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('MULTIPLE_CHOICE');
        expect(markets[0]?.outcomes).toHaveLength(3);
      });

      it('should map FREE_RESPONSE outcomeType to MULTIPLE_CHOICE', async () => {
        const mockMarket = createMockManifoldMarket({ outcomeType: 'FREE_RESPONSE' });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('MULTIPLE_CHOICE');
      });

      it.each(['NUMERIC', 'PSEUDO_NUMERIC', 'NUMBER'])(
        'should map %s outcomeType to SCALAR',
        async (outcomeType) => {
          const mockMarket = createMockManifoldMarket({ outcomeType });
          mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

          const adapter = new ManifoldAdapter();
          const markets = await adapter.getMarkets();

          expect(markets[0]?.marketType).toBe('SCALAR');
        }
      );

      it('should default to BINARY for unknown outcomeType', async () => {
        const mockMarket = createMockManifoldMarket({ outcomeType: undefined });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.marketType).toBe('BINARY');
      });
    });

    describe('Outcome Mapping', () => {
      it('should create Yes/No outcomes for binary market', async () => {
        const mockMarket = createMockManifoldMarket({
          outcomeType: 'BINARY',
          probability: 0.65,
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.outcomes).toHaveLength(2);
        expect(markets[0]?.outcomes?.[0]?.label).toBe('Yes');
        expect(markets[0]?.outcomes?.[0]?.price).toBe(0.65);
        expect(markets[0]?.outcomes?.[1]?.label).toBe('No');
        expect(markets[0]?.outcomes?.[1]?.price).toBe(0.35);
      });

      it('should map multi-choice answers to outcomes', async () => {
        const mockMarket = createMockManifoldMarket({
          outcomeType: 'MULTIPLE_CHOICE',
          answers: [
            { id: 'a', text: 'Trump', index: 0, probability: 0.4 },
            { id: 'b', text: 'Biden', index: 1, probability: 0.35, resolution: 'NO' },
            { id: 'c', text: 'Other', index: 2, probability: 0.25, resolution: 'YES' },
          ],
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.outcomes).toHaveLength(3);
        expect(markets[0]?.outcomes?.[0]?.label).toBe('Trump');
        expect(markets[0]?.outcomes?.[0]?.tokenId).toBe('a');
        expect(markets[0]?.outcomes?.[1]?.isWinner).toBe(false);
        expect(markets[0]?.outcomes?.[2]?.isWinner).toBe(true);
      });

      it('should use p field if probability not available', async () => {
        const mockMarket = createMockManifoldMarket({
          probability: undefined,
          p: 0.55,
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.outcomes?.[0]?.price).toBe(0.55);
        expect(markets[0]?.yesPrice).toBe(0.55);
      });
    });

    describe('Resolution Mapping', () => {
      it('should map YES resolution correctly', async () => {
        const mockMarket = createMockManifoldMarket({
          isResolved: true,
          resolution: 'YES',
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.resolution).toBe('YES');
        expect(markets[0]?.winningOutcomeIndex).toBe(0);
        expect(markets[0]?.outcomes?.[0]?.isWinner).toBe(true);
        expect(markets[0]?.outcomes?.[1]?.isWinner).toBe(false);
      });

      it('should map NO resolution correctly', async () => {
        const mockMarket = createMockManifoldMarket({
          isResolved: true,
          resolution: 'NO',
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.resolution).toBe('NO');
        expect(markets[0]?.winningOutcomeIndex).toBe(1);
        expect(markets[0]?.outcomes?.[0]?.isWinner).toBe(false);
        expect(markets[0]?.outcomes?.[1]?.isWinner).toBe(true);
      });
    });

    describe('Date Mapping', () => {
      it('should map timestamps correctly', async () => {
        const mockMarket = createMockManifoldMarket({
          createdTime: 1704067200000, // 2024-01-01
          closeTime: 1735689600000, // 2025-01-01
          resolutionTime: 1735776000000, // 2025-01-02
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.createdAt).toEqual(new Date(1704067200000));
        expect(markets[0]?.closesAt).toEqual(new Date(1735689600000));
        expect(markets[0]?.resolvedAt).toEqual(new Date(1735776000000));
      });

      it('should handle missing optional dates', async () => {
        const mockMarket = createMockManifoldMarket({
          closeTime: undefined,
          resolutionTime: undefined,
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.closesAt).toBeUndefined();
        expect(markets[0]?.resolvedAt).toBeUndefined();
      });
    });

    describe('URL Generation', () => {
      it('should use provided URL if available', async () => {
        const mockMarket = createMockManifoldMarket({
          url: 'https://manifold.markets/custom-url',
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.url).toBe('https://manifold.markets/custom-url');
      });

      it('should generate URL from username and slug', async () => {
        const mockMarket = createMockManifoldMarket({
          url: undefined,
          creatorUsername: 'testuser',
          slug: 'test-market',
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.url).toBe('https://manifold.markets/testuser/test-market');
      });
    });

    describe('Liquidity Calculation', () => {
      it('should use totalLiquidity if available', async () => {
        const mockMarket = createMockManifoldMarket({
          totalLiquidity: 15000,
          pool: { YES: 5000, NO: 5000 },
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.liquidity).toBe(15000);
      });

      it('should calculate liquidity from pool if totalLiquidity not available', async () => {
        const mockMarket = createMockManifoldMarket({
          totalLiquidity: undefined,
          pool: { YES: 6000, NO: 4000 },
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.liquidity).toBe(10000);
      });
    });

    describe('Platform Data', () => {
      it('should include platform-specific data', async () => {
        const mockMarket = createMockManifoldMarket({
          id: 'market-123',
          slug: 'test-market',
          creatorId: 'creator-456',
          creatorUsername: 'testcreator',
          mechanism: 'cpmm-1',
          outcomeType: 'BINARY',
          uniqueBettorCount: 150,
          volume24Hours: 2500,
          pool: { YES: 5000, NO: 5000 },
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.platformData).toEqual({
          id: 'market-123',
          slug: 'test-market',
          creatorId: 'creator-456',
          creatorUsername: 'testcreator',
          mechanism: 'cpmm-1',
          outcomeType: 'BINARY',
          uniqueBettorCount: 150,
          volume24Hours: 2500,
          pool: { YES: 5000, NO: 5000 },
        });
      });
    });

    describe('Tags', () => {
      it('should combine groupSlugs and tags', async () => {
        const mockMarket = createMockManifoldMarket({
          groupSlugs: ['crypto', 'bitcoin'],
          tags: ['btc', 'price-prediction'],
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.tags).toEqual(['crypto', 'bitcoin', 'btc', 'price-prediction']);
      });

      it('should handle missing groupSlugs or tags', async () => {
        const mockMarket = createMockManifoldMarket({
          groupSlugs: undefined,
          tags: undefined,
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.tags).toEqual([]);
      });
    });

    describe('Description Handling', () => {
      it('should use textDescription if available', async () => {
        const mockMarket = createMockManifoldMarket({
          textDescription: 'Plain text description',
          description: { type: 'doc', content: [] },
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.description).toBe('Plain text description');
      });

      it('should use description string if textDescription not available', async () => {
        const mockMarket = createMockManifoldMarket({
          textDescription: undefined,
          description: 'String description',
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.description).toBe('String description');
      });

      it('should ignore non-string description', async () => {
        const mockMarket = createMockManifoldMarket({
          textDescription: undefined,
          description: { type: 'doc', content: [] } as unknown as string,
        });
        mockClient.searchMarkets.mockResolvedValueOnce([mockMarket]);

        const adapter = new ManifoldAdapter();
        const markets = await adapter.getMarkets();

        expect(markets[0]?.description).toBeUndefined();
      });
    });
  });
});
