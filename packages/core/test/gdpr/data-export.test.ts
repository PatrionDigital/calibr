/**
 * GDPR Data Export Tests (Phase 7.2.1)
 * TDD: Tests for data export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EXPORT_VERSION,
  formatExportDate,
  createExportMetadata,
  sanitizeUserForExport,
  formatPrivacySettings,
  formatCalibration,
  formatWallet,
  formatForecast,
  formatPosition,
  formatTransaction,
  formatAttestation,
  buildUserExport,
} from '../../src/gdpr/data-export';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockUser = {
  id: 'user_123',
  displayName: 'TestUser',
  email: 'test@example.com',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-06-20T15:30:00Z'),
};

const mockPrivacySettings = {
  profileVisibility: 'PUBLIC',
  showOnLeaderboard: true,
  showWalletAddress: false,
  defaultForecastPrivacy: 'PUBLIC',
  shareReasoningPublicly: true,
};

const mockCalibration = {
  avgBrierScore: 0.15,
  totalForecasts: 50,
  resolvedForecasts: 30,
  currentTier: 'EXPERT',
  globalRank: 42,
};

const mockWallet = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: 8453,
  label: 'Main Wallet',
  verifiedAt: new Date('2024-02-01T12:00:00Z'),
};

const mockForecast = {
  id: 'forecast_123',
  probability: 0.75,
  confidence: 0.8,
  commitMessage: 'Initial forecast based on polling data',
  createdAt: new Date('2024-03-01T09:00:00Z'),
  updatedAt: new Date('2024-03-05T14:00:00Z'),
  isPublic: true,
  easAttestationUid: '0xabc123',
  unifiedMarket: { question: 'Will event X happen by 2025?' },
};

const mockPosition = {
  id: 'position_123',
  platform: 'POLYMARKET',
  outcome: 'YES',
  shares: 100,
  avgCostBasis: 0.65,
  currentValue: 75,
  unrealizedPnl: 10,
  createdAt: new Date('2024-04-01T10:00:00Z'),
  platformMarket: { question: 'Will event Y occur?' },
};

const mockTransaction = {
  id: 'tx_123',
  type: 'BUY',
  platform: 'POLYMARKET',
  outcome: 'YES',
  shares: 50,
  pricePerShare: 0.60,
  totalCost: 30,
  fees: 0.15,
  status: 'CONFIRMED',
  createdAt: new Date('2024-04-01T10:05:00Z'),
  txHash: '0xdef456',
};

const mockAttestation = {
  uid: '0xattest123',
  schemaName: 'Forecast',
  createdAt: new Date('2024-03-01T09:00:00Z'),
  revoked: false,
  isOffchain: false,
  isPrivate: false,
};

// =============================================================================
// Format Date Tests
// =============================================================================

describe('formatExportDate', () => {
  it('should format a valid date to ISO 8601', () => {
    const date = new Date('2024-06-15T10:30:00Z');
    expect(formatExportDate(date)).toBe('2024-06-15T10:30:00.000Z');
  });

  it('should return empty string for null', () => {
    expect(formatExportDate(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatExportDate(undefined)).toBe('');
  });
});

// =============================================================================
// Export Metadata Tests
// =============================================================================

describe('createExportMetadata', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should include export version', () => {
    const metadata = createExportMetadata();
    expect(metadata.exportVersion).toBe(EXPORT_VERSION);
  });

  it('should include current timestamp', () => {
    const metadata = createExportMetadata();
    expect(metadata.exportedAt).toBe('2024-06-20T12:00:00.000Z');
  });
});

// =============================================================================
// User Sanitization Tests
// =============================================================================

describe('sanitizeUserForExport', () => {
  it('should include id, displayName, email', () => {
    const result = sanitizeUserForExport(mockUser);

    expect(result.id).toBe('user_123');
    expect(result.displayName).toBe('TestUser');
    expect(result.email).toBe('test@example.com');
  });

  it('should format dates as ISO strings', () => {
    const result = sanitizeUserForExport(mockUser);

    expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2024-06-20T15:30:00.000Z');
  });

  it('should handle null displayName', () => {
    const user = { ...mockUser, displayName: null };
    const result = sanitizeUserForExport(user);

    expect(result.displayName).toBeNull();
  });
});

// =============================================================================
// Privacy Settings Tests
// =============================================================================

describe('formatPrivacySettings', () => {
  it('should return null for null input', () => {
    expect(formatPrivacySettings(null)).toBeNull();
  });

  it('should format all privacy settings', () => {
    const result = formatPrivacySettings(mockPrivacySettings);

    expect(result).toEqual({
      profileVisibility: 'PUBLIC',
      showOnLeaderboard: true,
      showWalletAddress: false,
      defaultForecastPrivacy: 'PUBLIC',
      shareReasoningPublicly: true,
    });
  });
});

// =============================================================================
// Calibration Tests
// =============================================================================

describe('formatCalibration', () => {
  it('should return null for null input', () => {
    expect(formatCalibration(null)).toBeNull();
  });

  it('should format calibration data', () => {
    const result = formatCalibration(mockCalibration);

    expect(result).toEqual({
      avgBrierScore: 0.15,
      totalForecasts: 50,
      resolvedForecasts: 30,
      currentTier: 'EXPERT',
      globalRank: 42,
    });
  });

  it('should handle null brier score', () => {
    const calibration = { ...mockCalibration, avgBrierScore: null };
    const result = formatCalibration(calibration);

    expect(result?.avgBrierScore).toBeNull();
  });
});

// =============================================================================
// Wallet Tests
// =============================================================================

describe('formatWallet', () => {
  it('should format wallet data', () => {
    const result = formatWallet(mockWallet);

    expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(result.chainId).toBe(8453);
    expect(result.label).toBe('Main Wallet');
    expect(result.verifiedAt).toBe('2024-02-01T12:00:00.000Z');
  });

  it('should handle null verifiedAt', () => {
    const wallet = { ...mockWallet, verifiedAt: null };
    const result = formatWallet(wallet);

    expect(result.verifiedAt).toBe('');
  });
});

// =============================================================================
// Forecast Tests
// =============================================================================

describe('formatForecast', () => {
  it('should format forecast with all fields', () => {
    const result = formatForecast(mockForecast);

    expect(result.id).toBe('forecast_123');
    expect(result.marketQuestion).toBe('Will event X happen by 2025?');
    expect(result.probability).toBe(0.75);
    expect(result.confidence).toBe(0.8);
    expect(result.commitMessage).toBe('Initial forecast based on polling data');
    expect(result.isPublic).toBe(true);
    expect(result.easAttestationUid).toBe('0xabc123');
  });

  it('should handle null unifiedMarket', () => {
    const forecast = { ...mockForecast, unifiedMarket: null };
    const result = formatForecast(forecast);

    expect(result.marketQuestion).toBe('Unknown');
  });
});

// =============================================================================
// Position Tests
// =============================================================================

describe('formatPosition', () => {
  it('should format position with all fields', () => {
    const result = formatPosition(mockPosition);

    expect(result.id).toBe('position_123');
    expect(result.platform).toBe('POLYMARKET');
    expect(result.marketQuestion).toBe('Will event Y occur?');
    expect(result.outcome).toBe('YES');
    expect(result.shares).toBe(100);
    expect(result.avgCostBasis).toBe(0.65);
    expect(result.currentValue).toBe(75);
    expect(result.unrealizedPnl).toBe(10);
  });

  it('should handle null platformMarket', () => {
    const position = { ...mockPosition, platformMarket: null };
    const result = formatPosition(position);

    expect(result.marketQuestion).toBe('Unknown');
  });
});

// =============================================================================
// Transaction Tests
// =============================================================================

describe('formatTransaction', () => {
  it('should format transaction with all fields', () => {
    const result = formatTransaction(mockTransaction);

    expect(result.id).toBe('tx_123');
    expect(result.type).toBe('BUY');
    expect(result.platform).toBe('POLYMARKET');
    expect(result.shares).toBe(50);
    expect(result.pricePerShare).toBe(0.60);
    expect(result.totalCost).toBe(30);
    expect(result.fees).toBe(0.15);
    expect(result.status).toBe('CONFIRMED');
    expect(result.txHash).toBe('0xdef456');
  });

  it('should handle null txHash', () => {
    const tx = { ...mockTransaction, txHash: null };
    const result = formatTransaction(tx);

    expect(result.txHash).toBeNull();
  });
});

// =============================================================================
// Attestation Tests
// =============================================================================

describe('formatAttestation', () => {
  it('should format attestation with all fields', () => {
    const result = formatAttestation(mockAttestation);

    expect(result.uid).toBe('0xattest123');
    expect(result.schemaName).toBe('Forecast');
    expect(result.revoked).toBe(false);
    expect(result.isOffchain).toBe(false);
    expect(result.isPrivate).toBe(false);
  });

  it('should handle revoked attestation', () => {
    const attestation = { ...mockAttestation, revoked: true };
    const result = formatAttestation(attestation);

    expect(result.revoked).toBe(true);
  });
});

// =============================================================================
// Full Export Tests
// =============================================================================

describe('buildUserExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should build complete export with all data', () => {
    const result = buildUserExport({
      user: mockUser,
      privacySettings: mockPrivacySettings,
      calibration: mockCalibration,
      wallets: [mockWallet],
      forecasts: [mockForecast],
      positions: [mockPosition],
      transactions: [mockTransaction],
      attestations: [mockAttestation],
    });

    expect(result.exportVersion).toBe(EXPORT_VERSION);
    expect(result.exportedAt).toBe('2024-06-20T12:00:00.000Z');
    expect(result.user.id).toBe('user_123');
    expect(result.privacySettings?.profileVisibility).toBe('PUBLIC');
    expect(result.calibration?.currentTier).toBe('EXPERT');
    expect(result.wallets).toHaveLength(1);
    expect(result.forecasts).toHaveLength(1);
    expect(result.positions).toHaveLength(1);
    expect(result.transactions).toHaveLength(1);
    expect(result.attestations).toHaveLength(1);
  });

  it('should handle empty arrays', () => {
    const result = buildUserExport({
      user: mockUser,
      privacySettings: null,
      calibration: null,
      wallets: [],
      forecasts: [],
      positions: [],
      transactions: [],
      attestations: [],
    });

    expect(result.privacySettings).toBeNull();
    expect(result.calibration).toBeNull();
    expect(result.wallets).toHaveLength(0);
    expect(result.forecasts).toHaveLength(0);
  });

  it('should handle multiple items in arrays', () => {
    const result = buildUserExport({
      user: mockUser,
      privacySettings: mockPrivacySettings,
      calibration: mockCalibration,
      wallets: [mockWallet, { ...mockWallet, address: '0xother' }],
      forecasts: [mockForecast, { ...mockForecast, id: 'forecast_456' }],
      positions: [],
      transactions: [],
      attestations: [],
    });

    expect(result.wallets).toHaveLength(2);
    expect(result.forecasts).toHaveLength(2);
  });
});
