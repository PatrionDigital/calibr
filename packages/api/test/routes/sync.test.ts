/**
 * Sync Routes Integration Tests
 * Tests sync scheduler and data synchronization endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

// Mock sync scheduler
vi.mock('../../src/services/sync-scheduler', () => ({
  syncScheduler: {
    getState: vi.fn(),
    getHealth: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    runMarketSync: vi.fn(),
    runPriceSync: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

// Mock polymarket sync
vi.mock('../../src/services/polymarket-sync', () => ({
  polymarketSync: {
    getStats: vi.fn(),
    healthCheck: vi.fn(),
  },
}));

import { syncScheduler } from '../../src/services/sync-scheduler';
import { polymarketSync } from '../../src/services/polymarket-sync';
import { syncRoutes } from '../../src/routes/sync';

const mockSyncScheduler = syncScheduler as {
  getState: ReturnType<typeof vi.fn>;
  getHealth: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  runMarketSync: ReturnType<typeof vi.fn>;
  runPriceSync: ReturnType<typeof vi.fn>;
  updateConfig: ReturnType<typeof vi.fn>;
};

const mockPolymarketSync = polymarketSync as {
  getStats: ReturnType<typeof vi.fn>;
  healthCheck: ReturnType<typeof vi.fn>;
};

// Create test app
const app = new Hono();
app.route('/sync', syncRoutes);

describe('Sync Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /sync/status Tests
  // =============================================================================

  describe('GET /sync/status', () => {
    it('should return scheduler status', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: true,
        marketSyncRunning: false,
        priceSyncRunning: false,
        lastMarketSync: new Date('2024-01-15T10:00:00Z'),
        lastPriceSync: new Date('2024-01-15T10:05:00Z'),
        errors: [],
      });
      mockSyncScheduler.getHealth.mockResolvedValue({
        healthy: true,
        lastCheck: new Date(),
      });

      const res = await app.request('/sync/status');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.scheduler.isRunning).toBe(true);
      expect(data.data.health.healthy).toBe(true);
    });

    it('should include sync state details', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: false,
        marketSyncRunning: true,
        priceSyncRunning: false,
        errors: ['Connection timeout'],
      });
      mockSyncScheduler.getHealth.mockResolvedValue({
        healthy: false,
      });

      const res = await app.request('/sync/status');

      const data = await res.json();
      expect(data.data.scheduler.marketSyncRunning).toBe(true);
      expect(data.data.scheduler.errors).toContain('Connection timeout');
    });
  });

  // =============================================================================
  // POST /sync/start Tests
  // =============================================================================

  describe('POST /sync/start', () => {
    it('should start the scheduler', async () => {
      mockSyncScheduler.start.mockResolvedValue(undefined);
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: true,
        marketSyncRunning: false,
        priceSyncRunning: false,
      });

      const res = await app.request('/sync/start', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Sync scheduler started');
      expect(mockSyncScheduler.start).toHaveBeenCalled();
    });

    it('should return current state after starting', async () => {
      mockSyncScheduler.start.mockResolvedValue(undefined);
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: true,
      });

      const res = await app.request('/sync/start', {
        method: 'POST',
      });

      const data = await res.json();
      expect(data.data.isRunning).toBe(true);
    });
  });

  // =============================================================================
  // POST /sync/stop Tests
  // =============================================================================

  describe('POST /sync/stop', () => {
    it('should stop the scheduler', async () => {
      mockSyncScheduler.stop.mockReturnValue(undefined);
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: false,
      });

      const res = await app.request('/sync/stop', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Sync scheduler stopped');
      expect(mockSyncScheduler.stop).toHaveBeenCalled();
    });

    it('should return stopped state', async () => {
      mockSyncScheduler.stop.mockReturnValue(undefined);
      mockSyncScheduler.getState.mockReturnValue({
        isRunning: false,
      });

      const res = await app.request('/sync/stop', {
        method: 'POST',
      });

      const data = await res.json();
      expect(data.data.isRunning).toBe(false);
    });
  });

  // =============================================================================
  // POST /sync/markets Tests
  // =============================================================================

  describe('POST /sync/markets', () => {
    it('should trigger market sync', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        marketSyncRunning: false,
      });
      mockSyncScheduler.runMarketSync.mockReturnValue(undefined);

      const res = await app.request('/sync/markets', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Market sync started');
      expect(data.data.status).toBe('running');
    });

    it('should return 409 when sync already running', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        marketSyncRunning: true,
      });

      const res = await app.request('/sync/markets', {
        method: 'POST',
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Market sync already in progress');
    });
  });

  // =============================================================================
  // POST /sync/markets/await Tests
  // =============================================================================

  describe('POST /sync/markets/await', () => {
    it('should trigger and wait for market sync', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        marketSyncRunning: false,
      });
      mockSyncScheduler.runMarketSync.mockResolvedValue({
        success: true,
        marketsUpdated: 150,
        duration: 5000,
      });

      const res = await app.request('/sync/markets/await', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.marketsUpdated).toBe(150);
    });

    it('should return 409 when sync already running', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        marketSyncRunning: true,
      });

      const res = await app.request('/sync/markets/await', {
        method: 'POST',
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe('Market sync already in progress');
    });

    it('should return 500 when sync fails to start', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        marketSyncRunning: false,
      });
      mockSyncScheduler.runMarketSync.mockResolvedValue(null);

      const res = await app.request('/sync/markets/await', {
        method: 'POST',
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Sync could not be started');
    });
  });

  // =============================================================================
  // POST /sync/prices Tests
  // =============================================================================

  describe('POST /sync/prices', () => {
    it('should trigger price sync', async () => {
      mockSyncScheduler.runPriceSync.mockResolvedValue({
        success: true,
        pricesUpdated: 500,
      });

      const res = await app.request('/sync/prices', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.pricesUpdated).toBe(500);
    });

    it('should return 409 when already running', async () => {
      mockSyncScheduler.runPriceSync.mockResolvedValue(null);

      const res = await app.request('/sync/prices', {
        method: 'POST',
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe('Price sync could not be started (already running)');
    });
  });

  // =============================================================================
  // GET /sync/stats Tests
  // =============================================================================

  describe('GET /sync/stats', () => {
    it('should return sync statistics', async () => {
      mockPolymarketSync.getStats.mockResolvedValue({
        totalMarkets: 1500,
        activeMarkets: 800,
        resolvedMarkets: 700,
        lastSync: new Date('2024-01-15T10:00:00Z'),
        averageSyncTime: 4500,
      });

      const res = await app.request('/sync/stats');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalMarkets).toBe(1500);
      expect(data.data.activeMarkets).toBe(800);
    });
  });

  // =============================================================================
  // GET /sync/health Tests
  // =============================================================================

  describe('GET /sync/health', () => {
    it('should return 200 when healthy', async () => {
      mockPolymarketSync.healthCheck.mockResolvedValue({
        healthy: true,
        database: 'connected',
        redis: 'connected',
        lastSync: new Date(),
      });

      const res = await app.request('/sync/health');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.healthy).toBe(true);
    });

    it('should return 503 when unhealthy', async () => {
      mockPolymarketSync.healthCheck.mockResolvedValue({
        healthy: false,
        database: 'disconnected',
        error: 'Database connection failed',
      });

      const res = await app.request('/sync/health');

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.data.healthy).toBe(false);
    });
  });

  // =============================================================================
  // GET /sync/errors Tests
  // =============================================================================

  describe('GET /sync/errors', () => {
    it('should return empty errors when none', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        errors: [],
      });

      const res = await app.request('/sync/errors');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.errors).toEqual([]);
      expect(data.data.total).toBe(0);
    });

    it('should return sync errors', async () => {
      mockSyncScheduler.getState.mockReturnValue({
        errors: [
          { message: 'API timeout', timestamp: new Date() },
          { message: 'Rate limited', timestamp: new Date() },
        ],
      });

      const res = await app.request('/sync/errors');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.total).toBe(2);
      expect(data.data.errors).toHaveLength(2);
    });
  });

  // =============================================================================
  // PUT /sync/config Tests
  // =============================================================================

  describe('PUT /sync/config', () => {
    it('should update market sync interval', async () => {
      const res = await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketSyncInterval: 60000,
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Configuration updated');
      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          marketSyncInterval: 60000,
        })
      );
    });

    it('should update price sync interval', async () => {
      await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceSyncInterval: 10000,
        }),
      });

      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          priceSyncInterval: 10000,
        })
      );
    });

    it('should ignore invalid market sync interval (too small)', async () => {
      await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketSyncInterval: 5000, // Below minimum of 10000
        }),
      });

      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith({});
    });

    it('should ignore invalid price sync interval (too small)', async () => {
      await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceSyncInterval: 2000, // Below minimum of 5000
        }),
      });

      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith({});
    });

    it('should update syncOnStartup setting', async () => {
      await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncOnStartup: true,
        }),
      });

      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          syncOnStartup: true,
        })
      );
    });

    it('should return 400 for invalid JSON', async () => {
      const res = await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid request body');
    });

    it('should accept multiple config options at once', async () => {
      await app.request('/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketSyncInterval: 30000,
          priceSyncInterval: 15000,
          syncOnStartup: false,
        }),
      });

      expect(mockSyncScheduler.updateConfig).toHaveBeenCalledWith({
        marketSyncInterval: 30000,
        priceSyncInterval: 15000,
        syncOnStartup: false,
      });
    });
  });
});
