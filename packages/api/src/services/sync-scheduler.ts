/**
 * Sync Scheduler
 * Manages periodic sync jobs for all platforms
 */

import { polymarketSync, type SyncResult } from './polymarket-sync';
import { limitlessSync } from './limitless-sync';
import { opinionSync } from './opinion-sync';
import { manifoldSync } from './manifold-sync';

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
    // Read intervals from env vars (in seconds) or use sane defaults
    const marketIntervalMs = (parseInt(process.env.MARKET_SYNC_INTERVAL_S || '0') || 30 * 60) * 1000; // default 30 min
    const priceIntervalMs = (parseInt(process.env.PRICE_SYNC_INTERVAL_S || '0') || 15 * 60) * 1000; // default 15 min
    const syncEnabled = process.env.SYNC_ENABLED !== 'false'; // kill switch

    this.config = {
      marketSyncInterval: config.marketSyncInterval ?? marketIntervalMs,
      priceSyncInterval: config.priceSyncInterval ?? priceIntervalMs,
      syncOnStartup: config.syncOnStartup ?? syncEnabled,
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

    if (process.env.SYNC_ENABLED === 'false') {
      console.log('[Scheduler] Sync disabled via SYNC_ENABLED=false');
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
   * Run market sync for all platforms (can be called manually)
   */
  async runMarketSync(): Promise<SyncResult | null> {
    if (this.state.marketSyncRunning) {
      console.log('[Scheduler] Market sync already in progress, skipping...');
      return null;
    }

    this.state.marketSyncRunning = true;
    console.log('[Scheduler] Starting market sync for all platforms...');

    const combinedResult: SyncResult = {
      success: true,
      syncedAt: new Date(),
      duration: 0,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 0,
      errors: [],
    };

    const startTime = Date.now();

    try {
      // Sync Polymarket
      console.log('[Scheduler] Syncing Polymarket...');
      const polymarketResult = await polymarketSync.syncMarkets({
        batchSize: 100,
        maxPages: 5, // ~500 markets max — was 20 (2,000) which burns data
        activeOnly: true,
      });

      combinedResult.marketsCreated += polymarketResult.marketsCreated;
      combinedResult.marketsUpdated += polymarketResult.marketsUpdated;
      combinedResult.pricesUpdated += polymarketResult.pricesUpdated;
      if (!polymarketResult.success) {
        combinedResult.success = false;
        combinedResult.errors.push(...polymarketResult.errors.map(e => `[Polymarket] ${e}`));
      }

      console.log(
        `[Scheduler] Polymarket sync complete - Created: ${polymarketResult.marketsCreated}, Updated: ${polymarketResult.marketsUpdated}`
      );

      // Sync Limitless (API uses fixed page size of 25)
      console.log('[Scheduler] Syncing Limitless...');
      const limitlessResult = await limitlessSync.syncMarkets({
        batchSize: 25,
        maxPages: 5, // ~125 markets — was 20 (500)
        activeOnly: true,
      });

      combinedResult.marketsCreated += limitlessResult.marketsCreated;
      combinedResult.marketsUpdated += limitlessResult.marketsUpdated;
      combinedResult.pricesUpdated += limitlessResult.pricesUpdated;
      if (!limitlessResult.success) {
        combinedResult.success = false;
        combinedResult.errors.push(...limitlessResult.errors.map(e => `[Limitless] ${e}`));
      }

      console.log(
        `[Scheduler] Limitless sync complete - Created: ${limitlessResult.marketsCreated}, Updated: ${limitlessResult.marketsUpdated}`
      );

      // Sync Opinion
      console.log('[Scheduler] Syncing Opinion...');
      try {
        const opinionResult = await opinionSync.syncMarkets({
          batchSize: 20,
          maxPages: 10,
          activeOnly: true,
        });

        combinedResult.marketsCreated += opinionResult.marketsCreated;
        combinedResult.marketsUpdated += opinionResult.marketsUpdated;
        combinedResult.pricesUpdated += opinionResult.pricesUpdated;
        if (!opinionResult.success) {
          combinedResult.errors.push(...opinionResult.errors.map(e => `[Opinion] ${e}`));
        }

        console.log(
          `[Scheduler] Opinion sync complete - Created: ${opinionResult.marketsCreated}, Updated: ${opinionResult.marketsUpdated}`
        );
      } catch (error) {
        const msg = `Opinion sync failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        console.error('[Scheduler]', msg);
        combinedResult.errors.push(`[Opinion] ${msg}`);
      }

      // Sync Manifold
      console.log('[Scheduler] Syncing Manifold...');
      try {
        const manifoldResult = await manifoldSync.syncMarkets({
          batchSize: 100,
          maxPages: 5,
          activeOnly: true,
        });

        combinedResult.marketsCreated += manifoldResult.marketsCreated;
        combinedResult.marketsUpdated += manifoldResult.marketsUpdated;
        combinedResult.pricesUpdated += manifoldResult.pricesUpdated;
        if (!manifoldResult.success) {
          combinedResult.errors.push(...manifoldResult.errors.map(e => `[Manifold] ${e}`));
        }

        console.log(
          `[Scheduler] Manifold sync complete - Created: ${manifoldResult.marketsCreated}, Updated: ${manifoldResult.marketsUpdated}`
        );
      } catch (error) {
        const msg = `Manifold sync failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        console.error('[Scheduler]', msg);
        combinedResult.errors.push(`[Manifold] ${msg}`);
      }

      combinedResult.duration = Date.now() - startTime;
      this.state.lastMarketSync = new Date();
      this.state.marketSyncCount++;

      if (combinedResult.success) {
        console.log(
          `[Scheduler] All market syncs complete - Total Created: ${combinedResult.marketsCreated}, Updated: ${combinedResult.marketsUpdated}, Duration: ${combinedResult.duration}ms`
        );
      } else {
        console.error(`[Scheduler] Market sync completed with ${combinedResult.errors.length} errors`);
        this.addError('markets', combinedResult.errors[0] || 'Unknown error');
      }

      this.config.onSyncComplete?.('markets', combinedResult);
      return combinedResult;
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
   * Run price sync for all platforms (can be called manually)
   */
  async runPriceSync(): Promise<SyncResult | null> {
    if (this.state.priceSyncRunning) {
      return null;
    }

    this.state.priceSyncRunning = true;

    const combinedResult: SyncResult = {
      success: true,
      syncedAt: new Date(),
      duration: 0,
      marketsCreated: 0,
      marketsUpdated: 0,
      pricesUpdated: 0,
      errors: [],
    };

    const startTime = Date.now();

    try {
      // Sync Polymarket prices
      const polymarketResult = await polymarketSync.syncPrices();
      combinedResult.pricesUpdated += polymarketResult.pricesUpdated;
      if (!polymarketResult.success) {
        combinedResult.errors.push(...polymarketResult.errors.map(e => `[Polymarket] ${e}`));
      }

      // Sync Limitless prices
      const limitlessResult = await limitlessSync.syncPrices();
      combinedResult.pricesUpdated += limitlessResult.pricesUpdated;
      if (!limitlessResult.success) {
        combinedResult.errors.push(...limitlessResult.errors.map(e => `[Limitless] ${e}`));
      }

      // Sync Opinion prices
      try {
        const opinionResult = await opinionSync.syncPrices();
        combinedResult.pricesUpdated += opinionResult.pricesUpdated;
        if (!opinionResult.success) {
          combinedResult.errors.push(...opinionResult.errors.map(e => `[Opinion] ${e}`));
        }
      } catch (error) {
        combinedResult.errors.push(`[Opinion] Price sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Sync Manifold prices
      try {
        const manifoldResult = await manifoldSync.syncPrices();
        combinedResult.pricesUpdated += manifoldResult.pricesUpdated;
        if (!manifoldResult.success) {
          combinedResult.errors.push(...manifoldResult.errors.map(e => `[Manifold] ${e}`));
        }
      } catch (error) {
        combinedResult.errors.push(`[Manifold] Price sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      combinedResult.duration = Date.now() - startTime;
      combinedResult.success = combinedResult.errors.length === 0;

      this.state.lastPriceSync = new Date();
      this.state.priceSyncCount++;

      if (!combinedResult.success && combinedResult.errors.length > 0) {
        this.addError('prices', combinedResult.errors[0] ?? 'Unknown error');
      }

      this.config.onSyncComplete?.('prices', combinedResult);
      return combinedResult;
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
    limitless: { healthy: boolean; details: Record<string, boolean> };
    stats: {
      polymarket: {
        totalMarkets: number;
        activeMarkets: number;
        lastSync: Date | null;
        recentErrors: number;
      };
      limitless: {
        totalMarkets: number;
        activeMarkets: number;
        lastSync: Date | null;
        recentErrors: number;
      };
    };
  }> {
    const [polymarketHealth, polymarketStats, limitlessHealth, limitlessStats] = await Promise.all([
      polymarketSync.healthCheck(),
      polymarketSync.getStats(),
      limitlessSync.healthCheck(),
      limitlessSync.getStats(),
    ]);

    return {
      scheduler: this.state.isRunning,
      polymarket: polymarketHealth,
      limitless: limitlessHealth,
      stats: {
        polymarket: polymarketStats,
        limitless: limitlessStats,
      },
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
