/**
 * Market Matching Services
 * Cross-platform market comparison and arbitrage detection
 */

export {
  MarketMatcher,
  groupByPlatform,
  findBestPrice,
  calculateAggregateLiquidity,
} from './market-matcher';

export type {
  MatchConfig,
  MarketMatch,
  MatchResult,
  ArbitrageOpportunity,
} from './market-matcher';
