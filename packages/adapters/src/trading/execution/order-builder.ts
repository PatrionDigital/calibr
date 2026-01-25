/**
 * Order Builder Service
 * Constructs and validates order structures for all supported platforms
 */

import type {
  UnifiedOrderRequest,
  OrderSide,
  OrderType,
  TradingPlatform,
} from '../types';
import { UnifiedOrderRequestSchema } from '../types';

// ============================================================================
// Order Builder Configuration
// ============================================================================

export interface OrderBuilderConfig {
  /** Default order type if not specified */
  defaultOrderType?: OrderType;
  /** Default price slippage tolerance (0-1) */
  defaultSlippageTolerance?: number;
  /** Maximum order size */
  maxOrderSize?: number;
  /** Minimum order size */
  minOrderSize?: number;
  /** Platform-specific configurations */
  platformConfig?: Partial<Record<TradingPlatform, PlatformOrderConfig>>;
}

export interface PlatformOrderConfig {
  /** Supported order types */
  supportedOrderTypes: OrderType[];
  /** Minimum price increment (tick size) */
  tickSize: number;
  /** Minimum size increment */
  sizeIncrement: number;
  /** Maximum price (usually 1 for prediction markets) */
  maxPrice: number;
  /** Minimum price */
  minPrice: number;
  /** Fees (as decimal) */
  makerFee?: number;
  takerFee?: number;
}

const DEFAULT_PLATFORM_CONFIG: Record<TradingPlatform, PlatformOrderConfig> = {
  LIMITLESS: {
    supportedOrderTypes: ['LIMIT', 'GTC', 'FOK', 'IOC'],
    tickSize: 0.001,
    sizeIncrement: 0.01,
    maxPrice: 0.999,
    minPrice: 0.001,
    makerFee: 0,
    takerFee: 0.02,
  },
  POLYMARKET: {
    supportedOrderTypes: ['LIMIT', 'GTC', 'GTD', 'FOK'],
    tickSize: 0.01,
    sizeIncrement: 1,
    maxPrice: 0.99,
    minPrice: 0.01,
    makerFee: 0,
    takerFee: 0.02,
  },
  KALSHI: {
    supportedOrderTypes: ['LIMIT', 'MARKET'],
    tickSize: 0.01,
    sizeIncrement: 1,
    maxPrice: 0.99,
    minPrice: 0.01,
    makerFee: 0.01,
    takerFee: 0.01,
  },
  MANIFOLD: {
    supportedOrderTypes: ['MARKET'],
    tickSize: 0.01,
    sizeIncrement: 1,
    maxPrice: 0.99,
    minPrice: 0.01,
    makerFee: 0,
    takerFee: 0,
  },
  METACULUS: {
    supportedOrderTypes: [],
    tickSize: 0.01,
    sizeIncrement: 1,
    maxPrice: 0.99,
    minPrice: 0.01,
    makerFee: 0,
    takerFee: 0,
  },
};

const DEFAULT_CONFIG: Required<Omit<OrderBuilderConfig, 'platformConfig'>> = {
  defaultOrderType: 'LIMIT',
  defaultSlippageTolerance: 0.01,
  maxOrderSize: 1000000,
  minOrderSize: 0.01,
};

// ============================================================================
// Order Builder Types
// ============================================================================

export interface OrderBuildInput {
  /** Target platform */
  platform: TradingPlatform;
  /** Market identifier */
  marketId: string;
  /** Outcome to trade */
  outcome: 'YES' | 'NO' | number;
  /** Buy or sell */
  side: OrderSide;
  /** Order size (shares/contracts) */
  size: number;
  /** Limit price (0-1) */
  price?: number;
  /** Order type */
  orderType?: OrderType;
  /** Optional expiration timestamp */
  expiresAt?: number;
  /** Client-provided order ID */
  clientOrderId?: string;
  /** Slippage tolerance for market orders */
  slippageTolerance?: number;
}

