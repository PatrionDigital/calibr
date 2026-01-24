/**
 * Predict.fun Platform Adapter
 * Blast L2 prediction market
 */

// Main adapter
export { PredictFunAdapter } from './adapter';
export type { PredictFunAdapterConfig } from './adapter';

// Contract client
export { PredictFunClient, predictFunClient } from './client';
export type { PredictFunClientConfig } from './client';

// Contract definitions
export {
  PREDICTFUN_CONTRACTS,
  BLAST_CHAIN_ID,
  BLAST_RPC_URL,
  CTF_EXCHANGE_ABI,
  CONDITIONAL_TOKENS_ABI,
} from './contracts';
export type { PredictFunMarket, PredictFunOutcome, PredictFunOrder } from './contracts';
