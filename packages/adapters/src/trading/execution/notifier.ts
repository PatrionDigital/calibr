/**
 * Trade Notifier Service
 * Sends notifications for trade events via webhooks, email, or in-app
 */

import { randomUUID } from 'crypto';
import type {
  ITradeNotifier,
  TradeNotification,
  NotificationPreferences,
  NotificationType,
  NotificationDeliveryMethod,
  NotificationDeliveryStatus,
  IExecutionLogger,
} from './types';
import type { TradingPlatform, UnifiedOrder, UnifiedTrade } from '../types';

// ============================================================================
// Notifier Configuration
// ============================================================================

export interface TradeNotifierConfig {
  /** Enable webhook delivery */
  enableWebhooks?: boolean;
  /** Webhook timeout in ms */
  webhookTimeoutMs?: number;
  /** Enable email delivery (requires email adapter) */
  enableEmail?: boolean;
  /** Email adapter */
  emailAdapter?: IEmailAdapter;
  /** Default notification preferences */
  defaultPreferences?: Partial<NotificationPreferences>;
  /** Max retry attempts for failed deliveries */
  maxRetries?: number;
}

/**
 * Email adapter interface
 */
export interface IEmailAdapter {
  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
}

const DEFAULT_CONFIG: Required<Omit<TradeNotifierConfig, 'emailAdapter'>> = {
  enableWebhooks: true,
  webhookTimeoutMs: 10000,
  enableEmail: false,
  defaultPreferences: {
    notifyOnFill: true,
    notifyOnPartialFill: false,
    notifyOnCancel: false,
    notifyOnReject: true,
  },
  maxRetries: 3,
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notifyOnFill: true,
  notifyOnPartialFill: false,
  notifyOnCancel: false,
  notifyOnReject: true,
};

// ============================================================================
// Trade Notifier Implementation
// ============================================================================

export class TradeNotifier implements ITradeNotifier {
  private config: Required<Omit<TradeNotifierConfig, 'emailAdapter'>>;
  private emailAdapter?: IEmailAdapter;
  private userPreferences: Map<string, NotificationPreferences> = new Map();
  private notificationHistory: TradeNotification[] = [];
  private logger?: IExecutionLogger;

