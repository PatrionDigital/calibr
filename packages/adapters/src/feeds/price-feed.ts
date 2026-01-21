/**
 * Price Feed Service
 * Provides real-time price updates from prediction market platforms
 */

import type { IPlatformAdapter, PlatformMarket } from '../types';
import { RedisCache, CacheKeys } from '../cache';

// =============================================================================
// Types
// =============================================================================

export interface PriceUpdate {
  platform: string;
  marketId: string;
  tokenId: string;
  price: number;
  side: 'yes' | 'no';
  timestamp: Date;
  change?: number;
  changePercent?: number;
}

export interface PriceFeedConfig {
  /** Update interval in milliseconds */
  intervalMs: number;
  /** Markets to track (if empty, tracks all active markets) */
  marketIds?: string[];
  /** Maximum concurrent price fetches */
  concurrency: number;
  /** Cache instance for storing prices */
  cache?: RedisCache;
  /** Cache TTL for prices in milliseconds */
  cacheTtlMs: number;
  /** Callback when prices update */
  onUpdate?: (updates: PriceUpdate[]) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface PriceFeedState {
  isRunning: boolean;
  lastUpdateAt: Date | null;
  trackedMarkets: number;
  updatesPerMinute: number;
  errors: Array<{ timestamp: Date; message: string }>;
}

interface TrackedMarket {
  marketId: string;
  tokenIds: string[];
  lastPrices: Map<string, number>;
}

// =============================================================================
// Price Feed Service
// =============================================================================

export class PriceFeedService {
  private adapter: IPlatformAdapter;
  private config: PriceFeedConfig;
  private state: PriceFeedState;
  private trackedMarkets: Map<string, TrackedMarket> = new Map();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private updateCount = 0;
  private lastMinuteReset = Date.now();

  constructor(adapter: IPlatformAdapter, config: Partial<PriceFeedConfig> = {}) {
    this.adapter = adapter;
    this.config = {
      intervalMs: config.intervalMs ?? 5000, // 5 seconds default
      marketIds: config.marketIds,
      concurrency: config.concurrency ?? 10,
      cache: config.cache,
      cacheTtlMs: config.cacheTtlMs ?? 10000, // 10 second cache
      onUpdate: config.onUpdate,
      onError: config.onError,
    };
    this.state = {
      isRunning: false,
      lastUpdateAt: null,
      trackedMarkets: 0,
      updatesPerMinute: 0,
      errors: [],
    };
  }

  // ===========================================================================
  // Control Methods
  // ===========================================================================

  /**
   * Start the price feed
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    this.state.isRunning = true;

    // Initialize tracked markets
    await this.initializeMarkets();

    // Run initial update
    await this.runUpdate();

    // Set up interval
    this.intervalHandle = setInterval(async () => {
      try {
        await this.runUpdate();
      } catch (error) {
        this.handleError(error instanceof Error ? error : new Error(String(error)));
      }
    }, this.config.intervalMs);
  }

  /**
   * Stop the price feed
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.state.isRunning = false;
  }

  /**
   * Add a market to track
   */
  async addMarket(marketId: string): Promise<void> {
    if (this.trackedMarkets.has(marketId)) {
      return;
    }

    const market = await this.adapter.getMarket(marketId);
    if (!market) {
      throw new Error(`Market not found: ${marketId}`);
    }

    const tokenIds = this.extractTokenIds(market);
    this.trackedMarkets.set(marketId, {
      marketId,
      tokenIds,
      lastPrices: new Map(),
    });
    this.state.trackedMarkets = this.trackedMarkets.size;
  }

  /**
   * Remove a market from tracking
   */
  removeMarket(marketId: string): void {
    this.trackedMarkets.delete(marketId);
    this.state.trackedMarkets = this.trackedMarkets.size;
  }

  /**
   * Get the current state
   */
  getState(): Readonly<PriceFeedState> {
    return { ...this.state };
  }

