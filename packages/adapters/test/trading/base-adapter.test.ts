/**
 * BaseTradingAdapter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTradingAdapter } from '../../src/trading/base';
import type {
  TradingPlatform,
  AuthCredentials,
  AuthState,
  UnifiedOrderRequest,
  UnifiedOrder,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedBalance,
  OrderHistoryOptions,
  TradeHistoryOptions,
  OrderSide,
} from '../../src/trading/types';

// =============================================================================
// Test Implementation
// =============================================================================

/**
 * Concrete implementation of BaseTradingAdapter for testing
 */
class TestTradingAdapter extends BaseTradingAdapter {
  readonly platform: TradingPlatform = 'LIMITLESS';

  // Make protected methods public for testing
  public testEnsureAuthenticated() {
    this.ensureAuthenticated();
  }

  public testIsAuthExpired(): boolean {
    return this.isAuthExpired();
  }

  public testCalculatePnl(size: number, averagePrice: number, currentPrice: number) {
    return this.calculatePnl(size, averagePrice, currentPrice);
  }

  public testNormalizePrice(price: number): number {
    return this.normalizePrice(price);
  }

  public testGenerateClientOrderId(): string {
    return this.generateClientOrderId();
  }

  // Set auth state for testing
  public setAuthState(state: AuthState | null): void {
    this.authState = state;
  }

  // Required abstract method implementations (stubs)
  async isReady(): Promise<boolean> {
    return this.authState?.isAuthenticated ?? false;
  }

  async authenticate(_credentials?: AuthCredentials): Promise<AuthState> {
    const state: AuthState = {
      isAuthenticated: true,
      address: '0x1234',
    };
    this.authState = state;
    return state;
  }

  async placeOrder(_order: UnifiedOrderRequest): Promise<UnifiedOrder> {
    throw new Error('Not implemented');
  }

