/**
 * GDPR Routes Integration Tests
 * Tests data export and deletion functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { gdprRoutes } from '../../src/routes/gdpr';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userPrivacySettings: {
      findUnique: vi.fn(),
    },
    userCalibration: {
      findUnique: vi.fn(),
    },
    walletConnection: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    forecast: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    position: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    eASAttestation: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    dataDeletionRequest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  userPrivacySettings: { findUnique: ReturnType<typeof vi.fn> };
  userCalibration: { findUnique: ReturnType<typeof vi.fn> };
  walletConnection: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  forecast: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  position: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  transaction: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  eASAttestation: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  dataDeletionRequest: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

// Create test app
const app = new Hono();
app.route('/api/gdpr', gdprRoutes);

describe('GDPR Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /api/gdpr/export Tests
  // =============================================================================

  describe('GET /api/gdpr/export', () => {
    it('should return 404 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.userPrivacySettings.findUnique.mockResolvedValue(null);
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);

      const res = await app.request('/api/gdpr/export', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found');
    });

    it('should return user export data', async () => {
      const mockUser = {
        id: 'test-user',
        displayName: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userPrivacySettings.findUnique.mockResolvedValue(null);
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);

      const res = await app.request('/api/gdpr/export', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.exportedAt).toBeDefined();
    });

    it('should use demo-user as default when no x-user-id header', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'demo-user',
        displayName: 'Demo User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.userPrivacySettings.findUnique.mockResolvedValue(null);
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);

      const res = await app.request('/api/gdpr/export', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'demo-user' },
      });
    });
  });

  // =============================================================================
  // GET /api/gdpr/export/download Tests
  // =============================================================================

  describe('GET /api/gdpr/export/download', () => {
    it('should return JSON file with correct headers', async () => {
      const mockUser = {
        id: 'test-user',
        displayName: 'Test User',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.userPrivacySettings.findUnique.mockResolvedValue(null);
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);
      mockPrisma.walletConnection.findMany.mockResolvedValue([]);
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.position.findMany.mockResolvedValue([]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.eASAttestation.findMany.mockResolvedValue([]);

      const res = await app.request('/api/gdpr/export/download', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/json');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
      expect(res.headers.get('Content-Disposition')).toContain('calibr-export');
    });
  });

  // =============================================================================
  // GET /api/gdpr/delete-requests Tests
  // =============================================================================

  describe('GET /api/gdpr/delete-requests', () => {
    it('should return empty array when no requests exist', async () => {
      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue([]);

      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return formatted deletion requests', async () => {
      const mockRequest = {
        id: 'req-1',
        userId: 'test-user',
        requestType: 'FULL_ACCOUNT',
        reason: 'Test reason',
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
        processedAt: null,
        completedAt: null,
        attestationsRevoked: 0,
        offchainDataDeleted: false,
      };

      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue([mockRequest]);

      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe('req-1');
      expect(data.data[0].requestType).toBe('FULL_ACCOUNT');
    });
  });

  // =============================================================================
  // GET /api/gdpr/delete-requests/:id Tests
  // =============================================================================

  describe('GET /api/gdpr/delete-requests/:id', () => {
    it('should return 404 when request not found', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/gdpr/delete-requests/non-existent', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Deletion request not found');
    });

    it('should return specific deletion request', async () => {
      const mockRequest = {
        id: 'req-1',
        userId: 'test-user',
        requestType: 'FORECASTS_ONLY',
        reason: null,
        status: 'COMPLETED',
        createdAt: new Date('2024-01-01'),
        processedAt: new Date('2024-01-02'),
        completedAt: new Date('2024-01-03'),
        attestationsRevoked: 5,
        offchainDataDeleted: true,
      };

      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue(mockRequest);

      const res = await app.request('/api/gdpr/delete-requests/req-1', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('req-1');
      expect(data.data.attestationsRevoked).toBe(5);
    });
  });

  // =============================================================================
  // POST /api/gdpr/delete-requests Tests
  // =============================================================================

  describe('POST /api/gdpr/delete-requests', () => {
    beforeEach(() => {
      // Default mocks for counts
      mockPrisma.forecast.count.mockResolvedValue(10);
      mockPrisma.position.count.mockResolvedValue(5);
      mockPrisma.transaction.count.mockResolvedValue(15);
      mockPrisma.eASAttestation.count.mockResolvedValue(3);
      mockPrisma.walletConnection.count.mockResolvedValue(2);
    });

    it('should return 400 for invalid request type', async () => {
      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'INVALID_TYPE',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should return 409 when pending request exists', async () => {
      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue([
        { id: 'req-1', status: 'PENDING' },
      ]);

      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'FULL_ACCOUNT',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('should create deletion request successfully', async () => {
      mockPrisma.dataDeletionRequest.findMany.mockResolvedValue([]);
      mockPrisma.dataDeletionRequest.create.mockResolvedValue({
        id: 'new-req',
        userId: 'test-user',
        requestType: 'FULL_ACCOUNT',
        reason: 'Leaving platform',
        status: 'PENDING',
        createdAt: new Date(),
        processedAt: null,
        completedAt: null,
        attestationsRevoked: 0,
        offchainDataDeleted: false,
      });

      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'FULL_ACCOUNT',
          reason: 'Leaving platform',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.request.id).toBe('new-req');
      expect(data.data.plan).toBeDefined();
      expect(data.data.timeEstimate).toBeDefined();
    });

    it('should reject reason over 1000 characters', async () => {
      const res = await app.request('/api/gdpr/delete-requests', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'FULL_ACCOUNT',
          reason: 'a'.repeat(1001),
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  // =============================================================================
  // DELETE /api/gdpr/delete-requests/:id Tests
  // =============================================================================

  describe('DELETE /api/gdpr/delete-requests/:id', () => {
    it('should return 404 when request not found', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/gdpr/delete-requests/non-existent', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 409 when request is not pending', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'IN_PROGRESS',
      });

      const res = await app.request('/api/gdpr/delete-requests/req-1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('IN_PROGRESS');
    });

    it('should cancel pending request successfully', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
      });
      mockPrisma.dataDeletionRequest.delete.mockResolvedValue({ id: 'req-1' });

      const res = await app.request('/api/gdpr/delete-requests/req-1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Deletion request cancelled');
    });
  });
});
