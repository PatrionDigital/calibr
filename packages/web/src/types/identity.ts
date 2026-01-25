/**
 * Chain constants for cross-platform identity
 */
export const BASE_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const POLYGON_CHAIN_ID = 137;
export const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as const;

/**
 * Supported prediction platforms
 */
export type PlatformType = 'POLYMARKET' | 'LIMITLESS' | 'KALSHI' | 'MANIFOLD';

/**
 * Calibration tiers from the spec
 */
export type CalibrationTier =
  | 'APPRENTICE'
  | 'JOURNEYMAN'
  | 'EXPERT'
  | 'MASTER'
  | 'GRANDMASTER';

/**
 * Linked platform identity from EAS attestations
 */
export interface LinkedPlatform {
  platform: PlatformType;
  platformUserId: string;
  verified: boolean;
}

/**
 * Primary identity source
 */
export type IdentitySource = 'wallet' | 'safe' | null;

/**
 * Main AppIdentity interface returned by useAppIdentity hook
 */
export interface AppIdentity {
  // Primary wallet (Base)
  walletAddress: `0x${string}` | null;
  chainId: number | null;
  isConnected: boolean;

  // Polymarket integration
  polymarketSafeAddress: `0x${string}` | null;
  polymarketSafeDeployed: boolean;
  hasClobCredentials: boolean;

  // Platform identities (from EAS)
  linkedPlatforms: LinkedPlatform[];

  // Calibration & reputation
  calibrationTier: CalibrationTier | null;

  // Derived state
  identitySource: IdentitySource;
  canTrade: boolean; // Has wallet + platform credentials
  isFullyOnboarded: boolean; // Has wallet + at least one platform linked

  // Loading states
  isLoading: boolean;
  isError: boolean;
}

/**
 * API response for user identity endpoint
 */
export interface IdentityApiResponse {
  walletAddress: string;
  polymarketSafeAddress: string | null;
  polymarketSafeDeployed: boolean;
  hasClobCredentials: boolean;
  calibrationTier: CalibrationTier | null;
  linkedPlatforms: LinkedPlatform[];
}

/**
 * Default empty identity state
 */
export const EMPTY_IDENTITY: AppIdentity = {
  walletAddress: null,
  chainId: null,
  isConnected: false,
  polymarketSafeAddress: null,
  polymarketSafeDeployed: false,
  hasClobCredentials: false,
  linkedPlatforms: [],
  calibrationTier: null,
  identitySource: null,
  canTrade: false,
  isFullyOnboarded: false,
  isLoading: false,
  isError: false,
};
