/**
 * Order Status Tracker Service
 * Polls order status and emits updates when status changes
 */

import { randomUUID } from 'crypto';
import { tradingAdapterRegistry } from '../registry';
import type { ITradingAdapter, TradingPlatform, UnifiedOrder, OrderStatus } from '../types';
import type {
  IOrderStatusTracker,
  OrderStatusUpdate,
  OrderTrackingSubscription,
  OrderTrackingOptions,
  ITradeNotifier,
  IExecutionLogger,
} from './types';

// ============================================================================
// Tracker Configuration
// ============================================================================

export interface OrderStatusTrackerConfig {
  /** Default polling interval in ms */
  defaultPollingInterval?: number;
  /** Default timeout in ms */
  defaultTimeout?: number;
  /** Max concurrent subscriptions */
  maxSubscriptions?: number;
}

const DEFAULT_CONFIG: Required<OrderStatusTrackerConfig> = {
  defaultPollingInterval: 2000,
  defaultTimeout: 3600000, // 1 hour
  maxSubscriptions: 100,
};

// Terminal order statuses
const TERMINAL_STATUSES: OrderStatus[] = ['FILLED', 'CANCELLED', 'EXPIRED', 'REJECTED'];

// ============================================================================
// Order Status Tracker Implementation
// ============================================================================

export class OrderStatusTracker implements IOrderStatusTracker {
  private config: Required<OrderStatusTrackerConfig>;
  private subscriptions: Map<string, OrderTrackingSubscription> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private orderCache: Map<string, UnifiedOrder> = new Map();
  private adapterCache: Map<TradingPlatform, ITradingAdapter> = new Map();
  private notifier?: ITradeNotifier;
  private logger?: IExecutionLogger;

  constructor(
    config: OrderStatusTrackerConfig = {},
    services?: {
      notifier?: ITradeNotifier;
      logger?: IExecutionLogger;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.notifier = services?.notifier;
    this.logger = services?.logger;
  }

  /**
   * Start tracking an order
   */
  trackOrder(
    platform: TradingPlatform,
    orderId: string,
    options?: OrderTrackingOptions
  ): OrderTrackingSubscription {
    // Check subscription limit
    if (this.subscriptions.size >= this.config.maxSubscriptions) {
      throw new Error(`Maximum subscription limit (${this.config.maxSubscriptions}) reached`);
    }

    const subscriptionId = randomUUID();
    const pollingInterval = options?.pollingInterval ?? this.config.defaultPollingInterval;
    const timeout = options?.timeout ?? this.config.defaultTimeout;
    const stopOnTerminal = options?.stopOnTerminal ?? true;

    // Create subscription
    const subscription: OrderTrackingSubscription = {
      id: subscriptionId,
      orderId,
      platform,
      onStatusUpdate: () => {}, // Will be set by caller
      pollingInterval,
      isActive: true,
      createdAt: new Date(),
    };

    // Store subscription
    this.subscriptions.set(subscriptionId, subscription);

    // Start polling
    const intervalId = setInterval(async () => {
      await this.pollOrderStatus(subscriptionId);
    }, pollingInterval);

    this.pollingIntervals.set(subscriptionId, intervalId);

    // Set timeout
    setTimeout(() => {
      this.stopTracking(subscriptionId);
    }, timeout);

    // Return subscription with methods to set callbacks
    return {
      ...subscription,
      onStatusUpdate: (callback: (update: OrderStatusUpdate) => void) => {
        const sub = this.subscriptions.get(subscriptionId);
        if (sub) {
          sub.onStatusUpdate = callback;
        }
      },
      onError: (callback: (error: Error) => void) => {
        const sub = this.subscriptions.get(subscriptionId);
        if (sub) {
          sub.onError = callback;
        }
      },
    } as OrderTrackingSubscription;
  }

  /**
   * Stop tracking an order
   */
  stopTracking(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    // Stop polling
    const intervalId = this.pollingIntervals.get(subscriptionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(subscriptionId);
    }

    // Mark as inactive and remove
    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);

    // Clean up order cache
    const cacheKey = `${subscription.platform}:${subscription.orderId}`;
    this.orderCache.delete(cacheKey);
  }

