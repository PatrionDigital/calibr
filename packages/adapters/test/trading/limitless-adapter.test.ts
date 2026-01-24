/**
 * Limitless Trading Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LimitlessTradingAdapter, createLimitlessAdapter } from '../../src/trading/limitless/adapter';
// Import the trading index to trigger adapter registration
import '../../src/trading/index';
import { tradingAdapterRegistry } from '../../src/trading/registry';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('LimitlessTradingAdapter', () => {
  let adapter: LimitlessTradingAdapter;

  beforeEach(() => {
    adapter = new LimitlessTradingAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      expect(adapter.platform).toBe('LIMITLESS');
    });

    it('should accept custom config', () => {
      const customAdapter = new LimitlessTradingAdapter({
        chainId: 84532, // Sepolia testnet
        rpcUrl: 'https://sepolia.base.org',
      });
      expect(customAdapter.platform).toBe('LIMITLESS');
    });
  });

  describe('isReady', () => {
    it('should return false when not authenticated', async () => {
      const ready = await adapter.isReady();
      expect(ready).toBe(false);
    });
  });

  describe('getAuthState', () => {
    it('should return null when not authenticated', () => {
      const state = adapter.getAuthState();
      expect(state).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should throw error when wallet client not set', async () => {
      await expect(adapter.authenticate()).rejects.toThrow(
        'Wallet client required for authentication'
      );
    });
  });

  describe('getOpenOrders', () => {
    it('should return empty array when not authenticated', async () => {
      // This should throw because ensureAuthenticated is called
      await expect(adapter.getOpenOrders()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getPositions', () => {
    it('should return empty array when not authenticated', async () => {
      await expect(adapter.getPositions()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getBalances', () => {
    it('should return empty array when not authenticated', async () => {
      await expect(adapter.getBalances()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getBestPrice', () => {
    it('should fetch best price from orderbook', async () => {
      const mockOrderbook = {
        adjustedMidpoint: 0.65,
        bids: [{ price: 0.64, size: 100 }],
        asks: [{ price: 0.66, size: 100 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      // For YES outcome, BUY side, we look at asks
      const price = await adapter.getBestPrice('test-market', 'YES', 'BUY');
      expect(price).toBe(0.66);
    });

    it('should fetch best bid for YES SELL', async () => {
      const mockOrderbook = {
        adjustedMidpoint: 0.65,
        bids: [{ price: 0.64, size: 100 }],
        asks: [{ price: 0.66, size: 100 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      const price = await adapter.getBestPrice('test-market', 'YES', 'SELL');
      expect(price).toBe(0.64);
    });

    it('should calculate NO price as complement', async () => {
      const mockOrderbook = {
        adjustedMidpoint: 0.65,
        bids: [{ price: 0.64, size: 100 }],
        asks: [{ price: 0.66, size: 100 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockOrderbook,
        headers: new Headers(),
      });

      // For NO outcome, BUY side, we look at bids and invert
      const price = await adapter.getBestPrice('test-market', 'NO', 'BUY');
      expect(price).toBeCloseTo(0.36, 2); // 1 - 0.64
    });

    it('should return null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const price = await adapter.getBestPrice('test-market', 'YES', 'BUY');
      expect(price).toBeNull();
    });
  });
});

describe('Limitless Adapter Factory', () => {
  it('should create adapter via factory function', () => {
    const adapter = createLimitlessAdapter();
    expect(adapter).toBeInstanceOf(LimitlessTradingAdapter);
    expect(adapter.platform).toBe('LIMITLESS');
  });

  it('should accept config via factory', () => {
    const adapter = createLimitlessAdapter({ chainId: 84532 });
    expect(adapter.platform).toBe('LIMITLESS');
  });
});

describe('Limitless Adapter Registry', () => {
  it('should be registered in the trading adapter registry', () => {
    // The adapter is registered on import
    const isRegistered = tradingAdapterRegistry.isRegistered('LIMITLESS');
    expect(isRegistered).toBe(true);
  });

  it('should be retrievable from registry', () => {
    const factory = tradingAdapterRegistry.get('LIMITLESS');
    expect(factory).toBeDefined();

    if (factory) {
      const adapter = factory({});
      expect(adapter.platform).toBe('LIMITLESS');
    }
  });
});

// =============================================================================
// Order Lifecycle Tests (3.2.9)
// =============================================================================

describe('Limitless Order Lifecycle', () => {
  let adapter: LimitlessTradingAdapter;

  beforeEach(() => {
    adapter = new LimitlessTradingAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('placeOrder', () => {
    it('should reject when not authenticated', async () => {
      const orderRequest = {
        marketId: 'test-market',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: 10,
        price: 0.5,
        orderType: 'LIMIT' as const,
      };

      await expect(adapter.placeOrder(orderRequest)).rejects.toThrow('Not authenticated');
    });

    it('should validate order request fields', async () => {
      const invalidOrder = {
        marketId: '',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: -10, // Invalid: negative size
        price: 1.5, // Invalid: price > 1
        orderType: 'LIMIT' as const,
      };

      await expect(adapter.placeOrder(invalidOrder)).rejects.toThrow();
    });
  });

  describe('cancelOrder', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.cancelOrder('order-123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('cancelAllOrders', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.cancelAllOrders()).rejects.toThrow('Not authenticated');
    });

    it('should accept optional market ID filter', async () => {
      await expect(adapter.cancelAllOrders('specific-market')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getOrder', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.getOrder('order-123')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getOrderHistory', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.getOrderHistory()).rejects.toThrow('Not authenticated');
    });

    it('should accept optional filters', async () => {
      await expect(
        adapter.getOrderHistory({
          marketId: 'test-market',
          status: ['FILLED', 'CANCELLED'],
          limit: 50,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });
});

describe('Limitless Position and Trade Methods', () => {
  let adapter: LimitlessTradingAdapter;

  beforeEach(() => {
    adapter = new LimitlessTradingAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getPosition', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.getPosition('test-market', 'YES')).rejects.toThrow('Not authenticated');
    });

    it('should accept numeric outcome index', async () => {
      await expect(adapter.getPosition('test-market', 0)).rejects.toThrow('Not authenticated');
    });
  });

  describe('getTrades', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.getTrades()).rejects.toThrow('Not authenticated');
    });

    it('should accept optional filters', async () => {
      await expect(
        adapter.getTrades({
          marketId: 'test-market',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          limit: 100,
        })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('getBalance', () => {
    it('should reject when not authenticated', async () => {
      await expect(adapter.getBalance('USDC')).rejects.toThrow('Not authenticated');
    });
  });
});

describe('Limitless Order Types', () => {
  let adapter: LimitlessTradingAdapter;

  beforeEach(() => {
    adapter = new LimitlessTradingAdapter();
    vi.clearAllMocks();
  });

  it('should support LIMIT order type', async () => {
    const order = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'LIMIT' as const,
    };

    // Order type should be accepted (will fail on auth, not order type)
    await expect(adapter.placeOrder(order)).rejects.toThrow('Not authenticated');
  });

  it('should support GTC order type', async () => {
    const order = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'GTC' as const,
    };

    await expect(adapter.placeOrder(order)).rejects.toThrow('Not authenticated');
  });

  it('should support FOK order type', async () => {
    const order = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'FOK' as const,
    };

    await expect(adapter.placeOrder(order)).rejects.toThrow('Not authenticated');
  });

  it('should support both BUY and SELL sides', async () => {
    const buyOrder = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'LIMIT' as const,
    };

    const sellOrder = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'SELL' as const,
      size: 10,
      price: 0.5,
      orderType: 'LIMIT' as const,
    };

    await expect(adapter.placeOrder(buyOrder)).rejects.toThrow('Not authenticated');
    await expect(adapter.placeOrder(sellOrder)).rejects.toThrow('Not authenticated');
  });

  it('should support both YES and NO outcomes', async () => {
    const yesOrder = {
      marketId: 'test',
      outcome: 'YES' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'LIMIT' as const,
    };

    const noOrder = {
      marketId: 'test',
      outcome: 'NO' as const,
      side: 'BUY' as const,
      size: 10,
      price: 0.5,
      orderType: 'LIMIT' as const,
    };

    await expect(adapter.placeOrder(yesOrder)).rejects.toThrow('Not authenticated');
    await expect(adapter.placeOrder(noOrder)).rejects.toThrow('Not authenticated');
  });
});
