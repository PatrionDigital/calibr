/**
 * EAS Schema Encoder Tests
 * Tests for attestation data encoding and decoding
 */

import { describe, it, expect } from 'vitest';
import {
  encodeForecastData,
  encodeCalibrationData,
  encodeIdentityData,
  encodeSuperforecasterData,
  encodeReputationData,
  encodePrivateData,
  decodeForecastData,
  decodeCalibrationData,
  SCHEMA_STRINGS,
} from '../../src/eas/schema-encoder';

describe('Schema Strings', () => {
  it('should have valid forecast schema', () => {
    expect(SCHEMA_STRINGS.FORECAST).toContain('probability');
    expect(SCHEMA_STRINGS.FORECAST).toContain('marketId');
    expect(SCHEMA_STRINGS.FORECAST).toContain('platform');
    expect(SCHEMA_STRINGS.FORECAST).toContain('confidence');
    expect(SCHEMA_STRINGS.FORECAST).toContain('reasoning');
    expect(SCHEMA_STRINGS.FORECAST).toContain('isPublic');
  });

  it('should have valid calibration schema', () => {
    expect(SCHEMA_STRINGS.CALIBRATION).toContain('brierScore');
    expect(SCHEMA_STRINGS.CALIBRATION).toContain('totalForecasts');
    expect(SCHEMA_STRINGS.CALIBRATION).toContain('timeWeightedScore');
    expect(SCHEMA_STRINGS.CALIBRATION).toContain('period');
    expect(SCHEMA_STRINGS.CALIBRATION).toContain('category');
  });

  it('should have valid identity schema', () => {
    expect(SCHEMA_STRINGS.IDENTITY).toContain('platform');
    expect(SCHEMA_STRINGS.IDENTITY).toContain('platformUserId');
    expect(SCHEMA_STRINGS.IDENTITY).toContain('proofHash');
    expect(SCHEMA_STRINGS.IDENTITY).toContain('verified');
    expect(SCHEMA_STRINGS.IDENTITY).toContain('verifiedAt');
  });

  it('should have valid superforecaster schema', () => {
    expect(SCHEMA_STRINGS.SUPERFORECASTER).toContain('tier');
    expect(SCHEMA_STRINGS.SUPERFORECASTER).toContain('score');
    expect(SCHEMA_STRINGS.SUPERFORECASTER).toContain('period');
    expect(SCHEMA_STRINGS.SUPERFORECASTER).toContain('category');
    expect(SCHEMA_STRINGS.SUPERFORECASTER).toContain('rank');
  });

  it('should have valid reputation schema', () => {
    expect(SCHEMA_STRINGS.REPUTATION).toContain('platform');
    expect(SCHEMA_STRINGS.REPUTATION).toContain('totalVolume');
    expect(SCHEMA_STRINGS.REPUTATION).toContain('winRate');
    expect(SCHEMA_STRINGS.REPUTATION).toContain('profitLoss');
    expect(SCHEMA_STRINGS.REPUTATION).toContain('verificationLevel');
  });

  it('should have valid private data schema', () => {
    expect(SCHEMA_STRINGS.PRIVATE_DATA).toContain('merkleRoot');
    expect(SCHEMA_STRINGS.PRIVATE_DATA).toContain('dataType');
    expect(SCHEMA_STRINGS.PRIVATE_DATA).toContain('fieldCount');
  });
});

describe('Forecast Encoding', () => {
  const sampleForecast = {
    probability: 75,
    marketId: 'polymarket-election-2024',
    platform: 'POLYMARKET',
    confidence: 80,
    reasoning: 'Based on polling data',
    isPublic: true,
  };

  it('should encode forecast data', () => {
    const encoded = encodeForecastData(sampleForecast);

    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should encode and decode forecast data symmetrically', () => {
    const encoded = encodeForecastData(sampleForecast);
    const decoded = decodeForecastData(encoded);

    expect(decoded.probability).toBe(sampleForecast.probability);
    expect(decoded.marketId).toBe(sampleForecast.marketId);
    expect(decoded.platform).toBe(sampleForecast.platform);
    expect(decoded.confidence).toBe(sampleForecast.confidence);
    expect(decoded.reasoning).toBe(sampleForecast.reasoning);
    expect(decoded.isPublic).toBe(sampleForecast.isPublic);
  });

  it('should handle edge case probabilities', () => {
    const lowProb = { ...sampleForecast, probability: 1 };
    const highProb = { ...sampleForecast, probability: 99 };

    const encodedLow = encodeForecastData(lowProb);
    const encodedHigh = encodeForecastData(highProb);

    const decodedLow = decodeForecastData(encodedLow);
    const decodedHigh = decodeForecastData(encodedHigh);

    expect(decodedLow.probability).toBe(1);
    expect(decodedHigh.probability).toBe(99);
  });

  it('should handle empty reasoning', () => {
    const noReasoning = { ...sampleForecast, reasoning: '' };
    const encoded = encodeForecastData(noReasoning);
    const decoded = decodeForecastData(encoded);

    expect(decoded.reasoning).toBe('');
  });

  it('should handle long reasoning text', () => {
    const longReasoning = {
      ...sampleForecast,
      reasoning: 'A'.repeat(1000),
    };
    const encoded = encodeForecastData(longReasoning);
    const decoded = decodeForecastData(encoded);

    expect(decoded.reasoning).toBe(longReasoning.reasoning);
  });
});

