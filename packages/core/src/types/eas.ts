/**
 * EAS (Ethereum Attestation Service) Type Definitions
 * Base Network Configuration and Schema Types
 */

// =============================================================================
// Network Configuration
// =============================================================================

export interface EASNetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  EAS_CONTRACT: `0x${string}`;
  SCHEMA_REGISTRY: `0x${string}`;
  easScanUrl: string;
  gasMultiplier?: number;
  maxFeePerGas?: string;
}

// Note: EAS_BASE_CONFIG and EAS_BASE_SEPOLIA_CONFIG are exported from eas/config.ts

// =============================================================================
// Schema Definitions
// =============================================================================

export interface SchemaDefinition {
  name: string;
  description: string;
  schema: string;
  revocable: boolean;
  resolver?: `0x${string}`;
  uid?: `0x${string}`;
}

/**
 * Forecast Attestation Schema
 * Records user probability forecasts for prediction markets
 */
export const FORECAST_SCHEMA: SchemaDefinition = {
  name: 'CalibrForecast',
  description: 'Attestation for a user forecast on a prediction market',
  schema: 'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic',
  revocable: true,
};

/**
 * Calibration Score Schema
 * Records aggregated Brier scores and calibration metrics
 */
export const CALIBRATION_SCHEMA: SchemaDefinition = {
  name: 'CalibrCalibrationScore',
  description: 'Attestation for user calibration scores over a period',
  schema: 'uint256 brierScore,uint256 totalForecasts,uint256 timeWeightedScore,uint256 period,string category',
  revocable: false, // Scores are permanent records
};

/**
 * Cross-Platform Identity Schema
 * Links user identity across prediction platforms
 */
export const IDENTITY_SCHEMA: SchemaDefinition = {
  name: 'CalibrIdentity',
  description: 'Links user identity across prediction platforms',
  schema: 'string platform,string platformUserId,bytes32 proofHash,bool verified,uint256 verifiedAt',
  revocable: true, // Can be revoked if platform connection removed
};

/**
 * Superforecaster Badge Schema
 * Achievement badges for tier promotion
 */
export const SUPERFORECASTER_SCHEMA: SchemaDefinition = {
  name: 'CalibrSuperforecaster',
  description: 'Badge attestation for superforecaster tier achievement',
  schema: 'string tier,uint256 score,uint256 period,string category,uint256 rank',
  revocable: false, // Badges are permanent achievements
};

/**
 * Platform Reputation Schema
 * Aggregated reputation from prediction platforms
 */
export const REPUTATION_SCHEMA: SchemaDefinition = {
  name: 'CalibrReputation',
  description: 'Aggregated reputation from prediction platforms',
  schema: 'string platform,uint256 totalVolume,uint256 winRate,uint256 profitLoss,string verificationLevel',
  revocable: true,
};

/**
 * Private Data Schema (Merkle Root)
 * For privacy-preserving attestations with selective disclosure
 */
export const PRIVATE_DATA_SCHEMA: SchemaDefinition = {
  name: 'CalibrPrivateData',
  description: 'Merkle root for private data attestations with selective disclosure',
  schema: 'bytes32 merkleRoot,string dataType,uint256 fieldCount',
  revocable: true,
};

/**
 * All Calibr schemas for batch registration
 */
export const CALIBR_SCHEMAS = {
  FORECAST: FORECAST_SCHEMA,
  CALIBRATION: CALIBRATION_SCHEMA,
  IDENTITY: IDENTITY_SCHEMA,
  SUPERFORECASTER: SUPERFORECASTER_SCHEMA,
  REPUTATION: REPUTATION_SCHEMA,
  PRIVATE_DATA: PRIVATE_DATA_SCHEMA,
} as const;

// =============================================================================
// Attestation Types
// =============================================================================

export interface AttestationRequest {
  schemaUid: `0x${string}`;
  recipient: `0x${string}`;
  data: Record<string, unknown>;
  refUid?: `0x${string}`;
  expirationTime?: bigint;
  revocable?: boolean;
}

export interface AttestationResponse {
  uid: `0x${string}`;
  txHash: `0x${string}`;
  schema: `0x${string}`;
  recipient: `0x${string}`;
  attester: `0x${string}`;
  time: number;
  data: Record<string, unknown>;
}

