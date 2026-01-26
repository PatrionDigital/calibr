/**
 * Forecast Routes Integration Tests
 * Tests forecast journaling functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { forecastRoutes } from '../../src/routes/forecasts';

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
    forecast: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    unifiedMarket: {
      findUnique: vi.fn(),
    },
    eASAttestation: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  user: { upsert: ReturnType<typeof vi.fn> };
  forecast: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  unifiedMarket: { findUnique: ReturnType<typeof vi.fn> };
  eASAttestation: { create: ReturnType<typeof vi.fn> };
};

// Create test app
const app = new Hono();
app.route('/api/forecasts', forecastRoutes);

describe('Forecast Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /api/forecasts Tests
  // =============================================================================

  describe('GET /api/forecasts', () => {
    it('should return empty list when no forecasts', async () => {
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.forecast.count.mockResolvedValue(0);

      const res = await app.request('/api/forecasts', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.forecasts).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should return forecasts with calculated values', async () => {
      const mockForecast = {
        id: 'f1',
        userId: 'test-user',
        probability: 0.7,
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true,
        unifiedMarket: {
          id: 'm1',
          question: 'Will X happen?',
          bestYesPrice: 0.5,
          bestNoPrice: 0.5,
          isActive: true,
          resolution: null,
          resolvedAt: null,
        },
        previousForecast: null,
      };

      mockPrisma.forecast.findMany.mockResolvedValue([mockForecast]);
      mockPrisma.forecast.count.mockResolvedValue(1);

      const res = await app.request('/api/forecasts', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.forecasts).toHaveLength(1);
      expect(data.data.forecasts[0].calculated.edge).toBeCloseTo(0.2);
      expect(data.data.forecasts[0].calculated.hasPositiveEdge).toBe(true);
    });

    it('should respect limit and offset parameters', async () => {
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.forecast.count.mockResolvedValue(100);

      const res = await app.request('/api/forecasts?limit=10&offset=20', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      expect(mockPrisma.forecast.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should cap limit at 100', async () => {
      mockPrisma.forecast.findMany.mockResolvedValue([]);
      mockPrisma.forecast.count.mockResolvedValue(0);

      await app.request('/api/forecasts?limit=200', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(mockPrisma.forecast.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });
  });

  // =============================================================================
  // GET /api/forecasts/user/stats Tests
  // =============================================================================

  describe('GET /api/forecasts/user/stats', () => {
    it('should return user forecast statistics', async () => {
      mockPrisma.forecast.count.mockResolvedValue(50);
      mockPrisma.forecast.findMany.mockResolvedValue([]);

      const res = await app.request('/api/forecasts/user/stats', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalForecasts).toBe(50);
    });
  });

  // =============================================================================
  // GET /api/forecasts/:id Tests
  // =============================================================================

  describe('GET /api/forecasts/:id', () => {
    it('should return 404 when forecast not found', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/forecasts/non-existent', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Forecast not found');
    });

    it('should return forecast by id', async () => {
      const mockForecast = {
        id: 'f1',
        userId: 'test-user',
        probability: 0.7,
        unifiedMarket: { question: 'Test?' },
        previousForecast: null,
        nextForecasts: [],
      };

      mockPrisma.forecast.findFirst.mockResolvedValue(mockForecast);

      const res = await app.request('/api/forecasts/f1', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('f1');
    });
  });

  // =============================================================================
  // POST /api/forecasts Tests
  // =============================================================================

  describe('POST /api/forecasts', () => {
    beforeEach(() => {
      mockPrisma.user.upsert.mockResolvedValue({ id: 'test-user' });
    });

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/api/forecasts', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should return 400 for invalid probability', async () => {
      const res = await app.request('/api/forecasts', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unifiedMarketId: 'm1',
          probability: 1.5, // Invalid
        }),
      });

      expect(res.status).toBe(400);
    });

    it('should return 404 when market not found', async () => {
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(null);

      const res = await app.request('/api/forecasts', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unifiedMarketId: 'non-existent',
          probability: 0.7,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('Market not found');
    });

    it('should return 400 when market is not active', async () => {
      mockPrisma.unifiedMarket.findUnique.mockResolvedValue({
        id: 'm1',
        isActive: false,
      });

      const res = await app.request('/api/forecasts', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unifiedMarketId: 'm1',
          probability: 0.7,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Market is no longer active');
    });

    it('should create forecast successfully', async () => {
      const market = {
        id: 'm1',
        bestYesPrice: 0.5,
        bestNoPrice: 0.5,
        isActive: true,
      };

      mockPrisma.unifiedMarket.findUnique.mockResolvedValue(market);
      mockPrisma.forecast.findFirst.mockResolvedValue(null);
      mockPrisma.forecast.create.mockResolvedValue({
        id: 'new-forecast',
        userId: 'test-user',
        unifiedMarketId: 'm1',
        probability: 0.7,
        confidence: 0.5,
        isPublic: true,
        kellyFraction: 0.5,
        marketYesPrice: 0.5,
        marketNoPrice: 0.5,
        createdAt: new Date(),
        unifiedMarket: {
          id: 'm1',
          question: 'Will X happen?',
          bestYesPrice: 0.5,
          bestNoPrice: 0.5,
        },
      });

      const res = await app.request('/api/forecasts', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unifiedMarketId: 'm1',
          probability: 0.7,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.forecast.id).toBe('new-forecast');
      expect(data.data.calculated.edge).toBeCloseTo(0.2);
    });
  });

  // =============================================================================
  // DELETE /api/forecasts/:id Tests
  // =============================================================================

  describe('DELETE /api/forecasts/:id', () => {
    it('should return 404 when forecast not found', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/forecasts/non-existent', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when forecast is attested', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue({
        id: 'f1',
        easAttestationUid: 'uid-123',
      });

      const res = await app.request('/api/forecasts/f1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Cannot delete attested forecast');
    });

    it('should delete forecast successfully', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue({
        id: 'f1',
        easAttestationUid: null,
      });
      mockPrisma.forecast.delete.mockResolvedValue({ id: 'f1' });

      const res = await app.request('/api/forecasts/f1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.deleted).toBe(true);
    });
  });

  // =============================================================================
  // GET /api/forecasts/:id/attest Tests
  // =============================================================================

  describe('GET /api/forecasts/:id/attest', () => {
    it('should return 404 when forecast not found', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/forecasts/non-existent/attest', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(404);
    });

    it('should return attestation data', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue({
        id: 'f1',
        probability: 0.7,
        confidence: 0.8,
        commitMessage: 'Test reason',
        isPublic: true,
        easAttestationUid: null,
        unifiedMarketId: 'm1',
        unifiedMarket: { question: 'Will X happen?' },
      });

      const res = await app.request('/api/forecasts/f1/attest', {
        method: 'GET',
        headers: { 'x-user-id': 'test-user' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.forecastId).toBe('f1');
      expect(data.data.isAttested).toBe(false);
      expect(data.data.attestationData.fields.probability).toBe(7000); // basis points
    });
  });

  // =============================================================================
  // POST /api/forecasts/:id/attest Tests
  // =============================================================================

  describe('POST /api/forecasts/:id/attest', () => {
    it('should return 400 when attestationUid missing', async () => {
      const res = await app.request('/api/forecasts/f1/attest', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('attestationUid is required');
    });

    it('should return 404 when forecast not found', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue(null);

      const res = await app.request('/api/forecasts/non-existent/attest', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attestationUid: 'uid-123' }),
      });

      expect(res.status).toBe(404);
    });

    it('should return 400 when already attested', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue({
        id: 'f1',
        easAttestationUid: 'existing-uid',
        unifiedMarket: { question: 'Test?' },
      });

      const res = await app.request('/api/forecasts/f1/attest', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attestationUid: 'new-uid' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Forecast already attested');
    });

    it('should record attestation successfully', async () => {
      mockPrisma.forecast.findFirst.mockResolvedValue({
        id: 'f1',
        userId: 'test-user',
        probability: 0.7,
        confidence: 0.8,
        commitMessage: 'Test',
        isPublic: true,
        easAttestationUid: null,
        unifiedMarketId: 'm1',
        unifiedMarket: { question: 'Test?' },
      });
      mockPrisma.forecast.update.mockResolvedValue({
        id: 'f1',
        probability: 0.7,
        easAttestationUid: 'uid-123',
        easAttestedAt: new Date(),
      });
      mockPrisma.eASAttestation.create.mockResolvedValue({ uid: 'uid-123' });

      const res = await app.request('/api/forecasts/f1/attest', {
        method: 'POST',
        headers: {
          'x-user-id': 'test-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attestationUid: 'uid-123',
          txHash: '0x123',
          chainId: 8453,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.attestation.uid).toBe('uid-123');
      expect(data.data.attestation.easScanUrl).toContain('base.easscan.org');
    });
  });
});