describe('Calibration Encoding', () => {
  const sampleCalibration = {
    brierScore: 2500, // 0.25 scaled by 10000
    totalForecasts: 100,
    timeWeightedScore: 2200,
    period: 1700000000,
    category: 'POLITICS',
  };

  it('should encode calibration data', () => {
    const encoded = encodeCalibrationData(sampleCalibration);

    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should encode and decode calibration data symmetrically', () => {
    const encoded = encodeCalibrationData(sampleCalibration);
    const decoded = decodeCalibrationData(encoded);

    expect(decoded.brierScore).toBe(sampleCalibration.brierScore);
    expect(decoded.totalForecasts).toBe(sampleCalibration.totalForecasts);
    expect(decoded.timeWeightedScore).toBe(sampleCalibration.timeWeightedScore);
    expect(decoded.period).toBe(sampleCalibration.period);
    expect(decoded.category).toBe(sampleCalibration.category);
  });

  it('should handle perfect Brier score', () => {
    const perfect = { ...sampleCalibration, brierScore: 0 };
    const encoded = encodeCalibrationData(perfect);
    const decoded = decodeCalibrationData(encoded);

    expect(decoded.brierScore).toBe(0);
  });

  it('should handle worst Brier score', () => {
    const worst = { ...sampleCalibration, brierScore: 10000 }; // 1.0 scaled
    const encoded = encodeCalibrationData(worst);
    const decoded = decodeCalibrationData(encoded);

    expect(decoded.brierScore).toBe(10000);
  });
});

describe('Identity Encoding', () => {
  const sampleIdentity = {
    platform: 'LIMITLESS',
    platformUserId: 'user-123-abc',
    proofHash: ('0x' + 'ab'.repeat(32)) as `0x${string}`,
    verified: true,
    verifiedAt: 1700000000,
  };

  it('should encode identity data', () => {
    const encoded = encodeIdentityData(sampleIdentity);

    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should handle different platforms', () => {
    const platforms = ['POLYMARKET', 'LIMITLESS', 'MANIFOLD', 'KALSHI'];

    for (const platform of platforms) {
      const identity = { ...sampleIdentity, platform };
      const encoded = encodeIdentityData(identity);
      expect(encoded).toBeTruthy();
    }
  });

  it('should handle unverified identity', () => {
    const unverified = { ...sampleIdentity, verified: false, verifiedAt: 0 };
    const encoded = encodeIdentityData(unverified);
    expect(encoded).toBeTruthy();
  });
});

describe('Superforecaster Encoding', () => {
  const sampleSuperforecaster = {
    tier: 'EXPERT' as const,
    score: 1500, // Scaled score
    period: 1700000000,
    category: 'POLITICS',
    rank: 42,
  };

  it('should encode superforecaster data', () => {
    const encoded = encodeSuperforecasterData(sampleSuperforecaster);

    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should handle all tier levels', () => {
    const tiers = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'] as const;

    for (const tier of tiers) {
      const data = { ...sampleSuperforecaster, tier };
      const encoded = encodeSuperforecasterData(data);
      expect(encoded).toBeTruthy();
    }
  });
});

describe('Reputation Encoding', () => {
  const sampleReputation = {
    platform: 'POLYMARKET',
    totalVolume: 1000000, // $10,000 in cents
    winRate: 6500, // 65%
    profitLoss: 50000, // $500 profit
    verificationLevel: 'VERIFIED',
  };

  it('should encode reputation data', () => {
    const encoded = encodeReputationData(sampleReputation);

    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should reject negative profit/loss (uint256 constraint)', () => {
    // Note: uint256 cannot handle negative values
    // In practice, we'd use signed representation or separate fields for gains/losses
    const loss = { ...sampleReputation, profitLoss: -50000 };

    expect(() => encodeReputationData(loss)).toThrow();
  });
});

describe('Private Data Encoding', () => {
  it('should encode private data with merkle root', () => {
    const merkleRoot = ('0x' + 'ab'.repeat(32)) as `0x${string}`;
    const encoded = encodePrivateData(merkleRoot, 'FORECAST', 6);

    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('0x')).toBe(true);
  });

  it('should handle different data types', () => {
    const merkleRoot = ('0x' + '12'.repeat(32)) as `0x${string}`;
    const dataTypes = ['FORECAST', 'IDENTITY', 'CALIBRATION', 'REPUTATION'];

    for (const dataType of dataTypes) {
      const encoded = encodePrivateData(merkleRoot, dataType, 5);
      expect(encoded).toBeTruthy();
    }
  });

  it('should handle various field counts', () => {
    const merkleRoot = ('0x' + '34'.repeat(32)) as `0x${string}`;
    const fieldCounts = [1, 5, 10, 100];

    for (const fieldCount of fieldCounts) {
      const encoded = encodePrivateData(merkleRoot, 'TEST', fieldCount);
      expect(encoded).toBeTruthy();
    }
  });
});
