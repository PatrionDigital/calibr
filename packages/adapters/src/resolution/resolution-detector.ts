/**
 * Resolution Detection Service
 * Monitors markets for resolutions and triggers callbacks
 */

import type { IPlatformAdapter, PlatformMarket, MarketStatus } from '../types';
import { RedisCache } from '../cache';

// =============================================================================
// Types
// =============================================================================

export interface MarketResolution {
  platform: string;
  marketId: string;
  externalId: string;
  question: string;
  resolution: string;
  resolvedAt: Date;
  previousStatus: MarketStatus;
  finalYesPrice?: number;
  finalNoPrice?: number;
}

export interface ResolutionDetectorConfig {
  /** Polling interval in milliseconds */
  intervalMs: number;
  /** Maximum markets to check per cycle */
  batchSize: number;
  /** Cache instance for storing market states */
  cache?: RedisCache;
  /** Callback when resolution is detected */
  onResolution?: (resolution: MarketResolution) => Promise<void>;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface ResolutionDetectorState {
  isRunning: boolean;
  lastCheckAt: Date | null;
  marketsMonitored: number;
  resolutionsDetected: number;
  errors: Array<{ timestamp: Date; message: string }>;
}

interface MonitoredMarket {
  marketId: string;
  externalId: string;
  question: string;
  lastStatus: MarketStatus;
  lastYesPrice?: number;
  lastNoPrice?: number;
  lastCheckedAt: Date;
}

// =============================================================================
// Resolution Detector Service
// =============================================================================

export class ResolutionDetectorService {
  private adapter: IPlatformAdapter;
  private config: ResolutionDetectorConfig;
  private state: ResolutionDetectorState;
  private monitoredMarkets: Map<string, MonitoredMarket> = new Map();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: IPlatformAdapter, config: Partial<ResolutionDetectorConfig> = {}) {
    this.adapter = adapter;
    this.config = {
      intervalMs: config.intervalMs ?? 60000, // 1 minute default
      batchSize: config.batchSize ?? 50,
      cache: config.cache,
      onResolution: config.onResolution,
      onError: config.onError,
    };
    this.state = {
      isRunning: false,
      lastCheckAt: null,
      marketsMonitored: 0,
      resolutionsDetected: 0,
      errors: [],
    };
  }

  // ===========================================================================
  // Control Methods
  // ===========================================================================

  /**
   * Start monitoring for resolutions
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    this.state.isRunning = true;

    // Initialize by loading active markets
    await this.initializeMarkets();

    // Run initial check
    await this.runCheck();

    // Set up interval
    this.intervalHandle = setInterval(async () => {
      try {
        await this.runCheck();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }, this.config.intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.state.isRunning = false;
  }

  /**
   * Add a market to monitor
   */
  addMarket(market: PlatformMarket): void {
    if (this.monitoredMarkets.has(market.id)) {
      return;
    }

    this.monitoredMarkets.set(market.id, {
      marketId: market.id,
      externalId: market.externalId,
      question: market.question,
      lastStatus: market.status,
      lastYesPrice: market.yesPrice,
      lastNoPrice: market.noPrice,
      lastCheckedAt: new Date(),
    });

    this.state.marketsMonitored = this.monitoredMarkets.size;
  }

  /**
   * Remove a market from monitoring
   */
  removeMarket(marketId: string): void {
    this.monitoredMarkets.delete(marketId);
    this.state.marketsMonitored = this.monitoredMarkets.size;
  }

  /**
   * Get the current state
   */
  getState(): Readonly<ResolutionDetectorState> {
    return { ...this.state };
  }

  /**
   * Get all monitored markets
   */
  getMonitoredMarkets(): MonitoredMarket[] {
    return Array.from(this.monitoredMarkets.values());
  }

