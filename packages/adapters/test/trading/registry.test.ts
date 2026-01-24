/**
 * Trading Adapter Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  tradingAdapterRegistry,
  getTradingAdapter,
  registerTradingAdapter,
} from '../../src/trading/registry';
import { PolymarketTradingAdapter, createPolymarketAdapter } from '../../src/trading/polymarket/adapter';
import type { TradingPlatform, ITradingAdapter, TradingAdapterFactory } from '../../src/trading/types';

describe('TradingAdapterRegistry', () => {
  beforeEach(() => {
    // Clear any existing instances
    tradingAdapterRegistry.clearInstances();
  });

  describe('register', () => {
    it('should register an adapter factory', () => {
      const mockFactory: TradingAdapterFactory = () => new PolymarketTradingAdapter();

      registerTradingAdapter('POLYMARKET', mockFactory);

      const factory = tradingAdapterRegistry.get('POLYMARKET');
      expect(factory).toBeDefined();
    });

    it('should allow re-registering a factory', () => {
      const factory1: TradingAdapterFactory = () => new PolymarketTradingAdapter();
      const factory2: TradingAdapterFactory = () => new PolymarketTradingAdapter({ chainId: 80001 });

      registerTradingAdapter('POLYMARKET', factory1);
      registerTradingAdapter('POLYMARKET', factory2);

      const factory = tradingAdapterRegistry.get('POLYMARKET');
      expect(factory).toBe(factory2);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered platform', () => {
      const factory = tradingAdapterRegistry.get('KALSHI' as TradingPlatform);
      expect(factory).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered factories', () => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);

      const all = tradingAdapterRegistry.getAll();
      expect(all.size).toBeGreaterThanOrEqual(1);
      expect(all.has('POLYMARKET')).toBe(true);
    });
  });

  describe('getOrCreate', () => {
    beforeEach(() => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
    });

    it('should create a new adapter instance', () => {
      const adapter = tradingAdapterRegistry.getOrCreate('POLYMARKET', {});
      expect(adapter).toBeInstanceOf(PolymarketTradingAdapter);
      expect(adapter.platform).toBe('POLYMARKET');
    });

    it('should return cached instance on subsequent calls', () => {
      const adapter1 = tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'test-key');
      const adapter2 = tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'test-key');

      expect(adapter1).toBe(adapter2);
    });

    it('should create different instances with different keys', () => {
      const adapter1 = tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'key-1');
      const adapter2 = tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'key-2');

      expect(adapter1).not.toBe(adapter2);
    });

    it('should throw error for unregistered platform', () => {
      expect(() => {
        tradingAdapterRegistry.getOrCreate('KALSHI' as TradingPlatform, {});
      }).toThrow('No adapter registered for platform: KALSHI');
    });
  });

  describe('removeInstance', () => {
    beforeEach(() => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
    });

    it('should remove a cached instance', () => {
      tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'test-key');
      const removed = tradingAdapterRegistry.removeInstance('test-key');

      expect(removed).toBe(true);
    });

    it('should return false for non-existent instance', () => {
      const removed = tradingAdapterRegistry.removeInstance('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('clearInstances', () => {
    beforeEach(() => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
    });

    it('should clear all cached instances', () => {
      tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'key-1');
      tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'key-2');

      tradingAdapterRegistry.clearInstances();

      // Creating with same key should create new instance
      const newAdapter = tradingAdapterRegistry.getOrCreate('POLYMARKET', {}, 'key-1');
      expect(newAdapter).toBeInstanceOf(PolymarketTradingAdapter);
    });
  });

  describe('getAvailablePlatforms', () => {
    it('should list registered platforms', () => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);

      const platforms = tradingAdapterRegistry.getAvailablePlatforms();
      expect(platforms).toContain('POLYMARKET');
    });
  });

  describe('isRegistered', () => {
    it('should return true for registered platform', () => {
      registerTradingAdapter('POLYMARKET', createPolymarketAdapter);

      expect(tradingAdapterRegistry.isRegistered('POLYMARKET')).toBe(true);
    });

    it('should return false for unregistered platform', () => {
      expect(tradingAdapterRegistry.isRegistered('KALSHI' as TradingPlatform)).toBe(false);
    });
  });
});

describe('getTradingAdapter helper', () => {
  beforeEach(() => {
    tradingAdapterRegistry.clearInstances();
    registerTradingAdapter('POLYMARKET', createPolymarketAdapter);
  });

  it('should get adapter using helper function', () => {
    const adapter = getTradingAdapter('POLYMARKET');
    expect(adapter).toBeInstanceOf(PolymarketTradingAdapter);
  });

  it('should pass config to factory', () => {
    const adapter = getTradingAdapter('POLYMARKET', { chainId: 80001 });
    expect(adapter).toBeInstanceOf(PolymarketTradingAdapter);
  });
});
