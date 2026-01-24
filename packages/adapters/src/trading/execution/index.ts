/**
 * Execution Services Module
 * Order execution, routing, tracking, logging, and notifications
 */

// Types
export type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionErrorCode,
  OrderStatusUpdate,
  OrderTrackingSubscription,
  OrderTrackingOptions,
  ExecutionLogEntry,
  ExecutionEventType,
  ExecutionLogQuery,
  TradeNotification,
  NotificationType,
  NotificationDeliveryStatus,
  NotificationDeliveryMethod,
  NotificationPreferences,
  IExecutionRouter,
  IOrderStatusTracker,
  IExecutionLogger,
  ITradeNotifier,
} from './types';

// Execution Router
export {
  ExecutionRouter,
  createExecutionRouter,
  type ExecutionRouterConfig,
} from './router';

// Order Status Tracker
export {
  OrderStatusTracker,
  createOrderStatusTracker,
  type OrderStatusTrackerConfig,
} from './tracker';

// Execution Logger
export {
  ExecutionLogger,
  createExecutionLogger,
  createLogEntry,
  type ExecutionLoggerConfig,
  type ILogStorageAdapter,
} from './logger';

// Trade Notifier
export {
  TradeNotifier,
  createTradeNotifier,
  type TradeNotifierConfig,
  type IEmailAdapter,
} from './notifier';

// Order Builder
export {
  OrderBuilder,
  createOrderBuilder,
  orderBuilder,
  type OrderBuilderConfig,
  type PlatformOrderConfig,
  type OrderBuildInput,
  type OrderBuildResult,
  type IOrderBuilder,
} from './order-builder';

// ============================================================================
// Factory Functions for Composing Services
// ============================================================================

import { createExecutionRouter } from './router';
import { createOrderStatusTracker } from './tracker';
import { createExecutionLogger } from './logger';
import { createTradeNotifier } from './notifier';
import type { ExecutionRouterConfig } from './router';
import type { OrderStatusTrackerConfig } from './tracker';
import type { ExecutionLoggerConfig } from './logger';
import type { TradeNotifierConfig } from './notifier';

/**
 * Configuration for creating a full execution service stack
 */
export interface ExecutionServicesConfig {
  router?: ExecutionRouterConfig;
  tracker?: OrderStatusTrackerConfig;
  logger?: ExecutionLoggerConfig;
  notifier?: TradeNotifierConfig;
}

/**
 * Full execution service stack
 */
export interface ExecutionServices {
  router: ReturnType<typeof createExecutionRouter>;
  tracker: ReturnType<typeof createOrderStatusTracker>;
  logger: ReturnType<typeof createExecutionLogger>;
  notifier: ReturnType<typeof createTradeNotifier>;
}

/**
 * Create a fully wired execution service stack
 * All services are connected and ready to use
 */
export function createExecutionServices(config: ExecutionServicesConfig = {}): ExecutionServices {
  // Create services
  const logger = createExecutionLogger(config.logger);
  const notifier = createTradeNotifier(config.notifier, logger);
  const tracker = createOrderStatusTracker(config.tracker, { notifier, logger });
  const router = createExecutionRouter(config.router, { logger, tracker, notifier });

  return {
    router,
    tracker,
    logger,
    notifier,
  };
}
