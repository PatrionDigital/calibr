/**
 * Sync Scheduler Service Tests
 * Tests the sync scheduling and coordination logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all sync services
vi.mock('../../src/services/polymarket-sync', () => ({
  polymarketSync: {
    syncMarkets: vi.fn(),
    syncPrices: vi.fn(),
    healthCheck: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../../src/services/limitless-sync', () => ({
  limitlessSync: {
    syncMarkets: vi.fn(),
    syncPrices: vi.fn(),
    healthCheck: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../../src/services/opinion-sync', () => ({
  opinionSync: {
    syncMarkets: vi.fn(),
    syncPrices: vi.fn(),
  },
}));

vi.mock('../../src/services/manifold-sync', () => ({
  manifoldSync: {
    syncMarkets: vi.fn(),
    syncPrices: vi.fn(),
  },
}));

import { SyncScheduler } from '../../src/services/sync-scheduler';
import { polymarketSync } from '../../src/services/polymarket-sync';
import { limitlessSync } from '../../src/services/limitless-sync';
import { opinionSync } from '../../src/services/opinion-sync';
import { manifoldSync } from '../../src/services/manifold-sync';

const mockPolymarketSync = polymarketSync as {
  syncMarkets: ReturnType<typeof vi.fn>;
  syncPrices: ReturnType<typeof vi.fn>;
  healthCheck: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
};

const mockLimitlessSync = limitlessSync as {
  syncMarkets: ReturnType<typeof vi.fn>;
  syncPrices: ReturnType<typeof vi.fn>;
  healthCheck: ReturnType<typeof vi.fn>;
  getStats: ReturnType<typeof vi.fn>;
};

const mockOpinionSync = opinionSync as {
  syncMarkets: ReturnType<typeof vi.fn>;
  syncPrices: ReturnType<typeof vi.fn>;
};

const mockManifoldSync = manifoldSync as {
  syncMarkets: ReturnType<typeof vi.fn>;
  syncPrices: ReturnType<typeof vi.fn>;
};

describe('SyncScheduler', () => {
  let scheduler: SyncScheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Set up default mock responses
    mockPolymarketSync.syncMarkets.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 1000,
      marketsCreated: 10,
      marketsUpdated: 50,
      pricesUpdated: 100,
      errors: [],
    });

    mockLimitlessSync.syncMarkets.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 500,
      marketsCreated: 5,
      marketsUpdated: 20,
      pricesUpdated: 50,
      errors: [],
    });

    mockOpinionSync.syncMarkets.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 300,
      marketsCreated: 2,
      marketsUpdated: 10,
      pricesUpdated: 25,
      errors: [],
    });

    mockManifoldSync.syncMarkets.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 400,
      marketsCreated: 3,
      marketsUpdated: 15,
      pricesUpdated: 30,
      errors: [],
    });

    mockPolymarketSync.syncPrices.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 200,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 100,
      errors: [],
    });

    mockLimitlessSync.syncPrices.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 100,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 50,
      errors: [],
    });

    mockOpinionSync.syncPrices.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 50,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 25,
      errors: [],
    });

    mockManifoldSync.syncPrices.mockResolvedValue({
      success: true,
      syncedAt: new Date(),
      duration: 75,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 30,
      errors: [],
    });

    mockPolymarketSync.healthCheck.mockResolvedValue({
      healthy: true,
      details: { database: true, api: true },
    });

    mockLimitlessSync.healthCheck.mockResolvedValue({
      healthy: true,
      details: { database: true, api: true },
    });

    mockPolymarketSync.getStats.mockResolvedValue({
      totalMarkets: 1000,
      activeMarkets: 500,
      lastSync: new Date(),
      recentErrors: 0,
    });

    mockLimitlessSync.getStats.mockResolvedValue({
      totalMarkets: 200,
      activeMarkets: 150,
      lastSync: new Date(),
      recentErrors: 0,
    });

    // Create scheduler with test config (no startup sync, short intervals)
    scheduler = new SyncScheduler({
      marketSyncInterval: 60000,
      priceSyncInterval: 30000,
      syncOnStartup: false,
    });
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =============================================================================
  // Constructor Tests
  // =============================================================================

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const state = scheduler.getState();

      expect(state.isRunning).toBe(false);
      expect(state.marketSyncRunning).toBe(false);
      expect(state.priceSyncRunning).toBe(false);
      expect(state.lastMarketSync).toBeNull();
      expect(state.lastPriceSync).toBeNull();
      expect(state.marketSyncCount).toBe(0);
      expect(state.priceSyncCount).toBe(0);
      expect(state.errors).toEqual([]);
    });

    it('should accept custom config', () => {
      const customScheduler = new SyncScheduler({
        marketSyncInterval: 120000,
        priceSyncInterval: 60000,
        syncOnStartup: false,
      });

      expect(customScheduler.getState().isRunning).toBe(false);
      customScheduler.stop();
    });
  });

  // =============================================================================
  // Lifecycle Tests
  // =============================================================================

  describe('start', () => {
    it('should start the scheduler', async () => {
      await scheduler.start();

      expect(scheduler.getState().isRunning).toBe(true);
    });

    it('should not restart if already running', async () => {
      await scheduler.start();
      await scheduler.start();

      expect(scheduler.getState().isRunning).toBe(true);
    });

    it('should run initial sync if configured', async () => {
      const syncOnStartupScheduler = new SyncScheduler({
        marketSyncInterval: 60000,
        priceSyncInterval: 30000,
        syncOnStartup: true,
      });

      await syncOnStartupScheduler.start();

      expect(mockPolymarketSync.syncMarkets).toHaveBeenCalled();
      syncOnStartupScheduler.stop();
    });
  });

  describe('stop', () => {
    it('should stop the scheduler', async () => {
      await scheduler.start();
      scheduler.stop();

      expect(scheduler.getState().isRunning).toBe(false);
    });

    it('should handle stop when not running', () => {
      scheduler.stop();
      expect(scheduler.getState().isRunning).toBe(false);
    });
  });

  // =============================================================================
  // Market Sync Tests
  // =============================================================================

  describe('runMarketSync', () => {
    it('should sync all platforms', async () => {
      const result = await scheduler.runMarketSync();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(mockPolymarketSync.syncMarkets).toHaveBeenCalled();
      expect(mockLimitlessSync.syncMarkets).toHaveBeenCalled();
      expect(mockOpinionSync.syncMarkets).toHaveBeenCalled();
      expect(mockManifoldSync.syncMarkets).toHaveBeenCalled();
    });

    it('should aggregate results from all platforms', async () => {
      const result = await scheduler.runMarketSync();

      expect(result?.marketsCreated).toBe(20); // 10 + 5 + 2 + 3
      expect(result?.marketsUpdated).toBe(95); // 50 + 20 + 10 + 15
      expect(result?.pricesUpdated).toBe(205); // 100 + 50 + 25 + 30
    });

    it('should update state after sync', async () => {
      await scheduler.runMarketSync();

      const state = scheduler.getState();
      expect(state.lastMarketSync).not.toBeNull();
      expect(state.marketSyncCount).toBe(1);
    });

    it('should return null if sync already running', async () => {
      // Start first sync
      const firstSync = scheduler.runMarketSync();

      // Try to start second sync while first is running
      const secondResult = await scheduler.runMarketSync();

      expect(secondResult).toBeNull();
      await firstSync;
    });

    it('should handle platform errors gracefully', async () => {
      mockOpinionSync.syncMarkets.mockRejectedValue(new Error('API timeout'));

      const result = await scheduler.runMarketSync();

      expect(result).not.toBeNull();
      expect(result?.errors.length).toBeGreaterThan(0);
      expect(result?.errors.some(e => e.includes('Opinion'))).toBe(true);
    });

    it('should continue syncing other platforms on error', async () => {
      mockPolymarketSync.syncMarkets.mockResolvedValue({
        success: false,
        syncedAt: new Date(),
        duration: 100,
        marketsCreated: 0,
        marketsUpdated: 0,
        pricesUpdated: 0,
        errors: ['Connection failed'],
      });

      const result = await scheduler.runMarketSync();

      expect(mockLimitlessSync.syncMarkets).toHaveBeenCalled();
      expect(mockOpinionSync.syncMarkets).toHaveBeenCalled();
      expect(mockManifoldSync.syncMarkets).toHaveBeenCalled();
      expect(result?.success).toBe(false);
    });

    it('should call onSyncComplete callback', async () => {
      const onSyncComplete = vi.fn();
      const callbackScheduler = new SyncScheduler({
        marketSyncInterval: 60000,
        priceSyncInterval: 30000,
        syncOnStartup: false,
        onSyncComplete,
      });

      await callbackScheduler.runMarketSync();

      expect(onSyncComplete).toHaveBeenCalledWith('markets', expect.any(Object));
      callbackScheduler.stop();
    });
  });

  // =============================================================================
  // Price Sync Tests
  // =============================================================================

  describe('runPriceSync', () => {
    it('should sync prices for all platforms', async () => {
      const result = await scheduler.runPriceSync();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(mockPolymarketSync.syncPrices).toHaveBeenCalled();
      expect(mockLimitlessSync.syncPrices).toHaveBeenCalled();
    });

    it('should aggregate price updates', async () => {
      const result = await scheduler.runPriceSync();

      expect(result?.pricesUpdated).toBe(205); // 100 + 50 + 25 + 30
    });

    it('should update state after sync', async () => {
      await scheduler.runPriceSync();

      const state = scheduler.getState();
      expect(state.lastPriceSync).not.toBeNull();
      expect(state.priceSyncCount).toBe(1);
    });

    it('should return null if sync already running', async () => {
      const firstSync = scheduler.runPriceSync();
      const secondResult = await scheduler.runPriceSync();

      expect(secondResult).toBeNull();
      await firstSync;
    });

    it('should handle platform errors gracefully', async () => {
      mockOpinionSync.syncPrices.mockRejectedValue(new Error('Rate limited'));

      const result = await scheduler.runPriceSync();

      expect(result?.errors.some(e => e.includes('Opinion'))).toBe(true);
    });
  });

  // =============================================================================
  // State & Health Tests
  // =============================================================================

  describe('getState', () => {
    it('should return current state', () => {
      const state = scheduler.getState();

      expect(state).toHaveProperty('isRunning');
      expect(state).toHaveProperty('marketSyncRunning');
      expect(state).toHaveProperty('priceSyncRunning');
      expect(state).toHaveProperty('errors');
    });

    it('should return a copy of state', () => {
      const state1 = scheduler.getState();
      const state2 = scheduler.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('getHealth', () => {
    it('should return health status for all platforms', async () => {
      const health = await scheduler.getHealth();

      expect(health.scheduler).toBe(false); // Not started
      expect(health.polymarket.healthy).toBe(true);
      expect(health.limitless.healthy).toBe(true);
      expect(health.stats.polymarket.totalMarkets).toBe(1000);
      expect(health.stats.limitless.totalMarkets).toBe(200);
    });

    it('should reflect scheduler running state', async () => {
      await scheduler.start();
      const health = await scheduler.getHealth();

      expect(health.scheduler).toBe(true);
    });
  });

  // =============================================================================
  // Config Tests
  // =============================================================================

  describe('updateConfig', () => {
    it('should update configuration', () => {
      scheduler.updateConfig({ marketSyncInterval: 120000 });

      // Config updated (no direct way to verify, but it shouldn't throw)
      expect(scheduler.getState().isRunning).toBe(false);
    });

    it('should restart scheduler if running when config updated', async () => {
      await scheduler.start();
      expect(scheduler.getState().isRunning).toBe(true);

      scheduler.updateConfig({ marketSyncInterval: 90000 });

      // Should still be running after config update
      expect(scheduler.getState().isRunning).toBe(true);
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('error handling', () => {
    it('should store errors in state', async () => {
      mockPolymarketSync.syncMarkets.mockResolvedValue({
        success: false,
        syncedAt: new Date(),
        duration: 100,
        marketsCreated: 0,
        marketsUpdated: 0,
        pricesUpdated: 0,
        errors: ['Connection failed'],
      });

      await scheduler.runMarketSync();

      const state = scheduler.getState();
      expect(state.errors.length).toBeGreaterThan(0);
    });

    it('should limit errors to last 50', async () => {
      // Force many errors
      mockPolymarketSync.syncMarkets.mockResolvedValue({
        success: false,
        syncedAt: new Date(),
        duration: 100,
        marketsCreated: 0,
        marketsUpdated: 0,
        pricesUpdated: 0,
        errors: ['Error'],
      });

      for (let i = 0; i < 60; i++) {
        await scheduler.runMarketSync();
      }

      const state = scheduler.getState();
      expect(state.errors.length).toBeLessThanOrEqual(50);
    });

    it('should call onSyncError callback on exception', async () => {
      const onSyncError = vi.fn();
      const callbackScheduler = new SyncScheduler({
        marketSyncInterval: 60000,
        priceSyncInterval: 30000,
        syncOnStartup: false,
        onSyncError,
      });

      // Make all syncs throw
      mockPolymarketSync.syncMarkets.mockRejectedValue(new Error('Fatal error'));
      mockLimitlessSync.syncMarkets.mockRejectedValue(new Error('Fatal error'));
      mockOpinionSync.syncMarkets.mockRejectedValue(new Error('Fatal error'));
      mockManifoldSync.syncMarkets.mockRejectedValue(new Error('Fatal error'));

      await callbackScheduler.runMarketSync();

      expect(onSyncError).toHaveBeenCalledWith('markets', expect.any(Error));
      callbackScheduler.stop();
    });
  });

  // =============================================================================
  // Timer Tests
  // =============================================================================

  describe('scheduled syncs', () => {
    it('should run market sync on interval', async () => {
      await scheduler.start();

      // Advance time past market sync interval
      await vi.advanceTimersByTimeAsync(60000);

      expect(mockPolymarketSync.syncMarkets).toHaveBeenCalled();
    });

    it('should run price sync on interval', async () => {
      await scheduler.start();

      // Advance time past price sync interval
      await vi.advanceTimersByTimeAsync(30000);

      expect(mockPolymarketSync.syncPrices).toHaveBeenCalled();
    });

    it('should stop timers when stopped', async () => {
      await scheduler.start();
      scheduler.stop();

      // Clear mock call counts
      vi.clearAllMocks();

      // Advance time
      await vi.advanceTimersByTimeAsync(120000);

      // No new syncs should have run
      expect(mockPolymarketSync.syncMarkets).not.toHaveBeenCalled();
      expect(mockPolymarketSync.syncPrices).not.toHaveBeenCalled();
    });
  });
});
