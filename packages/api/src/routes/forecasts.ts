/**
 * Forecast Journaling Routes
 * Git-style forecast commits with EAS attestation support
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const forecastRoutes = new Hono();

// =============================================================================
// Validation Schemas
// =============================================================================

const createForecastSchema = z.object({
  unifiedMarketId: z.string(),
  probability: z.number().min(0.01).max(0.99),
  confidence: z.number().min(0).max(1).default(0.5),
  commitMessage: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
  kellyFraction: z.number().min(0).max(1).default(0.5),
  executeRebalance: z.boolean().default(false),
});

const updateForecastSchema = z.object({
  probability: z.number().min(0.01).max(0.99),
  confidence: z.number().min(0).max(1).optional(),
  commitMessage: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  kellyFraction: z.number().min(0).max(1).optional(),
  executeRebalance: z.boolean().optional(),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Ensure user exists in database (create if not)
 */
async function ensureUserExists(userId: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      displayName: userId === 'demo-user' ? 'Demo User' : userId,
    },
  });
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/forecasts - List user's forecasts
 */
forecastRoutes.get('/', async (c) => {
  const query = c.req.query();
  const limit = Math.min(parseInt(query.limit || '20'), 100);
  const offset = parseInt(query.offset || '0');
  const marketId = query.marketId;
  const includePrivate = query.includePrivate === 'true';

  // TODO: Get userId from auth context
  const userId = c.req.header('x-user-id') || 'demo-user';

  const where = {
    userId,
    ...(marketId && { unifiedMarketId: marketId }),
    ...(includePrivate ? {} : { isPublic: true }),
  };

  const [forecasts, total] = await Promise.all([
    prisma.forecast.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        unifiedMarket: {
          select: {
            id: true,
            question: true,
            bestYesPrice: true,
            bestNoPrice: true,
            isActive: true,
            resolution: true,
            resolvedAt: true,
          },
        },
        previousForecast: {
          select: {
            id: true,
            probability: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.forecast.count({ where }),
  ]);

  // Calculate edge and Kelly recommendation for each forecast
  const forecastsWithCalc = forecasts.map((f) => {
    const marketPrice = f.unifiedMarket.bestYesPrice ?? 0.5;
    const edge = f.probability - marketPrice;
    const priceChange = f.previousForecast
      ? f.probability - f.previousForecast.probability
      : null;

    return {
      ...f,
      calculated: {
        edge,
        edgePercentage: marketPrice > 0 ? (edge / marketPrice) * 100 : 0,
        hasPositiveEdge: edge > 0,
        priceChange,
      },
    };
  });

  return c.json({
    success: true,
    data: {
      forecasts: forecastsWithCalc,
      total,
      limit,
      offset,
    },
  });
});

/**
 * GET /api/forecasts/user/stats - Get user's forecast statistics
 */
forecastRoutes.get('/user/stats', async (c) => {
  const userId = c.req.header('x-user-id') || 'demo-user';

  const [totalForecasts, publicForecasts, attestedForecasts, recentForecasts] =
    await Promise.all([
      prisma.forecast.count({ where: { userId } }),
      prisma.forecast.count({ where: { userId, isPublic: true } }),
      prisma.forecast.count({
        where: { userId, easAttestationUid: { not: null } },
      }),
      prisma.forecast.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          unifiedMarket: {
            select: {
              question: true,
              bestYesPrice: true,
              resolution: true,
              resolvedAt: true,
            },
          },
        },
      }),
    ]);

  // Calculate average edge on recent forecasts
  const avgEdge =
    recentForecasts.length > 0
      ? recentForecasts.reduce((sum, f) => {
          const marketPrice = f.unifiedMarket.bestYesPrice ?? 0.5;
          return sum + (f.probability - marketPrice);
        }, 0) / recentForecasts.length
      : 0;

  return c.json({
    success: true,
    data: {
      totalForecasts,
      publicForecasts,
      privateForecasts: totalForecasts - publicForecasts,
      attestedForecasts,
      averageEdge: avgEdge,
      recentForecasts: recentForecasts.map((f) => ({
        id: f.id,
        probability: f.probability,
        marketQuestion: f.unifiedMarket.question,
        marketPrice: f.unifiedMarket.bestYesPrice,
        resolution: f.unifiedMarket.resolution,
        createdAt: f.createdAt,
      })),
    },
  });
});

