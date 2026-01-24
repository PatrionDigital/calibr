/**
 * Opinion (O.LAB) Platform Adapter
 * Exports all Opinion-related functionality
 */

// Main adapter
export { OpinionAdapter } from './adapter';
export type { OpinionAdapterConfig } from './adapter';

// API client
export {
  OpinionClient,
  OpinionMarketSchema,
  OpinionOutcomeSchema,
  OpinionOrderBookSchema,
  OpinionPriceSchema,
  opinionClient,
} from './api-client';
export type {
  OpinionClientConfig,
  OpinionMarket,
  OpinionOutcome,
  OpinionPrice,
  OpinionOrderBook,
  OpinionQuoteToken,
} from './api-client';