  /**
   * Get current order status
   */
  async getOrderStatus(
    platform: TradingPlatform,
    orderId: string
  ): Promise<UnifiedOrder | null> {
    const adapter = await this.getAdapter(platform);
    if (!adapter) {
      return null;
    }

    try {
      return await adapter.getOrder(orderId);
    } catch {
      return null;
    }
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): OrderTrackingSubscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.isActive);
  }

  /**
   * Set the notifier service
   */
  setNotifier(notifier: ITradeNotifier): void {
    this.notifier = notifier;
  }

  /**
   * Set the logger service
   */
  setLogger(logger: IExecutionLogger): void {
    this.logger = logger;
  }

  /**
   * Stop all tracking and clean up
   */
  shutdown(): void {
    for (const subscriptionId of this.subscriptions.keys()) {
      this.stopTracking(subscriptionId);
    }
    this.adapterCache.clear();
    this.orderCache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async pollOrderStatus(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.isActive) {
      return;
    }

    try {
      const adapter = await this.getAdapter(subscription.platform);
      if (!adapter) {
        subscription.onError?.(new Error(`Adapter not available for ${subscription.platform}`));
        return;
      }

      const order = await adapter.getOrder(subscription.orderId);
      if (!order) {
        subscription.onError?.(new Error(`Order not found: ${subscription.orderId}`));
        return;
      }

      // Check for status change
      const cacheKey = `${subscription.platform}:${subscription.orderId}`;
      const previousOrder = this.orderCache.get(cacheKey);

      if (!previousOrder || previousOrder.status !== order.status) {
        const update: OrderStatusUpdate = {
          orderId: subscription.orderId,
          platform: subscription.platform,
          previousStatus: previousOrder?.status ?? 'PENDING',
          newStatus: order.status,
          order,
          timestamp: new Date(),
        };

        // Fetch trades if filled
        if (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') {
          try {
            const trades = await adapter.getTrades({ orderId: subscription.orderId });
            update.trades = trades;
          } catch {
            // Trades fetch failed, continue without them
          }
        }

        // Call the callback
        subscription.onStatusUpdate(update);

        // Log the status change
        await this.logStatusChange(subscription, update);

        // Send notification if applicable
        await this.sendNotification(subscription, update);

        // Stop tracking if terminal status
        if (TERMINAL_STATUSES.includes(order.status)) {
          this.stopTracking(subscriptionId);
        }
      }

      // Update cache
      this.orderCache.set(cacheKey, order);
    } catch (error) {
      subscription.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async getAdapter(platform: TradingPlatform): Promise<ITradingAdapter | null> {
    const cached = this.adapterCache.get(platform);
    if (cached) {
      return cached;
    }

    const factory = tradingAdapterRegistry.get(platform);
    if (!factory) {
      return null;
    }

    const adapter = factory({});
    this.adapterCache.set(platform, adapter);
    return adapter;
  }

  private async logStatusChange(
    subscription: OrderTrackingSubscription,
    update: OrderStatusUpdate
  ): Promise<void> {
    if (!this.logger) {
      return;
    }

    try {
      await this.logger.log({
        executionId: subscription.id,
        eventType: 'ORDER_STATUS_CHANGED',
        platform: subscription.platform,
        userAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        orderId: subscription.orderId,
        marketId: update.order.marketId,
        data: {
          previousStatus: update.previousStatus,
          newStatus: update.newStatus,
          filledSize: update.order.filledSize,
          remainingSize: update.order.remainingSize,
        },
      });
    } catch {
      // Silently fail logging
    }
  }

  private async sendNotification(
    subscription: OrderTrackingSubscription,
    update: OrderStatusUpdate
  ): Promise<void> {
    if (!this.notifier) {
      return;
    }

    // Determine notification type
    let notificationType: 'ORDER_FILLED' | 'ORDER_PARTIALLY_FILLED' | 'ORDER_CANCELLED' | 'ORDER_REJECTED' | 'ORDER_EXPIRED' | null = null;

    switch (update.newStatus) {
      case 'FILLED':
        notificationType = 'ORDER_FILLED';
        break;
      case 'PARTIALLY_FILLED':
        notificationType = 'ORDER_PARTIALLY_FILLED';
        break;
      case 'CANCELLED':
        notificationType = 'ORDER_CANCELLED';
        break;
      case 'REJECTED':
        notificationType = 'ORDER_REJECTED';
        break;
      case 'EXPIRED':
        notificationType = 'ORDER_EXPIRED';
        break;
    }

    if (!notificationType) {
      return;
    }

    try {
      const message = this.createNotificationMessage(update);

      await this.notifier.notify({
        type: notificationType,
        userAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        platform: subscription.platform,
        order: update.order,
        trades: update.trades,
        message,
        deliveryMethod: 'IN_APP',
      });
    } catch {
      // Silently fail notifications
    }
  }

  private createNotificationMessage(update: OrderStatusUpdate): string {
    const { order, newStatus } = update;
    const side = order.side === 'BUY' ? 'bought' : 'sold';
    const outcome = typeof order.outcome === 'number' ? `Outcome ${order.outcome}` : order.outcome;

    switch (newStatus) {
      case 'FILLED':
        return `Order filled: ${side} ${order.filledSize} ${outcome} @ ${(order.averagePrice ?? order.price * 100).toFixed(1)}¢`;
      case 'PARTIALLY_FILLED':
        return `Order partially filled: ${order.filledSize}/${order.size} ${outcome}`;
      case 'CANCELLED':
        return `Order cancelled: ${order.side} ${order.size} ${outcome}`;
      case 'REJECTED':
        return `Order rejected: ${order.side} ${order.size} ${outcome}`;
      case 'EXPIRED':
        return `Order expired: ${order.side} ${order.size} ${outcome}`;
      default:
        return `Order status changed to ${newStatus}`;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrderStatusTracker(
  config?: OrderStatusTrackerConfig,
  services?: {
    notifier?: ITradeNotifier;
    logger?: IExecutionLogger;
  }
): OrderStatusTracker {
  return new OrderStatusTracker(config, services);
}
