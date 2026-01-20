/**
 * Core type definitions for Calibr.ly
 */

// EAS Types
export * from './eas';

export interface UnifiedMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  platform: string;
  platformMarketId: string;
  probability: number;
  volume: number;
  liquidity: number;
  endDate: Date;
  resolved: boolean;
  outcome?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  platform: string;
  side: "YES" | "NO";
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
