/**
 * Trade Notifier Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TradeNotifier,
  createTradeNotifier,
  type TradeNotifierConfig,
  type IEmailAdapter,
} from '../../src/trading/execution/notifier';
import type {
  NotificationPreferences,
  NotificationType,
  IExecutionLogger,
} from '../../src/trading/execution/types';
import type { TradingPlatform, UnifiedOrder } from '../../src/trading/types';

describe('TradeNotifier', () => {
  let notifier: TradeNotifier;
  const testUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const testPlatform: TradingPlatform = 'LIMITLESS';

  const createMockOrder = (overrides?: Partial<UnifiedOrder>): UnifiedOrder => ({
    id: 'order-123',
    platform: testPlatform,
    marketId: 'market-1',
    outcome: 'YES',
    side: 'BUY',
    orderType: 'LIMIT',
    status: 'FILLED',
    size: 100,
    filledSize: 100,
    remainingSize: 0,
    price: 0.65,
    averagePrice: 0.65,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    notifier = createTradeNotifier();
  });

  describe('notify()', () => {
    it('should create a notification with generated id and timestamp', async () => {
      const notification = await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.id).toBeDefined();
      expect(notification.id).toHaveLength(36); // UUID format
      expect(notification.timestamp).toBeInstanceOf(Date);
      expect(notification.type).toBe('ORDER_FILLED');
    });

    it('should deliver in-app notifications successfully', async () => {
      const notification = await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.deliveryStatus).toBe('DELIVERED');
      expect(notification.deliveryMethod).toBe('IN_APP');
    });

    it('should skip notification based on user preferences', async () => {
      // Set preferences to not notify on partial fills
      await notifier.setPreferences(testUserAddress, {
        notifyOnPartialFill: false,
      });

      const notification = await notifier.notify({
        type: 'ORDER_PARTIALLY_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder({ status: 'PARTIALLY_FILLED' }),
        message: 'Order partially filled',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.deliveryStatus).toBe('SKIPPED');
    });

    it('should send notification based on default preferences', async () => {
      // Default: notifyOnFill = true
      const notification = await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.deliveryStatus).toBe('DELIVERED');
    });

    it('should include trades when provided', async () => {
      const trades = [
        {
          id: 'trade-1',
          orderId: 'order-123',
          platform: testPlatform,
          marketId: 'market-1',
          outcome: 'YES' as const,
          side: 'BUY' as const,
          price: 0.65,
          size: 50,
          fee: 0.5,
          timestamp: new Date(),
          transactionHash: '0xabc' as `0x${string}`,
        },
      ];

      const notification = await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        trades,
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      expect(notification.trades).toEqual(trades);
    });
  });

  describe('webhook delivery', () => {
    it('should deliver to webhook when URL provided', async () => {
      const webhookUrl = 'https://example.com/webhook';

      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const webhookNotifier = createTradeNotifier({ enableWebhooks: true });

      const notification = await webhookNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'WEBHOOK',
        webhookUrl,
      });

      expect(notification.deliveryStatus).toBe('DELIVERED');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Calibr-Event': 'ORDER_FILLED',
          }),
        })
      );
    });

    it('should fail when webhook returns error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const webhookNotifier = createTradeNotifier({ enableWebhooks: true });

      const notification = await webhookNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'WEBHOOK',
        webhookUrl: 'https://example.com/webhook',
      });

      expect(notification.deliveryStatus).toBe('FAILED');
      expect(notification.deliveryError).toContain('500');
    });

    it('should timeout webhook request', async () => {
      // Mock fetch that throws AbortError when aborted
      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        const signal = options?.signal as AbortSignal | undefined;
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => resolve({ ok: true }), 20000);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
      });

      const webhookNotifier = createTradeNotifier({
        enableWebhooks: true,
        webhookTimeoutMs: 50, // Very short timeout
      });

      const notification = await webhookNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'WEBHOOK',
        webhookUrl: 'https://example.com/webhook',
      });

      expect(notification.deliveryStatus).toBe('FAILED');
    }, 10000);
  });

  describe('email delivery', () => {
    it('should deliver via email when configured', async () => {
      const mockEmailAdapter: IEmailAdapter = {
        sendEmail: vi.fn().mockResolvedValue(true),
      };

      const emailNotifier = createTradeNotifier({
        enableEmail: true,
        emailAdapter: mockEmailAdapter,
      });

      await emailNotifier.setPreferences(testUserAddress, {
        email: 'user@example.com',
      });

      const notification = await emailNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'EMAIL',
      });

      expect(notification.deliveryStatus).toBe('DELIVERED');
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringContaining('[Calibr]'),
        expect.stringContaining('Order filled')
      );
    });

    it('should fail when email adapter returns false', async () => {
      const mockEmailAdapter: IEmailAdapter = {
        sendEmail: vi.fn().mockResolvedValue(false),
      };

      const emailNotifier = createTradeNotifier({
        enableEmail: true,
        emailAdapter: mockEmailAdapter,
      });

      await emailNotifier.setPreferences(testUserAddress, {
        email: 'user@example.com',
      });

      const notification = await emailNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'EMAIL',
      });

      expect(notification.deliveryStatus).toBe('FAILED');
    });
  });

  describe('getPreferences()', () => {
    it('should return default preferences for new user', async () => {
      const prefs = await notifier.getPreferences(testUserAddress);

      expect(prefs.notifyOnFill).toBe(true);
      expect(prefs.notifyOnReject).toBe(true);
      expect(prefs.notifyOnPartialFill).toBe(false);
      expect(prefs.notifyOnCancel).toBe(false);
    });

    it('should return custom preferences after setting', async () => {
      await notifier.setPreferences(testUserAddress, {
        notifyOnCancel: true,
        webhookUrl: 'https://example.com/hook',
      });

      const prefs = await notifier.getPreferences(testUserAddress);

      expect(prefs.notifyOnCancel).toBe(true);
      expect(prefs.webhookUrl).toBe('https://example.com/hook');
    });

    it('should handle case-insensitive addresses', async () => {
      const lowerAddress = testUserAddress.toLowerCase() as `0x${string}`;
      const upperAddress = testUserAddress.toUpperCase() as `0x${string}`;

      await notifier.setPreferences(lowerAddress, {
        notifyOnCancel: true,
      });

      const prefs = await notifier.getPreferences(upperAddress);
      expect(prefs.notifyOnCancel).toBe(true);
    });
  });

  describe('setPreferences()', () => {
    it('should merge with existing preferences', async () => {
      await notifier.setPreferences(testUserAddress, {
        notifyOnFill: false,
      });

      await notifier.setPreferences(testUserAddress, {
        notifyOnCancel: true,
      });

      const prefs = await notifier.getPreferences(testUserAddress);

      expect(prefs.notifyOnFill).toBe(false);
      expect(prefs.notifyOnCancel).toBe(true);
    });
  });

  describe('getNotificationHistory()', () => {
    beforeEach(async () => {
      await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order 1 filled',
        deliveryMethod: 'IN_APP',
      });
      await notifier.notify({
        type: 'ORDER_CANCELLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder({ status: 'CANCELLED' }),
        message: 'Order 2 cancelled',
        deliveryMethod: 'IN_APP',
      });
      await notifier.notify({
        type: 'ORDER_FILLED',
        userAddress: '0x9999999999999999999999999999999999999999' as `0x${string}`,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Other user order',
        deliveryMethod: 'IN_APP',
      });
    });

    it('should return notifications for user', () => {
      const history = notifier.getNotificationHistory(testUserAddress);
      expect(history.length).toBe(2);
    });

    it('should filter by type', () => {
      const history = notifier.getNotificationHistory(testUserAddress, {
        type: 'ORDER_FILLED',
      });
      expect(history.length).toBe(1);
      expect(history[0].type).toBe('ORDER_FILLED');
    });

    it('should apply limit', () => {
      const history = notifier.getNotificationHistory(testUserAddress, {
        limit: 1,
      });
      expect(history.length).toBe(1);
    });
  });

  describe('delivery method determination', () => {
    it('should prefer webhook over email over in-app', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      const fullNotifier = createTradeNotifier({
        enableWebhooks: true,
        enableEmail: true,
        emailAdapter: { sendEmail: vi.fn().mockResolvedValue(true) },
      });

      await fullNotifier.setPreferences(testUserAddress, {
        webhookUrl: 'https://example.com/hook',
        email: 'user@example.com',
      });

      // When webhook URL is in preferences, it should be chosen automatically
      // The deliveryMethod from request is just a hint - determineDeliveryMethod picks the best
      const notification = await fullNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      // Since webhook URL is in preferences and webhooks are enabled,
      // webhook should be the delivery method used
      expect(notification.deliveryMethod).toBe('WEBHOOK');
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('should use notification-level webhookUrl over preferences', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      const webhookNotifier = createTradeNotifier({ enableWebhooks: true });

      await webhookNotifier.setPreferences(testUserAddress, {
        webhookUrl: 'https://preferences.com/hook',
      });

      await webhookNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'WEBHOOK',
        webhookUrl: 'https://notification.com/hook',
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://notification.com/hook',
        expect.anything()
      );
    });
  });

  describe('logging integration', () => {
    it('should log successful notifications', async () => {
      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedNotifier = createTradeNotifier({}, mockLogger);

      await loggedNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'IN_APP',
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NOTIFICATION_SENT',
        })
      );
    });

    it('should log failed notifications', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const mockLogger: IExecutionLogger = {
        log: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        getExecutionLogs: vi.fn().mockResolvedValue([]),
      };

      const loggedNotifier = createTradeNotifier({ enableWebhooks: true }, mockLogger);

      await loggedNotifier.notify({
        type: 'ORDER_FILLED',
        userAddress: testUserAddress,
        platform: testPlatform,
        order: createMockOrder(),
        message: 'Order filled',
        deliveryMethod: 'WEBHOOK',
        webhookUrl: 'https://example.com/hook',
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'NOTIFICATION_FAILED',
        })
      );
    });
  });

  describe('notification types', () => {
    const notificationTypes: Array<{
      type: NotificationType;
      prefKey: keyof NotificationPreferences;
      defaultEnabled: boolean;
    }> = [
      { type: 'ORDER_FILLED', prefKey: 'notifyOnFill', defaultEnabled: true },
      { type: 'ORDER_PARTIALLY_FILLED', prefKey: 'notifyOnPartialFill', defaultEnabled: false },
      { type: 'ORDER_CANCELLED', prefKey: 'notifyOnCancel', defaultEnabled: false },
      { type: 'ORDER_REJECTED', prefKey: 'notifyOnReject', defaultEnabled: true },
    ];

    for (const { type, prefKey, defaultEnabled } of notificationTypes) {
      it(`should ${defaultEnabled ? 'send' : 'skip'} ${type} by default`, async () => {
        const notification = await notifier.notify({
          type,
          userAddress: testUserAddress,
          platform: testPlatform,
          order: createMockOrder(),
          message: `Order ${type}`,
          deliveryMethod: 'IN_APP',
        });

        if (defaultEnabled) {
          expect(notification.deliveryStatus).toBe('DELIVERED');
        } else {
          expect(notification.deliveryStatus).toBe('SKIPPED');
        }
      });
    }
  });
});
