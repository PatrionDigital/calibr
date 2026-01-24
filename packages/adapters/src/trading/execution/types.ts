/**
 * Execution Service Types
 * Types for order execution, routing, tracking, and notifications
 */

import type {
  TradingPlatform,
  UnifiedOrder,
  UnifiedOrderRequest,
  UnifiedTrade,
  OrderStatus,
} from '../types';

// ============================================================================
// Execution Request Types
// ============================================================================

/**
 * Extended order request with execution options
 */
export interface ExecutionRequest extends UnifiedOrderRequest {
  /** Target platform for execution */
  platform: TradingPlatform;
  /** User's wallet address */
  userAddress: `0x${string}`;
  /** Optional user ID for tracking */
  userId?: string;
  /** Enable order status polling after submission */
  trackStatus?: boolean;
  /** Notify on fill/cancel */
  notifyOnComplete?: boolean;
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Retry on transient failures */
  retryOnFailure?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  /** The order if successful */
  order?: UnifiedOrder;
  /** Error message if failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: ExecutionErrorCode;
  /** Execution ID for tracking */
  executionId: string;
  /** Platform the order was routed to */
  platform: TradingPlatform;
  /** Execution timestamp */
  timestamp: Date;
  /** Retry count if retried */
  retryCount?: number;
}

/**
 * Execution error codes
 */
export type ExecutionErrorCode =
  | 'INVALID_REQUEST'
  | 'PLATFORM_UNAVAILABLE'
  | 'AUTHENTICATION_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'MARKET_NOT_FOUND'
  | 'PRICE_MOVED'
  | 'ORDER_REJECTED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

// ============================================================================
// Order Status Tracking Types
// ============================================================================

/**
 * Order status update event
 */
export interface OrderStatusUpdate {
  /** Order ID */
  orderId: string;
  /** Platform */
  platform: TradingPlatform;
  /** Previous status */
  previousStatus: OrderStatus;
  /** New status */
  newStatus: OrderStatus;
  /** Updated order */
  order: UnifiedOrder;
  /** Update timestamp */
  timestamp: Date;
  /** Associated trades if any */
  trades?: UnifiedTrade[];
}

/**
 * Order tracking subscription
 */
export interface OrderTrackingSubscription {
  /** Subscription ID */
  id: string;
  /** Order ID being tracked */
  orderId: string;
  /** Platform */
  platform: TradingPlatform;
  /** Callback for status updates */
  onStatusUpdate: (update: OrderStatusUpdate) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Polling interval in ms */
  pollingInterval: number;
  /** Whether subscription is active */
  isActive: boolean;
  /** When subscription was created */
  createdAt: Date;
}

/**
 * Order tracking options
 */
export interface OrderTrackingOptions {
  /** Polling interval in ms (default: 2000) */
  pollingInterval?: number;
  /** Stop tracking after this many ms (default: 3600000 = 1 hour) */
  timeout?: number;
  /** Stop tracking when order reaches terminal state */
  stopOnTerminal?: boolean;
}

// ============================================================================
// Execution Logging Types
// ============================================================================

/**
 * Execution log entry
 */
export interface ExecutionLogEntry {
  /** Log entry ID */
  id: string;
  /** Execution ID */
  executionId: string;
  /** Event type */
  eventType: ExecutionEventType;
  /** Platform */
  platform: TradingPlatform;
  /** User address */
  userAddress: `0x${string}`;
  /** User ID if available */
  userId?: string;
  /** Order ID if available */
  orderId?: string;
  /** Market ID */
  marketId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: Record<string, unknown>;
  /** Error if any */
  error?: string;
  /** Duration in ms for timed events */
  durationMs?: number;
}

/**
 * Execution event types
 */
export type ExecutionEventType =
  | 'ORDER_SUBMITTED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_REJECTED'
  | 'ORDER_FILLED'
  | 'ORDER_PARTIALLY_FILLED'
  | 'ORDER_CANCELLED'
  | 'ORDER_EXPIRED'
  | 'ORDER_STATUS_CHANGED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'RETRY_ATTEMPTED'
  | 'NOTIFICATION_SENT'
  | 'NOTIFICATION_FAILED';

/**
 * Execution log query options
 */
