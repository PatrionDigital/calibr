/**
 * Execution Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionRouter,
  createExecutionRouter,
  type ExecutionRouterConfig,
} from '../../src/trading/execution/router';
import type {
  ExecutionRequest,
  ExecutionResult,
  IOrderStatusTracker,
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

describe('ExecutionRouter', () => {
  let router: ExecutionRouter;
  const testUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const testPlatform: TradingPlatform = 'LIMITLESS';

  const createMockOrder = (overrides?: Partial<UnifiedOrder>): UnifiedOrder => ({
    id: 'order-123',
    platform: testPlatform,
    marketId: 'market-1',
    outcome: 'YES',
    side: 'BUY',
    orderType: 'LIMIT',
    status: 'OPEN',
    size: 100,
    filledSize: 0,
    remainingSize: 100,
    price: 0.65,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockRequest = (overrides?: Partial<ExecutionRequest>): ExecutionRequest => ({
    platform: testPlatform,
    userAddress: testUserAddress,
    marketId: 'market-1',
    outcome: 'YES',
    side: 'BUY',
    orderType: 'LIMIT',
    size: 100,
    price: 0.65,
    ...overrides,
  });

  const createMockAdapter = (
    placeOrderFn: () => Promise<UnifiedOrder>
  ): ITradingAdapter => ({
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
    placeOrder: placeOrderFn,
    cancelOrder: vi.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    router = createExecutionRouter({
      defaultMaxRetries: 1,
      retryDelayMs: 10,
      requestTimeoutMs: 1000,
    });
  });

  describe('execute()', () => {
    it('should execute order successfully', async () => {
      const mockOrder = createMockOrder();
      const mockAdapter = createMockAdapter(() => Promise.resolve(mockOrder));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await router.execute(createMockRequest());

      expect(result.success).toBe(true);
      expect(result.order).toEqual(mockOrder);
      expect(result.executionId).toBeDefined();
      expect(result.platform).toBe(testPlatform);
    });

    it('should return error for invalid request', async () => {
      const result = await router.execute({
        ...createMockRequest(),
        platform: undefined as unknown as TradingPlatform,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_REQUEST');
    });

    it('should return error when platform unavailable', async () => {
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(undefined);

      const result = await router.execute(createMockRequest());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PLATFORM_UNAVAILABLE');
    });

    it('should return error when adapter not ready', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      mockAdapter.isReady = vi.fn().mockResolvedValue(false);
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await router.execute(createMockRequest());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('AUTHENTICATION_FAILED');
    });

    it('should retry on retryable errors', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(createMockOrder());
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await router.execute(
        createMockRequest({
          retryOnFailure: true,
          maxRetries: 2,
        })
      );

      expect(result.success).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(callCount).toBe(2);
    });

    it('should not retry when retryOnFailure is false', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        return Promise.reject(new Error('Network timeout'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await router.execute(
        createMockRequest({
          retryOnFailure: false,
        })
      );

      expect(result.success).toBe(false);
      expect(callCount).toBe(1);
    });

    it('should not retry non-retryable errors', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        return Promise.reject(new Error('Insufficient balance'));
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await router.execute(
        createMockRequest({
          retryOnFailure: true,
          maxRetries: 3,
        })
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_BALANCE');
      expect(callCount).toBe(1);
    });

    it('should map errors to correct error codes', async () => {
      const errorMappings: Array<{ error: string; code: string }> = [
        { error: 'Request timeout', code: 'TIMEOUT' },
        { error: 'Network error occurred', code: 'NETWORK_ERROR' },
        { error: 'Insufficient balance for trade', code: 'INSUFFICIENT_BALANCE' },
        { error: 'Unauthorized access', code: 'AUTHENTICATION_FAILED' },
        { error: 'Market not found', code: 'MARKET_NOT_FOUND' },
        { error: 'Price moved beyond slippage', code: 'PRICE_MOVED' },
        { error: 'Order rejected by exchange', code: 'ORDER_REJECTED' },
        { error: 'Some unknown error', code: 'UNKNOWN_ERROR' },
      ];

      for (const { error, code } of errorMappings) {
        // Create a fresh router for each test to avoid adapter caching
        const testRouter = createExecutionRouter({
          defaultMaxRetries: 0,
          retryDelayMs: 10,
          requestTimeoutMs: 1000,
        });

        const mockAdapter = createMockAdapter(() => Promise.reject(new Error(error)));
        vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

        const result = await testRouter.execute(createMockRequest());

        expect(result.errorCode).toBe(code);
      }
    });

    it('should handle timeout', async () => {
      const slowRouter = createExecutionRouter({
        requestTimeoutMs: 50,
      });

      const mockAdapter = createMockAdapter(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createMockOrder()), 200)
          )
      );
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const result = await slowRouter.execute(createMockRequest());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TIMEOUT');
    });
  });

  describe('cancel()', () => {
    it('should cancel order successfully', async () => {
      // First execute to cache the adapter
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      await router.execute(createMockRequest());

      const result = await router.cancel(testPlatform, 'order-123');

      expect(result).toBe(true);
      expect(mockAdapter.cancelOrder).toHaveBeenCalledWith('order-123');
    });

    it('should throw when no adapter cached', async () => {
      await expect(router.cancel(testPlatform, 'order-123')).rejects.toThrow(
        'No adapter cached'
      );
    });
  });

  describe('getExecutionStatus()', () => {
    it('should return null when no logger configured', async () => {
      const result = await router.getExecutionStatus('exec-123');
      expect(result).toBeNull();
    });

    it('should return execution status from logs', async () => {
      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            executionId: 'exec-123',
            eventType: 'EXECUTION_STARTED',
            platform: testPlatform,
            userAddress: testUserAddress,
            marketId: 'market-1',
            timestamp: new Date(),
            data: {},
          },
          {
            id: 'log-2',
            executionId: 'exec-123',
            eventType: 'EXECUTION_COMPLETED',
            platform: testPlatform,
            userAddress: testUserAddress,
            marketId: 'market-1',
            timestamp: new Date(),
            data: { order: createMockOrder() },
          },
        ]),
      };

      const loggedRouter = createExecutionRouter({}, { logger: mockLogger });

      const result = await loggedRouter.getExecutionStatus('exec-123');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.executionId).toBe('exec-123');
    });

    it('should return in-progress status when no completion event', async () => {
      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            executionId: 'exec-123',
            eventType: 'EXECUTION_STARTED',
            platform: testPlatform,
            userAddress: testUserAddress,
            marketId: 'market-1',
            timestamp: new Date(),
            data: {},
          },
        ]),
      };

      const loggedRouter = createExecutionRouter({}, { logger: mockLogger });

      const result = await loggedRouter.getExecutionStatus('exec-123');

      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Execution in progress');
    });

    it('should return null when no logs found', async () => {
      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedRouter = createExecutionRouter({}, { logger: mockLogger });

      const result = await loggedRouter.getExecutionStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('isPlatformAvailable()', () => {
    it('should return true when adapter factory exists', async () => {
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() =>
        createMockAdapter(() => Promise.resolve(createMockOrder()))
      );

      const available = await router.isPlatformAvailable(testPlatform);

      expect(available).toBe(true);
    });

    it('should return false when no adapter factory', async () => {
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(undefined);

      const available = await router.isPlatformAvailable(testPlatform);

      expect(available).toBe(false);
    });
  });

  describe('service integration', () => {
    it('should track order when trackStatus enabled', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockTracker: IOrderStatusTracker = {
        trackOrder: vi.fn().mockReturnValue({ id: 'sub-123' }),
        stopTracking: vi.fn(),
        getOrderStatus: vi.fn(),
        getActiveSubscriptions: vi.fn(),
      };

      const trackedRouter = createExecutionRouter(
        { enableTracking: true },
        { tracker: mockTracker }
      );

      await trackedRouter.execute(
        createMockRequest({
          trackStatus: true,
        })
      );

      expect(mockTracker.trackOrder).toHaveBeenCalledWith(
        testPlatform,
        'order-123',
        expect.objectContaining({ stopOnTerminal: true })
      );
    });

    it('should not track when trackStatus disabled', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockTracker: IOrderStatusTracker = {
        trackOrder: vi.fn(),
        stopTracking: vi.fn(),
        getOrderStatus: vi.fn(),
        getActiveSubscriptions: vi.fn(),
      };

      const trackedRouter = createExecutionRouter(
        { enableTracking: true },
        { tracker: mockTracker }
      );

      await trackedRouter.execute(
        createMockRequest({
          trackStatus: false,
        })
      );

      expect(mockTracker.trackOrder).not.toHaveBeenCalled();
    });

    it('should log execution events', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedRouter = createExecutionRouter(
        { enableLogging: true },
        { logger: mockLogger }
      );

      await loggedRouter.execute(createMockRequest());

      // Should log EXECUTION_STARTED, ORDER_ACCEPTED, EXECUTION_COMPLETED
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'EXECUTION_STARTED' })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ORDER_ACCEPTED' })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'EXECUTION_COMPLETED' })
      );
    });

    it('should log failures', async () => {
      const mockAdapter = createMockAdapter(() =>
        Promise.reject(new Error('Order failed'))
      );
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedRouter = createExecutionRouter(
        { enableLogging: true },
        { logger: mockLogger }
      );

      await loggedRouter.execute(createMockRequest());

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'EXECUTION_FAILED' })
      );
    });

    it('should log retry attempts', async () => {
      let callCount = 0;
      const mockAdapter = createMockAdapter(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network timeout'));
        }
        return Promise.resolve(createMockOrder());
      });
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedRouter = createExecutionRouter(
        {
          enableLogging: true,
          retryDelayMs: 1,
        },
        { logger: mockLogger }
      );

      await loggedRouter.execute(
        createMockRequest({
          retryOnFailure: true,
          maxRetries: 3,
        })
      );

      const retryCalls = mockLogger.log.mock.calls.filter(
        (call) => call[0].eventType === 'RETRY_ATTEMPTED'
      );
      expect(retryCalls.length).toBe(2);
    });
  });

  describe('setLogger/setTracker/setNotifier', () => {
    it('should allow setting services after construction', async () => {
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));
      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => mockAdapter);

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      router.setLogger(mockLogger);

      await router.execute(createMockRequest());

      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('adapter caching', () => {
    it('should reuse cached adapter', async () => {
      let factoryCallCount = 0;
      const mockAdapter = createMockAdapter(() => Promise.resolve(createMockOrder()));

      vi.mocked(tradingAdapterRegistry.get).mockReturnValue(() => {
        factoryCallCount++;
        return mockAdapter;
      });

      await router.execute(createMockRequest());
      await router.execute(createMockRequest());

      expect(factoryCallCount).toBe(1);
    });
  });
});
