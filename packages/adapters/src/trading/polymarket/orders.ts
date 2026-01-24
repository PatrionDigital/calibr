/**
 * Polymarket Order Builder and Execution
 * Handles order construction, signing, and submission
 */

import { ClobClient } from '@polymarket/clob-client';
import {
  type Hex,
  type WalletClient,
  keccak256,
  encodePacked,
  parseUnits,
} from 'viem';
import type {
  UnifiedOrderRequest,
  UnifiedOrder,
  OrderSide,
  OrderStatus,
  PolymarketCredentials,
} from '../types';
import {
  ORDER_CONSTANTS,
  POLYGON_MAINNET_CONFIG,
  validateOrderParams,
} from './config';
import { PolymarketAuthService } from './auth';

// Order type mapping
const ORDER_TYPE_MAP = {
  MARKET: 'FOK', // Fill or Kill for market orders
  LIMIT: 'GTC', // Good Till Cancelled
  GTC: 'GTC',
  GTD: 'GTD', // Good Till Date
  FOK: 'FOK', // Fill or Kill
  IOC: 'IOC', // Immediate or Cancel (not supported, fallback to FOK)
} as const;

// Status mapping from Polymarket to unified
const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: 'PENDING',
  LIVE: 'OPEN',
  MATCHED: 'FILLED',
  PARTIALLY_MATCHED: 'PARTIALLY_FILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REJECTED: 'REJECTED',
};

export interface OrderBuilderConfig {
  rpcUrl?: string;
  clobUrl?: string;
}

/**
 * Polymarket Order Builder
 * Constructs valid order structures for the CLOB
 */
export class PolymarketOrderBuilder {
  private config: OrderBuilderConfig;
  private authService: PolymarketAuthService;
  private clobClient: ClobClient | null = null;

  constructor(config: OrderBuilderConfig = {}) {
    this.config = {
      rpcUrl: config.rpcUrl || POLYGON_MAINNET_CONFIG.rpcUrl,
      clobUrl: config.clobUrl || POLYGON_MAINNET_CONFIG.clobUrl,
    };
    this.authService = new PolymarketAuthService(config);
  }

  /**
   * Initialize the CLOB client with credentials
   */
  async initialize(
    credentials: PolymarketCredentials,
    walletClient?: WalletClient
  ): Promise<void> {
    // Get signer if wallet client provided
    let signer: unknown = undefined;
    if (walletClient) {
      const [address] = await walletClient.getAddresses();
      signer = {
        address,
        signTypedData: walletClient.signTypedData.bind(walletClient),
        signMessage: walletClient.signMessage.bind(walletClient),
      };
    }

    // Initialize CLOB client - signer type compatibility handled via 'as any'
    this.clobClient = new ClobClient(
      this.config.clobUrl!,
      POLYGON_MAINNET_CONFIG.chainId,
      signer as any, // Type workaround for signer compatibility
      credentials as any // Credentials format handled internally
    );
  }

  /**
   * Build an order from unified request
   */
  buildOrder(request: UnifiedOrderRequest): {
    tokenId: string;
    side: 'BUY' | 'SELL';
    price: number;
    size: number;
    orderType: string;
    expiration?: number;
  } {
    // Validate order parameters
    const validation = validateOrderParams(request.size, request.price);
    if (!validation.valid) {
      throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
    }

    // Map outcome to token ID
    // For binary markets: YES = token 0, NO = token 1
    // The actual token ID would come from the market data
    const tokenId = request.marketId; // In practice, this comes from market lookup

    // Map order type
    const orderType = ORDER_TYPE_MAP[request.orderType] || 'GTC';

    return {
      tokenId,
      side: request.side,
      price: this.alignPrice(request.price),
      size: request.size,
      orderType,
      expiration: request.expiresAt,
    };
  }

  /**
   * Align price to valid tick size
   */
  private alignPrice(price: number): number {
    const ticks = Math.round(price / ORDER_CONSTANTS.priceTick);
    return ticks * ORDER_CONSTANTS.priceTick;
  }

  /**
   * Calculate order cost including fees
   */
  calculateOrderCost(
    size: number,
    price: number,
    side: OrderSide,
    isMaker = true
  ): {
    principal: number;
    fee: number;
    total: number;
  } {
    const principal = side === 'BUY' ? size * price : size * (1 - price);
    const feeRate = isMaker ? ORDER_CONSTANTS.makerFeeRate : ORDER_CONSTANTS.takerFeeRate;
    const fee = principal * feeRate;

    return {
      principal,
      fee,
      total: principal + fee,
    };
  }

