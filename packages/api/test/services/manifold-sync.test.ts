/**
 * Manifold Sync Service Tests
 * Tests market sync and price sync functionality for Manifold Markets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mock functions are available before vi.mock is evaluated
const {
  mockGetMarkets,
  mockGetMarket,
  mockAdapterHealthCheck,
  MockManifoldAdapter,
} = vi.hoisted(() => {
  const getMarkets = vi.fn();
  const getMarket = vi.fn();
  const healthCheck = vi.fn();

  return {
    mockGetMarkets: getMarkets,
    mockGetMarket: getMarket,
    mockAdapterHealthCheck: healthCheck,
    MockManifoldAdapter: vi.fn(() => ({
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

// Mock ManifoldAdapter with hoisted mock functions
vi.mock('@calibr/adapters', () => ({
  ManifoldAdapter: MockManifoldAdapter,
}));

import { ManifoldSyncService } from '../../src/services/manifold-sync';
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

describe('ManifoldSyncService', () => {
  let syncService: ManifoldSyncService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create new service instance
    syncService = new ManifoldSyncService();

    // Set up default mock responses
    mockPrisma.platformConfig.findUnique.mockResolvedValue({
      id: 'manifold-config-1',
      slug: 'manifold',
      name: 'Manifold',
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

      expect(result).toBe('manifold-config-1');
      expect(mockPrisma.platformConfig.findUnique).toHaveBeenCalledWith({
        where: { slug: 'manifold' },
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
        id: 'new-manifold-config-1',
        slug: 'manifold',
      });

      const result = await syncService.ensurePlatformConfig();

      expect(result).toBe('new-manifold-config-1');
      expect(mockPrisma.platformConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Manifold',
          slug: 'manifold',
          chainId: undefined, // Play money
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
      externalId: 'manifold-market-1',
      question: 'Will AI write better code by 2025?',
      description: 'AI capabilities prediction',
      url: 'https://manifold.markets/user/manifold-market-1',
      yesPrice: 0.72,
      noPrice: 0.28,
      lastPrice: 0.72,
      volume: 15000,
      liquidity: 7500,
      bestBid: 0.71,
      bestAsk: 0.73,
      spread: 0.02,
      status: 'ACTIVE',
      closesAt: new Date('2025-12-31'),
      resolvedAt: null,
      resolution: null,
      category: 'TECHNOLOGY',
      tags: ['ai', 'technology'],
      platformData: {},
    };

    beforeEach(() => {
      mockGetMarkets.mockResolvedValue([mockMarket]);
      mockPrisma.platformMarket.findUnique.mockResolvedValue(null);
      mockPrisma.platformMarket.create.mockResolvedValue({
        id: 'platform-market-1',
        externalId: 'manifold-market-1',
      });
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(null);
      mockPrisma.unifiedMarket.create.mockResolvedValue({
        id: 'unified-market-1',
        slug: 'will-ai-write-better-code-by-2025',
      });
      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync markets from Manifold', async () => {
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
          platform: 'MANIFOLD',
          syncType: 'MARKETS',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should update existing markets', async () => {
      mockPrisma.platformMarket.findUnique.mockResolvedValue({
        id: 'existing-market-1',
        externalId: 'manifold-market-1',
      });

      const result = await syncService.syncMarkets();

      expect(result.marketsCreated).toBe(0);
      expect(result.marketsUpdated).toBe(1);
    });

    it('should paginate through markets', async () => {
      // First page returns 50 markets (full batch), second returns 50, third returns 20
      const page1Markets = Array(50).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${i}`,
        question: `Question ${i}?`,
      }));
      const page2Markets = Array(50).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${50 + i}`,
        question: `Question ${50 + i}?`,
      }));
      const page3Markets = Array(20).fill(mockMarket).map((m, i) => ({
        ...m,
        externalId: `market-${100 + i}`,
        question: `Question ${100 + i}?`,
      }));

      mockGetMarkets
        .mockResolvedValueOnce(page1Markets)
        .mockResolvedValueOnce(page2Markets)
        .mockResolvedValueOnce(page3Markets);

      const result = await syncService.syncMarkets({ batchSize: 50 });

      expect(result.marketsCreated).toBe(120);
      expect(mockGetMarkets).toHaveBeenCalledTimes(3);
    });

    it('should handle adapter errors gracefully', async () => {
      mockGetMarkets.mockRejectedValue(new Error('Rate limited'));

      const result = await syncService.syncMarkets();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should update platform health status', async () => {
      await syncService.syncMarkets();

      expect(mockPrisma.platformConfig.update).toHaveBeenCalledWith({
        where: { id: 'manifold-config-1' },
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
        where: { id: 'manifold-config-1' },
        data: expect.objectContaining({
          healthStatus: 'DEGRADED',
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
        {
          id: 'market-2',
          externalId: 'ext-2',
        },
      ]);

      mockGetMarket.mockResolvedValue({
        yesPrice: 0.65,
        noPrice: 0.35,
        lastPrice: 0.65,
      });

      mockPrisma.platformMarket.update.mockResolvedValue({});
    });

    it('should sync prices for active markets', async () => {
      const result = await syncService.syncPrices();

      expect(result.success).toBe(true);
      expect(result.pricesUpdated).toBe(2);
    });

    it('should query only active non-resolved markets with limit', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          platformConfigId: 'manifold-config-1',
          isActive: true,
          resolvedAt: null,
        }),
        select: { id: true, externalId: true },
        take: 100, // Manifold limits to 100 to avoid too many API calls
      });
    });

    it('should use getMarket to fetch prices', async () => {
      await syncService.syncPrices();

      expect(mockGetMarket).toHaveBeenCalledWith('ext-1');
      expect(mockGetMarket).toHaveBeenCalledWith('ext-2');
    });

    it('should update market with new prices', async () => {
      await syncService.syncPrices();

      expect(mockPrisma.platformMarket.update).toHaveBeenCalledWith({
        where: { id: 'market-1' },
        data: expect.objectContaining({
          yesPrice: 0.65,
          noPrice: 0.35,
          lastPrice: 0.65,
        }),
      });
    });

    it('should handle getMarket errors gracefully', async () => {
      mockGetMarket.mockRejectedValue(new Error('API error'));

      const result = await syncService.syncPrices();

      expect(result.errors.length).toBe(2);
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
      expect(result.details.manifoldApi).toBe(true);
      expect(result.details.database).toBe(true);
    });

    it('should return unhealthy when API check fails', async () => {
      mockAdapterHealthCheck.mockResolvedValue(false);
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await syncService.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.manifoldApi).toBe(false);
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
        .mockResolvedValueOnce(3000)
        .mockResolvedValueOnce(2500);
      mockPrisma.syncLog.findFirst.mockResolvedValue({
        completedAt: new Date('2024-01-15T10:00:00Z'),
      });
      mockPrisma.syncLog.count.mockResolvedValue(5);

      const result = await syncService.getStats();

      expect(result.totalMarkets).toBe(3000);
      expect(result.activeMarkets).toBe(2500);
      expect(result.lastSync).toEqual(new Date('2024-01-15T10:00:00Z'));
      expect(result.recentErrors).toBe(5);
    });

    it('should query for MANIFOLD platform', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      await syncService.getStats();

      expect(mockPrisma.syncLog.findFirst).toHaveBeenCalledWith({
        where: { platform: 'MANIFOLD', status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });
    });

    it('should return null lastSync when no successful syncs', async () => {
      mockPrisma.platformMarket.count.mockResolvedValue(0);
      mockPrisma.syncLog.findFirst.mockResolvedValue(null);
      mockPrisma.syncLog.count.mockResolvedValue(0);

      const result = await syncService.getStats();

      expect(result.lastSync).toBeNull();
    });
  });
});