export interface OrderBuildResult {
  /** Success flag */
  success: boolean;
  /** Built order request */
  order?: UnifiedOrderRequest;
  /** Validation errors */
  errors?: string[];
  /** Warnings (order still valid but may have issues) */
  warnings?: string[];
  /** Estimated fees */
  estimatedFees?: {
    makerFee: number;
    takerFee: number;
    totalFee: number;
  };
  /** Adjusted values (after rounding to tick/size increments) */
  adjustments?: {
    originalPrice?: number;
    adjustedPrice?: number;
    originalSize?: number;
    adjustedSize?: number;
  };
}

export interface IOrderBuilder {
  /** Build an order request */
  buildOrder(input: OrderBuildInput): OrderBuildResult;
  /** Validate an order request */
  validateOrder(order: UnifiedOrderRequest, platform: TradingPlatform): OrderBuildResult;
  /** Get platform configuration */
  getPlatformConfig(platform: TradingPlatform): PlatformOrderConfig;
  /** Calculate estimated fees */
  estimateFees(order: UnifiedOrderRequest, platform: TradingPlatform): { makerFee: number; takerFee: number; totalFee: number };
}

// ============================================================================
// Order Builder Implementation
// ============================================================================

export class OrderBuilder implements IOrderBuilder {
  private config: Required<Omit<OrderBuilderConfig, 'platformConfig'>>;
  private platformConfig: Record<TradingPlatform, PlatformOrderConfig>;

  constructor(config: OrderBuilderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.platformConfig = {
      ...DEFAULT_PLATFORM_CONFIG,
      ...config.platformConfig,
    };
  }

  /**
   * Build an order request from input
   */
  buildOrder(input: OrderBuildInput): OrderBuildResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const adjustments: OrderBuildResult['adjustments'] = {};

    // Get platform config
    const platformConfig = this.getPlatformConfig(input.platform);

    // Determine order type
    const orderType = input.orderType || this.config.defaultOrderType;

    // Validate order type is supported
    if (!platformConfig.supportedOrderTypes.includes(orderType)) {
      errors.push(
        `Order type '${orderType}' not supported on ${input.platform}. ` +
        `Supported types: ${platformConfig.supportedOrderTypes.join(', ')}`
      );
    }

    // Validate and adjust price
    let price = input.price;
    if (orderType !== 'MARKET') {
      if (price === undefined) {
        errors.push('Price required for limit orders');
      } else {
        // Clamp price to valid range
        if (price < platformConfig.minPrice) {
          adjustments.originalPrice = price;
          price = platformConfig.minPrice;
          adjustments.adjustedPrice = price;
          warnings.push(`Price adjusted from ${adjustments.originalPrice} to ${price} (minimum)`);
        }
        if (price > platformConfig.maxPrice) {
          adjustments.originalPrice = price;
          price = platformConfig.maxPrice;
          adjustments.adjustedPrice = price;
          warnings.push(`Price adjusted from ${adjustments.originalPrice} to ${price} (maximum)`);
        }

        // Round to tick size
        const roundedPrice = Math.round(price / platformConfig.tickSize) * platformConfig.tickSize;
        if (Math.abs(roundedPrice - price) > 0.0001) {
          adjustments.originalPrice = adjustments.originalPrice || price;
          price = roundedPrice;
          adjustments.adjustedPrice = price;
          warnings.push(`Price rounded to tick size: ${price}`);
        }
      }
    } else {
      // Market order - use slippage for price bounds
      const slippage = input.slippageTolerance || this.config.defaultSlippageTolerance;
      if (input.side === 'BUY') {
        price = platformConfig.maxPrice * (1 + slippage);
      } else {
        price = platformConfig.minPrice * (1 - slippage);
      }
      price = Math.max(platformConfig.minPrice, Math.min(platformConfig.maxPrice, price));
    }

    // Validate and adjust size
    let size = input.size;
    if (size < this.config.minOrderSize) {
      errors.push(`Size ${size} below minimum ${this.config.minOrderSize}`);
    }
    if (size > this.config.maxOrderSize) {
      errors.push(`Size ${size} above maximum ${this.config.maxOrderSize}`);
    }

    // Round to size increment
    const roundedSize = Math.round(size / platformConfig.sizeIncrement) * platformConfig.sizeIncrement;
    if (Math.abs(roundedSize - size) > 0.0001) {
      adjustments.originalSize = size;
      size = roundedSize;
      adjustments.adjustedSize = size;
      warnings.push(`Size rounded to increment: ${size}`);
    }

