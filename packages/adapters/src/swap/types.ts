/**
 * Token Swap Types
 * Types for DEX swap operations on Base (Aerodrome)
 */

// =============================================================================
// Aerodrome-specific Types
// =============================================================================

/**
 * Aerodrome Route struct for swap paths
 * Matches the on-chain Route struct in Router.sol
 */
export interface AerodromeRoute {
  /** Source token address */
  from: `0x${string}`;
  /** Destination token address */
  to: `0x${string}`;
  /** Whether this is a stable pair (true) or volatile pair (false) */
  stable: boolean;
  /** Factory address for this pool */
  factory: `0x${string}`;
}

// =============================================================================
// Swap Configuration
// =============================================================================

export interface SwapConfig {
  /** Aerodrome Router address */
  routerAddress: `0x${string}`;
  /** Default factory address */
  factoryAddress: `0x${string}`;
  /** RPC URL for Base */
  rpcUrl: string;
  /** Default slippage tolerance (0.01 = 1%) */
  defaultSlippage: number;
  /** Default deadline offset in seconds */
  defaultDeadlineOffset: number;
}

// =============================================================================
// Token Addresses
// =============================================================================

export interface TokenAddresses {
  /** USDC on Base */
  USDC: `0x${string}`;
  /** WETH on Base */
  WETH: `0x${string}`;
  /** $CALIBR token address (to be deployed) */
  CALIBR: `0x${string}`;
}

// =============================================================================
// Swap Request/Response Types
// =============================================================================

export interface SwapQuoteRequest {
  /** Token to swap from */
  tokenIn: `0x${string}`;
  /** Token to swap to */
  tokenOut: `0x${string}`;
  /** Amount of tokenIn (in wei) */
  amountIn: bigint;
  /** Whether to use stable pools if available */
  preferStable?: boolean;
}

export interface SwapQuote {
  /** Input token address */
  tokenIn: `0x${string}`;
  /** Output token address */
  tokenOut: `0x${string}`;
  /** Amount of input token (in wei) */
  amountIn: bigint;
  /** Expected output amount (in wei) */
  amountOut: bigint;
  /** Minimum output with slippage (in wei) */
  amountOutMin: bigint;
  /** Slippage tolerance used */
  slippage: number;
  /** Routes for the swap */
  routes: AerodromeRoute[];
  /** Price impact percentage */
  priceImpact: number;
  /** Quote timestamp */
  timestamp: Date;
  /** Quote valid until */
  validUntil: Date;
}

export interface SwapRequest {
  /** Quote to execute */
  quote: SwapQuote;
  /** Recipient address (defaults to sender) */
  recipient?: `0x${string}`;
  /** Custom deadline timestamp */
  deadline?: number;
}

export interface SwapResult {
  /** Whether the swap was successful */
  success: boolean;
  /** Transaction hash */
  txHash: `0x${string}`;
  /** Actual amount received */
  amountOut: bigint;
  /** Gas used */
  gasUsed: bigint;
  /** Effective price */
  effectivePrice: number;
  /** Block number */
  blockNumber: bigint;
}

// =============================================================================
// Approval Types
// =============================================================================

export interface ApprovalRequest {
  /** Token to approve */
  token: `0x${string}`;
  /** Spender address (router) */
  spender: `0x${string}`;
  /** Amount to approve (use maxUint256 for unlimited) */
  amount: bigint;
}

export interface ApprovalResult {
  /** Whether approval was successful */
  success: boolean;
  /** Transaction hash */
  txHash: `0x${string}`;
  /** Current allowance after approval */
  allowance: bigint;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface ISwapService {
  /**
   * Get a quote for a token swap
   */
  getQuote(request: SwapQuoteRequest, slippage?: number): Promise<SwapQuote>;

  /**
   * Execute a token swap
   */
  executeSwap(request: SwapRequest): Promise<SwapResult>;

  /**
   * Check if approval is needed for a token
   */
  checkApproval(token: `0x${string}`, owner: `0x${string}`, amount: bigint): Promise<boolean>;

  /**
   * Approve token spending
   */
  approve(request: ApprovalRequest): Promise<ApprovalResult>;

  /**
   * Get token balance
   */
  getBalance(token: `0x${string}`, address: `0x${string}`): Promise<bigint>;

  /**
   * Swap $CALIBR to USDC (convenience method)
   */
  swapCalibrToUsdc(amountIn: bigint, slippage?: number): Promise<SwapQuote>;
}

// =============================================================================
// Constants
// =============================================================================

export const BASE_CHAIN_ID = 8453;

export const BASE_TOKENS: TokenAddresses = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006',
  CALIBR: '0x0000000000000000000000000000000000000000', // To be set after deployment
};

export const AERODROME_ADDRESSES = {
  ROUTER: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as `0x${string}`,
  FACTORY: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as `0x${string}`,
  SLIPSTREAM_ROUTER: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5' as `0x${string}`,
};

export const DEFAULT_SWAP_CONFIG: SwapConfig = {
  routerAddress: AERODROME_ADDRESSES.ROUTER,
  factoryAddress: AERODROME_ADDRESSES.FACTORY,
  rpcUrl: 'https://mainnet.base.org',
  defaultSlippage: 0.005, // 0.5%
  defaultDeadlineOffset: 1200, // 20 minutes
};
