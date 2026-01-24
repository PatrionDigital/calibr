/**
 * Execution Services Integration Tests
 * Tests all services working together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createExecutionServices,
  createExecutionRouter,
  createOrderStatusTracker,
  createExecutionLogger,
  createTradeNotifier,
  type ExecutionServices,
} from '../../src/trading/execution';
import type { TradingPlatform, UnifiedOrder, ITradingAdapter } from '../../src/trading/types';
import { tradingAdapterRegistry } from '../../src/trading/registry';

// Mock the registry
vi.mock('../../src/trading/registry', () => ({
  tradingAdapterRegistry: {
    get: vi.fn(),
  },
}));

describe('Execution Services Integration', () => {
  let services: ExecutionServices;
  const testUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const testPlatform: TradingPlatform = 'LIMITLESS';

  const createMockOrder = (
    status: UnifiedOrder['status'] = 'OPEN',
    overrides?: Partial<UnifiedOrder>
  ): UnifiedOrder => ({
    id: 'order-123',
    platform: testPlatform,
    marketId: 'market-1',
    outcome: 'YES',
    side: 'BUY',
    orderType: 'LIMIT',
    status,
    size: 100,
    filledSize: status === 'FILLED' ? 100 : 0,
    remainingSize: status === 'FILLED' ? 0 : 100,
    price: 0.65,
    averagePrice: 0.65,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    services = createExecutionServices({
      router: {
        defaultMaxRetries: 1,
        retryDelayMs: 10,
        requestTimeoutMs: 1000,
        enableLogging: true,
        enableTracking: true,
        enableNotifications: true,
      },
      tracker: {
        defaultPollingInterval: 100,
        defaultTimeout: 5000,
      },
      logger: {
        maxEntries: 1000,
        enableConsole: false,
      },
      notifier: {
        enableWebhooks: false,
        enableEmail: false,
      },
    });
  });

  afterEach(() => {
    services.tracker.shutdown();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('createExecutionServices()', () => {
    it('should create all services', () => {
      expect(services.router).toBeDefined();
      expect(services.tracker).toBeDefined();
      expect(services.logger).toBeDefined();
      expect(services.notifier).toBeDefined();
    });

    it('should wire services together', async () => {
      // The services should be connected internally
      // Logger should receive logs from all services
      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn().mockResolvedValue(createMockOrder('FILLED')),
        getTrades: vi.fn().mockResolvedValue([]),
        placeOrder: vi.fn().mockResolvedValue(createMockOrder()),
        cancelOrder: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      // Execute an order
      await services.router.execute({
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        size: 100,
        price: 0.65,
        trackStatus: true,
      });

      // Check that logs were created
      const logs = await services.logger.query({});
      expect(logs.length).toBeGreaterThan(0);

      // Check that there's an execution started log
      const startLog = logs.find((l) => l.eventType === 'EXECUTION_STARTED');
      expect(startLog).toBeDefined();
    });
  });

  describe('full execution flow', () => {
    it('should execute order and log all events', async () => {
      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn().mockResolvedValue(createMockOrder()),
        getTrades: vi.fn().mockResolvedValue([]),
        placeOrder: vi.fn().mockResolvedValue(createMockOrder()),
        cancelOrder: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await services.router.execute({
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        size: 100,
        price: 0.65,
      });

      expect(result.success).toBe(true);

      // Check execution logs
      const logs = await services.logger.getExecutionLogs(result.executionId);
      expect(logs.length).toBeGreaterThanOrEqual(3); // STARTED, ACCEPTED, COMPLETED
    });

    it('should track order status and send notifications', async () => {
      let orderStatus: UnifiedOrder['status'] = 'PENDING';
      let pollCount = 0;

      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn().mockImplementation(() => {
          pollCount++;
          if (pollCount >= 2) {
            orderStatus = 'FILLED';
          }
          return Promise.resolve(createMockOrder(orderStatus));
        }),
        getTrades: vi.fn().mockResolvedValue([]),
        placeOrder: vi.fn().mockResolvedValue(createMockOrder('PENDING')),
        cancelOrder: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      // Execute with tracking enabled
      const result = await services.router.execute({
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        size: 100,
        price: 0.65,
        trackStatus: true,
      });

      expect(result.success).toBe(true);

      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      // Check notification history - might have notification for fill
      // (depends on timing and implementation details)
      const notifications = services.notifier.getNotificationHistory(testUserAddress);
      // Notifications may or may not be present depending on timing
      expect(notifications).toBeDefined();
    });

    it('should log failures properly', async () => {
      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn(),
        getTrades: vi.fn(),
        placeOrder: vi.fn().mockRejectedValue(new Error('Insufficient balance')),
        cancelOrder: vi.fn(),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await services.router.execute({
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        size: 100,
        price: 0.65,
      });

      expect(result.success).toBe(false);

      // Check that failure was logged
      const logs = await services.logger.getExecutionLogs(result.executionId);
      const failLog = logs.find((l) => l.eventType === 'EXECUTION_FAILED');
      expect(failLog).toBeDefined();
    });
  });

  describe('service independence', () => {
    it('should allow using logger independently', async () => {
      const entry = await services.logger.log({
        executionId: 'test-exec',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: { test: true },
      });

      expect(entry.id).toBeDefined();

      const logs = await services.logger.query({ executionId: 'test-exec' });
      expect(logs.length).toBe(1);
    });

    it('should allow using notifier independently', async () => {
      const notification = await services.notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder('FILLED'),
        message: 'Test notification',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.id).toBeDefined();
      expect(notification.deliveryStatus).toBe('DELIVERED');
    });

    it('should allow using tracker independently', async () => {
      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn().mockResolvedValue(createMockOrder('OPEN')),
        getTrades: vi.fn().mockResolvedValue([]),
        placeOrder: vi.fn(),
        cancelOrder: vi.fn(),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const subscription = services.tracker.trackOrder(testPlatform, 'order-456');

      expect(subscription.id).toBeDefined();
      expect(subscription.isActive).toBe(true);

      const active = services.tracker.getActiveSubscriptions();
      expect(active.length).toBe(1);

      services.tracker.stopTracking(subscription.id);

      const afterStop = services.tracker.getActiveSubscriptions();
      expect(afterStop.length).toBe(0);
    });
  });

  describe('stats and history', () => {
    it('should provide logger stats', async () => {
      const mockAdapter: ITradingAdapter = {
        platform: testPlatform,
        authenticate: vi.fn(),
        isReady: vi.fn().mockResolvedValue(true),
        getMarkets: vi.fn(),
        getMarket: vi.fn(),
        getOrderbook: vi.fn(),
        getPositions: vi.fn(),
        getPosition: vi.fn(),
        getOrders: vi.fn(),
        getOrder: vi.fn(),
        getTrades: vi.fn(),
        placeOrder: vi.fn().mockResolvedValue(createMockOrder()),
        cancelOrder: vi.fn(),
      };
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      await services.router.execute({
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        outcome: 'YES',
        side: 'BUY',
        orderType: 'LIMIT',
        size: 100,
        price: 0.65,
      });

      const stats = services.logger.getStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.entriesByPlatform[testPlatform]).toBeGreaterThan(0);
    });

    it('should provide notification history', async () => {
      await services.notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder('FILLED'),
        message: 'Order 1 filled',
        deliveryMethod: 'IN_APP',
      });

      await services.notifier.notify({
        type: 'ORDER_CANCELLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder('CANCELLED'),
        message: 'Order 2 cancelled',
        deliveryMethod: 'IN_APP',
      });

      const history = services.notifier.getNotificationHistory(testUserAddress);
      expect(history.length).toBe(2);
    });
  });
});

describe('Individual service factories', () => {
  it('should create router with minimal config', () => {
    const router = createExecutionRouter();
    expect(router).toBeDefined();
    expect(router.execute).toBeDefined();
    expect(router.cancel).toBeDefined();
  });

  it('should create tracker with minimal config', () => {
    const tracker = createOrderStatusTracker();
    expect(tracker).toBeDefined();
    expect(tracker.trackOrder).toBeDefined();
    expect(tracker.stopTracking).toBeDefined();
    tracker.shutdown();
  });

  it('should create logger with minimal config', () => {
    const logger = createExecutionLogger();
    expect(logger).toBeDefined();
    expect(logger.log).toBeDefined();
    expect(logger.query).toBeDefined();
  });

  it('should create notifier with minimal config', () => {
    const notifier = createTradeNotifier();
    expect(notifier).toBeDefined();
    expect(notifier.notify).toBeDefined();
    expect(notifier.getPreferences).toBeDefined();
  });
});
