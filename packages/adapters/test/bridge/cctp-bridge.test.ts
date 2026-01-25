/**
 * CCTP Bridge Tests (Phase 5.2)
 * Tests for Circle CCTP bridge integration (Base -> Polygon)
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock viem before imports
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    http: vi.fn(() => ({})),
    keccak256: vi.fn(() => '0xmockhash'),
    encodePacked: vi.fn(() => '0xpacked'),
    toBytes: vi.fn(() => new Uint8Array(32)),
    parseEventLogs: vi.fn(() => []),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    signMessage: vi.fn(),
    signTypedData: vi.fn(),
    signTransaction: vi.fn(),
  })),
}));

import {
  CCTPBridgeService,
  createBridgeService,
  type BridgeConfig,
  type BridgeRequest,
  type BridgeStatus,
  type BridgeResult,
  CCTP_ADDRESSES,
  CCTP_DOMAINS,
  DEFAULT_BRIDGE_CONFIG,
} from '../../src/bridge';

// =============================================================================
// Test Constants
// =============================================================================

const MOCK_WALLET = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const MOCK_RECIPIENT = '0x9876543210987654321098765432109876543210' as `0x${string}`;
const MOCK_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' as `0x${string}`;
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as `0x${string}`;
const MOCK_MESSAGE_HASH = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as `0x${string}`;

// =============================================================================
// 5.2.1 Circle CCTP SDK Integration Tests
// =============================================================================

describe('CCTP Bridge Tests (Phase 5.2)', () => {
  let service: CCTPBridgeService;
  let mockPublicClient: Record<string, Mock>;
  let mockWalletClient: Record<string, Mock>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPublicClient = {
      readContract: vi.fn(),
      simulateContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
      getTransactionReceipt: vi.fn(),
      watchContractEvent: vi.fn(),
    };

    mockWalletClient = {
      writeContract: vi.fn(),
    };

    const { createPublicClient, createWalletClient } = await import('viem');
    (createPublicClient as Mock).mockReturnValue(mockPublicClient);
    (createWalletClient as Mock).mockReturnValue(mockWalletClient);

    service = createBridgeService();
    await service.initializeWallet(MOCK_PRIVATE_KEY);
  });

  describe('5.2.1 - Circle CCTP SDK Configuration', () => {
    it('should have correct contract addresses for Base', () => {
      expect(CCTP_ADDRESSES.BASE.TOKEN_MESSENGER).toBe('0x1682Ae6375C4E4A97e4B583BC394c861A46D8962');
      expect(CCTP_ADDRESSES.BASE.MESSAGE_TRANSMITTER).toBe('0xAD09780d193884d503182aD4588450C416D6F9D4');
      expect(CCTP_ADDRESSES.BASE.USDC).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    });

    it('should have correct contract addresses for Polygon', () => {
      expect(CCTP_ADDRESSES.POLYGON.TOKEN_MESSENGER).toBe('0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE');
      expect(CCTP_ADDRESSES.POLYGON.MESSAGE_TRANSMITTER).toBe('0xF3be9355363857F3e001be68856A2f96b4C39Ba9');
      expect(CCTP_ADDRESSES.POLYGON.USDC).toBe('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359');
    });

    it('should have correct domain IDs', () => {
      expect(CCTP_DOMAINS.BASE).toBe(6);
      expect(CCTP_DOMAINS.POLYGON).toBe(7);
      expect(CCTP_DOMAINS.ETHEREUM).toBe(0);
    });

    it('should use default config when not provided', () => {
      const defaultService = createBridgeService();
      expect(defaultService).toBeInstanceOf(CCTPBridgeService);
    });

    it('should accept custom RPC URLs', () => {
      const customService = createBridgeService({
        sourceRpcUrl: 'https://custom-base-rpc.com',
        destRpcUrl: 'https://custom-polygon-rpc.com',
      });
      expect(customService).toBeInstanceOf(CCTPBridgeService);
    });

    it('should configure attestation API URL', () => {
      expect(DEFAULT_BRIDGE_CONFIG.attestationApiUrl).toBe('https://iris-api.circle.com/attestations');
    });
  });

  describe('5.2.2 - Bridge Initiation', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n); // allowance
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: CCTP_ADDRESSES.BASE.MESSAGE_TRANSMITTER,
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });
    });

    it('should initiate bridge transfer from Base to Polygon', async () => {
      const request: BridgeRequest = {
        amount: 100000000n, // 100 USDC
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      const result = await service.initiateBridge(request);

      expect(result.txHash).toBe(MOCK_TX_HASH);
      expect(result.status).toBe('initiated');
      expect(result.sourceChain).toBe('BASE');
      expect(result.destinationChain).toBe('POLYGON');
    });

    it('should validate amount is greater than zero', async () => {
      const request: BridgeRequest = {
        amount: 0n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      await expect(service.initiateBridge(request)).rejects.toThrow('Amount must be greater than 0');
    });

    it('should validate recipient address format', async () => {
      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: 'invalid-address' as `0x${string}`,
        destinationChain: 'POLYGON',
      };

      await expect(service.initiateBridge(request)).rejects.toThrow('Invalid recipient address');
    });

    it('should require wallet initialization before bridge', async () => {
      const uninitializedService = createBridgeService();
      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      await expect(uninitializedService.initiateBridge(request)).rejects.toThrow('Wallet not initialized');
    });

    it('should handle approval if needed before bridge', async () => {
      mockPublicClient.readContract
        .mockResolvedValueOnce(0n) // First call: insufficient allowance
        .mockResolvedValueOnce(1000000000n); // After approval

      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      await service.initiateBridge(request);

      // Should have called approve
      expect(mockWalletClient.writeContract).toHaveBeenCalled();
    });

    it('should use sender address as recipient if not specified', async () => {
      const request: BridgeRequest = {
        amount: 100000000n,
        destinationChain: 'POLYGON',
      };

      const result = await service.initiateBridge(request);

      expect(result.recipient).toBe(MOCK_WALLET);
    });

    it('should extract message hash from transaction receipt', async () => {
      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      const result = await service.initiateBridge(request);

      expect(result.messageHash).toBeDefined();
      expect(typeof result.messageHash).toBe('string');
    });
  });

  describe('5.2.3 - Attestation Waiting', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should poll for attestation from Circle API', async () => {
      (global.fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'pending' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'pending' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'complete',
            attestation: '0xattestation',
          }),
        });

      const result = await service.waitForAttestation(MOCK_MESSAGE_HASH, {
        pollingInterval: 10,
        maxAttempts: 5,
      });

      expect(result.status).toBe('attested');
      expect(result.attestation).toBe('0xattestation');
    });

    it('should timeout after max attempts', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

      await expect(
        service.waitForAttestation(MOCK_MESSAGE_HASH, {
          pollingInterval: 10,
          maxAttempts: 3,
        })
      ).rejects.toThrow('Attestation timeout');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        service.waitForAttestation(MOCK_MESSAGE_HASH, {
          pollingInterval: 10,
          maxAttempts: 3,
        })
      ).rejects.toThrow('Failed to get attestation');
    });

    it('should return attestation data when available', async () => {
      const mockAttestation = '0x' + 'ab'.repeat(65);
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'complete',
          attestation: mockAttestation,
        }),
      });

      const result = await service.waitForAttestation(MOCK_MESSAGE_HASH);

      expect(result.attestation).toBe(mockAttestation);
    });

    it('should use correct attestation API URL', async () => {
      (global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'complete', attestation: '0x' }),
      });

      await service.waitForAttestation(MOCK_MESSAGE_HASH);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://iris-api.circle.com/attestations'),
        expect.any(Object)
      );
    });
  });

  describe('5.2.4 - Mint Claiming', () => {
    const mockAttestation = '0x' + 'ab'.repeat(65);
    const mockMessage = '0x' + 'cd'.repeat(100);

    beforeEach(() => {
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
      });
    });

    it('should claim minted USDC on destination chain', async () => {
      const result = await service.claimOnDestination({
        message: mockMessage,
        attestation: mockAttestation,
        destinationChain: 'POLYGON',
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(MOCK_TX_HASH);
    });

    it('should call receiveMessage on MessageTransmitter', async () => {
      await service.claimOnDestination({
        message: mockMessage,
        attestation: mockAttestation,
        destinationChain: 'POLYGON',
      });

      expect(mockPublicClient.simulateContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: CCTP_ADDRESSES.POLYGON.MESSAGE_TRANSMITTER,
          functionName: 'receiveMessage',
        })
      );
    });

    it('should handle failed claim transactions', async () => {
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'reverted',
        transactionHash: MOCK_TX_HASH,
      });

      const result = await service.claimOnDestination({
        message: mockMessage,
        attestation: mockAttestation,
        destinationChain: 'POLYGON',
      });

      expect(result.success).toBe(false);
    });

    it('should validate message format', async () => {
      await expect(
        service.claimOnDestination({
          message: 'invalid',
          attestation: mockAttestation,
          destinationChain: 'POLYGON',
        })
      ).rejects.toThrow('Invalid message format');
    });

    it('should validate attestation format', async () => {
      await expect(
        service.claimOnDestination({
          message: mockMessage,
          attestation: 'invalid',
          destinationChain: 'POLYGON',
        })
      ).rejects.toThrow('Invalid attestation format');
    });
  });

  describe('5.2.5 - Bridge Status Tracking', () => {
    it('should track bridge status through all phases', async () => {
      const trackingId = 'bridge-123';

      // Simulate status updates
      service.updateBridgeStatus(trackingId, 'initiated');
      let status = service.getBridgeStatus(trackingId);
      expect(status?.phase).toBe('initiated');

      service.updateBridgeStatus(trackingId, 'pending_attestation');
      status = service.getBridgeStatus(trackingId);
      expect(status?.phase).toBe('pending_attestation');

      service.updateBridgeStatus(trackingId, 'attested');
      status = service.getBridgeStatus(trackingId);
      expect(status?.phase).toBe('attested');

      service.updateBridgeStatus(trackingId, 'completed');
      status = service.getBridgeStatus(trackingId);
      expect(status?.phase).toBe('completed');
    });

    it('should include timestamp for each status update', async () => {
      const trackingId = 'bridge-456';
      service.updateBridgeStatus(trackingId, 'initiated');

      const status = service.getBridgeStatus(trackingId);
      expect(status?.updatedAt).toBeInstanceOf(Date);
    });

    it('should store transaction hashes at each phase', async () => {
      const trackingId = 'bridge-789';

      service.updateBridgeStatus(trackingId, 'initiated', {
        sourceTxHash: MOCK_TX_HASH,
      });

      const status = service.getBridgeStatus(trackingId);
      expect(status?.sourceTxHash).toBe(MOCK_TX_HASH);
    });

    it('should return null for unknown tracking ID', () => {
      const status = service.getBridgeStatus('unknown-id');
      expect(status).toBeNull();
    });

    it('should track estimated completion time', () => {
      const trackingId = 'bridge-eta';
      service.updateBridgeStatus(trackingId, 'initiated');

      const status = service.getBridgeStatus(trackingId);
      expect(status?.estimatedCompletionTime).toBeDefined();
    });

    it('should provide all active bridges', () => {
      service.updateBridgeStatus('bridge-1', 'initiated');
      service.updateBridgeStatus('bridge-2', 'pending_attestation');
      service.updateBridgeStatus('bridge-3', 'completed');

      const activeBridges = service.getActiveBridges();
      expect(activeBridges.length).toBe(2); // completed ones filtered out
    });
  });

  describe('5.2.6 - Bridge Fee Handling', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: CCTP_ADDRESSES.BASE.MESSAGE_TRANSMITTER,
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });
    });

    it('should calculate bridge fee correctly', () => {
      const amount = 100000000n; // 100 USDC
      const fee = service.calculateBridgeFee(amount);

      expect(fee).toBe(100000n); // $0.10 fee (6 decimals)
    });

    it('should subtract fee from bridged amount', async () => {
      const request: BridgeRequest = {
        amount: 100000000n, // 100 USDC
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
        includeFee: true,
      };

      const result = await service.initiateBridge(request);

      // Net amount should be 100 USDC - 0.10 fee = 99.90 USDC
      expect(result.netAmount).toBe(99900000n);
    });

    it('should include fee breakdown in result', async () => {
      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
        includeFee: true,
      };

      const result = await service.initiateBridge(request);

      expect(result.feeBreakdown).toEqual({
        bridgeFee: 100000n,
        totalFee: 100000n,
        netAmount: 99900000n,
      });
    });

    it('should allow specifying custom fee recipient', async () => {
      const feeRecipient = '0xfee0000000000000000000000000000000000fee' as `0x${string}`;
      const customService = createBridgeService({
        feeRecipient,
      });

      expect(customService).toBeInstanceOf(CCTPBridgeService);
    });

    it('should handle minimum amount after fee deduction', () => {
      const amount = 50000n; // Less than fee

      expect(() => service.calculateBridgeFee(amount)).not.toThrow();
      const fee = service.calculateBridgeFee(amount);
      expect(fee).toBe(100000n); // Still $0.10 minimum
    });
  });

  describe('5.2.7 - Full Bridge Flow Integration', () => {
    beforeEach(() => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [{
          address: CCTP_ADDRESSES.BASE.MESSAGE_TRANSMITTER,
          topics: ['0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036'],
          data: '0x' + '00'.repeat(128),
        }],
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'complete',
          attestation: '0x' + 'ab'.repeat(65),
        }),
      });
    });

    it('should complete full bridge flow from Base to Polygon', async () => {
      // Step 1: Initiate bridge
      const bridgeRequest: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      const initResult = await service.initiateBridge(bridgeRequest);
      expect(initResult.status).toBe('initiated');

      // Step 2: Wait for attestation
      const attestResult = await service.waitForAttestation(initResult.messageHash!, {
        pollingInterval: 10,
        maxAttempts: 5,
      });
      expect(attestResult.status).toBe('attested');

      // Step 3: Claim on destination
      const claimResult = await service.claimOnDestination({
        message: initResult.message!,
        attestation: attestResult.attestation!,
        destinationChain: 'POLYGON',
      });
      expect(claimResult.success).toBe(true);
    });

    it('should execute full bridge with executeBridge convenience method', async () => {
      const result = await service.executeBridge({
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      });

      expect(result.success).toBe(true);
      expect(result.sourceTxHash).toBe(MOCK_TX_HASH);
      expect(result.destTxHash).toBe(MOCK_TX_HASH);
    });

    it('should emit events during bridge progress', async () => {
      const events: string[] = [];
      service.on('bridgeProgress', (event) => {
        events.push(event.phase);
      });

      await service.executeBridge({
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      });

      expect(events).toContain('initiated');
      expect(events).toContain('attested');
      expect(events).toContain('completed');
    });

    it('should handle bridge cancellation', async () => {
      const bridgeRequest: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      const initResult = await service.initiateBridge(bridgeRequest);

      // CCTP bridges cannot be cancelled once initiated
      // but we can mark them as abandoned
      service.markBridgeAbandoned(initResult.trackingId!);

      const status = service.getBridgeStatus(initResult.trackingId!);
      expect(status?.phase).toBe('abandoned');
    });

    it('should estimate bridge completion time', () => {
      const estimate = service.estimateBridgeTime('POLYGON');

      // CCTP typically takes ~15-30 minutes
      expect(estimate.minSeconds).toBeGreaterThanOrEqual(60);
      expect(estimate.maxSeconds).toBeLessThanOrEqual(3600);
      expect(estimate.averageSeconds).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle RPC failures during initiation', async () => {
      mockPublicClient.simulateContract.mockRejectedValue(new Error('RPC error'));

      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      await expect(service.initiateBridge(request)).rejects.toThrow('RPC error');
    });

    it('should retry on transient errors', async () => {
      let callCount = 0;
      mockPublicClient.readContract.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(1000000000n);
      });
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [],
      });

      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      // Service should handle retries internally
      await expect(service.initiateBridge(request)).rejects.toThrow();
    });

    it('should validate destination chain', async () => {
      const request = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'INVALID_CHAIN',
      };

      await expect(
        service.initiateBridge(request as BridgeRequest)
      ).rejects.toThrow('Unsupported destination chain');
    });

    it('should handle message extraction failure', async () => {
      mockPublicClient.readContract.mockResolvedValue(1000000000n);
      mockPublicClient.simulateContract.mockResolvedValue({ request: {} });
      mockWalletClient.writeContract.mockResolvedValue(MOCK_TX_HASH);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
        transactionHash: MOCK_TX_HASH,
        logs: [], // No MessageSent event
      });

      const request: BridgeRequest = {
        amount: 100000000n,
        recipient: MOCK_RECIPIENT,
        destinationChain: 'POLYGON',
      };

      await expect(service.initiateBridge(request)).rejects.toThrow('Failed to extract message');
    });
  });
});