  /**
   * Generate a unique order nonce
   */
  generateNonce(): bigint {
    return BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000));
  }

  /**
   * Create order hash for signing
   */
  createOrderHash(
    tokenId: string,
    side: OrderSide,
    price: number,
    size: number,
    nonce: bigint
  ): Hex {
    return keccak256(
      encodePacked(
        ['string', 'string', 'uint256', 'uint256', 'uint256'],
        [tokenId, side, parseUnits(price.toString(), 6), parseUnits(size.toString(), 6), nonce]
      )
    );
  }

  /**
   * Submit an order to the CLOB
   */
  async submitOrder(
    request: UnifiedOrderRequest,
    credentials: PolymarketCredentials
  ): Promise<UnifiedOrder> {
    if (!this.clobClient) {
      throw new Error('CLOB client not initialized. Call initialize() first.');
    }

    const orderParams = this.buildOrder(request);

    try {
      // Create order using CLOB client
      // Using 'as any' to work around CLOB client type strictness
      const order = await (this.clobClient as any).createOrder({
        tokenID: orderParams.tokenId,
        side: orderParams.side as 'BUY' | 'SELL',
        price: orderParams.price,
        size: orderParams.size,
      });

      // Post order to CLOB
      const response = await this.clobClient.postOrder(order);

      // Map response to unified order
      return this.mapToUnifiedOrder(response, request);
    } catch (error) {
      console.error('Order submission error:', error);
      throw new Error(`Failed to submit order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      await this.clobClient.cancelOrder({ orderID: orderId });
      return true;
    } catch (error) {
      console.error('Cancel order error:', error);
      return false;
    }
  }

  /**
   * Cancel all orders for a market
   */
  async cancelAllOrders(marketId?: string): Promise<number> {
    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      if (marketId) {
        await this.clobClient.cancelMarketOrders({ market: marketId });
      } else {
        await this.clobClient.cancelAll();
      }
      return -1; // CLOB client doesn't return count
    } catch (error) {
      console.error('Cancel all orders error:', error);
      return 0;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<UnifiedOrder | null> {
    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      const order = await this.clobClient.getOrder(orderId);
      if (!order) return null;

      return this.mapClobOrderToUnified(order);
    } catch {
      return null;
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(marketId?: string): Promise<UnifiedOrder[]> {
    if (!this.clobClient) {
      throw new Error('CLOB client not initialized');
    }

    try {
      const orders = marketId
        ? await this.clobClient.getOpenOrders({ market: marketId })
        : await this.clobClient.getOpenOrders();

      return orders.map((o: unknown) => this.mapClobOrderToUnified(o));
    } catch (error) {
      console.error('Get open orders error:', error);
      return [];
    }
  }

  /**
   * Map CLOB response to unified order
   */
  private mapToUnifiedOrder(
    response: unknown,
    request: UnifiedOrderRequest
  ): UnifiedOrder {
    const resp = response as Record<string, unknown>;
    const now = new Date();

    return {
      id: (resp.id || resp.orderID || '') as string,
      clientOrderId: request.clientOrderId,
      platform: 'POLYMARKET',
      marketId: request.marketId,
      outcome: request.outcome,
      side: request.side,
      orderType: request.orderType,
      status: STATUS_MAP[(resp.status as string) || 'PENDING'] || 'PENDING',
      size: request.size,
      filledSize: (resp.filledSize as number) || 0,
      remainingSize: (resp.remainingSize as number) || request.size,
      price: request.price,
      averagePrice: (resp.avgPrice as number) || undefined,
      createdAt: now,
      updatedAt: now,
      expiresAt: request.expiresAt ? new Date(request.expiresAt * 1000) : undefined,
      platformData: resp,
    };
  }

  /**
   * Map CLOB order to unified format
   */
  private mapClobOrderToUnified(order: unknown): UnifiedOrder {
    const o = order as Record<string, unknown>;

    return {
      id: (o.id || o.orderID || '') as string,
      platform: 'POLYMARKET',
      marketId: (o.market || o.asset_id || '') as string,
      outcome: (o.outcome || 'YES') as 'YES' | 'NO',
      side: (o.side as OrderSide) || 'BUY',
      orderType: 'LIMIT',
      status: STATUS_MAP[(o.status as string) || 'LIVE'] || 'OPEN',
      size: (o.original_size || o.size || 0) as number,
      filledSize: (o.size_matched || 0) as number,
      remainingSize: ((o.original_size || 0) as number) - ((o.size_matched || 0) as number),
      price: (o.price || 0) as number,
      averagePrice: (o.avg_price as number) || undefined,
      createdAt: o.created_at ? new Date(o.created_at as string) : new Date(),
      updatedAt: o.updated_at ? new Date(o.updated_at as string) : new Date(),
      platformData: o,
    };
  }
}

// Export singleton
export const polymarketOrders = new PolymarketOrderBuilder();
