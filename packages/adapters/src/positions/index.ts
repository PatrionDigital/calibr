/**
 * Position Management Module
 * Aggregation and tracking of positions across platforms
 */

export {
  PositionAggregator,
  positionAggregator,
  type AggregatedPosition,
  type PositionGroup,
  type PortfolioSummary,
  type AggregatorConfig,
} from './aggregator';

export {
  PnLCalculator,
  pnlCalculator,
  type PnLMetrics,
  type PositionPnL,
  type PeriodPnL,
  type PnLBreakdown,
  type PnLHistoryEntry,
} from './pnl-calculator';

export {
  PositionHistoryTracker,
  positionHistoryTracker,
  type PositionSnapshot,
  type PositionChange,
  type PortfolioSnapshot,
  type HistoryQuery,
  type HistoryStats,
} from './history-tracker';