  /**
   * Force check a specific market
   */
  async checkMarket(marketId: string): Promise<MarketResolution | null> {
    const monitored = this.monitoredMarkets.get(marketId);
    if (!monitored) {
      return null;
    }

    const market = await this.adapter.getMarket(marketId);
    if (!market) {
      return null;
    }

    return this.detectResolution(monitored, market);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async initializeMarkets(): Promise<void> {
    // Load active markets to monitor
    const markets = await this.adapter.getMarkets({
      status: 'ACTIVE',
      limit: this.config.batchSize * 2, // Get more to have a buffer
      sortBy: 'volume',
      sortOrder: 'desc',
    });

    for (const market of markets) {
      this.addMarket(market);
    }
  }

  private async runCheck(): Promise<void> {
    const resolutions: MarketResolution[] = [];
    const marketsToCheck = Array.from(this.monitoredMarkets.values());

    // Check markets in batches
    for (let i = 0; i < marketsToCheck.length; i += this.config.batchSize) {
      const batch = marketsToCheck.slice(i, i + this.config.batchSize);

      // Fetch current market states
      const marketPromises = batch.map(async (monitored) => {
        try {
          const market = await this.adapter.getMarket(monitored.marketId);
          return { monitored, market };
        } catch (error) {
          this.handleError(
            new Error(`Failed to fetch market ${monitored.marketId}: ${error}`)
          );
          return { monitored, market: null };
        }
      });

      const results = await Promise.all(marketPromises);

      for (const { monitored, market } of results) {
        if (!market) continue;

        const resolution = this.detectResolution(monitored, market);
        if (resolution) {
          resolutions.push(resolution);

          // Remove from monitoring since it's resolved
          this.monitoredMarkets.delete(monitored.marketId);
        } else {
          // Update monitored state
          monitored.lastStatus = market.status;
          monitored.lastYesPrice = market.yesPrice;
          monitored.lastNoPrice = market.noPrice;
          monitored.lastCheckedAt = new Date();
        }
      }
    }

    // Update state
    this.state.lastCheckAt = new Date();
    this.state.marketsMonitored = this.monitoredMarkets.size;
    this.state.resolutionsDetected += resolutions.length;

    // Trigger callbacks for resolutions
    for (const resolution of resolutions) {
      if (this.config.onResolution) {
        try {
          await this.config.onResolution(resolution);
        } catch (error) {
          this.handleError(
            new Error(`Resolution callback failed for ${resolution.marketId}: ${error}`)
          );
        }
      }

      // Cache the resolution
      if (this.config.cache) {
        const cacheKey = `resolution:${this.adapter.platform}:${resolution.marketId}`;
        await this.config.cache.set(cacheKey, resolution, 86400000); // 24 hour cache
      }
    }

    // Refresh monitored markets periodically
    if (resolutions.length > 0 || this.monitoredMarkets.size < this.config.batchSize) {
      await this.refreshMonitoredMarkets();
    }
  }

  private detectResolution(
    monitored: MonitoredMarket,
    current: PlatformMarket
  ): MarketResolution | null {
    // Check if status changed to RESOLVED
    if (
      monitored.lastStatus !== 'RESOLVED' &&
      current.status === 'RESOLVED' &&
      current.resolution
    ) {
      return {
        platform: this.adapter.platform,
        marketId: current.id,
        externalId: current.externalId,
        question: current.question,
        resolution: current.resolution,
        resolvedAt: current.resolvedAt ?? new Date(),
        previousStatus: monitored.lastStatus,
        finalYesPrice: current.yesPrice,
        finalNoPrice: current.noPrice,
      };
    }

    // Check if market closed (might indicate resolution soon or cancellation)
    if (monitored.lastStatus === 'ACTIVE' && current.status === 'CLOSED') {
      // Market closed but not resolved yet - keep monitoring
      monitored.lastStatus = current.status;
    }

    return null;
  }

  private async refreshMonitoredMarkets(): Promise<void> {
    const markets = await this.adapter.getMarkets({
      status: 'ACTIVE',
      limit: this.config.batchSize,
      sortBy: 'closes',
      sortOrder: 'asc', // Markets closing soon first
    });

    for (const market of markets) {
      if (!this.monitoredMarkets.has(market.id)) {
        this.addMarket(market);
      }
    }
  }

  private handleError(error: Error): void {
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
// Resolution History Service
// =============================================================================

export interface ResolutionHistoryConfig {
  /** Cache instance for storing history */
  cache: RedisCache;
  /** Maximum history entries to keep per platform */
  maxHistory: number;
}

/**
 * Tracks resolution history across platforms
 */
export class ResolutionHistoryService {
  private cache: RedisCache;
  private config: ResolutionHistoryConfig;
  private inMemoryHistory: Map<string, MarketResolution[]> = new Map();

  constructor(config: ResolutionHistoryConfig) {
    this.cache = config.cache;
    this.config = {
      cache: config.cache,
      maxHistory: config.maxHistory ?? 1000,
    };
  }

  /**
   * Add a resolution to history
   */
  async addResolution(resolution: MarketResolution): Promise<void> {
    // Add to in-memory history
    const platform = resolution.platform;
    const history = this.inMemoryHistory.get(platform) ?? [];
    history.unshift(resolution);

    // Trim to max size
    if (history.length > this.config.maxHistory) {
      history.pop();
    }

    this.inMemoryHistory.set(platform, history);

    // Cache individual resolution
    const cacheKey = `resolution:${platform}:${resolution.marketId}`;
    await this.cache.set(cacheKey, resolution, 86400000 * 7); // 7 day cache

    // Cache history list
    const historyKey = `resolution_history:${platform}`;
    await this.cache.set(historyKey, history, 86400000); // 24 hour cache
  }

  /**
   * Get resolution by market ID
   */
  async getResolution(
    platform: string,
    marketId: string
  ): Promise<MarketResolution | null> {
    const cacheKey = `resolution:${platform}:${marketId}`;
    return this.cache.get<MarketResolution>(cacheKey);
  }

  /**
   * Get recent resolutions for a platform
   */
  async getRecentResolutions(
    platform: string,
    limit = 50
  ): Promise<MarketResolution[]> {
    // Check in-memory first
    const inMemory = this.inMemoryHistory.get(platform);
    if (inMemory && inMemory.length > 0) {
      return inMemory.slice(0, limit);
    }

    // Try cache
    const historyKey = `resolution_history:${platform}`;
    const cached = await this.cache.get<MarketResolution[]>(historyKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    return [];
  }

  /**
   * Get resolutions within a time range
   */
  async getResolutionsByTimeRange(
    platform: string,
    startDate: Date,
    endDate: Date
  ): Promise<MarketResolution[]> {
    const all = await this.getRecentResolutions(platform, this.config.maxHistory);
    return all.filter(
      (r) => r.resolvedAt >= startDate && r.resolvedAt <= endDate
    );
  }

  /**
   * Get resolution stats for a platform
   */
  async getStats(platform: string): Promise<{
    total: number;
    last24h: number;
    last7d: number;
  }> {
    const all = await this.getRecentResolutions(platform, this.config.maxHistory);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 86400000 * 7);

    return {
      total: all.length,
      last24h: all.filter((r) => r.resolvedAt >= oneDayAgo).length,
      last7d: all.filter((r) => r.resolvedAt >= sevenDaysAgo).length,
    };
  }
}