  async cancelOrder(_orderId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async cancelAllOrders(_marketId?: string): Promise<number> {
    throw new Error('Not implemented');
  }

  async getOrder(_orderId: string): Promise<UnifiedOrder | null> {
    throw new Error('Not implemented');
  }

  async getOpenOrders(_marketId?: string): Promise<UnifiedOrder[]> {
    throw new Error('Not implemented');
  }

  async getOrderHistory(_options?: OrderHistoryOptions): Promise<UnifiedOrder[]> {
    throw new Error('Not implemented');
  }

  async getPositions(): Promise<UnifiedPosition[]> {
    throw new Error('Not implemented');
  }

  async getPosition(
    _marketId: string,
    _outcome: 'YES' | 'NO' | number
  ): Promise<UnifiedPosition | null> {
    throw new Error('Not implemented');
  }

  async getTrades(_options?: TradeHistoryOptions): Promise<UnifiedTrade[]> {
    throw new Error('Not implemented');
  }

  async getBalances(): Promise<UnifiedBalance[]> {
    throw new Error('Not implemented');
  }

  async getBalance(_token: string): Promise<UnifiedBalance | null> {
    throw new Error('Not implemented');
  }

  async getBestPrice(
    _marketId: string,
    _outcome: 'YES' | 'NO' | number,
    _side: OrderSide
  ): Promise<number | null> {
    throw new Error('Not implemented');
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('BaseTradingAdapter', () => {
  let adapter: TestTradingAdapter;

  beforeEach(() => {
    adapter = new TestTradingAdapter();
  });

  // ---------------------------------------------------------------------------
  // getAuthState
  // ---------------------------------------------------------------------------

  describe('getAuthState', () => {
    it('should return null when not authenticated', () => {
      expect(adapter.getAuthState()).toBeNull();
    });

    it('should return auth state when authenticated', async () => {
      await adapter.authenticate();
      const state = adapter.getAuthState();

      expect(state).not.toBeNull();
      expect(state?.isAuthenticated).toBe(true);
      expect(state?.address).toBe('0x1234');
    });

    it('should return the current auth state', () => {
      const testState: AuthState = {
        isAuthenticated: true,
        address: '0xabcd',
        expiresAt: new Date(Date.now() + 3600000),
      };
      adapter.setAuthState(testState);

      expect(adapter.getAuthState()).toBe(testState);
    });
  });

  // ---------------------------------------------------------------------------
  // logout
  // ---------------------------------------------------------------------------

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      await adapter.authenticate();
      expect(adapter.getAuthState()).not.toBeNull();

      await adapter.logout();
      expect(adapter.getAuthState()).toBeNull();
    });

    it('should be idempotent when not authenticated', async () => {
      expect(adapter.getAuthState()).toBeNull();
      await adapter.logout();
      expect(adapter.getAuthState()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // ensureAuthenticated
  // ---------------------------------------------------------------------------

  describe('ensureAuthenticated', () => {
    it('should throw when not authenticated', () => {
      expect(() => adapter.testEnsureAuthenticated()).toThrow(
        'Not authenticated with LIMITLESS'
      );
    });

    it('should throw when auth state exists but isAuthenticated is false', () => {
      adapter.setAuthState({
        isAuthenticated: false,
        address: '0x1234',
      });

      expect(() => adapter.testEnsureAuthenticated()).toThrow(
        'Not authenticated with LIMITLESS'
      );
    });

    it('should not throw when authenticated', async () => {
      await adapter.authenticate();
      expect(() => adapter.testEnsureAuthenticated()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // isAuthExpired
  // ---------------------------------------------------------------------------

  describe('isAuthExpired', () => {
    it('should return false when no auth state', () => {
      expect(adapter.testIsAuthExpired()).toBe(false);
    });

    it('should return false when no expiresAt set', () => {
      adapter.setAuthState({
        isAuthenticated: true,
        address: '0x1234',
      });

      expect(adapter.testIsAuthExpired()).toBe(false);
    });

    it('should return false when not expired', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      adapter.setAuthState({
        isAuthenticated: true,
        address: '0x1234',
        expiresAt: futureDate,
      });

      expect(adapter.testIsAuthExpired()).toBe(false);
    });

    it('should return true when expired', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      adapter.setAuthState({
        isAuthenticated: true,
        address: '0x1234',
        expiresAt: pastDate,
      });

      expect(adapter.testIsAuthExpired()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // calculatePnl
  // ---------------------------------------------------------------------------

  describe('calculatePnl', () => {
    it('should calculate positive P&L correctly', () => {
      const result = adapter.testCalculatePnl(100, 0.5, 0.7);

      expect(result.unrealizedPnl).toBeCloseTo(20); // 100 * 0.7 - 100 * 0.5 = 20
      expect(result.percentChange).toBeCloseTo(40); // 20 / 50 * 100 = 40%
    });

    it('should calculate negative P&L correctly', () => {
      const result = adapter.testCalculatePnl(100, 0.6, 0.4);

      expect(result.unrealizedPnl).toBeCloseTo(-20); // 100 * 0.4 - 100 * 0.6 = -20
      expect(result.percentChange).toBeCloseTo(-33.33, 1); // -20 / 60 * 100 = -33.33%
    });

    it('should return zero percent change when cost basis is zero', () => {
      const result = adapter.testCalculatePnl(0, 0.5, 0.7);

      expect(result.unrealizedPnl).toBeCloseTo(0);
      expect(result.percentChange).toBe(0);
    });

    it('should handle break-even scenario', () => {
      const result = adapter.testCalculatePnl(100, 0.5, 0.5);

      expect(result.unrealizedPnl).toBeCloseTo(0);
      expect(result.percentChange).toBeCloseTo(0);
    });

    it('should handle large position sizes', () => {
      const result = adapter.testCalculatePnl(10000, 0.3, 0.8);

      expect(result.unrealizedPnl).toBeCloseTo(5000); // 10000 * 0.8 - 10000 * 0.3
      expect(result.percentChange).toBeCloseTo(166.67, 1); // 5000 / 3000 * 100
    });

    it('should handle small decimal values', () => {
      const result = adapter.testCalculatePnl(1.5, 0.25, 0.75);

      expect(result.unrealizedPnl).toBeCloseTo(0.75);
      expect(result.percentChange).toBeCloseTo(200);
    });
  });

  // ---------------------------------------------------------------------------
  // normalizePrice
  // ---------------------------------------------------------------------------

  describe('normalizePrice', () => {
    it('should keep prices in 0-1 range unchanged', () => {
      expect(adapter.testNormalizePrice(0.5)).toBe(0.5);
      expect(adapter.testNormalizePrice(0)).toBe(0);
      expect(adapter.testNormalizePrice(1)).toBe(1);
    });

    it('should convert cents (>1) to decimal', () => {
      expect(adapter.testNormalizePrice(50)).toBeCloseTo(0.5);
      expect(adapter.testNormalizePrice(75)).toBeCloseTo(0.75);
      expect(adapter.testNormalizePrice(100)).toBeCloseTo(1);
    });

    it('should clamp negative values to 0', () => {
      expect(adapter.testNormalizePrice(-0.1)).toBe(0);
      expect(adapter.testNormalizePrice(-50)).toBe(0); // -50/100 = -0.5, clamped to 0
    });

    it('should treat values above 1 as cents', () => {
      // 1.5 > 1, so treated as cents: 1.5/100 = 0.015
      expect(adapter.testNormalizePrice(1.5)).toBeCloseTo(0.015);
    });

    it('should handle edge case of 1.01', () => {
      // 1.01 > 1, so divided by 100 = 0.0101
      expect(adapter.testNormalizePrice(1.01)).toBeCloseTo(0.0101);
    });

    it('should handle typical cent values', () => {
      expect(adapter.testNormalizePrice(25)).toBeCloseTo(0.25);
      expect(adapter.testNormalizePrice(99)).toBeCloseTo(0.99);
      expect(adapter.testNormalizePrice(1)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // generateClientOrderId
  // ---------------------------------------------------------------------------

  describe('generateClientOrderId', () => {
    it('should generate unique IDs', () => {
      const id1 = adapter.testGenerateClientOrderId();
      const id2 = adapter.testGenerateClientOrderId();

      expect(id1).not.toBe(id2);
    });

    it('should start with calibr_ prefix', () => {
      const id = adapter.testGenerateClientOrderId();
      expect(id.startsWith('calibr_')).toBe(true);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const id = adapter.testGenerateClientOrderId();
      const after = Date.now();

      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should have random suffix', () => {
      const id = adapter.testGenerateClientOrderId();
      const parts = id.split('_');

      // Third part is random string
      expect(parts[2]).toBeDefined();
      expect(parts[2].length).toBe(7);
    });

    it('should generate many unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(adapter.testGenerateClientOrderId());
      }

      expect(ids.size).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // isReady (inherited behavior)
  // ---------------------------------------------------------------------------

  describe('isReady', () => {
    it('should return false when not authenticated', async () => {
      expect(await adapter.isReady()).toBe(false);
    });

    it('should return true when authenticated', async () => {
      await adapter.authenticate();
      expect(await adapter.isReady()).toBe(true);
    });
  });
});
