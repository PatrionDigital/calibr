/**
 * EAS Configuration for Base Network
 */

import type { EASNetworkConfig, DeployedSchemas } from '../types/eas';

export const EAS_BASE_CONFIG: EASNetworkConfig = {
  chainId: 8453,
  chainName: 'Base',
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  EAS_CONTRACT: '0x4200000000000000000000000000000000000021',
  SCHEMA_REGISTRY: '0x4200000000000000000000000000000000000020',
  easScanUrl: 'https://base.easscan.org',
  gasMultiplier: 1.2,
  maxFeePerGas: '0.001',
};

export const EAS_BASE_SEPOLIA_CONFIG: EASNetworkConfig = {
  chainId: 84532,
  chainName: 'Base Sepolia',
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  EAS_CONTRACT: '0x4200000000000000000000000000000000000021',
  SCHEMA_REGISTRY: '0x4200000000000000000000000000000000000020',
  easScanUrl: 'https://base-sepolia.easscan.org',
};

/**
 * Get EAS config based on chain ID
 */
export function getEASConfig(chainId: number): EASNetworkConfig {
  switch (chainId) {
    case 8453:
      return EAS_BASE_CONFIG;
    case 84532:
      return EAS_BASE_SEPOLIA_CONFIG;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Deployed schema UIDs - loaded from environment
 */
export function getDeployedSchemas(): DeployedSchemas {
  return {
    FORECAST_SCHEMA_UID: process.env.FORECAST_SCHEMA_UID as `0x${string}` | undefined,
    CALIBRATION_SCHEMA_UID: process.env.CALIBRATION_SCHEMA_UID as `0x${string}` | undefined,
    IDENTITY_SCHEMA_UID: process.env.IDENTITY_SCHEMA_UID as `0x${string}` | undefined,
    SUPERFORECASTER_SCHEMA_UID: process.env.SUPERFORECASTER_SCHEMA_UID as `0x${string}` | undefined,
    REPUTATION_SCHEMA_UID: process.env.REPUTATION_SCHEMA_UID as `0x${string}` | undefined,
    PRIVATE_DATA_SCHEMA_UID: process.env.PRIVATE_DATA_SCHEMA_UID as `0x${string}` | undefined,
  };
}
