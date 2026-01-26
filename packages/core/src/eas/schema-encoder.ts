/**
 * Schema Encoding Utilities for EAS
 * Provides type-safe encoding/decoding of attestation data
 */

// ESM build of eas-sdk has broken exports (index.js is empty)
// Use createRequire to load the CommonJS build properly
import { createRequire } from 'module';
import type { SchemaEncoder as SchemaEncoderType } from '@ethereum-attestation-service/eas-sdk';
const require = createRequire(import.meta.url);
const { SchemaEncoder } = require('@ethereum-attestation-service/eas-sdk') as {
  SchemaEncoder: typeof import('@ethereum-attestation-service/eas-sdk').SchemaEncoder;
};
type SchemaEncoder = SchemaEncoderType;
import type {
  ForecastAttestationData,
  CalibrationAttestationData,
  IdentityAttestationData,
  SuperforecasterAttestationData,
  ReputationAttestationData,
} from '../types/eas';

// =============================================================================
// Schema Definitions
// =============================================================================

export const SCHEMA_STRINGS = {
  FORECAST:
    'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic',
  CALIBRATION:
    'uint256 brierScore,uint256 totalForecasts,uint256 timeWeightedScore,uint256 period,string category',
  IDENTITY:
    'string platform,string platformUserId,bytes32 proofHash,bool verified,uint256 verifiedAt',
  SUPERFORECASTER:
    'string tier,uint256 score,uint256 period,string category,uint256 rank',
  REPUTATION:
    'string platform,uint256 totalVolume,uint256 winRate,uint256 profitLoss,string verificationLevel',
  PRIVATE_DATA: 'bytes32 merkleRoot,string dataType,uint256 fieldCount',
} as const;

// =============================================================================
// Encoder Instances (lazy initialization)
// =============================================================================

let forecastEncoder: SchemaEncoder | null = null;
let calibrationEncoder: SchemaEncoder | null = null;
let identityEncoder: SchemaEncoder | null = null;
let superforecasterEncoder: SchemaEncoder | null = null;
let reputationEncoder: SchemaEncoder | null = null;
let privateDataEncoder: SchemaEncoder | null = null;

function getForecastEncoder(): SchemaEncoder {
  if (!forecastEncoder) {
    forecastEncoder = new SchemaEncoder(SCHEMA_STRINGS.FORECAST);
  }
  return forecastEncoder;
}

function getCalibrationEncoder(): SchemaEncoder {
  if (!calibrationEncoder) {
    calibrationEncoder = new SchemaEncoder(SCHEMA_STRINGS.CALIBRATION);
  }
  return calibrationEncoder;
}

function getIdentityEncoder(): SchemaEncoder {
  if (!identityEncoder) {
    identityEncoder = new SchemaEncoder(SCHEMA_STRINGS.IDENTITY);
  }
  return identityEncoder;
}

function getSuperforecasterEncoder(): SchemaEncoder {
  if (!superforecasterEncoder) {
    superforecasterEncoder = new SchemaEncoder(SCHEMA_STRINGS.SUPERFORECASTER);
  }
  return superforecasterEncoder;
}

function getReputationEncoder(): SchemaEncoder {
  if (!reputationEncoder) {
    reputationEncoder = new SchemaEncoder(SCHEMA_STRINGS.REPUTATION);
  }
  return reputationEncoder;
}

function getPrivateDataEncoder(): SchemaEncoder {
  if (!privateDataEncoder) {
    privateDataEncoder = new SchemaEncoder(SCHEMA_STRINGS.PRIVATE_DATA);
  }
  return privateDataEncoder;
}

// =============================================================================
// Encoding Functions
// =============================================================================

/**
 * Encode forecast attestation data
 * @param data Forecast data to encode
 * @returns Encoded bytes string
 */
export function encodeForecastData(data: ForecastAttestationData): `0x${string}` {
  const encoder = getForecastEncoder();
  return encoder.encodeData([
    { name: 'probability', value: BigInt(data.probability), type: 'uint256' },
    { name: 'marketId', value: data.marketId, type: 'string' },
    { name: 'platform', value: data.platform, type: 'string' },
    { name: 'confidence', value: BigInt(data.confidence), type: 'uint256' },
    { name: 'reasoning', value: data.reasoning, type: 'string' },
    { name: 'isPublic', value: data.isPublic, type: 'bool' },
  ]) as `0x${string}`;
}

/**
 * Encode calibration score attestation data
 * @param data Calibration data to encode
 * @returns Encoded bytes string
 */
