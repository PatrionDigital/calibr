/**
 * Trading Module
 * Platform-agnostic trading infrastructure with adapter pattern
 */

// Core types and interfaces
export * from './types';

// Base adapter class
export { BaseTradingAdapter } from './base';

// Adapter registry
export {
  tradingAdapterRegistry,
  getTradingAdapter,
  registerTradingAdapter,
} from './registry';

// Polymarket adapter
export * from './polymarket';

// Limitless adapter
export * from './limitless';

// Execution services
export * from './execution';

// Register adapters on import
import { registerTradingAdapter } from './registry';
import { createPolymarketAdapter } from './polymarket';
import { createLimitlessAdapter } from './limitless';

registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
registerTradingAdapter('LIMITLESS', createLimitlessAdapter);
