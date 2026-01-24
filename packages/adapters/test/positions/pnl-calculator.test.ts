/**
 * P&L Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import { PnLCalculator, type PnLHistoryEntry } from '../../src/positions/pnl-calculator';
import type { PortfolioSummary, AggregatedPosition, PositionGroup } from '../../src/positions/aggregator';

// Helper to create a mock portfolio
function createMockPortfolio(positions: Partial<AggregatedPosition>[]): PortfolioSummary {
  const fullPositions: AggregatedPosition[] = positions.map((p, i) => ({
    id: p.id || `pos-${i}`,
    platform: p.platform || 'LIMITLESS',
    marketId: p.marketId || `market-${i}`,
    question: p.question || `Question ${i}`,
    outcome: p.outcome ?? 'YES',
    outcomeLabel: p.outcomeLabel || 'Yes',
    size: p.size ?? 100,
    averagePrice: p.averagePrice ?? 0.5,
    currentPrice: p.currentPrice ?? 0.5,
    unrealizedPnl: p.unrealizedPnl ?? 0,
    realizedPnl: p.realizedPnl ?? 0,
    costBasis: p.costBasis ?? 50,
    marketValue: p.marketValue ?? 50,
    returnPct: p.returnPct ?? 0,
    collateralToken: 'USDC',
    chainId: 8453,
    updatedAt: new Date(),
    source: 'api',
  }));

  // Group by market
  const marketGroups = new Map<string, PositionGroup>();
  for (const pos of fullPositions) {
    const key = pos.marketId;
    if (!marketGroups.has(key)) {
      marketGroups.set(key, {
        unifiedMarketId: key,
        question: pos.question,
        positions: [],
        totalSize: 0,
        netExposure: 0,
        totalUnrealizedPnl: 0,
        totalRealizedPnl: 0,
        totalCostBasis: 0,
        totalMarketValue: 0,
        platforms: [],
      });
    }
    const group = marketGroups.get(key)!;
    group.positions.push(pos);
    group.totalSize += pos.size;
    group.totalUnrealizedPnl += pos.unrealizedPnl;
    group.totalRealizedPnl += pos.realizedPnl;
    group.totalCostBasis += pos.costBasis;
    group.totalMarketValue += pos.marketValue;
    if (!group.platforms.includes(pos.platform)) {
      group.platforms.push(pos.platform);
    }
  }

  // Group by platform
  const platformGroups = new Map<'LIMITLESS' | 'POLYMARKET', AggregatedPosition[]>();
  for (const pos of fullPositions) {
    if (!platformGroups.has(pos.platform as 'LIMITLESS')) {
      platformGroups.set(pos.platform as 'LIMITLESS', []);
    }
    platformGroups.get(pos.platform as 'LIMITLESS')!.push(pos);
  }

  const totalMarketValue = fullPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalUnrealizedPnl = fullPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalRealizedPnl = fullPositions.reduce((sum, p) => sum + p.realizedPnl, 0);
  const totalCostBasis = fullPositions.reduce((sum, p) => sum + p.costBasis, 0);

  return {
    totalPositions: fullPositions.length,
    totalMarkets: marketGroups.size,
    totalMarketValue,
    totalUnrealizedPnl,
    totalRealizedPnl,
    totalCostBasis,
    overallReturnPct: totalCostBasis > 0 ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100 : 0,
    byMarket: Array.from(marketGroups.values()),
    byPlatform: platformGroups as Map<any, any>,
    updatedAt: new Date(),
  };
}

describe('PnLCalculator', () => {
  const calculator = new PnLCalculator();

  describe('calculateFromPortfolio', () => {
    it('should calculate P&L from empty portfolio', () => {
      const portfolio = createMockPortfolio([]);
      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.overall.unrealized).toBe(0);
      expect(result.overall.realized).toBe(0);
      expect(result.overall.total).toBe(0);
      expect(result.overall.winRate).toBe(0);
      expect(result.positions).toHaveLength(0);
    });

    it('should calculate P&L for winning positions', () => {
      const portfolio = createMockPortfolio([
        {
          id: 'win-1',
          size: 100,
          costBasis: 50,
          marketValue: 75,
          unrealizedPnl: 25,
          realizedPnl: 0,
        },
        {
          id: 'win-2',
          size: 50,
          costBasis: 25,
          marketValue: 40,
          unrealizedPnl: 15,
          realizedPnl: 0,
        },
      ]);

      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.overall.unrealized).toBe(40);
      expect(result.overall.realized).toBe(0);
      expect(result.overall.total).toBe(40);
      expect(result.overall.winRate).toBe(100);
      expect(result.topWinners).toHaveLength(2);
      expect(result.topLosers).toHaveLength(0);
    });

    it('should calculate P&L for losing positions', () => {
      const portfolio = createMockPortfolio([
        {
          id: 'loss-1',
          size: 100,
          costBasis: 50,
          marketValue: 30,
          unrealizedPnl: -20,
          realizedPnl: 0,
        },
      ]);

      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.overall.unrealized).toBe(-20);
      expect(result.overall.total).toBe(-20);
      expect(result.overall.winRate).toBe(0);
      expect(result.overall.averageLoss).toBe(20);
      expect(result.topLosers).toHaveLength(1);
    });

    it('should calculate mixed P&L correctly', () => {
      const portfolio = createMockPortfolio([
        {
          id: 'win-1',
          size: 100,
          costBasis: 50,
          marketValue: 75,
          unrealizedPnl: 25,
          realizedPnl: 0,
        },
        {
          id: 'loss-1',
          size: 100,
          costBasis: 50,
          marketValue: 30,
          unrealizedPnl: -20,
          realizedPnl: 0,
        },
        {
          id: 'flat-1',
          size: 100,
          costBasis: 50,
          marketValue: 50,
          unrealizedPnl: 0,
          realizedPnl: 0,
        },
      ]);

      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.overall.unrealized).toBe(5); // 25 - 20 + 0
      expect(result.overall.winRate).toBe(50); // 1 win out of 2 (flat doesn't count)
      expect(result.overall.averageWin).toBe(25);
      expect(result.overall.averageLoss).toBe(20);
    });

    it('should identify best and worst positions', () => {
      const portfolio = createMockPortfolio([
        {
          id: 'best',
          size: 100,
          costBasis: 40,
          marketValue: 80,
          unrealizedPnl: 40,
          realizedPnl: 0,
        },
        {
          id: 'worst',
          size: 100,
          costBasis: 60,
          marketValue: 20,
          unrealizedPnl: -40,
          realizedPnl: 0,
        },
      ]);

      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.overall.bestPosition?.id).toBe('best');
      expect(result.overall.worstPosition?.id).toBe('worst');
    });

    it('should group by platform', () => {
      const portfolio = createMockPortfolio([
        {
          id: 'limitless-1',
          platform: 'LIMITLESS',
          marketId: 'market-1',
          unrealizedPnl: 10,
          costBasis: 50,
        },
        {
          id: 'polymarket-1',
          platform: 'POLYMARKET',
          marketId: 'market-2',
          unrealizedPnl: 20,
          costBasis: 50,
        },
      ]);

      const result = calculator.calculateFromPortfolio(portfolio);

      expect(result.byPlatform.get('LIMITLESS')?.unrealized).toBe(10);
      expect(result.byPlatform.get('POLYMARKET')?.unrealized).toBe(20);
    });
  });

  describe('calculatePeriodPnL', () => {
    it('should calculate period P&L correctly', () => {
      const previous = createMockPortfolio([
        { costBasis: 100, marketValue: 100, unrealizedPnl: 0 },
      ]);
      const current = createMockPortfolio([
        { costBasis: 100, marketValue: 120, unrealizedPnl: 20 },
      ]);

      const result = calculator.calculatePeriodPnL(current, previous);

      expect(result.startValue).toBe(100);
      expect(result.endValue).toBe(120);
      expect(result.pnl).toBe(20);
      expect(result.returnPct).toBe(20);
    });

    it('should account for net flow (deposits/withdrawals)', () => {
      const previous = createMockPortfolio([
        { costBasis: 100, marketValue: 100, unrealizedPnl: 0 },
      ]);
      const current = createMockPortfolio([
        { costBasis: 150, marketValue: 160, unrealizedPnl: 10 },
      ]);

      // User deposited 50 more
      const result = calculator.calculatePeriodPnL(current, previous, 50);

      expect(result.pnl).toBe(10); // (160 - 100) - 50 = 10
      expect(result.netFlow).toBe(50);
    });
  });

  describe('generateDailyPnL', () => {
    it('should generate daily P&L from history', () => {
      const history: PnLHistoryEntry[] = [
        {
          timestamp: new Date('2025-01-01'),
          portfolioValue: 1000,
          cumulativeRealizedPnl: 0,
          unrealizedPnl: 0,
          totalPnl: 0,
          positionCount: 5,
        },
        {
          timestamp: new Date('2025-01-02'),
          portfolioValue: 1050,
          cumulativeRealizedPnl: 0,
          unrealizedPnl: 50,
          totalPnl: 50,
          positionCount: 5,
        },
        {
          timestamp: new Date('2025-01-03'),
          portfolioValue: 1020,
          cumulativeRealizedPnl: 0,
          unrealizedPnl: 20,
          totalPnl: 20,
          positionCount: 5,
        },
      ];

      const result = calculator.generateDailyPnL(history);

      expect(result).toHaveLength(2);
      expect(result[0].pnl).toBe(50); // Day 1 gain
      expect(result[1].pnl).toBe(-30); // Day 2 loss (20 - 50)
    });

    it('should handle insufficient history', () => {
      const result = calculator.generateDailyPnL([]);
      expect(result).toHaveLength(0);

      const singleDay = calculator.generateDailyPnL([{
        timestamp: new Date(),
        portfolioValue: 1000,
        cumulativeRealizedPnl: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
        positionCount: 1,
      }]);
      expect(singleDay).toHaveLength(0);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics from daily returns', () => {
      // Simulated daily returns (in percentage)
      const dailyReturns = [1, -0.5, 0.8, -0.3, 1.2, -0.8, 0.5];

      const result = calculator.calculateRiskMetrics(dailyReturns);

      expect(result.avgDailyReturn).toBeCloseTo(0.271, 2);
      expect(result.volatility).toBeGreaterThan(0);
      expect(result.sharpeRatio).toBeDefined();
      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty returns', () => {
      const result = calculator.calculateRiskMetrics([]);

      expect(result.volatility).toBe(0);
      expect(result.sharpeRatio).toBe(0);
      expect(result.maxDrawdown).toBe(0);
      expect(result.avgDailyReturn).toBe(0);
    });

    it('should calculate max drawdown correctly', () => {
      // Returns that create a clear drawdown
      const dailyReturns = [5, 3, -4, -3, 2, 1]; // Peak at 8, drop to 1, then recover

      const result = calculator.calculateRiskMetrics(dailyReturns);

      // Peak = 8, lowest after peak = 1, drawdown = 7
      expect(result.maxDrawdown).toBe(7);
    });
  });

  describe('calculateAttribution', () => {
    it('should calculate P&L attribution', () => {
      const positions = [
        {
          id: 'pos-1',
          platform: 'LIMITLESS' as const,
          marketId: 'market-1',
          question: 'Q1',
          outcome: 'YES' as const,
          size: 100,
          costBasis: 50,
          currentValue: 70,
          unrealizedPnl: 20,
          realizedPnl: 0,
          totalPnl: 20,
          returnPct: 40,
        },
        {
          id: 'pos-2',
          platform: 'LIMITLESS' as const,
          marketId: 'market-2',
          question: 'Q2',
          outcome: 'YES' as const,
          size: 100,
          costBasis: 50,
          currentValue: 40,
          unrealizedPnl: -10,
          realizedPnl: 0,
          totalPnl: -10,
          returnPct: -20,
        },
      ];

      const result = calculator.calculateAttribution(positions);

      expect(result.totalPnL).toBe(10);
      expect(result.contributors).toHaveLength(2);

      // pos-1 contributed +20 to total of +10 = 200% contribution
      // pos-2 contributed -10 to total of +10 = -100% contribution
      const pos1Contrib = result.contributors.find(c => c.position.id === 'pos-1');
      expect(pos1Contrib?.contribution).toBeCloseTo(200, 0);
    });

    it('should sort by absolute contribution', () => {
      const positions = [
        {
          id: 'small',
          platform: 'LIMITLESS' as const,
          marketId: 'market-1',
          question: 'Q1',
          outcome: 'YES' as const,
          size: 10,
          costBasis: 5,
          currentValue: 6,
          unrealizedPnl: 1,
          realizedPnl: 0,
          totalPnl: 1,
          returnPct: 20,
        },
        {
          id: 'large',
          platform: 'LIMITLESS' as const,
          marketId: 'market-2',
          question: 'Q2',
          outcome: 'YES' as const,
          size: 100,
          costBasis: 50,
          currentValue: 100,
          unrealizedPnl: 50,
          realizedPnl: 0,
          totalPnl: 50,
          returnPct: 100,
        },
      ];

      const result = calculator.calculateAttribution(positions);

      // Large position should be first due to higher absolute contribution
      expect(result.contributors[0].position.id).toBe('large');
    });
  });
});
