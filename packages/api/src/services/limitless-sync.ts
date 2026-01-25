/**
 * Limitless Sync Service
 * Syncs markets, prices, and positions from Limitless Exchange to the database
 */

import { prisma } from '../lib/prisma';
import { LimitlessAdapter } from '@calibr/adapters';
import type { PlatformMarket } from '@calibr/adapters';
import type { MarketCategory } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface SyncResult {
  success: boolean;
  syncedAt: Date;
  duration: number;
  marketsCreated: number;
  marketsUpdated: number;
  pricesUpdated: number;
  errors: string[];
}

export interface SyncOptions {
  batchSize?: number;
  maxPages?: number;
  activeOnly?: boolean;
}

// =============================================================================
// Limitless Sync Service
// =============================================================================

export class LimitlessSyncService {
  private adapter: LimitlessAdapter;
  private platformConfigId: string | null = null;

  constructor() {
    this.adapter = new LimitlessAdapter();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Ensure platform config exists in database
   */
  async ensurePlatformConfig(): Promise<string> {
    if (this.platformConfigId) {
      return this.platformConfigId;
    }

    const existing = await prisma.platformConfig.findUnique({
      where: { slug: 'limitless' },
    });

    if (existing) {
      this.platformConfigId = existing.id;
      return existing.id;
    }

    const created = await prisma.platformConfig.create({
      data: {
        name: 'Limitless',
        slug: 'limitless',
        displayName: 'Limitless Exchange',
        apiBaseUrl: 'https://api.limitless.exchange',
        wsUrl: undefined,
        chainId: 8453, // Base
        supportsTrades: true,
        supportsRealTime: true,
        requiresKyc: false,
        isActive: true,
        healthStatus: 'UNKNOWN',
      },
    });

    this.platformConfigId = created.id;
    return created.id;
  }

  // ===========================================================================
  // Market Sync
  // ===========================================================================

  /**
   * Sync all active markets from Limitless
   */
  // Limitless API page size is fixed at 25
  private static readonly API_PAGE_SIZE = 25;

  async syncMarkets(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let marketsCreated = 0;
    let marketsUpdated = 0;
    let pricesUpdated = 0;

    // Use API page size of 25, with enough pages to cover all markets (363/25 ≈ 15)
    const batchSize = options.batchSize ?? LimitlessSyncService.API_PAGE_SIZE;
    const maxPages = options.maxPages ?? 20;
    const activeOnly = options.activeOnly ?? true;

    try {
      // Ensure platform config exists
      const platformConfigId = await this.ensurePlatformConfig();

      // Log sync start
      const syncLog = await prisma.syncLog.create({
        data: {
          platform: 'LIMITLESS',
          syncType: 'MARKETS',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      let page = 1;
      let hasMore = true;

      while (hasMore && page <= maxPages) {
        try {
          const offset = (page - 1) * batchSize;

          const markets = await this.adapter.getMarkets({
            limit: batchSize,
            offset,
            status: activeOnly ? 'ACTIVE' : undefined,
            sortBy: 'volume',
            sortOrder: 'desc',
          });

          if (markets.length === 0) {
            hasMore = false;
            break;
          }

          // Process batch
          for (const market of markets) {
            try {
              const result = await this.upsertMarket(market, platformConfigId);
              if (result.created) {
                marketsCreated++;
              } else {
                marketsUpdated++;
              }
              pricesUpdated++;
            } catch (error) {
              const msg = `Failed to sync market ${market.externalId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(msg);
              console.error('[Limitless Sync]', msg);
            }
          }

          hasMore = markets.length === batchSize;
          page++;

          // Delay between batches to avoid rate limiting (429 errors)
          await this.sleep(250);
        } catch (error) {
          const msg = `Failed to fetch markets page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(msg);
          console.error('[Limitless Sync]', msg);
          break;
        }
      }

      const duration = Date.now() - startTime;

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length === 0 ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
          durationMs: duration,
          marketsUpdated: marketsCreated + marketsUpdated,
          pricesUpdated,
          errors: errors.length,
          errorDetails: errors.length > 0 ? errors : undefined,
        },
      });

      // Update platform health
      await prisma.platformConfig.update({
        where: { id: platformConfigId },
        data: {
          healthStatus: errors.length === 0 ? 'HEALTHY' : 'DEGRADED',
          lastHealthCheck: new Date(),
        },
      });

      console.log(`[Limitless Sync] Completed: ${marketsCreated} created, ${marketsUpdated} updated, ${errors.length} errors`);

      return {
        success: errors.length === 0,
        syncedAt: new Date(),
        duration,
        marketsCreated,
        marketsUpdated,
        pricesUpdated,
        errors,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const msg = `Market sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(msg);

      return {
        success: false,
        syncedAt: new Date(),
        duration,
        marketsCreated,
        marketsUpdated,
        pricesUpdated,
        errors,
      };
    }
  }

  /**
   * Upsert a single market to the database
   */
  private async upsertMarket(
    market: PlatformMarket,
    platformConfigId: string
  ): Promise<{ created: boolean }> {
    const existing = await prisma.platformMarket.findUnique({
      where: {
        platformConfigId_externalId: {
          platformConfigId,
          externalId: market.externalId,
        },
      },
    });

    const marketData = {
      question: market.question,
      description: market.description,
      url: market.url,
      yesPrice: this.toFloat(market.yesPrice),
      noPrice: this.toFloat(market.noPrice),
      lastPrice: this.toFloat(market.lastPrice),
      volume: this.toFloat(market.volume) ?? 0,
      liquidity: this.toFloat(market.liquidity) ?? 0,
      bestBid: this.toFloat(market.bestBid),
      bestAsk: this.toFloat(market.bestAsk),
      spread: this.toFloat(market.spread),
      isActive: market.status === 'ACTIVE',
      closesAt: market.closesAt,
      resolvedAt: market.resolvedAt,
      resolution: market.resolution,
      platformData: market.platformData as object,
      syncedAt: new Date(),
    };

    if (existing) {
      await prisma.platformMarket.update({
        where: { id: existing.id },
        data: marketData,
      });

      // Create price snapshot
      await this.createPriceSnapshot(existing.id, market);

      return { created: false };
    }

    const created = await prisma.platformMarket.create({
      data: {
        platformConfigId,
        externalId: market.externalId,
        ...marketData,
      },
    });

    // Create initial price snapshot
    await this.createPriceSnapshot(created.id, market);

    // Try to link to unified market
    await this.linkToUnifiedMarket(created.id, market);

    return { created: true };
  }

  /**
   * Create a price snapshot for historical tracking
   */
  private async createPriceSnapshot(
    platformMarketId: string,
    market: PlatformMarket
  ): Promise<void> {
    const yesPrice = this.toFloat(market.yesPrice);
    const noPrice = this.toFloat(market.noPrice);

    if (yesPrice === null || noPrice === null) {
      return;
    }

    await prisma.priceSnapshot.create({
      data: {
        platformMarketId,
        yesPrice,
        noPrice,
        volume: this.toFloat(market.volume) ?? 0,
        liquidity: this.toFloat(market.liquidity) ?? 0,
        bestBid: this.toFloat(market.bestBid),
        bestAsk: this.toFloat(market.bestAsk),
      },
    });
  }

  /**
   * Link platform market to unified market (create if needed)
   */
  private async linkToUnifiedMarket(
    platformMarketId: string,
    market: PlatformMarket
  ): Promise<void> {
    // Generate slug from question
    const slug = this.generateSlug(market.question);

    // Check for existing unified market with similar question
    let unifiedMarket = await prisma.unifiedMarket.findUnique({
      where: { slug },
    });

    if (!unifiedMarket) {
      // Create new unified market
      unifiedMarket = await prisma.unifiedMarket.create({
        data: {
          question: market.question,
          description: market.description,
          slug,
          category: market.category as MarketCategory | undefined,
          tags: market.tags,
          bestYesPrice: this.toFloat(market.yesPrice),
          bestNoPrice: this.toFloat(market.noPrice),
          bestYesPlatform: 'LIMITLESS',
          bestNoPlatform: 'LIMITLESS',
          totalVolume: this.toFloat(market.volume) ?? 0,
          totalLiquidity: this.toFloat(market.liquidity) ?? 0,
          currentSpread: this.toFloat(market.spread),
          isActive: market.status === 'ACTIVE',
          resolutionDate: market.closesAt,
        },
      });
    } else {
      // Update unified market with best prices across platforms
      const updates: Record<string, unknown> = {};
      const yesPrice = this.toFloat(market.yesPrice);
      const noPrice = this.toFloat(market.noPrice);

      // Check if Limitless has better YES price (higher is better for sellers)
      if (yesPrice !== null && (unifiedMarket.bestYesPrice === null || yesPrice > unifiedMarket.bestYesPrice)) {
        updates.bestYesPrice = yesPrice;
        updates.bestYesPlatform = 'LIMITLESS';
      }

      // Check if Limitless has better NO price
      if (noPrice !== null && (unifiedMarket.bestNoPrice === null || noPrice > unifiedMarket.bestNoPrice)) {
        updates.bestNoPrice = noPrice;
        updates.bestNoPlatform = 'LIMITLESS';
      }

      // Update total volume and liquidity
      updates.totalVolume = (unifiedMarket.totalVolume || 0) + (this.toFloat(market.volume) ?? 0);
      updates.totalLiquidity = (unifiedMarket.totalLiquidity || 0) + (this.toFloat(market.liquidity) ?? 0);

      if (Object.keys(updates).length > 0) {
        await prisma.unifiedMarket.update({
          where: { id: unifiedMarket.id },
          data: updates,
        });
      }
    }

    // Link platform market to unified market
    await prisma.platformMarket.update({
      where: { id: platformMarketId },
      data: { unifiedMarketId: unifiedMarket.id },
    });
  }

  // ===========================================================================
  // Price Sync
  // ===========================================================================

  /**
   * Sync prices for active markets (faster, targeted update)
   */
  async syncPrices(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let pricesUpdated = 0;

    try {
      const platformConfigId = await this.ensurePlatformConfig();

      // Get only active, non-expired platform markets
      // Skip resolved markets as they don't have orderbooks
      const activeMarkets = await prisma.platformMarket.findMany({
        where: {
          platformConfigId,
          isActive: true,
          resolvedAt: null, // Not resolved
          OR: [
            { closesAt: null },
            { closesAt: { gt: new Date() } }, // Not yet closed
          ],
        },
        select: {
          id: true,
          externalId: true,
          platformData: true,
        },
      });

      // Log sync start
      const syncLog = await prisma.syncLog.create({
        data: {
          platform: 'LIMITLESS',
          syncType: 'PRICES',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Process in batches - smaller batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < activeMarkets.length; i += batchSize) {
        const batch = activeMarkets.slice(i, i + batchSize);

        // Process batch sequentially to avoid rate limiting
        for (const dbMarket of batch) {
          try {
            const platformData = dbMarket.platformData as { slug?: string } | null;
            const slug = platformData?.slug || dbMarket.externalId;

            // Get prices from orderbook (may fail for resolved markets)
            const prices = await this.adapter.getMarketPrices(slug);

            await prisma.platformMarket.update({
              where: { id: dbMarket.id },
              data: {
                yesPrice: prices.yesPrice,
                noPrice: prices.noPrice,
                lastPrice: prices.yesPrice,
                spread: prices.spread,
                syncedAt: new Date(),
              },
            });

            // Create price snapshot
            await prisma.priceSnapshot.create({
              data: {
                platformMarketId: dbMarket.id,
                yesPrice: prices.yesPrice,
                noPrice: prices.noPrice,
                volume: 0,
                liquidity: 0,
              },
            });

            pricesUpdated++;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown';
            // Skip 400 (resolved market) and 404 (market removed) errors
            if (errMsg.includes('404')) {
              // Market was removed from Limitless - mark as inactive
              await prisma.platformMarket.update({
                where: { id: dbMarket.id },
                data: {
                  isActive: false,
                  syncedAt: new Date(),
                },
              });
              console.log(`[Limitless] Market ${dbMarket.externalId} not found (404), marked inactive`);
            } else if (!errMsg.includes('400')) {
              errors.push(
                `Failed to sync prices for ${dbMarket.externalId}: ${errMsg}`
              );
            }
          }

          // Small delay between requests to avoid rate limiting
          await this.sleep(100);
        }

        // Small delay between batches
        await this.sleep(50);
      }

      const duration = Date.now() - startTime;

      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length === 0 ? 'SUCCESS' : 'FAILED',
          completedAt: new Date(),
          durationMs: duration,
          pricesUpdated,
          errors: errors.length,
          errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
        },
      });

      return {
        success: errors.length === 0,
        syncedAt: new Date(),
        duration,
        marketsCreated: 0,
        marketsUpdated: 0,
        pricesUpdated,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        syncedAt: new Date(),
        duration: Date.now() - startTime,
        marketsCreated: 0,
        marketsUpdated: 0,
        pricesUpdated,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Health check for the sync service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
    const [adapterHealth, dbHealth] = await Promise.all([
      this.adapter.healthCheck().catch(() => false),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ]);

    return {
      healthy: adapterHealth && dbHealth,
      details: {
        limitlessApi: adapterHealth,
        database: dbHealth,
      },
    };
  }

  /**
   * Get sync statistics
   */
  async getStats(): Promise<{
    totalMarkets: number;
    activeMarkets: number;
    lastSync: Date | null;
    recentErrors: number;
  }> {
    const platformConfigId = await this.ensurePlatformConfig();

    const [totalMarkets, activeMarkets, lastSync, recentErrors] = await Promise.all([
      prisma.platformMarket.count({ where: { platformConfigId } }),
      prisma.platformMarket.count({ where: { platformConfigId, isActive: true } }),
      prisma.syncLog
        .findFirst({
          where: { platform: 'LIMITLESS', status: 'SUCCESS' },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        })
        .then((r) => r?.completedAt ?? null),
      prisma.syncLog.count({
        where: {
          platform: 'LIMITLESS',
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      totalMarkets,
      activeMarkets,
      lastSync,
      recentErrors,
    };
  }

  private generateSlug(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100);
  }

  private toFloat(val: unknown): number | null {
    if (val === undefined || val === null) return null;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? null : num;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const limitlessSync = new LimitlessSyncService();