  /**
   * Get current price for a market
   */
  async getPrice(marketId: string, side: 'yes' | 'no' = 'yes'): Promise<number | null> {
    const tracked = this.trackedMarkets.get(marketId);
    if (!tracked) {
      return null;
    }

    const tokenIndex = side === 'yes' ? 0 : 1;
    const tokenId = tracked.tokenIds[tokenIndex];
    if (!tokenId) {
      return null;
    }

    // Check cache first
    if (this.config.cache) {
      const cacheKey = CacheKeys.price(this.adapter.platform, tokenId);
      const cached = await this.config.cache.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    return tracked.lastPrices.get(tokenId) ?? null;
  }

  /**
   * Get all current prices
   */
  getAllPrices(): Map<string, { yes: number | null; no: number | null }> {
    const prices = new Map<string, { yes: number | null; no: number | null }>();

    for (const [marketId, tracked] of this.trackedMarkets) {
      const yesTokenId = tracked.tokenIds[0];
      const noTokenId = tracked.tokenIds[1];

      prices.set(marketId, {
        yes: yesTokenId ? (tracked.lastPrices.get(yesTokenId) ?? null) : null,
        no: noTokenId ? (tracked.lastPrices.get(noTokenId) ?? null) : null,
      });
    }

    return prices;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private async initializeMarkets(): Promise<void> {
    if (this.config.marketIds && this.config.marketIds.length > 0) {
      // Track specific markets
      for (const marketId of this.config.marketIds) {
        try {
          await this.addMarket(marketId);
        } catch (error) {
          this.handleError(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
    } else {
      // Track all active markets
      const markets = await this.adapter.getMarkets({
        status: 'ACTIVE',
        limit: 100,
        sortBy: 'volume',
        sortOrder: 'desc',
      });

      for (const market of markets) {
        const tokenIds = this.extractTokenIds(market);
        if (tokenIds.length > 0) {
          this.trackedMarkets.set(market.id, {
            marketId: market.id,
            tokenIds,
            lastPrices: new Map(),
          });
        }
      }
      this.state.trackedMarkets = this.trackedMarkets.size;
    }
  }

  private async runUpdate(): Promise<void> {
    const updates: PriceUpdate[] = [];
    const markets = Array.from(this.trackedMarkets.values());

    // Process in batches for concurrency control
    for (let i = 0; i < markets.length; i += this.config.concurrency) {
      const batch = markets.slice(i, i + this.config.concurrency);
      const batchUpdates = await Promise.all(
        batch.map((market) => this.updateMarketPrices(market))
      );
      updates.push(...batchUpdates.flat());
    }

    // Update state
    this.state.lastUpdateAt = new Date();
    this.updateCount += updates.length;
    this.updateUpdatesPerMinute();

    // Call callback
    if (this.config.onUpdate && updates.length > 0) {
      this.config.onUpdate(updates);
    }
  }

  private async updateMarketPrices(tracked: TrackedMarket): Promise<PriceUpdate[]> {
    const updates: PriceUpdate[] = [];

    for (let i = 0; i < tracked.tokenIds.length; i++) {
      const tokenId = tracked.tokenIds[i];
      if (!tokenId) continue;

      const side: 'yes' | 'no' = i === 0 ? 'yes' : 'no';

      try {
        // Get orderbook for best price
        const orderBook = await this.adapter.getOrderBook(tokenId);
        const price = orderBook.bestBid ?? orderBook.bestAsk ?? 0;

        // Calculate change
        const lastPrice = tracked.lastPrices.get(tokenId);
        let change: number | undefined;
        let changePercent: number | undefined;

        if (lastPrice !== undefined && lastPrice > 0) {
          change = price - lastPrice;
          changePercent = (change / lastPrice) * 100;
        }

        // Update tracked price
        tracked.lastPrices.set(tokenId, price);

        // Cache the price
        if (this.config.cache) {
          const cacheKey = CacheKeys.price(this.adapter.platform, tokenId);
          await this.config.cache.set(cacheKey, price, this.config.cacheTtlMs);
        }

        // Add to updates if price changed
        if (lastPrice === undefined || Math.abs(price - lastPrice) > 0.0001) {
          updates.push({
            platform: this.adapter.platform,
            marketId: tracked.marketId,
            tokenId,
            price,
            side,
            timestamp: new Date(),
            change,
            changePercent,
          });
        }
      } catch (error) {
        // Log but don't fail the entire update
        this.handleError(
          new Error(`Failed to update price for ${tokenId}: ${error}`)
        );
      }
    }

    return updates;
  }

  private extractTokenIds(market: PlatformMarket): string[] {
    const platformData = market.platformData as Record<string, unknown> | undefined;
    if (!platformData) {
      return [];
    }

    const clobTokenIds = platformData.clobTokenIds;
    if (Array.isArray(clobTokenIds)) {
      return clobTokenIds as string[];
    }

    return [];
  }

  private updateUpdatesPerMinute(): void {
    const now = Date.now();
    if (now - this.lastMinuteReset >= 60000) {
      this.state.updatesPerMinute = this.updateCount;
      this.updateCount = 0;
      this.lastMinuteReset = now;
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
// Price Aggregator
// =============================================================================

export interface PriceAggregatorConfig {
  /** Callback when any price updates */
  onUpdate?: (platform: string, updates: PriceUpdate[]) => void;
  /** Callback on error */
  onError?: (platform: string, error: Error) => void;
}

/**
 * Aggregates price feeds from multiple platforms
 */
export class PriceAggregator {
  private feeds: Map<string, PriceFeedService> = new Map();
  private config: PriceAggregatorConfig;

  constructor(config: PriceAggregatorConfig = {}) {
    this.config = config;
  }

  /**
   * Add a platform's price feed
   */
  addFeed(
    adapter: IPlatformAdapter,
    feedConfig: Partial<PriceFeedConfig> = {}
  ): void {
    const platform = adapter.platform;

    // Wrap callbacks
    const wrappedConfig: Partial<PriceFeedConfig> = {
      ...feedConfig,
      onUpdate: (updates) => {
        if (feedConfig.onUpdate) {
          feedConfig.onUpdate(updates);
        }
        if (this.config.onUpdate) {
          this.config.onUpdate(platform, updates);
        }
      },
      onError: (error) => {
        if (feedConfig.onError) {
          feedConfig.onError(error);
        }
        if (this.config.onError) {
          this.config.onError(platform, error);
        }
      },
    };

    const feed = new PriceFeedService(adapter, wrappedConfig);
    this.feeds.set(platform, feed);
  }

  /**
   * Remove a platform's price feed
   */
  removeFeed(platform: string): void {
    const feed = this.feeds.get(platform);
    if (feed) {
      feed.stop();
      this.feeds.delete(platform);
    }
  }

  /**
   * Start all price feeds
   */
  async startAll(): Promise<void> {
    await Promise.all(
      Array.from(this.feeds.values()).map((feed) => feed.start())
    );
  }

  /**
   * Stop all price feeds
   */
  stopAll(): void {
    for (const feed of this.feeds.values()) {
      feed.stop();
    }
  }

  /**
   * Get states for all feeds
   */
  getAllStates(): Record<string, PriceFeedState> {
    const states: Record<string, PriceFeedState> = {};
    for (const [platform, feed] of this.feeds) {
      states[platform] = feed.getState();
    }
    return states;
  }

  /**
   * Get a specific feed
   */
  getFeed(platform: string): PriceFeedService | undefined {
    return this.feeds.get(platform);
  }
}
