/**
 * EAS Attestation Service
 * High-level service for creating, querying, and managing attestations
 */

import { EAS, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import type { Signer } from 'ethers';
import type {
  AttestationData,
  AttestationRequest,
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
import { createMerkleTree, generateMultiProof } from './privacy';

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
}
