/**
 * Limitless Platform Adapter
 * Exports all Limitless-related functionality
 */

// Main adapter
export { LimitlessAdapter } from './adapter';
export type { LimitlessAdapterConfig } from './adapter';

// API client
export {
  LimitlessClient,
  LimitlessMarketSchema,
  LimitlessGroupSchema,
  LimitlessOrderBookSchema,
  limitlessClient,
} from './api-client';
export type {
  LimitlessClientConfig,
  LimitlessMarket,
  LimitlessGroup,
  LimitlessOutcome,
  LimitlessVenue,
  LimitlessOrderBook,
  LimitlessCategoryCount,
} from './api-client';
