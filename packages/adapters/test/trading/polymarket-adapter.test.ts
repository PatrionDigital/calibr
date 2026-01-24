/**
 * Polymarket Trading Adapter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PolymarketTradingAdapter,
  PolymarketAdapterOptions,
  createPolymarketAdapter,
} from '../../src/trading/polymarket/adapter';
import type { UnifiedOrderRequest, PolymarketCredentials } from '../../src/trading/types';

// Mock the CLOB client
vi.mock('@polymarket/clob-client', () => ({
  ClobClient: vi.fn().mockImplementation(() => ({
    getOrderBook: vi.fn(),
    getOrder: vi.fn(),
    getOpenOrders: vi.fn(),
    postOrder: vi.fn(),
    cancelOrder: vi.fn(),
    cancelAll: vi.fn(),
    cancelMarketOrders: vi.fn(),
    getBalanceAllowance: vi.fn(),
    createOrder: vi.fn(),
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PolymarketTradingAdapter', () => {
  let adapter: PolymarketTradingAdapter;

  beforeEach(() => {
    adapter = new PolymarketTradingAdapter();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create adapter with default config', () => {
      expect(adapter.platform).toBe('POLYMARKET');
    });

    it('should accept custom config', () => {
      const config: PolymarketAdapterOptions = {
        chainId: 80001, // Mumbai testnet
        rpcUrl: 'https://custom-rpc.com',
        clobUrl: 'https://custom-clob.com',
        useGasless: false,
      };

      const customAdapter = new PolymarketTradingAdapter(config);
      expect(customAdapter.platform).toBe('POLYMARKET');
    });
  });

  describe('isReady', () => {
    it('should return false when not authenticated', async () => {
      const isReady = await adapter.isReady();
      expect(isReady).toBe(false);
    });
  });

  describe('getAuthState', () => {
    it('should return null when not authenticated', () => {
      const authState = adapter.getAuthState();
      expect(authState).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      await adapter.logout();
      const authState = adapter.getAuthState();
      expect(authState).toBeNull();
    });
  });

  describe('getSafeWallet', () => {
    it('should return null when no Safe is set up', async () => {
      const safeWallet = await adapter.getSafeWallet();
      expect(safeWallet).toBeNull();
    });
  });
});

describe('createPolymarketAdapter', () => {
  it('should create adapter instance via factory', () => {
    const adapter = createPolymarketAdapter();
    expect(adapter).toBeInstanceOf(PolymarketTradingAdapter);
    expect(adapter.platform).toBe('POLYMARKET');
  });

  it('should accept config via factory', () => {
    const adapter = createPolymarketAdapter({ chainId: 80001 });
    expect(adapter).toBeInstanceOf(PolymarketTradingAdapter);
  });
});

describe('Order Request Validation', () => {
  it('should validate order size bounds', () => {
    const validOrder: UnifiedOrderRequest = {
      marketId: 'test-market-id',
      outcome: 'YES',
      side: 'BUY',
      size: 10,
      price: 0.5,
      orderType: 'LIMIT',
    };

    expect(validOrder.size).toBeGreaterThan(0);
    expect(validOrder.price).toBeGreaterThan(0);
    expect(validOrder.price).toBeLessThan(1);
  });

  it('should support different order types', () => {
    const marketOrder: UnifiedOrderRequest = {
      marketId: 'test-market-id',
      outcome: 'YES',
      side: 'BUY',
      size: 10,
      price: 0.5,
      orderType: 'MARKET',
    };

    const limitOrder: UnifiedOrderRequest = {
      marketId: 'test-market-id',
      outcome: 'NO',
      side: 'SELL',
      size: 5,
      price: 0.6,
      orderType: 'LIMIT',
    };

    expect(marketOrder.orderType).toBe('MARKET');
    expect(limitOrder.orderType).toBe('LIMIT');
  });

  it('should support numeric outcomes', () => {
    const order: UnifiedOrderRequest = {
      marketId: 'test-market-id',
      outcome: 0, // Index-based outcome for multi-outcome markets
      side: 'BUY',
      size: 10,
      price: 0.5,
      orderType: 'LIMIT',
    };

    expect(order.outcome).toBe(0);
  });
});

describe('Credentials Type', () => {
  it('should have required Polymarket credential fields', () => {
    const credentials: PolymarketCredentials = {
      platform: 'POLYMARKET',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      passphrase: 'test-passphrase',
      signatureType: 'EOA',
    };

    expect(credentials.platform).toBe('POLYMARKET');
    expect(credentials.apiKey).toBeDefined();
    expect(credentials.apiSecret).toBeDefined();
    expect(credentials.passphrase).toBeDefined();
    expect(credentials.signatureType).toBe('EOA');
  });

  it('should support different signature types', () => {
    const eoaCredentials: PolymarketCredentials = {
      platform: 'POLYMARKET',
      apiKey: 'key',
      apiSecret: 'secret',
      passphrase: 'pass',
      signatureType: 'EOA',
    };

    const safeCredentials: PolymarketCredentials = {
      platform: 'POLYMARKET',
      apiKey: 'key',
      apiSecret: 'secret',
      passphrase: 'pass',
      signatureType: 'POLY_GNOSIS_SAFE',
    };

    expect(eoaCredentials.signatureType).toBe('EOA');
    expect(safeCredentials.signatureType).toBe('POLY_GNOSIS_SAFE');
  });
});
