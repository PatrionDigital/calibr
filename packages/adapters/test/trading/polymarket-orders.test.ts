/**
 * PolymarketOrderBuilder Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PolymarketOrderBuilder, polymarketOrders } from '../../src/trading/polymarket/orders';
import type { UnifiedOrderRequest, PolymarketCredentials } from '../../src/trading/types';

// =============================================================================
// Mocks
// =============================================================================

// Create mock functions at module level
const mockPostOrder = vi.fn();
const mockCancelOrder = vi.fn();
const mockCancelMarketOrders = vi.fn();
const mockCancelAll = vi.fn();
const mockGetOrder = vi.fn();
const mockGetOpenOrders = vi.fn();
const mockCreateOrder = vi.fn();

// Store the mock instance to access it later
const mockClobClientInstance = {
  postOrder: mockPostOrder,
  cancelOrder: mockCancelOrder,
  cancelMarketOrders: mockCancelMarketOrders,
  cancelAll: mockCancelAll,
  getOrder: mockGetOrder,
  getOpenOrders: mockGetOpenOrders,
  createOrder: mockCreateOrder,
};

vi.mock('@polymarket/clob-client', () => ({
  ClobClient: vi.fn(() => mockClobClientInstance),
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    keccak256: vi.fn(() => '0x' + 'ab'.repeat(32)),
    encodePacked: vi.fn(() => '0x1234'),
    parseUnits: vi.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e6))),
  };
});

// =============================================================================
// Test Data
// =============================================================================

const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890' as const;

function createMockWalletClient() {
  return {
    getAddresses: vi.fn().mockResolvedValue([TEST_WALLET_ADDRESS]),
    signTypedData: vi.fn(),
    signMessage: vi.fn(),
  };
}

function createMockCredentials(): PolymarketCredentials {
  return {
    platform: 'POLYMARKET',
    apiKey: 'test-api-key-1234567890123456',
    apiSecret: 'test-api-secret-12345678901234567890123456789012',
    passphrase: 'test-passphrase1',
    signatureType: 'EOA',
  };
}

function createMockOrderRequest(): UnifiedOrderRequest {
  return {
    marketId: 'test-market-id',
    outcome: 'YES',
    side: 'BUY',
    size: 100,
    price: 0.5,
    orderType: 'LIMIT',
    platform: 'POLYMARKET',
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PolymarketOrderBuilder', () => {
  let builder: PolymarketOrderBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    builder = new PolymarketOrderBuilder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const b = new PolymarketOrderBuilder();
      expect(b).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const b = new PolymarketOrderBuilder({
        rpcUrl: 'https://custom-polygon.example.com',
        clobUrl: 'https://custom-clob.example.com',
      });
      expect(b).toBeDefined();
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(polymarketOrders).toBeInstanceOf(PolymarketOrderBuilder);
    });
  });

  // ---------------------------------------------------------------------------
  // Initialize
  // ---------------------------------------------------------------------------

  describe('initialize', () => {
    it('should initialize with credentials only', async () => {
      const credentials = createMockCredentials();
      await expect(builder.initialize(credentials)).resolves.not.toThrow();
    });

    it('should initialize with wallet client', async () => {
      const credentials = createMockCredentials();
      const walletClient = createMockWalletClient();
      await expect(
        builder.initialize(credentials, walletClient as any)
      ).resolves.not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Build Order
  // ---------------------------------------------------------------------------

  describe('buildOrder', () => {
    it('should build valid order from request', () => {
      const request = createMockOrderRequest();
      const order = builder.buildOrder(request);

      expect(order.tokenId).toBe('test-market-id');
      expect(order.side).toBe('BUY');
      expect(order.price).toBe(0.5);
      expect(order.size).toBe(100);
      expect(order.orderType).toBe('GTC');
    });

    it('should map MARKET order type to FOK', () => {
      const request = createMockOrderRequest();
      request.orderType = 'MARKET';
      const order = builder.buildOrder(request);

      expect(order.orderType).toBe('FOK');
    });

    it('should map LIMIT order type to GTC', () => {
      const request = createMockOrderRequest();
      request.orderType = 'LIMIT';
      const order = builder.buildOrder(request);

      expect(order.orderType).toBe('GTC');
    });

    it('should preserve GTC order type', () => {
      const request = createMockOrderRequest();
      request.orderType = 'GTC';
      const order = builder.buildOrder(request);

      expect(order.orderType).toBe('GTC');
    });

    it('should preserve FOK order type', () => {
      const request = createMockOrderRequest();
      request.orderType = 'FOK';
      const order = builder.buildOrder(request);

      expect(order.orderType).toBe('FOK');
    });

    it('should include expiration when provided', () => {
      const request = createMockOrderRequest();
      request.expiresAt = 1700000000;
      const order = builder.buildOrder(request);

      expect(order.expiration).toBe(1700000000);
    });

    it('should align price to tick size', () => {
      const request = createMockOrderRequest();
      // Use a price that aligns correctly (0.501 rounds to 0.501)
      request.price = 0.501;
      const order = builder.buildOrder(request);

      expect(order.price).toBeCloseTo(0.501, 3);
    });

    it('should throw for invalid order size (too small)', () => {
      const request = createMockOrderRequest();
      request.size = 0.5;

      expect(() => builder.buildOrder(request)).toThrow('Invalid order');
    });

    it('should throw for invalid order size (too large)', () => {
      const request = createMockOrderRequest();
      request.size = 2_000_000;

      expect(() => builder.buildOrder(request)).toThrow('Invalid order');
    });

    it('should throw for invalid price (too low)', () => {
      const request = createMockOrderRequest();
      request.price = 0.0001;

      expect(() => builder.buildOrder(request)).toThrow('Invalid order');
    });

    it('should throw for invalid price (too high)', () => {
      const request = createMockOrderRequest();
      request.price = 1.0;

      expect(() => builder.buildOrder(request)).toThrow('Invalid order');
    });
  });

  // ---------------------------------------------------------------------------
  // Calculate Order Cost
  // ---------------------------------------------------------------------------

  describe('calculateOrderCost', () => {
    it('should calculate BUY order cost correctly', () => {
      const cost = builder.calculateOrderCost(100, 0.5, 'BUY', true);

      expect(cost.principal).toBe(50); // 100 * 0.5
      expect(cost.fee).toBe(0); // Maker fee is 0
      expect(cost.total).toBe(50);
    });

    it('should calculate SELL order cost correctly', () => {
      const cost = builder.calculateOrderCost(100, 0.5, 'SELL', true);

      expect(cost.principal).toBe(50); // 100 * (1 - 0.5)
      expect(cost.fee).toBe(0);
      expect(cost.total).toBe(50);
    });

    it('should include taker fee when not maker', () => {
      const cost = builder.calculateOrderCost(100, 0.5, 'BUY', false);

      expect(cost.principal).toBe(50);
      expect(cost.fee).toBe(1); // 50 * 0.02
      expect(cost.total).toBe(51);
    });

    it('should calculate high price BUY correctly', () => {
      const cost = builder.calculateOrderCost(100, 0.9, 'BUY', true);

      expect(cost.principal).toBe(90); // 100 * 0.9
      expect(cost.total).toBe(90);
    });

    it('should calculate low price SELL correctly', () => {
      const cost = builder.calculateOrderCost(100, 0.1, 'SELL', true);

      expect(cost.principal).toBe(90); // 100 * (1 - 0.1)
      expect(cost.total).toBe(90);
    });
  });

  // ---------------------------------------------------------------------------
  // Generate Nonce
  // ---------------------------------------------------------------------------

  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = builder.generateNonce();
      const nonce2 = builder.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    it('should return bigint', () => {
      const nonce = builder.generateNonce();
      expect(typeof nonce).toBe('bigint');
    });

    it('should generate positive nonce', () => {
      const nonce = builder.generateNonce();
      expect(nonce > 0n).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Create Order Hash
  // ---------------------------------------------------------------------------

  describe('createOrderHash', () => {
    it('should create order hash', () => {
      const hash = builder.createOrderHash(
        'token-123',
        'BUY',
        0.5,
        100,
        BigInt(1234567890)
      );

      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should create consistent hash for same inputs', () => {
      const hash1 = builder.createOrderHash('token-123', 'BUY', 0.5, 100, 1234n);
      const hash2 = builder.createOrderHash('token-123', 'BUY', 0.5, 100, 1234n);

      expect(hash1).toBe(hash2);
    });
  });

  // ---------------------------------------------------------------------------
  // Submit Order
  // ---------------------------------------------------------------------------

  describe('submitOrder', () => {
    it('should throw if client not initialized', async () => {
      const request = createMockOrderRequest();
      const credentials = createMockCredentials();

      await expect(builder.submitOrder(request, credentials)).rejects.toThrow(
        'CLOB client not initialized'
      );
    });

    it('should submit order when initialized', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      const mockOrder = { id: 'order-123', tokenID: 'token-123' };
      mockCreateOrder.mockResolvedValue(mockOrder);
      mockPostOrder.mockResolvedValue({
        id: 'order-123',
        status: 'PENDING',
      });

      const request = createMockOrderRequest();
      const result = await builder.submitOrder(request, credentials);

      expect(result.id).toBe('order-123');
      expect(result.platform).toBe('POLYMARKET');
      expect(result.status).toBe('PENDING');
    });

    it('should map response to unified order format', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCreateOrder.mockResolvedValue({ id: 'order-123' });
      mockPostOrder.mockResolvedValue({
        id: 'order-123',
        status: 'LIVE',
        filledSize: 50,
        remainingSize: 50,
        avgPrice: 0.5,
      });

      const request = createMockOrderRequest();
      const result = await builder.submitOrder(request, credentials);

      expect(result.id).toBe('order-123');
      expect(result.status).toBe('OPEN');
      expect(result.filledSize).toBe(50);
      expect(result.remainingSize).toBe(50);
      expect(result.averagePrice).toBe(0.5);
    });

    it('should throw on submission error', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCreateOrder.mockRejectedValue(new Error('Network error'));

      const request = createMockOrderRequest();
      await expect(builder.submitOrder(request, credentials)).rejects.toThrow(
        'Failed to submit order'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel Order
  // ---------------------------------------------------------------------------

  describe('cancelOrder', () => {
    it('should throw if client not initialized', async () => {
      await expect(builder.cancelOrder('order-123')).rejects.toThrow(
        'CLOB client not initialized'
      );
    });

    it('should cancel order successfully', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelOrder.mockResolvedValue({});

      const result = await builder.cancelOrder('order-123');
      expect(result).toBe(true);
      expect(mockCancelOrder).toHaveBeenCalledWith({ orderID: 'order-123' });
    });

    it('should return false on cancel error', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelOrder.mockRejectedValue(new Error('Cancel failed'));

      const result = await builder.cancelOrder('order-123');
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Cancel All Orders
  // ---------------------------------------------------------------------------

  describe('cancelAllOrders', () => {
    it('should throw if client not initialized', async () => {
      await expect(builder.cancelAllOrders()).rejects.toThrow(
        'CLOB client not initialized'
      );
    });

    it('should cancel all orders for market', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelMarketOrders.mockResolvedValue({});

      await builder.cancelAllOrders('market-123');
      expect(mockCancelMarketOrders).toHaveBeenCalledWith({ market: 'market-123' });
    });

    it('should cancel all orders when no market specified', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelAll.mockResolvedValue({});

      await builder.cancelAllOrders();
      expect(mockCancelAll).toHaveBeenCalled();
    });

    it('should return -1 on success (count unavailable)', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelAll.mockResolvedValue({});

      const result = await builder.cancelAllOrders();
      expect(result).toBe(-1);
    });

    it('should return 0 on error', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCancelAll.mockRejectedValue(new Error('Cancel failed'));

      const result = await builder.cancelAllOrders();
      expect(result).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Get Order
  // ---------------------------------------------------------------------------

  describe('getOrder', () => {
    it('should throw if client not initialized', async () => {
      await expect(builder.getOrder('order-123')).rejects.toThrow(
        'CLOB client not initialized'
      );
    });

    it('should return order by ID', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue({
        id: 'order-123',
        market: 'market-123',
        side: 'BUY',
        status: 'LIVE',
        original_size: 100,
        size_matched: 50,
        price: 0.5,
      });

      const result = await builder.getOrder('order-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('order-123');
      expect(result!.status).toBe('OPEN');
      expect(result!.size).toBe(100);
      expect(result!.filledSize).toBe(50);
    });

    it('should return null for non-existent order', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue(null);

      const result = await builder.getOrder('order-999');
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockRejectedValue(new Error('Not found'));

      const result = await builder.getOrder('order-123');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Get Open Orders
  // ---------------------------------------------------------------------------

  describe('getOpenOrders', () => {
    it('should throw if client not initialized', async () => {
      await expect(builder.getOpenOrders()).rejects.toThrow(
        'CLOB client not initialized'
      );
    });

    it('should return all open orders', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOpenOrders.mockResolvedValue([
        { id: 'order-1', status: 'LIVE' },
        { id: 'order-2', status: 'LIVE' },
      ]);

      const result = await builder.getOpenOrders();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    it('should return orders for specific market', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOpenOrders.mockResolvedValue([{ id: 'order-1', market: 'market-123' }]);

      await builder.getOpenOrders('market-123');

      expect(mockGetOpenOrders).toHaveBeenCalledWith({ market: 'market-123' });
    });

    it('should return empty array on error', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOpenOrders.mockRejectedValue(new Error('Network error'));

      const result = await builder.getOpenOrders();
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Status Mapping
  // ---------------------------------------------------------------------------

  describe('Status Mapping', () => {
    it('should map PENDING status correctly', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockCreateOrder.mockResolvedValue({ id: 'test' });
      mockPostOrder.mockResolvedValue({ id: 'test', status: 'PENDING' });

      const request = createMockOrderRequest();
      const result = await builder.submitOrder(request, credentials);

      expect(result.status).toBe('PENDING');
    });

    it('should map LIVE status to OPEN', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue({ id: 'test', status: 'LIVE' });

      const result = await builder.getOrder('test');
      expect(result!.status).toBe('OPEN');
    });

    it('should map MATCHED status to FILLED', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue({ id: 'test', status: 'MATCHED' });

      const result = await builder.getOrder('test');
      expect(result!.status).toBe('FILLED');
    });

    it('should map PARTIALLY_MATCHED status', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue({ id: 'test', status: 'PARTIALLY_MATCHED' });

      const result = await builder.getOrder('test');
      expect(result!.status).toBe('PARTIALLY_FILLED');
    });

    it('should map CANCELLED status', async () => {
      const credentials = createMockCredentials();
      await builder.initialize(credentials);

      mockGetOrder.mockResolvedValue({ id: 'test', status: 'CANCELLED' });

      const result = await builder.getOrder('test');
      expect(result!.status).toBe('CANCELLED');
    });
  });
});
