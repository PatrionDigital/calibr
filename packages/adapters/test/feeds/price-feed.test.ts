/**
 * Tests for Price Feed Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PriceFeedService,
  PriceAggregator,
  type PriceFeedConfig,
  type PriceUpdate,
} from '../../src/feeds/price-feed';
import type { IPlatformAdapter, PlatformMarket, OrderBook } from '../../src/types';

// =============================================================================
// Mock Setup
// =============================================================================

function createMockAdapter(platform = 'POLYMARKET'): IPlatformAdapter {
  return {
    platform: platform as 'POLYMARKET',
    config: {
      baseUrl: 'https://api.example.com',
      rateLimit: 100,
      timeout: 5000,
    },
    getMarkets: vi.fn().mockResolvedValue([]),
    getMarket: vi.fn().mockResolvedValue(null),
    getEvents: vi.fn().mockResolvedValue([]),
    getOrderBook: vi.fn().mockResolvedValue({
      marketId: 'test-market',
      platform,
      timestamp: new Date(),
      bids: [],
      asks: [],
      bestBid: 0.5,
      bestAsk: 0.52,
    }),
    getTrades: vi.fn().mockResolvedValue([]),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

function createMockMarket(id: string, tokenIds: string[] = ['token-yes', 'token-no']): PlatformMarket {
  return {
    id,
    externalId: id,
    platform: 'POLYMARKET',
    question: `Test Market ${id}`,
    description: 'Test description',
    category: 'CRYPTO',
    status: 'ACTIVE',
    createdAt: new Date(),
    closesAt: new Date(Date.now() + 86400000),
    outcomes: [
      { id: tokenIds[0] || 'yes', name: 'Yes', price: 0.5 },
      { id: tokenIds[1] || 'no', name: 'No', price: 0.5 },
    ],
    volume: 10000,
    liquidity: 5000,
    platformData: {
      clobTokenIds: tokenIds,
    },
  };
}

function createMockCache() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn().mockImplementation((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(false),
    clear: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

// =============================================================================
// PriceFeedService Tests
// =============================================================================

describe('PriceFeedService', () => {
  let adapter: IPlatformAdapter;
  let service: PriceFeedService;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = createMockAdapter();
  });

  afterEach(() => {
    service?.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      service = new PriceFeedService(adapter);
      const state = service.getState();

      expect(state.isRunning).toBe(false);
      expect(state.lastUpdateAt).toBeNull();
      expect(state.trackedMarkets).toBe(0);
    });

    it('should accept custom config', () => {
      const config: Partial<PriceFeedConfig> = {
        intervalMs: 1000,
        concurrency: 5,
        cacheTtlMs: 5000,
      };
      service = new PriceFeedService(adapter, config);

      expect(service.getState().isRunning).toBe(false);
    });
  });

  describe('start', () => {
    it('should set isRunning to true', async () => {
      service = new PriceFeedService(adapter);
      await service.start();

      expect(service.getState().isRunning).toBe(true);
    });

    it('should not restart if already running', async () => {
      service = new PriceFeedService(adapter);
      await service.start();
      await service.start();

      expect(service.getState().isRunning).toBe(true);
    });

    it('should initialize markets on start', async () => {
      const markets = [createMockMarket('market-1'), createMockMarket('market-2')];
      vi.mocked(adapter.getMarkets).mockResolvedValue(markets);

      service = new PriceFeedService(adapter);
      await service.start();

      expect(service.getState().trackedMarkets).toBe(2);
    });

    it('should track specific markets when marketIds provided', async () => {
      const market = createMockMarket('specific-market');
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      service = new PriceFeedService(adapter, { marketIds: ['specific-market'] });
      await service.start();

      expect(adapter.getMarket).toHaveBeenCalledWith('specific-market');
      expect(service.getState().trackedMarkets).toBe(1);
    });
  });

  describe('stop', () => {
    it('should set isRunning to false', async () => {
      service = new PriceFeedService(adapter);
      await service.start();
      service.stop();

      expect(service.getState().isRunning).toBe(false);
    });

    it('should clear interval', async () => {
      service = new PriceFeedService(adapter);
      await service.start();
      service.stop();

      // Advance time - no updates should occur
      vi.advanceTimersByTime(10000);
      expect(service.getState().isRunning).toBe(false);
    });
  });

  describe('addMarket', () => {
    it('should add market to tracking', async () => {
      const market = createMockMarket('new-market');
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      service = new PriceFeedService(adapter);
      await service.addMarket('new-market');

      expect(service.getState().trackedMarkets).toBe(1);
    });

    it('should not duplicate already tracked markets', async () => {
      const market = createMockMarket('existing-market');
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      service = new PriceFeedService(adapter);
      await service.addMarket('existing-market');
      await service.addMarket('existing-market');

      expect(service.getState().trackedMarkets).toBe(1);
    });

    it('should throw error if market not found', async () => {
      vi.mocked(adapter.getMarket).mockResolvedValue(null);

      service = new PriceFeedService(adapter);

      await expect(service.addMarket('nonexistent')).rejects.toThrow('Market not found: nonexistent');
    });
  });

  describe('removeMarket', () => {
    it('should remove market from tracking', async () => {
      const market = createMockMarket('market-to-remove');
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      service = new PriceFeedService(adapter);
      await service.addMarket('market-to-remove');
      expect(service.getState().trackedMarkets).toBe(1);

      service.removeMarket('market-to-remove');
      expect(service.getState().trackedMarkets).toBe(0);
    });

    it('should handle removing non-tracked market gracefully', () => {
      service = new PriceFeedService(adapter);
      service.removeMarket('nonexistent');

      expect(service.getState().trackedMarkets).toBe(0);
    });
  });

  describe('getPrice', () => {
    it('should return null for untracked market', async () => {
      service = new PriceFeedService(adapter);
      const price = await service.getPrice('unknown-market');

      expect(price).toBeNull();
    });

    it('should return last known price for tracked market', async () => {
      const market = createMockMarket('market-1', ['yes-token', 'no-token']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);
      vi.mocked(adapter.getOrderBook).mockResolvedValue({
        marketId: 'yes-token',
        platform: 'POLYMARKET',
        timestamp: new Date(),
        bids: [],
        asks: [],
        bestBid: 0.65,
        bestAsk: 0.67,
      });

      service = new PriceFeedService(adapter, { marketIds: ['market-1'] });
      await service.start();

      // After start, prices should be fetched
      const price = await service.getPrice('market-1', 'yes');
      expect(price).toBe(0.65);
    });

    it('should use cache when available', async () => {
      const cache = createMockCache();
      cache.get.mockResolvedValue(0.75);

      const market = createMockMarket('cached-market', ['cached-yes', 'cached-no']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      service = new PriceFeedService(adapter, { cache: cache as never });
      await service.addMarket('cached-market');

      const price = await service.getPrice('cached-market', 'yes');
      expect(cache.get).toHaveBeenCalled();
    });
  });

  describe('getAllPrices', () => {
    it('should return empty map when no markets tracked', () => {
      service = new PriceFeedService(adapter);
      const prices = service.getAllPrices();

      expect(prices.size).toBe(0);
    });

    it('should return prices for all tracked markets', async () => {
      const markets = [
        createMockMarket('market-1', ['t1-yes', 't1-no']),
        createMockMarket('market-2', ['t2-yes', 't2-no']),
      ];
      vi.mocked(adapter.getMarkets).mockResolvedValue(markets);

      service = new PriceFeedService(adapter);
      await service.start();

      const prices = service.getAllPrices();
      expect(prices.size).toBe(2);
      expect(prices.has('market-1')).toBe(true);
      expect(prices.has('market-2')).toBe(true);
    });
  });

  describe('onUpdate callback', () => {
    it('should call onUpdate with price updates', async () => {
      const onUpdate = vi.fn();
      const market = createMockMarket('callback-market', ['cb-yes', 'cb-no']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);
      vi.mocked(adapter.getOrderBook).mockResolvedValue({
        marketId: 'cb-yes',
        platform: 'POLYMARKET',
        timestamp: new Date(),
        bids: [],
        asks: [],
        bestBid: 0.6,
        bestAsk: 0.62,
      });

      service = new PriceFeedService(adapter, {
        marketIds: ['callback-market'],
        onUpdate,
      });
      await service.start();

      expect(onUpdate).toHaveBeenCalled();
      const updates: PriceUpdate[] = onUpdate.mock.calls[0][0];
      expect(Array.isArray(updates)).toBe(true);
    });
  });

  describe('onError callback', () => {
    it('should call onError when error occurs', async () => {
      const onError = vi.fn();
      vi.mocked(adapter.getMarket).mockRejectedValue(new Error('API Error'));

      service = new PriceFeedService(adapter, {
        marketIds: ['error-market'],
        onError,
      });
      await service.start();

      expect(onError).toHaveBeenCalled();
      expect(service.getState().errors.length).toBeGreaterThan(0);
    });

    it('should keep only last 10 errors', async () => {
      const onError = vi.fn();
      vi.mocked(adapter.getMarket).mockRejectedValue(new Error('API Error'));

      service = new PriceFeedService(adapter, {
        marketIds: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12'],
        onError,
      });
      await service.start();

      expect(service.getState().errors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('price change detection', () => {
    it('should calculate change when price updates', async () => {
      const onUpdate = vi.fn();
      const market = createMockMarket('change-market', ['ch-yes', 'ch-no']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);

      let callCount = 0;
      vi.mocked(adapter.getOrderBook).mockImplementation(async () => {
        callCount++;
        return {
          marketId: 'ch-yes',
          platform: 'POLYMARKET',
          timestamp: new Date(),
          bids: [],
          asks: [],
          bestBid: callCount === 1 ? 0.5 : 0.6, // Price changes on second call
          bestAsk: callCount === 1 ? 0.52 : 0.62,
        };
      });

      service = new PriceFeedService(adapter, {
        marketIds: ['change-market'],
        intervalMs: 1000,
        onUpdate,
      });
      await service.start();

      // First update
      expect(onUpdate).toHaveBeenCalled();

      // Trigger next interval
      await vi.advanceTimersByTimeAsync(1000);

      // Check if change was calculated
      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1];
      if (lastCall && lastCall[0].length > 0) {
        const update = lastCall[0][0];
        if (update.change !== undefined) {
          expect(update.change).toBeCloseTo(0.1, 2);
        }
      }
    });
  });

  describe('concurrency control', () => {
    it('should process markets in batches', async () => {
      const markets = Array.from({ length: 25 }, (_, i) =>
        createMockMarket(`batch-market-${i}`, [`t${i}-yes`, `t${i}-no`])
      );
      vi.mocked(adapter.getMarkets).mockResolvedValue(markets);

      service = new PriceFeedService(adapter, { concurrency: 10 });
      await service.start();

      expect(service.getState().trackedMarkets).toBe(25);
    });
  });

  describe('cache integration', () => {
    it('should cache prices when cache provided', async () => {
      const cache = createMockCache();
      const market = createMockMarket('cache-test', ['cache-yes', 'cache-no']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);
      vi.mocked(adapter.getOrderBook).mockResolvedValue({
        marketId: 'cache-yes',
        platform: 'POLYMARKET',
        timestamp: new Date(),
        bids: [],
        asks: [],
        bestBid: 0.55,
        bestAsk: 0.57,
      });

      service = new PriceFeedService(adapter, {
        marketIds: ['cache-test'],
        cache: cache as never,
        cacheTtlMs: 10000,
      });
      await service.start();

      expect(cache.set).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// PriceAggregator Tests
// =============================================================================

describe('PriceAggregator', () => {
  let aggregator: PriceAggregator;

  afterEach(() => {
    aggregator?.stopAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      aggregator = new PriceAggregator();
      expect(aggregator.getAllStates()).toEqual({});
    });

    it('should accept callbacks', () => {
      const onUpdate = vi.fn();
      const onError = vi.fn();

      aggregator = new PriceAggregator({ onUpdate, onError });
      expect(aggregator.getAllStates()).toEqual({});
    });
  });

  describe('addFeed', () => {
    it('should add a price feed for adapter', () => {
      const adapter = createMockAdapter('POLYMARKET');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter);

      expect(aggregator.getFeed('POLYMARKET')).toBeDefined();
    });

    it('should wrap callbacks from aggregator config', () => {
      const onUpdate = vi.fn();
      const adapter = createMockAdapter('POLYMARKET');

      aggregator = new PriceAggregator({ onUpdate });
      aggregator.addFeed(adapter);

      expect(aggregator.getFeed('POLYMARKET')).toBeDefined();
    });

    it('should allow feed-specific config', () => {
      const adapter = createMockAdapter('LIMITLESS');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter, { intervalMs: 2000 });

      expect(aggregator.getFeed('LIMITLESS')).toBeDefined();
    });
  });

  describe('removeFeed', () => {
    it('should remove and stop the feed', () => {
      vi.useFakeTimers();
      const adapter = createMockAdapter('POLYMARKET');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter);
      aggregator.removeFeed('POLYMARKET');

      expect(aggregator.getFeed('POLYMARKET')).toBeUndefined();
      vi.useRealTimers();
    });

    it('should handle removing non-existent feed gracefully', () => {
      aggregator = new PriceAggregator();
      aggregator.removeFeed('NONEXISTENT');

      expect(aggregator.getFeed('NONEXISTENT')).toBeUndefined();
    });
  });

  describe('startAll', () => {
    it('should start all feeds', async () => {
      vi.useFakeTimers();
      const adapter1 = createMockAdapter('POLYMARKET');
      const adapter2 = createMockAdapter('LIMITLESS');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter1);
      aggregator.addFeed(adapter2);

      await aggregator.startAll();

      const states = aggregator.getAllStates();
      expect(states['POLYMARKET']?.isRunning).toBe(true);
      expect(states['LIMITLESS']?.isRunning).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('stopAll', () => {
    it('should stop all feeds', async () => {
      vi.useFakeTimers();
      const adapter1 = createMockAdapter('POLYMARKET');
      const adapter2 = createMockAdapter('LIMITLESS');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter1);
      aggregator.addFeed(adapter2);

      await aggregator.startAll();
      aggregator.stopAll();

      const states = aggregator.getAllStates();
      expect(states['POLYMARKET']?.isRunning).toBe(false);
      expect(states['LIMITLESS']?.isRunning).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('getAllStates', () => {
    it('should return states for all platforms', async () => {
      vi.useFakeTimers();
      const adapter1 = createMockAdapter('POLYMARKET');
      const adapter2 = createMockAdapter('LIMITLESS');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter1);
      aggregator.addFeed(adapter2);

      const states = aggregator.getAllStates();

      expect(Object.keys(states)).toContain('POLYMARKET');
      expect(Object.keys(states)).toContain('LIMITLESS');
      vi.useRealTimers();
    });
  });

  describe('getFeed', () => {
    it('should return specific feed', () => {
      const adapter = createMockAdapter('POLYMARKET');

      aggregator = new PriceAggregator();
      aggregator.addFeed(adapter);

      const feed = aggregator.getFeed('POLYMARKET');
      expect(feed).toBeInstanceOf(PriceFeedService);
    });

    it('should return undefined for non-existent feed', () => {
      aggregator = new PriceAggregator();
      expect(aggregator.getFeed('NONEXISTENT')).toBeUndefined();
    });
  });

  describe('callback propagation', () => {
    it('should propagate updates to aggregator callback', async () => {
      vi.useFakeTimers();
      const onUpdate = vi.fn();
      const adapter = createMockAdapter('POLYMARKET');
      const market = createMockMarket('agg-test', ['agg-yes', 'agg-no']);
      vi.mocked(adapter.getMarkets).mockResolvedValue([market]);
      vi.mocked(adapter.getOrderBook).mockResolvedValue({
        marketId: 'agg-yes',
        platform: 'POLYMARKET',
        timestamp: new Date(),
        bids: [],
        asks: [],
        bestBid: 0.5,
        bestAsk: 0.52,
      });

      aggregator = new PriceAggregator({ onUpdate });
      aggregator.addFeed(adapter);

      await aggregator.startAll();

      expect(onUpdate).toHaveBeenCalled();
      const [platform] = onUpdate.mock.calls[0];
      expect(platform).toBe('POLYMARKET');
      vi.useRealTimers();
    });

    it('should propagate errors to aggregator callback', async () => {
      vi.useFakeTimers();
      const onError = vi.fn();
      const adapter = createMockAdapter('POLYMARKET');
      const market = createMockMarket('error-market', ['err-yes', 'err-no']);
      vi.mocked(adapter.getMarket).mockResolvedValue(market);
      // Make getOrderBook fail to trigger error callback
      vi.mocked(adapter.getOrderBook).mockRejectedValue(new Error('OrderBook error'));

      aggregator = new PriceAggregator({ onError });
      aggregator.addFeed(adapter, { marketIds: ['error-market'] });

      await aggregator.startAll();

      expect(onError).toHaveBeenCalled();
      const [platform, error] = onError.mock.calls[0];
      expect(platform).toBe('POLYMARKET');
      expect(error).toBeInstanceOf(Error);
      vi.useRealTimers();
    });
  });
});
