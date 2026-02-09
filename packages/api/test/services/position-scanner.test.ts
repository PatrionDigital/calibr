/**
 * Position Scanner Service Tests
 * Tests wallet position scanning and import functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    walletConnection: {
      findMany: vi.fn(),
    },
    platformConfig: {
      findFirst: vi.fn(),
    },
    platformMarket: {
      findMany: vi.fn(),
    },
  },
}));

// Mock batch queries
vi.mock('../../src/lib/batch-queries', () => ({
  batchFindPositionsByWalletIds: vi.fn(),
  batchLookupPlatformConfigs: vi.fn(),
  batchLookupPlatformMarkets: vi.fn(),
  batchUpsertPositions: vi.fn(),
}));

// Mock ERC1155Scanner
vi.mock('@calibr/adapters', () => ({
  ERC1155Scanner: vi.fn().mockImplementation(() => ({
    scanWallet: vi.fn(),
  })),
}));

import { PositionScanner } from '../../src/services/position-scanner';
import { prisma } from '../../src/lib/prisma';
import {
  batchFindPositionsByWalletIds,
  batchLookupPlatformConfigs,
  batchLookupPlatformMarkets,
  batchUpsertPositions,
} from '../../src/lib/batch-queries';
import { ERC1155Scanner } from '@calibr/adapters';

const mockPrisma = prisma as unknown as {
  walletConnection: {
    findMany: ReturnType<typeof vi.fn>;
  };
  platformConfig: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  platformMarket: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockBatchFindPositions = batchFindPositionsByWalletIds as ReturnType<typeof vi.fn>;
const mockBatchLookupConfigs = batchLookupPlatformConfigs as ReturnType<typeof vi.fn>;
const mockBatchLookupMarkets = batchLookupPlatformMarkets as ReturnType<typeof vi.fn>;
const mockBatchUpsertPositions = batchUpsertPositions as ReturnType<typeof vi.fn>;

describe('PositionScanner', () => {
  let scanner: PositionScanner;

  beforeEach(() => {
    vi.clearAllMocks();
    scanner = new PositionScanner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // scanWallet Tests
  // =============================================================================

  describe('scanWallet', () => {
    it('should return empty positions when no wallet connections found', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);

      const result = await scanner.scanWallet('0x1234567890123456789012345678901234567890');

      expect(result.positions).toEqual([]);
      expect(result.totalValue).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should normalize address to lowercase', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);

      const result = await scanner.scanWallet('0xABCDEF1234567890123456789012345678901234');

      expect(result.address).toBe('0xabcdef1234567890123456789012345678901234');
    });

    it('should scan only specified platforms', async () => {
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);

      await scanner.scanWallet('0x1234567890123456789012345678901234567890', {
        platforms: ['LIMITLESS'],
      });

      // Should only query for wallet connections once per platform
      expect(mockPrisma.walletConnection.findMany).toHaveBeenCalled();
    });

    it('should return positions from database', async () => {
      const mockWallet = {
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
        user: { id: 'user-1' },
      };

      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);

      const positionsMap = new Map();
      positionsMap.set('wallet-1', [
        {
          platformMarket: {
            externalId: 'market-1',
            question: 'Will BTC hit $100k?',
            platformData: {
              slug: 'btc-100k',
              exchange: '0xexchange',
              yesTokenId: '1',
              noTokenId: '2',
            },
          },
          outcome: 'YES',
          shares: 100,
          currentPrice: 0.65,
          avgCostBasis: 0.50,
          unrealizedPnl: 15,
        },
      ]);
      mockBatchFindPositions.mockResolvedValue(positionsMap);

      // Specify single platform to avoid double-scanning
      const result = await scanner.scanWallet('0x1234567890123456789012345678901234567890', {
        platforms: ['LIMITLESS'],
      });

      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].marketSlug).toBe('btc-100k');
      expect(result.positions[0].outcome).toBe('YES');
      expect(result.positions[0].balanceFormatted).toBe(100);
    });

    it('should calculate total value correctly', async () => {
      const mockWallet = {
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
        user: { id: 'user-1' },
      };

      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);

      const positionsMap = new Map();
      positionsMap.set('wallet-1', [
        {
          platformMarket: {
            externalId: 'market-1',
            question: 'Test',
            platformData: { slug: 'test', exchange: '0x1' },
          },
          outcome: 'YES',
          shares: 100,
          currentPrice: 0.5,
          avgCostBasis: 0.4,
          unrealizedPnl: 10,
        },
        {
          platformMarket: {
            externalId: 'market-2',
            question: 'Test 2',
            platformData: { slug: 'test2', exchange: '0x2' },
          },
          outcome: 'NO',
          shares: 50,
          currentPrice: 0.3,
          avgCostBasis: 0.2,
          unrealizedPnl: 5,
        },
      ]);
      mockBatchFindPositions.mockResolvedValue(positionsMap);

      // Specify single platform to avoid double-scanning
      const result = await scanner.scanWallet('0x1234567890123456789012345678901234567890', {
        platforms: ['LIMITLESS'],
      });

      // 100 * 0.5 + 50 * 0.3 = 50 + 15 = 65
      expect(result.totalValue).toBe(65);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.walletConnection.findMany.mockRejectedValue(new Error('Database error'));

      const result = await scanner.scanWallet('0x1234567890123456789012345678901234567890');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to scan');
    });

    it('should set correct chain IDs for platforms', async () => {
      const mockWallet = {
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
        user: { id: 'user-1' },
      };

      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);

      const positionsMap = new Map();
      positionsMap.set('wallet-1', [
        {
          platformMarket: {
            externalId: 'market-1',
            question: 'Test',
            platformData: { slug: 'test' },
          },
          outcome: 'YES',
          shares: 100,
          currentPrice: 0.5,
          avgCostBasis: 0.4,
        },
      ]);
      mockBatchFindPositions.mockResolvedValue(positionsMap);

      // Test LIMITLESS (Base = 8453)
      const limitlessResult = await scanner.scanWallet(
        '0x1234567890123456789012345678901234567890',
        { platforms: ['LIMITLESS'] }
      );
      expect(limitlessResult.positions[0]?.chainId).toBe(8453);

      // Test POLYMARKET (Polygon = 137)
      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);
      mockBatchFindPositions.mockResolvedValue(positionsMap);

      const polymarketResult = await scanner.scanWallet(
        '0x1234567890123456789012345678901234567890',
        { platforms: ['POLYMARKET'] }
      );
      expect(polymarketResult.positions[0]?.chainId).toBe(137);
    });
  });

  // =============================================================================
  // scanLimitlessOnChain Tests
  // =============================================================================

  describe('scanLimitlessOnChain', () => {
    it('should return empty when platform not configured', async () => {
      mockPrisma.platformConfig.findFirst.mockResolvedValue(null);

      const result = await scanner.scanLimitlessOnChain(
        '0x1234567890123456789012345678901234567890',
        {}
      );

      expect(result).toEqual([]);
    });

    it('should return empty when no markets have token info', async () => {
      mockPrisma.platformConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        slug: 'limitless',
        isActive: true,
      });
      mockPrisma.platformMarket.findMany.mockResolvedValue([
        {
          id: 'pm-1',
          externalId: 'market-1',
          question: 'Test',
          platformData: null, // No token info
        },
      ]);

      const result = await scanner.scanLimitlessOnChain(
        '0x1234567890123456789012345678901234567890',
        {}
      );

      expect(result).toEqual([]);
    });

    it('should scan on-chain for positions', async () => {
      mockPrisma.platformConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        slug: 'limitless',
        isActive: true,
      });
      mockPrisma.platformMarket.findMany.mockResolvedValue([
        {
          id: 'pm-1',
          externalId: 'market-1',
          question: 'Will ETH reach $5k?',
          yesPrice: 0.6,
          noPrice: 0.4,
          platformData: {
            venue: { exchange: '0xcontract' },
            yesTokenId: '1',
            noTokenId: '2',
            collateralToken: { address: '0xusdc', decimals: 6 },
          },
        },
      ]);

      const mockScannerInstance = {
        scanWallet: vi.fn().mockResolvedValue({
          positions: [
            {
              marketSlug: 'market-1',
              question: 'Will ETH reach $5k?',
              outcomeLabel: 'YES',
              balance: BigInt(100e18),
              balanceFormatted: 100,
              tokenAddress: '0xcontract',
              tokenId: BigInt(1),
              currentPrice: 0.6,
            },
          ],
          errors: [],
        }),
      };
      (ERC1155Scanner as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockScannerInstance);

      const result = await scanner.scanLimitlessOnChain(
        '0x1234567890123456789012345678901234567890',
        {}
      );

      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('LIMITLESS');
      expect(result[0].chainId).toBe(8453);
    });
  });

  // =============================================================================
  // scanPolymarketOnChain Tests
  // =============================================================================

  describe('scanPolymarketOnChain', () => {
    it('should return empty (not yet implemented)', async () => {
      const result = await scanner.scanPolymarketOnChain(
        '0x1234567890123456789012345678901234567890',
        {}
      );

      expect(result).toEqual([]);
    });
  });

  // =============================================================================
  // importPositions Tests
  // =============================================================================

  describe('importPositions', () => {
    it('should return zero when no positions to import', async () => {
      const result = await scanner.importPositions('user-1', {
        address: '0x123',
        positions: [],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      expect(result.imported).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should import positions successfully', async () => {
      mockBatchLookupConfigs.mockResolvedValue(
        new Map([['limitless', { id: 'config-1', slug: 'limitless' }]])
      );
      mockBatchLookupMarkets.mockResolvedValue(
        new Map([['config-1:market-1', { id: 'pm-1' }]])
      );
      mockBatchUpsertPositions.mockResolvedValue({ success: true, count: 1 });

      const result = await scanner.importPositions('user-1', {
        address: '0x123',
        positions: [
          {
            platform: 'LIMITLESS',
            marketId: 'market-1',
            marketSlug: 'test-market',
            marketQuestion: 'Test?',
            outcome: 'YES',
            outcomeLabel: 'Yes',
            balance: BigInt(100e18),
            balanceFormatted: 100,
            tokenAddress: '0x123',
            currentPrice: 0.5,
            chainId: 8453,
          },
        ],
        totalValue: 50,
        scanTimestamp: new Date(),
        errors: [],
      });

      expect(result.imported).toBe(1);
      expect(result.errors).toEqual([]);
      expect(mockBatchUpsertPositions).toHaveBeenCalled();
    });

    it('should handle missing platform config', async () => {
      mockBatchLookupConfigs.mockResolvedValue(new Map());
      mockBatchUpsertPositions.mockResolvedValue({ success: true, count: 0 });

      const result = await scanner.importPositions('user-1', {
        address: '0x123',
        positions: [
          {
            platform: 'LIMITLESS',
            marketId: 'market-1',
            marketSlug: 'test',
            marketQuestion: 'Test?',
            outcome: 'YES',
            outcomeLabel: 'Yes',
            balance: BigInt(100e18),
            balanceFormatted: 100,
            tokenAddress: '0x123',
            chainId: 8453,
          },
        ],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      expect(result.errors).toContain('Platform config not found for limitless');
    });

    it('should handle missing market', async () => {
      mockBatchLookupConfigs.mockResolvedValue(
        new Map([['limitless', { id: 'config-1', slug: 'limitless' }]])
      );
      mockBatchLookupMarkets.mockResolvedValue(new Map());
      mockBatchUpsertPositions.mockResolvedValue({ success: true, count: 0 });

      const result = await scanner.importPositions('user-1', {
        address: '0x123',
        positions: [
          {
            platform: 'LIMITLESS',
            marketId: 'nonexistent-market',
            marketSlug: 'test',
            marketQuestion: 'Test?',
            outcome: 'YES',
            outcomeLabel: 'Yes',
            balance: BigInt(100e18),
            balanceFormatted: 100,
            tokenAddress: '0x123',
            chainId: 8453,
          },
        ],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      expect(result.errors).toContain('Market not found: nonexistent-market');
    });

    it('should handle batch upsert failure', async () => {
      mockBatchLookupConfigs.mockResolvedValue(
        new Map([['limitless', { id: 'config-1', slug: 'limitless' }]])
      );
      mockBatchLookupMarkets.mockResolvedValue(
        new Map([['config-1:market-1', { id: 'pm-1' }]])
      );
      mockBatchUpsertPositions.mockResolvedValue({
        success: false,
        count: 0,
        error: 'Transaction failed',
      });

      const result = await scanner.importPositions('user-1', {
        address: '0x123',
        positions: [
          {
            platform: 'LIMITLESS',
            marketId: 'market-1',
            marketSlug: 'test',
            marketQuestion: 'Test?',
            outcome: 'YES',
            outcomeLabel: 'Yes',
            balance: BigInt(100e18),
            balanceFormatted: 100,
            tokenAddress: '0x123',
            chainId: 8453,
          },
        ],
        totalValue: 0,
        scanTimestamp: new Date(),
        errors: [],
      });

      expect(result.errors).toContain('Batch upsert failed: Transaction failed');
    });

    it('should include wallet connection ID when provided', async () => {
      mockBatchLookupConfigs.mockResolvedValue(
        new Map([['limitless', { id: 'config-1', slug: 'limitless' }]])
      );
      mockBatchLookupMarkets.mockResolvedValue(
        new Map([['config-1:market-1', { id: 'pm-1' }]])
      );
      mockBatchUpsertPositions.mockResolvedValue({ success: true, count: 1 });

      await scanner.importPositions(
        'user-1',
        {
          address: '0x123',
          positions: [
            {
              platform: 'LIMITLESS',
              marketId: 'market-1',
              marketSlug: 'test',
              marketQuestion: 'Test?',
              outcome: 'YES',
              outcomeLabel: 'Yes',
              balance: BigInt(100e18),
              balanceFormatted: 100,
              tokenAddress: '0x123',
              chainId: 8453,
            },
          ],
          totalValue: 0,
          scanTimestamp: new Date(),
          errors: [],
        },
        'wallet-conn-1'
      );

      expect(mockBatchUpsertPositions).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            walletConnectionId: 'wallet-conn-1',
          }),
        ])
      );
    });
  });

  // =============================================================================
  // getPositionSummary Tests
  // =============================================================================

  describe('getPositionSummary', () => {
    it('should return summary of positions', async () => {
      const mockWallet = {
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
        user: { id: 'user-1' },
      };

      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);

      const positionsMap = new Map();
      positionsMap.set('wallet-1', [
        {
          platformMarket: {
            externalId: 'market-1',
            question: 'Test',
            platformData: { slug: 'test' },
          },
          outcome: 'YES',
          shares: 100,
          currentPrice: 0.5,
          avgCostBasis: 0.4,
        },
      ]);
      // Return positions for first platform, empty for second
      mockBatchFindPositions
        .mockResolvedValueOnce(positionsMap)
        .mockResolvedValueOnce(new Map());

      const summary = await scanner.getPositionSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.totalPositions).toBe(1);
      expect(summary.totalValue).toBe(50); // 100 * 0.5
      expect(summary.byPlatform).toHaveProperty('LIMITLESS');
    });

    it('should group by platform correctly', async () => {
      const mockWallet = {
        id: 'wallet-1',
        address: '0x1234567890123456789012345678901234567890',
        user: { id: 'user-1' },
      };

      mockPrisma.walletConnection.findMany.mockResolvedValue([mockWallet]);

      const limitlessPositions = new Map();
      limitlessPositions.set('wallet-1', [
        {
          platformMarket: {
            externalId: 'm1',
            question: 'Test 1',
            platformData: { slug: 't1' },
          },
          outcome: 'YES',
          shares: 100,
          currentPrice: 0.5,
          avgCostBasis: 0.4,
        },
        {
          platformMarket: {
            externalId: 'm2',
            question: 'Test 2',
            platformData: { slug: 't2' },
          },
          outcome: 'NO',
          shares: 50,
          currentPrice: 0.3,
          avgCostBasis: 0.2,
        },
      ]);
      // Return positions for first platform, empty for second
      mockBatchFindPositions
        .mockResolvedValueOnce(limitlessPositions)
        .mockResolvedValueOnce(new Map());

      const summary = await scanner.getPositionSummary(
        '0x1234567890123456789012345678901234567890'
      );

      expect(summary.totalPositions).toBe(2);
      // Value: 100 * 0.5 + 50 * 0.3 = 50 + 15 = 65
      expect(summary.totalValue).toBe(65);
    });
  });
});
