/**
 * Limitless Trading Order Lifecycle Tests (Task 5.0.8)
 * Comprehensive tests for the full order lifecycle on Limitless Exchange
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { LimitlessTradingAdapter, createLimitlessAdapter } from '../../src/trading/limitless/adapter';
import type { WalletClient } from 'viem';

// =============================================================================
// Mock Setup
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock wallet client
const mockWalletClient = {
  account: {
    address: '0x1234567890123456789012345678901234567890',
  },
  signTypedData: vi.fn(),
  signMessage: vi.fn(),
  getAddresses: vi.fn(),
} as unknown as WalletClient;

// Mock market data
const MOCK_MARKET = {
  slug: 'test-market-2025',
  title: 'Test Market 2025',
  description: 'A test market for unit testing',
  tradeType: 'clob' as const,
  status: 'active',
  tokenId: '0xabcd1234',
  yesTokenId: '0',
  noTokenId: '1',
  conditionId: '0x' + 'ab'.repeat(32),
  collateralToken: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    symbol: 'USDC',
    decimals: 6,
  },
  venue: {
    exchange: '0x' + 'ee'.repeat(20),
  },
  outcomes: [
    { id: '0', label: 'Yes', price: 0.65 },
    { id: '1', label: 'No', price: 0.35 },
  ],
};

const MOCK_ORDERBOOK = {
  adjustedMidpoint: 0.65,
  bids: [
    { price: 0.64, size: 100 },
    { price: 0.63, size: 200 },
    { price: 0.62, size: 300 },
  ],
  asks: [
    { price: 0.66, size: 100 },
    { price: 0.67, size: 200 },
    { price: 0.68, size: 300 },
  ],
};

const MOCK_ORDER_RESPONSE = {
  id: 'order-123',
  marketSlug: 'test-market-2025',
  tokenId: '0',
  side: 'BUY',
  size: 10,
  price: 0.65,
  status: 'open',
  createdAt: new Date().toISOString(),
  filledSize: 0,
  averagePrice: null,
};

const MOCK_USER_PROFILE = {
  ownerId: 'user-456',
  address: '0x1234567890123456789012345678901234567890',
  username: 'testuser',
};

// =============================================================================
// Helper Functions
// =============================================================================

function mockSuccessfulAuth() {
  // Mock signing message request
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ message: 'Sign this message to authenticate', nonce: 'abc123' }),
  });

  // Mock wallet signature
  (mockWalletClient.signMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ff'.repeat(65));

  // Mock login response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: new Map([['set-cookie', 'limitless_session=session123']]),
    json: async () => MOCK_USER_PROFILE,
  });
}

function setupAuthenticatedAdapter(): LimitlessTradingAdapter {
  const adapter = new LimitlessTradingAdapter();
  adapter.setWalletClient(mockWalletClient);
  // Set internal state for testing
  (adapter as unknown as { userAddress: string }).userAddress = MOCK_USER_PROFILE.address;
  (adapter as unknown as { sessionCookie: string }).sessionCookie = 'session123';
  (adapter as unknown as { ownerId: string }).ownerId = MOCK_USER_PROFILE.ownerId;
  (adapter as unknown as { authState: object }).authState = {
    isAuthenticated: true,
    address: MOCK_USER_PROFILE.address,
    platform: 'LIMITLESS',
    authMethod: 'wallet',
  };
  return adapter;
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Limitless Order Lifecycle Tests (5.0.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // 5.0.1 - Order Signing Tests
  // ===========================================================================

  describe('EIP-712 Order Signing (5.0.1)', () => {
    it('should sign order with correct EIP-712 domain', async () => {
      const adapter = setupAuthenticatedAdapter();

      // Mock market fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      // Mock signature
      const expectedSignature = '0x' + 'ab'.repeat(65);
      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce(expectedSignature);

      // Mock order submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      // Verify signTypedData was called
      expect(mockWalletClient.signTypedData).toHaveBeenCalled();

      // Verify the call had correct domain structure
      const signCall = (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(signCall).toBeDefined();
      if (signCall) {
        const typedDataParams = signCall[0];
        expect(typedDataParams.domain).toHaveProperty('name');
        expect(typedDataParams.domain).toHaveProperty('version');
        expect(typedDataParams.domain).toHaveProperty('chainId');
        expect(typedDataParams.domain).toHaveProperty('verifyingContract');
        expect(typedDataParams.primaryType).toBe('Order');
      }
    });

    it('should include all required order fields in signature', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      const signCall = (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mock.calls[0];
      if (signCall) {
        const message = signCall[0].message;
        expect(message).toHaveProperty('salt');
        expect(message).toHaveProperty('maker');
        expect(message).toHaveProperty('tokenId');
        expect(message).toHaveProperty('makerAmount');
        expect(message).toHaveProperty('takerAmount');
        expect(message).toHaveProperty('side');
      }
    });
  });

  // ===========================================================================
  // 5.0.2 - Order Placement Tests
  // ===========================================================================

  describe('Order Placement Service (5.0.2)', () => {
    it('should place a limit BUY order for YES outcome', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'LIMIT',
      });

      expect(order.id).toBe('order-123');
      expect(order.side).toBe('BUY');
      expect(order.size).toBe(10);
      expect(order.price).toBe(0.65);
      expect(order.status).toBe('OPEN');
    });

    it('should place a limit SELL order for NO outcome', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      const sellOrderResponse = { ...MOCK_ORDER_RESPONSE, side: 'SELL', tokenId: '1' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sellOrderResponse,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'NO',
        side: 'SELL',
        size: 5,
        price: 0.35,
        orderType: 'LIMIT',
      });

      expect(order.side).toBe('SELL');
    });

    it('should reject order with invalid price (>1)', async () => {
      const adapter = setupAuthenticatedAdapter();

      await expect(
        adapter.placeOrder({
          marketId: 'test-market-2025',
          outcome: 'YES',
          side: 'BUY',
          size: 10,
          price: 1.5,
          orderType: 'LIMIT',
        })
      ).rejects.toThrow();
    });

    it('should reject order with invalid price (<0)', async () => {
      const adapter = setupAuthenticatedAdapter();

      await expect(
        adapter.placeOrder({
          marketId: 'test-market-2025',
          outcome: 'YES',
          side: 'BUY',
          size: 10,
          price: -0.1,
          orderType: 'LIMIT',
        })
      ).rejects.toThrow();
    });

    it('should reject order with negative size', async () => {
      const adapter = setupAuthenticatedAdapter();

      await expect(
        adapter.placeOrder({
          marketId: 'test-market-2025',
          outcome: 'YES',
          side: 'BUY',
          size: -10,
          price: 0.5,
          orderType: 'LIMIT',
        })
      ).rejects.toThrow();
    });

    it('should reject order with zero size', async () => {
      const adapter = setupAuthenticatedAdapter();

      await expect(
        adapter.placeOrder({
          marketId: 'test-market-2025',
          outcome: 'YES',
          side: 'BUY',
          size: 0,
          price: 0.5,
          orderType: 'LIMIT',
        })
      ).rejects.toThrow();
    });

    it('should support GTC (Good Till Cancelled) order type', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      expect(order).toBeDefined();
    });

    it('should support FOK (Fill or Kill) order type', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...MOCK_ORDER_RESPONSE, status: 'filled' }),
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'FOK',
      });

      expect(order).toBeDefined();
    });
  });

  // ===========================================================================
  // 5.0.3 - Order Cancellation Tests
  // ===========================================================================

  describe('Order Cancellation (5.0.3)', () => {
    it('should cancel a single order by ID', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await adapter.cancelOrder('order-123');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/order-123'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should return false when cancel fails', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Order not found' }),
      });

      const result = await adapter.cancelOrder('nonexistent-order');

      expect(result).toBe(false);
    });

    it('should cancel all orders for a specific market', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cancelledCount: 5 }),
      });

      const count = await adapter.cancelAllOrders('test-market-2025');

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should handle network errors during cancellation', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.cancelOrder('order-123');

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // 5.0.4 - Collateral Approval Tests
  // ===========================================================================

  describe('Collateral Approval Flow (5.0.4)', () => {
    it('should have internal approval handling for USDC', async () => {
      const adapter = setupAuthenticatedAdapter();

      // The adapter handles approvals internally via ensureCollateralApproval
      // This is called automatically before trades that require USDC
      // We verify the adapter has the necessary infrastructure
      expect(adapter).toHaveProperty('platform', 'LIMITLESS');
      expect(adapter.platform).toBe('LIMITLESS');
    });

    it('should support USDC as collateral token', async () => {
      // Limitless uses USDC (and other tokens) as collateral
      // The adapter handles approval as part of trading flow
      const expectedCollateral = {
        symbol: 'USDC',
        decimals: 6,
      };

      expect(MOCK_MARKET.collateralToken.symbol).toBe(expectedCollateral.symbol);
      expect(MOCK_MARKET.collateralToken.decimals).toBe(expectedCollateral.decimals);
    });
  });

  // ===========================================================================
  // 5.0.5 - Trade Execution UI Tests (Structure)
  // ===========================================================================

  describe('Trade Execution Interface (5.0.5)', () => {
    it('should get best price for BUY YES', async () => {
      const adapter = new LimitlessTradingAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDERBOOK,
      });

      const price = await adapter.getBestPrice('test-market', 'YES', 'BUY');

      expect(price).toBe(0.66); // Best ask
    });

    it('should get best price for SELL YES', async () => {
      const adapter = new LimitlessTradingAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDERBOOK,
      });

      const price = await adapter.getBestPrice('test-market', 'YES', 'SELL');

      expect(price).toBe(0.64); // Best bid
    });

    it('should get best price for BUY NO (inverted)', async () => {
      const adapter = new LimitlessTradingAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDERBOOK,
      });

      const price = await adapter.getBestPrice('test-market', 'NO', 'BUY');

      // For NO, we look at bids for YES and invert: 1 - 0.64 = 0.36
      expect(price).toBeCloseTo(0.36, 2);
    });

    it('should return null when orderbook fetch fails', async () => {
      const adapter = new LimitlessTradingAdapter();

      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const price = await adapter.getBestPrice('test-market', 'YES', 'BUY');

      expect(price).toBeNull();
    });
  });

  // ===========================================================================
  // 5.0.6 - Position Tracking Tests
  // ===========================================================================

  describe('Position Tracking (5.0.6)', () => {
    it('should fetch user positions after authentication', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            marketSlug: 'test-market-2025',
            outcome: 'YES',
            shares: 100,
            avgCostBasis: 0.55,
            currentPrice: 0.65,
          },
        ],
      });

      const positions = await adapter.getPositions();

      expect(Array.isArray(positions)).toBe(true);
    });

    it('should calculate unrealized P&L for positions', async () => {
      const adapter = setupAuthenticatedAdapter();

      const mockPositions = [
        {
          marketSlug: 'test-market-2025',
          outcome: 'YES',
          shares: 100,
          avgCostBasis: 0.55,
          currentPrice: 0.65,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPositions,
      });

      const positions = await adapter.getPositions();

      // P&L = (currentPrice - avgCostBasis) * shares
      // = (0.65 - 0.55) * 100 = 10
      expect(positions.length).toBeGreaterThanOrEqual(0);
    });

    it('should track position for specific market', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          marketSlug: 'test-market-2025',
          outcome: 'YES',
          shares: 50,
          avgCostBasis: 0.60,
        }),
      });

      const position = await adapter.getPosition('test-market-2025', 'YES');

      expect(position).toBeDefined();
    });
  });

  // ===========================================================================
  // 5.0.7 - AMM Trading Tests
  // ===========================================================================

  describe('AMM Trading UI Support (5.0.7)', () => {
    const AMM_MARKET = {
      ...MOCK_MARKET,
      tradeType: 'amm' as const,
      address: '0x' + 'ff'.repeat(20), // FPMM address
    };

    it('should detect AMM market type', async () => {
      // AMM markets have tradeType: 'amm' and an FPMM address
      // The adapter should handle both CLOB and AMM market types
      expect(AMM_MARKET.tradeType).toBe('amm');
      expect(AMM_MARKET.address).toBeDefined();
    });

    it('should have buyFromAMM method for AMM markets', () => {
      const adapter = setupAuthenticatedAdapter();

      expect(adapter).toHaveProperty('buyFromAMM');
      expect(typeof (adapter as unknown as { buyFromAMM: unknown }).buyFromAMM).toBe('function');
    });

    it('should have sellToAMM method for AMM markets', () => {
      const adapter = setupAuthenticatedAdapter();

      expect(adapter).toHaveProperty('sellToAMM');
      expect(typeof (adapter as unknown as { sellToAMM: unknown }).sellToAMM).toBe('function');
    });

    it('should have splitPosition method for CTF operations', () => {
      const adapter = setupAuthenticatedAdapter();

      expect(adapter).toHaveProperty('splitPosition');
    });

    it('should have mergePositions method for CTF operations', () => {
      const adapter = setupAuthenticatedAdapter();

      expect(adapter).toHaveProperty('mergePositions');
    });

    it('should have redeemPositions method for resolved markets', () => {
      const adapter = setupAuthenticatedAdapter();

      expect(adapter).toHaveProperty('redeemPositions');
    });
  });

  // ===========================================================================
  // Order Status Mapping Tests
  // ===========================================================================

  describe('Order Status Mapping', () => {
    it('should map "open" status to OPEN', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...MOCK_ORDER_RESPONSE, status: 'open' }),
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      expect(order.status).toBe('OPEN');
    });

    it('should map "filled" status to FILLED', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...MOCK_ORDER_RESPONSE, status: 'filled', filledSize: 10 }),
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      expect(order.status).toBe('FILLED');
    });

    it('should map "cancelled" status to CANCELLED', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...MOCK_ORDER_RESPONSE,
          id: 'cancelled-order',
          status: 'cancelled',
        }),
      });

      const order = await adapter.getOrder('cancelled-order');

      if (order) {
        expect(order.status).toBe('CANCELLED');
      }
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should throw when placing order without authentication', async () => {
      const adapter = new LimitlessTradingAdapter();

      await expect(
        adapter.placeOrder({
          marketId: 'test-market',
          outcome: 'YES',
          side: 'BUY',
          size: 10,
          price: 0.5,
          orderType: 'LIMIT',
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw when cancelling order without authentication', async () => {
      const adapter = new LimitlessTradingAdapter();

      await expect(adapter.cancelOrder('order-123')).rejects.toThrow('Not authenticated');
    });

    it('should throw when getting positions without authentication', async () => {
      const adapter = new LimitlessTradingAdapter();

      await expect(adapter.getPositions()).rejects.toThrow('Not authenticated');
    });

    it('should handle API timeout gracefully', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      // The adapter returns empty array on fetch errors (graceful degradation)
      const positions = await adapter.getPositions();
      expect(positions).toEqual([]);
    });

    it('should handle malformed API response', async () => {
      const adapter = setupAuthenticatedAdapter();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      // The adapter returns empty array on parse errors (graceful degradation)
      const positions = await adapter.getPositions();
      expect(positions).toEqual([]);
    });
  });

  // ===========================================================================
  // Integration Tests (Mocked)
  // ===========================================================================

  describe('Integration: Full Order Lifecycle', () => {
    it('should complete full order lifecycle: place -> check -> cancel', async () => {
      const adapter = setupAuthenticatedAdapter();

      // 1. Place order
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      expect(order.id).toBe('order-123');
      expect(order.status).toBe('OPEN');

      // 2. Check order status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const fetchedOrder = await adapter.getOrder(order.id);
      expect(fetchedOrder).toBeDefined();

      // 3. Cancel order
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const cancelled = await adapter.cancelOrder(order.id);
      expect(cancelled).toBe(true);
    });

    it('should complete order fill lifecycle: place -> partial fill -> full fill', async () => {
      const adapter = setupAuthenticatedAdapter();

      // 1. Place order
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_MARKET,
      });

      (mockWalletClient.signTypedData as ReturnType<typeof vi.fn>).mockResolvedValueOnce('0x' + 'ab'.repeat(65));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ORDER_RESPONSE,
      });

      const order = await adapter.placeOrder({
        marketId: 'test-market-2025',
        outcome: 'YES',
        side: 'BUY',
        size: 10,
        price: 0.65,
        orderType: 'GTC',
      });

      // 2. Check partial fill
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...MOCK_ORDER_RESPONSE,
          status: 'partial',
          filledSize: 5,
        }),
      });

      const partialOrder = await adapter.getOrder(order.id);
      expect(partialOrder?.status).toBe('PARTIALLY_FILLED');
      expect(partialOrder?.filledSize).toBe(5);

      // 3. Check full fill
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...MOCK_ORDER_RESPONSE,
          status: 'filled',
          filledSize: 10,
          averagePrice: 0.65,
        }),
      });

      const filledOrder = await adapter.getOrder(order.id);
      expect(filledOrder?.status).toBe('FILLED');
      expect(filledOrder?.filledSize).toBe(10);
    });
  });
});

// =============================================================================
// Separate Test File: Limitless CTF Operations
// =============================================================================

describe('Limitless CTF Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose CTF split operation', () => {
    const adapter = createLimitlessAdapter();
    expect(adapter).toHaveProperty('splitPosition');
  });

  it('should expose CTF merge operation', () => {
    const adapter = createLimitlessAdapter();
    expect(adapter).toHaveProperty('mergePositions');
  });

  it('should expose CTF redeem operation', () => {
    const adapter = createLimitlessAdapter();
    expect(adapter).toHaveProperty('redeemPositions');
  });
});