export interface AttestationData {
  uid: `0x${string}`;
  schemaUid: `0x${string}`;
  schemaName: string;
  chainId: number;
  txHash?: `0x${string}`;
  blockNumber?: number;
  attester: `0x${string}`;
  recipient: `0x${string}`;
  refUid?: `0x${string}`;
  data: Record<string, unknown>;
  revoked: boolean;
  revokedAt?: Date;
  isOffchain: boolean;
  isPrivate: boolean;
  merkleRoot?: string;
}

// =============================================================================
// Forecast Attestation Data
// =============================================================================

export interface ForecastAttestationData {
  probability: number; // 1-99 (scaled from 0.01-0.99)
  marketId: string;
  platform: string;
  confidence: number; // 0-100 (scaled from 0-1)
  reasoning: string;
  isPublic: boolean;
}

export interface CalibrationAttestationData {
  brierScore: number; // Scaled by 10000 (0.25 = 2500)
  totalForecasts: number;
  timeWeightedScore: number; // Scaled by 10000
  period: number; // Unix timestamp of period end
  category: string;
}

export interface IdentityAttestationData {
  platform: string;
  platformUserId: string;
  proofHash: `0x${string}`;
  verified: boolean;
  verifiedAt: number;
}

export interface SuperforecasterAttestationData {
  tier: SuperforecasterTier;
  score: number; // Scaled by 10000
  period: number; // Unix timestamp
  category: string;
  rank: number;
}

export interface ReputationAttestationData {
  platform: string;
  totalVolume: number; // In cents/wei
  winRate: number; // 0-10000 (percentage * 100)
  profitLoss: number; // Signed, in cents/wei
  verificationLevel: string;
}

// =============================================================================
// Privacy Types
// =============================================================================

export interface MerkleTreeData {
  root: `0x${string}`;
  leaves: MerkleLeaf[];
  depth: number;
}

export interface MerkleLeaf {
  index: number;
  name: string;
  type: string;
  value: unknown;
  hash: `0x${string}`;
}

export interface SelectiveDisclosureProof {
  merkleRoot: `0x${string}`;
  revealedFields: RevealedField[];
}

export interface RevealedField {
  name: string;
  value: unknown;
  proof: `0x${string}`[];
}

export interface PrivateDataAttestation {
  attestationUid: `0x${string}`;
  merkleRoot: `0x${string}`;
  fullTree: MerkleTreeData;
}

// =============================================================================
// Enums
// =============================================================================

export type SuperforecasterTier =
  | 'APPRENTICE'
  | 'JOURNEYMAN'
  | 'EXPERT'
  | 'MASTER'
  | 'GRANDMASTER';

export type Platform =
  | 'POLYMARKET'
  | 'KALSHI'
  | 'IEM'
  | 'METACULUS'
  | 'MANIFOLD';

export type ProfileVisibility = 'PUBLIC' | 'AUTHENTICATED' | 'PRIVATE';

export type ForecastPrivacy =
  | 'PUBLIC'
  | 'PROBABILITY_ONLY'
  | 'PRIVATE'
  | 'MERKLE';

// =============================================================================
// User Privacy Settings
// =============================================================================

export interface UserPrivacyPreferences {
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

export const DEFAULT_PRIVACY_PREFERENCES: UserPrivacyPreferences = {
  profileVisibility: 'PUBLIC',
  showOnLeaderboard: true,
  showWalletAddress: false,
  defaultForecastPrivacy: 'PUBLIC',
  shareReasoningPublicly: false,
  useOffchainAttestations: false,
  usePrivateDataAttestations: false,
  allowReputationExport: true,
  allowDataAggregation: true,
};

// =============================================================================
// Schema Registry Types
// =============================================================================

export interface RegisteredSchema {
  uid: `0x${string}`;
  schema: string;
  resolver: `0x${string}`;
  revocable: boolean;
}

export interface SchemaRegistryEntry {
  name: string;
  uid: `0x${string}`;
  deployedAt: Date;
  resolver?: `0x${string}`;
}

/**
 * Deployed schema UIDs - populated after deployment
 * These are stored in environment variables or config
 */
export interface DeployedSchemas {
  FORECAST_SCHEMA_UID?: `0x${string}`;
  CALIBRATION_SCHEMA_UID?: `0x${string}`;
  IDENTITY_SCHEMA_UID?: `0x${string}`;
  SUPERFORECASTER_SCHEMA_UID?: `0x${string}`;
  REPUTATION_SCHEMA_UID?: `0x${string}`;
  PRIVATE_DATA_SCHEMA_UID?: `0x${string}`;
}
