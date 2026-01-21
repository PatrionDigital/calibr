/**
 * Markets API Routes
 * Endpoints for querying market data
 */

import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import type { MarketCategory } from '@prisma/client';

export const marketRoutes = new Hono();

// =============================================================================
// Market Queries
// =============================================================================

/**
 * GET /markets
 * List markets with optional filtering
 */
marketRoutes.get('/', async (c) => {
  const query = c.req.query();

  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const offset = parseInt(query.offset || '0');
  const category = query.category as MarketCategory | undefined;
  const search = query.search;
  const active = query.active !== 'false';
  // TODO: Add platform filtering using query.platform

  const where: Record<string, unknown> = {
    isActive: active,
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.question = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Query unified markets
  const [markets, total] = await Promise.all([
    prisma.unifiedMarket.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { totalVolume: 'desc' },
      include: {
        platformMarkets: {
          include: {
            platformConfig: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.unifiedMarket.count({ where }),
  ]);

  return c.json({
    success: true,
    data: {
      markets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + markets.length < total,
      },
    },
  });
});

/**
 * GET /markets/:id
 * Get a single market by ID
 */
marketRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const market = await prisma.unifiedMarket.findUnique({
    where: { id },
    include: {
      platformMarkets: {
        include: {
          platformConfig: {
            select: {
              name: true,
              slug: true,
              displayName: true,
            },
          },
          priceSnapshots: {
            take: 100,
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      forecasts: {
        where: { isPublic: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          probability: true,
          confidence: true,
          commitMessage: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  if (!market) {
    return c.json(
      {
        success: false,
        error: 'Market not found',
      },
      404
    );
  }

  return c.json({
    success: true,
    data: market,
  });
});

/**
 * GET /markets/:id/prices
 * Get price history for a market
 */
marketRoutes.get('/:id/prices', async (c) => {
  const id = c.req.param('id');
  const query = c.req.query();

  const limit = Math.min(parseInt(query.limit || '100'), 1000);
  const platform = query.platform;

  // Get platform markets for this unified market
  const platformMarkets = await prisma.platformMarket.findMany({
    where: {
      unifiedMarketId: id,
      ...(platform && {
        platformConfig: { slug: platform },
      }),
    },
    select: { id: true },
  });

  if (platformMarkets.length === 0) {
    return c.json(
      {
        success: false,
        error: 'Market not found',
      },
      404
    );
  }

  const platformMarketIds = platformMarkets.map((pm) => pm.id);

  const prices = await prisma.priceSnapshot.findMany({
    where: {
      platformMarketId: { in: platformMarketIds },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      platformMarket: {
        select: {
          platformConfig: {
            select: { slug: true },
          },
        },
      },
    },
  });

  return c.json({
    success: true,
    data: {
      prices: prices.map((p) => ({
        timestamp: p.createdAt,
        yesPrice: p.yesPrice,
        noPrice: p.noPrice,
        volume: p.volume,
        liquidity: p.liquidity,
        platform: p.platformMarket.platformConfig.slug,
      })),
    },
  });
});

/**
 * GET /markets/search
 * Search markets by query
 */
marketRoutes.get('/search', async (c) => {
  const query = c.req.query();
  const q = query.q;

  if (!q || q.length < 2) {
    return c.json(
      {
        success: false,
        error: 'Search query must be at least 2 characters',
      },
      400
    );
  }

  const markets = await prisma.unifiedMarket.findMany({
    where: {
      OR: [
        { question: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    take: 20,
    orderBy: { totalVolume: 'desc' },
    select: {
      id: true,
      question: true,
      slug: true,
      category: true,
      bestYesPrice: true,
      totalVolume: true,
    },
  });

  return c.json({
    success: true,
    data: { markets },
  });
});

// =============================================================================
// Platform Markets
// =============================================================================

/**
 * GET /markets/platforms
 * List available platforms
 */
marketRoutes.get('/platforms', async (c) => {
  const platforms = await prisma.platformConfig.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      displayName: true,
      supportsTrades: true,
      supportsRealTime: true,
      healthStatus: true,
      _count: {
        select: {
          platformMarkets: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  return c.json({
    success: true,
    data: {
      platforms: platforms.map((p) => ({
        ...p,
        activeMarkets: p._count.platformMarkets,
        _count: undefined,
      })),
    },
  });
});

/**
 * GET /markets/categories
 * List market categories with counts
 */
marketRoutes.get('/categories', async (c) => {
  const categories = await prisma.unifiedMarket.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: true,
  });

  return c.json({
    success: true,
    data: {
      categories: categories.map((cat) => ({
        category: cat.category,
        count: cat._count,
      })),
    },
  });
});
