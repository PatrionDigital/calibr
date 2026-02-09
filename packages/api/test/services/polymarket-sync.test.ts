/**
 * Polymarket Sync Service Tests
 * Tests market sync, price sync, and position sync functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock functions are available before vi.mock is evaluated
const {
  mockGetMarkets,
  mockGetMarket,
  mockGetMarketPrices,
  mockAdapterHealthCheck,
  MockPolymarketAdapter,
} = vi.hoisted(() => {
  const getMarkets = vi.fn();
  const getMarket = vi.fn();
  const getMarketPrices = vi.fn();
  const healthCheck = vi.fn();

  return {
    mockGetMarkets: getMarkets,
    mockGetMarket: getMarket,
    mockGetMarketPrices: getMarketPrices,
    mockAdapterHealthCheck: healthCheck,
    MockPolymarketAdapter: vi.fn(() => ({
      getMarkets,
      getMarket,
      getMarketPrices,
      healthCheck,
    })),
  };
});

// Mock Prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    platformConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    platformMarket: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    unifiedMarket: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    priceSnapshot: {
      create: vi.fn(),
    },
    syncLog: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    walletConnection: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Mock PolymarketAdapter with hoisted mock functions
vi.mock('@calibr/adapters', () => ({
  PolymarketAdapter: MockPolymarketAdapter,
}));

import { PolymarketSyncService } from '../../src/services/polymarket-sync';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as {
  platformConfig: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  platformMarket: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  unifiedMarket: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  priceSnapshot: {
    create: ReturnType<typeof vi.fn>;
  };
  syncLog: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  walletConnection: {
    findMany: ReturnType<typeof vi.fn>;
  };
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe('PolymarketSyncService', () => {
  let syncService: PolymarketSyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create new service instance
    syncService = new PolymarketSyncService();

    // Set up default mock responses
    mockPrisma.platformConfig.findUnique.mockResolvedValue({
      id: 'config-1',
      slug: 'polymarket',
      name: 'Polymarket',
    });

    mockPrisma.syncLog.create.mockResolvedValue({
      id: 'sync-log-1',
    });

    mockPrisma.syncLog.update.mockResolvedValue({});
    mockPrisma.platformConfig.update.mockResolvedValue({});
    mockPrisma.priceSnapshot.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // ensurePlatformConfig Tests
  // =============================================================================

  describe('ensurePlatformConfig', () => {
    it('should return existing platform config id', async () => {
      const result = await syncService.ensurePlatformConfig();

      expect(result).toBe('config-1');
      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledWith({
        where: { slug: 'polymarket' },
      });
    });

    it('should cache config id after first lookup', async () => {
      await syncService.ensurePlatformConfig();
      await syncService.ensurePlatformConfig();

      // Should only query once
      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should create platform config if not exists', async () => {
      mockPrisma.platformConfig.findUnique.mockResolvedValue(null);
      mockPrisma.platformConfig.create.mockResolvedValue({
        id: 'new-config-1',
        slug: 'polymarket',
      });

      const result = await syncService.ensurePlatformConfig();

      expect(result).toBe('new-config-1');
      expect(mockPrisma.platformConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Polymarket',
          slug: 'polymarket',
          chainId: 137,
          supportsTrades: true,
          supportsRealTime: true,
        }),
      });
    });
  });

  // =============================================================================
  // syncMarkets Tests
  // =============================================================================

  describe('syncMarkets', () => {
    const mockMarket = {
      externalId: 'market-1',
      question: 'Will it rain tomorrow?',
      description: 'Weather prediction market',
      url: 'https://polymarket.com/market/market-1',
      yesPrice: 0.65,
      noPrice: 0.35,
      lastPrice: 0.65,
      volume: 100000,
      liquidity: 50000,
      bestBid: 0.64,
      bestAsk: 0.66,
      spread: 0.02,
      status: 'ACTIVE',
      closesAt: new Date('2024-12-31'),
      resolvedAt: null,
      resolution: null,
      category: 'WEATHER',
      tags: ['weather', 'prediction'],
      platformData: { clobTokenIds: ['token-yes', 'token-no'] },
    };

    beforeEach(() => {
      mockGetMarkets.mockResolvedValue([mockMarket]);
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);
      mockPrisma.platformMarket.create.mockResolvedValue({
        id: 'platform-market-1',
        externalId: 'market-1',
      });
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(null);
      mockPrisma.unifiedMarket.create.mockResolvedValue({
        id: 'unified-market-1',
        slug: 'will-it-rain-tomorrow',
      });
      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync markets from Polymarket', async () => {
      const result = await syncService.syncMarkets();

      expect(result.success).toBe(true);
      expect(result.marketsCreated).toBe(1);
      expect(result.marketsUpdated).toBe(0);
      expect(result.pricesUpdated).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should create sync log entry', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'POLYMARKET',
          syncType: 'MARKETS',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should update sync log on completion', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.syncLog.update).toHaveBeenCalledWith({
        where: { id: 'sync-log-1' },
        data: expect.objectContaining({
          status: 'SUCCESS',
          marketsUpdated: 1,
          pricesUpdated: 1,
          errors: 0,
        }),
      });
    });

    it('should update existing markets', async () => {
      mockPrisma.platformMarket.findUnique.mockResolvedValue({
        id: 'existing-market-1',
        externalId: 'market-1',
      });

      const result = await syncService.syncMarkets();

      expect(result.marketsCreated).toBe(0);
      expect(result.marketsUpdated).toBe(1);
      expect(mockPrisma.platformMarket.update).toHaveBeenCalled();
    });

    it('should paginate through markets', async () => {
      // First page returns 100 markets (full batch), second returns 100, third returns 50
      // hasMore is set to true when markets.length === batchSize
      const page1Markets = Array(100).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${i}`,
        question: `Question ${i}?`,
      }));
      const page2Markets = Array(100).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${100 + i}`,
        question: `Question ${100 + i}?`,
      }));
      const page3Markets = Array(50).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${200 + i}`,
        question: `Question ${200 + i}?`,
      }));

      mockGetMarkets
        .mockResolvedValueOnce(page1Markets)
        .mockResolvedValueOnce(page2Markets)
        .mockResolvedValueOnce(page3Markets);

      const result = await syncService.syncMarkets({ batchSize: 100 });

      expect(result.marketsCreated).toBe(250);
      expect(mockGetMarkets).toHaveBeenCalledTimes(3);
    });

    it('should respect maxPages option', async () => {
      const fullPage = Array(100).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${i}`,
      }));

      mockGetMarkets.mockResolvedValue(fullPage);

      await syncService.syncMarkets({ maxPages: 2, batchSize: 100 });

      // Should only fetch 2 pages
      expect(mockGetMarkets).toHaveBeenCalledTimes(2);
    });

    it('should pass activeOnly filter to adapter', async () => {
      await syncService.syncMarkets({ activeOnly: false });

      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: undefined,
        })
      );
    });

    it('should handle adapter errors gracefully', async () => {
      mockGetMarkets.mockRejectedValue(new Error('API timeout'));

      const result = await syncService.syncMarkets();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('API timeout');
    });

    it('should continue after individual market sync errors', async () => {
      const markets = [
        { ...mockMarket, externalId: 'market-1' },
        { ...mockMarket, externalId: 'market-2' },
      ];
      mockGetMarkets.mockResolvedValue(markets);

      // First market fails, second succeeds
      mockPrisma.platformMarket.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.platformMarket.create
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ id: 'market-2' });

      const result = await syncService.syncMarkets();

      expect(result.marketsCreated).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('market-1');
    });

    it('should update platform health status', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.platformConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          healthStatus: 'HEALTHY',
        }),
      });
    });

    it('should set health to DEGRADED on errors', async () => {
      mockGetMarkets.mockResolvedValue([mockMarket]);
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);
      mockPrisma.platformMarket.create.mockRejectedValue(new Error('DB error'));

      await syncService.syncMarkets();

      expect(mockPrisma.platformConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: expect.objectContaining({
          healthStatus: 'DEGRADED',
        }),
      });
    });

    it('should create price snapshot for new markets', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.priceSnapshot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platformMarketId: 'platform-market-1',
          yesPrice: 0.65,
          noPrice: 0.35,
        }),
      });
    });

    it('should link to unified market', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.unifiedMarket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          question: 'Will it rain tomorrow?',
          slug: 'will-it-rain-tomorrow',
          category: 'WEATHER',
        }),
      });

      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'platform-market-1' },
        data: { unifiedMarketId: 'unified-market-1' },
      });
    });

    it('should use existing unified market if slug matches', async () => {
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue({
        id: 'existing-unified-1',
        slug: 'will-it-rain-tomorrow',
      });

      await syncService.syncMarkets();

      expect(mockPrisma.unifiedMarket.create).not.toHaveBeenCalled();
      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'platform-market-1' },
        data: { unifiedMarketId: 'existing-unified-1' },
      });
    });
  });

  // =============================================================================
  // syncPrices Tests
  // =============================================================================

  describe('syncPrices', () => {
    beforeEach(() => {
      mockPrisma.platformMarket.findMany.mockResolvedValue([
        {
          id: 'market-1',
          externalId: 'ext-1',
          platformData: { clobTokenIds: ['yes-token', 'no-token'] },
        },
        {
          id: 'market-2',
          externalId: 'ext-2',
          platformData: { clobTokenIds: ['yes-token-2', 'no-token-2'] },
        },
      ]);

      mockGetMarketPrices.mockResolvedValue({
        yesPrice: 0.55,
        noPrice: 0.45,
        spread: 0.01,
      });

      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync prices for active markets', async () => {
      const result = await syncService.syncPrices();

      expect(result.success).toBe(true);
      expect(result.pricesUpdated).toBe(2);
    });

    it('should query only active markets', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.findMany).toHaveBeenCalledWith({
        where: {
          platformConfigId: 'config-1',
          isActive: true,
        },
        select: expect.any(Object),
      });
    });

    it('should fetch prices from CLOB', async () => {
      await syncService.syncPrices();

      expect(mockGetMarketPrices).toHaveBeenCalledWith(
        'ext-1',
        'yes-token',
        'no-token'
      );
    });

    it('should update market with new prices', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'market-1' },
        data: expect.objectContaining({
          yesPrice: 0.55,
          noPrice: 0.45,
          spread: 0.01,
        }),
      });
    });

    it('should create price snapshot', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.priceSnapshot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platformMarketId: 'market-1',
          yesPrice: 0.55,
          noPrice: 0.45,
        }),
      });
    });

    it('should fallback to Gamma API if no CLOB token ids', async () => {
      mockPrisma.platformMarket.findMany.mockResolvedValue([
        {
          id: 'market-1',
          externalId: 'ext-1',
          platformData: { clobTokenIds: [] }, // No token IDs
        },
      ]);

      mockGetMarket.mockResolvedValue({
        yesPrice: 0.60,
        noPrice: 0.40,
        volume: 10000,
        liquidity: 5000,
      });

      const result = await syncService.syncPrices();

      expect(result.pricesUpdated).toBe(1);
      expect(mockGetMarket).toHaveBeenCalledWith('ext-1');
      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'market-1' },
        data: expect.objectContaining({
          yesPrice: 0.60,
          noPrice: 0.40,
        }),
      });
    });

    it('should handle price fetch errors', async () => {
      mockGetMarketPrices.mockRejectedValue(new Error('Rate limited'));

      const result = await syncService.syncPrices();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should create sync log for price sync', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'POLYMARKET',
          syncType: 'PRICES',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should continue syncing after individual errors', async () => {
      mockGetMarketPrices
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          yesPrice: 0.55,
          noPrice: 0.45,
          spread: 0.01,
        });

      const result = await syncService.syncPrices();

      expect(result.pricesUpdated).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });

  // =============================================================================
  // syncUserPositions Tests
  // =============================================================================

  describe('syncUserPositions', () => {
    it('should return success with no wallet message when no wallets connected', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);

      const result = await syncService.syncUserPositions('user-1');

      expect(result.success).toBe(true);
      expect(result.errors).toContain('No Polymarket wallet connected');
    });

    it('should query wallet connections with CLOB credentials', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);

      await syncService.syncUserPositions('user-1');

      expect(mockPrisma.walletConnection.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          clobApiKey: { not: null },
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.walletConnection.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const result = await syncService.syncUserPositions('user-1');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database error');
    });
  });

  // =============================================================================
  // healthCheck Tests
  // =============================================================================

  describe('healthCheck', () => {
    it('should return healthy when all checks pass', async () => {
      mockAdapterHealthCheck.mockResolvedValue(true);
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.details.polymarketApi).toBe(true);
      expect(result.details.database).toBe(true);
    });

    it('should return unhealthy when API check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(false);
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.polymarketApi).toBe(false);
      expect(result.details.database).toBe(true);
    });

    it('should return unhealthy when database check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(true);
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.polymarketApi).toBe(true);
      expect(result.details.database).toBe(false);
    });

    it('should handle adapter healthCheck throwing', async () => {
      mockAdapterHealthCheck.mockRejectedValue(new Error('Network error'));
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.polymarketApi).toBe(false);
    });
  });

  // =============================================================================
  // getStats Tests
  // =============================================================================

  describe('getStats', () => {
    it('should return sync statistics', async () => {
      mockPrisma.platformMarket.count
        .mockResolvedValueOnce(1500)
        .mockResolvedValueOnce(800);
      mockPrisma.syncLog.findFirst.mockResolvedValue({
        completedAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockPrisma.syncLog.count.mockResolvedValue(3);

      const result = await syncService.getStats();

      expect(result.totalMarkets).toBe(1500);
      expect(result.activeMarkets).toBe(800);
      expect(result.lastSync).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result.recentErrors).toBe(3);
    });

    it('should return null lastSync when no successful syncs', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      const result = await syncService.getStats();

      expect(result.lastSync).toBeNull();
    });

    it('should query for recent errors in last 24 hours', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      await syncService.getStats();

      expect(mockPrisma.syncLog.count).toHaveBeenCalledWith({
        where: {
          platform: 'POLYMARKET',
          status: 'FAILED',
          createdAt: { gte: expect.any(Date) },
        },
      });
    });
  });
});
