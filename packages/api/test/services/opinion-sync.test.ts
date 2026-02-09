/**
 * Opinion Sync Service Tests
 * Tests market sync and price sync functionality for Opinion (O.LAB)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock functions are available before vi.mock is evaluated
const {
  mockGetMarkets,
  mockGetMarket,
  mockAdapterHealthCheck,
  MockOpinionAdapter,
} = vi.hoisted(() => {
  const getMarkets = vi.fn();
  const getMarket = vi.fn();
  const healthCheck = vi.fn();

  return {
    mockGetMarkets: getMarkets,
    mockGetMarket: getMarket,
    mockAdapterHealthCheck: healthCheck,
    MockOpinionAdapter: vi.fn(() => ({
      getMarkets,
      getMarket,
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

// Mock OpinionAdapter with hoisted mock functions
vi.mock('@calibr/adapters', () => ({
  OpinionAdapter: MockOpinionAdapter,
}));

import { OpinionSyncService } from '../../src/services/opinion-sync';
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

describe('OpinionSyncService', () => {
  let syncService: OpinionSyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create new service instance
    syncService = new OpinionSyncService();

    // Set up default mock responses
    mockPrisma.platformConfig.findUnique.mockResolvedValue({
      id: 'opinion-config-1',
      slug: 'opinion',
      name: 'Opinion',
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

      expect(result).toBe('opinion-config-1');
      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledWith({
        where: { slug: 'opinion' },
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
        id: 'new-opinion-config-1',
        slug: 'opinion',
      });

      const result = await syncService.ensurePlatformConfig();

      expect(result).toBe('new-opinion-config-1');
      expect(mockPrisma.platformConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Opinion',
          slug: 'opinion',
          chainId: 56, // BNB Chain
          supportsTrades: true,
          supportsRealTime: false,
        }),
      });
    });
  });

  // =============================================================================
  // syncMarkets Tests
  // =============================================================================

  describe('syncMarkets', () => {
    const mockMarket = {
      externalId: 'opinion-market-1',
      question: 'Will BNB reach $500?',
      description: 'BNB price prediction',
      url: 'https://opinion.trade/market/opinion-market-1',
      yesPrice: 0.30,
      noPrice: 0.70,
      lastPrice: 0.30,
      volume: 25000,
      liquidity: 12500,
      bestBid: 0.29,
      bestAsk: 0.31,
      spread: 0.02,
      status: 'ACTIVE',
      closesAt: new Date('2024-12-31'),
      resolvedAt: null,
      resolution: null,
      category: 'CRYPTO',
      tags: ['crypto', 'bnb'],
      platformData: {},
    };

    beforeEach(() => {
      mockGetMarkets.mockResolvedValue([mockMarket]);
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);
      mockPrisma.platformMarket.create.mockResolvedValue({
        id: 'platform-market-1',
        externalId: 'opinion-market-1',
      });
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(null);
      mockPrisma.unifiedMarket.create.mockResolvedValue({
        id: 'unified-market-1',
        slug: 'will-bnb-reach-500',
      });
      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync markets from Opinion', async () => {
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
          platform: 'OPINION',
          syncType: 'MARKETS',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should update existing markets', async () => {
      mockPrisma.platformMarket.findUnique.mockResolvedValue({
        id: 'existing-market-1',
        externalId: 'opinion-market-1',
      });

      const result = await syncService.syncMarkets();

      expect(result.marketsCreated).toBe(0);
      expect(result.marketsUpdated).toBe(1);
    });

    it('should use default batch size of 20', async () => {
      await syncService.syncMarkets();

      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
        })
      );
    });

    it('should handle adapter errors gracefully', async () => {
      mockGetMarkets.mockRejectedValue(new Error('API timeout'));

      const result = await syncService.syncMarkets();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should update platform health status', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.platformConfig.update).toHaveBeenCalledWith({
        where: { id: 'opinion-config-1' },
        data: expect.objectContaining({
          healthStatus: 'HEALTHY',
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
        },
      ]);

      mockGetMarket.mockResolvedValue({
        yesPrice: 0.35,
        noPrice: 0.65,
        lastPrice: 0.35,
      });

      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync prices for active markets', async () => {
      const result = await syncService.syncPrices();

      expect(result.success).toBe(true);
      expect(result.pricesUpdated).toBe(1);
    });

    it('should query only active non-resolved markets', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          platformConfigId: 'opinion-config-1',
          isActive: true,
          resolvedAt: null,
        }),
        select: { id: true, externalId: true },
      });
    });

    it('should use getMarket to fetch prices', async () => {
      await syncService.syncPrices();

      expect(mockGetMarket).toHaveBeenCalledWith('ext-1');
    });

    it('should update market with new prices', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'market-1' },
        data: expect.objectContaining({
          yesPrice: 0.35,
          noPrice: 0.65,
          lastPrice: 0.35,
        }),
      });
    });

    it('should handle getMarket errors gracefully', async () => {
      mockGetMarket.mockRejectedValue(new Error('API error'));

      const result = await syncService.syncPrices();

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('ext-1');
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
      expect(result.details.opinionApi).toBe(true);
      expect(result.details.database).toBe(true);
    });

    it('should return unhealthy when API check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(false);
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.opinionApi).toBe(false);
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
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(150);
      mockPrisma.syncLog.findFirst.mockResolvedValue({
        completedAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockPrisma.syncLog.count.mockResolvedValue(1);

      const result = await syncService.getStats();

      expect(result.totalMarkets).toBe(200);
      expect(result.activeMarkets).toBe(150);
      expect(result.lastSync).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result.recentErrors).toBe(1);
    });

    it('should query for OPINION platform', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      await syncService.getStats();

      expect(mockPrisma.syncLog.findFirst).toHaveBeenCalledWith({
        where: { platform: 'OPINION', status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });
    });
  });
});
