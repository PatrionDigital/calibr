import { describe, it, expect } from 'vitest';
import {
  toPosition,
  toPositions,
  getCategoryFromMarket,
  toExposureByPlatform,
  calculateExposureByCategory,
  calculateExposureByOutcome,
  toPortfolioSummaryProps,
  filterPositions,
} from './portfolio-adapters';
import type { PortfolioPosition, PortfolioSummary } from './api';
import type { Position } from '@/components/portfolio/position-table';

describe('portfolio-adapters', () => {
  const mockApiPosition: PortfolioPosition = {
    id: 'pos-1',
    platform: 'polymarket',
    platformName: 'Polymarket',
    marketId: 'market-1',
    marketQuestion: 'Will Trump win 2028?',
    outcome: 'YES',
    shares: 1000,
    avgCostBasis: 0.40,
    currentPrice: 0.45,
    currentValue: 450,
    unrealizedPnl: 50,
    unrealizedPnlPct: 12.5,
    isResolved: false,
    resolution: null,
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('toPosition', () => {
    it('transforms API position to component position', () => {
      const result = toPosition(mockApiPosition);

      expect(result).toEqual({
        id: 'pos-1',
        marketQuestion: 'Will Trump win 2028?',
        outcome: 'YES',
        shares: 1000,
        currentValue: 450,
        pnl: 50,
        pnlPercent: 12.5,
        platform: 'POLYMARKET',
        category: 'POLITICS',
      });
    });

    it('maps pnl fields correctly', () => {
      const result = toPosition(mockApiPosition);
      expect(result.pnl).toBe(mockApiPosition.unrealizedPnl);
      expect(result.pnlPercent).toBe(mockApiPosition.unrealizedPnlPct);
    });

    it('uppercases platform name', () => {
      const result = toPosition(mockApiPosition);
      expect(result.platform).toBe('POLYMARKET');
    });
  });

  describe('toPositions', () => {
    it('transforms array of API positions', () => {
      const positions: PortfolioPosition[] = [
        mockApiPosition,
        { ...mockApiPosition, id: 'pos-2', marketQuestion: 'BTC > 100k?', outcome: 'NO' },
      ];

      const result = toPositions(positions);

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('pos-1');
      expect(result[1]!.id).toBe('pos-2');
    });

    it('handles empty array', () => {
      const result = toPositions([]);
      expect(result).toEqual([]);
    });
  });

  describe('getCategoryFromMarket', () => {
    it('categorizes political questions', () => {
      expect(getCategoryFromMarket('Will Trump win?')).toBe('POLITICS');
      expect(getCategoryFromMarket('Biden approval rating')).toBe('POLITICS');
      expect(getCategoryFromMarket('2024 election winner')).toBe('POLITICS');
      expect(getCategoryFromMarket('Next president')).toBe('POLITICS');
    });

    it('categorizes crypto questions', () => {
      expect(getCategoryFromMarket('BTC > 100k?')).toBe('CRYPTO');
      expect(getCategoryFromMarket('ETH price prediction')).toBe('CRYPTO');
      expect(getCategoryFromMarket('Bitcoin halving impact')).toBe('CRYPTO');
      expect(getCategoryFromMarket('Crypto market cap')).toBe('CRYPTO');
    });

    it('categorizes sports questions', () => {
      expect(getCategoryFromMarket('NFL playoffs winner')).toBe('SPORTS');
      expect(getCategoryFromMarket('NBA finals')).toBe('SPORTS');
      expect(getCategoryFromMarket('Super Bowl champion')).toBe('SPORTS');
      expect(getCategoryFromMarket('World Cup winner')).toBe('SPORTS');
    });

    it('categorizes economics questions', () => {
      expect(getCategoryFromMarket('Fed rate decision')).toBe('ECONOMICS');
      expect(getCategoryFromMarket('GDP growth')).toBe('ECONOMICS');
      expect(getCategoryFromMarket('Inflation rate')).toBe('ECONOMICS');
      expect(getCategoryFromMarket('Interest rate hike')).toBe('ECONOMICS');
    });

    it('returns OTHER for unknown categories', () => {
      expect(getCategoryFromMarket('Random question')).toBe('OTHER');
      expect(getCategoryFromMarket('Weather tomorrow')).toBe('OTHER');
    });
  });

  describe('toExposureByPlatform', () => {
    it('transforms byPlatform data to ExposureItem array', () => {
      const byPlatform = {
        polymarket: { value: 600, cost: 500, count: 3 },
        limitless: { value: 400, cost: 350, count: 2 },
      };

      const result = toExposureByPlatform(byPlatform, 1000);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'POLYMARKET', value: 600, percent: 60 });
      expect(result[1]).toEqual({ name: 'LIMITLESS', value: 400, percent: 40 });
    });

    it('handles zero total value', () => {
      const byPlatform = {
        polymarket: { value: 0, cost: 0, count: 0 },
      };

      const result = toExposureByPlatform(byPlatform, 0);

      expect(result[0]!.percent).toBe(0);
    });

    it('handles empty object', () => {
      const result = toExposureByPlatform({}, 1000);
      expect(result).toEqual([]);
    });
  });

  describe('calculateExposureByCategory', () => {
    it('calculates category exposure from positions', () => {
      const positions: PortfolioPosition[] = [
        { ...mockApiPosition, marketQuestion: 'Trump wins?', currentValue: 300 },
        { ...mockApiPosition, id: 'pos-2', marketQuestion: 'BTC > 100k?', currentValue: 200 },
        { ...mockApiPosition, id: 'pos-3', marketQuestion: 'Biden approval?', currentValue: 500 },
      ];

      const result = calculateExposureByCategory(positions);

      // Two POLITICS positions (300 + 500 = 800), one CRYPTO (200)
      const politics = result.find((e) => e.name === 'POLITICS');
      const crypto = result.find((e) => e.name === 'CRYPTO');

      expect(politics?.value).toBe(800);
      expect(politics?.percent).toBe(80);
      expect(crypto?.value).toBe(200);
      expect(crypto?.percent).toBe(20);
    });

    it('handles empty positions', () => {
      const result = calculateExposureByCategory([]);
      expect(result).toEqual([]);
    });
  });

  describe('calculateExposureByOutcome', () => {
    it('calculates outcome exposure from positions', () => {
      const positions: PortfolioPosition[] = [
        { ...mockApiPosition, outcome: 'YES', currentValue: 600 },
        { ...mockApiPosition, id: 'pos-2', outcome: 'NO', currentValue: 400 },
      ];

      const result = calculateExposureByOutcome(positions);

      const yes = result.find((e) => e.name === 'YES');
      const no = result.find((e) => e.name === 'NO');

      expect(yes?.value).toBe(600);
      expect(yes?.percent).toBe(60);
      expect(no?.value).toBe(400);
      expect(no?.percent).toBe(40);
    });
  });

  describe('toPortfolioSummaryProps', () => {
    const mockApiSummary: PortfolioSummary = {
      totalValue: 10000,
      totalCost: 8000,
      unrealizedPnl: 2000,
      unrealizedPnlPct: 25,
      positionCount: 5,
      positions: [],
      byPlatform: {},
      byOutcome: { YES: 6000, NO: 4000, OTHER: 0 },
    };

    it('transforms API summary to component props', () => {
      const result = toPortfolioSummaryProps(mockApiSummary);

      expect(result.totalValue).toBe(10000);
      expect(result.totalPnl).toBe(2000);
      expect(result.totalPnlPercent).toBe(25);
    });

    it('uses provided chain balances', () => {
      const chainBalances = [{ chain: 'BASE', balances: [{ token: 'USDC', amount: 100 }] }];
      const result = toPortfolioSummaryProps(mockApiSummary, chainBalances);

      expect(result.chainBalances).toEqual(chainBalances);
    });

    it('uses provided pending bridges', () => {
      const pendingBridges = [{ amount: 500, status: 'bridging' }];
      const result = toPortfolioSummaryProps(mockApiSummary, [], pendingBridges);

      expect(result.pendingBridges).toEqual(pendingBridges);
    });

    it('sets default period P&L with 30d as total pnl', () => {
      const result = toPortfolioSummaryProps(mockApiSummary);

      expect(result.periodPnl['24h']).toBe(0);
      expect(result.periodPnl['7d']).toBe(0);
      expect(result.periodPnl['30d']).toBe(2000);
    });
  });

  describe('filterPositions', () => {
    const positions: Position[] = [
      {
        id: '1',
        marketQuestion: 'Q1',
        outcome: 'YES',
        shares: 100,
        currentValue: 500,
        pnl: 50,
        pnlPercent: 10,
        platform: 'POLYMARKET',
        category: 'POLITICS',
      },
      {
        id: '2',
        marketQuestion: 'Q2',
        outcome: 'NO',
        shares: 200,
        currentValue: 300,
        pnl: -30,
        pnlPercent: -10,
        platform: 'LIMITLESS',
        category: 'CRYPTO',
      },
      {
        id: '3',
        marketQuestion: 'Q3',
        outcome: 'YES',
        shares: 150,
        currentValue: 400,
        pnl: 20,
        pnlPercent: 5,
        platform: 'POLYMARKET',
        category: 'SPORTS',
      },
    ];

    it('returns all positions when no filter', () => {
      const result = filterPositions(positions);
      expect(result).toHaveLength(3);
    });

    it('filters by platform', () => {
      const result = filterPositions(positions, { platform: 'POLYMARKET' });
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.platform === 'POLYMARKET')).toBe(true);
    });

    it('filters by category', () => {
      const result = filterPositions(positions, { category: 'POLITICS' });
      expect(result).toHaveLength(1);
      expect(result[0]!.category).toBe('POLITICS');
    });

    it('sorts by value descending', () => {
      const result = filterPositions(positions, undefined, 'value', 'desc');
      expect(result[0]!.currentValue).toBe(500);
      expect(result[1]!.currentValue).toBe(400);
      expect(result[2]!.currentValue).toBe(300);
    });

    it('sorts by value ascending', () => {
      const result = filterPositions(positions, undefined, 'value', 'asc');
      expect(result[0]!.currentValue).toBe(300);
      expect(result[2]!.currentValue).toBe(500);
    });

    it('sorts by pnl descending', () => {
      const result = filterPositions(positions, undefined, 'pnl', 'desc');
      expect(result[0]!.pnl).toBe(50);
      expect(result[2]!.pnl).toBe(-30);
    });

    it('combines filter and sort', () => {
      const result = filterPositions(positions, { platform: 'POLYMARKET' }, 'value', 'asc');
      expect(result).toHaveLength(2);
      expect(result[0]!.currentValue).toBe(400);
      expect(result[1]!.currentValue).toBe(500);
    });

    it('does not mutate original array', () => {
      const original = [...positions];
      filterPositions(positions, undefined, 'value', 'desc');
      expect(positions).toEqual(original);
    });
  });
});