export interface ExecutionLogQuery {
  /** Filter by user address */
  userAddress?: `0x${string}`;
  /** Filter by user ID */
  userId?: string;
  /** Filter by platform */
  platform?: TradingPlatform;
  /** Filter by event type */
  eventType?: ExecutionEventType;
  /** Filter by order ID */
  orderId?: string;
  /** Filter by execution ID */
  executionId?: string;
  /** Start date */
  startDate?: Date;
  /** End date */
  endDate?: Date;
  /** Limit */
  limit?: number;
  /** Offset */
  offset?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Trade notification
 */
export interface TradeNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** User address */
  userAddress: `0x${string}`;
  /** User ID if available */
  userId?: string;
  /** Platform */
  platform: TradingPlatform;
  /** Order */
  order: UnifiedOrder;
  /** Associated trades */
  trades?: UnifiedTrade[];
  /** Notification timestamp */
  timestamp: Date;
  /** Human-readable message */
  message: string;
  /** Delivery status */
  deliveryStatus: NotificationDeliveryStatus;
  /** Delivery method */
  deliveryMethod: NotificationDeliveryMethod;
  /** Webhook URL if applicable */
  webhookUrl?: string;
  /** Delivery error if failed */
  deliveryError?: string;
}

/**
 * Notification types
 */
export type NotificationType =
  | 'ORDER_FILLED'
  | 'ORDER_PARTIALLY_FILLED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REJECTED'
  | 'ORDER_EXPIRED'
  | 'POSITION_CLOSED'
  | 'PNL_ALERT';

/**
 * Notification delivery status
 */
export type NotificationDeliveryStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'FAILED'
  | 'SKIPPED';

/**
 * Notification delivery method
 */
export type NotificationDeliveryMethod =
  | 'WEBHOOK'
  | 'EMAIL'
  | 'IN_APP'
  | 'NONE';

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  /** Enable fill notifications */
  notifyOnFill: boolean;
  /** Enable partial fill notifications */
  notifyOnPartialFill: boolean;
  /** Enable cancellation notifications */
  notifyOnCancel: boolean;
  /** Enable rejection notifications */
  notifyOnReject: boolean;
  /** Webhook URL */
  webhookUrl?: string;
  /** Email address */
  email?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Execution router interface
 */
export interface IExecutionRouter {
  /** Execute an order */
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  /** Cancel an order */
  cancel(platform: TradingPlatform, orderId: string): Promise<boolean>;
  /** Get execution status */
  getExecutionStatus(executionId: string): Promise<ExecutionResult | null>;
  /** Check if platform is available */
  isPlatformAvailable(platform: TradingPlatform): Promise<boolean>;
}

/**
 * Order status tracker interface
 */
export interface IOrderStatusTracker {
  /** Start tracking an order */
  trackOrder(
    platform: TradingPlatform,
    orderId: string,
    options?: OrderTrackingOptions
  ): OrderTrackingSubscription;
  /** Stop tracking an order */
  stopTracking(subscriptionId: string): void;
  /** Get current order status */
  getOrderStatus(platform: TradingPlatform, orderId: string): Promise<UnifiedOrder | null>;
  /** Get all active subscriptions */
  getActiveSubscriptions(): OrderTrackingSubscription[];
}

/**
 * Execution logger interface
 */
export interface IExecutionLogger {
  /** Log an execution event */
  log(entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>): Promise<ExecutionLogEntry>;
  /** Query execution logs */
  query(options: ExecutionLogQuery): Promise<ExecutionLogEntry[]>;
  /** Get logs for an execution */
  getExecutionLogs(executionId: string): Promise<ExecutionLogEntry[]>;
}

/**
 * Trade notifier interface
 */
export interface ITradeNotifier {
  /** Send a notification */
  notify(
    notification: Omit<TradeNotification, 'id' | 'timestamp' | 'deliveryStatus'>
  ): Promise<TradeNotification>;
  /** Get notification preferences for a user */
  getPreferences(userAddress: `0x${string}`): Promise<NotificationPreferences>;
  /** Set notification preferences for a user */
  setPreferences(
    userAddress: `0x${string}`,
    preferences: Partial<NotificationPreferences>
  ): Promise<void>;
}