/**
 * GET /api/forecasts/:id - Get a single forecast
 */
forecastRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id') || 'demo-user';

  const forecast = await prisma.forecast.findFirst({
    where: {
      id,
      OR: [{ userId }, { isPublic: true }],
    },
    include: {
      unifiedMarket: true,
      previousForecast: true,
      nextForecasts: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!forecast) {
    return c.json({ success: false, error: 'Forecast not found' }, 404);
  }

  return c.json({ success: true, data: forecast });
});

/**
 * GET /api/forecasts/market/:marketId - Get forecast history for a market
 */
forecastRoutes.get('/market/:marketId', async (c) => {
  const marketId = c.req.param('marketId');
  const userId = c.req.header('x-user-id') || 'demo-user';

  const forecasts = await prisma.forecast.findMany({
    where: {
      unifiedMarketId: marketId,
      userId,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      probability: true,
      confidence: true,
      commitMessage: true,
      createdAt: true,
      marketYesPrice: true,
      marketNoPrice: true,
      isPublic: true,
      easAttestationUid: true,
    },
  });

  // Build history timeline
  const history = forecasts.map((f, i) => {
    const prevForecast = i > 0 ? forecasts[i - 1] : null;
    return {
      ...f,
      version: i + 1,
      priceChange: prevForecast ? f.probability - prevForecast.probability : null,
    };
  });

  // Get current market price
  const market = await prisma.unifiedMarket.findUnique({
    where: { id: marketId },
    select: {
      bestYesPrice: true,
      bestNoPrice: true,
      isActive: true,
      resolution: true,
    },
  });

  return c.json({
    success: true,
    data: {
      history,
      count: forecasts.length,
      currentForecast: forecasts.length > 0 ? forecasts[forecasts.length - 1] : null,
      market,
    },
  });
});

/**
 * POST /api/forecasts - Create a new forecast
 */
