/**
 * Limitless Sync Service Tests
 * Tests market sync, price sync functionality for Limitless Exchange
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock functions are available before vi.mock is evaluated
const {
  mockGetMarkets,
  mockGetMarket,
  mockGetMarketPrices,
  mockAdapterHealthCheck,
  MockLimitlessAdapter,
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
    MockLimitlessAdapter: vi.fn(() => ({
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
      update: vi.fn(),
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
    $queryRaw: vi.fn(),
  },
}));

// Mock LimitlessAdapter with hoisted mock functions
vi.mock('@calibr/adapters', () => ({
  LimitlessAdapter: MockLimitlessAdapter,
}));

import { LimitlessSyncService } from '../../src/services/limitless-sync';
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
    update: ReturnType<typeof vi.fn>;
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
  $queryRaw: ReturnType<typeof vi.fn>;
};

describe('LimitlessSyncService', () => {
  let syncService: LimitlessSyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create new service instance
    syncService = new LimitlessSyncService();

    // Set up default mock responses
    mockPrisma.platformConfig.findUnique.mockResolvedValue({
      id: 'limitless-config-1',
      slug: 'limitless',
      name: 'Limitless',
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

      expect(result).toBe('limitless-config-1');
      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledWith({
        where: { slug: 'limitless' },
      });
    });

    it('should cache config id after first lookup', async () => {
      await syncService.ensurePlatformConfig();
      await syncService.ensurePlatformConfig();

      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should create platform config if not exists', async () => {
      mockPrisma.platformConfig.findUnique.mockResolvedValue(null);
      mockPrisma.platformConfig.create.mockResolvedValue({
        id: 'new-limitless-config-1',
        slug: 'limitless',
      });

      const result = await syncService.ensurePlatformConfig();

      expect(result).toBe('new-limitless-config-1');
      expect(mockPrisma.platformConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Limitless',
          slug: 'limitless',
          chainId: 8453, // Base chain
          supportsTrades: true,
        }),
      });
    });
  });

  // =============================================================================
  // syncMarkets Tests
  // =============================================================================

  describe('syncMarkets', () => {
    const mockMarket = {
      externalId: 'limitless-market-1',
      question: 'Will ETH hit $5000?',
      description: 'Crypto price prediction',
      url: 'https://limitless.exchange/market/limitless-market-1',
      yesPrice: 0.45,
      noPrice: 0.55,
      lastPrice: 0.45,
      volume: 50000,
      liquidity: 25000,
      bestBid: 0.44,
      bestAsk: 0.46,
      spread: 0.02,
      status: 'ACTIVE',
      closesAt: new Date('2024-12-31'),
      resolvedAt: null,
      resolution: null,
      category: 'CRYPTO',
      tags: ['crypto', 'ethereum'],
      platformData: { slug: 'will-eth-hit-5000' },
    };

    beforeEach(() => {
      mockGetMarkets.mockResolvedValue([mockMarket]);
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);
      mockPrisma.platformMarket.create.mockResolvedValue({
        id: 'platform-market-1',
        externalId: 'limitless-market-1',
      });
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(null);
      mockPrisma.unifiedMarket.create.mockResolvedValue({
        id: 'unified-market-1',
        slug: 'will-eth-hit-5000',
      });
      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync markets from Limitless', async () => {
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
          platform: 'LIMITLESS',
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
        externalId: 'limitless-market-1',
      });

      const result = await syncService.syncMarkets();

      expect(result.marketsCreated).toBe(0);
      expect(result.marketsUpdated).toBe(1);
      expect(mockPrisma.platformMarket.update).toHaveBeenCalled();
    });

    it('should paginate through markets', async () => {
      // First page returns 25 markets (full batch), second returns 25, third returns 10
      const page1Markets = Array(25).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${i}`,
        question: `Question ${i}?`,
      }));
      const page2Markets = Array(25).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${25 + i}`,
        question: `Question ${25 + i}?`,
      }));
      const page3Markets = Array(10).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${50 + i}`,
        question: `Question ${50 + i}?`,
      }));

      mockGetMarkets
        .mockResolvedValueOnce(page1Markets)
        .mockResolvedValueOnce(page2Markets)
        .mockResolvedValueOnce(page3Markets);

      const result = await syncService.syncMarkets({ batchSize: 25 });

      expect(result.marketsCreated).toBe(60);
      expect(mockGetMarkets).toHaveBeenCalledTimes(3);
    });

    it('should respect maxPages option', async () => {
      const fullPage = Array(25).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${i}`,
      }));

      mockGetMarkets.mockResolvedValue(fullPage);

      await syncService.syncMarkets({ maxPages: 2, batchSize: 25 });

      expect(mockGetMarkets).toHaveBeenCalledTimes(2);
    });

    it('should handle adapter errors gracefully', async () => {
      mockGetMarkets.mockRejectedValue(new Error('Rate limited'));

      const result = await syncService.syncMarkets();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Rate limited');
    });

    it('should update platform health status', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.platformConfig.update).toHaveBeenCalledWith({
        where: { id: 'limitless-config-1' },
        data: expect.objectContaining({
          healthStatus: 'HEALTHY',
        }),
      });
    });

    it('should update existing unified market with better prices', async () => {
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue({
        id: 'existing-unified-1',
        slug: 'will-eth-hit-5000',
        bestYesPrice: 0.40,
        bestNoPrice: 0.50,
        totalVolume: 10000,
        totalLiquidity: 5000,
      });
      mockPrisma.unifiedMarket.update.mockResolvedValue({});

      await syncService.syncMarkets();

      expect(mockPrisma.unifiedMarket.update).toHaveBeenCalledWith({
        where: { id: 'existing-unified-1' },
        data: expect.objectContaining({
          bestYesPrice: 0.45,
          bestYesPlatform: 'LIMITLESS',
          bestNoPrice: 0.55,
          bestNoPlatform: 'LIMITLESS',
        }),
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
          platformData: { slug: 'market-slug-1' },
        },
        {
          id: 'market-2',
          externalId: 'ext-2',
          platformData: { slug: 'market-slug-2' },
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

    it('should query only active non-resolved markets', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          platformConfigId: 'limitless-config-1',
          isActive: true,
          resolvedAt: null,
        }),
        select: expect.any(Object),
      });
    });

    it('should fetch prices using slug from platformData', async () => {
      await syncService.syncPrices();

      expect(mockGetMarketPrices).toHaveBeenCalledWith('market-slug-1');
      expect(mockGetMarketPrices).toHaveBeenCalledWith('market-slug-2');
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

    it('should mark market inactive on 404 error', async () => {
      mockGetMarketPrices.mockRejectedValue(new Error('404 Not Found'));

      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'market-1' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });

    it('should skip 400 errors (resolved markets)', async () => {
      mockGetMarketPrices.mockRejectedValue(new Error('400 Bad Request'));

      const result = await syncService.syncPrices();

      // Should not add error for 400 responses
      expect(result.errors.length).toBe(0);
    });

    it('should create sync log for price sync', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.syncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'LIMITLESS',
          syncType: 'PRICES',
          status: 'IN_PROGRESS',
        }),
      });
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
      expect(result.details.limitlessApi).toBe(true);
      expect(result.details.database).toBe(true);
    });

    it('should return unhealthy when API check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(false);
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.limitlessApi).toBe(false);
    });

    it('should return unhealthy when database check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(true);
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.database).toBe(false);
    });
  });

  // =============================================================================
  // getStats Tests
  // =============================================================================

  describe('getStats', () => {
    it('should return sync statistics', async () => {
      mockPrisma.platformMarket.count
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(350);
      mockPrisma.syncLog.findFirst.mockResolvedValue({
        completedAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockPrisma.syncLog.count.mockResolvedValue(2);

      const result = await syncService.getStats();

      expect(result.totalMarkets).toBe(500);
      expect(result.activeMarkets).toBe(350);
      expect(result.lastSync).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result.recentErrors).toBe(2);
    });

    it('should return null lastSync when no successful syncs', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      const result = await syncService.getStats();

      expect(result.lastSync).toBeNull();
    });

    it('should query for LIMITLESS platform', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      await syncService.getStats();

      expect(mockPrisma.syncLog.findFirst).toHaveBeenCalledWith({
        where: { platform: 'LIMITLESS', status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });
    });
  });
});
