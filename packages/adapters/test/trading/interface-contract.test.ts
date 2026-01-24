/**
 * ITradingAdapter Interface Contract Tests
 *
 * These tests verify that all trading adapter implementations properly
 * conform to the ITradingAdapter interface contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type {
  ITradingAdapter,
  TradingPlatform,
  UnifiedOrderRequest,
  UnifiedOrder,
  UnifiedPosition,
  UnifiedTrade,
  UnifiedBalance,
  AuthState,
  OrderHistoryOptions,
  TradeHistoryOptions,
} from '../../src/trading/types';
import { LimitlessTradingAdapter } from '../../src/trading/limitless/adapter';
import { PolymarketTradingAdapter } from '../../src/trading/polymarket/adapter';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Interface Contract Test Suite
// =============================================================================

/**
 * Generic test suite that verifies any ITradingAdapter implementation
 * conforms to the interface contract
 */
function testAdapterInterfaceContract(
  name: string,
  createAdapter: () => ITradingAdapter,
  expectedPlatform: TradingPlatform
) {
  describe(`${name} - ITradingAdapter Interface Contract`, () => {
    let adapter: ITradingAdapter;

    beforeEach(() => {
      adapter = createAdapter();
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.resetAllMocks();
    });

    // =========================================================================
    // Required Properties
    // =========================================================================

    describe('Required Properties', () => {
      it('should have readonly platform property', () => {
        expect(adapter.platform).toBeDefined();
        expect(typeof adapter.platform).toBe('string');
        expect(adapter.platform).toBe(expectedPlatform);
      });

      it('platform should match expected value consistently', () => {
        // Platform should always return the same value
        expect(adapter.platform).toBe(expectedPlatform);
        expect(adapter.platform).toBe(expectedPlatform);
        // TypeScript's readonly keyword prevents reassignment at compile time
      });
    });

    // =========================================================================
    // Required Methods - Existence
    // =========================================================================

    describe('Required Methods Exist', () => {
      it('should have isReady method', () => {
        expect(typeof adapter.isReady).toBe('function');
      });

      it('should have authenticate method', () => {
        expect(typeof adapter.authenticate).toBe('function');
      });

      it('should have getAuthState method', () => {
        expect(typeof adapter.getAuthState).toBe('function');
      });

      it('should have logout method', () => {
        expect(typeof adapter.logout).toBe('function');
      });

      it('should have placeOrder method', () => {
        expect(typeof adapter.placeOrder).toBe('function');
      });

      it('should have cancelOrder method', () => {
        expect(typeof adapter.cancelOrder).toBe('function');
      });

      it('should have cancelAllOrders method', () => {
        expect(typeof adapter.cancelAllOrders).toBe('function');
      });

      it('should have getOrder method', () => {
        expect(typeof adapter.getOrder).toBe('function');
      });

      it('should have getOpenOrders method', () => {
        expect(typeof adapter.getOpenOrders).toBe('function');
      });

      it('should have getOrderHistory method', () => {
        expect(typeof adapter.getOrderHistory).toBe('function');
      });

      it('should have getPositions method', () => {
        expect(typeof adapter.getPositions).toBe('function');
      });

      it('should have getPosition method', () => {
        expect(typeof adapter.getPosition).toBe('function');
      });

      it('should have getTrades method', () => {
        expect(typeof adapter.getTrades).toBe('function');
      });

      it('should have getBalances method', () => {
        expect(typeof adapter.getBalances).toBe('function');
      });

      it('should have getBalance method', () => {
        expect(typeof adapter.getBalance).toBe('function');
      });

      it('should have getBestPrice method', () => {
        expect(typeof adapter.getBestPrice).toBe('function');
      });
    });

    // =========================================================================
    // Method Return Types
    // =========================================================================

    describe('Method Return Types', () => {
      it('isReady should return Promise<boolean>', async () => {
        const result = adapter.isReady();
        expect(result).toBeInstanceOf(Promise);
        const resolved = await result;
        expect(typeof resolved).toBe('boolean');
      });

      it('getAuthState should return AuthState | null', () => {
        const result = adapter.getAuthState();
        expect(result === null || typeof result === 'object').toBe(true);
        if (result !== null) {
          expect(typeof result.isAuthenticated).toBe('boolean');
          expect(typeof result.platform).toBe('string');
        }
      });

      it('logout should return Promise<void>', async () => {
        const result = adapter.logout();
        expect(result).toBeInstanceOf(Promise);
        const resolved = await result;
        expect(resolved).toBeUndefined();
      });
    });

    // =========================================================================
    // Unauthenticated Behavior
    // =========================================================================

    describe('Unauthenticated Behavior', () => {
      it('should not be ready when unauthenticated', async () => {
        const ready = await adapter.isReady();
        expect(ready).toBe(false);
      });

      it('getAuthState should return null when unauthenticated', () => {
        const state = adapter.getAuthState();
        expect(state).toBeNull();
      });

      it('should require authentication for order operations', async () => {
        const orderRequest: UnifiedOrderRequest = {
          marketId: 'test-market',
          outcome: 'YES',
          side: 'BUY',
          size: 10,
          price: 0.5,
          orderType: 'LIMIT',
        };

        await expect(adapter.placeOrder(orderRequest)).rejects.toThrow();
      });

      it('should require authentication for position operations', async () => {
        await expect(adapter.getPositions()).rejects.toThrow();
      });

      it('should require authentication for balance operations', async () => {
        await expect(adapter.getBalances()).rejects.toThrow();
      });
    });

    // =========================================================================
    // getBestPrice - Available Without Auth
    // =========================================================================

    describe('getBestPrice (public data)', () => {
      it('should accept valid outcome types', async () => {
        // Mock successful response
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            adjustedMidpoint: 0.5,
            bids: [{ price: 0.49, size: 100 }],
            asks: [{ price: 0.51, size: 100 }],
          }),
          headers: new Headers(),
        });

        // Should not throw for valid outcomes
        const yesPrice = await adapter.getBestPrice('market', 'YES', 'BUY');
        expect(yesPrice === null || typeof yesPrice === 'number').toBe(true);
      });

      it('should return number or null', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            adjustedMidpoint: 0.5,
            bids: [{ price: 0.49, size: 100 }],
            asks: [{ price: 0.51, size: 100 }],
          }),
          headers: new Headers(),
        });

        const price = await adapter.getBestPrice('market', 'YES', 'BUY');
        expect(price === null || typeof price === 'number').toBe(true);
        if (typeof price === 'number') {
          expect(price).toBeGreaterThanOrEqual(0);
          expect(price).toBeLessThanOrEqual(1);
        }
      });

      it('should handle errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const price = await adapter.getBestPrice('market', 'YES', 'BUY');
        expect(price).toBeNull();
      });
    });
  });
}