forecastRoutes.post('/', async (c) => {
  const userId = c.req.header('x-user-id') || 'demo-user';

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = createForecastSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.message }, 400);
  }

  const data = parsed.data;

  // Ensure user exists (create if not)
  await ensureUserExists(userId);

  // Get the market for current prices
  const market = await prisma.unifiedMarket.findUnique({
    where: { id: data.unifiedMarketId },
    select: {
      id: true,
      bestYesPrice: true,
      bestNoPrice: true,
      isActive: true,
    },
  });

  if (!market) {
    return c.json({ success: false, error: 'Market not found' }, 404);
  }

  if (!market.isActive) {
    return c.json({ success: false, error: 'Market is no longer active' }, 400);
  }

  // Find previous forecast for this market by this user
  const previousForecast = await prisma.forecast.findFirst({
    where: {
      userId,
      unifiedMarketId: data.unifiedMarketId,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate recommended size based on Kelly
  const marketPrice = market.bestYesPrice ?? 0.5;
  const edge = data.probability - marketPrice;
  let recommendedSize: number | null = null;

  if (edge > 0) {
    const rawKelly = edge / (1 - marketPrice);
    recommendedSize = rawKelly * data.kellyFraction;
    recommendedSize = Math.min(recommendedSize, 0.25); // Cap at 25%
  }

  // Create the forecast
  const forecast = await prisma.forecast.create({
    data: {
      userId,
      unifiedMarketId: data.unifiedMarketId,
      probability: data.probability,
      confidence: data.confidence,
      commitMessage: data.commitMessage,
      isPublic: data.isPublic,
      kellyFraction: data.kellyFraction,
      recommendedSize,
      executeRebalance: data.executeRebalance,
      marketYesPrice: market.bestYesPrice,
      marketNoPrice: market.bestNoPrice,
      previousForecastId: previousForecast?.id,
    },
    include: {
      unifiedMarket: {
        select: {
          id: true,
          question: true,
          bestYesPrice: true,
          bestNoPrice: true,
        },
      },
    },
  });

  return c.json({
    success: true,
    data: {
      forecast,
      calculated: {
        edge,
        edgePercentage: marketPrice > 0 ? (edge / marketPrice) * 100 : 0,
        hasPositiveEdge: edge > 0,
        recommendedSize,
        isUpdate: !!previousForecast,
        priceChange: previousForecast ? data.probability - previousForecast.probability : null,
      },
    },
  }, 201);
});

/**
 * PUT /api/forecasts/:id - Update a forecast (creates new version)
 */
forecastRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id') || 'demo-user';

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const parsed = updateForecastSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.message }, 400);
  }

  const data = parsed.data;

  // Ensure user exists
  await ensureUserExists(userId);

  // Get the existing forecast
  const existingForecast = await prisma.forecast.findFirst({
    where: { id, userId },
    include: { unifiedMarket: true },
  });

  if (!existingForecast) {
    return c.json({ success: false, error: 'Forecast not found' }, 404);
  }

  if (!existingForecast.unifiedMarket.isActive) {
    return c.json({ success: false, error: 'Market is no longer active' }, 400);
  }

  // Get current market prices
  const market = await prisma.unifiedMarket.findUnique({
    where: { id: existingForecast.unifiedMarketId },
    select: { bestYesPrice: true, bestNoPrice: true },
  });

  // Calculate recommended size
  const marketPrice = market?.bestYesPrice ?? 0.5;
  const edge = data.probability - marketPrice;
  const kellyFraction = data.kellyFraction ?? existingForecast.kellyFraction;
  let recommendedSize: number | null = null;

  if (edge > 0) {
    const rawKelly = edge / (1 - marketPrice);
    recommendedSize = rawKelly * kellyFraction;
    recommendedSize = Math.min(recommendedSize, 0.25);
  }

  // Create new forecast version linked to previous
  const newForecast = await prisma.forecast.create({
    data: {
      userId,
      unifiedMarketId: existingForecast.unifiedMarketId,
      probability: data.probability,
      confidence: data.confidence ?? existingForecast.confidence,
      commitMessage: data.commitMessage,
      isPublic: data.isPublic ?? existingForecast.isPublic,
      kellyFraction,
      recommendedSize,
      executeRebalance: data.executeRebalance ?? existingForecast.executeRebalance,
      marketYesPrice: market?.bestYesPrice,
      marketNoPrice: market?.bestNoPrice,
      previousForecastId: existingForecast.id,
    },
    include: {
      unifiedMarket: {
        select: {
          id: true,
          question: true,
          bestYesPrice: true,
          bestNoPrice: true,
        },
      },
    },
  });

  return c.json({
    success: true,
    data: {
      forecast: newForecast,
      calculated: {
        edge,
        edgePercentage: marketPrice > 0 ? (edge / marketPrice) * 100 : 0,
        hasPositiveEdge: edge > 0,
        recommendedSize,
        priceChange: data.probability - existingForecast.probability,
      },
    },
  });
});

/**
 * DELETE /api/forecasts/:id - Delete a forecast
 */
forecastRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id') || 'demo-user';

  const forecast = await prisma.forecast.findFirst({
    where: { id, userId },
  });

  if (!forecast) {
    return c.json({ success: false, error: 'Forecast not found' }, 404);
  }

  // Don't allow deletion if attested on-chain
  if (forecast.easAttestationUid) {
    return c.json({ success: false, error: 'Cannot delete attested forecast' }, 400);
  }

  await prisma.forecast.delete({ where: { id } });

  return c.json({ success: true, data: { deleted: true } });
});

