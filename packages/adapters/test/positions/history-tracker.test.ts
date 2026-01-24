/**
 * Position History Tracker Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PositionHistoryTracker } from '../../src/positions/history-tracker';
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

describe('PositionHistoryTracker', () => {
  let tracker: PositionHistoryTracker;

  beforeEach(() => {
    tracker = new PositionHistoryTracker();
  });

  describe('recordSnapshot', () => {
    it('should record a portfolio snapshot', () => {
      const portfolio = createMockPortfolio([
        { id: 'pos-1', size: 100, marketValue: 60, unrealizedPnl: 10 },
      ]);

      const snapshot = tracker.recordSnapshot(portfolio);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.totalValue).toBe(60);
      expect(snapshot.positionCount).toBe(1);
      expect(snapshot.positions).toHaveLength(1);
    });

    it('should detect new position as OPEN change', () => {
      const portfolio = createMockPortfolio([
        { id: 'pos-1', size: 100, currentPrice: 0.6 },
      ]);

      tracker.recordSnapshot(portfolio);
      const changes = tracker.getChanges();

      expect(changes).toHaveLength(1);
      expect(changes[0].changeType).toBe('OPEN');
      expect(changes[0].previousSize).toBe(0);
      expect(changes[0].newSize).toBe(100);
    });

    it('should detect position increase', () => {
      // Initial position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
      ]));

      // Increased position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 150 },
      ]));

      const changes = tracker.getChanges();

      expect(changes).toHaveLength(2); // OPEN + INCREASE
      expect(changes[1].changeType).toBe('INCREASE');
      expect(changes[1].sizeDelta).toBe(50);
    });

    it('should detect position decrease', () => {
      // Initial position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
      ]));

      // Decreased position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 60 },
      ]));

      const changes = tracker.getChanges();

      expect(changes).toHaveLength(2); // OPEN + DECREASE
      expect(changes[1].changeType).toBe('DECREASE');
      expect(changes[1].sizeDelta).toBe(-40);
    });

    it('should detect position close', () => {
      // Initial position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
      ]));

      // Position closed (no longer in portfolio)
      tracker.recordSnapshot(createMockPortfolio([]));

      const changes = tracker.getChanges();

      expect(changes).toHaveLength(2); // OPEN + CLOSE
      expect(changes[1].changeType).toBe('CLOSE');
      expect(changes[1].newSize).toBe(0);
    });

    it('should detect price update without size change', () => {
      // Initial position
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100, currentPrice: 0.5 },
      ]));

      // Price changed, size same
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100, currentPrice: 0.65 },
      ]));

      const changes = tracker.getChanges();

      expect(changes).toHaveLength(2); // OPEN + PRICE_UPDATE
      expect(changes[1].changeType).toBe('PRICE_UPDATE');
      expect(changes[1].sizeDelta).toBe(0);
    });
  });

  describe('getSnapshots', () => {
    it('should return all snapshots', () => {
      tracker.recordSnapshot(createMockPortfolio([{ id: 'pos-1' }]));
      tracker.recordSnapshot(createMockPortfolio([{ id: 'pos-1' }]));
      tracker.recordSnapshot(createMockPortfolio([{ id: 'pos-1' }]));

      const snapshots = tracker.getSnapshots();
      expect(snapshots).toHaveLength(3);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      tracker.recordSnapshot(createMockPortfolio([{ id: 'pos-1' }]));

      const snapshots = tracker.getSnapshots({
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(snapshots).toHaveLength(1);

      const noSnapshots = tracker.getSnapshots({
        endDate: yesterday,
      });

      expect(noSnapshots).toHaveLength(0);
    });

    it('should support pagination', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordSnapshot(createMockPortfolio([{ id: `pos-${i}` }]));
      }

      const page1 = tracker.getSnapshots({ limit: 3, offset: 0 });
      const page2 = tracker.getSnapshots({ limit: 3, offset: 3 });

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
    });
  });

  describe('getChanges', () => {
    it('should filter by change type', () => {
      // Create various changes
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 150 }, // INCREASE
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 }, // DECREASE
      ]));

      const increases = tracker.getChanges({ changeTypes: ['INCREASE'] });
      expect(increases).toHaveLength(1);
      expect(increases[0].changeType).toBe('INCREASE');

      const decreases = tracker.getChanges({ changeTypes: ['DECREASE'] });
      expect(decreases).toHaveLength(1);
      expect(decreases[0].changeType).toBe('DECREASE');
    });

    it('should filter by position ID', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
        { id: 'pos-2', size: 50 },
      ]));

      const pos1Changes = tracker.getChanges({ positionId: 'pos-1' });
      expect(pos1Changes).toHaveLength(1);
      expect(pos1Changes[0].positionId).toBe('pos-1');
    });
  });

  describe('getPnLHistory', () => {
    it('should return P&L history entries', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', marketValue: 100, unrealizedPnl: 0, realizedPnl: 0 },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', marketValue: 120, unrealizedPnl: 20, realizedPnl: 0 },
      ]));

      const history = tracker.getPnLHistory();

      expect(history).toHaveLength(2);
      expect(history[0].portfolioValue).toBe(100);
      expect(history[1].portfolioValue).toBe(120);
      expect(history[1].totalPnl).toBe(20);
    });
  });

  describe('getPositionHistory', () => {
    it('should return history for a specific position', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
        { id: 'pos-2', size: 50 },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 150 },
        { id: 'pos-2', size: 50 },
      ]));

      const history = tracker.getPositionHistory('pos-1');

      expect(history).toHaveLength(2);
      expect(history[0].position.size).toBe(100);
      expect(history[1].position.size).toBe(150);
    });
  });

  describe('getPositionTimeline', () => {
    it('should return timeline data for charting', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100, currentPrice: 0.5, marketValue: 50, unrealizedPnl: 0 },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100, currentPrice: 0.7, marketValue: 70, unrealizedPnl: 20 },
      ]));

      const timeline = tracker.getPositionTimeline('pos-1');

      expect(timeline).toHaveLength(2);
      expect(timeline[0].price).toBe(0.5);
      expect(timeline[1].price).toBe(0.7);
      expect(timeline[1].unrealizedPnl).toBe(20);
    });
  });

  describe('getStats', () => {
    it('should return history statistics', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', marketId: 'market-1' },
        { id: 'pos-2', marketId: 'market-2' },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', marketId: 'market-1' },
        { id: 'pos-3', marketId: 'market-3' },
      ]));

      const stats = tracker.getStats();

      expect(stats.totalSnapshots).toBe(2);
      expect(stats.uniquePositions).toBe(3); // pos-1, pos-2, pos-3
      expect(stats.uniqueMarkets).toBe(3); // market-1, market-2, market-3
      expect(stats.dateRange).not.toBeNull();
    });
  });

  describe('export/import', () => {
    it('should export and import history', () => {
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 100 },
      ]));
      tracker.recordSnapshot(createMockPortfolio([
        { id: 'pos-1', size: 150 },
      ]));

      const exported = tracker.export();
      expect(exported.snapshots).toHaveLength(2);
      expect(exported.changes).toHaveLength(2);

      // Create new tracker and import
      const newTracker = new PositionHistoryTracker();
      newTracker.import(exported);

      expect(newTracker.getSnapshots()).toHaveLength(2);
      expect(newTracker.getChanges()).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      tracker.recordSnapshot(createMockPortfolio([{ id: 'pos-1' }]));
      expect(tracker.getSnapshots()).toHaveLength(1);

      tracker.clear();

      expect(tracker.getSnapshots()).toHaveLength(0);
      expect(tracker.getChanges()).toHaveLength(0);
    });
  });
});
