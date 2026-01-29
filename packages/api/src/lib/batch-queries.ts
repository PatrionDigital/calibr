/**
 * Batch Query Utilities
 * Optimized database operations to reduce query count and bandwidth
 */

import { prisma } from './prisma';
import type { Platform, PlatformConfig, PlatformMarket, Position } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface PositionUpsertData {
  userId: string;
  platformMarketId: string;
  outcome: string;
  shares: number;
  avgCostBasis: number;
  platform: Platform | string;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPnl?: number;
  walletConnectionId?: string;
}

export interface BatchUpsertResult {
  success: boolean;
  count: number;
  error?: string;
}

type PositionWithRelations = Position & {
  platformMarket: PlatformMarket & {
    platformConfig: PlatformConfig;
  };
};

// =============================================================================
// Cache for Platform Configs (they rarely change)
// =============================================================================

const platformConfigCache = new Map<string, PlatformConfig>();
let cacheInitialized = false;

async function initConfigCache(): Promise<void> {
  if (cacheInitialized) return;

  const configs = await prisma.platformConfig.findMany({
    where: { isActive: true },
  });

  for (const config of configs) {
    platformConfigCache.set(config.slug, config);
  }

  cacheInitialized = true;
}

// =============================================================================
// Batch Position Queries
// =============================================================================

/**
 * Fetch positions for multiple wallet IDs in a single query
 * Instead of N queries (one per wallet), we use a single query with 'in' operator
 */
export async function batchFindPositionsByWalletIds(
  walletIds: string[],
  platform?: Platform | string
): Promise<Map<string, PositionWithRelations[]>> {
  if (walletIds.length === 0) {
    return new Map();
  }

  const where: Record<string, unknown> = {
    walletConnectionId: { in: walletIds },
    shares: { gt: 0 },
  };

  if (platform) {
    where.platform = platform;
  }

  const positions = await prisma.position.findMany({
    where,
    include: {
      platformMarket: {
        include: {
          platformConfig: true,
        },
      },
    },
  });

  // Group positions by wallet ID
  const result = new Map<string, PositionWithRelations[]>();

  for (const walletId of walletIds) {
    result.set(walletId, []);
  }

  for (const position of positions) {
    const walletPositions = result.get(position.walletConnectionId || '');
    if (walletPositions) {
      walletPositions.push(position as PositionWithRelations);
    }
  }

  return result;
}

// =============================================================================
// Batch Platform Config Lookup
// =============================================================================

/**
 * Lookup platform configs by slugs with caching
 * Reduces repeated queries for the same platform configs
 */
export async function batchLookupPlatformConfigs(
  slugs: string[]
): Promise<Map<string, PlatformConfig>> {
  await initConfigCache();

  const result = new Map<string, PlatformConfig>();

  // Check what we need to fetch
  const missingSlug: string[] = [];
  for (const slug of slugs) {
    const cached = platformConfigCache.get(slug);
    if (cached) {
      result.set(slug, cached);
    } else {
      missingSlug.push(slug);
    }
  }

  // Fetch missing configs in one query
  if (missingSlug.length > 0) {
    const configs = await prisma.platformConfig.findMany({
      where: {
        slug: { in: missingSlug },
        isActive: true,
      },
    });

    for (const config of configs) {
      platformConfigCache.set(config.slug, config);
      result.set(config.slug, config);
    }
  }

  return result;
}

/**
 * Clear the platform config cache (useful for testing)
 */
export function clearPlatformConfigCache(): void {
  platformConfigCache.clear();
  cacheInitialized = false;
}

// =============================================================================
// Batch Platform Market Lookup
// =============================================================================

interface PlatformMarketLookupKey {
  platformConfigId: string;
  externalId: string;
}

/**
 * Lookup platform markets by config ID and external ID pairs
 * Uses a single query instead of N queries
 */
export async function batchLookupPlatformMarkets(
  lookupKeys: PlatformMarketLookupKey[]
): Promise<Map<string, PlatformMarket>> {
  if (lookupKeys.length === 0) {
    return new Map();
  }

  // Group by platform config ID for efficient querying
  const byConfigId = new Map<string, string[]>();
  for (const key of lookupKeys) {
    const externalIds = byConfigId.get(key.platformConfigId) || [];
    externalIds.push(key.externalId);
    byConfigId.set(key.platformConfigId, externalIds);
  }

  // Build OR query for all combinations
  const orConditions = Array.from(byConfigId.entries()).map(([configId, externalIds]) => ({
    platformConfigId: configId,
    externalId: { in: externalIds },
  }));

  const markets = await prisma.platformMarket.findMany({
    where: {
      OR: orConditions,
    },
  });

  // Build result map with composite key
  const result = new Map<string, PlatformMarket>();
  for (const market of markets) {
    const key = `${market.platformConfigId}:${market.externalId}`;
    result.set(key, market);
  }

  return result;
}

// =============================================================================
// Batch Position Upsert
// =============================================================================

/**
 * Batch upsert positions using a transaction
 * More efficient than individual upserts
 */
export async function batchUpsertPositions(
  positions: PositionUpsertData[]
): Promise<BatchUpsertResult> {
  if (positions.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    // Create upsert operations
    const operations = positions.map((pos) =>
      prisma.position.upsert({
        where: {
          userId_platformMarketId_outcome: {
            userId: pos.userId,
            platformMarketId: pos.platformMarketId,
            outcome: pos.outcome,
          },
        },
        create: {
          userId: pos.userId,
          platformMarketId: pos.platformMarketId,
          outcome: pos.outcome,
          shares: pos.shares,
          avgCostBasis: pos.avgCostBasis,
          currentPrice: pos.currentPrice,
          currentValue: pos.currentValue,
          unrealizedPnl: pos.unrealizedPnl,
          platform: pos.platform as Platform,
          walletConnectionId: pos.walletConnectionId,
        },
        update: {
          shares: pos.shares,
          currentPrice: pos.currentPrice,
          currentValue: pos.currentValue,
          unrealizedPnl: pos.unrealizedPnl,
          updatedAt: new Date(),
        },
      })
    );

    // Execute in a transaction
    await prisma.$transaction(operations);

    return { success: true, count: positions.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, count: 0, error: message };
  }
}

