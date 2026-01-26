/**
 * EAS Attestation Service
 * High-level service for creating, querying, and managing attestations
 */

// ESM build of eas-sdk has broken exports (index.js is empty)
// Import types separately, then use require for runtime values
import type { EAS as EASType, SchemaRegistry as SchemaRegistryType } from '@ethereum-attestation-service/eas-sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const easSdk = require('@ethereum-attestation-service/eas-sdk') as {
  EAS: typeof import('@ethereum-attestation-service/eas-sdk').EAS;
  SchemaRegistry: typeof import('@ethereum-attestation-service/eas-sdk').SchemaRegistry;
};
const { EAS, SchemaRegistry } = easSdk;
type EAS = EASType;
type SchemaRegistry = SchemaRegistryType;
import type { Signer } from 'ethers';
import type {
  AttestationData,
  ForecastAttestationData,
  CalibrationAttestationData,
  IdentityAttestationData,
  SuperforecasterAttestationData,
  EASNetworkConfig,
  UserPrivacyPreferences,
} from '../types/eas';
import { getEASConfig, getDeployedSchemas } from './config';
import {
  encodeForecastData,
  encodeCalibrationData,
  encodeIdentityData,
  encodeSuperforecasterData,
  encodePrivateData,
} from './schema-encoder';
import { createMerkleTree } from './privacy';

// =============================================================================
// Types
// =============================================================================

export interface AttestationServiceConfig {
  chainId: number;
  signer: Signer;
}

export interface CreateForecastAttestationParams {
  recipient: `0x${string}`;
  data: ForecastAttestationData;
  privacyPreferences?: UserPrivacyPreferences;
}

export interface CreateCalibrationAttestationParams {
  recipient: `0x${string}`;
  data: CalibrationAttestationData;
}

export interface CreateIdentityAttestationParams {
  recipient: `0x${string}`;
  data: IdentityAttestationData;
  usePrivateData?: boolean;
}

export interface CreateSuperforecasterAttestationParams {
  recipient: `0x${string}`;
  data: SuperforecasterAttestationData;
}

// =============================================================================
// Attestation Service Class
// =============================================================================

export class AttestationService {
  private eas: EAS;
  private schemaRegistry: SchemaRegistry;
  private config: EASNetworkConfig;
  private schemas: ReturnType<typeof getDeployedSchemas>;
  private signer: Signer;

  constructor(serviceConfig: AttestationServiceConfig) {
    this.config = getEASConfig(serviceConfig.chainId);
    this.schemas = getDeployedSchemas();
    this.signer = serviceConfig.signer;

    // Initialize EAS SDK
    this.eas = new EAS(this.config.EAS_CONTRACT);
    this.eas.connect(serviceConfig.signer);

    // Initialize Schema Registry
    this.schemaRegistry = new SchemaRegistry(this.config.SCHEMA_REGISTRY);
    this.schemaRegistry.connect(serviceConfig.signer);
  }

  // ===========================================================================
  // Attestation Creation
  // ===========================================================================