// =============================================================================
// Run Contract Tests for All Adapters
// =============================================================================

// Test Limitless adapter
testAdapterInterfaceContract(
  'LimitlessTradingAdapter',
  () => new LimitlessTradingAdapter(),
  'LIMITLESS'
);

// Test Polymarket adapter
testAdapterInterfaceContract(
  'PolymarketTradingAdapter',
  () => new PolymarketTradingAdapter(),
  'POLYMARKET'
);

// =============================================================================
// Type Validation Tests
// =============================================================================

describe('Type Validations', () => {
  describe('UnifiedOrderRequest', () => {
    it('should have required fields', () => {
      const validOrder: UnifiedOrderRequest = {
        marketId: 'test-market',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.5,
        orderType: 'LIMIT',
      };

      expect(validOrder.marketId).toBeDefined();
      expect(validOrder.outcome).toBeDefined();
      expect(validOrder.side).toBeDefined();
      expect(validOrder.size).toBeDefined();
      expect(validOrder.price).toBeDefined();
      expect(validOrder.orderType).toBeDefined();
    });

    it('should accept valid outcome types', () => {
      const yesOrder: UnifiedOrderRequest = {
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.5,
        orderType: 'LIMIT',
      };

      const noOrder: UnifiedOrderRequest = {
        marketId: 'test',
        outcome: 'NO',
        side: 'SELL',
        size: 10,
        price: 0.5,
        orderType: 'LIMIT',
      };

      const indexOrder: UnifiedOrderRequest = {
        marketId: 'test',
        outcome: 0,
        side: 'BUY',
        size: 10,
        price: 0.5,
        orderType: 'LIMIT',
      };

      expect(yesOrder.outcome).toBe('YES');
      expect(noOrder.outcome).toBe('NO');
      expect(indexOrder.outcome).toBe(0);
    });

    it('should accept valid order types', () => {
      const orderTypes: UnifiedOrderRequest['orderType'][] = [
        'MARKET',
        'LIMIT',
        'GTC',
        'GTD',
        'FOK',
        'IOC',
      ];

      for (const orderType of orderTypes) {
        const order: UnifiedOrderRequest = {
          marketId: 'test',
          outcome: 'YES',
          side: 'BUY',
          size: 10,
          price: 0.5,
          orderType,
        };
        expect(order.orderType).toBe(orderType);
      }
    });
  });

  describe('UnifiedOrder', () => {
    it('should have all required fields', () => {
      const order: UnifiedOrder = {
        id: 'order-1',
        platform: 'LIMITLESS',
        marketId: 'test-market',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        status: 'OPEN',
        size: 10,
        filledSize: 0,
        remainingSize: 10,
        price: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(order.id).toBeDefined();
      expect(order.platform).toBeDefined();
      expect(order.marketId).toBeDefined();
      expect(order.outcome).toBeDefined();
      expect(order.side).toBeDefined();
      expect(order.orderType).toBeDefined();
      expect(order.status).toBeDefined();
      expect(order.size).toBeDefined();
      expect(order.filledSize).toBeDefined();
      expect(order.remainingSize).toBeDefined();
      expect(order.price).toBeDefined();
      expect(order.createdAt).toBeInstanceOf(Date);
      expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept all valid order statuses', () => {
      const statuses: UnifiedOrder['status'][] = [
        'PENDING',
        'OPEN',
        'PARTIALLY_FILLED',
        'FILLED',
        'CANCELLED',
        'EXPIRED',
        'REJECTED',
      ];

      for (const status of statuses) {
        const order: UnifiedOrder = {
          id: 'order-1',
          platform: 'LIMITLESS',
          marketId: 'test',
          outcome: 'YES',
          side: 'BUY',
          orderType: 'LIMIT',
          status,
          size: 10,
          filledSize: 0,
          remainingSize: 10,
          price: 0.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        expect(order.status).toBe(status);
      }
    });
  });

  describe('UnifiedPosition', () => {
    it('should have all required fields', () => {
      const position: UnifiedPosition = {
        platform: 'LIMITLESS',
        marketId: 'test-market',
        outcome: 'YES',
        size: 100,
        averagePrice: 0.5,
        currentPrice: 0.6,
        unrealizedPnl: 10,
        realizedPnl: 0,
        costBasis: 50,
      };

      expect(position.platform).toBeDefined();
      expect(position.marketId).toBeDefined();
      expect(position.outcome).toBeDefined();
      expect(position.size).toBeDefined();
      expect(position.averagePrice).toBeDefined();
      expect(position.currentPrice).toBeDefined();
      expect(position.unrealizedPnl).toBeDefined();
      expect(position.realizedPnl).toBeDefined();
      expect(position.costBasis).toBeDefined();
    });
  });

  describe('UnifiedBalance', () => {
    it('should have all required fields', () => {
      const balance: UnifiedBalance = {
        platform: 'LIMITLESS',
        token: 'USDC',
        available: 1000,
        locked: 100,
        total: 1100,
      };

      expect(balance.platform).toBeDefined();
      expect(balance.token).toBeDefined();
      expect(balance.available).toBeDefined();
      expect(balance.locked).toBeDefined();
      expect(balance.total).toBeDefined();
    });
  });

  describe('AuthState', () => {
    it('should have all required fields', () => {
      const state: AuthState = {
        isAuthenticated: true,
        platform: 'LIMITLESS',
        address: '0x1234567890123456789012345678901234567890',
      };

      expect(state.isAuthenticated).toBeDefined();
      expect(typeof state.isAuthenticated).toBe('boolean');
      expect(state.platform).toBeDefined();
    });

    it('should allow optional fields', () => {
      const minimalState: AuthState = {
        isAuthenticated: false,
        platform: 'LIMITLESS',
      };

      expect(minimalState.address).toBeUndefined();
      expect(minimalState.authMethod).toBeUndefined();
      expect(minimalState.expiresAt).toBeUndefined();
    });
  });
});
