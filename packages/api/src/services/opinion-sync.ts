/**
 * Opinion Sync Service
 * Syncs markets and prices from Opinion (O.LAB) to the database
 */

import { prisma } from '../lib/prisma';
import { OpinionAdapter } from '@calibr/adapters';
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
// Opinion Sync Service
// =============================================================================

export class OpinionSyncService {
  private adapter: OpinionAdapter;
  private platformConfigId: string | null = null;

  constructor() {
    this.adapter = new OpinionAdapter();
  }

  /**
   * Ensure platform config exists in database
   */
  async ensurePlatformConfig(): Promise<string> {
    if (this.platformConfigId) {
      return this.platformConfigId;
    }

    const existing = await prisma.platformConfig.findUnique({
      where: { slug: 'opinion' },
    });

    if (existing) {
      this.platformConfigId = existing.id;
      return existing.id;
    }

    const created = await prisma.platformConfig.create({
      data: {
        name: 'Opinion',
        slug: 'opinion',
        displayName: 'Opinion (O.LAB)',
        apiBaseUrl: 'https://proxy.opinion.trade:8443/openapi',
        wsUrl: undefined,
        chainId: 56, // BNB Chain
        supportsTrades: true,
        supportsRealTime: false,
        requiresKyc: false,
        isActive: true,
        healthStatus: 'UNKNOWN',
      },
    });

    this.platformConfigId = created.id;
    return created.id;
  }

  /**
   * Sync all active markets from Opinion
   */
  async syncMarkets(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let marketsCreated = 0;
    let marketsUpdated = 0;
    let pricesUpdated = 0;

    const batchSize = options.batchSize ?? 20; // Opinion API max is 20
    const maxPages = options.maxPages ?? 10;
    const activeOnly = options.activeOnly ?? true;

    try {
      const platformConfigId = await this.ensurePlatformConfig();

      const syncLog = await prisma.syncLog.create({
        data: {
          platform: 'OPINION',
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
          });

          if (markets.length === 0) {
            hasMore = false;
            break;
          }

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
              console.error('[Opinion Sync]', msg);
            }
          }

          hasMore = markets.length === batchSize;
          page++;

          await this.sleep(300); // Rate limit protection
        } catch (error) {
          const msg = `Failed to fetch markets page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(msg);
          console.error('[Opinion Sync]', msg);
          break;
        }
      }

      const duration = Date.now() - startTime;

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

      await prisma.platformConfig.update({
        where: { id: platformConfigId },
        data: {
          healthStatus: errors.length === 0 ? 'HEALTHY' : 'DEGRADED',
          lastHealthCheck: new Date(),
        },
      });

      console.log(`[Opinion Sync] Completed: ${marketsCreated} created, ${marketsUpdated} updated, ${errors.length} errors`);

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
      isActive: market.status === 'ACTIVE',
      closesAt: market.closesAt,
      resolvedAt: market.resolvedAt,
      resolution: market.resolution,
      platformData: {
        ...market.platformData,
        marketType: market.marketType,
        outcomes: market.outcomes,
      } as object,
      syncedAt: new Date(),
    };

    if (existing) {
      await prisma.platformMarket.update({
        where: { id: existing.id },
        data: marketData,
      });
      return { created: false };
    }

    const created = await prisma.platformMarket.create({
      data: {
        platformConfigId,
        externalId: market.externalId,
        ...marketData,
      },
    });

    await this.linkToUnifiedMarket(created.id, market);
    return { created: true };
  }

  private async linkToUnifiedMarket(
    platformMarketId: string,
    market: PlatformMarket
  ): Promise<void> {
    const slug = this.generateSlug(market.question);

    let unifiedMarket = await prisma.unifiedMarket.findUnique({
      where: { slug },
    });

    if (!unifiedMarket) {
      unifiedMarket = await prisma.unifiedMarket.create({
        data: {
          question: market.question,
          description: market.description,
          slug,
          category: market.category as MarketCategory | undefined,
          tags: market.tags,
          bestYesPrice: this.toFloat(market.yesPrice),
          bestNoPrice: this.toFloat(market.noPrice),
          bestYesPlatform: 'OPINION',
          bestNoPlatform: 'OPINION',
          totalVolume: this.toFloat(market.volume) ?? 0,
          totalLiquidity: this.toFloat(market.liquidity) ?? 0,
          isActive: market.status === 'ACTIVE',
          resolutionDate: market.closesAt,
        },
      });
    }

    await prisma.platformMarket.update({
      where: { id: platformMarketId },
      data: { unifiedMarketId: unifiedMarket.id },
    });
  }

  /**
   * Sync prices for active markets
   */
  async syncPrices(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let pricesUpdated = 0;

    try {
      const platformConfigId = await this.ensurePlatformConfig();

      const activeMarkets = await prisma.platformMarket.findMany({
        where: {
          platformConfigId,
          isActive: true,
          resolvedAt: null,
        },
        select: { id: true, externalId: true },
      });

      for (const dbMarket of activeMarkets) {
        try {
          const market = await this.adapter.getMarket(dbMarket.externalId);
          if (market) {
            await prisma.platformMarket.update({
              where: { id: dbMarket.id },
              data: {
                yesPrice: this.toFloat(market.yesPrice),
                noPrice: this.toFloat(market.noPrice),
                lastPrice: this.toFloat(market.lastPrice),
                syncedAt: new Date(),
              },
            });
            pricesUpdated++;
          }
        } catch (error) {
          errors.push(`Failed to sync prices for ${dbMarket.externalId}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
        await this.sleep(100);
      }

      return {
        success: errors.length === 0,
        syncedAt: new Date(),
        duration: Date.now() - startTime,
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

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
    const [adapterHealth, dbHealth] = await Promise.all([
      this.adapter.healthCheck().catch(() => false),
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    ]);

    return {
      healthy: adapterHealth && dbHealth,
      details: {
        opinionApi: adapterHealth,
        database: dbHealth,
      },
    };
  }

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
          where: { platform: 'OPINION', status: 'SUCCESS' },
          orderBy: { completedAt: 'desc' },
          select: { completedAt: true },
        })
        .then((r) => r?.completedAt ?? null),
      prisma.syncLog.count({
        where: {
          platform: 'OPINION',
          status: 'FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { totalMarkets, activeMarkets, lastSync, recentErrors };
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

export const opinionSync = new OpinionSyncService();
