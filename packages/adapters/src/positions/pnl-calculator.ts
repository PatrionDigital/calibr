/**
 * P&L Calculator Service
 * Calculates profit and loss metrics for positions and portfolios
 */

import type {
  AggregatedPosition,
  PositionGroup,
  PortfolioSummary,
} from './aggregator';
import type { TradingPlatform } from '../trading/types';

// =============================================================================
// Types
// =============================================================================

export interface PnLMetrics {
  /** Unrealized P&L (open positions) */
  unrealized: number;
  /** Realized P&L (closed positions) */
  realized: number;
  /** Total P&L */
  total: number;
  /** Return percentage */
  returnPct: number;
  /** Win rate (% of winning positions) */
  winRate: number;
  /** Average win amount */
  averageWin: number;
  /** Average loss amount */
  averageLoss: number;
  /** Best performing position */
  bestPosition?: PositionPnL;
  /** Worst performing position */
  worstPosition?: PositionPnL;
}

export interface PositionPnL {
  /** Position identifier */
  id: string;
  /** Platform */
  platform: TradingPlatform;
  /** Market ID */
  marketId: string;
  /** Market question */
  question: string;
  /** Outcome */
  outcome: 'YES' | 'NO' | number;
  /** Size */
  size: number;
  /** Cost basis */
  costBasis: number;
  /** Current value */
  currentValue: number;
  /** Unrealized P&L */
  unrealizedPnl: number;
  /** Realized P&L */
  realizedPnl: number;
  /** Total P&L */
  totalPnl: number;
  /** Return percentage */
  returnPct: number;
}

export interface PeriodPnL {
  /** Period start */
  startDate: Date;
  /** Period end */
  endDate: Date;
  /** Starting portfolio value */
  startValue: number;
  /** Ending portfolio value */
  endValue: number;
  /** P&L for the period */
  pnl: number;
  /** Return percentage for the period */
  returnPct: number;
  /** Net deposits/withdrawals during period */
  netFlow: number;
}

export interface PnLBreakdown {
  /** Overall metrics */
  overall: PnLMetrics;
  /** Metrics by platform */
  byPlatform: Map<TradingPlatform, PnLMetrics>;
  /** Metrics by market */
  byMarket: Map<string, PnLMetrics>;
  /** Individual position P&Ls sorted by return */
  positions: PositionPnL[];
  /** Top winners */
  topWinners: PositionPnL[];
  /** Top losers */
  topLosers: PositionPnL[];
}

export interface PnLHistoryEntry {
  /** Timestamp */
  timestamp: Date;
  /** Portfolio value at this time */
  portfolioValue: number;
  /** Cumulative realized P&L */
  cumulativeRealizedPnl: number;
  /** Current unrealized P&L */
  unrealizedPnl: number;
  /** Total P&L */
  totalPnl: number;
  /** Number of positions */
  positionCount: number;
}

// =============================================================================
// P&L Calculator
// =============================================================================

export class PnLCalculator {
  /**
   * Calculate P&L metrics from a portfolio summary
   */
  calculateFromPortfolio(portfolio: PortfolioSummary): PnLBreakdown {
    // Calculate position P&Ls
    const positions = this.calculatePositionPnLs(portfolio);

    // Calculate overall metrics
    const overall = this.calculateMetrics(positions);

    // Calculate by platform
    const byPlatform = this.calculateByPlatform(positions, portfolio.byPlatform);

    // Calculate by market
    const byMarket = this.calculateByMarket(positions, portfolio.byMarket);

    // Sort positions by return
    const sortedPositions = [...positions].sort((a, b) => b.returnPct - a.returnPct);

    // Top winners and losers
    const topWinners = sortedPositions.filter(p => p.totalPnl > 0).slice(0, 5);
    const topLosers = sortedPositions.filter(p => p.totalPnl < 0).slice(-5).reverse();

    return {
      overall,
      byPlatform,
      byMarket,
      positions: sortedPositions,
      topWinners,
      topLosers,
    };
  }

  /**
   * Calculate P&L for individual positions
   */
  calculatePositionPnLs(portfolio: PortfolioSummary): PositionPnL[] {
    const positions: PositionPnL[] = [];

    for (const group of portfolio.byMarket) {
      for (const pos of group.positions) {
        const totalPnl = pos.unrealizedPnl + pos.realizedPnl;
        const returnPct = pos.costBasis > 0
          ? (totalPnl / pos.costBasis) * 100
          : 0;

        positions.push({
          id: pos.id,
          platform: pos.platform,
          marketId: pos.marketId,
          question: pos.question,
          outcome: pos.outcome,
          size: pos.size,
          costBasis: pos.costBasis,
          currentValue: pos.marketValue,
          unrealizedPnl: pos.unrealizedPnl,
          realizedPnl: pos.realizedPnl,
          totalPnl,
          returnPct,
        });
      }
    }

    return positions;
  }

