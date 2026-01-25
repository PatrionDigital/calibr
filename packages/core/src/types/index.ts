/**
 * Core type definitions for Calibr.xyz
 */

// EAS Types
export * from './eas';

/**
 * Market outcome - supports both binary and multi-outcome markets
 */
export interface MarketOutcome {
  /** Index of this outcome (0-based) */
  index: number;
  /** Display label for this outcome */
  label: string;
  /** Current probability/price (0-1) */
  probability: number;
  /** Token ID for this outcome (platform-specific) */
  tokenId?: string;
  /** Whether this outcome won (null if not resolved) */
  isWinner?: boolean | null;
}

/**
 * Market type - binary (YES/NO) or multi-outcome
 */
export type MarketType = 'BINARY' | 'MULTIPLE_CHOICE' | 'SCALAR';

export interface UnifiedMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: string;
  platformMarketId: string;

  /** Market type */
  marketType: MarketType;

  /**
   * Outcomes for this market
   * - Binary markets: [{ label: 'Yes', ... }, { label: 'No', ... }]
   * - Multi-choice: [{ label: 'Candidate A', ... }, { label: 'Candidate B', ... }, ...]
   */
  outcomes: MarketOutcome[];

  /**
   * @deprecated Use outcomes[0].probability for YES price
   * Kept for backwards compatibility with binary markets
   */
  probability?: number;

  volume: number;
  liquidity: number;
  endDate: Date;
  resolved: boolean;
  /** Index of winning outcome (null if not resolved, undefined if not applicable) */
  winningOutcomeIndex?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  platform: string;

  /**
   * Outcome held - can be:
   * - 'YES' or 'NO' for binary markets
   * - Outcome label for multi-choice markets
   */
  outcome: string;

  /**
   * @deprecated Use outcome instead
   */
  side?: "YES" | "NO";

  /** Index of the outcome (0 for YES, 1 for NO in binary markets) */
  outcomeIndex: number;

  shares: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Forecast {
  id: string;
  userId: string;
  marketId: string;
  probability: number;
  confidence: number;
  reasoning?: string;
  isPublic: boolean;
  easUid?: string;
  brierScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ProfileVisibility = "PUBLIC" | "AUTHENTICATED" | "PRIVATE";
export type ForecastPrivacy = "PUBLIC" | "OFF_CHAIN" | "PRIVATE";
export type AttestationMode = "ON_CHAIN" | "OFF_CHAIN" | "MERKLE_PRIVATE";

export interface UserPrivacySettings {
  profileVisibility: ProfileVisibility;
  showOnLeaderboard: boolean;
  showWalletAddress: boolean;
  defaultForecastPrivacy: ForecastPrivacy;
  shareReasoningPublicly: boolean;
  useOffchainAttestations: boolean;
  usePrivateDataAttestations: boolean;
  allowReputationExport: boolean;
  allowDataAggregation: boolean;
}
