/**
 * Polymarket Platform Adapter
 * Exports all Polymarket-related functionality
 */

// Main adapter
export { PolymarketAdapter } from './adapter';
export type { PolymarketAdapterConfig } from './adapter';

// Gamma API client
export { GammaClient, GammaMarketSchema, GammaEventSchema } from './gamma-client';
export type { GammaClientConfig, GammaMarket, GammaEvent } from './gamma-client';

// CLOB client
export { PolymarketClobClient } from './clob-client';
export type { ClobClientConfig, TokenPrice, MarketPrices } from './clob-client';