export function encodeCalibrationData(data: CalibrationAttestationData): `0x${string}` {
  const encoder = getCalibrationEncoder();
  return encoder.encodeData([
    { name: 'brierScore', value: BigInt(data.brierScore), type: 'uint256' },
    { name: 'totalForecasts', value: BigInt(data.totalForecasts), type: 'uint256' },
    { name: 'timeWeightedScore', value: BigInt(data.timeWeightedScore), type: 'uint256' },
    { name: 'period', value: BigInt(data.period), type: 'uint256' },
    { name: 'category', value: data.category, type: 'string' },
  ]) as `0x${string}`;
}

/**
 * Encode identity attestation data
 * @param data Identity data to encode
 * @returns Encoded bytes string
 */
export function encodeIdentityData(data: IdentityAttestationData): `0x${string}` {
  const encoder = getIdentityEncoder();
  return encoder.encodeData([
    { name: 'platform', value: data.platform, type: 'string' },
    { name: 'platformUserId', value: data.platformUserId, type: 'string' },
    { name: 'proofHash', value: data.proofHash, type: 'bytes32' },
    { name: 'verified', value: data.verified, type: 'bool' },
    { name: 'verifiedAt', value: BigInt(data.verifiedAt), type: 'uint256' },
  ]) as `0x${string}`;
}

/**
 * Encode superforecaster badge attestation data
 * @param data Superforecaster data to encode
 * @returns Encoded bytes string
 */
export function encodeSuperforecasterData(data: SuperforecasterAttestationData): `0x${string}` {
  const encoder = getSuperforecasterEncoder();
  return encoder.encodeData([
    { name: 'tier', value: data.tier, type: 'string' },
    { name: 'score', value: BigInt(data.score), type: 'uint256' },
    { name: 'period', value: BigInt(data.period), type: 'uint256' },
    { name: 'category', value: data.category, type: 'string' },
    { name: 'rank', value: BigInt(data.rank), type: 'uint256' },
  ]) as `0x${string}`;
}

/**
 * Encode reputation attestation data
 * @param data Reputation data to encode
 * @returns Encoded bytes string
 */
export function encodeReputationData(data: ReputationAttestationData): `0x${string}` {
  const encoder = getReputationEncoder();
  return encoder.encodeData([
    { name: 'platform', value: data.platform, type: 'string' },
    { name: 'totalVolume', value: BigInt(data.totalVolume), type: 'uint256' },
    { name: 'winRate', value: BigInt(data.winRate), type: 'uint256' },
    { name: 'profitLoss', value: BigInt(data.profitLoss), type: 'uint256' },
    { name: 'verificationLevel', value: data.verificationLevel, type: 'string' },
  ]) as `0x${string}`;
}

/**
 * Encode private data attestation (merkle root only)
 * @param merkleRoot The merkle root hash
 * @param dataType Type of data (e.g., "IDENTITY", "FORECAST")
 * @param fieldCount Number of fields in the merkle tree
 * @returns Encoded bytes string
 */
export function encodePrivateData(
  merkleRoot: `0x${string}`,
  dataType: string,
  fieldCount: number
): `0x${string}` {
  const encoder = getPrivateDataEncoder();
  return encoder.encodeData([
    { name: 'merkleRoot', value: merkleRoot, type: 'bytes32' },
    { name: 'dataType', value: dataType, type: 'string' },
    { name: 'fieldCount', value: BigInt(fieldCount), type: 'uint256' },
  ]) as `0x${string}`;
}

// =============================================================================
// Decoding Functions
// =============================================================================

/**
 * Decode forecast attestation data
 * @param encodedData Encoded bytes string
 * @returns Decoded forecast data
 */
export function decodeForecastData(encodedData: string): ForecastAttestationData {
  const encoder = getForecastEncoder();
  const decoded = encoder.decodeData(encodedData);

  return {
    probability: Number(decoded[0]?.value?.value ?? 0),
    marketId: (decoded[1]?.value?.value ?? '') as string,
    platform: (decoded[2]?.value?.value ?? '') as string,
    confidence: Number(decoded[3]?.value?.value ?? 0),
    reasoning: (decoded[4]?.value?.value ?? '') as string,
    isPublic: (decoded[5]?.value?.value ?? false) as boolean,
  };
}

/**
 * Decode calibration attestation data
 * @param encodedData Encoded bytes string
 * @returns Decoded calibration data
 */
export function decodeCalibrationData(encodedData: string): CalibrationAttestationData {
  const encoder = getCalibrationEncoder();
  const decoded = encoder.decodeData(encodedData);

  return {
    brierScore: Number(decoded[0]?.value?.value ?? 0),
    totalForecasts: Number(decoded[1]?.value?.value ?? 0),
    timeWeightedScore: Number(decoded[2]?.value?.value ?? 0),
    period: Number(decoded[3]?.value?.value ?? 0),
    category: (decoded[4]?.value?.value ?? '') as string,
  };
}
