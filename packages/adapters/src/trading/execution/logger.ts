/**
 * Execution Logger Service
 * Logs all execution events for audit trail and debugging
 */

import { randomUUID } from 'crypto';
import type {
  IExecutionLogger,
  ExecutionLogEntry,
  ExecutionLogQuery,
  ExecutionEventType,
} from './types';
import type { TradingPlatform } from '../types';

// ============================================================================
// Logger Configuration
// ============================================================================

export interface ExecutionLoggerConfig {
  /** Max entries to keep in memory */
  maxEntries?: number;
  /** Enable persistence (requires external storage) */
  enablePersistence?: boolean;
  /** Storage adapter for persistence */
  storageAdapter?: ILogStorageAdapter;
  /** Enable console logging */
  enableConsole?: boolean;
  /** Console log level */
  consoleLogLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Storage adapter interface for persisting logs
 */
export interface ILogStorageAdapter {
  save(entry: ExecutionLogEntry): Promise<void>;
  query(options: ExecutionLogQuery): Promise<ExecutionLogEntry[]>;
  getByExecutionId(executionId: string): Promise<ExecutionLogEntry[]>;
}

const DEFAULT_CONFIG: Required<Omit<ExecutionLoggerConfig, 'storageAdapter'>> = {
  maxEntries: 10000,
  enablePersistence: false,
  enableConsole: false,
  consoleLogLevel: 'info',
};

// ============================================================================
// In-Memory Execution Logger Implementation
// ============================================================================

export class ExecutionLogger implements IExecutionLogger {
  private config: Required<Omit<ExecutionLoggerConfig, 'storageAdapter'>>;
  private storageAdapter?: ILogStorageAdapter;
  private entries: ExecutionLogEntry[] = [];
  private entriesByExecutionId: Map<string, ExecutionLogEntry[]> = new Map();

  constructor(config: ExecutionLoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageAdapter = config.storageAdapter;
  }

  /**
   * Log an execution event
   */
  async log(
    entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>
  ): Promise<ExecutionLogEntry> {
    const logEntry: ExecutionLogEntry = {
      ...entry,
      id: randomUUID(),
      timestamp: new Date(),
    };

    // Store in memory
    this.entries.push(logEntry);

    // Index by execution ID
    const executionEntries = this.entriesByExecutionId.get(entry.executionId) || [];
    executionEntries.push(logEntry);
    this.entriesByExecutionId.set(entry.executionId, executionEntries);

    // Enforce max entries
    if (this.entries.length > this.config.maxEntries) {
      const removed = this.entries.shift();
      if (removed) {
        const execEntries = this.entriesByExecutionId.get(removed.executionId);
        if (execEntries) {
          const index = execEntries.findIndex((e) => e.id === removed.id);
          if (index !== -1) {
            execEntries.splice(index, 1);
          }
          if (execEntries.length === 0) {
            this.entriesByExecutionId.delete(removed.executionId);
          }
        }
      }
    }

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Persist if enabled
    if (this.config.enablePersistence && this.storageAdapter) {
      try {
        await this.storageAdapter.save(logEntry);
      } catch (error) {
        // Log persistence error to console but don't fail
        console.error('[ExecutionLogger] Failed to persist log entry:', error);
      }
    }

    return logEntry;
  }

  /**
   * Query execution logs
   */
  async query(options: ExecutionLogQuery): Promise<ExecutionLogEntry[]> {
    // If persistence is enabled, query storage first
    if (this.config.enablePersistence && this.storageAdapter) {
      try {
        return await this.storageAdapter.query(options);
      } catch {
        // Fall back to in-memory
      }
    }

    // Filter in-memory entries
    let filtered = [...this.entries];

    if (options.userAddress) {
      filtered = filtered.filter((e) => e.userAddress === options.userAddress);
    }

    if (options.userId) {
      filtered = filtered.filter((e) => e.userId === options.userId);
    }

    if (options.platform) {
      filtered = filtered.filter((e) => e.platform === options.platform);
    }

    if (options.eventType) {
      filtered = filtered.filter((e) => e.eventType === options.eventType);
    }

    if (options.orderId) {
      filtered = filtered.filter((e) => e.orderId === options.orderId);
    }

    if (options.executionId) {
      filtered = filtered.filter((e) => e.executionId === options.executionId);
    }

    if (options.startDate) {
      filtered = filtered.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((e) => e.timestamp <= options.endDate!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get logs for a specific execution
   */
  async getExecutionLogs(executionId: string): Promise<ExecutionLogEntry[]> {
    // If persistence is enabled, query storage first
    if (this.config.enablePersistence && this.storageAdapter) {
      try {
        return await this.storageAdapter.getByExecutionId(executionId);
      } catch {
        // Fall back to in-memory
      }
    }

    const entries = this.entriesByExecutionId.get(executionId) || [];
    return [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear all logs (for testing)
   */
  clear(): void {
    this.entries = [];
    this.entriesByExecutionId.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByPlatform: Record<string, number>;
  } {
    const entriesByType: Record<string, number> = {};
    const entriesByPlatform: Record<string, number> = {};

    for (const entry of this.entries) {
      entriesByType[entry.eventType] = (entriesByType[entry.eventType] || 0) + 1;
      entriesByPlatform[entry.platform] = (entriesByPlatform[entry.platform] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      entriesByType,
      entriesByPlatform,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private logToConsole(entry: ExecutionLogEntry): void {
    const level = this.getLogLevel(entry.eventType);
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.platform}] [${entry.eventType}]`;

    const message = entry.error
      ? `${prefix} ${entry.error}`
      : `${prefix} ${JSON.stringify(entry.data)}`;

    switch (level) {
      case 'debug':
        if (this.config.consoleLogLevel === 'debug') {
          console.debug(message);
        }
        break;
      case 'info':
        if (['debug', 'info'].includes(this.config.consoleLogLevel)) {
          console.info(message);
        }
        break;
      case 'warn':
        if (['debug', 'info', 'warn'].includes(this.config.consoleLogLevel)) {
          console.warn(message);
        }
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  private getLogLevel(eventType: ExecutionEventType): 'debug' | 'info' | 'warn' | 'error' {
    switch (eventType) {
      case 'EXECUTION_FAILED':
      case 'ORDER_REJECTED':
      case 'NOTIFICATION_FAILED':
        return 'error';
      case 'RETRY_ATTEMPTED':
      case 'ORDER_CANCELLED':
      case 'ORDER_EXPIRED':
        return 'warn';
      case 'ORDER_FILLED':
      case 'ORDER_PARTIALLY_FILLED':
      case 'EXECUTION_COMPLETED':
      case 'NOTIFICATION_SENT':
        return 'info';
      default:
        return 'debug';
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a log entry for a specific event
 */
export function createLogEntry(
  executionId: string,
  eventType: ExecutionEventType,
  platform: TradingPlatform,
  userAddress: `0x${string}`,
  marketId: string,
  data: Record<string, unknown>,
  options?: {
    userId?: string;
    orderId?: string;
    error?: string;
    durationMs?: number;
  }
): Omit<ExecutionLogEntry, 'id' | 'timestamp'> {
  return {
    executionId,
    eventType,
    platform,
    userAddress,
    marketId,
    data,
    userId: options?.userId,
    orderId: options?.orderId,
    error: options?.error,
    durationMs: options?.durationMs,
  };
}

// ============================================================================
// Factory Function
// ============================================================================

export function createExecutionLogger(config?: ExecutionLoggerConfig): ExecutionLogger {
  return new ExecutionLogger(config);
}
