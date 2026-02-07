/**
 * EAS Utility Tests
 *
 * Tests for EAS helper functions:
 * - getEASConfig
 * - getForecastSchemaUid
 * - getAttestationUrl
 * - getSchemaUrl
 * - encodeForecastData
 * - encodeForecastDataABI
 * - computeSchemaUid
 */

import { describe, it, expect } from 'vitest';
import {
  EAS_CONTRACTS,
  SCHEMA_UIDS,
  FORECAST_SCHEMA,
  getEASConfig,
  getForecastSchemaUid,
  getAttestationUrl,
  getSchemaUrl,
  encodeForecastData,
  encodeForecastDataABI,
  computeSchemaUid,
  type ForecastAttestationData,
} from './eas';

// =============================================================================
// Tests
// =============================================================================

describe('EAS constants', () => {
  describe('EAS_CONTRACTS', () => {
    it('has base mainnet config', () => {
      expect(EAS_CONTRACTS.base.chainId).toBe(8453);
      expect(EAS_CONTRACTS.base.eas).toBe('0x4200000000000000000000000000000000000021');
      expect(EAS_CONTRACTS.base.schemaRegistry).toBe('0x4200000000000000000000000000000000000020');
      expect(EAS_CONTRACTS.base.easScanUrl).toBe('https://base.easscan.org');
    });

    it('has base sepolia config', () => {
      expect(EAS_CONTRACTS.baseSepolia.chainId).toBe(84532);
      expect(EAS_CONTRACTS.baseSepolia.eas).toBe('0x4200000000000000000000000000000000000021');
      expect(EAS_CONTRACTS.baseSepolia.schemaRegistry).toBe('0x4200000000000000000000000000000000000020');
      expect(EAS_CONTRACTS.baseSepolia.easScanUrl).toBe('https://base-sepolia.easscan.org');
    });
  });

  describe('SCHEMA_UIDS', () => {
    it('has base sepolia forecast schema', () => {
      expect(SCHEMA_UIDS.baseSepolia.forecast).toBe(
        '0xbeebd6600cf48d34e814e0aa0feb1f2bebd547a972963796e03c14d1ab4ef5a1'
      );
    });

    it('has base sepolia calibration schema', () => {
      expect(SCHEMA_UIDS.baseSepolia.calibration).toBe(
        '0xd44c6125a33083aec2cf763b785bc865b2bb4b837902289bbbd72dfb544ba579'
      );
    });

    it('has undefined base mainnet schemas (not yet deployed)', () => {
      expect(SCHEMA_UIDS.base.forecast).toBeUndefined();
      expect(SCHEMA_UIDS.base.calibration).toBeUndefined();
    });
  });

  describe('FORECAST_SCHEMA', () => {
    it('has correct schema string', () => {
      expect(FORECAST_SCHEMA).toBe(
        'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic'
      );
    });
  });
});

describe('getEASConfig', () => {
  it('returns base mainnet config for chain 8453', () => {
    const config = getEASConfig(8453);
    expect(config.chainId).toBe(8453);
    expect(config.easScanUrl).toBe('https://base.easscan.org');
  });

  it('returns base sepolia config for chain 84532', () => {
    const config = getEASConfig(84532);
    expect(config.chainId).toBe(84532);
    expect(config.easScanUrl).toBe('https://base-sepolia.easscan.org');
  });

  it('throws for unsupported chain', () => {
    expect(() => getEASConfig(1)).toThrow('Unsupported chain ID: 1');
    expect(() => getEASConfig(137)).toThrow('Unsupported chain ID: 137');
  });
});

describe('getForecastSchemaUid', () => {
  it('returns base sepolia schema UID for chain 84532', () => {
    const uid = getForecastSchemaUid(84532);
    expect(uid).toBe(SCHEMA_UIDS.baseSepolia.forecast);
  });

  it('returns undefined for base mainnet (not deployed)', () => {
    const uid = getForecastSchemaUid(8453);
    expect(uid).toBeUndefined();
  });

  it('returns undefined for unsupported chain', () => {
    const uid = getForecastSchemaUid(1);
    expect(uid).toBeUndefined();
  });
});

describe('getAttestationUrl', () => {
  const testUid = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  it('generates base sepolia URL by default', () => {
    const url = getAttestationUrl(testUid);
    expect(url).toBe(`https://base-sepolia.easscan.org/attestation/view/${testUid}`);
  });

  it('generates base mainnet URL for chain 8453', () => {
    const url = getAttestationUrl(testUid, 8453);
    expect(url).toBe(`https://base.easscan.org/attestation/view/${testUid}`);
  });

  it('generates base sepolia URL for chain 84532', () => {
    const url = getAttestationUrl(testUid, 84532);
    expect(url).toBe(`https://base-sepolia.easscan.org/attestation/view/${testUid}`);
  });
});

