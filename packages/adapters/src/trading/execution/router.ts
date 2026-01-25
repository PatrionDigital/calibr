/**
 * Execution Router Service
 * Routes orders to the correct platform adapter with validation and error handling
 */

import { randomUUID } from 'crypto';
import { tradingAdapterRegistry } from '../registry';
import type { ITradingAdapter, TradingPlatform, UnifiedOrder } from '../types';
import { UnifiedOrderRequestSchema } from '../types';
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionErrorCode,
  IExecutionRouter,
  IExecutionLogger,
  IOrderStatusTracker,
  ITradeNotifier,
} from './types';

// ============================================================================
// Execution Router Configuration
// ============================================================================

export interface ExecutionRouterConfig {
  /** Default retry count */
  defaultMaxRetries?: number;
  /** Retry delay in ms */
  retryDelayMs?: number;
  /** Request timeout in ms */
  requestTimeoutMs?: number;
  /** Enable execution logging */
  enableLogging?: boolean;
  /** Enable order tracking */
  enableTracking?: boolean;
  /** Enable notifications */
  enableNotifications?: boolean;
}

const DEFAULT_CONFIG: Required<ExecutionRouterConfig> = {
  defaultMaxRetries: 3,
  retryDelayMs: 1000,
  requestTimeoutMs: 30000,
  enableLogging: true,
  enableTracking: true,
  enableNotifications: true,
};

// ============================================================================
// Execution Router Implementation
// ============================================================================

export class ExecutionRouter implements IExecutionRouter {
  private config: Required<ExecutionRouterConfig>;
  private adapterCache: Map<string, ITradingAdapter> = new Map();
  private logger?: IExecutionLogger;
  private tracker?: IOrderStatusTracker;
  private notifier?: ITradeNotifier;