/**
 * GET /api/forecasts/:id/attest - Get attestation data for a forecast
 */
forecastRoutes.get('/:id/attest', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id') || 'demo-user';

  const forecast = await prisma.forecast.findFirst({
    where: { id, userId },
    include: { unifiedMarket: true },
  });

  if (!forecast) {
    return c.json({ success: false, error: 'Forecast not found' }, 404);
  }

  // Return attestation data for client-side signing
  return c.json({
    success: true,
    data: {
      forecastId: forecast.id,
      isAttested: !!forecast.easAttestationUid,
      existingUid: forecast.easAttestationUid,
      attestationData: {
        schema: 'CalibrForecast',
        schemaString: 'uint256 probability,string marketId,string platform,uint256 confidence,string reasoning,bool isPublic',
        fields: {
          probability: Math.round(forecast.probability * 100), // 1-99
          marketId: forecast.unifiedMarketId,
          platform: 'calibr',
          confidence: Math.round(forecast.confidence * 100), // 0-100
          reasoning: forecast.commitMessage || '',
          isPublic: forecast.isPublic,
        },
      },
      market: {
        id: forecast.unifiedMarketId,
        question: forecast.unifiedMarket.question,
      },
    },
  });
});

/**
 * POST /api/forecasts/:id/attest - Record EAS attestation for forecast
 * Called after client-side attestation is created
 */
forecastRoutes.post('/:id/attest', async (c) => {
  const id = c.req.param('id');
  const userId = c.req.header('x-user-id') || 'demo-user';

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { attestationUid, txHash, chainId, schemaUid } = body;

  if (!attestationUid) {
    return c.json({ success: false, error: 'attestationUid is required' }, 400);
  }

  const forecast = await prisma.forecast.findFirst({
    where: { id, userId },
    include: { unifiedMarket: true },
  });

  if (!forecast) {
    return c.json({ success: false, error: 'Forecast not found' }, 404);
  }

  if (forecast.easAttestationUid) {
    return c.json({ success: false, error: 'Forecast already attested' }, 400);
  }

  // Update the forecast with attestation data
  const updatedForecast = await prisma.forecast.update({
    where: { id },
    data: {
      easAttestationUid: attestationUid,
      easAttestedAt: new Date(),
    },
  });

  // Also create an EASAttestation record for tracking
  try {
    await prisma.eASAttestation.create({
      data: {
        uid: attestationUid,
        schemaUid: schemaUid || 'unknown',
        schemaName: 'CalibrForecast',
        chainId: chainId || 84532, // Default to Base Sepolia
        txHash: txHash || null,
        attester: userId, // In production, this would be the wallet address
        recipient: userId,
        data: {
          probability: Math.round(forecast.probability * 100),
          marketId: forecast.unifiedMarketId,
          platform: 'calibr',
          confidence: Math.round(forecast.confidence * 100),
          reasoning: forecast.commitMessage || '',
          isPublic: forecast.isPublic,
        },
        userId,
        isOffchain: false,
        isPrivate: !forecast.isPublic,
      },
    });
  } catch (err) {
    // EASAttestation record is optional - don't fail if it can't be created
    console.warn('[Forecast] Failed to create EASAttestation record:', err);
  }

  // Build EAS scan URL
  const easScanUrl = chainId === 8453
    ? `https://base.easscan.org/attestation/view/${attestationUid}`
    : `https://base-sepolia.easscan.org/attestation/view/${attestationUid}`;

  return c.json({
    success: true,
    data: {
      forecast: {
        id: updatedForecast.id,
        probability: updatedForecast.probability,
        easAttestationUid: updatedForecast.easAttestationUid,
        easAttestedAt: updatedForecast.easAttestedAt,
      },
      attestation: {
        uid: attestationUid,
        txHash,
        chainId: chainId || 84532,
        easScanUrl,
      },
    },
  });
});
