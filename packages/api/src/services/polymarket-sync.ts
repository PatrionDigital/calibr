/**
 * Polymarket Sync Service
 * Syncs markets, prices, and positions from Polymarket to the database
 */

import { prisma } from '../lib/prisma';
import { PolymarketAdapter } from '@calibr/adapters';
import type { PlatformMarket, PlatformPosition } from '@calibr/adapters';
import type { Platform, SyncStatus, MarketCategory } from '@prisma/client';

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

export interface PositionSyncResult {
  success: boolean;
  syncedAt: Date;
  positionsCreated: number;
  positionsUpdated: number;
  errors: string[];
}

export interface SyncOptions {
  batchSize?: number;
  maxPages?: number;
  activeOnly?: boolean;
}

// =============================================================================
// Polymarket Sync Service
// =============================================================================

export class PolymarketSyncService {
  private adapter: PolymarketAdapter;
  private platformConfigId: string | null = null;

  constructor() {
    this.adapter = new PolymarketAdapter();
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
      where: { slug: 'polymarket' },
    });

    if (existing) {
      this.platformConfigId = existing.id;
      return existing.id;
    }

    const created = await prisma.platformConfig.create({
      data: {
        name: 'Polymarket',
        slug: 'polymarket',
        displayName: 'Polymarket',
        apiBaseUrl: 'https://gamma-api.polymarket.com',
        wsUrl: 'wss://ws-subscriptions-clob.polymarket.com',
        chainId: 137,
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
   * Sync all active markets from Polymarket
   */
  async syncMarkets(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let marketsCreated = 0;
    let marketsUpdated = 0;
    let pricesUpdated = 0;

    const batchSize = options.batchSize ?? 100;
    const maxPages = options.maxPages ?? 20;
    const activeOnly = options.activeOnly ?? true;

    try {
      // Ensure platform config exists
      const platformConfigId = await this.ensurePlatformConfig();

      // Log sync start
      const syncLog = await prisma.syncLog.create({
        data: {
          platform: 'POLYMARKET',
          syncType: 'MARKETS',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      let offset = 0;
      let hasMore = true;
      let page = 0;

      while (hasMore && page < maxPages) {
        try {
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
              console.error(msg);
            }
          }

          hasMore = markets.length === batchSize;
          offset += batchSize;
          page++;

          // Small delay between batches to avoid rate limiting
          await this.sleep(100);
        } catch (error) {
          const msg = `Failed to fetch markets page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(msg);
          console.error(msg);
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
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      lastPrice: market.lastPrice,
      volume: market.volume,
      liquidity: market.liquidity,
      bestBid: market.bestBid,
      bestAsk: market.bestAsk,
      spread: market.spread,
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
    if (market.yesPrice === undefined || market.noPrice === undefined) {
      return;
    }

    await prisma.priceSnapshot.create({
      data: {
        platformMarketId,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        volume: market.volume,
        liquidity: market.liquidity,
        bestBid: market.bestBid,
        bestAsk: market.bestAsk,
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
          bestYesPrice: market.yesPrice,
          bestNoPrice: market.noPrice,
          bestYesPlatform: 'POLYMARKET',
          bestNoPlatform: 'POLYMARKET',
          totalVolume: market.volume,
          totalLiquidity: market.liquidity,
          currentSpread: market.spread,
          isActive: market.status === 'ACTIVE',
          resolutionDate: market.closesAt,
        },
      });
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

      // Get all active platform markets
      const activeMarkets = await prisma.platformMarket.findMany({
        where: {
          platformConfigId,
          isActive: true,
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
          platform: 'POLYMARKET',
          syncType: 'PRICES',
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Process in batches
      const batchSize = 20;
      for (let i = 0; i < activeMarkets.length; i += batchSize) {
        const batch = activeMarkets.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (dbMarket) => {
            try {
              const platformData = dbMarket.platformData as { clobTokenIds?: string[] } | null;
              const tokenIds = platformData?.clobTokenIds || [];

              if (tokenIds.length < 2) {
                // Fetch from Gamma API instead
                const market = await this.adapter.getMarket(dbMarket.externalId);
                if (market && market.yesPrice !== undefined) {
                  await prisma.platformMarket.update({
                    where: { id: dbMarket.id },
                    data: {
                      yesPrice: market.yesPrice,
                      noPrice: market.noPrice,
                      lastPrice: market.yesPrice,
                      volume: market.volume,
                      liquidity: market.liquidity,
                      syncedAt: new Date(),
                    },
                  });
                  pricesUpdated++;
                }
                return;
              }

              // Get prices from CLOB
              const yesTokenId = tokenIds[0]!;
              const noTokenId = tokenIds[1]!;
              const prices = await this.adapter.getMarketPrices(
                dbMarket.externalId,
                yesTokenId,
                noTokenId
              );

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
              errors.push(
                `Failed to sync prices for ${dbMarket.externalId}: ${error instanceof Error ? error.message : 'Unknown'}`
              );
            }
          })
        );

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
  // Position Sync
  // ===========================================================================

  /**
   * Sync positions for a user with connected Polymarket wallet
   */
  async syncUserPositions(userId: string): Promise<PositionSyncResult> {
    const errors: string[] = [];
    let positionsCreated = 0;
    let positionsUpdated = 0;

    try {
      // Get user's wallet connections with CLOB credentials
      const wallets = await prisma.walletConnection.findMany({
        where: {
          userId,
          clobApiKey: { not: null },
        },
      });

      if (wallets.length === 0) {
        return {
          success: true,
          syncedAt: new Date(),
          positionsCreated: 0,
          positionsUpdated: 0,
          errors: ['No Polymarket wallet connected'],
        };
      }

      // TODO: Implement authenticated CLOB client for position fetching
      // This requires the user's CLOB API credentials to be decrypted
      // and used to create an authenticated client

      // For now, return placeholder
      return {
        success: true,
        syncedAt: new Date(),
        positionsCreated,
        positionsUpdated,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        syncedAt: new Date(),
        positionsCreated,
        positionsUpdated,
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
        polymarketApi: adapterHealth,
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
          where: { platform: 'POLYMARKET', status: 'SUCCESS' },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        })
        .then((r) => r?.completedAt ?? null),
      prisma.syncLog.count({
        where: {
          platform: 'POLYMARKET',
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const polymarketSync = new PolymarketSyncService();
