/**
 * Market Sync Service
 * Handles periodic synchronization of market data from prediction platforms
 */

import type { PlatformMarket, IPlatformAdapter, MarketQueryParams } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface SyncConfig {
  /** Interval between syncs in milliseconds */
  intervalMs: number;
  /** Maximum markets to fetch per sync */
  batchSize: number;
  /** Whether to sync active markets only */
  activeOnly: boolean;
  /** Callback when markets are synced */
  onSync?: (markets: PlatformMarket[]) => Promise<void>;
  /** Callback on sync error */
  onError?: (error: Error) => void;
  /** Initial offset for pagination */
  initialOffset?: number;
}

export interface SyncState {
  lastSyncAt: Date | null;
  totalSynced: number;
  currentOffset: number;
  isRunning: boolean;
  errors: Array<{ timestamp: Date; message: string }>;
}

export interface SyncResult {
  markets: PlatformMarket[];
  syncedAt: Date;
  duration: number;
  hasMore: boolean;
}

// =============================================================================
// Market Sync Service
// =============================================================================

export class MarketSyncService {
  private adapter: IPlatformAdapter;
  private config: SyncConfig;
  private state: SyncState;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor(adapter: IPlatformAdapter, config: Partial<SyncConfig> = {}) {
    this.adapter = adapter;
    this.config = {
      intervalMs: config.intervalMs ?? 60000, // 1 minute default
      batchSize: config.batchSize ?? 100,
      activeOnly: config.activeOnly ?? true,
      onSync: config.onSync,
      onError: config.onError,
      initialOffset: config.initialOffset ?? 0,
    };
    this.state = {
      lastSyncAt: null,
      totalSynced: 0,
      currentOffset: this.config.initialOffset ?? 0,
      isRunning: false,
      errors: [],
    };
  }

  // ===========================================================================
  // Control Methods
  // ===========================================================================

  /**
   * Start the sync service
   */
  start(): void {
    if (this.state.isRunning) {
      return;
    }

    this.state.isRunning = true;

    // Run initial sync immediately
    this.runSync().catch((error) => {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    });

    // Set up interval for subsequent syncs
    this.intervalHandle = setInterval(() => {
      this.runSync().catch((error) => {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop the sync service
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.state.isRunning = false;
  }

  /**
   * Run a single sync operation
   */
  async runSync(): Promise<SyncResult> {
    if (this.isProcessing) {
      return {
        markets: [],
        syncedAt: new Date(),
        duration: 0,
        hasMore: false,
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      const params: MarketQueryParams = {
        limit: this.config.batchSize,
        offset: this.state.currentOffset,
        status: this.config.activeOnly ? 'ACTIVE' : undefined,
        sortBy: 'volume',
        sortOrder: 'desc',
      };

      const markets = await this.adapter.getMarkets(params);
      const syncedAt = new Date();
      const duration = Date.now() - startTime;

      // Update state
      this.state.lastSyncAt = syncedAt;
      this.state.totalSynced += markets.length;

      // Determine if there are more markets to fetch
      const hasMore = markets.length === this.config.batchSize;

      if (hasMore) {
        this.state.currentOffset += this.config.batchSize;
      } else {
        // Reset offset for next full cycle
        this.state.currentOffset = 0;
      }

      // Call sync callback if provided
      if (this.config.onSync && markets.length > 0) {
        await this.config.onSync(markets);
      }

      return {
        markets,
        syncedAt,
        duration,
        hasMore,
      };
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error(String(error));
      this.handleError(syncError);
      throw syncError;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync a specific market by ID
   */
  async syncMarket(marketId: string): Promise<PlatformMarket | null> {
    try {
      const market = await this.adapter.getMarket(marketId);
      if (market && this.config.onSync) {
        await this.config.onSync([market]);
      }
      return market;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error(String(error));
      this.handleError(syncError);
      throw syncError;
    }
  }

  /**
   * Sync all markets (paginated)
   */
  async syncAll(maxPages = 10): Promise<PlatformMarket[]> {
    const allMarkets: PlatformMarket[] = [];
    let page = 0;
    let hasMore = true;

    // Reset offset for full sync
    this.state.currentOffset = 0;

    while (hasMore && page < maxPages) {
      const result = await this.runSync();
      allMarkets.push(...result.markets);
      hasMore = result.hasMore;
      page++;
    }

    return allMarkets;
  }

  // ===========================================================================
  // State Methods
  // ===========================================================================

  /**
   * Get the current sync state
   */
  getState(): Readonly<SyncState> {
    return { ...this.state };
  }

  /**
   * Reset sync state
   */
  resetState(): void {
    this.state = {
      lastSyncAt: null,
      totalSynced: 0,
      currentOffset: this.config.initialOffset ?? 0,
      isRunning: this.state.isRunning,
      errors: [],
    };
  }

  /**
   * Check if the service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.adapter.healthCheck();
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private handleError(error: Error): void {
    // Keep last 10 errors
    this.state.errors = [
      { timestamp: new Date(), message: error.message },
      ...this.state.errors.slice(0, 9),
    ];

    if (this.config.onError) {
      this.config.onError(error);
    }
  }
}

// =============================================================================
// Multi-Platform Sync Manager
// =============================================================================

export interface MultiSyncConfig {
  /** Callback when any platform syncs */
  onSync?: (platform: string, markets: PlatformMarket[]) => Promise<void>;
  /** Callback on sync error */
  onError?: (platform: string, error: Error) => void;
}

/**
 * Manages sync services for multiple platforms
 */
export class MultiPlatformSyncManager {
  private services: Map<string, MarketSyncService> = new Map();
  private config: MultiSyncConfig;

  constructor(config: MultiSyncConfig = {}) {
    this.config = config;
  }

  /**
   * Add a platform adapter to sync
   */
  addPlatform(
    adapter: IPlatformAdapter,
    syncConfig: Partial<SyncConfig> = {}
  ): void {
    const platform = adapter.platform;

    // Wrap callbacks to include platform identifier
    const wrappedConfig: Partial<SyncConfig> = {
      ...syncConfig,
      onSync: async (markets) => {
        if (syncConfig.onSync) {
          await syncConfig.onSync(markets);
        }
        if (this.config.onSync) {
          await this.config.onSync(platform, markets);
        }
      },
      onError: (error) => {
        if (syncConfig.onError) {
          syncConfig.onError(error);
        }
        if (this.config.onError) {
          this.config.onError(platform, error);
        }
      },
    };

    const service = new MarketSyncService(adapter, wrappedConfig);
    this.services.set(platform, service);
  }

  /**
   * Remove a platform from syncing
   */
  removePlatform(platform: string): void {
    const service = this.services.get(platform);
    if (service) {
      service.stop();
      this.services.delete(platform);
    }
  }

  /**
   * Start all sync services
   */
  startAll(): void {
    for (const service of this.services.values()) {
      service.start();
    }
  }

  /**
   * Stop all sync services
   */
  stopAll(): void {
    for (const service of this.services.values()) {
      service.stop();
    }
  }

  /**
   * Get sync state for a specific platform
   */
  getState(platform: string): Readonly<SyncState> | null {
    const service = this.services.get(platform);
    return service ? service.getState() : null;
  }

  /**
   * Get sync states for all platforms
   */
  getAllStates(): Record<string, SyncState> {
    const states: Record<string, SyncState> = {};
    for (const [platform, service] of this.services.entries()) {
      states[platform] = service.getState();
    }
    return states;
  }

  /**
   * Health check all platforms
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [platform, service] of this.services.entries()) {
      results[platform] = await service.healthCheck();
    }
    return results;
  }
}