  constructor(config: TradeNotifierConfig = {}, logger?: IExecutionLogger) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.emailAdapter = config.emailAdapter;
    this.logger = logger;
  }

  /**
   * Send a notification
   */
  async notify(
    notification: Omit<TradeNotification, 'id' | 'timestamp' | 'deliveryStatus'>
  ): Promise<TradeNotification> {
    const fullNotification: TradeNotification = {
      ...notification,
      id: randomUUID(),
      timestamp: new Date(),
      deliveryStatus: 'PENDING',
    };

    // Check if notification should be sent based on preferences
    const preferences = await this.getPreferences(notification.userAddress);
    if (!this.shouldNotify(notification.type, preferences)) {
      fullNotification.deliveryStatus = 'SKIPPED';
      this.notificationHistory.push(fullNotification);
      return fullNotification;
    }

    // Determine delivery method
    const deliveryMethod = this.determineDeliveryMethod(notification, preferences);
    fullNotification.deliveryMethod = deliveryMethod;

    // Deliver notification
    try {
      switch (deliveryMethod) {
        case 'WEBHOOK':
          await this.deliverWebhook(fullNotification, preferences);
          fullNotification.deliveryStatus = 'DELIVERED';
          break;
        case 'EMAIL':
          await this.deliverEmail(fullNotification, preferences);
          fullNotification.deliveryStatus = 'DELIVERED';
          break;
        case 'IN_APP':
          // In-app notifications are always "delivered" (stored for polling)
          fullNotification.deliveryStatus = 'DELIVERED';
          break;
        case 'NONE':
          fullNotification.deliveryStatus = 'SKIPPED';
          break;
      }

      // Log success
      await this.logNotification(fullNotification, 'NOTIFICATION_SENT');
    } catch (error) {
      fullNotification.deliveryStatus = 'FAILED';
      fullNotification.deliveryError = error instanceof Error ? error.message : String(error);

      // Log failure
      await this.logNotification(fullNotification, 'NOTIFICATION_FAILED');
    }

    // Store in history
    this.notificationHistory.push(fullNotification);

    // Limit history size
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory.shift();
    }

    return fullNotification;
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userAddress: `0x${string}`): Promise<NotificationPreferences> {
    const cached = this.userPreferences.get(userAddress.toLowerCase());
    if (cached) {
      return cached;
    }

    // Return default preferences
    return {
      ...DEFAULT_PREFERENCES,
      ...this.config.defaultPreferences,
    };
  }

  /**
   * Set notification preferences for a user
   */
  async setPreferences(
    userAddress: `0x${string}`,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const existing = await this.getPreferences(userAddress);
    const updated = { ...existing, ...preferences };
    this.userPreferences.set(userAddress.toLowerCase(), updated);
  }

  /**
   * Get notification history for a user
   */
  getNotificationHistory(
    userAddress: `0x${string}`,
    options?: { limit?: number; type?: NotificationType }
  ): TradeNotification[] {
    let filtered = this.notificationHistory.filter(
      (n) => n.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    if (options?.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }

    const limit = options?.limit ?? 50;
    return filtered.slice(-limit);
  }

  /**
   * Set the logger service
   */
  setLogger(logger: IExecutionLogger): void {
    this.logger = logger;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private shouldNotify(type: NotificationType, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'ORDER_FILLED':
        return preferences.notifyOnFill;
      case 'ORDER_PARTIALLY_FILLED':
        return preferences.notifyOnPartialFill;
      case 'ORDER_CANCELLED':
        return preferences.notifyOnCancel;
      case 'ORDER_REJECTED':
        return preferences.notifyOnReject;
      default:
        return true;
    }
  }

  private determineDeliveryMethod(
    notification: Omit<TradeNotification, 'id' | 'timestamp' | 'deliveryStatus'>,
    preferences: NotificationPreferences
  ): NotificationDeliveryMethod {
    // Priority: Webhook > Email > In-App

    if (notification.webhookUrl && this.config.enableWebhooks) {
      return 'WEBHOOK';
    }

    if (preferences.webhookUrl && this.config.enableWebhooks) {
      return 'WEBHOOK';
    }

    if (preferences.email && this.config.enableEmail && this.emailAdapter) {
      return 'EMAIL';
    }

    return 'IN_APP';
  }

  private async deliverWebhook(
    notification: TradeNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const webhookUrl = notification.webhookUrl ?? preferences.webhookUrl;
    if (!webhookUrl) {
      throw new Error('No webhook URL provided');
    }

    const payload = this.createWebhookPayload(notification);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.webhookTimeoutMs);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Calibr-Event': notification.type,
          'X-Calibr-Notification-Id': notification.id,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async deliverEmail(
    notification: TradeNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    if (!this.emailAdapter || !preferences.email) {
      throw new Error('Email delivery not configured');
    }

    const subject = this.createEmailSubject(notification);
    const body = this.createEmailBody(notification);

    const success = await this.emailAdapter.sendEmail(preferences.email, subject, body);
    if (!success) {
      throw new Error('Email delivery failed');
    }
  }

  private createWebhookPayload(notification: TradeNotification): Record<string, unknown> {
    return {
      id: notification.id,
      type: notification.type,
      timestamp: notification.timestamp.toISOString(),
      platform: notification.platform,
      userAddress: notification.userAddress,
      message: notification.message,
      order: this.serializeOrder(notification.order),
      trades: notification.trades?.map((t) => this.serializeTrade(t)),
    };
  }

  private serializeOrder(order: UnifiedOrder): Record<string, unknown> {
    return {
      id: order.id,
      platform: order.platform,
      marketId: order.marketId,
      outcome: order.outcome,
      side: order.side,
      orderType: order.orderType,
      status: order.status,
      size: order.size,
      filledSize: order.filledSize,
      remainingSize: order.remainingSize,
      price: order.price,
      averagePrice: order.averagePrice,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private serializeTrade(trade: UnifiedTrade): Record<string, unknown> {
    return {
      id: trade.id,
      orderId: trade.orderId,
      platform: trade.platform,
      marketId: trade.marketId,
      outcome: trade.outcome,
      side: trade.side,
      price: trade.price,
      size: trade.size,
      fee: trade.fee,
      timestamp: trade.timestamp.toISOString(),
      transactionHash: trade.transactionHash,
    };
  }

  private createEmailSubject(notification: TradeNotification): string {
    switch (notification.type) {
      case 'ORDER_FILLED':
        return `[Calibr] Order Filled - ${notification.platform}`;
      case 'ORDER_PARTIALLY_FILLED':
        return `[Calibr] Order Partially Filled - ${notification.platform}`;
      case 'ORDER_CANCELLED':
        return `[Calibr] Order Cancelled - ${notification.platform}`;
      case 'ORDER_REJECTED':
        return `[Calibr] Order Rejected - ${notification.platform}`;
      case 'ORDER_EXPIRED':
        return `[Calibr] Order Expired - ${notification.platform}`;
      default:
        return `[Calibr] Trade Notification - ${notification.platform}`;
    }
  }

  private createEmailBody(notification: TradeNotification): string {
    const order = notification.order;
    const lines = [
      notification.message,
      '',
      'Order Details:',
      `- Market: ${order.marketId}`,
      `- Side: ${order.side}`,
      `- Outcome: ${order.outcome}`,
      `- Size: ${order.filledSize}/${order.size}`,
      `- Price: ${(order.averagePrice ?? order.price * 100).toFixed(2)}¢`,
      '',
      `Platform: ${notification.platform}`,
      `Time: ${notification.timestamp.toISOString()}`,
    ];

    if (notification.trades && notification.trades.length > 0) {
      lines.push('', 'Fills:');
      for (const trade of notification.trades) {
        lines.push(`- ${trade.size} @ ${(trade.price * 100).toFixed(2)}¢ (fee: ${trade.fee})`);
      }
    }

    return lines.join('\n');
  }

  private async logNotification(
    notification: TradeNotification,
    eventType: 'NOTIFICATION_SENT' | 'NOTIFICATION_FAILED'
  ): Promise<void> {
    if (!this.logger) {
      return;
    }

    try {
      await this.logger.log({
        executionId: notification.id,
        eventType,
        platform: notification.platform,
        userAddress: notification.userAddress,
        orderId: notification.order.id,
        marketId: notification.order.marketId,
        data: {
          notificationType: notification.type,
          deliveryMethod: notification.deliveryMethod,
          deliveryStatus: notification.deliveryStatus,
        },
        error: notification.deliveryError,
      });
    } catch {
      // Silently fail logging
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTradeNotifier(
  config?: TradeNotifierConfig,
  logger?: IExecutionLogger
): TradeNotifier {
  return new TradeNotifier(config, logger);
}
