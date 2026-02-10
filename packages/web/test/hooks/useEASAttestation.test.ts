/**
 * useEASAttestation Hook Tests
 * Tests for EAS attestation creation with multiple modes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEASAttestation } from '@/hooks/useEASAttestation';

// =============================================================================
// Mock Setup
// =============================================================================

const mockWriteContractAsync = vi.fn();
const mockSignMessageAsync = vi.fn();
const mockPublicClient = {
  readContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
};

const mockUseAccount = vi.fn();
const mockUseChainId = vi.fn();
const mockUsePublicClient = vi.fn();
const mockUseWriteContract = vi.fn();
const mockUseSignMessage = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
  usePublicClient: () => mockUsePublicClient(),
  useWriteContract: () => mockUseWriteContract(),
  useSignMessage: () => mockUseSignMessage(),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createForecastData = () => ({
  probability: 7500,
  marketId: 'market-123',
  platform: 'POLYMARKET',
  confidence: 80,
  reasoning: 'Based on analysis',
  isPublic: true,
});

// =============================================================================
// Tests
// =============================================================================

describe('useEASAttestation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(84532);
    mockUsePublicClient.mockReturnValue(mockPublicClient);
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    });
    mockUseSignMessage.mockReturnValue({
      signMessageAsync: mockSignMessageAsync,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useEASAttestation());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastAttestation).toBeNull();
      expect(result.current.lastOffchainAttestation).toBeNull();
      expect(result.current.lastMerkleAttestation).toBeNull();
    });

    it('returns all required functions', () => {
      const { result } = renderHook(() => useEASAttestation());

      expect(typeof result.current.registerSchema).toBe('function');
      expect(typeof result.current.createForecastAttestation).toBe('function');
      expect(typeof result.current.createOffchainAttestation).toBe('function');
      expect(typeof result.current.createMerkleAttestation).toBe('function');
      expect(typeof result.current.createAttestation).toBe('function');
      expect(typeof result.current.getAttestation).toBe('function');
      expect(typeof result.current.isAttestationValid).toBe('function');
      expect(typeof result.current.generateProof).toBe('function');
      expect(typeof result.current.verifyProof).toBe('function');
      expect(typeof result.current.checkSchemaExists).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('disconnected state', () => {
    beforeEach(() => {
      mockUseAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
      });
    });

    it('returns error when creating attestation without wallet', async () => {
      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createForecastAttestation(createForecastData());
        expect(attestation).toBeNull();
      });

      expect(result.current.error).toBe('Wallet not connected');
    });

    it('returns error when creating offchain attestation without wallet', async () => {
      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createOffchainAttestation(createForecastData());
        expect(attestation).toBeNull();
      });

      expect(result.current.error).toBe('Wallet not connected');
    });

    it('returns error when creating merkle attestation without wallet', async () => {
      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createMerkleAttestation(createForecastData());
        expect(attestation).toBeNull();
      });

      expect(result.current.error).toBe('Wallet not connected');
    });

    it('returns error when registering schema without wallet', async () => {
      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const schemaUid = await result.current.registerSchema();
        expect(schemaUid).toBeNull();
      });

      expect(result.current.error).toBe('Wallet not connected');
    });
  });

  describe('createOffchainAttestation', () => {
    it('creates off-chain attestation successfully', async () => {
      const mockSignature = '0xsignature1234567890' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useEASAttestation());
      const forecastData = createForecastData();

      await act(async () => {
        const attestation = await result.current.createOffchainAttestation(forecastData);

        expect(attestation).not.toBeNull();
        expect(attestation?.signature).toBe(mockSignature);
        expect(attestation?.data).toEqual(forecastData);
        expect(attestation?.timestamp).toBeGreaterThan(0);
      });

      expect(result.current.lastOffchainAttestation).not.toBeNull();
    });

    it('handles signature rejection', async () => {
      mockSignMessageAsync.mockRejectedValue(new Error('User rejected'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createOffchainAttestation(createForecastData());
        expect(attestation).toBeNull();
      });

      expect(result.current.error).toBe('User rejected');
    });

    it('sets loading state during attestation', async () => {
      let resolveSign: (value: `0x${string}`) => void;
      mockSignMessageAsync.mockImplementation(
        () => new Promise((resolve) => { resolveSign = resolve; })
      );

      const { result } = renderHook(() => useEASAttestation());

      let attestationPromise: Promise<unknown>;
      act(() => {
        attestationPromise = result.current.createOffchainAttestation(createForecastData());
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSign!('0xsig' as `0x${string}`);
        await attestationPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('uses default recipient when not specified', async () => {
      const mockSignature = '0xsig' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createOffchainAttestation(createForecastData());
        expect(attestation).not.toBeNull();
      });

      // Should have signed a message
      expect(mockSignMessageAsync).toHaveBeenCalled();
    });

    it('accepts custom recipient', async () => {
      const mockSignature = '0xsig' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValue(mockSignature);
      const customRecipient = '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`;

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.createOffchainAttestation(
          createForecastData(),
          customRecipient
        );
        expect(attestation).not.toBeNull();
      });
    });
  });

  describe('checkSchemaExists', () => {
    it('returns false when no public client', async () => {
      mockUsePublicClient.mockReturnValue(null);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const exists = await result.current.checkSchemaExists(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(exists).toBe(false);
      });
    });

    it('returns false on read error', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Read failed'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const exists = await result.current.checkSchemaExists(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(exists).toBe(false);
      });
    });
  });

  describe('getAttestation', () => {
    it('returns null when no public client', async () => {
      mockUsePublicClient.mockReturnValue(null);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.getAttestation(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(attestation).toBeNull();
      });
    });

    it('returns null on error', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Read failed'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const attestation = await result.current.getAttestation(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(attestation).toBeNull();
      });
    });
  });

  describe('isAttestationValid', () => {
    it('returns false when no public client', async () => {
      mockUsePublicClient.mockReturnValue(null);

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const isValid = await result.current.isAttestationValid(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(isValid).toBe(false);
      });
    });

    it('returns false on error', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Read failed'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        const isValid = await result.current.isAttestationValid(
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        );
        expect(isValid).toBe(false);
      });
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      const mockSignature = '0xsignature1234567890' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useEASAttestation());

      // Create an attestation first
      await act(async () => {
        await result.current.createOffchainAttestation(createForecastData());
      });

      expect(result.current.lastOffchainAttestation).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.lastAttestation).toBeNull();
      expect(result.current.lastOffchainAttestation).toBeNull();
      expect(result.current.lastMerkleAttestation).toBeNull();
    });

    it('clears error state', async () => {
      mockSignMessageAsync.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useEASAttestation());

      await act(async () => {
        await result.current.createOffchainAttestation(createForecastData());
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('selective disclosure', () => {
    it('generateProof returns null for empty fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const mockMerkleAttestation = {
        uid: '0xabcdef' as `0x${string}`,
        merkleRoot: '0xroot' as `0x${string}`,
        leaves: [
          { index: 0, name: 'probability', type: 'uint256', value: 7500, hash: '0xhash1' as `0x${string}` },
        ],
        proofs: {
          probability: ['0xproof1' as `0x${string}`],
        },
      };

      const proof = result.current.generateProof(mockMerkleAttestation, []);
      expect(proof).toBeNull();
    });

    it('generateProof returns proof for valid fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const mockMerkleAttestation = {
        uid: '0xabcdef' as `0x${string}`,
        merkleRoot: '0xroot1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        leaves: [
          { index: 0, name: 'probability', type: 'uint256', value: 7500, hash: '0xhash1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}` },
          { index: 1, name: 'marketId', type: 'string', value: 'market-123', hash: '0xhash2234567890123456789012345678901234567890123456789012345678901234' as `0x${string}` },
        ],
        proofs: {
          probability: ['0xproof1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`],
          marketId: ['0xproof2234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`],
        },
      };

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability']);

      expect(proof).not.toBeNull();
      expect(proof?.merkleRoot).toBe(mockMerkleAttestation.merkleRoot);
      expect(proof?.revealedFields).toHaveLength(1);
      expect(proof?.revealedFields[0]?.name).toBe('probability');
    });

    it('generateProof filters non-existent fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const mockMerkleAttestation = {
        uid: '0xabcdef' as `0x${string}`,
        merkleRoot: '0xroot1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        leaves: [
          { index: 0, name: 'probability', type: 'uint256', value: 7500, hash: '0xhash1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}` },
        ],
        proofs: {
          probability: ['0xproof1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`],
        },
      };

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability', 'nonexistent']);

      expect(proof).not.toBeNull();
      expect(proof?.revealedFields).toHaveLength(1);
    });

    it('generateProof handles multiple fields', () => {
      const { result } = renderHook(() => useEASAttestation());

      const mockMerkleAttestation = {
        uid: '0xabcdef' as `0x${string}`,
        merkleRoot: '0xroot1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        leaves: [
          { index: 0, name: 'probability', type: 'uint256', value: 7500, hash: '0xhash1' as `0x${string}` },
          { index: 1, name: 'marketId', type: 'string', value: 'market-123', hash: '0xhash2' as `0x${string}` },
          { index: 2, name: 'platform', type: 'string', value: 'POLYMARKET', hash: '0xhash3' as `0x${string}` },
        ],
        proofs: {
          probability: ['0xproof1' as `0x${string}`],
          marketId: ['0xproof2' as `0x${string}`],
          platform: ['0xproof3' as `0x${string}`],
        },
      };

      const proof = result.current.generateProof(mockMerkleAttestation, ['probability', 'marketId']);

      expect(proof).not.toBeNull();
      expect(proof?.revealedFields).toHaveLength(2);
    });
  });

  describe('createAttestation unified interface', () => {
    it('calls createOffchainAttestation for OFF_CHAIN mode', async () => {
      const mockSignature = '0xsignature1234567890' as `0x${string}`;
      mockSignMessageAsync.mockResolvedValue(mockSignature);

      const { result } = renderHook(() => useEASAttestation());
      const forecastData = createForecastData();

      await act(async () => {
        const attestation = await result.current.createAttestation(forecastData, 'OFF_CHAIN');
        expect(attestation).not.toBeNull();
      });

      expect(mockSignMessageAsync).toHaveBeenCalled();
    });
  });
});
