/**
 * Order Builder Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OrderBuilder,
  createOrderBuilder,
  type OrderBuildInput,
} from '../../src/trading/execution/order-builder';

describe('OrderBuilder', () => {
  let builder: OrderBuilder;

  beforeEach(() => {
    builder = new OrderBuilder();
  });

  describe('buildOrder', () => {
    it('should build a valid limit order', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'btc-100k',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.65,
        orderType: 'GTC',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.marketId).toBe('btc-100k');
      expect(result.order?.outcome).toBe('YES');
      expect(result.order?.side).toBe('BUY');
      expect(result.order?.size).toBe(100);
      expect(result.order?.price).toBe(0.65);
      expect(result.order?.orderType).toBe('GTC');
    });

    it('should reject unsupported order types', () => {
      const input: OrderBuildInput = {
        platform: 'MANIFOLD',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
        orderType: 'GTC', // Manifold only supports MARKET
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('not supported'))).toBe(true);
    });

    it('should require price for limit orders', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        orderType: 'LIMIT',
        // No price specified
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Price required'))).toBe(true);
    });

    it('should adjust price to valid range', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 1.5, // Above max
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.warnings?.some(w => w.includes('adjusted'))).toBe(true);
      expect(result.order?.price).toBeLessThanOrEqual(0.999);
    });

    it('should round price to tick size', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.6543, // Not on tick size
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      // LIMITLESS tick size is 0.001
      expect(result.order?.price).toBe(0.654);
    });

    it('should round size to increment', () => {
      const input: OrderBuildInput = {
        platform: 'POLYMARKET',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 10.5, // Polymarket requires whole numbers
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.adjustments?.adjustedSize).toBeDefined();
    });

    it('should reject orders below minimum size', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 0.001, // Below default minimum of 0.01
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('below minimum'))).toBe(true);
    });

    it('should reject orders above maximum size', () => {
      const builder = new OrderBuilder({ maxOrderSize: 1000 });

      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 10000, // Above max
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('above maximum'))).toBe(true);
    });

    it('should require market ID', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: '',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Market ID'))).toBe(true);
    });

    it('should handle market orders', () => {
      const input: OrderBuildInput = {
        platform: 'KALSHI',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        orderType: 'MARKET',
        slippageTolerance: 0.05,
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.order?.orderType).toBe('MARKET');
      expect(result.order?.price).toBeDefined();
    });

    it('should use default order type when not specified', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
        // No orderType specified
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.order?.orderType).toBe('LIMIT'); // Default
    });

    it('should include estimated fees', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.estimatedFees).toBeDefined();
      expect(result.estimatedFees?.makerFee).toBeDefined();
      expect(result.estimatedFees?.takerFee).toBeDefined();
    });

    it('should preserve optional fields', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
        orderType: 'GTC',
        clientOrderId: 'my-order-123',
        expiresAt: Date.now() + 3600000,
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.order?.clientOrderId).toBe('my-order-123');
      expect(result.order?.expiresAt).toBeDefined();
    });

    it('should handle numeric outcomes', () => {
      const input: OrderBuildInput = {
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 0, // Numeric outcome
        side: 'BUY',
        size: 100,
        price: 0.5,
        orderType: 'LIMIT',
      };

      const result = builder.buildOrder(input);

      expect(result.success).toBe(true);
      expect(result.order?.outcome).toBe(0);
    });
  });

  describe('validateOrder', () => {
    it('should validate a valid order', () => {
      const order = {
        marketId: 'test',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: 100,
        price: 0.5,
        orderType: 'LIMIT' as const,
      };

      const result = builder.validateOrder(order, 'LIMITLESS');

      expect(result.success).toBe(true);
    });

    it('should reject invalid orders', () => {
      const order = {
        marketId: '',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: 100,
        price: 0.5,
        orderType: 'LIMIT' as const,
      };

      const result = builder.validateOrder(order, 'LIMITLESS');

      expect(result.success).toBe(false);
    });
  });

  describe('getPlatformConfig', () => {
    it('should return platform-specific config', () => {
      const limitlessConfig = builder.getPlatformConfig('LIMITLESS');
      const polymarketConfig = builder.getPlatformConfig('POLYMARKET');

      expect(limitlessConfig.tickSize).toBe(0.001);
      expect(polymarketConfig.tickSize).toBe(0.01);
    });
  });

  describe('estimateFees', () => {
    it('should estimate fees based on order', () => {
      const order = {
        marketId: 'test',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: 100,
        price: 0.5,
        orderType: 'LIMIT' as const,
      };

      const fees = builder.estimateFees(order, 'LIMITLESS');

      expect(fees.makerFee).toBe(0); // Limitless has 0 maker fee
      expect(fees.takerFee).toBe(1); // 100 * 0.5 * 0.02 = 1
      expect(fees.totalFee).toBe(0); // LIMIT order = maker fee
    });

    it('should use taker fee for market orders', () => {
      const order = {
        marketId: 'test',
        outcome: 'YES' as const,
        side: 'BUY' as const,
        size: 100,
        price: 0.5,
        orderType: 'MARKET' as const,
      };

      const fees = builder.estimateFees(order, 'LIMITLESS');

      expect(fees.totalFee).toBe(1); // MARKET order = taker fee
    });
  });

  describe('static helpers', () => {
    it('should create market buy order input', () => {
      const input = OrderBuilder.marketBuy('LIMITLESS', 'btc-100k', 'YES', 100);

      expect(input.platform).toBe('LIMITLESS');
      expect(input.marketId).toBe('btc-100k');
      expect(input.outcome).toBe('YES');
      expect(input.side).toBe('BUY');
      expect(input.size).toBe(100);
      expect(input.orderType).toBe('MARKET');
    });

    it('should create market sell order input', () => {
      const input = OrderBuilder.marketSell('POLYMARKET', 'election', 'NO', 50);

      expect(input.side).toBe('SELL');
      expect(input.orderType).toBe('MARKET');
    });

    it('should create limit buy order input', () => {
      const input = OrderBuilder.limitBuy('LIMITLESS', 'btc-100k', 'YES', 100, 0.65);

      expect(input.price).toBe(0.65);
      expect(input.orderType).toBe('GTC');
    });

    it('should create limit sell order input', () => {
      const input = OrderBuilder.limitSell('LIMITLESS', 'btc-100k', 'NO', 50, 0.35, 'FOK');

      expect(input.side).toBe('SELL');
      expect(input.price).toBe(0.35);
      expect(input.orderType).toBe('FOK');
    });
  });

  describe('custom configuration', () => {
    it('should use custom order size limits', () => {
      const customBuilder = new OrderBuilder({
        minOrderSize: 10,
        maxOrderSize: 500,
      });

      const result = customBuilder.buildOrder({
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 5, // Below custom minimum
        price: 0.5,
        orderType: 'LIMIT',
      });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('below minimum'))).toBe(true);
    });

    it('should use custom default order type', () => {
      const customBuilder = new OrderBuilder({
        defaultOrderType: 'GTC',
      });

      const result = customBuilder.buildOrder({
        platform: 'LIMITLESS',
        marketId: 'test',
        outcome: 'YES',
        side: 'BUY',
        size: 100,
        price: 0.5,
      });

      expect(result.success).toBe(true);
      expect(result.order?.orderType).toBe('GTC');
    });
  });
});

describe('createOrderBuilder factory', () => {
  it('should create an order builder instance', () => {
    const builder = createOrderBuilder();
    expect(builder).toBeInstanceOf(OrderBuilder);
  });

  it('should accept configuration', () => {
    const builder = createOrderBuilder({ minOrderSize: 100 });
    expect(builder).toBeInstanceOf(OrderBuilder);
  });
});