  /**
   * Create a forecast attestation
   * Supports public, off-chain, or merkle-private modes based on privacy preferences
   */
  async createForecastAttestation(
    params: CreateForecastAttestationParams
  ): Promise<{ uid: `0x${string}`; txHash?: `0x${string}` }> {
    const { recipient, data, privacyPreferences } = params;

    if (!this.schemas.FORECAST_SCHEMA_UID) {
      throw new Error('Forecast schema UID not configured');
    }

    // Handle private data attestation
    if (privacyPreferences?.usePrivateDataAttestations) {
      return this.createPrivateForecastAttestation(recipient, data);
    }

    // Handle off-chain attestation
    if (privacyPreferences?.useOffchainAttestations) {
      return this.createOffchainForecastAttestation(recipient, data);
    }

    // Default: on-chain public attestation
    const encodedData = encodeForecastData(data);

    const tx = await this.eas.attest({
      schema: this.schemas.FORECAST_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n, // No expiration
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();
    // Get transaction hash - access via internal property since SDK types don't expose it
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uid: uid as `0x${string}`,
      txHash,
    };
  }

  /**
   * Create a calibration score attestation (always on-chain, non-revocable)
   */
  async createCalibrationAttestation(
    params: CreateCalibrationAttestationParams
  ): Promise<{ uid: `0x${string}`; txHash: `0x${string}` }> {
    const { recipient, data } = params;

    if (!this.schemas.CALIBRATION_SCHEMA_UID) {
      throw new Error('Calibration schema UID not configured');
    }

    const encodedData = encodeCalibrationData(data);

    const tx = await this.eas.attest({
      schema: this.schemas.CALIBRATION_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n,
        revocable: false, // Calibration scores are permanent
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();
    // Get transaction hash - access via internal property since SDK types don't expose it
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uid: uid as `0x${string}`,
      txHash,
    };
  }

  /**
   * Create an identity attestation (links platform identity to wallet)
   */
  async createIdentityAttestation(
    params: CreateIdentityAttestationParams
  ): Promise<{ uid: `0x${string}`; txHash?: `0x${string}` }> {
    const { recipient, data, usePrivateData } = params;

    if (!this.schemas.IDENTITY_SCHEMA_UID) {
      throw new Error('Identity schema UID not configured');
    }

    // Use private data for sensitive identity info
    if (usePrivateData) {
      return this.createPrivateIdentityAttestation(recipient, data);
    }

    const encodedData = encodeIdentityData(data);

    const tx = await this.eas.attest({
      schema: this.schemas.IDENTITY_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();
    // Get transaction hash - access via internal property since SDK types don't expose it
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uid: uid as `0x${string}`,
      txHash,
    };
  }

  /**
   * Create a superforecaster badge attestation (always on-chain, non-revocable)
   */
  async createSuperforecasterAttestation(
    params: CreateSuperforecasterAttestationParams
  ): Promise<{ uid: `0x${string}`; txHash: `0x${string}` }> {
    const { recipient, data } = params;

    if (!this.schemas.SUPERFORECASTER_SCHEMA_UID) {
      throw new Error('Superforecaster schema UID not configured');
    }

    const encodedData = encodeSuperforecasterData(data);

    const tx = await this.eas.attest({
      schema: this.schemas.SUPERFORECASTER_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n,
        revocable: false, // Badges are permanent achievements
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();
    // Get transaction hash - access via internal property since SDK types don't expose it
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uid: uid as `0x${string}`,
      txHash,
    };
  }

  // ===========================================================================
  // Attestation Queries
  // ===========================================================================

  /**
   * Get an attestation by UID
   */
  async getAttestation(uid: `0x${string}`): Promise<AttestationData | null> {
    const attestation = await this.eas.getAttestation(uid);

    if (!attestation || attestation.uid === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }

    return {
      uid: attestation.uid as `0x${string}`,
      schemaUid: attestation.schema as `0x${string}`,
      schemaName: this.getSchemaName(attestation.schema as `0x${string}`),
      chainId: this.config.chainId,
      attester: attestation.attester as `0x${string}`,
      recipient: attestation.recipient as `0x${string}`,
      refUid: attestation.refUID as `0x${string}` | undefined,
      data: { raw: attestation.data },
      revoked: attestation.revocationTime > 0n,
      revokedAt: attestation.revocationTime > 0n
        ? new Date(Number(attestation.revocationTime) * 1000)
        : undefined,
      isOffchain: false,
      isPrivate: false,
    };
  }

  /**
   * Check if an attestation is valid (exists and not revoked)
   */
  async isAttestationValid(uid: `0x${string}`): Promise<boolean> {
    return this.eas.isAttestationValid(uid);
  }

  /**
   * Revoke an attestation
   */
  async revokeAttestation(
    schemaUid: `0x${string}`,
    uid: `0x${string}`
  ): Promise<{ txHash: `0x${string}` }> {
    const tx = await this.eas.revoke({
      schema: schemaUid,
      data: {
        uid,
        value: 0n,
      },
    });

    await tx.wait();
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      txHash,
    };
  }

  // ===========================================================================
  // Private Attestation Helpers
  // ===========================================================================

  private async createPrivateForecastAttestation(
    recipient: `0x${string}`,
    data: ForecastAttestationData
  ): Promise<{ uid: `0x${string}`; merkleRoot: `0x${string}` }> {
    if (!this.schemas.PRIVATE_DATA_SCHEMA_UID) {
      throw new Error('Private data schema UID not configured');
    }

    // Create merkle tree from forecast data
    const merkleData = createMerkleTree([
      { name: 'probability', type: 'uint256', value: data.probability },
      { name: 'marketId', type: 'string', value: data.marketId },
      { name: 'platform', type: 'string', value: data.platform },
      { name: 'confidence', type: 'uint256', value: data.confidence },
      { name: 'reasoning', type: 'string', value: data.reasoning },
      { name: 'isPublic', type: 'bool', value: data.isPublic },
    ]);

    const encodedData = encodePrivateData(merkleData.root, 'FORECAST', 6);

    const tx = await this.eas.attest({
      schema: this.schemas.PRIVATE_DATA_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();

    return {
      uid: uid as `0x${string}`,
      merkleRoot: merkleData.root,
    };
  }

  private async createOffchainForecastAttestation(
    recipient: `0x${string}`,
    data: ForecastAttestationData
  ): Promise<{ uid: `0x${string}` }> {
    // Off-chain attestations are timestamped but data stored off-chain
    const encodedData = encodeForecastData(data);

    // Create off-chain attestation
    const offchain = await this.eas.getOffchain();
    const attestation = await offchain.signOffchainAttestation(
      {
        schema: this.schemas.FORECAST_SCHEMA_UID!,
        recipient,
        time: BigInt(Math.floor(Date.now() / 1000)),
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
      },
      this.signer
    );

    return {
      uid: attestation.uid as `0x${string}`,
    };
  }

  private async createPrivateIdentityAttestation(
    recipient: `0x${string}`,
    data: IdentityAttestationData
  ): Promise<{ uid: `0x${string}`; merkleRoot: `0x${string}` }> {
    if (!this.schemas.PRIVATE_DATA_SCHEMA_UID) {
      throw new Error('Private data schema UID not configured');
    }

    const merkleData = createMerkleTree([
      { name: 'platform', type: 'string', value: data.platform },
      { name: 'platformUserId', type: 'string', value: data.platformUserId },
      { name: 'proofHash', type: 'bytes32', value: data.proofHash },
      { name: 'verified', type: 'bool', value: data.verified },
      { name: 'verifiedAt', type: 'uint256', value: data.verifiedAt },
    ]);

    const encodedData = encodePrivateData(merkleData.root, 'IDENTITY', 5);

    const tx = await this.eas.attest({
      schema: this.schemas.PRIVATE_DATA_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    });

    const uid = await tx.wait();

    return {
      uid: uid as `0x${string}`,
      merkleRoot: merkleData.root,
    };
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private getSchemaName(schemaUid: `0x${string}`): string {
    if (schemaUid === this.schemas.FORECAST_SCHEMA_UID) return 'CalibrForecast';
    if (schemaUid === this.schemas.CALIBRATION_SCHEMA_UID) return 'CalibrCalibrationScore';
    if (schemaUid === this.schemas.IDENTITY_SCHEMA_UID) return 'CalibrIdentity';
    if (schemaUid === this.schemas.SUPERFORECASTER_SCHEMA_UID) return 'CalibrSuperforecaster';
    if (schemaUid === this.schemas.REPUTATION_SCHEMA_UID) return 'CalibrReputation';
    if (schemaUid === this.schemas.PRIVATE_DATA_SCHEMA_UID) return 'CalibrPrivateData';
    return 'Unknown';
  }

  /**
   * Get the EAS scan URL for an attestation
   */
  getAttestationUrl(uid: `0x${string}`): string {
    return `${this.config.easScanUrl}/attestation/view/${uid}`;
  }

  /**
   * Get the EAS scan URL for a schema
   */
  getSchemaUrl(schemaUid: `0x${string}`): string {
    return `${this.config.easScanUrl}/schema/view/${schemaUid}`;
  }

  // ===========================================================================
  // Batch Attestation Methods
  // ===========================================================================

  /**
   * Create multiple forecast attestations in a single transaction
   * More gas efficient than individual attestations
   */
  async createBatchForecastAttestations(
    attestations: CreateForecastAttestationParams[]
  ): Promise<{ uids: `0x${string}`[]; txHash: `0x${string}` }> {
    if (!this.schemas.FORECAST_SCHEMA_UID) {
      throw new Error('Forecast schema UID not configured');
    }

    if (attestations.length === 0) {
      throw new Error('No attestations provided');
    }

    // Build multiAttest request
    const multiAttestRequest = {
      schema: this.schemas.FORECAST_SCHEMA_UID,
      data: attestations.map(({ recipient, data }) => ({
        recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodeForecastData(data),
        value: 0n,
      })),
    };

    const tx = await this.eas.multiAttest([multiAttestRequest]);
    const uids = await tx.wait();

    // Get transaction hash
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uids: uids as `0x${string}`[],
      txHash,
    };
  }

  /**
   * Create multiple identity attestations in a single transaction
   */
  async createBatchIdentityAttestations(
    attestations: CreateIdentityAttestationParams[]
  ): Promise<{ uids: `0x${string}`[]; txHash: `0x${string}` }> {
    if (!this.schemas.IDENTITY_SCHEMA_UID) {
      throw new Error('Identity schema UID not configured');
    }

    if (attestations.length === 0) {
      throw new Error('No attestations provided');
    }

    // Build multiAttest request (only public attestations)
    const publicAttestations = attestations.filter(a => !a.usePrivateData);

    if (publicAttestations.length === 0) {
      throw new Error('Batch attestations only support public identity attestations');
    }

    const multiAttestRequest = {
      schema: this.schemas.IDENTITY_SCHEMA_UID,
      data: publicAttestations.map(({ recipient, data }) => ({
        recipient,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodeIdentityData(data),
        value: 0n,
      })),
    };

    const tx = await this.eas.multiAttest([multiAttestRequest]);
    const uids = await tx.wait();

    // Get transaction hash
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return {
      uids: uids as `0x${string}`[],
      txHash,
    };
  }

  /**
   * Create multiple attestations of different types in a single transaction
   * Useful for complex operations like updating both forecast and calibration
   */
  async createMixedBatchAttestations(params: {
    forecasts?: CreateForecastAttestationParams[];
    calibrations?: CreateCalibrationAttestationParams[];
    identities?: CreateIdentityAttestationParams[];
    superforecasters?: CreateSuperforecasterAttestationParams[];
  }): Promise<{
    forecastUids: `0x${string}`[];
    calibrationUids: `0x${string}`[];
    identityUids: `0x${string}`[];
    superforecasterUids: `0x${string}`[];
    txHash: `0x${string}`;
  }> {
    const requests: Array<{
      schema: `0x${string}`;
      data: Array<{
        recipient: `0x${string}`;
        expirationTime: bigint;
        revocable: boolean;
        refUID: `0x${string}`;
        data: `0x${string}`;
        value: bigint;
      }>;
    }> = [];

    // Track counts for result parsing
    let forecastCount = 0;
    let calibrationCount = 0;
    let identityCount = 0;
    let superforecasterCount = 0;

    // Add forecast attestations
    if (params.forecasts?.length && this.schemas.FORECAST_SCHEMA_UID) {
      forecastCount = params.forecasts.length;
      requests.push({
        schema: this.schemas.FORECAST_SCHEMA_UID,
        data: params.forecasts.map(({ recipient, data }) => ({
          recipient,
          expirationTime: 0n,
          revocable: true,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          data: encodeForecastData(data),
          value: 0n,
        })),
      });
    }

    // Add calibration attestations
    if (params.calibrations?.length && this.schemas.CALIBRATION_SCHEMA_UID) {
      calibrationCount = params.calibrations.length;
      requests.push({
        schema: this.schemas.CALIBRATION_SCHEMA_UID,
        data: params.calibrations.map(({ recipient, data }) => ({
          recipient,
          expirationTime: 0n,
          revocable: false,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          data: encodeCalibrationData(data),
          value: 0n,
        })),
      });
    }

    // Add identity attestations (public only)
    if (params.identities?.length && this.schemas.IDENTITY_SCHEMA_UID) {
      const publicIdentities = params.identities.filter(a => !a.usePrivateData);
      if (publicIdentities.length > 0) {
        identityCount = publicIdentities.length;
        requests.push({
          schema: this.schemas.IDENTITY_SCHEMA_UID,
          data: publicIdentities.map(({ recipient, data }) => ({
            recipient,
            expirationTime: 0n,
            revocable: true,
            refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
            data: encodeIdentityData(data),
            value: 0n,
          })),
        });
      }
    }

    // Add superforecaster attestations
    if (params.superforecasters?.length && this.schemas.SUPERFORECASTER_SCHEMA_UID) {
      superforecasterCount = params.superforecasters.length;
      requests.push({
        schema: this.schemas.SUPERFORECASTER_SCHEMA_UID,
        data: params.superforecasters.map(({ recipient, data }) => ({
          recipient,
          expirationTime: 0n,
          revocable: false,
          refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          data: encodeSuperforecasterData(data),
          value: 0n,
        })),
      });
    }

    if (requests.length === 0) {
      throw new Error('No valid attestations to create');
    }

    const tx = await this.eas.multiAttest(requests);
    const allUids = await tx.wait();
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    // Parse UIDs back to original schema order
    const uidsArray = Array.isArray(allUids) ? allUids : [allUids];
    let offset = 0;

    const forecastUids = uidsArray.slice(offset, offset + forecastCount) as `0x${string}`[];
    offset += forecastCount;

    const calibrationUids = uidsArray.slice(offset, offset + calibrationCount) as `0x${string}`[];
    offset += calibrationCount;

    const identityUids = uidsArray.slice(offset, offset + identityCount) as `0x${string}`[];
    offset += identityCount;

    const superforecasterUids = uidsArray.slice(offset, offset + superforecasterCount) as `0x${string}`[];

    return {
      forecastUids,
      calibrationUids,
      identityUids,
      superforecasterUids,
      txHash,
    };
  }

  /**
   * Revoke multiple attestations in a single transaction
   */
  async revokeBatchAttestations(
    schemaUid: `0x${string}`,
    uids: `0x${string}`[]
  ): Promise<{ txHash: `0x${string}` }> {
    if (uids.length === 0) {
      throw new Error('No UIDs provided');
    }

    const tx = await this.eas.multiRevoke([
      {
        schema: schemaUid,
        data: uids.map(uid => ({
          uid,
          value: 0n,
        })),
      },
    ]);

    await tx.wait();
    const txHash = ((tx as unknown as { tx?: { hash?: string } }).tx?.hash ?? '0x') as `0x${string}`;

    return { txHash };
  }
}
