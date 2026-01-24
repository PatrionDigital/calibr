/**
 * Manifold Markets Platform Adapter
 * Play-money prediction market
 */

// Main adapter
export { ManifoldAdapter } from './adapter';
export type { ManifoldAdapterConfig } from './adapter';

// API client
export {
  ManifoldClient,
  ManifoldMarketSchema,
  ManifoldAnswerSchema,
  ManifoldBetSchema,
  ManifoldUserSchema,
  manifoldClient,
} from './api-client';
export type {
  ManifoldClientConfig,
  ManifoldMarket,
  ManifoldAnswer,
  ManifoldBet,
  ManifoldUser,
} from './api-client';
