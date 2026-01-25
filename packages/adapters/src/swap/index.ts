/**
 * Swap Module
 * Token swap infrastructure for Base (Aerodrome DEX)
 */

// Types
export type {
  SwapConfig,
  SwapQuoteRequest,
  SwapQuote,
  SwapRequest,
  SwapResult,
  ApprovalRequest,
  ApprovalResult,
  AerodromeRoute,
  TokenAddresses,
  ISwapService,
} from './types';

// Constants
export {
  BASE_CHAIN_ID,
  BASE_TOKENS,
  AERODROME_ADDRESSES,
  DEFAULT_SWAP_CONFIG,
} from './types';

// ABIs (Note: ERC20_ABI is not exported here as it's already exported from trading/limitless)
export {
  AERODROME_ROUTER_ABI,
  AERODROME_POOL_ABI,
} from './abi';

// Service
export {
  AerodromeSwapService,
  createSwapService,
} from './aerodrome-service';
