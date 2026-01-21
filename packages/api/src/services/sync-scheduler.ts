/**
 * Sync Scheduler
 * Manages periodic sync jobs for all platforms
 */

import { polymarketSync, type SyncResult } from './polymarket-sync';

// =============================================================================
// Types
// =============================================================================

export interface SchedulerConfig {
  /** Market sync interval in ms (default: 5 minutes) */
  marketSyncInterval: number;
  /** Price sync interval in ms (default: 30 seconds) */
  priceSyncInterval: number;
  /** Enable market sync on startup */
  syncOnStartup: boolean;
  /** Callback for sync events */
  onSyncComplete?: (type: 'markets' | 'prices', result: SyncResult) => void;
  /** Callback for sync errors */
  onSyncError?: (type: 'markets' | 'prices', error: Error) => void;
}

export interface SchedulerState {
  isRunning: boolean;
  marketSyncRunning: boolean;
  priceSyncRunning: boolean;
  lastMarketSync: Date | null;
  lastPriceSync: Date | null;
  marketSyncCount: number;
  priceSyncCount: number;
  errors: Array<{ type: string; message: string; timestamp: Date }>;
}

// =============================================================================
// Sync Scheduler
// =============================================================================

export class SyncScheduler {
  private config: SchedulerConfig;
  private state: SchedulerState;
  private marketSyncTimer: ReturnType<typeof setInterval> | null = null;
  private priceSyncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      marketSyncInterval: config.marketSyncInterval ?? 5 * 60 * 1000, // 5 minutes
      priceSyncInterval: config.priceSyncInterval ?? 30 * 1000, // 30 seconds
      syncOnStartup: config.syncOnStartup ?? true,
      onSyncComplete: config.onSyncComplete,
      onSyncError: config.onSyncError,
    };

    this.state = {
      isRunning: false,
      marketSyncRunning: false,
      priceSyncRunning: false,
      lastMarketSync: null,
      lastPriceSync: null,
      marketSyncCount: 0,
      priceSyncCount: 0,
      errors: [],
    };
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting sync scheduler...');
    this.state.isRunning = true;

    // Run initial sync if configured
    if (this.config.syncOnStartup) {
      console.log('[Scheduler] Running initial market sync...');
      await this.runMarketSync();
    }

    // Start market sync interval
    this.marketSyncTimer = setInterval(async () => {
      await this.runMarketSync();
    }, this.config.marketSyncInterval);

    // Start price sync interval
    this.priceSyncTimer = setInterval(async () => {
      await this.runPriceSync();
    }, this.config.priceSyncInterval);

    console.log(
      `[Scheduler] Started - Markets: every ${this.config.marketSyncInterval / 1000}s, Prices: every ${this.config.priceSyncInterval / 1000}s`
    );
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.state.isRunning) {
      return;
    }

    console.log('[Scheduler] Stopping sync scheduler...');

    if (this.marketSyncTimer) {
      clearInterval(this.marketSyncTimer);
      this.marketSyncTimer = null;
    }

    if (this.priceSyncTimer) {
      clearInterval(this.priceSyncTimer);
      this.priceSyncTimer = null;
    }

    this.state.isRunning = false;
    console.log('[Scheduler] Stopped');
  }

  // ===========================================================================
  // Sync Methods
  // ===========================================================================

  /**
   * Run market sync (can be called manually)
   */
  async runMarketSync(): Promise<SyncResult | null> {
    if (this.state.marketSyncRunning) {
      console.log('[Scheduler] Market sync already in progress, skipping...');
      return null;
    }

    this.state.marketSyncRunning = true;
    console.log('[Scheduler] Starting market sync...');

    try {
      const result = await polymarketSync.syncMarkets({
        batchSize: 100,
        maxPages: 20,
        activeOnly: true,
      });

      this.state.lastMarketSync = new Date();
      this.state.marketSyncCount++;

      if (result.success) {
        console.log(
          `[Scheduler] Market sync complete - Created: ${result.marketsCreated}, Updated: ${result.marketsUpdated}, Duration: ${result.duration}ms`
        );
      } else {
        console.error(`[Scheduler] Market sync failed with ${result.errors.length} errors`);
        this.addError('markets', result.errors[0] || 'Unknown error');
      }

      this.config.onSyncComplete?.('markets', result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[Scheduler] Market sync error:', err.message);
      this.addError('markets', err.message);
      this.config.onSyncError?.('markets', err);
      return null;
    } finally {
      this.state.marketSyncRunning = false;
    }
  }

  /**
   * Run price sync (can be called manually)
   */
  async runPriceSync(): Promise<SyncResult | null> {
    if (this.state.priceSyncRunning) {
      return null;
    }

    this.state.priceSyncRunning = true;

    try {
      const result = await polymarketSync.syncPrices();

      this.state.lastPriceSync = new Date();
      this.state.priceSyncCount++;

      if (!result.success && result.errors.length > 0) {
        this.addError('prices', result.errors[0] ?? 'Unknown error');
      }

      this.config.onSyncComplete?.('prices', result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.addError('prices', err.message);
      this.config.onSyncError?.('prices', err);
      return null;
    } finally {
      this.state.priceSyncRunning = false;
    }
  }

  // ===========================================================================
  // State Methods
  // ===========================================================================

  /**
   * Get current scheduler state
   */
  getState(): Readonly<SchedulerState> {
    return { ...this.state };
  }

  /**
   * Get scheduler health
   */
  async getHealth(): Promise<{
    scheduler: boolean;
    polymarket: { healthy: boolean; details: Record<string, boolean> };
    stats: {
      totalMarkets: number;
      activeMarkets: number;
      lastSync: Date | null;
      recentErrors: number;
    };
  }> {
    const [polymarketHealth, stats] = await Promise.all([
      polymarketSync.healthCheck(),
      polymarketSync.getStats(),
    ]);

    return {
      scheduler: this.state.isRunning,
      polymarket: polymarketHealth,
      stats,
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    const wasRunning = this.state.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning) {
      this.start();
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private addError(type: string, message: string): void {
    this.state.errors.unshift({
      type,
      message,
      timestamp: new Date(),
    });

    // Keep only last 50 errors
    if (this.state.errors.length > 50) {
      this.state.errors = this.state.errors.slice(0, 50);
    }
  }
}

// Export singleton instance
export const syncScheduler = new SyncScheduler();
