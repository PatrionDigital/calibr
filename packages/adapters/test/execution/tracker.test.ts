/**
 * Order Status Tracker Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OrderStatusTracker,
  createOrderStatusTracker,
  type OrderStatusTrackerConfig,
} from '../../src/trading/execution/tracker';
import type {
  OrderStatusUpdate,
  ITradeNotifier,
  IExecutionLogger,
} from '../../src/trading/execution/types';
import type { TradingPlatform, UnifiedOrder, ITradingAdapter } from '../../src/trading/types';
import { tradingAdapterRegistry } from '../../src/trading/registry';

// Mock the registry
vi.mock('../../src/trading/registry', () => ({
  tradingAdapterRegistry: {
    get: vi.fn(),
  },
}));

describe('OrderStatusTracker', () => {
  let tracker: OrderStatusTracker;
  const testPlatform: TradingPlatform = 'LIMITLESS';

  const createMockOrder = (
    status: UnifiedOrder['status'],
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
    filledSize: status === 'FILLED' ? 100 : status === 'PARTIALLY_FILLED' ? 50 : 0,
    remainingSize: status === 'FILLED' ? 0 : status === 'PARTIALLY_FILLED' ? 50 : 100,
    price: 0.65,
    averagePrice: 0.65,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockAdapter = (getOrderFn: () => Promise<UnifiedOrder | null>): ITradingAdapter => ({
    platform: testPlatform,
    authenticate: vi.fn(),
    isReady: vi.fn().mockResolvedValue(true),
    getMarkets: vi.fn(),
    getMarket: vi.fn(),
    getOrderbook: vi.fn(),
    getPositions: vi.fn(),
    getPosition: vi.fn(),
    getOrders: vi.fn(),
    getOrder: getOrderFn,
    getTrades: vi.fn().mockResolvedValue([]),
    placeOrder: vi.fn(),
    cancelOrder: vi.fn(),
  });

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = createOrderStatusTracker({
      defaultPollingInterval: 100,
      defaultTimeout: 5000,
    });
  });

  afterEach(() => {
    tracker.shutdown();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('trackOrder()', () => {
    it('should create a subscription', () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const subscription = tracker.trackOrder(testPlatform, 'order-123');

      expect(subscription.id).toBeDefined();
      expect(subscription.orderId).toBe('order-123');
      expect(subscription.platform).toBe(testPlatform);
      expect(subscription.isActive).toBe(true);
    });

    it('should throw when max subscriptions reached', () => {
      const smallTracker = createOrderStatusTracker({
        maxSubscriptions: 2,
      });

      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      smallTracker.trackOrder(testPlatform, 'order-1');
      smallTracker.trackOrder(testPlatform, 'order-2');

      expect(() => smallTracker.trackOrder(testPlatform, 'order-3')).toThrow(
        'Maximum subscription limit'
      );

      smallTracker.shutdown();
    });

    it('should allow setting onStatusUpdate callback', () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const callback = vi.fn();
      const subscription = tracker.trackOrder(testPlatform, 'order-123');
      subscription.onStatusUpdate(callback);

      expect(subscription).toBeDefined();
    });

    it('should allow setting onError callback', () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const callback = vi.fn();
      const subscription = tracker.trackOrder(testPlatform, 'order-123');
      subscription.onError?.(callback as unknown as (error: Error) => void);

      expect(subscription).toBeDefined();
    });
  });

  describe('polling behavior', () => {
    it('should call onStatusUpdate when status changes', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(createMockOrder('PENDING'));
        }
        return Promise.resolve(createMockOrder('FILLED'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const statusUpdates: OrderStatusUpdate[] = [];
      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        pollingInterval: 100,
      });
      subscription.onStatusUpdate((update) => statusUpdates.push(update));

      // First poll - initial status
      await vi.advanceTimersByTimeAsync(100);

      // Second poll - status changed to FILLED
      await vi.advanceTimersByTimeAsync(100);

      expect(statusUpdates.length).toBeGreaterThanOrEqual(1);
      const filledUpdate = statusUpdates.find((u) => u.newStatus === 'FILLED');
      expect(filledUpdate).toBeDefined();
      expect(filledUpdate?.previousStatus).toBe('PENDING');
    });

    it('should stop tracking on terminal status', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('FILLED')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        pollingInterval: 100,
        stopOnTerminal: true,
      });

      // Let polling happen
      await vi.advanceTimersByTimeAsync(100);

      // Give time for the stop to process
      await vi.advanceTimersByTimeAsync(10);

      // Check active subscriptions
      const active = tracker.getActiveSubscriptions();
      expect(active.find((s) => s.id === subscription.id)).toBeUndefined();
    });

    it('should call onError when adapter not available', async () => {
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(undefined);

      const errors: Error[] = [];
      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        pollingInterval: 100,
      });
      subscription.onError?.((error) => errors.push(error));

      await vi.advanceTimersByTimeAsync(100);

      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('Adapter not available');
    });

    it('should call onError when order not found', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(null));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const errors: Error[] = [];
      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        pollingInterval: 100,
      });
      subscription.onError?.((error) => errors.push(error));

      await vi.advanceTimersByTimeAsync(100);

      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].message).toContain('Order not found');
    });
  });

  describe('stopTracking()', () => {
    it('should stop polling for subscription', async () => {
      let pollCount = 0;
      const mockAdapter = createMockAdapter(() => {
        pollCount++;
        return Promise.resolve(createMockOrder('PENDING'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        pollingInterval: 100,
      });

      // Let one poll happen
      await vi.advanceTimersByTimeAsync(100);
      const countAfterFirstPoll = pollCount;

      // Stop tracking
      tracker.stopTracking(subscription.id);

      // Advance time - should not poll anymore
      await vi.advanceTimersByTimeAsync(300);

      expect(pollCount).toBe(countAfterFirstPoll);
    });

    it('should handle non-existent subscription', () => {
      // Should not throw
      tracker.stopTracking('non-existent-id');
    });
  });

  describe('getOrderStatus()', () => {
    it('should return current order status', async () => {
      const mockOrder = createMockOrder('OPEN');
      const mockAdapter = createMockAdapter(() => Promise.resolve(mockOrder));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const order = await tracker.getOrderStatus(testPlatform, 'order-123');

      expect(order).toEqual(mockOrder);
    });

    it('should return null when adapter not available', async () => {
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(undefined);

      const order = await tracker.getOrderStatus(testPlatform, 'order-123');

      expect(order).toBeNull();
    });

    it('should return null when order not found', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(null));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const order = await tracker.getOrderStatus(testPlatform, 'order-123');

      expect(order).toBeNull();
    });
  });

  describe('getActiveSubscriptions()', () => {
    it('should return all active subscriptions', () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      tracker.trackOrder(testPlatform, 'order-1');
      tracker.trackOrder(testPlatform, 'order-2');
      tracker.trackOrder(testPlatform, 'order-3');

      const active = tracker.getActiveSubscriptions();

      expect(active.length).toBe(3);
    });

    it('should not include stopped subscriptions', () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const sub1 = tracker.trackOrder(testPlatform, 'order-1');
      tracker.trackOrder(testPlatform, 'order-2');

      tracker.stopTracking(sub1.id);

      const active = tracker.getActiveSubscriptions();

      expect(active.length).toBe(1);
      expect(active[0].orderId).toBe('order-2');
    });
  });

  describe('shutdown()', () => {
    it('should stop all subscriptions', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      tracker.trackOrder(testPlatform, 'order-1');
      tracker.trackOrder(testPlatform, 'order-2');

      tracker.shutdown();

      const active = tracker.getActiveSubscriptions();
      expect(active.length).toBe(0);
    });
  });

  describe('notifications integration', () => {
    it('should send notification on status change', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(createMockOrder('PENDING'));
        }
        return Promise.resolve(createMockOrder('FILLED'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockNotifier: ITradeNotifier = {
        notify: vi.fn().mockResolvedValue({}),
        getPreferences: vi.fn().mockResolvedValue({}),
        setPreferences: vi.fn().mockResolvedValue(undefined),
      };

      const notifiedTracker = createOrderStatusTracker(
        { defaultPollingInterval: 100 },
        { notifier: mockNotifier }
      );

      notifiedTracker.trackOrder(testPlatform, 'order-123');

      // First poll
      await vi.advanceTimersByTimeAsync(100);
      // Second poll - status changes
      await vi.advanceTimersByTimeAsync(100);

      expect(mockNotifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_FILLED',
        })
      );

      notifiedTracker.shutdown();
    });

    it('should send correct notification type for each status', async () => {
      const statusNotificationMap: Array<{ status: UnifiedOrder['status']; type: string }> = [
        { status: 'FILLED', type: 'ORDER_FILLED' },
        { status: 'PARTIALLY_FILLED', type: 'ORDER_PARTIALLY_FILLED' },
        { status: 'CANCELLED', type: 'ORDER_CANCELLED' },
        { status: 'REJECTED', type: 'ORDER_REJECTED' },
        { status: 'EXPIRED', type: 'ORDER_EXPIRED' },
      ];

      for (const { status, type } of statusNotificationMap) {
        let callCount = 0;
        const mockAdapter = createMockAdapter(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(createMockOrder('PENDING'));
          }
          return Promise.resolve(createMockOrder(status));
        });
        vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

        const mockNotifier: ITradeNotifier = {
          notify: vi.fn().mockResolvedValue({}),
          getPreferences: vi.fn().mockResolvedValue({}),
          setPreferences: vi.fn().mockResolvedValue(undefined),
        };

        const testTracker = createOrderStatusTracker(
          { defaultPollingInterval: 100 },
          { notifier: mockNotifier }
        );

        testTracker.trackOrder(testPlatform, `order-${status}`);

        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(100);

        expect(mockNotifier.notify).toHaveBeenCalledWith(
          expect.objectContaining({
            type,
          })
        );

        testTracker.shutdown();
      }
    });
  });

  describe('logging integration', () => {
    it('should log status changes', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(createMockOrder('PENDING'));
        }
        return Promise.resolve(createMockOrder('FILLED'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedTracker = createOrderStatusTracker(
        { defaultPollingInterval: 100 },
        { logger: mockLogger }
      );

      loggedTracker.trackOrder(testPlatform, 'order-123');

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ORDER_STATUS_CHANGED',
          data: expect.objectContaining({
            previousStatus: 'PENDING',
            newStatus: 'FILLED',
          }),
        })
      );

      loggedTracker.shutdown();
    });
  });

  describe('timeout behavior', () => {
    it('should stop tracking after timeout', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder('PENDING')));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const subscription = tracker.trackOrder(testPlatform, 'order-123', {
        timeout: 500,
      });

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(600);

      const active = tracker.getActiveSubscriptions();
      expect(active.find((s) => s.id === subscription.id)).toBeUndefined();
    });
  });
});
