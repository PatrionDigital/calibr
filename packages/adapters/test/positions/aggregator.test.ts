/**
 * Position Aggregator Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PositionAggregator,
  type AggregatedPosition,
} from '../../src/positions/aggregator';
import type { ITradingAdapter, UnifiedPosition, AuthState } from '../../src/trading/types';
import type { MarketTokenMapping } from '../../src/onchain/erc1155-scanner';

// Mock the ERC1155Scanner
vi.mock('../../src/onchain/erc1155-scanner', () => ({
  ERC1155Scanner: vi.fn().mockImplementation(() => ({
    scanWallet: vi.fn().mockResolvedValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      positions: [],
      totalPositions: 0,
      totalValue: 0,
      scanTimestamp: new Date(),
      marketsScanned: 0,
      errors: [],
    }),
  })),
}));

// Mock trading adapter
const createMockAdapter = (positions: UnifiedPosition[] = []): ITradingAdapter => ({
  platform: 'LIMITLESS',
  isReady: vi.fn().mockResolvedValue(true),
  authenticate: vi.fn().mockResolvedValue({
    isAuthenticated: true,
    platform: 'LIMITLESS',
    address: '0x1234',
  }),
  getAuthState: vi.fn().mockReturnValue({
    isAuthenticated: true,
    platform: 'LIMITLESS',
    address: '0x1234',
  } as AuthState),
  logout: vi.fn().mockResolvedValue(undefined),
  placeOrder: vi.fn(),
  cancelOrder: vi.fn(),
  cancelAllOrders: vi.fn(),
  getOrder: vi.fn(),
  getOpenOrders: vi.fn(),
  getOrderHistory: vi.fn(),
  getPositions: vi.fn().mockResolvedValue(positions),
  getPosition: vi.fn(),
  getTrades: vi.fn(),
  getBalances: vi.fn(),
  getBalance: vi.fn(),
  getBestPrice: vi.fn(),
});

describe('PositionAggregator', () => {
  let aggregator: PositionAggregator;

  beforeEach(() => {
    aggregator = new PositionAggregator();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create aggregator with default config', () => {
      expect(aggregator).toBeInstanceOf(PositionAggregator);
    });
  });

  describe('registerAdapter', () => {
    it('should register a trading adapter', () => {
      const mockAdapter = createMockAdapter();
      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const adapter = aggregator.getAdapter('LIMITLESS');
      expect(adapter).toBe(mockAdapter);
    });
  });

  describe('aggregatePositions', () => {
    it('should return empty portfolio when no positions', async () => {
      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: false,
      });

      expect(result.totalPositions).toBe(0);
      expect(result.totalMarkets).toBe(0);
      expect(result.totalMarketValue).toBe(0);
      expect(result.byMarket).toHaveLength(0);
    });

    it('should aggregate positions from trading adapter', async () => {
      const mockPositions: UnifiedPosition[] = [
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'YES',
          size: 100,
          averagePrice: 0.50,
          currentPrice: 0.65,
          unrealizedPnl: 15,
          realizedPnl: 0,
          costBasis: 50,
        },
        {
          platform: 'LIMITLESS',
          marketId: 'eth-10k',
          marketQuestion: 'Will ETH reach $10k?',
          outcome: 'NO',
          size: 50,
          averagePrice: 0.30,
          currentPrice: 0.25,
          unrealizedPnl: 2.5,
          realizedPnl: 0,
          costBasis: 15,
        },
      ];

      const mockAdapter = createMockAdapter(mockPositions);
      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
      });

      expect(result.totalPositions).toBe(2);
      expect(result.totalMarkets).toBe(2);
      expect(result.totalUnrealizedPnl).toBe(17.5);
      expect(result.byMarket).toHaveLength(2);
    });

    it('should group positions by market', async () => {
      const mockPositions: UnifiedPosition[] = [
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'YES',
          size: 100,
          averagePrice: 0.50,
          currentPrice: 0.65,
          unrealizedPnl: 15,
          realizedPnl: 0,
          costBasis: 50,
        },
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'NO',
          size: 50,
          averagePrice: 0.35,
          currentPrice: 0.35,
          unrealizedPnl: 0,
          realizedPnl: 0,
          costBasis: 17.5,
        },
      ];

      const mockAdapter = createMockAdapter(mockPositions);
      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
      });

      expect(result.totalPositions).toBe(2);
      expect(result.totalMarkets).toBe(1);

      const btcGroup = result.byMarket[0];
      expect(btcGroup.positions).toHaveLength(2);
      expect(btcGroup.totalSize).toBe(150);
      expect(btcGroup.netExposure).toBe(50); // 100 YES - 50 NO
    });

    it('should calculate portfolio return percentage', async () => {
      const mockPositions: UnifiedPosition[] = [
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'YES',
          size: 100,
          averagePrice: 0.40,
          currentPrice: 0.60,
          unrealizedPnl: 20,
          realizedPnl: 0,
          costBasis: 40, // Bought at 0.40
        },
      ];

      const mockAdapter = createMockAdapter(mockPositions);
      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
      });

      // Market value: 100 * 0.60 = 60
      // Cost basis: 40
      // Return: (60 - 40) / 40 = 50%
      expect(result.totalMarketValue).toBe(60);
      expect(result.totalCostBasis).toBe(40);
      expect(result.overallReturnPct).toBe(50);
    });

    it('should group positions by platform', async () => {
      const limitlessPositions: UnifiedPosition[] = [
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'YES',
          size: 100,
          averagePrice: 0.50,
          currentPrice: 0.65,
          unrealizedPnl: 15,
          realizedPnl: 0,
          costBasis: 50,
        },
      ];

      const polymarketPositions: UnifiedPosition[] = [
        {
          platform: 'POLYMARKET',
          marketId: 'election-2024',
          marketQuestion: 'Who will win 2024 election?',
          outcome: 0,
          size: 200,
          averagePrice: 0.45,
          currentPrice: 0.55,
          unrealizedPnl: 20,
          realizedPnl: 0,
          costBasis: 90,
        },
      ];

      const limitlessAdapter = createMockAdapter(limitlessPositions);
      const polymarketAdapter = createMockAdapter(polymarketPositions);
      (polymarketAdapter as any).platform = 'POLYMARKET';
      (polymarketAdapter.getAuthState as any).mockReturnValue({
        isAuthenticated: true,
        platform: 'POLYMARKET',
        address: '0x5678',
      });

      aggregator.registerAdapter('LIMITLESS', limitlessAdapter);
      aggregator.registerAdapter('POLYMARKET', polymarketAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS', 'POLYMARKET'],
        includeOnChain: false,
        includeApi: true,
      });

      expect(result.totalPositions).toBe(2);
      expect(result.byPlatform.get('LIMITLESS')).toHaveLength(1);
      expect(result.byPlatform.get('POLYMARKET')).toHaveLength(1);
    });

    it('should filter positions by minimum size', async () => {
      const mockPositions: UnifiedPosition[] = [
        {
          platform: 'LIMITLESS',
          marketId: 'btc-100k',
          marketQuestion: 'Will BTC reach $100k?',
          outcome: 'YES',
          size: 100,
          averagePrice: 0.50,
          currentPrice: 0.65,
          unrealizedPnl: 15,
          realizedPnl: 0,
          costBasis: 50,
        },
        {
          platform: 'LIMITLESS',
          marketId: 'tiny-position',
          marketQuestion: 'Tiny market?',
          outcome: 'YES',
          size: 0.00001, // Very small position
          averagePrice: 0.50,
          currentPrice: 0.50,
          unrealizedPnl: 0,
          realizedPnl: 0,
          costBasis: 0.000005,
        },
      ];

      const mockAdapter = createMockAdapter(mockPositions);
      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
        minSize: 0.001,
      });

      expect(result.totalPositions).toBe(1);
      expect(result.byMarket[0].positions[0].marketId).toBe('btc-100k');
    });

    it('should handle adapter errors gracefully', async () => {
      const mockAdapter = createMockAdapter([]);
      (mockAdapter.getPositions as any).mockRejectedValue(new Error('API Error'));

      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
      });

      // Should not throw, just return empty
      expect(result.totalPositions).toBe(0);
    });

    it('should skip unauthenticated adapters', async () => {
      const mockAdapter = createMockAdapter([{
        platform: 'LIMITLESS',
        marketId: 'btc-100k',
        marketQuestion: 'Test',
        outcome: 'YES',
        size: 100,
        averagePrice: 0.50,
        currentPrice: 0.65,
        unrealizedPnl: 15,
        realizedPnl: 0,
        costBasis: 50,
      }]);

      // Not authenticated
      (mockAdapter.getAuthState as any).mockReturnValue(null);

      aggregator.registerAdapter('LIMITLESS', mockAdapter);

      const result = await aggregator.aggregatePositions({
        walletAddress: '0x1234567890123456789012345678901234567890',
        platforms: ['LIMITLESS'],
        includeOnChain: false,
        includeApi: true,
      });

      expect(result.totalPositions).toBe(0);
      expect(mockAdapter.getPositions).not.toHaveBeenCalled();
    });
  });
});
