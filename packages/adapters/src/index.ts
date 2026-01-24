/**
 * @calibr/adapters - Platform integrations for prediction markets
 */

// Types
export * from './types';

// Polymarket adapter (data fetching)
export * from './polymarket';

// Limitless adapter (data fetching)
export * from './limitless';

// Opinion adapter (data fetching)
export * from './opinion';

// Predict.fun adapter (Blast L2)
export * from './predictfun';

// Manifold adapter (play money)
export * from './manifold';

// Trading module (order execution)
export * from './trading';

// Sync services
export * from './sync';

// Market matching
export * from './matching';

// Cache
export * from './cache';

// Price feeds
export * from './feeds';

// Resolution detection
export * from './resolution';

// On-chain utilities
export * from './onchain';

// Identity verification
export * from './identity';

// Position aggregation
export * from './positions';
