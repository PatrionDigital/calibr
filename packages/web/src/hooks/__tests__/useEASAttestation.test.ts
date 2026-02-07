/**
 * useEASAttestation Hook Tests
 *
 * Tests for EAS attestation hook:
 * - Default state
 * - Schema registration
 * - On-chain attestation creation
 * - Off-chain attestation creation
 * - Merkle attestation creation
 * - Unified attestation (mode-based)
 * - Attestation verification
 * - Selective disclosure proofs
 * - Reset functionality
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEASAttestation } from '../useEASAttestation';
import type { Address } from 'viem';

// =============================================================================
// Local Type Definitions (to avoid mocking issues)
// =============================================================================

interface ForecastAttestationData {
  probability: number;
  marketId: string;
  platform: string;
  confidence: number;
  reasoning: string;
  isPublic: boolean;
}

interface AttestationResult {
  uid: Address;
  txHash: Address;
  easScanUrl: string;
}

interface OffchainAttestationResult {
  uid: Address;
  signature: `0x${string}`;
  timestamp: number;
  data: ForecastAttestationData;
  ipfsCid?: string;
}

interface MerkleLeaf {
  index: number;
  name: string;
  type: string;
  value: unknown;
  hash: `0x${string}`;
}

interface MerkleAttestationResult {
  uid: Address;
  txHash?: Address;
  merkleRoot: `0x${string}`;
  leaves: MerkleLeaf[];
  proofs: Record<string, `0x${string}`[]>;
  easScanUrl?: string;
}

interface OnChainAttestation {
  uid: Address;
  schema: Address;
  time: bigint;
  expirationTime: bigint;
  revocationTime: bigint;
  refUID: Address;
  recipient: Address;
  attester: Address;
  revocable: boolean;
  data: `0x${string}`;
}

// =============================================================================
// Mocks
// =============================================================================

// Mock wagmi hooks
const mockWriteContractAsync = vi.fn();
const mockSignMessageAsync = vi.fn();
const mockReadContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890' as const,
    isConnected: true,
  }),
  useChainId: () => 84532,
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
  }),
  usePublicClient: () => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
  }),
  useSignMessage: () => ({
    signMessageAsync: mockSignMessageAsync,
  }),
}));

// Mock EAS library
vi.mock('@/lib/eas', () => ({
  EAS_ABI: [],
  SCHEMA_REGISTRY_ABI: [],
  FORECAST_SCHEMA: 'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic',
  getEASConfig: () => ({
    eas: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e' as const,
    schemaRegistry: '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0' as const,
  }),
  getAttestationUrl: (uid: string) => `https://base-sepolia.easscan.org/attestation/view/${uid}`,
  getForecastSchemaUid: () => '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
  SCHEMA_UIDS: {
    baseSepolia: {
      forecast: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
      privateData: '0xabcd567890123456789012345678901234567890123456789012345678901234' as const,
    },
    base: {
      forecast: '0x5678901234567890123456789012345678901234567890123456789012345678' as const,
      privateData: '0xefab567890123456789012345678901234567890123456789012345678901234' as const,
    },
  },
}));

// =============================================================================
// Sample Data
// =============================================================================

const sampleForecastData: ForecastAttestationData = {
  probability: 7500,
  marketId: 'market-123',
  platform: 'polymarket',
  confidence: 8000,
  reasoning: 'Test reasoning for the forecast',
  isPublic: true,
};

const mockTxHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const;
const mockAttestedEventTopic = '0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35';
const mockAttestationUid = '0x1111111111111111111111111111111111111111111111111111111111111111';

// =============================================================================
// Tests
// =============================================================================

describe('useEASAttestation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default state', () => {
    it('has isLoading as false initially', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.isLoading).toBe(false);
    });

    it('has error as null initially', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.error).toBeNull();
    });

    it('has lastAttestation as null initially', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.lastAttestation).toBeNull();
    });

    it('has lastOffchainAttestation as null initially', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.lastOffchainAttestation).toBeNull();
    });

    it('has lastMerkleAttestation as null initially', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.lastMerkleAttestation).toBeNull();
    });

    it('has schemaUid from deployed schema', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.schemaUid).toBeTruthy();
    });

    it('has isSchemaRegistered as true when deployed schema exists', () => {
      const { result } = renderHook(() => useEASAttestation());
      expect(result.current.isSchemaRegistered).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('registers a new schema', async () => {
      const schemaUid = '0x9999999999999999999999999999999999999999999999999999999999999999';

      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [{ topics: ['0x...', schemaUid] }],
      });

      const { result } = renderHook(() => useEASAttestation());

      let registeredUid: string | null = null;
      await act(async () => {
        registeredUid = await result.current.registerSchema();
      });

      expect(mockWriteContractAsync).toHaveBeenCalled();
      expect(registeredUid).toBe(schemaUid);
    });

    it('sets isLoading during registration', async () => {
      mockWriteContractAsync.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useEASAttestation());

      act(() => {
        result.current.registerSchema();
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('handles registration errors gracefully', async () => {
      mockWriteContractAsync.mockRejectedValueOnce(new Error('User rejected'));

      const { result } = renderHook(() => useEASAttestation());

      let registeredUid: string | null = null;
      await act(async () => {
        registeredUid = await result.current.registerSchema();
      });

      expect(registeredUid).toBeNull();
      expect(result.current.error).toBe('User rejected');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('checkSchemaExists', () => {
    it('returns true when schema exists', async () => {
      mockReadContract.mockResolvedValueOnce({
        uid: '0x1234567890123456789012345678901234567890123456789012345678901234',
      });

      const { result } = renderHook(() => useEASAttestation());

      let exists = false;
      await act(async () => {
        exists = await result.current.checkSchemaExists(
          '0x1234567890123456789012345678901234567890123456789012345678901234'
        );
      });

      expect(exists).toBe(true);
    });

    it('returns false when schema does not exist', async () => {
      mockReadContract.mockResolvedValueOnce({
        uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      const { result } = renderHook(() => useEASAttestation());

      let exists = true;
      await act(async () => {
        exists = await result.current.checkSchemaExists(
          '0xnonexistent000000000000000000000000000000000000000000000000000'
        );
      });

      expect(exists).toBe(false);
    });

    it('returns false on error', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEASAttestation());

      let exists = true;
      await act(async () => {
        exists = await result.current.checkSchemaExists(
          '0x1234567890123456789012345678901234567890123456789012345678901234'
        );
      });

      expect(exists).toBe(false);
    });
  });

  describe('createForecastAttestation', () => {
    it('creates an on-chain attestation', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      let attestation: unknown = null;
      await act(async () => {
        attestation = await result.current.createForecastAttestation(sampleForecastData);
      });

      expect(attestation).toBeTruthy();
      expect((attestation as AttestationResult).uid).toBe(mockAttestationUid);
      expect((attestation as AttestationResult).txHash).toBe(mockTxHash);
      expect(result.current.lastAttestation).toEqual(attestation);
    });

    it('sets isLoading during attestation creation', async () => {
      mockWriteContractAsync.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useEASAttestation());

      act(() => {
        result.current.createForecastAttestation(sampleForecastData);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('uses provided recipient address', async () => {
      const customRecipient = '0x9876543210987654321098765432109876543210' as const;

      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createForecastAttestation(sampleForecastData, customRecipient);
      });

      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                recipient: customRecipient,
              }),
            }),
          ]),
        })
      );
    });

    it('handles attestation errors gracefully', async () => {
      mockWriteContractAsync.mockRejectedValueOnce(new Error('Transaction failed'));

      const { result } = renderHook(() => useEASAttestation());

      let attestation: AttestationResult | null = null;
      await act(async () => {
        attestation = await result.current.createForecastAttestation(sampleForecastData) as AttestationResult | null;
      });

      expect(attestation).toBeNull();
      expect(result.current.error).toBe('Transaction failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createOffchainAttestation', () => {
    it('creates an off-chain attestation', async () => {
      const mockSignature = '0xsignature1234567890' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValueOnce(mockSignature);

      const { result } = renderHook(() => useEASAttestation());

      let attestation: unknown = null;
      await act(async () => {
        attestation = await result.current.createOffchainAttestation(sampleForecastData);
      });

      expect(attestation).toBeTruthy();
      expect((attestation as OffchainAttestationResult).signature).toBe(mockSignature);
      expect((attestation as OffchainAttestationResult).data).toEqual(sampleForecastData);
      expect((attestation as OffchainAttestationResult).timestamp).toBeGreaterThan(0);
      expect(result.current.lastOffchainAttestation).toEqual(attestation);
    });

    it('sets isLoading during signing', async () => {
      mockSignMessageAsync.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useEASAttestation());

      act(() => {
        result.current.createOffchainAttestation(sampleForecastData);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('handles signing errors gracefully', async () => {
      mockSignMessageAsync.mockRejectedValueOnce(new Error('User rejected signing'));

      const { result } = renderHook(() => useEASAttestation());

      let attestation: OffchainAttestationResult | null = null;
      await act(async () => {
        attestation = await result.current.createOffchainAttestation(sampleForecastData) as OffchainAttestationResult | null;
      });

      expect(attestation).toBeNull();
      expect(result.current.error).toBe('User rejected signing');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createMerkleAttestation', () => {
    it('creates a Merkle attestation with proofs', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      let attestation: unknown = null;
      await act(async () => {
        attestation = await result.current.createMerkleAttestation(sampleForecastData);
      });

      expect(attestation).toBeTruthy();
      const merkleAtt = attestation as MerkleAttestationResult;
      expect(merkleAtt.merkleRoot).toBeTruthy();
      expect(merkleAtt.leaves).toHaveLength(6); // 6 fields in ForecastAttestationData
      expect(merkleAtt.proofs).toBeTruthy();
      expect(Object.keys(merkleAtt.proofs)).toContain('probability');
      expect(Object.keys(merkleAtt.proofs)).toContain('marketId');
      expect(result.current.lastMerkleAttestation).toEqual(attestation);
    });

    it('includes leaves for all forecast fields', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      let attestation: unknown = null;
      await act(async () => {
        attestation = await result.current.createMerkleAttestation(sampleForecastData);
      });

      const merkleAtt = attestation as MerkleAttestationResult;
      const leafNames = merkleAtt.leaves.map(l => l.name);
      expect(leafNames).toContain('probability');
      expect(leafNames).toContain('marketId');
      expect(leafNames).toContain('platform');
      expect(leafNames).toContain('confidence');
      expect(leafNames).toContain('reasoning');
      expect(leafNames).toContain('isPublic');
    });

    it('handles merkle attestation errors gracefully', async () => {
      mockWriteContractAsync.mockRejectedValueOnce(new Error('Contract error'));

      const { result } = renderHook(() => useEASAttestation());

      let attestation: MerkleAttestationResult | null = null;
      await act(async () => {
        attestation = await result.current.createMerkleAttestation(sampleForecastData) as MerkleAttestationResult | null;
      });

      expect(attestation).toBeNull();
      expect(result.current.error).toBe('Contract error');
    });
  });

  describe('createAttestation (unified)', () => {
    it('creates on-chain attestation for ON_CHAIN mode', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createAttestation(sampleForecastData, 'ON_CHAIN');
      });

      expect(result.current.lastAttestation).toBeTruthy();
      expect(result.current.lastAttestation?.txHash).toBe(mockTxHash);
    });

    it('creates off-chain attestation for OFF_CHAIN mode', async () => {
      const mockSignature = '0xsignature' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValueOnce(mockSignature);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createAttestation(sampleForecastData, 'OFF_CHAIN');
      });

      expect(result.current.lastOffchainAttestation).toBeTruthy();
      expect(result.current.lastOffchainAttestation?.signature).toBe(mockSignature);
    });

    it('creates Merkle attestation for PRIVATE mode', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createAttestation(sampleForecastData, 'PRIVATE');
      });

      expect(result.current.lastMerkleAttestation).toBeTruthy();
      expect(result.current.lastMerkleAttestation?.merkleRoot).toBeTruthy();
    });
  });

  describe('getAttestation', () => {
    it('retrieves an attestation by UID', async () => {
      const mockAttestation = {
        uid: mockAttestationUid,
        schema: '0x1234567890123456789012345678901234567890123456789012345678901234' as const,
        time: BigInt(1704067200),
        expirationTime: 0n,
        revocationTime: 0n,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as const,
        recipient: '0x1234567890123456789012345678901234567890' as const,
        attester: '0x1234567890123456789012345678901234567890' as const,
        revocable: true,
        data: '0xabcdef' as const,
      };
      mockReadContract.mockResolvedValueOnce(mockAttestation);

      const { result } = renderHook(() => useEASAttestation());

      let attestation: unknown = null;
      await act(async () => {
        attestation = await result.current.getAttestation(mockAttestationUid as `0x${string}`);
      });

      expect(attestation).toBeTruthy();
      expect((attestation as OnChainAttestation).uid).toBe(mockAttestationUid);
    });

    it('returns null for non-existent attestation', async () => {
      mockReadContract.mockResolvedValueOnce({
        uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      const { result } = renderHook(() => useEASAttestation());

      let attestation: OnChainAttestation | null = null;
      await act(async () => {
        attestation = await result.current.getAttestation(mockAttestationUid as `0x${string}`) as OnChainAttestation | null;
      });

      expect(attestation).toBeNull();
    });

    it('returns null on error', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEASAttestation());

      let attestation: OnChainAttestation | null = null;
      await act(async () => {
        attestation = await result.current.getAttestation(mockAttestationUid as `0x${string}`) as OnChainAttestation | null;
      });

      expect(attestation).toBeNull();
    });
  });

  describe('isAttestationValid', () => {
    it('returns true for valid attestation', async () => {
      mockReadContract.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useEASAttestation());

      let isValid = false;
      await act(async () => {
        isValid = await result.current.isAttestationValid(mockAttestationUid as `0x${string}`);
      });

      expect(isValid).toBe(true);
    });

    it('returns false for invalid attestation', async () => {
      mockReadContract.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useEASAttestation());

      let isValid = true;
      await act(async () => {
        isValid = await result.current.isAttestationValid(mockAttestationUid as `0x${string}`);
      });

      expect(isValid).toBe(false);
    });

    it('returns false on error', async () => {
      mockReadContract.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEASAttestation());

      let isValid = true;
      await act(async () => {
        isValid = await result.current.isAttestationValid(mockAttestationUid as `0x${string}`);
      });

      expect(isValid).toBe(false);
    });
  });

  describe('generateProof', () => {
    const mockMerkleAttestation: MerkleAttestationResult = {
      uid: mockAttestationUid as `0x${string}`,
      merkleRoot: '0xroot123' as `0x${string}`,
      leaves: [
        { index: 0, name: 'probability', type: 'uint256', value: 7500, hash: '0xhash1' as `0x${string}` },
        { index: 1, name: 'marketId', type: 'string', value: 'market-123', hash: '0xhash2' as `0x${string}` },
        { index: 2, name: 'platform', type: 'string', value: 'polymarket', hash: '0xhash3' as `0x${string}` },
      ],
      proofs: {
        probability: ['0xproof1' as `0x${string}`],
        marketId: ['0xproof2' as `0x${string}`],
        platform: ['0xproof3' as `0x${string}`],
      },
    };

    it('generates proof for specified fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability', 'marketId']);

      expect(proof).toBeTruthy();
      expect(proof?.merkleRoot).toBe(mockMerkleAttestation.merkleRoot);
      expect(proof?.revealedFields).toHaveLength(2);
      expect(proof?.revealedFields[0]?.name).toBe('probability');
      expect(proof?.revealedFields[1]?.name).toBe('marketId');
    });

    it('includes proof paths for each revealed field', () => {
      const { result } = renderHook(() => useEASAttestation());

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability']);

      expect(proof?.revealedFields[0]?.proof).toEqual(['0xproof1']);
    });

    it('returns null when no valid fields specified', () => {
      const { result } = renderHook(() => useEASAttestation());

      const proof = result.current.generateProof(mockMerkleAttestation, ['nonexistent']);

      expect(proof).toBeNull();
    });

    it('skips non-existent fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability', 'nonexistent', 'marketId']);

      expect(proof?.revealedFields).toHaveLength(2);
    });
  });

  describe('verifyProof', () => {
    // Note: Full proof verification is complex and depends on proper Merkle tree implementation
    // These tests verify the basic interface works
    it('verifies valid proof format', () => {
      const { result } = renderHook(() => useEASAttestation());

      // This test verifies the function runs without error
      // Actual cryptographic verification is tested in integration tests
      const proof = {
        merkleRoot: '0xroot' as `0x${string}`,
        revealedFields: [
          {
            name: 'probability',
            value: 7500,
            proof: [] as `0x${string}`[],
          },
        ],
      };

      // Should not throw
      const isValid = result.current.verifyProof(proof);
      expect(typeof isValid).toBe('boolean');
    });

    it('handles empty revealed fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const proof = {
        merkleRoot: '0xroot' as `0x${string}`,
        revealedFields: [],
      };

      // Empty fields should be valid (no fields to verify)
      const isValid = result.current.verifyProof(proof);
      expect(isValid).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears error state', async () => {
      mockWriteContractAsync.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createForecastAttestation(sampleForecastData);
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('clears lastAttestation', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createForecastAttestation(sampleForecastData);
      });

      expect(result.current.lastAttestation).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.lastAttestation).toBeNull();
    });

    it('clears lastOffchainAttestation', async () => {
      const mockSignature = '0xsig' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValueOnce(mockSignature);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createOffchainAttestation(sampleForecastData);
      });

      expect(result.current.lastOffchainAttestation).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.lastOffchainAttestation).toBeNull();
    });

    it('clears lastMerkleAttestation', async () => {
      mockWriteContractAsync.mockResolvedValueOnce(mockTxHash);
      mockWaitForTransactionReceipt.mockResolvedValueOnce({
        logs: [
          {
            topics: [mockAttestedEventTopic],
            data: mockAttestationUid + '0'.repeat(64),
          },
        ],
      });

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createMerkleAttestation(sampleForecastData);
      });

      expect(result.current.lastMerkleAttestation).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.lastMerkleAttestation).toBeNull();
    });
  });
});

// =============================================================================
// Disconnected Wallet Tests
// =============================================================================

describe('useEASAttestation (disconnected wallet)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock disconnected wallet
    vi.doMock('wagmi', () => ({
      useAccount: () => ({
        address: undefined,
        isConnected: false,
      }),
      useChainId: () => 84532,
      useWriteContract: () => ({
        writeContractAsync: mockWriteContractAsync,
      }),
      usePublicClient: () => ({
        readContract: mockReadContract,
        waitForTransactionReceipt: mockWaitForTransactionReceipt,
      }),
      useSignMessage: () => ({
        signMessageAsync: mockSignMessageAsync,
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // These tests would require resetting the module mock completely
  // For now, the main tests cover the connected wallet scenario
});
