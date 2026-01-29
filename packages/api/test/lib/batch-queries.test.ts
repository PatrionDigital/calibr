/**
 * Batch Query Utilities Tests
 * Tests for database query batching optimizations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  batchFindPositionsByWalletIds,
  batchLookupPlatformConfigs,
  batchLookupPlatformMarkets,
  batchUpsertPositions,
  clearPlatformConfigCache,
  type PositionUpsertData,
} from '../../src/lib/batch-queries';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    position: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    platformConfig: {
      findMany: vi.fn(),
    },
    platformMarket: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  position: { findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  platformConfig: { findMany: ReturnType<typeof vi.fn> };
  platformMarket: { findMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('Batch Query Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPlatformConfigCache();
  });

  // =============================================================================
  // batchFindPositionsByWalletIds Tests
  // =============================================================================

  describe('batchFindPositionsByWalletIds', () => {
    it('should fetch positions for multiple wallets in a single query', async () => {
      const walletIds = ['wallet-1', 'wallet-2', 'wallet-3'];
      const mockPositions = [
        { id: 'pos-1', walletConnectionId: 'wallet-1', shares: 100 },
        { id: 'pos-2', walletConnectionId: 'wallet-2', shares: 200 },
        { id: 'pos-3', walletConnectionId: 'wallet-3', shares: 300 },
      ];

      mockPrisma.position.findMany.mockResolvedValue(mockPositions);

      const result = await batchFindPositionsByWalletIds(walletIds, 'LIMITLESS');

      // Should call findMany exactly once
      expect(mockPrisma.position.findMany).toHaveBeenCalledTimes(1);

      // Should use 'in' operator for wallet IDs
      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            walletConnectionId: { in: walletIds },
          }),
        })
      );

      // Should return positions grouped by wallet
      expect(result.get('wallet-1')).toHaveLength(1);
      expect(result.get('wallet-2')).toHaveLength(1);
      expect(result.get('wallet-3')).toHaveLength(1);
    });

    it('should handle empty wallet list', async () => {
      const result = await batchFindPositionsByWalletIds([], 'LIMITLESS');

      expect(mockPrisma.position.findMany).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });

    it('should filter by platform when specified', async () => {
      mockPrisma.position.findMany.mockResolvedValue([]);

      await batchFindPositionsByWalletIds(['wallet-1'], 'POLYMARKET');

      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform: 'POLYMARKET',
          }),
        })
      );
    });

    it('should include platformMarket relations', async () => {
      mockPrisma.position.findMany.mockResolvedValue([]);

      await batchFindPositionsByWalletIds(['wallet-1'], 'LIMITLESS');

      expect(mockPrisma.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            platformMarket: expect.any(Object),
          }),
        })
      );
    });
  });

  // =============================================================================
  // batchLookupPlatformConfigs Tests
  // =============================================================================

  describe('batchLookupPlatformConfigs', () => {
    it('should fetch all platform configs in a single query', async () => {
      const slugs = ['polymarket', 'limitless'];
      const mockConfigs = [
        { id: 'config-1', slug: 'polymarket', isActive: true },
        { id: 'config-2', slug: 'limitless', isActive: true },
      ];

      mockPrisma.platformConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await batchLookupPlatformConfigs(slugs);

      expect(mockPrisma.platformConfig.findMany).toHaveBeenCalledTimes(1);
      expect(result.get('polymarket')).toEqual(mockConfigs[0]);
      expect(result.get('limitless')).toEqual(mockConfigs[1]);
    });

    it('should handle missing configs gracefully', async () => {
      mockPrisma.platformConfig.findMany.mockResolvedValue([
        { id: 'config-1', slug: 'polymarket', isActive: true },
      ]);

      const result = await batchLookupPlatformConfigs(['polymarket', 'unknown']);

      expect(result.has('polymarket')).toBe(true);
      expect(result.has('unknown')).toBe(false);
    });

    it('should cache results for repeated calls', async () => {
      const mockConfig = { id: 'config-1', slug: 'polymarket', isActive: true };
      mockPrisma.platformConfig.findMany.mockResolvedValue([mockConfig]);

      // First call
      await batchLookupPlatformConfigs(['polymarket']);
      // Second call with same slug - should use cache
      const result = await batchLookupPlatformConfigs(['polymarket']);

      // Should only call DB once due to caching
      expect(mockPrisma.platformConfig.findMany).toHaveBeenCalledTimes(1);
      expect(result.get('polymarket')).toEqual(mockConfig);
    });
  });

  // =============================================================================
  // batchLookupPlatformMarkets Tests
  // =============================================================================

  describe('batchLookupPlatformMarkets', () => {
    it('should fetch markets by external IDs in single query', async () => {
      const lookupKeys = [
        { platformConfigId: 'config-1', externalId: 'market-1' },
        { platformConfigId: 'config-1', externalId: 'market-2' },
      ];
      const mockMarkets = [
        { id: 'pm-1', platformConfigId: 'config-1', externalId: 'market-1' },
        { id: 'pm-2', platformConfigId: 'config-1', externalId: 'market-2' },
      ];

      mockPrisma.platformMarket.findMany.mockResolvedValue(mockMarkets);

      const result = await batchLookupPlatformMarkets(lookupKeys);

      expect(mockPrisma.platformMarket.findMany).toHaveBeenCalledTimes(1);
      expect(result.get('config-1:market-1')).toEqual(mockMarkets[0]);
      expect(result.get('config-1:market-2')).toEqual(mockMarkets[1]);
    });

    it('should handle empty lookup list', async () => {
      const result = await batchLookupPlatformMarkets([]);

      expect(mockPrisma.platformMarket.findMany).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });
  });

  // =============================================================================
  // batchUpsertPositions Tests
  // =============================================================================

  describe('batchUpsertPositions', () => {
    it('should use transaction for batch upserts', async () => {
      const positions: PositionUpsertData[] = [
        {
          userId: 'user-1',
          platformMarketId: 'pm-1',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
          platform: 'LIMITLESS',
        },
        {
          userId: 'user-1',
          platformMarketId: 'pm-2',
          outcome: 'NO',
          shares: 200,
          avgCostBasis: 0.3,
          platform: 'LIMITLESS',
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([{ id: 'pos-1' }, { id: 'pos-2' }]);

      const result = await batchUpsertPositions(positions);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should handle empty positions array', async () => {
      const result = await batchUpsertPositions([]);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
    });

    it('should handle transaction errors gracefully', async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error('DB connection failed'));

      const result = await batchUpsertPositions([
        {
          userId: 'user-1',
          platformMarketId: 'pm-1',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.5,
          platform: 'LIMITLESS',
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DB connection failed');
    });
  });
});
