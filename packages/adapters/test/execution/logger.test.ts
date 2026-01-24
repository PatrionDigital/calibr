/**
 * Execution Logger Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExecutionLogger,
  createExecutionLogger,
  createLogEntry,
  type ExecutionLoggerConfig,
  type ILogStorageAdapter,
} from '../../src/trading/execution/logger';
import type { ExecutionLogEntry, ExecutionEventType } from '../../src/trading/execution/types';
import type { TradingPlatform } from '../../src/trading/types';

describe('ExecutionLogger', () => {
  let logger: ExecutionLogger;
  const testUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const testPlatform: TradingPlatform = 'LIMITLESS';

  beforeEach(() => {
    logger = createExecutionLogger();
  });

  describe('log()', () => {
    it('should create a log entry with generated id and timestamp', async () => {
      const entry = await logger.log({
        executionId: 'exec-123',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: { test: true },
      });

      expect(entry.id).toBeDefined();
      expect(entry.id).toHaveLength(36); // UUID format
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.executionId).toBe('exec-123');
      expect(entry.eventType).toBe('ORDER_SUBMITTED');
      expect(entry.platform).toBe(testPlatform);
      expect(entry.userAddress).toBe(testUserAddress);
    });

    it('should include all provided fields', async () => {
      const entry = await logger.log({
        executionId: 'exec-123',
        eventType: 'EXECUTION_COMPLETED',
        platform: testPlatform,
        userAddress: testUserAddress,
        userId: 'user-456',
        orderId: 'order-789',
        marketId: 'market-1',
        data: { filled: true, price: 0.65 },
        error: undefined,
        durationMs: 1500,
      });

      expect(entry.userId).toBe('user-456');
      expect(entry.orderId).toBe('order-789');
      expect(entry.durationMs).toBe(1500);
      expect(entry.data).toEqual({ filled: true, price: 0.65 });
    });

    it('should include error messages', async () => {
      const entry = await logger.log({
        executionId: 'exec-123',
        eventType: 'EXECUTION_FAILED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
        error: 'Insufficient balance',
      });

      expect(entry.error).toBe('Insufficient balance');
    });

    it('should enforce max entries limit', async () => {
      const smallLogger = createExecutionLogger({ maxEntries: 5 });

      for (let i = 0; i < 10; i++) {
        await smallLogger.log({
          executionId: `exec-${i}`,
          eventType: 'ORDER_SUBMITTED',
          platform: testPlatform,
          userAddress: testUserAddress,
          marketId: 'market-1',
          data: { index: i },
        });
      }

      const stats = smallLogger.getStats();
      expect(stats.totalEntries).toBe(5);
    });
  });

  describe('query()', () => {
    beforeEach(async () => {
      // Add test entries
      await logger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: 'LIMITLESS',
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_FILLED',
        platform: 'LIMITLESS',
        userAddress: testUserAddress,
        orderId: 'order-1',
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-2',
        eventType: 'ORDER_SUBMITTED',
        platform: 'POLYMARKET',
        userAddress: '0x9999999999999999999999999999999999999999' as `0x${string}`,
        marketId: 'market-2',
        data: {},
      });
    });

    it('should return all entries when no filter provided', async () => {
      const results = await logger.query({});
      expect(results.length).toBe(3);
    });

    it('should filter by userAddress', async () => {
      const results = await logger.query({ userAddress: testUserAddress });
      expect(results.length).toBe(2);
      results.forEach((r) => expect(r.userAddress).toBe(testUserAddress));
    });

    it('should filter by platform', async () => {
      const results = await logger.query({ platform: 'POLYMARKET' });
      expect(results.length).toBe(1);
      expect(results[0].platform).toBe('POLYMARKET');
    });

    it('should filter by eventType', async () => {
      const results = await logger.query({ eventType: 'ORDER_FILLED' });
      expect(results.length).toBe(1);
      expect(results[0].eventType).toBe('ORDER_FILLED');
    });

    it('should filter by orderId', async () => {
      const results = await logger.query({ orderId: 'order-1' });
      expect(results.length).toBe(1);
      expect(results[0].orderId).toBe('order-1');
    });

    it('should filter by executionId', async () => {
      const results = await logger.query({ executionId: 'exec-1' });
      expect(results.length).toBe(2);
      results.forEach((r) => expect(r.executionId).toBe('exec-1'));
    });

    it('should apply pagination with limit and offset', async () => {
      const results = await logger.query({ limit: 2, offset: 1 });
      expect(results.length).toBe(2);
    });

    it('should sort by timestamp descending', async () => {
      const results = await logger.query({});
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          results[i].timestamp.getTime()
        );
      }
    });
  });

  describe('getExecutionLogs()', () => {
    beforeEach(async () => {
      await logger.log({
        executionId: 'exec-1',
        eventType: 'EXECUTION_STARTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-1',
        eventType: 'EXECUTION_COMPLETED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-2',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-2',
        data: {},
      });
    });

    it('should return all logs for an execution', async () => {
      const results = await logger.getExecutionLogs('exec-1');
      expect(results.length).toBe(3);
      results.forEach((r) => expect(r.executionId).toBe('exec-1'));
    });

    it('should sort by timestamp ascending', async () => {
      const results = await logger.getExecutionLogs('exec-1');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp.getTime()).toBeLessThanOrEqual(
          results[i].timestamp.getTime()
        );
      }
    });

    it('should return empty array for non-existent execution', async () => {
      const results = await logger.getExecutionLogs('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', async () => {
      await logger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });

      logger.clear();

      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      await logger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: 'LIMITLESS',
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-2',
        eventType: 'ORDER_SUBMITTED',
        platform: 'LIMITLESS',
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
      await logger.log({
        executionId: 'exec-3',
        eventType: 'ORDER_FILLED',
        platform: 'POLYMARKET',
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });
    });

    it('should return correct total entries', () => {
      const stats = logger.getStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should return entries grouped by type', () => {
      const stats = logger.getStats();
      expect(stats.entriesByType['ORDER_SUBMITTED']).toBe(2);
      expect(stats.entriesByType['ORDER_FILLED']).toBe(1);
    });

    it('should return entries grouped by platform', () => {
      const stats = logger.getStats();
      expect(stats.entriesByPlatform['LIMITLESS']).toBe(2);
      expect(stats.entriesByPlatform['POLYMARKET']).toBe(1);
    });
  });

  describe('persistence', () => {
    it('should call storage adapter on log', async () => {
      const mockStorage: ILogStorageAdapter = {
        save: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue([]),
        getByExecutionId: vi.fn().mockResolvedValue([]),
      };

      const persistentLogger = createExecutionLogger({
        enablePersistence: true,
        storageAdapter: mockStorage,
      });

      await persistentLogger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });

      expect(mockStorage.save).toHaveBeenCalledTimes(1);
    });

    it('should query storage adapter when persistence enabled', async () => {
      const storedEntries: ExecutionLogEntry[] = [
        {
          id: 'stored-1',
          executionId: 'exec-1',
          eventType: 'ORDER_SUBMITTED',
          platform: testPlatform,
          userAddress: testUserAddress,
          marketId: 'market-1',
          timestamp: new Date(),
          data: {},
        },
      ];

      const mockStorage: ILogStorageAdapter = {
        save: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue(storedEntries),
        getByExecutionId: vi.fn().mockResolvedValue(storedEntries),
      };

      const persistentLogger = createExecutionLogger({
        enablePersistence: true,
        storageAdapter: mockStorage,
      });

      const results = await persistentLogger.query({});
      expect(mockStorage.query).toHaveBeenCalled();
      expect(results).toEqual(storedEntries);
    });

    it('should not fail if storage throws', async () => {
      const mockStorage: ILogStorageAdapter = {
        save: vi.fn().mockRejectedValue(new Error('Storage error')),
        query: vi.fn().mockResolvedValue([]),
        getByExecutionId: vi.fn().mockResolvedValue([]),
      };

      const persistentLogger = createExecutionLogger({
        enablePersistence: true,
        storageAdapter: mockStorage,
      });

      // Should not throw
      const entry = await persistentLogger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_SUBMITTED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });

      expect(entry).toBeDefined();
    });
  });

  describe('console logging', () => {
    it('should log to console when enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const consoleLogger = createExecutionLogger({
        enableConsole: true,
        consoleLogLevel: 'info',
      });

      await consoleLogger.log({
        executionId: 'exec-1',
        eventType: 'ORDER_FILLED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log errors at error level', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const consoleLogger = createExecutionLogger({
        enableConsole: true,
        consoleLogLevel: 'error',
      });

      await consoleLogger.log({
        executionId: 'exec-1',
        eventType: 'EXECUTION_FAILED',
        platform: testPlatform,
        userAddress: testUserAddress,
        marketId: 'market-1',
        data: {},
        error: 'Something went wrong',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe('createLogEntry helper', () => {
  it('should create a valid log entry', () => {
    const entry = createLogEntry(
      'exec-123',
      'ORDER_SUBMITTED',
      'LIMITLESS',
      '0x1234567890123456789012345678901234567890' as `0x${string}`,
      'market-1',
      { price: 0.65, size: 100 }
    );

    expect(entry.executionId).toBe('exec-123');
    expect(entry.eventType).toBe('ORDER_SUBMITTED');
    expect(entry.platform).toBe('LIMITLESS');
    expect(entry.data).toEqual({ price: 0.65, size: 100 });
  });

  it('should include optional fields', () => {
    const entry = createLogEntry(
      'exec-123',
      'EXECUTION_COMPLETED',
      'LIMITLESS',
      '0x1234567890123456789012345678901234567890' as `0x${string}`,
      'market-1',
      {},
      {
        userId: 'user-456',
        orderId: 'order-789',
        error: 'Some error',
        durationMs: 2000,
      }
    );

    expect(entry.userId).toBe('user-456');
    expect(entry.orderId).toBe('order-789');
    expect(entry.error).toBe('Some error');
    expect(entry.durationMs).toBe(2000);
  });
});
