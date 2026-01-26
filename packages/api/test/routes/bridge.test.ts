/**
 * Bridge Routes Integration Tests
 * Tests for cross-chain USDC bridging API endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { bridgeRoutes } from '../../src/routes/bridge';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    crossChainTransaction: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock adapters
vi.mock('@calibr/adapters', () => ({
  createBridgeService: vi.fn(() => ({
    calculateBridgeFee: vi.fn((amount: bigint) => 100000n), // $0.10 fee
    estimateBridgeTime: vi.fn(() => ({
      minSeconds: 900,
      maxSeconds: 1800,
      averageSeconds: 1200,
    })),
  })),
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  crossChainTransaction: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

// Create test app
const app = new Hono();
app.route('/api/bridge', bridgeRoutes);

// =============================================================================
// Test Constants
// =============================================================================

const MOCK_WALLET = '0x1234567890123456789012345678901234567890';
const MOCK_TRACKING_ID = 'cltest123456789';
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
const MOCK_MESSAGE_HASH = '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';

// =============================================================================
// Tests
// =============================================================================

describe('Bridge Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // POST /api/bridge/initiate Tests
  // ===========================================================================

  describe('POST /api/bridge/initiate', () => {
    it('should initiate a bridge transaction', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        status: 'BRIDGING',
        bridgeStatus: 'IN_PROGRESS',
        bridgeUsdcReceived: 99.9,
        bridgeFee: 0.1,
        totalFees: 0.1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.crossChainTransaction.create.mockResolvedValue(mockTransaction);

      const res = await app.request('/api/bridge/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '100000000', // 100 USDC
          destinationChain: 'POLYGON',
          walletAddress: MOCK_WALLET,
          userId: 'test-user',
          walletConnectionId: 'test-connection',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.trackingId).toBe(MOCK_TRACKING_ID);
      expect(data.data.sourceChain).toBe('BASE');
      expect(data.data.destinationChain).toBe('POLYGON');
      expect(data.data.feeBreakdown).toBeDefined();
      expect(data.data.contracts).toBeDefined();
    });

    it('should validate required fields', async () => {
      const res = await app.request('/api/bridge/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '100000000',
          // Missing required fields
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request');
    });

    it('should validate amount format', async () => {
      const res = await app.request('/api/bridge/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 'invalid',
          destinationChain: 'POLYGON',
          walletAddress: MOCK_WALLET,
          userId: 'test-user',
          walletConnectionId: 'test-connection',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should validate wallet address format', async () => {
      const res = await app.request('/api/bridge/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '100000000',
          destinationChain: 'POLYGON',
          walletAddress: 'invalid-address',
          userId: 'test-user',
          walletConnectionId: 'test-connection',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should validate destination chain', async () => {
      const res = await app.request('/api/bridge/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '100000000',
          destinationChain: 'INVALID_CHAIN',
          walletAddress: MOCK_WALLET,
          userId: 'test-user',
          walletConnectionId: 'test-connection',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET /api/bridge/status/:id Tests
  // ===========================================================================

  describe('GET /api/bridge/status/:id', () => {
    it('should return bridge status', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        status: 'BRIDGING',
        bridgeStatus: 'IN_PROGRESS',
        bridgeBurnTxHash: MOCK_TX_HASH,
        bridgeMessageHash: MOCK_MESSAGE_HASH,
        bridgeAttestation: null,
        bridgeMintTxHash: null,
        bridgeUsdcReceived: 99.9,
        bridgeFee: 0.1,
        bridgeError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        bridgeCompletedAt: null,
      };

      mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);

      const res = await app.request(`/api/bridge/status/${MOCK_TRACKING_ID}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.trackingId).toBe(MOCK_TRACKING_ID);
      expect(data.data.phase).toBe('pending_attestation');
      expect(data.data.sourceTxHash).toBe(MOCK_TX_HASH);
      expect(data.data.messageHash).toBe(MOCK_MESSAGE_HASH);
    });

    it('should return 404 for non-existent bridge', async () => {
      mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(null);

      const res = await app.request('/api/bridge/status/non-existent', {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bridge transaction not found');
    });

    it('should correctly determine phase from status fields', async () => {
      // Test completed phase
      const completedTx = {
        id: MOCK_TRACKING_ID,
        status: 'COMPLETED',
        bridgeStatus: 'COMPLETED',
        bridgeBurnTxHash: MOCK_TX_HASH,
        bridgeMessageHash: MOCK_MESSAGE_HASH,
        bridgeAttestation: '0xattestation',
        bridgeMintTxHash: MOCK_TX_HASH,
        bridgeUsdcReceived: 99.9,
        bridgeFee: 0.1,
        bridgeError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        bridgeCompletedAt: new Date(),
      };

      mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(completedTx);

      const res = await app.request(`/api/bridge/status/${MOCK_TRACKING_ID}`, {
        method: 'GET',
      });

      const data = await res.json();
      expect(data.data.phase).toBe('completed');
    });
  });

  // ===========================================================================
  // POST /api/bridge/:id/update Tests
  // ===========================================================================

  describe('POST /api/bridge/:id/update', () => {
    it('should update bridge phase', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        status: 'BRIDGING',
        bridgeStatus: 'IN_PROGRESS',
        bridgeBurnTxHash: MOCK_TX_HASH,
        bridgeMessageHash: MOCK_MESSAGE_HASH,
        updatedAt: new Date(),
      };

      mockPrisma.crossChainTransaction.update.mockResolvedValue(mockTransaction);

      const res = await app.request(`/api/bridge/${MOCK_TRACKING_ID}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'pending_attestation',
          sourceTxHash: MOCK_TX_HASH,
          messageHash: MOCK_MESSAGE_HASH,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.trackingId).toBe(MOCK_TRACKING_ID);
    });

    it('should update to completed phase', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        status: 'COMPLETED',
        bridgeStatus: 'COMPLETED',
        bridgeBurnTxHash: MOCK_TX_HASH,
        bridgeMintTxHash: MOCK_TX_HASH,
        updatedAt: new Date(),
      };

      mockPrisma.crossChainTransaction.update.mockResolvedValue(mockTransaction);

      const res = await app.request(`/api/bridge/${MOCK_TRACKING_ID}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'completed',
          destTxHash: MOCK_TX_HASH,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET /api/bridge/active Tests
  // ===========================================================================

  describe('GET /api/bridge/active', () => {
    it('should return active bridges for user', async () => {
      const mockTransactions = [
        {
          id: 'bridge-1',
          status: 'BRIDGING',
          bridgeStatus: 'IN_PROGRESS',
          bridgeBurnTxHash: MOCK_TX_HASH,
          bridgeMessageHash: MOCK_MESSAGE_HASH,
          bridgeAttestation: null,
          bridgeMintTxHash: null,
          bridgeUsdcReceived: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bridge-2',
          status: 'PENDING',
          bridgeStatus: 'PENDING',
          bridgeBurnTxHash: null,
          bridgeMessageHash: null,
          bridgeAttestation: null,
          bridgeMintTxHash: null,
          bridgeUsdcReceived: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.crossChainTransaction.findMany.mockResolvedValue(mockTransactions);

      const res = await app.request('/api/bridge/active?userId=test-user', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.bridges).toHaveLength(2);
    });

    it('should require userId or walletAddress', async () => {
      const res = await app.request('/api/bridge/active', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('userId or walletAddress required');
    });
  });

  // ===========================================================================
  // DELETE /api/bridge/abandon/:id Tests
  // ===========================================================================

  describe('DELETE /api/bridge/abandon/:id', () => {
    it('should mark bridge as abandoned', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        status: 'CANCELLED',
        bridgeStatus: 'FAILED',
        bridgeError: 'Abandoned by user',
      };

      mockPrisma.crossChainTransaction.update.mockResolvedValue(mockTransaction);

      const res = await app.request(`/api/bridge/abandon/${MOCK_TRACKING_ID}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('CANCELLED');
      expect(data.data.message).toBe('Bridge marked as abandoned');
    });
  });

  // ===========================================================================
  // GET /api/bridge/estimate Tests
  // ===========================================================================

  describe('GET /api/bridge/estimate', () => {
    it('should return fee and time estimates', async () => {
      const res = await app.request('/api/bridge/estimate?amount=100000000&destinationChain=POLYGON', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.sourceChain).toBe('BASE');
      expect(data.data.destinationChain).toBe('POLYGON');
      expect(data.data.fees).toBeDefined();
      expect(data.data.fees.bridgeFee).toBeDefined();
      expect(data.data.output).toBeDefined();
      expect(data.data.timing).toBeDefined();
      expect(data.data.timing.minMinutes).toBeGreaterThan(0);
    });

    it('should handle zero amount', async () => {
      const res = await app.request('/api/bridge/estimate?amount=0&destinationChain=POLYGON', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.output.netAmount).toBe('0');
    });
  });

  // ===========================================================================
  // GET /api/bridge/attestation/:messageHash Tests
  // ===========================================================================

  describe('GET /api/bridge/attestation/:messageHash', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return attestation when available', async () => {
      const mockAttestation = '0x' + 'ab'.repeat(65);
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'complete',
          attestation: mockAttestation,
        }),
      });

      const res = await app.request(`/api/bridge/attestation/${MOCK_MESSAGE_HASH}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('complete');
      expect(data.data.attestation).toBe(mockAttestation);
      expect(data.data.ready).toBe(true);
    });

    it('should return pending when attestation not ready', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
      });

      const res = await app.request(`/api/bridge/attestation/${MOCK_MESSAGE_HASH}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('pending');
    });

    it('should validate message hash format', async () => {
      const res = await app.request('/api/bridge/attestation/invalid-hash', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid message hash format');
    });
  });

  // ===========================================================================
  // POST /api/bridge/claim/:id Tests
  // ===========================================================================

  describe('POST /api/bridge/claim/:id', () => {
    it('should prepare claim data', async () => {
      const mockTransaction = {
        id: MOCK_TRACKING_ID,
        bridgeStatus: 'IN_PROGRESS',
      };

      mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrisma.crossChainTransaction.update.mockResolvedValue(mockTransaction);

      const mockMessage = '0x' + 'cd'.repeat(100);
      const mockAttestation = '0x' + 'ab'.repeat(65);

      const res = await app.request(`/api/bridge/claim/${MOCK_TRACKING_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: mockMessage,
          attestation: mockAttestation,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.contracts).toBeDefined();
      expect(data.data.contracts.messageTransmitter).toBe('0xF3be9355363857F3e001be68856A2f96b4C39Ba9');
    });

    it('should return 404 for non-existent bridge', async () => {
      mockPrisma.crossChainTransaction.findUnique.mockResolvedValue(null);

      const res = await app.request('/api/bridge/claim/non-existent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '0x' + 'cd'.repeat(100),
          attestation: '0x' + 'ab'.repeat(65),
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should validate message format', async () => {
      const res = await app.request(`/api/bridge/claim/${MOCK_TRACKING_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'invalid',
          attestation: '0x' + 'ab'.repeat(65),
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });
});
