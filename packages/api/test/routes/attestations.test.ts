/**
 * Attestation Routes Integration Tests
 * Tests on-chain, off-chain, and Merkle attestations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { attestationRoutes } from '../../src/routes/attestations';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    eASAttestation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    forecast: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  eASAttestation: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  forecast: {
    update: ReturnType<typeof vi.fn>;
  };
};

// Create test app
const app = new Hono();
app.route('/api/attestations', attestationRoutes);

describe('Attestation Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /api/attestations Tests
  // =============================================================================

  describe('GET /api/attestations', () => {
    it('should return empty list when no attestations', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      const res = await app.request('/api/attestations', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.attestations).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should return attestations for user', async () => {
      const mockAttestation = {
        id: 'att-1',
        uid: '0x' + 'a'.repeat(64),
        schemaUid: '0x' + 'b'.repeat(64),
        schemaName: 'CalibrForecast',
        chainId: 8453,
        txHash: '0x' + 'c'.repeat(64),
        attester: 'test-user',
        recipient: '0x' + 'd'.repeat(40),
        data: { probability: 7000 },
        userId: 'test-user',
        isOffchain: false,
        isPrivate: false,
        createdAt: new Date(),
      };

      mockPrisma.eASAttestation.findMany.mockResolvedValue([mockAttestation]);
      mockPrisma.eASAttestation.count.mockResolvedValue(1);

      const res = await app.request('/api/attestations', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.attestations).toHaveLength(1);
      expect(data.data.attestations[0].uid).toBe('0x' + 'a'.repeat(64));
    });

    it('should use demo-user when no x-user-id header', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations');

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'demo-user',
          }),
        })
      );
    });

    it('should respect limit and offset parameters', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(100);

      await app.request('/api/attestations?limit=10&offset=20', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should cap limit at 100', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations?limit=200', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should filter by type=onchain', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations?type=onchain', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isOffchain: false,
            isPrivate: false,
          }),
        })
      );
    });

    it('should filter by type=offchain', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations?type=offchain', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isOffchain: true,
          }),
        })
      );
    });

    it('should filter by type=private', async () => {
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations?type=private', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.eASAttestation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPrivate: true,
          }),
        })
      );
    });
  });

  // =============================================================================
  // GET /api/attestations/:uid Tests
  // =============================================================================

  describe('GET /api/attestations/:uid', () => {
    it('should return 404 when attestation not found', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/attestations/0x' + 'a'.repeat(64));

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Attestation not found');
    });

    it('should return attestation by UID', async () => {
      const uid = '0x' + 'a'.repeat(64);
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        id: 'att-1',
        uid,
        schemaName: 'CalibrForecast',
        data: { probability: 7000 },
      });

      const res = await app.request(`/api/attestations/${uid}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.uid).toBe(uid);
    });
  });

  // =============================================================================
  // POST /api/attestations/offchain Tests
  // =============================================================================

  describe('POST /api/attestations/offchain', () => {
    const validOffchainBody = {
      uid: '0x' + 'a'.repeat(64),
      signature: '0x' + 'b'.repeat(130),
      schemaUid: '0x' + 'c'.repeat(64),
      recipient: '0x' + 'd'.repeat(40),
      timestamp: 1700000000,
      data: { probability: 7000 },
    };

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: 'not valid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 400 for invalid UID format', async () => {
      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validOffchainBody,
          uid: 'invalid-uid',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid signature format', async () => {
      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validOffchainBody,
          signature: 'not-hex',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid recipient address', async () => {
      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validOffchainBody,
          recipient: 'not-an-address',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when attestation already exists', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid: validOffchainBody.uid,
      });

      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validOffchainBody),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Attestation already exists');
    });

    it('should create off-chain attestation successfully', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validOffchainBody.uid,
        schemaUid: validOffchainBody.schemaUid,
        schemaName: 'CalibrForecast',
        chainId: 0,
        isOffchain: true,
        isPrivate: false,
      });

      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validOffchainBody),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.isOffchain).toBe(true);
    });

    it('should link to forecast when forecastId provided', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validOffchainBody.uid,
        isOffchain: true,
      });
      mockPrisma.forecast.update.mockResolvedValue({});

      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validOffchainBody,
          forecastId: 'forecast-123',
        }),
      });

      expect(res.status).toBe(201);
      expect(mockPrisma.forecast.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'forecast-123' },
          data: expect.objectContaining({
            easAttestationUid: validOffchainBody.uid,
          }),
        })
      );
    });

    it('should not fail if forecast link fails', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validOffchainBody.uid,
        isOffchain: true,
      });
      mockPrisma.forecast.update.mockRejectedValue(new Error('Forecast not found'));

      const res = await app.request('/api/attestations/offchain', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validOffchainBody,
          forecastId: 'non-existent',
        }),
      });

      expect(res.status).toBe(201);
    });
  });

  // =============================================================================
  // POST /api/attestations/merkle Tests
  // =============================================================================

  describe('POST /api/attestations/merkle', () => {
    const validMerkleBody = {
      uid: '0x' + 'a'.repeat(64),
      schemaUid: '0x' + 'b'.repeat(64),
      recipient: '0x' + 'c'.repeat(40),
      merkleRoot: '0x' + 'd'.repeat(64),
      leaves: [
        { index: 0, name: 'probability', type: 'uint256', value: 7000, hash: '0x' + 'e'.repeat(64) },
        { index: 1, name: 'confidence', type: 'uint256', value: 8000, hash: '0x' + 'f'.repeat(64) },
      ],
      proofs: {
        probability: ['0x' + '1'.repeat(64), '0x' + '2'.repeat(64)],
        confidence: ['0x' + '3'.repeat(64), '0x' + '4'.repeat(64)],
      },
    };

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: 'not valid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 400 for invalid merkle root format', async () => {
      const res = await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validMerkleBody,
          merkleRoot: 'not-a-hash',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 400 when attestation already exists', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid: validMerkleBody.uid,
      });

      const res = await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validMerkleBody),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Attestation already exists');
    });

    it('should create merkle attestation successfully', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validMerkleBody.uid,
        schemaName: 'CalibrPrivateData',
        isOffchain: false,
        isPrivate: true,
        merkleRoot: validMerkleBody.merkleRoot,
      });

      const res = await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validMerkleBody),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.isPrivate).toBe(true);
      expect(data.data.merkleRoot).toBe(validMerkleBody.merkleRoot);
    });

    it('should accept optional txHash', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validMerkleBody.uid,
        txHash: '0x' + 'f'.repeat(64),
        isPrivate: true,
      });

      const res = await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validMerkleBody,
          txHash: '0x' + 'f'.repeat(64),
        }),
      });

      expect(res.status).toBe(201);
    });

    it('should accept optional chainId', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validMerkleBody.uid,
        chainId: 8453,
        isPrivate: true,
      });

      await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validMerkleBody,
          chainId: 8453,
        }),
      });

      expect(mockPrisma.eASAttestation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chainId: 8453,
          }),
        })
      );
    });

    it('should link to forecast when forecastId provided', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);
      mockPrisma.eASAttestation.create.mockResolvedValue({
        id: 'att-1',
        uid: validMerkleBody.uid,
        isPrivate: true,
      });
      mockPrisma.forecast.update.mockResolvedValue({});

      await app.request('/api/attestations/merkle', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validMerkleBody,
          forecastId: 'forecast-123',
        }),
      });

      expect(mockPrisma.forecast.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'forecast-123' },
        })
      );
    });
  });

  // =============================================================================
  // GET /api/attestations/:uid/proof Tests
  // =============================================================================

  describe('GET /api/attestations/:uid/proof', () => {
    it('should return 404 when private attestation not found', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/attestations/0x' + 'a'.repeat(64) + '/proof');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Private attestation not found');
    });

    it('should return all proofs when no fields specified', async () => {
      const uid = '0x' + 'a'.repeat(64);
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid,
        isPrivate: true,
        data: {
          merkleRoot: '0x' + 'b'.repeat(64),
          leaves: [
            { index: 0, name: 'probability', type: 'uint256', value: 7000, hash: '0x' + 'c'.repeat(64) },
            { index: 1, name: 'confidence', type: 'uint256', value: 8000, hash: '0x' + 'd'.repeat(64) },
          ],
          proofs: {
            probability: ['0x' + '1'.repeat(64)],
            confidence: ['0x' + '2'.repeat(64)],
          },
        },
      });

      const res = await app.request(`/api/attestations/${uid}/proof`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.merkleRoot).toBe('0x' + 'b'.repeat(64));
      expect(data.data.revealedFields).toHaveLength(2);
    });

    it('should filter proofs by requested fields', async () => {
      const uid = '0x' + 'a'.repeat(64);
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid,
        isPrivate: true,
        data: {
          merkleRoot: '0x' + 'b'.repeat(64),
          leaves: [
            { index: 0, name: 'probability', type: 'uint256', value: 7000, hash: '0x' + 'c'.repeat(64) },
            { index: 1, name: 'confidence', type: 'uint256', value: 8000, hash: '0x' + 'd'.repeat(64) },
          ],
          proofs: {
            probability: ['0x' + '1'.repeat(64)],
            confidence: ['0x' + '2'.repeat(64)],
          },
        },
      });

      const res = await app.request(`/api/attestations/${uid}/proof?fields=probability`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.revealedFields).toHaveLength(1);
      expect(data.data.revealedFields[0].name).toBe('probability');
    });

    it('should support multiple fields in comma-separated format', async () => {
      const uid = '0x' + 'a'.repeat(64);
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid,
        isPrivate: true,
        data: {
          merkleRoot: '0x' + 'b'.repeat(64),
          leaves: [
            { index: 0, name: 'probability', type: 'uint256', value: 7000, hash: '0x1' },
            { index: 1, name: 'confidence', type: 'uint256', value: 8000, hash: '0x2' },
            { index: 2, name: 'marketId', type: 'string', value: 'market-1', hash: '0x3' },
          ],
          proofs: {
            probability: ['0x1'],
            confidence: ['0x2'],
            marketId: ['0x3'],
          },
        },
      });

      const res = await app.request(`/api/attestations/${uid}/proof?fields=probability,confidence`);

      const data = await res.json();
      expect(data.data.revealedFields).toHaveLength(2);
      expect(data.data.revealedFields.map((f: { name: string }) => f.name)).toEqual(['probability', 'confidence']);
    });
  });

  // =============================================================================
  // POST /api/attestations/verify Tests
  // =============================================================================

  describe('POST /api/attestations/verify', () => {
    const validVerifyBody = {
      merkleRoot: '0x' + 'a'.repeat(64),
      revealedFields: [
        {
          name: 'probability',
          value: 7000,
          proof: ['0x' + '1'.repeat(64), '0x' + '2'.repeat(64)],
        },
      ],
    };

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/api/attestations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 400 for invalid merkle root format', async () => {
      const res = await app.request('/api/attestations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validVerifyBody,
          merkleRoot: 'not-a-hash',
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return not verified when attestation not found', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/attestations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validVerifyBody),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.verified).toBe(false);
      expect(data.data.attestationFound).toBe(false);
      expect(data.data.reason).toContain('not found in database');
    });

    it('should return verified when attestation found', async () => {
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid: '0x' + 'b'.repeat(64),
        schemaName: 'CalibrPrivateData',
        createdAt: new Date(),
        attester: 'user-1',
        recipient: '0x' + 'c'.repeat(40),
        merkleRoot: validVerifyBody.merkleRoot,
      });

      const res = await app.request('/api/attestations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validVerifyBody),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.verified).toBe(true);
      expect(data.data.attestationFound).toBe(true);
      expect(data.data.attestation).toBeDefined();
      expect(data.data.attestation.uid).toBe('0x' + 'b'.repeat(64));
    });

    it('should include attestation metadata in verified response', async () => {
      const createdAt = new Date('2024-01-15');
      mockPrisma.eASAttestation.findFirst.mockResolvedValue({
        uid: '0x' + 'b'.repeat(64),
        schemaName: 'CalibrPrivateData',
        createdAt,
        attester: 'user-1',
        recipient: '0x' + 'c'.repeat(40),
        merkleRoot: validVerifyBody.merkleRoot,
      });

      const res = await app.request('/api/attestations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validVerifyBody),
      });

      const data = await res.json();
      expect(data.data.attestation.schemaName).toBe('CalibrPrivateData');
      expect(data.data.attestation.attester).toBe('user-1');
      expect(data.data.attestation.recipient).toBe('0x' + 'c'.repeat(40));
    });
  });

  // =============================================================================
  // GET /api/attestations/user/stats Tests
  // =============================================================================

  describe('GET /api/attestations/user/stats', () => {
    it('should return attestation statistics', async () => {
      mockPrisma.eASAttestation.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // onchain
        .mockResolvedValueOnce(15) // offchain
        .mockResolvedValueOnce(5);  // private

      const res = await app.request('/api/attestations/user/stats', {
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(50);
      expect(data.data.onchain).toBe(30);
      expect(data.data.offchain).toBe(15);
      expect(data.data.private).toBe(5);
    });

    it('should use demo-user when no header provided', async () => {
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations/user/stats');

      expect(mockPrisma.eASAttestation.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'demo-user' },
        })
      );
    });

    it('should return zeros for new user', async () => {
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      const res = await app.request('/api/attestations/user/stats', {
        headers: { 'x-user-id': 'new-user' },
      });

      const data = await res.json();
      expect(data.data.total).toBe(0);
      expect(data.data.onchain).toBe(0);
      expect(data.data.offchain).toBe(0);
      expect(data.data.private).toBe(0);
    });

    it('should query with correct filters for each stat', async () => {
      mockPrisma.eASAttestation.count.mockResolvedValue(0);

      await app.request('/api/attestations/user/stats', {
        headers: { 'x-user-id': 'test-user' },
      });

      // Check that onchain query excludes offchain and private
      expect(mockPrisma.eASAttestation.count).toHaveBeenCalledWith({
        where: { userId: 'test-user', isOffchain: false, isPrivate: false },
      });

      // Check offchain query
      expect(mockPrisma.eASAttestation.count).toHaveBeenCalledWith({
        where: { userId: 'test-user', isOffchain: true },
      });

      // Check private query
      expect(mockPrisma.eASAttestation.count).toHaveBeenCalledWith({
        where: { userId: 'test-user', isPrivate: true },
      });
    });
  });
});