  /**
   * Calculate aggregate metrics from position P&Ls
   */
  calculateMetrics(positions: PositionPnL[]): PnLMetrics {
    if (positions.length === 0) {
      return {
        unrealized: 0,
        realized: 0,
        total: 0,
        returnPct: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
      };
    }

    let unrealized = 0;
    let realized = 0;
    let totalCostBasis = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let bestPosition: PositionPnL | undefined;
    let worstPosition: PositionPnL | undefined;

    for (const pos of positions) {
      unrealized += pos.unrealizedPnl;
      realized += pos.realizedPnl;
      totalCostBasis += pos.costBasis;

      if (pos.totalPnl > 0) {
        winCount++;
        totalWins += pos.totalPnl;
        if (!bestPosition || pos.returnPct > bestPosition.returnPct) {
          bestPosition = pos;
        }
      } else if (pos.totalPnl < 0) {
        lossCount++;
        totalLosses += Math.abs(pos.totalPnl);
        if (!worstPosition || pos.returnPct < worstPosition.returnPct) {
          worstPosition = pos;
        }
      }
    }

    const total = unrealized + realized;
    const returnPct = totalCostBasis > 0 ? (total / totalCostBasis) * 100 : 0;
    const totalPositions = winCount + lossCount;
    const winRate = totalPositions > 0 ? (winCount / totalPositions) * 100 : 0;
    const averageWin = winCount > 0 ? totalWins / winCount : 0;
    const averageLoss = lossCount > 0 ? totalLosses / lossCount : 0;

    return {
      unrealized,
      realized,
      total,
      returnPct,
      winRate,
      averageWin,
      averageLoss,
      bestPosition,
      worstPosition,
    };
  }

  /**
   * Calculate P&L metrics by platform
   */
  private calculateByPlatform(
    positions: PositionPnL[],
    byPlatform: Map<TradingPlatform, AggregatedPosition[]>
  ): Map<TradingPlatform, PnLMetrics> {
    const result = new Map<TradingPlatform, PnLMetrics>();

    for (const [platform] of byPlatform) {
      const platformPositions = positions.filter(p => p.platform === platform);
      result.set(platform, this.calculateMetrics(platformPositions));
    }

    return result;
  }

  /**
   * Calculate P&L metrics by market
   */
  private calculateByMarket(
    positions: PositionPnL[],
    byMarket: PositionGroup[]
  ): Map<string, PnLMetrics> {
    const result = new Map<string, PnLMetrics>();

    for (const group of byMarket) {
      const marketPositions = positions.filter(p =>
        group.positions.some(gp => gp.id === p.id)
      );
      result.set(group.unifiedMarketId, this.calculateMetrics(marketPositions));
    }

    return result;
  }

  /**
   * Calculate period-over-period P&L
   */
  calculatePeriodPnL(
    current: PortfolioSummary,
    previous: PortfolioSummary,
    netFlow: number = 0
  ): PeriodPnL {
    const startValue = previous.totalMarketValue;
    const endValue = current.totalMarketValue;
    const pnl = (endValue - startValue) - netFlow;
    const returnPct = startValue > 0 ? (pnl / startValue) * 100 : 0;

    return {
      startDate: previous.updatedAt,
      endDate: current.updatedAt,
      startValue,
      endValue,
      pnl,
      returnPct,
      netFlow,
    };
  }

  /**
   * Generate daily P&L from history entries
   */
  generateDailyPnL(history: PnLHistoryEntry[]): PeriodPnL[] {
    if (history.length < 2) return [];

    const daily: PeriodPnL[] = [];
    const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      daily.push({
        startDate: prev.timestamp,
        endDate: curr.timestamp,
        startValue: prev.portfolioValue,
        endValue: curr.portfolioValue,
        pnl: curr.totalPnl - prev.totalPnl,
        returnPct: prev.portfolioValue > 0
          ? ((curr.portfolioValue - prev.portfolioValue) / prev.portfolioValue) * 100
          : 0,
        netFlow: 0, // Would need deposit/withdrawal tracking
      });
    }

    return daily;
  }

  /**
   * Calculate Sharpe-like ratio for the portfolio
   * Uses simplified calculation without risk-free rate
   */
  calculateRiskMetrics(dailyReturns: number[]): {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgDailyReturn: number;
  } {
    if (dailyReturns.length < 2) {
      return {
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        avgDailyReturn: 0,
      };
    }

    // Average daily return
    const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;

    // Standard deviation (volatility)
    const squaredDiffs = dailyReturns.map(r => Math.pow(r - avgDailyReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const volatility = Math.sqrt(variance);

    // Annualized Sharpe ratio (simplified, no risk-free rate)
    const annualizedReturn = avgDailyReturn * 252;
    const annualizedVol = volatility * Math.sqrt(252);
    const sharpeRatio = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;

    // Maximum drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeReturn = 0;

    for (const ret of dailyReturns) {
      cumulativeReturn += ret;
      if (cumulativeReturn > peak) {
        peak = cumulativeReturn;
      }
      const drawdown = peak - cumulativeReturn;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      volatility,
      sharpeRatio,
      maxDrawdown,
      avgDailyReturn,
    };
  }

  /**
   * Calculate P&L attribution (which positions contributed most)
   */
  calculateAttribution(positions: PositionPnL[]): {
    contributors: Array<{ position: PositionPnL; contribution: number }>;
    totalPnL: number;
  } {
    const totalPnL = positions.reduce((sum, p) => sum + p.totalPnl, 0);

    const contributors = positions.map(pos => ({
      position: pos,
      contribution: totalPnL !== 0 ? (pos.totalPnl / Math.abs(totalPnL)) * 100 : 0,
    }));

    // Sort by absolute contribution
    contributors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return { contributors, totalPnL };
  }
}

// Export singleton
export const pnlCalculator = new PnLCalculator();
