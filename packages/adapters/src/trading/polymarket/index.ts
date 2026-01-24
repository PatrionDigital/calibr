/**
 * Polymarket Trading Module
 * Exports all Polymarket trading functionality
 */

export * from './config';
export * from './auth';
export * from './safe';
export * from './orders';
export * from './adapter';

// Re-export the adapter factory for convenience
export { createPolymarketAdapter } from './adapter';