    // Validate market ID
    if (!input.marketId || input.marketId.trim() === '') {
      errors.push('Market ID is required');
    }

    // Return errors if any
    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    // Build the order
    const order: UnifiedOrderRequest = {
      marketId: input.marketId,
      outcome: input.outcome,
      side: input.side,
      size,
      price: price!,
      orderType,
      expiresAt: input.expiresAt,
      clientOrderId: input.clientOrderId,
    };

    // Validate with schema
    const schemaResult = UnifiedOrderRequestSchema.safeParse(order);
    if (!schemaResult.success) {
      return {
        success: false,
        errors: schemaResult.error.errors.map(e => e.message),
      };
    }

    // Calculate estimated fees
    const estimatedFees = this.estimateFees(order, input.platform);

    return {
      success: true,
      order,
      warnings: warnings.length > 0 ? warnings : undefined,
      estimatedFees,
      adjustments: Object.keys(adjustments).length > 0 ? adjustments : undefined,
    };
  }

  /**
   * Validate an existing order request
   */
  validateOrder(order: UnifiedOrderRequest, platform: TradingPlatform): OrderBuildResult {
    const input: OrderBuildInput = {
      platform,
      marketId: order.marketId,
      outcome: order.outcome,
      side: order.side,
      size: order.size,
      price: order.price,
      orderType: order.orderType,
      expiresAt: order.expiresAt,
      clientOrderId: order.clientOrderId,
    };

    return this.buildOrder(input);
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(platform: TradingPlatform): PlatformOrderConfig {
    return this.platformConfig[platform] || DEFAULT_PLATFORM_CONFIG.LIMITLESS;
  }

  /**
   * Estimate fees for an order
   */
  estimateFees(
    order: UnifiedOrderRequest,
    platform: TradingPlatform
  ): { makerFee: number; takerFee: number; totalFee: number } {
    const config = this.getPlatformConfig(platform);
    const notional = order.size * order.price;

    const makerFee = notional * (config.makerFee || 0);
    const takerFee = notional * (config.takerFee || 0);

    // Assume taker for market orders, maker for limit orders
    const isMarketOrder = order.orderType === 'MARKET';
    const totalFee = isMarketOrder ? takerFee : makerFee;

    return { makerFee, takerFee, totalFee };
  }

  /**
   * Create a market buy order
   */
  static marketBuy(
    platform: TradingPlatform,
    marketId: string,
    outcome: 'YES' | 'NO',
    size: number,
    slippageTolerance?: number
  ): OrderBuildInput {
    return {
      platform,
      marketId,
      outcome,
      side: 'BUY',
      size,
      orderType: 'MARKET',
      slippageTolerance,
    };
  }

  /**
   * Create a market sell order
   */
  static marketSell(
    platform: TradingPlatform,
    marketId: string,
    outcome: 'YES' | 'NO',
    size: number,
    slippageTolerance?: number
  ): OrderBuildInput {
    return {
      platform,
      marketId,
      outcome,
      side: 'SELL',
      size,
      orderType: 'MARKET',
      slippageTolerance,
    };
  }

  /**
   * Create a limit buy order
   */
  static limitBuy(
    platform: TradingPlatform,
    marketId: string,
    outcome: 'YES' | 'NO',
    size: number,
    price: number,
    orderType: OrderType = 'GTC'
  ): OrderBuildInput {
    return {
      platform,
      marketId,
      outcome,
      side: 'BUY',
      size,
      price,
      orderType,
    };
  }

  /**
   * Create a limit sell order
   */
  static limitSell(
    platform: TradingPlatform,
    marketId: string,
    outcome: 'YES' | 'NO',
    size: number,
    price: number,
    orderType: OrderType = 'GTC'
  ): OrderBuildInput {
    return {
      platform,
      marketId,
      outcome,
      side: 'SELL',
      size,
      price,
      orderType,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrderBuilder(config?: OrderBuilderConfig): OrderBuilder {
  return new OrderBuilder(config);
}

// Export singleton
export const orderBuilder = new OrderBuilder();