describe('getSchemaUrl', () => {
  const testSchemaUid = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

  it('generates base sepolia URL by default', () => {
    const url = getSchemaUrl(testSchemaUid);
    expect(url).toBe(`https://base-sepolia.easscan.org/schema/view/${testSchemaUid}`);
  });

  it('generates base mainnet URL for chain 8453', () => {
    const url = getSchemaUrl(testSchemaUid, 8453);
    expect(url).toBe(`https://base.easscan.org/schema/view/${testSchemaUid}`);
  });
});

describe('encodeForecastData', () => {
  const sampleData: ForecastAttestationData = {
    probability: 7525, // 75.25%
    marketId: 'market-123',
    platform: 'polymarket',
    confidence: 8000, // 80%
    reasoning: 'Based on historical data',
    isPublic: true,
  };

  it('returns hex string starting with 0x', () => {
    const encoded = encodeForecastData(sampleData);
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('encodes different data differently', () => {
    const data1 = { ...sampleData, probability: 5000 };
    const data2 = { ...sampleData, probability: 7500 };
    const encoded1 = encodeForecastData(data1);
    const encoded2 = encodeForecastData(data2);
    expect(encoded1).not.toBe(encoded2);
  });

  it('handles empty reasoning', () => {
    const data = { ...sampleData, reasoning: '' };
    const encoded = encodeForecastData(data);
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('handles isPublic false', () => {
    const data = { ...sampleData, isPublic: false };
    const encoded = encodeForecastData(data);
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('handles zero probability', () => {
    const data = { ...sampleData, probability: 0 };
    const encoded = encodeForecastData(data);
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('handles max probability', () => {
    const data = { ...sampleData, probability: 10000 };
    const encoded = encodeForecastData(data);
    expect(encoded.startsWith('0x')).toBe(true);
  });
});

describe('encodeForecastDataABI', () => {
  const sampleData: ForecastAttestationData = {
    probability: 7525,
    marketId: 'market-123',
    platform: 'polymarket',
    confidence: 8000,
    reasoning: 'Based on historical data',
    isPublic: true,
  };

  it('returns hex string starting with 0x', () => {
    const encoded = encodeForecastDataABI(sampleData);
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('encodes to valid hex characters', () => {
    const encoded = encodeForecastDataABI(sampleData);
    const hexPart = encoded.slice(2);
    expect(/^[0-9a-f]*$/i.test(hexPart)).toBe(true);
  });

  it('encodes different data differently', () => {
    const data1 = { ...sampleData, probability: 5000 };
    const data2 = { ...sampleData, probability: 7500 };
    const encoded1 = encodeForecastDataABI(data1);
    const encoded2 = encodeForecastDataABI(data2);
    expect(encoded1).not.toBe(encoded2);
  });
});

describe('computeSchemaUid', () => {
  it('returns hex string starting with 0x', () => {
    const uid = computeSchemaUid(FORECAST_SCHEMA);
    expect(uid.startsWith('0x')).toBe(true);
  });

  it('returns 66-character hex string (32 bytes + 0x)', () => {
    const uid = computeSchemaUid(FORECAST_SCHEMA);
    expect(uid.length).toBe(66);
  });

  it('returns consistent output for same input', () => {
    const uid1 = computeSchemaUid(FORECAST_SCHEMA);
    const uid2 = computeSchemaUid(FORECAST_SCHEMA);
    expect(uid1).toBe(uid2);
  });

  it('returns different output for different schemas', () => {
    const uid1 = computeSchemaUid('uint256 value');
    const uid2 = computeSchemaUid('string name');
    expect(uid1).not.toBe(uid2);
  });

  it('uses default resolver and revocable', () => {
    const uid1 = computeSchemaUid(FORECAST_SCHEMA);
    const uid2 = computeSchemaUid(
      FORECAST_SCHEMA,
      '0x0000000000000000000000000000000000000000',
      true
    );
    expect(uid1).toBe(uid2);
  });

  it('produces different UID with different resolver', () => {
    const uid1 = computeSchemaUid(FORECAST_SCHEMA);
    const uid2 = computeSchemaUid(
      FORECAST_SCHEMA,
      '0x1234567890123456789012345678901234567890'
    );
    expect(uid1).not.toBe(uid2);
  });

  it('produces different UID with revocable false', () => {
    const uid1 = computeSchemaUid(FORECAST_SCHEMA);
    const uid2 = computeSchemaUid(
      FORECAST_SCHEMA,
      '0x0000000000000000000000000000000000000000',
      false
    );
    expect(uid1).not.toBe(uid2);
  });
});
