/**
 * Base Trading Adapter
 * Abstract base class with common functionality for all trading adapters
 */

import type {
  ITradingAdapter,
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
} from './types';

export abstract class BaseTradingAdapter implements ITradingAdapter {
  abstract readonly platform: TradingPlatform;

  protected authState: AuthState | null = null;

  /**
   * Check if the adapter is ready for trading
   */
  abstract isReady(): Promise<boolean>;

  /**
   * Authenticate with the platform
   */
  abstract authenticate(credentials?: AuthCredentials): Promise<AuthState>;

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState | null {
    return this.authState;
  }

  /**
   * Logout and clear authentication
   */
  async logout(): Promise<void> {
    this.authState = null;
  }

  /**
   * Place an order
   */
  abstract placeOrder(order: UnifiedOrderRequest): Promise<UnifiedOrder>;

  /**
   * Cancel an order
   */
  abstract cancelOrder(orderId: string): Promise<boolean>;

  /**
   * Cancel all orders, optionally for a specific market
   */
  abstract cancelAllOrders(marketId?: string): Promise<number>;

  /**
   * Get order by ID
   */
  abstract getOrder(orderId: string): Promise<UnifiedOrder | null>;

  /**
   * Get open orders
   */
  abstract getOpenOrders(marketId?: string): Promise<UnifiedOrder[]>;

  /**
   * Get order history
   */
  abstract getOrderHistory(options?: OrderHistoryOptions): Promise<UnifiedOrder[]>;

  /**
   * Get all positions
   */
  abstract getPositions(): Promise<UnifiedPosition[]>;

  /**
   * Get position for a specific market and outcome
   */
  abstract getPosition(
    marketId: string,
    outcome: 'YES' | 'NO' | number
  ): Promise<UnifiedPosition | null>;

  /**
   * Get trade history
   */
  abstract getTrades(options?: TradeHistoryOptions): Promise<UnifiedTrade[]>;

  /**
   * Get all balances
   */
  abstract getBalances(): Promise<UnifiedBalance[]>;

  /**
   * Get balance for a specific token
   */
  abstract getBalance(token: string): Promise<UnifiedBalance | null>;

  /**
   * Get best available price for a market
   */
  abstract getBestPrice(
    marketId: string,
    outcome: 'YES' | 'NO' | number,
    side: OrderSide
  ): Promise<number | null>;

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Ensure the adapter is authenticated before making requests
   */
  protected ensureAuthenticated(): void {
    if (!this.authState?.isAuthenticated) {
      throw new Error(`Not authenticated with ${this.platform}`);
    }
  }

  /**
   * Check if authentication has expired
   */
  protected isAuthExpired(): boolean {
    if (!this.authState?.expiresAt) return false;
    return new Date() > this.authState.expiresAt;
  }

  /**
   * Calculate P&L for a position
   */
  protected calculatePnl(
    size: number,
    averagePrice: number,
    currentPrice: number
  ): { unrealizedPnl: number; percentChange: number } {
    const costBasis = size * averagePrice;
    const currentValue = size * currentPrice;
    const unrealizedPnl = currentValue - costBasis;
    const percentChange = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;
    return { unrealizedPnl, percentChange };
  }

  /**
   * Normalize price to 0-1 range
   */
  protected normalizePrice(price: number): number {
    // If price is in cents (0-100), convert to decimal
    if (price > 1) {
      return price / 100;
    }
    return Math.max(0, Math.min(1, price));
  }

  /**
   * Generate a unique client order ID
   */
  protected generateClientOrderId(): string {
    return `calibr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
