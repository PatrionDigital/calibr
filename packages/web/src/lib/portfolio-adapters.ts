'use client';

import type { PortfolioPosition, PortfolioSummary as APIPortfolioSummary } from './api';
import type { Position, PositionFilter } from '@/components/portfolio/position-table';
import type { ExposureItem } from '@/components/portfolio/exposure-breakdown';
import type { ChainBalance, PendingBridge } from '@/components/portfolio/portfolio-summary';

/**
 * Transform API PortfolioPosition to component Position
 */
export function toPosition(apiPosition: PortfolioPosition): Position {
  return {
    id: apiPosition.id,
    marketQuestion: apiPosition.marketQuestion,
    outcome: apiPosition.outcome,
    shares: apiPosition.shares,
    currentValue: apiPosition.currentValue,
    pnl: apiPosition.unrealizedPnl,
    pnlPercent: apiPosition.unrealizedPnlPct,
    platform: apiPosition.platform.toUpperCase(),
    category: getCategoryFromMarket(apiPosition.marketQuestion),
  };
}

/**
 * Transform array of API positions to component positions
 */
export function toPositions(apiPositions: PortfolioPosition[]): Position[] {
  return apiPositions.map(toPosition);
}

/**
 * Derive category from market question (simple heuristic)
 */
export function getCategoryFromMarket(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('trump') || q.includes('biden') || q.includes('election') || q.includes('president')) {
    return 'POLITICS';
  }
  if (q.includes('btc') || q.includes('eth') || q.includes('crypto') || q.includes('bitcoin')) {
    return 'CRYPTO';
  }
  // Check economics before sports to avoid "inflation" matching "nfl"
  if (q.includes('fed ') || q.includes('gdp') || q.includes('inflation') || q.includes('interest rate')) {
    return 'ECONOMICS';
  }
  if (/\bnfl\b/.test(q) || q.includes('nba') || q.includes('super bowl') || q.includes('world cup')) {
    return 'SPORTS';
  }
  return 'OTHER';
}

/**
 * Transform API byPlatform data to ExposureItem array
 */
export function toExposureByPlatform(
  byPlatform: Record<string, { value: number; cost: number; count: number }>,
  totalValue: number
): ExposureItem[] {
  return Object.entries(byPlatform).map(([name, data]) => ({
    name: name.toUpperCase(),
    value: data.value,
    percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
  }));
}

/**
 * Calculate exposure by category from positions
 */
export function calculateExposureByCategory(positions: PortfolioPosition[]): ExposureItem[] {
  const categoryMap = new Map<string, number>();
  let totalValue = 0;

  positions.forEach((pos) => {
    const category = getCategoryFromMarket(pos.marketQuestion);
    categoryMap.set(category, (categoryMap.get(category) || 0) + pos.currentValue);
    totalValue += pos.currentValue;
  });

  return Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
    percent: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
  }));
}

/**
 * Calculate exposure by outcome (YES/NO) from positions
 */
export function calculateExposureByOutcome(positions: PortfolioPosition[]): ExposureItem[] {
  const outcomeMap = new Map<string, number>();
  let totalValue = 0;

  positions.forEach((pos) => {
    const outcome = pos.outcome.toUpperCase();
    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + pos.currentValue);
    totalValue += pos.currentValue;
  });

  return Array.from(outcomeMap.entries()).map(([name, value]) => ({
    name,
    value,
    percent: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
  }));
}

/**
 * Transform API portfolio summary to component props
 * Note: chainBalances and pendingBridges require wallet connection,
 * periodPnl requires historical data - these are set to defaults here
 */
export function toPortfolioSummaryProps(
  apiSummary: APIPortfolioSummary,
  chainBalances: ChainBalance[] = [],
  pendingBridges: PendingBridge[] = []
) {
  // Default period P&L (would need historical data from API)
  const periodPnl = {
    '24h': 0,
    '7d': 0,
    '30d': apiSummary.unrealizedPnl, // Use total as 30d approximation
  };

  return {
    totalValue: apiSummary.totalValue,
    totalPnl: apiSummary.unrealizedPnl,
    totalPnlPercent: apiSummary.unrealizedPnlPct,
    chainBalances,
    pendingBridges,
    periodPnl,
  };
}

/**
 * Filter and sort positions based on criteria
 */
export function filterPositions(
  positions: Position[],
  filter?: PositionFilter,
  sortKey?: string,
  sortDirection?: 'asc' | 'desc'
): Position[] {
  let result = [...positions];

  // Apply filter
  if (filter) {
    if (filter.platform) {
      result = result.filter((p) => p.platform === filter.platform);
    }
    if (filter.category) {
      result = result.filter((p) => p.category === filter.category);
    }
  }

  // Apply sort
  if (sortKey) {
    const direction = sortDirection === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      switch (sortKey) {
        case 'value':
          return (a.currentValue - b.currentValue) * direction;
        case 'pnl':
          return (a.pnl - b.pnl) * direction;
        case 'shares':
          return (a.shares - b.shares) * direction;
        default:
          return 0;
      }
    });
  }

  return result;
}
