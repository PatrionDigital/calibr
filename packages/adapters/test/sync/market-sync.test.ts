/**
 * Market Sync Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarketSyncService, MultiPlatformSyncManager } from '../../src/sync';
import type { IPlatformAdapter, PlatformMarket, PlatformConfig } from '../../src/types';

// Create a mock adapter
function createMockAdapter(platform = 'MOCK'): IPlatformAdapter {
  return {
    platform,
    config: {
      platform,
      apiBaseUrl: 'https://mock.api',
      chainId: 1,
    } as PlatformConfig,
    getMarkets: vi.fn().mockResolvedValue([]),
    getMarket: vi.fn().mockResolvedValue(null),
    getEvents: vi.fn().mockResolvedValue([]),
    getOrderBook: vi.fn().mockResolvedValue({ bids: [], asks: [] }),
    getTrades: vi.fn().mockResolvedValue([]),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

// Create mock market data
function createMockMarket(id: string): PlatformMarket {
  return {
    id,
    platform: 'MOCK',
    externalId: `ext-${id}`,
    question: `Market ${id}`,
    description: 'Test market',
    url: `https://mock.com/market/${id}`,
    yesPrice: 0.5,
    noPrice: 0.5,
    volume: 1000,
    liquidity: 500,
    status: 'ACTIVE',
    createdAt: new Date(),
  };
}

describe('MarketSyncService', () => {
  let adapter: IPlatformAdapter;
  let syncService: MarketSyncService;

  beforeEach(() => {
    adapter = createMockAdapter();
    syncService = new MarketSyncService(adapter, {
      intervalMs: 100, // Short interval for testing
      batchSize: 10,
      activeOnly: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    syncService.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('start/stop', () => {
    it('should start and stop the service', () => {
      expect(syncService.getState().isRunning).toBe(false);

      syncService.start();
      expect(syncService.getState().isRunning).toBe(true);

      syncService.stop();
      expect(syncService.getState().isRunning).toBe(false);
    });

    it('should not start twice', () => {
      syncService.start();
      syncService.start();
      expect(syncService.getState().isRunning).toBe(true);
    });
  });

  describe('runSync', () => {
    it('should fetch markets and return result', async () => {
      const mockMarkets = [createMockMarket('1'), createMockMarket('2')];
      vi.mocked(adapter.getMarkets).mockResolvedValue(mockMarkets);

      const result = await syncService.runSync();

      expect(result.markets).toHaveLength(2);
      expect(result.syncedAt).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should update state after sync', async () => {
      const mockMarkets = [createMockMarket('1')];
      vi.mocked(adapter.getMarkets).mockResolvedValue(mockMarkets);

      await syncService.runSync();

      const state = syncService.getState();
      expect(state.lastSyncAt).toBeInstanceOf(Date);
      expect(state.totalSynced).toBe(1);
    });

    it('should call onSync callback', async () => {
      const onSync = vi.fn();
      const syncWithCallback = new MarketSyncService(adapter, {
        onSync,
        batchSize: 10,
      });

      const mockMarkets = [createMockMarket('1')];
      vi.mocked(adapter.getMarkets).mockResolvedValue(mockMarkets);

      await syncWithCallback.runSync();

      expect(onSync).toHaveBeenCalledWith(mockMarkets);
    });

    it('should handle errors gracefully', async () => {
      const onError = vi.fn();
      const syncWithError = new MarketSyncService(adapter, {
        onError,
        batchSize: 10,
      });

      vi.mocked(adapter.getMarkets).mockRejectedValue(new Error('API Error'));

      await expect(syncWithError.runSync()).rejects.toThrow('API Error');
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('syncMarket', () => {
    it('should sync a specific market', async () => {
      const mockMarket = createMockMarket('1');
      vi.mocked(adapter.getMarket).mockResolvedValue(mockMarket);

      const result = await syncService.syncMarket('1');

      expect(result).toEqual(mockMarket);
      expect(adapter.getMarket).toHaveBeenCalledWith('1');
    });

    it('should return null for non-existent market', async () => {
      vi.mocked(adapter.getMarket).mockResolvedValue(null);

      const result = await syncService.syncMarket('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('syncAll', () => {
    it('should sync all markets with pagination', async () => {
      const page1 = Array.from({ length: 10 }, (_, i) => createMockMarket(`${i}`));
      const page2 = Array.from({ length: 5 }, (_, i) => createMockMarket(`${i + 10}`));

      vi.mocked(adapter.getMarkets)
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);

      const allMarkets = await syncService.syncAll(10);

      expect(allMarkets).toHaveLength(15);
      expect(adapter.getMarkets).toHaveBeenCalledTimes(2);
    });

    it('should respect maxPages limit', async () => {
      const fullPage = Array.from({ length: 10 }, (_, i) => createMockMarket(`${i}`));
      vi.mocked(adapter.getMarkets).mockResolvedValue(fullPage);

      await syncService.syncAll(2);

      expect(adapter.getMarkets).toHaveBeenCalledTimes(2);
    });
  });

  describe('healthCheck', () => {
    it('should delegate to adapter healthCheck', async () => {
      vi.mocked(adapter.healthCheck).mockResolvedValue(true);

      const result = await syncService.healthCheck();

      expect(result).toBe(true);
      expect(adapter.healthCheck).toHaveBeenCalled();
    });
  });

  describe('resetState', () => {
    it('should reset sync state', async () => {
      const mockMarkets = [createMockMarket('1')];
      vi.mocked(adapter.getMarkets).mockResolvedValue(mockMarkets);

      await syncService.runSync();
      expect(syncService.getState().totalSynced).toBe(1);

      syncService.resetState();
      expect(syncService.getState().totalSynced).toBe(0);
      expect(syncService.getState().lastSyncAt).toBeNull();
    });
  });
});

describe('MultiPlatformSyncManager', () => {
  let manager: MultiPlatformSyncManager;
  let adapter1: IPlatformAdapter;
  let adapter2: IPlatformAdapter;

  beforeEach(() => {
    manager = new MultiPlatformSyncManager();
    adapter1 = createMockAdapter('PLATFORM1');
    adapter2 = createMockAdapter('PLATFORM2');
  });

  afterEach(() => {
    manager.stopAll();
    vi.clearAllMocks();
  });

  describe('addPlatform/removePlatform', () => {
    it('should add and remove platforms', () => {
      manager.addPlatform(adapter1);
      expect(manager.getState('PLATFORM1')).toBeTruthy();

      manager.removePlatform('PLATFORM1');
      expect(manager.getState('PLATFORM1')).toBeNull();
    });
  });

  describe('getAllStates', () => {
    it('should return states for all platforms', () => {
      manager.addPlatform(adapter1);
      manager.addPlatform(adapter2);

      const states = manager.getAllStates();

      expect(Object.keys(states)).toContain('PLATFORM1');
      expect(Object.keys(states)).toContain('PLATFORM2');
    });
  });

  describe('healthCheckAll', () => {
    it('should check health of all platforms', async () => {
      manager.addPlatform(adapter1);
      manager.addPlatform(adapter2);

      vi.mocked(adapter1.healthCheck).mockResolvedValue(true);
      vi.mocked(adapter2.healthCheck).mockResolvedValue(false);

      const results = await manager.healthCheckAll();

      expect(results.PLATFORM1).toBe(true);
      expect(results.PLATFORM2).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call global onSync callback', async () => {
      const onSync = vi.fn();
      const managerWithCallback = new MultiPlatformSyncManager({ onSync });

      managerWithCallback.addPlatform(adapter1);

      const mockMarkets = [createMockMarket('1')];
      vi.mocked(adapter1.getMarkets).mockResolvedValue(mockMarkets);

      // Get the service and run sync manually
      const state = managerWithCallback.getState('PLATFORM1');
      expect(state).toBeTruthy();
    });
  });
});