  constructor(
    config: ExecutionRouterConfig = {},
    services?: {
      logger?: IExecutionLogger;
      tracker?: IOrderStatusTracker;
      notifier?: ITradeNotifier;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = services?.logger;
    this.tracker = services?.tracker;
    this.notifier = services?.notifier;
  }

  /**
   * Execute an order request
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    // Log execution start
    await this.logEvent(executionId, 'EXECUTION_STARTED', request.platform, { ...request }, request.userAddress);

    try {
      // Validate request
      const validationResult = this.validateRequest(request);
      if (!validationResult.valid) {
        return this.createErrorResult(
          executionId,
          request.platform,
          'INVALID_REQUEST',
          validationResult.error!
        );
      }

      // Get adapter for platform
      const adapter = await this.getAdapter(request.platform, request.userAddress);
      if (!adapter) {
        return this.createErrorResult(
          executionId,
          request.platform,
          'PLATFORM_UNAVAILABLE',
          `No adapter available for platform: ${request.platform}`
        );
      }

      // Check if adapter is ready
      const isReady = await adapter.isReady();
      if (!isReady) {
        return this.createErrorResult(
          executionId,
          request.platform,
          'AUTHENTICATION_FAILED',
          'Trading adapter is not authenticated'
        );
      }

      // Execute with retry logic
      const maxRetries = request.maxRetries ?? this.config.defaultMaxRetries;
      let lastError: Error | null = null;
      let retryCount = 0;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Place the order
          const order = await this.executeWithTimeout(
            () => adapter.placeOrder(request),
            this.config.requestTimeoutMs
          );

          // Log success
          await this.logEvent(
            executionId,
            'ORDER_ACCEPTED',
            request.platform,
            { orderId: order.id, order },
            request.userAddress,
            Date.now() - startTime
          );

          // Start tracking if requested
          if (request.trackStatus && this.tracker && this.config.enableTracking) {
            this.tracker.trackOrder(request.platform, order.id, {
              stopOnTerminal: true,
            });
          }

          // Log execution complete
          await this.logEvent(
            executionId,
            'EXECUTION_COMPLETED',
            request.platform,
            { orderId: order.id },
            request.userAddress,
            Date.now() - startTime
          );

          return {
            success: true,
            order,
            executionId,
            platform: request.platform,
            timestamp: new Date(),
            retryCount: attempt, // Number of retry attempts before success
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          retryCount = attempt;

          // Check if error is retryable
          if (!this.isRetryableError(lastError) || !request.retryOnFailure) {
            break;
          }

          // Log retry attempt
          if (attempt < maxRetries) {
            await this.logEvent(
              executionId,
              'RETRY_ATTEMPTED',
              request.platform,
              { attempt: attempt + 1, error: lastError.message },
              request.userAddress
            );

            // Wait before retry
            await this.delay(this.config.retryDelayMs * (attempt + 1));
          }
        }
      }

      // All retries failed
      const errorCode = this.mapErrorToCode(lastError!);
      await this.logEvent(
        executionId,
        'EXECUTION_FAILED',
        request.platform,
        { error: lastError!.message, errorCode },
        request.userAddress,
        Date.now() - startTime
      );

      return this.createErrorResult(
        executionId,
        request.platform,
        errorCode,
        lastError!.message,
        retryCount
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logEvent(
        executionId,
        'EXECUTION_FAILED',
        request.platform,
        { error: errorMessage },
        request.userAddress,
        Date.now() - startTime
      );

      return this.createErrorResult(
        executionId,
        request.platform,
        'UNKNOWN_ERROR',
        errorMessage
      );
    }
  }

  /**
   * Cancel an order
   */
  async cancel(platform: TradingPlatform, orderId: string): Promise<boolean> {
    const adapter = this.adapterCache.get(platform);
    if (!adapter) {
      throw new Error(`No adapter cached for platform: ${platform}`);
    }

    return adapter.cancelOrder(orderId);
  }

  /**
   * Get execution status (from logs)
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionResult | null> {
    if (!this.logger) {
      return null;
    }

    const logs = await this.logger.getExecutionLogs(executionId);
    if (logs.length === 0) {
      return null;
    }

    // Find completion or failure event
    const completionEvent = logs.find(
      (l) => l.eventType === 'EXECUTION_COMPLETED' || l.eventType === 'EXECUTION_FAILED'
    );

    if (!completionEvent) {
      // Execution still in progress
      const startEvent = logs.find((l) => l.eventType === 'EXECUTION_STARTED');
      return {
        success: false,
        executionId,
        platform: startEvent?.platform ?? 'LIMITLESS',
        timestamp: startEvent?.timestamp ?? new Date(),
        error: 'Execution in progress',
      };
    }

    const isSuccess = completionEvent.eventType === 'EXECUTION_COMPLETED';
    return {
      success: isSuccess,
      executionId,
      platform: completionEvent.platform,
      timestamp: completionEvent.timestamp,
      order: isSuccess ? (completionEvent.data.order as UnifiedOrder) : undefined,
      error: !isSuccess ? (completionEvent.error ?? completionEvent.data.error as string) : undefined,
      errorCode: !isSuccess ? (completionEvent.data.errorCode as ExecutionErrorCode) : undefined,
    };
  }

  /**
   * Check if a platform is available for trading
   */
  async isPlatformAvailable(platform: TradingPlatform): Promise<boolean> {
    const factory = tradingAdapterRegistry.get(platform);
    return factory !== undefined;
  }

  /**
   * Set the logger service
   */
  setLogger(logger: IExecutionLogger): void {
    this.logger = logger;
  }

  /**
   * Set the tracker service
   */
  setTracker(tracker: IOrderStatusTracker): void {
    this.tracker = tracker;
  }

  /**
   * Set the notifier service
   */
  setNotifier(notifier: ITradeNotifier): void {
    this.notifier = notifier;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private validateRequest(request: ExecutionRequest): { valid: boolean; error?: string } {
    try {
      UnifiedOrderRequestSchema.parse(request);

      if (!request.userAddress) {
        return { valid: false, error: 'userAddress is required' };
      }

      if (!request.platform) {
        return { valid: false, error: 'platform is required' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid request',
      };
    }
  }

  private async getAdapter(
    platform: TradingPlatform,
    _userAddress: `0x${string}`
  ): Promise<ITradingAdapter | null> {
    // Check cache first
    const cacheKey = platform;
    const cached = this.adapterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new adapter
    const factory = tradingAdapterRegistry.get(platform);
    if (!factory) {
      return null;
    }

    const adapter = factory({});
    this.adapterCache.set(cacheKey, adapter);
    return adapter;
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('rate limit') ||
      message.includes('temporary') ||
      message.includes('retry')
    );
  }

  private mapErrorToCode(error: Error): ExecutionErrorCode {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('balance') || message.includes('insufficient')) return 'INSUFFICIENT_BALANCE';
    if (message.includes('auth') || message.includes('unauthorized')) return 'AUTHENTICATION_FAILED';
    if (message.includes('market') || message.includes('not found')) return 'MARKET_NOT_FOUND';
    if (message.includes('price') || message.includes('slippage')) return 'PRICE_MOVED';
    if (message.includes('reject')) return 'ORDER_REJECTED';

    return 'UNKNOWN_ERROR';
  }

  private createErrorResult(
    executionId: string,
    platform: TradingPlatform,
    errorCode: ExecutionErrorCode,
    error: string,
    retryCount?: number
  ): ExecutionResult {
    return {
      success: false,
      executionId,
      platform,
      timestamp: new Date(),
      error,
      errorCode,
      retryCount,
    };
  }

  private async logEvent(
    executionId: string,
    eventType: string,
    platform: TradingPlatform,
    data: Record<string, unknown>,
    userAddress: `0x${string}`,
    durationMs?: number
  ): Promise<void> {
    if (!this.logger || !this.config.enableLogging) {
      return;
    }

    try {
      await this.logger.log({
        executionId,
        eventType: eventType as import('./types').ExecutionEventType,
        platform,
        userAddress,
        marketId: (data.marketId as string) ?? '',
        data,
        durationMs,
      });
    } catch {
      // Silently fail logging - don't break execution
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createExecutionRouter(
  config?: ExecutionRouterConfig,
  services?: {
    logger?: IExecutionLogger;
    tracker?: IOrderStatusTracker;
    notifier?: ITradeNotifier;
  }
): ExecutionRouter {
  return new ExecutionRouter(config, services);
}
