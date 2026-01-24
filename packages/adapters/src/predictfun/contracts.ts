/**
 * Predict.fun Contract Definitions
 * Blast L2 prediction market using Polymarket CTF protocol
 */

// =============================================================================
// Contract Addresses (Blast Mainnet)
// =============================================================================

export const PREDICTFUN_CONTRACTS = {
  // Core CTF contracts
  conditionalTokens: '0x8F9C9f888A4268Ab0E2DDa03A291769479bAc285',
  ctfExchange: '0x739f0331594029064C252559436eDce0E468E37a',
  negRiskCtfExchange: '0x6a3796C21e733a3016Bc0bA41edF763016247e72',
  negRiskAdapter: '0xc55687812285D05b74815EE2716D046fAF61B003',
  umaCtfAdapter: '0x0C1331E4a4bBD59B7aae2902290506bf8fbE3e6c',
  umaCtfAdapterNegRisk: '0xB0c308abeC5d321A7B6a8E3ce43A368276178F7A',

  // Collateral
  usdb: '0x4300000000000000000000000000000000000003',
} as const;

export const BLAST_CHAIN_ID = 81457;
export const BLAST_RPC_URL = 'https://rpc.blast.io';

// =============================================================================
// Contract ABIs (minimal for reading market data)
// =============================================================================

export const CTF_EXCHANGE_ABI = [
  // Events
  'event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled)',
  'event OrdersMatched(bytes32 indexed takerOrderHash, address indexed takerOrderMaker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled)',
  'event TokenRegistered(uint256 indexed token0, uint256 indexed token1, bytes32 indexed conditionId)',

  // View functions
  'function getOrderStatus(bytes32 orderHash) view returns (bool isFilledOrCancelled, uint256 remaining)',
  'function registry(uint256 tokenId) view returns (uint256 complement, bytes32 conditionId)',
  'function getCtf() view returns (address)',
  'function getCollateral() view returns (address)',
] as const;

export const CONDITIONAL_TOKENS_ABI = [
  // Events
  'event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount)',
  'event ConditionResolution(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount, uint256[] payoutNumerators)',
  'event PositionSplit(address indexed stakeholder, address collateralToken, bytes32 indexed parentCollectionId, bytes32 indexed conditionId, uint256[] partition, uint256 amount)',
  'event PositionsMerge(address indexed stakeholder, address collateralToken, bytes32 indexed parentCollectionId, bytes32 indexed conditionId, uint256[] partition, uint256 amount)',
  'event PayoutRedemption(address indexed redeemer, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] indexSets, uint256 payout)',

  // View functions
  'function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) pure returns (bytes32)',
  'function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint256 indexSet) view returns (bytes32)',
  'function getPositionId(address collateralToken, bytes32 collectionId) pure returns (uint256)',
  'function getOutcomeSlotCount(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
] as const;

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
] as const;

// =============================================================================
// Types
// =============================================================================

export interface PredictFunMarket {
  conditionId: string;
  questionId: string;
  oracle: string;
  outcomeCount: number;
  outcomes: PredictFunOutcome[];
  isResolved: boolean;
  winningOutcome?: number;
}

export interface PredictFunOutcome {
  index: number;
  tokenId: string;
  complementTokenId?: string;
  price?: number;
}

export interface PredictFunOrder {
  orderHash: string;
  maker: string;
  makerAssetId: string;
  takerAssetId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
}
