/**
 * Limitless Trading Configuration
 * Chain and contract configuration for Limitless Exchange on Base
 */

export interface LimitlessTradingConfig {
  chainId: number;
  rpcUrl: string;
  apiUrl: string;
  wsUrl?: string;
  domainName: string;
  domainVersion: string;
  // Contract addresses
  ctfContract: `0x${string}`;      // Gnosis Conditional Tokens Framework
  ctfExchange: `0x${string}`;      // Limitless CTF Exchange
  usdc: `0x${string}`;             // USDC collateral token
}

// =============================================================================
// Contract Addresses
// =============================================================================

/**
 * Limitless CTF (Conditional Tokens Framework) contract on Base
 * Note: This is Limitless's own CTF deployment, not the standard Gnosis one
 */
export const CTF_CONTRACT = '0xC9c98965297Bc527861c898329Ee280632B76e18' as const;

/**
 * Standard Gnosis CTF contract (for reference, not used by Limitless)
 */
export const GNOSIS_CTF_CONTRACT = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045' as const;

/**
 * Limitless CTF Exchange contract on Base
 */
export const LIMITLESS_CTF_EXCHANGE = '0x05c748E2f4DcDe0ec9Fa8DDc40DE6b867f923fa5' as const;

/**
 * USDC contract on Base
 */
export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

/**
 * Base Mainnet configuration for Limitless
 */
export const BASE_MAINNET_CONFIG: LimitlessTradingConfig = {
  chainId: 8453,
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  apiUrl: 'https://api.limitless.exchange',
  wsUrl: 'wss://api.limitless.exchange/ws',
  domainName: 'Limitless CTF Exchange',
  domainVersion: '1',
  ctfContract: CTF_CONTRACT,
  ctfExchange: LIMITLESS_CTF_EXCHANGE,
  usdc: BASE_USDC,
};

/**
 * Base Sepolia testnet configuration
 */
export const BASE_SEPOLIA_CONFIG: LimitlessTradingConfig = {
  chainId: 84532,
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  apiUrl: 'https://api-testnet.limitless.exchange',
  wsUrl: 'wss://api-testnet.limitless.exchange/ws',
  domainName: 'Limitless CTF Exchange',
  domainVersion: '1',
  ctfContract: CTF_CONTRACT,
  ctfExchange: LIMITLESS_CTF_EXCHANGE,
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, // Base Sepolia USDC
};

/**
 * EIP-712 TypedData types for Limitless orders
 */
export const LIMITLESS_ORDER_TYPES = {
  Order: [
    { name: 'maker', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'signatureType', type: 'uint8' },
  ],
} as const;

/**
 * Order side enum for EIP-712
 */
export enum LimitlessOrderSide {
  BUY = 0,
  SELL = 1,
}

/**
 * Signature type enum
 */
export enum LimitlessSignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

// =============================================================================
// Contract ABIs
// =============================================================================

/**
 * Gnosis Conditional Tokens (CTF) ABI - Split, Merge, Redeem functions
 */
export const CTF_ABI = [
  // Split collateral into outcome tokens
  {
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'parentCollectionId', type: 'bytes32' },
      { name: 'conditionId', type: 'bytes32' },
      { name: 'partition', type: 'uint256[]' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'splitPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Merge outcome tokens back to collateral
  {
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'parentCollectionId', type: 'bytes32' },
      { name: 'conditionId', type: 'bytes32' },
      { name: 'partition', type: 'uint256[]' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mergePositions',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Redeem winning tokens after resolution
  {
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'parentCollectionId', type: 'bytes32' },
      { name: 'conditionId', type: 'bytes32' },
      { name: 'indexSets', type: 'uint256[]' },
    ],
    name: 'redeemPositions',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Get payout for a condition
  {
    inputs: [{ name: 'conditionId', type: 'bytes32' }],
    name: 'payoutNumerators',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get balance of position
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Batch balance check
  {
    inputs: [
      { name: 'accounts', type: 'address[]' },
      { name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Set approval for all
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Check if approved
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'stakeholder', type: 'address' },
      { indexed: false, name: 'collateralToken', type: 'address' },
      { indexed: true, name: 'parentCollectionId', type: 'bytes32' },
      { indexed: true, name: 'conditionId', type: 'bytes32' },
      { indexed: false, name: 'partition', type: 'uint256[]' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'PositionSplit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'stakeholder', type: 'address' },
      { indexed: false, name: 'collateralToken', type: 'address' },
      { indexed: true, name: 'parentCollectionId', type: 'bytes32' },
      { indexed: true, name: 'conditionId', type: 'bytes32' },
      { indexed: false, name: 'partition', type: 'uint256[]' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'PositionsMerge',
    type: 'event',
  },
] as const;

/**
 * Fixed Product Market Maker (FPMM) ABI - Buy/Sell for AMM markets
 */
export const FPMM_ABI = [
  // Buy outcome tokens
  {
    inputs: [
      { name: 'investmentAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
      { name: 'minOutcomeTokensToBuy', type: 'uint256' },
    ],
    name: 'buy',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Sell outcome tokens
  {
    inputs: [
      { name: 'returnAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
      { name: 'maxOutcomeTokensToSell', type: 'uint256' },
    ],
    name: 'sell',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Calculate buy amount
  {
    inputs: [
      { name: 'investmentAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
    ],
    name: 'calcBuyAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Calculate sell amount (tokens needed for target return)
  {
    inputs: [
      { name: 'returnAmount', type: 'uint256' },
      { name: 'outcomeIndex', type: 'uint256' },
    ],
    name: 'calcSellAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get collateral token
  {
    inputs: [],
    name: 'collateralToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get conditional tokens contract
  {
    inputs: [],
    name: 'conditionalTokens',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get condition ID
  {
    inputs: [],
    name: 'conditionId',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Get fee
  {
    inputs: [],
    name: 'fee',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * ERC20 ABI for collateral token approvals
 */
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
