/**
 * Tests for EAS Configuration and Schema Definitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EAS_BASE_CONFIG,
  EAS_BASE_SEPOLIA_CONFIG,
  getEASConfig,
  getDeployedSchemas,
} from '../../src/eas/config';
import {
  FORECAST_SCHEMA,
  CALIBRATION_SCHEMA,
  IDENTITY_SCHEMA,
  SUPERFORECASTER_SCHEMA,
  REPUTATION_SCHEMA,
  PRIVATE_DATA_SCHEMA,
  CALIBR_SCHEMAS,
  DEFAULT_PRIVACY_PREFERENCES,
} from '../../src/types/eas';

// =============================================================================
// EAS Network Configuration Tests
// =============================================================================

describe('EAS Network Configurations', () => {
  describe('EAS_BASE_CONFIG', () => {
    it('should have correct chain ID for Base mainnet', () => {
      expect(EAS_BASE_CONFIG.chainId).toBe(8453);
    });

    it('should have correct chain name', () => {
      expect(EAS_BASE_CONFIG.chainName).toBe('Base');
    });

    it('should have valid EAS contract address', () => {
      expect(EAS_BASE_CONFIG.EAS_CONTRACT).toBe('0x4200000000000000000000000000000000000021');
      expect(EAS_BASE_CONFIG.EAS_CONTRACT).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid schema registry address', () => {
      expect(EAS_BASE_CONFIG.SCHEMA_REGISTRY).toBe('0x4200000000000000000000000000000000000020');
      expect(EAS_BASE_CONFIG.SCHEMA_REGISTRY).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should have valid EAS scan URL', () => {
      expect(EAS_BASE_CONFIG.easScanUrl).toBe('https://base.easscan.org');
    });

    it('should have gas multiplier', () => {
      expect(EAS_BASE_CONFIG.gasMultiplier).toBe(1.2);
    });

    it('should have max fee per gas', () => {
      expect(EAS_BASE_CONFIG.maxFeePerGas).toBe('0.001');
    });

    it('should have RPC URL', () => {
      expect(EAS_BASE_CONFIG.rpcUrl).toBeDefined();
      expect(typeof EAS_BASE_CONFIG.rpcUrl).toBe('string');
    });
  });

  describe('EAS_BASE_SEPOLIA_CONFIG', () => {
    it('should have correct chain ID for Base Sepolia', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.chainId).toBe(84532);
    });

    it('should have correct chain name', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.chainName).toBe('Base Sepolia');
    });

    it('should have same EAS contract address as mainnet', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.EAS_CONTRACT).toBe(EAS_BASE_CONFIG.EAS_CONTRACT);
    });

    it('should have same schema registry address as mainnet', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.SCHEMA_REGISTRY).toBe(EAS_BASE_CONFIG.SCHEMA_REGISTRY);
    });

    it('should have valid Sepolia EAS scan URL', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.easScanUrl).toBe('https://base-sepolia.easscan.org');
    });

    it('should have RPC URL', () => {
      expect(EAS_BASE_SEPOLIA_CONFIG.rpcUrl).toBeDefined();
      expect(typeof EAS_BASE_SEPOLIA_CONFIG.rpcUrl).toBe('string');
    });
  });
});

// =============================================================================
// getEASConfig Function Tests
// =============================================================================

describe('getEASConfig', () => {
  it('should return Base config for chain ID 8453', () => {
    const config = getEASConfig(8453);
    expect(config).toBe(EAS_BASE_CONFIG);
  });

  it('should return Base Sepolia config for chain ID 84532', () => {
    const config = getEASConfig(84532);
    expect(config).toBe(EAS_BASE_SEPOLIA_CONFIG);
  });

  it('should throw error for unsupported chain ID', () => {
    expect(() => getEASConfig(1)).toThrow('Unsupported chain ID: 1');
  });

  it('should throw error for Ethereum mainnet', () => {
    expect(() => getEASConfig(1)).toThrow('Unsupported chain ID: 1');
  });

  it('should throw error for Polygon', () => {
    expect(() => getEASConfig(137)).toThrow('Unsupported chain ID: 137');
  });

  it('should throw error for Arbitrum', () => {
    expect(() => getEASConfig(42161)).toThrow('Unsupported chain ID: 42161');
  });

  it('should throw error for zero chain ID', () => {
    expect(() => getEASConfig(0)).toThrow('Unsupported chain ID: 0');
  });

  it('should throw error for negative chain ID', () => {
    expect(() => getEASConfig(-1)).toThrow('Unsupported chain ID: -1');
  });
});

// =============================================================================
// getDeployedSchemas Function Tests
// =============================================================================

describe('getDeployedSchemas', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return object with all schema UID keys', () => {
    const schemas = getDeployedSchemas();
    expect(schemas).toHaveProperty('FORECAST_SCHEMA_UID');
    expect(schemas).toHaveProperty('CALIBRATION_SCHEMA_UID');
    expect(schemas).toHaveProperty('IDENTITY_SCHEMA_UID');
    expect(schemas).toHaveProperty('SUPERFORECASTER_SCHEMA_UID');
    expect(schemas).toHaveProperty('REPUTATION_SCHEMA_UID');
    expect(schemas).toHaveProperty('PRIVATE_DATA_SCHEMA_UID');
  });

  it('should return undefined for unset schema UIDs', () => {
    delete process.env.FORECAST_SCHEMA_UID;
    const schemas = getDeployedSchemas();
    expect(schemas.FORECAST_SCHEMA_UID).toBeUndefined();
  });

  it('should return value from environment when set', () => {
    process.env.FORECAST_SCHEMA_UID = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const schemas = getDeployedSchemas();
    expect(schemas.FORECAST_SCHEMA_UID).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
  });
});

// =============================================================================
// Schema Definition Tests
// =============================================================================

describe('Schema Definitions', () => {
  describe('FORECAST_SCHEMA', () => {
    it('should have correct name', () => {
      expect(FORECAST_SCHEMA.name).toBe('CalibrForecast');
    });

    it('should have description', () => {
      expect(FORECAST_SCHEMA.description).toBeDefined();
      expect(FORECAST_SCHEMA.description.length).toBeGreaterThan(0);
    });

    it('should include probability field', () => {
      expect(FORECAST_SCHEMA.schema).toContain('probability');
    });

    it('should include marketId field', () => {
      expect(FORECAST_SCHEMA.schema).toContain('marketId');
    });

    it('should include platform field', () => {
      expect(FORECAST_SCHEMA.schema).toContain('platform');
    });

    it('should include confidence field', () => {
      expect(FORECAST_SCHEMA.schema).toContain('confidence');
    });

    it('should include isPublic field', () => {
      expect(FORECAST_SCHEMA.schema).toContain('isPublic');
    });

    it('should be revocable', () => {
      expect(FORECAST_SCHEMA.revocable).toBe(true);
    });
  });

  describe('CALIBRATION_SCHEMA', () => {
    it('should have correct name', () => {
      expect(CALIBRATION_SCHEMA.name).toBe('CalibrCalibrationScore');
    });

    it('should include brierScore field', () => {
      expect(CALIBRATION_SCHEMA.schema).toContain('brierScore');
    });

    it('should include totalForecasts field', () => {
      expect(CALIBRATION_SCHEMA.schema).toContain('totalForecasts');
    });

    it('should include timeWeightedScore field', () => {
      expect(CALIBRATION_SCHEMA.schema).toContain('timeWeightedScore');
    });

    it('should not be revocable (permanent record)', () => {
      expect(CALIBRATION_SCHEMA.revocable).toBe(false);
    });
  });

  describe('IDENTITY_SCHEMA', () => {
    it('should have correct name', () => {
      expect(IDENTITY_SCHEMA.name).toBe('CalibrIdentity');
    });

    it('should include platform field', () => {
      expect(IDENTITY_SCHEMA.schema).toContain('platform');
    });

    it('should include platformUserId field', () => {
      expect(IDENTITY_SCHEMA.schema).toContain('platformUserId');
    });

    it('should include proofHash field', () => {
      expect(IDENTITY_SCHEMA.schema).toContain('proofHash');
    });

    it('should include verified field', () => {
      expect(IDENTITY_SCHEMA.schema).toContain('verified');
    });

    it('should be revocable', () => {
      expect(IDENTITY_SCHEMA.revocable).toBe(true);
    });
  });

  describe('SUPERFORECASTER_SCHEMA', () => {
    it('should have correct name', () => {
      expect(SUPERFORECASTER_SCHEMA.name).toBe('CalibrSuperforecaster');
    });

    it('should include tier field', () => {
      expect(SUPERFORECASTER_SCHEMA.schema).toContain('tier');
    });

    it('should include score field', () => {
      expect(SUPERFORECASTER_SCHEMA.schema).toContain('score');
    });

    it('should include rank field', () => {
      expect(SUPERFORECASTER_SCHEMA.schema).toContain('rank');
    });

    it('should not be revocable (permanent badge)', () => {
      expect(SUPERFORECASTER_SCHEMA.revocable).toBe(false);
    });
  });

  describe('REPUTATION_SCHEMA', () => {
    it('should have correct name', () => {
      expect(REPUTATION_SCHEMA.name).toBe('CalibrReputation');
    });

    it('should include platform field', () => {
      expect(REPUTATION_SCHEMA.schema).toContain('platform');
    });

    it('should include totalVolume field', () => {
      expect(REPUTATION_SCHEMA.schema).toContain('totalVolume');
    });

    it('should include winRate field', () => {
      expect(REPUTATION_SCHEMA.schema).toContain('winRate');
    });

    it('should include profitLoss field', () => {
      expect(REPUTATION_SCHEMA.schema).toContain('profitLoss');
    });

    it('should be revocable', () => {
      expect(REPUTATION_SCHEMA.revocable).toBe(true);
    });
  });

  describe('PRIVATE_DATA_SCHEMA', () => {
    it('should have correct name', () => {
      expect(PRIVATE_DATA_SCHEMA.name).toBe('CalibrPrivateData');
    });

    it('should include merkleRoot field', () => {
      expect(PRIVATE_DATA_SCHEMA.schema).toContain('merkleRoot');
    });

    it('should include dataType field', () => {
      expect(PRIVATE_DATA_SCHEMA.schema).toContain('dataType');
    });

    it('should include fieldCount field', () => {
      expect(PRIVATE_DATA_SCHEMA.schema).toContain('fieldCount');
    });

    it('should be revocable', () => {
      expect(PRIVATE_DATA_SCHEMA.revocable).toBe(true);
    });
  });
});

// =============================================================================
// CALIBR_SCHEMAS Object Tests
// =============================================================================

describe('CALIBR_SCHEMAS', () => {
  it('should contain all schemas', () => {
    expect(Object.keys(CALIBR_SCHEMAS)).toHaveLength(6);
  });

  it('should map FORECAST to FORECAST_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.FORECAST).toBe(FORECAST_SCHEMA);
  });

  it('should map CALIBRATION to CALIBRATION_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.CALIBRATION).toBe(CALIBRATION_SCHEMA);
  });

  it('should map IDENTITY to IDENTITY_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.IDENTITY).toBe(IDENTITY_SCHEMA);
  });

  it('should map SUPERFORECASTER to SUPERFORECASTER_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.SUPERFORECASTER).toBe(SUPERFORECASTER_SCHEMA);
  });

  it('should map REPUTATION to REPUTATION_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.REPUTATION).toBe(REPUTATION_SCHEMA);
  });

  it('should map PRIVATE_DATA to PRIVATE_DATA_SCHEMA', () => {
    expect(CALIBR_SCHEMAS.PRIVATE_DATA).toBe(PRIVATE_DATA_SCHEMA);
  });
});

// =============================================================================
// DEFAULT_PRIVACY_PREFERENCES Tests
// =============================================================================

describe('DEFAULT_PRIVACY_PREFERENCES', () => {
  it('should have profileVisibility set to PUBLIC', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.profileVisibility).toBe('PUBLIC');
  });

  it('should show on leaderboard by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.showOnLeaderboard).toBe(true);
  });

  it('should hide wallet address by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.showWalletAddress).toBe(false);
  });

  it('should have default forecast privacy as PUBLIC', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.defaultForecastPrivacy).toBe('PUBLIC');
  });

  it('should not share reasoning publicly by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.shareReasoningPublicly).toBe(false);
  });

  it('should not use offchain attestations by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.useOffchainAttestations).toBe(false);
  });

  it('should not use private data attestations by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.usePrivateDataAttestations).toBe(false);
  });

  it('should allow reputation export by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.allowReputationExport).toBe(true);
  });

  it('should allow data aggregation by default', () => {
    expect(DEFAULT_PRIVACY_PREFERENCES.allowDataAggregation).toBe(true);
  });

  it('should have all required privacy preference keys', () => {
    const expectedKeys = [
      'profileVisibility',
      'showOnLeaderboard',
      'showWalletAddress',
      'defaultForecastPrivacy',
      'shareReasoningPublicly',
      'useOffchainAttestations',
      'usePrivateDataAttestations',
      'allowReputationExport',
      'allowDataAggregation',
    ];
    expect(Object.keys(DEFAULT_PRIVACY_PREFERENCES).sort()).toEqual(expectedKeys.sort());
  });
});

// =============================================================================
// Schema String Format Tests
// =============================================================================

describe('Schema String Formats', () => {
  const allSchemas = [
    FORECAST_SCHEMA,
    CALIBRATION_SCHEMA,
    IDENTITY_SCHEMA,
    SUPERFORECASTER_SCHEMA,
    REPUTATION_SCHEMA,
    PRIVATE_DATA_SCHEMA,
  ];

  it('all schemas should have valid schema string format', () => {
    const validTypes = ['uint256', 'string', 'bool', 'bytes32', 'address', 'bytes'];

    for (const schema of allSchemas) {
      const fields = schema.schema.split(',');
      for (const field of fields) {
        const parts = field.trim().split(' ');
        expect(parts.length).toBe(2);
        expect(validTypes.some(type => parts[0] === type)).toBe(true);
      }
    }
  });

  it('all schemas should have non-empty names', () => {
    for (const schema of allSchemas) {
      expect(schema.name.length).toBeGreaterThan(0);
      expect(schema.name.startsWith('Calibr')).toBe(true);
    }
  });

  it('all schemas should have non-empty descriptions', () => {
    for (const schema of allSchemas) {
      expect(schema.description.length).toBeGreaterThan(0);
    }
  });
});
