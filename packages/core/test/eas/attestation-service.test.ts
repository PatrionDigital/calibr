/**
 * Attestation Service Tests
 * Tests for the high-level EAS attestation service class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Signer } from 'ethers';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the EAS SDK functions
const mockAttest = vi.fn();
const mockMultiAttest = vi.fn();
const mockRevoke = vi.fn();
const mockMultiRevoke = vi.fn();
const mockGetAttestation = vi.fn();
const mockIsAttestationValid = vi.fn();
const mockGetOffchain = vi.fn();
const mockConnect = vi.fn().mockReturnThis();

// Create mock EAS and SchemaRegistry classes
const MockEAS = vi.fn().mockImplementation(() => ({
  connect: mockConnect,
  attest: mockAttest,
  multiAttest: mockMultiAttest,
  revoke: mockRevoke,
  multiRevoke: mockMultiRevoke,
  getAttestation: mockGetAttestation,
  isAttestationValid: mockIsAttestationValid,
  getOffchain: mockGetOffchain,
}));

const MockSchemaRegistry = vi.fn().mockImplementation(() => ({
  connect: mockConnect,
}));

// Mock SchemaEncoder for encoding attestation data
const MockSchemaEncoder = vi.fn().mockImplementation(() => ({
  encodeData: vi.fn().mockReturnValue('0xmockencodeddata'),
}));

// Mock the module.createRequire to intercept CommonJS require for eas-sdk
vi.mock('module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('module')>();
  return {
    ...actual,
    createRequire: (url: string) => {
      const realRequire = actual.createRequire(url);
      return (modulePath: string) => {
        if (modulePath === '@ethereum-attestation-service/eas-sdk') {
          return {
            EAS: MockEAS,
            SchemaRegistry: MockSchemaRegistry,
            SchemaEncoder: MockSchemaEncoder,
          };
        }
        return realRequire(modulePath);
      };
    },
  };
});

// Mock the config module
vi.mock('../../src/eas/config', () => ({
  getEASConfig: vi.fn(() => ({
    EAS_CONTRACT: '0x4200000000000000000000000000000000000021',
    SCHEMA_REGISTRY: '0x4200000000000000000000000000000000000020',
    chainId: 84532,
    easScanUrl: 'https://base-sepolia.easscan.org',
  })),
  getDeployedSchemas: vi.fn(() => ({
    FORECAST_SCHEMA_UID: '0xforecast0000000000000000000000000000000000000000000000000000000',
    CALIBRATION_SCHEMA_UID: '0xcalibration000000000000000000000000000000000000000000000000000',
    IDENTITY_SCHEMA_UID: '0xidentity0000000000000000000000000000000000000000000000000000000',
    SUPERFORECASTER_SCHEMA_UID: '0xsuper000000000000000000000000000000000000000000000000000000000',
    REPUTATION_SCHEMA_UID: '0xreputation00000000000000000000000000000000000000000000000000000',
    PRIVATE_DATA_SCHEMA_UID: '0xprivate00000000000000000000000000000000000000000000000000000000',
  })),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_UID = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
const MOCK_TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`;
const MOCK_RECIPIENT = '0x1234567890123456789012345678901234567890' as `0x${string}`;

const createMockSigner = (): Signer =>
  ({
    getAddress: vi.fn().mockResolvedValue(MOCK_RECIPIENT),
    signMessage: vi.fn().mockResolvedValue('0xsignature'),
    signTypedData: vi.fn().mockResolvedValue('0xsignature'),
  }) as unknown as Signer;

const createForecastData = () => ({
  probability: 7500,
  marketId: 'market-123',
  platform: 'POLYMARKET',
  confidence: 80,
  reasoning: 'Analysis based on data',
  isPublic: true,
});

// Matches CalibrationAttestationData type
const createCalibrationData = () => ({
  brierScore: 2500, // 0.25 scaled by 10000
  totalForecasts: 100,
  timeWeightedScore: 2800, // Scaled by 10000
  period: Math.floor(Date.now() / 1000),
  category: 'POLITICS',
});

const createIdentityData = () => ({
  platform: 'POLYMARKET',
  platformUserId: 'user123',
  proofHash: ('0x' + 'ab'.repeat(32)) as `0x${string}`,
  verified: true,
  verifiedAt: Math.floor(Date.now() / 1000),
});

// Matches SuperforecasterAttestationData type
const createSuperforecasterData = () => ({
  tier: 'GRANDMASTER' as const,
  score: 9500, // Scaled by 10000
  period: Math.floor(Date.now() / 1000),
  category: 'OVERALL',
  rank: 5,
});

// =============================================================================
// Tests
// =============================================================================

describe('AttestationService', () => {
  let service: Awaited<typeof import('../../src/eas/attestation-service')>['AttestationService'];
  let AttestationService: typeof service;
  let mockSigner: Signer;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamically import the module after mocks are set up
    const module = await import('../../src/eas/attestation-service');
    AttestationService = module.AttestationService;

    mockSigner = createMockSigner();

    // Default mock return for attest
    mockAttest.mockResolvedValue({
      wait: vi.fn().mockResolvedValue(MOCK_UID),
      tx: { hash: MOCK_TX_HASH },
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('constructor', () => {
    it('creates service with valid config', () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });
      expect(svc).toBeDefined();
    });

    it('initializes EAS with contract address', () => {
      new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });
      expect(MockEAS).toHaveBeenCalledWith('0x4200000000000000000000000000000000000021');
    });

    it('initializes SchemaRegistry with contract address', () => {
      new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });
      expect(MockSchemaRegistry).toHaveBeenCalledWith(
        '0x4200000000000000000000000000000000000020'
      );
    });

    it('connects EAS to signer', () => {
      new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });
      expect(mockConnect).toHaveBeenCalledWith(mockSigner);
    });
  });

  describe('createForecastAttestation', () => {
    it('creates on-chain forecast attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createForecastAttestation({
        recipient: MOCK_RECIPIENT,
        data: createForecastData(),
      });

      expect(result.uid).toBe(MOCK_UID);
      expect(mockAttest).toHaveBeenCalled();
    });

    it('passes correct schema and data to EAS', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createForecastAttestation({
        recipient: MOCK_RECIPIENT,
        data: createForecastData(),
      });

      expect(mockAttest).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.stringMatching(/^0x/),
          data: expect.objectContaining({
            recipient: MOCK_RECIPIENT,
            revocable: true,
            expirationTime: 0n,
          }),
        })
      );
    });

    it('handles off-chain attestation when preference set', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const mockOffchain = {
        signOffchainAttestation: vi.fn().mockResolvedValue({ uid: MOCK_UID }),
      };
      mockGetOffchain.mockResolvedValue(mockOffchain);

      await svc.createForecastAttestation({
        recipient: MOCK_RECIPIENT,
        data: createForecastData(),
        privacyPreferences: {
          useOffchainAttestations: true,
          usePrivateDataAttestations: false,
          disclosableFields: [],
        },
      });

      expect(mockGetOffchain).toHaveBeenCalled();
    });

    it('handles private data attestation when preference set', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createForecastAttestation({
        recipient: MOCK_RECIPIENT,
        data: createForecastData(),
        privacyPreferences: {
          useOffchainAttestations: false,
          usePrivateDataAttestations: true,
          disclosableFields: ['probability', 'marketId'],
        },
      });

      // Private attestations use the private data schema
      expect(mockAttest).toHaveBeenCalled();
    });
  });

  describe('createCalibrationAttestation', () => {
    it('creates calibration attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createCalibrationAttestation({
        recipient: MOCK_RECIPIENT,
        data: createCalibrationData(),
      });

      expect(result.uid).toBe(MOCK_UID);
      expect(mockAttest).toHaveBeenCalled();
    });

    it('sets revocable to false for calibration', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createCalibrationAttestation({
        recipient: MOCK_RECIPIENT,
        data: createCalibrationData(),
      });

      expect(mockAttest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revocable: false,
          }),
        })
      );
    });
  });

  describe('createIdentityAttestation', () => {
    it('creates identity attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createIdentityAttestation({
        recipient: MOCK_RECIPIENT,
        data: createIdentityData(),
      });

      expect(result.uid).toBe(MOCK_UID);
      expect(mockAttest).toHaveBeenCalled();
    });

    it('sets revocable to true for identity', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createIdentityAttestation({
        recipient: MOCK_RECIPIENT,
        data: createIdentityData(),
      });

      expect(mockAttest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revocable: true,
          }),
        })
      );
    });

    it('creates private identity attestation when specified', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createIdentityAttestation({
        recipient: MOCK_RECIPIENT,
        data: createIdentityData(),
        usePrivateData: true,
      });

      expect(mockAttest).toHaveBeenCalled();
    });
  });

  describe('createSuperforecasterAttestation', () => {
    it('creates superforecaster attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createSuperforecasterAttestation({
        recipient: MOCK_RECIPIENT,
        data: createSuperforecasterData(),
      });

      expect(result.uid).toBe(MOCK_UID);
      expect(mockAttest).toHaveBeenCalled();
    });

    it('sets revocable to false for superforecaster badge', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await svc.createSuperforecasterAttestation({
        recipient: MOCK_RECIPIENT,
        data: createSuperforecasterData(),
      });

      expect(mockAttest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            revocable: false,
          }),
        })
      );
    });
  });

  describe('getAttestation', () => {
    it('returns attestation data when found', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockGetAttestation.mockResolvedValue({
        uid: MOCK_UID,
        schema: '0xforecast',
        attester: MOCK_RECIPIENT,
        recipient: MOCK_RECIPIENT,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: '0x1234',
        revocationTime: 0n,
      });

      const result = await svc.getAttestation(MOCK_UID);

      expect(result).not.toBeNull();
      expect(result?.uid).toBe(MOCK_UID);
    });

    it('returns null when attestation not found', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockGetAttestation.mockResolvedValue({
        uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      const result = await svc.getAttestation(MOCK_UID);

      expect(result).toBeNull();
    });

    it('detects revoked attestations', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockGetAttestation.mockResolvedValue({
        uid: MOCK_UID,
        schema: '0xforecast',
        attester: MOCK_RECIPIENT,
        recipient: MOCK_RECIPIENT,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
        data: '0x1234',
        revocationTime: BigInt(1700000000),
      });

      const result = await svc.getAttestation(MOCK_UID);

      expect(result?.revoked).toBe(true);
      expect(result?.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('isAttestationValid', () => {
    it('returns true for valid attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockIsAttestationValid.mockResolvedValue(true);

      const result = await svc.isAttestationValid(MOCK_UID);

      expect(result).toBe(true);
    });

    it('returns false for invalid attestation', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockIsAttestationValid.mockResolvedValue(false);

      const result = await svc.isAttestationValid(MOCK_UID);

      expect(result).toBe(false);
    });
  });

  describe('revokeAttestation', () => {
    it('revokes attestation successfully', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockRevoke.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
        tx: { hash: MOCK_TX_HASH },
      });

      const result = await svc.revokeAttestation(
        '0xschema00000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        MOCK_UID
      );

      expect(mockRevoke).toHaveBeenCalled();
      expect(result.txHash).toBeDefined();
    });
  });

  describe('batch attestations', () => {
    beforeEach(() => {
      mockMultiAttest.mockResolvedValue({
        wait: vi.fn().mockResolvedValue([MOCK_UID, MOCK_UID]),
        tx: { hash: MOCK_TX_HASH },
      });
    });

    it('creates batch forecast attestations', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createBatchForecastAttestations([
        { recipient: MOCK_RECIPIENT, data: createForecastData() },
        { recipient: MOCK_RECIPIENT, data: createForecastData() },
      ]);

      expect(mockMultiAttest).toHaveBeenCalled();
      expect(result.uids).toHaveLength(2);
    });

    it('throws error for empty attestations array', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(svc.createBatchForecastAttestations([])).rejects.toThrow(
        'No attestations provided'
      );
    });

    it('creates batch identity attestations', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createBatchIdentityAttestations([
        { recipient: MOCK_RECIPIENT, data: createIdentityData() },
        { recipient: MOCK_RECIPIENT, data: createIdentityData() },
      ]);

      expect(mockMultiAttest).toHaveBeenCalled();
      expect(result.uids).toHaveLength(2);
    });

    it('filters out private identity attestations from batch', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(
        svc.createBatchIdentityAttestations([
          { recipient: MOCK_RECIPIENT, data: createIdentityData(), usePrivateData: true },
        ])
      ).rejects.toThrow('Batch attestations only support public identity attestations');
    });
  });

  describe('mixed batch attestations', () => {
    beforeEach(() => {
      mockMultiAttest.mockResolvedValue({
        wait: vi.fn().mockResolvedValue([MOCK_UID, MOCK_UID, MOCK_UID]),
        tx: { hash: MOCK_TX_HASH },
      });
    });

    it('creates mixed batch with different attestation types', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const result = await svc.createMixedBatchAttestations({
        forecasts: [{ recipient: MOCK_RECIPIENT, data: createForecastData() }],
        calibrations: [{ recipient: MOCK_RECIPIENT, data: createCalibrationData() }],
        superforecasters: [{ recipient: MOCK_RECIPIENT, data: createSuperforecasterData() }],
      });

      expect(mockMultiAttest).toHaveBeenCalled();
      expect(result.forecastUids).toHaveLength(1);
      expect(result.calibrationUids).toHaveLength(1);
      expect(result.superforecasterUids).toHaveLength(1);
    });

    it('throws error when no valid attestations provided', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(svc.createMixedBatchAttestations({})).rejects.toThrow(
        'No valid attestations to create'
      );
    });
  });

  describe('batch revocation', () => {
    it('revokes multiple attestations', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      mockMultiRevoke.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(undefined),
        tx: { hash: MOCK_TX_HASH },
      });

      const result = await svc.revokeBatchAttestations(
        '0xschema00000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        [MOCK_UID, MOCK_UID]
      );

      expect(mockMultiRevoke).toHaveBeenCalled();
      expect(result.txHash).toBeDefined();
    });

    it('throws error for empty UIDs array', async () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(
        svc.revokeBatchAttestations(
          '0xschema00000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          []
        )
      ).rejects.toThrow('No UIDs provided');
    });
  });

  describe('utility methods', () => {
    it('generates attestation URL', () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const url = svc.getAttestationUrl(MOCK_UID);

      expect(url).toContain(MOCK_UID);
      expect(url).toContain('attestation/view');
    });

    it('generates schema URL', () => {
      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      const schemaUid =
        '0xschema00000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
      const url = svc.getSchemaUrl(schemaUid);

      expect(url).toContain(schemaUid);
      expect(url).toContain('schema/view');
    });
  });

  describe('error handling', () => {
    it('throws when forecast schema not configured', async () => {
      const { getDeployedSchemas } = await import('../../src/eas/config');
      vi.mocked(getDeployedSchemas).mockReturnValueOnce({
        FORECAST_SCHEMA_UID: null,
        CALIBRATION_SCHEMA_UID: null,
        IDENTITY_SCHEMA_UID: null,
        SUPERFORECASTER_SCHEMA_UID: null,
        REPUTATION_SCHEMA_UID: null,
        PRIVATE_DATA_SCHEMA_UID: null,
      });

      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(
        svc.createForecastAttestation({
          recipient: MOCK_RECIPIENT,
          data: createForecastData(),
        })
      ).rejects.toThrow('Forecast schema UID not configured');
    });

    it('throws when calibration schema not configured', async () => {
      const { getDeployedSchemas } = await import('../../src/eas/config');
      vi.mocked(getDeployedSchemas).mockReturnValueOnce({
        FORECAST_SCHEMA_UID: null,
        CALIBRATION_SCHEMA_UID: null,
        IDENTITY_SCHEMA_UID: null,
        SUPERFORECASTER_SCHEMA_UID: null,
        REPUTATION_SCHEMA_UID: null,
        PRIVATE_DATA_SCHEMA_UID: null,
      });

      const svc = new AttestationService({
        chainId: 84532,
        signer: mockSigner,
      });

      await expect(
        svc.createCalibrationAttestation({
          recipient: MOCK_RECIPIENT,
          data: createCalibrationData(),
        })
      ).rejects.toThrow('Calibration schema UID not configured');
    });
  });
});
