/**
 * EAS Client-Side Integration
 * Creates attestations using the user's wallet via wagmi
 */

import { type Address, encodePacked, keccak256 } from 'viem';

// =============================================================================
// Constants
// =============================================================================

// EAS contract addresses on Base
export const EAS_CONTRACTS = {
  base: {
    chainId: 8453,
    eas: '0x4200000000000000000000000000000000000021' as Address,
    schemaRegistry: '0x4200000000000000000000000000000000000020' as Address,
    easScanUrl: 'https://base.easscan.org',
  },
  baseSepolia: {
    chainId: 84532,
    eas: '0x4200000000000000000000000000000000000021' as Address,
    schemaRegistry: '0x4200000000000000000000000000000000000020' as Address,
    easScanUrl: 'https://base-sepolia.easscan.org',
  },
} as const;

// Calibr Forecast Schema
// Schema: "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic"
export const FORECAST_SCHEMA =
  'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic';

// Deployed Schema UIDs (from packages/contracts/DEPLOYMENTS.md)
export const SCHEMA_UIDS = {
  // Base Sepolia - deployed January 24, 2025 (updated resolver with self-attestation support)
  baseSepolia: {
    forecast: '0xbeebd6600cf48d34e814e0aa0feb1f2bebd547a972963796e03c14d1ab4ef5a1' as `0x${string}`,
    calibration: '0xd44c6125a33083aec2cf763b785bc865b2bb4b837902289bbbd72dfb544ba579' as `0x${string}`,
    identity: '0xc0b01a6619072a6bf30cc335a60774321d479a9c7f3ec4627df17fe679b33116' as `0x${string}`,
    superforecaster: '0x524a06a27768fa90080629c6f1c750efb55c5903fca64be95a6623bfe4a4b248' as `0x${string}`,
    reputation: '0x53f34419e628bd88263a78a89cb7be1c2097c67f21062b5a966d37e15249bbff' as `0x${string}`,
    privateData: '0xa2ad56fdcf09f2db43e242b8b284e782ba5d4f539c7baf5a5bedfedc7080b02d' as `0x${string}`,
  },
  // Base Mainnet - to be deployed (Phase 8)
  base: {
    forecast: undefined as `0x${string}` | undefined,
    calibration: undefined as `0x${string}` | undefined,
    identity: undefined as `0x${string}` | undefined,
    superforecaster: undefined as `0x${string}` | undefined,
    reputation: undefined as `0x${string}` | undefined,
    privateData: undefined as `0x${string}` | undefined,
  },
} as const;

/**
 * Get the forecast schema UID for a chain
 */
export function getForecastSchemaUid(chainId: number): `0x${string}` | undefined {
  if (chainId === 84532) return SCHEMA_UIDS.baseSepolia.forecast;
  if (chainId === 8453) return SCHEMA_UIDS.base.forecast;
  return undefined;
}

// =============================================================================
// Types
// =============================================================================

export interface ForecastAttestationData {
  probability: number; // 0-10000 basis points (0.00% to 100.00%, e.g., 7525 = 75.25%)
  marketId: string;
  platform: string;
  confidence: number; // 0-10000 basis points
  reasoning: string;
  isPublic: boolean;
}

export interface AttestationResult {
  uid: Address;
  txHash: Address;
  easScanUrl: string;
}

export interface SchemaRegistrationResult {
  schemaUid: Address;
  txHash: Address;
}

// =============================================================================
// ABI for EAS contracts
// =============================================================================

export const SCHEMA_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'schema', type: 'string' },
      { name: 'resolver', type: 'address' },
      { name: 'revocable', type: 'bool' },
    ],
    name: 'register',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'uid', type: 'bytes32' }],
    name: 'getSchema',
    outputs: [
      {
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'resolver', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'schema', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const EAS_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' },
            ],
            name: 'data',
            type: 'tuple',
          },
        ],
        name: 'request',
        type: 'tuple',
      },
    ],
    name: 'attest',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'uid', type: 'bytes32' }],
    name: 'getAttestation',
    outputs: [
      {
        components: [
          { name: 'uid', type: 'bytes32' },
          { name: 'schema', type: 'bytes32' },
          { name: 'time', type: 'uint64' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocationTime', type: 'uint64' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'recipient', type: 'address' },
          { name: 'attester', type: 'address' },
          { name: 'revocable', type: 'bool' },
          { name: 'data', type: 'bytes' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'uid', type: 'bytes32' }],
    name: 'isAttestationValid',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recipient', type: 'address' },
      { indexed: true, name: 'attester', type: 'address' },
      { indexed: false, name: 'uid', type: 'bytes32' },
      { indexed: true, name: 'schemaUID', type: 'bytes32' },
    ],
    name: 'Attested',
    type: 'event',
  },
] as const;

// =============================================================================
// Encoding Functions
// =============================================================================

/**
 * Encode forecast data for attestation
 */
export function encodeForecastData(data: ForecastAttestationData): `0x${string}` {
  // ABI encode the data according to the schema
  // Schema: "uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic"

  // Using a simple encoding approach - in production use proper ABI encoding
  const encoded = encodePacked(
    ['uint256', 'string', 'string', 'uint256', 'string', 'bool'],
    [
      BigInt(data.probability),
      data.marketId,
      data.platform,
      BigInt(data.confidence),
      data.reasoning,
      data.isPublic,
    ]
  );

  return encoded;
}

/**
 * Encode forecast data using ethers-style ABI encoding for EAS compatibility
 */
export function encodeForecastDataABI(data: ForecastAttestationData): `0x${string}` {
  // For EAS, we need proper ABI encoding
  // This is a simplified version - the actual encoding should use SchemaEncoder from @eas-sdk
  const abiCoder = new TextEncoder();

  // Create a basic ABI-encoded representation
  // In production, use the EAS SDK's SchemaEncoder
  const jsonData = JSON.stringify({
    probability: data.probability,
    marketId: data.marketId,
    platform: data.platform,
    confidence: data.confidence,
    reasoning: data.reasoning,
    isPublic: data.isPublic,
  });

  // Convert to hex
  const bytes = abiCoder.encode(jsonData);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `0x${hex}` as `0x${string}`;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get EAS config for a chain
 */
export function getEASConfig(chainId: number) {
  if (chainId === 8453) return EAS_CONTRACTS.base;
  if (chainId === 84532) return EAS_CONTRACTS.baseSepolia;
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Generate EAS scan URL for an attestation
 */
export function getAttestationUrl(uid: string, chainId: number = 84532): string {
  const config = getEASConfig(chainId);
  return `${config.easScanUrl}/attestation/view/${uid}`;
}

/**
 * Generate EAS scan URL for a schema
 */
export function getSchemaUrl(schemaUid: string, chainId: number = 84532): string {
  const config = getEASConfig(chainId);
  return `${config.easScanUrl}/schema/view/${schemaUid}`;
}

/**
 * Compute schema UID from schema string
 * Schema UID = keccak256(abi.encodePacked(schema, resolver, revocable))
 */
export function computeSchemaUid(
  schema: string,
  resolver: Address = '0x0000000000000000000000000000000000000000',
  revocable: boolean = true
): Address {
  const encoded = encodePacked(
    ['string', 'address', 'bool'],
    [schema, resolver, revocable]
  );
  return keccak256(encoded) as Address;
}
