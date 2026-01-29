/**
 * Portfolio API Routes
 * Endpoints for managing positions and portfolio data
 */

import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { positionScanner } from '../services/position-scanner';
import { batchLookupPlatformConfigs } from '../lib/batch-queries';

export const portfolioRoutes = new Hono();

// =============================================================================
// Portfolio Summary
// =============================================================================

/**
 * GET /portfolio/summary
 * Get portfolio summary for a user or wallet
 */
portfolioRoutes.get('/summary', async (c) => {
  const query = c.req.query();
  const walletAddress = query.wallet;
  const userId = query.userId;

  if (!walletAddress && !userId) {
    return c.json(
      {
        success: false,
        error: 'Either wallet address or userId is required',
      },
      400
    );
  }

  try {
    // Build query based on provided identifier
    const whereClause: Record<string, unknown> = {};

    if (walletAddress) {
      const wallet = await prisma.walletConnection.findUnique({
        where: { address: walletAddress.toLowerCase() },
        select: { userId: true },
      });

      if (!wallet) {
        // No wallet found - return empty portfolio
        return c.json({
          success: true,
          data: {
            totalValue: 0,
            totalCost: 0,
            unrealizedPnl: 0,
            unrealizedPnlPct: 0,
            positionCount: 0,
            positions: [],
            byPlatform: {},
            byOutcome: { YES: 0, NO: 0, OTHER: 0 },
          },
        });
      }

      whereClause.userId = wallet.userId;
    } else if (userId) {
      whereClause.userId = userId;
    }

    // Get all positions
    const positions = await prisma.position.findMany({
      where: whereClause,
      include: {
        platformMarket: {
          include: {
            platformConfig: {
              select: {
                name: true,
                slug: true,
                displayName: true,
              },
            },
            unifiedMarket: {
              select: {
                id: true,
                question: true,
                slug: true,
                isActive: true,
                resolvedAt: true,
                resolution: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Calculate portfolio metrics
    let totalValue = 0;
    let totalCost = 0;
    const byPlatform: Record<string, { value: number; cost: number; count: number }> = {};
    const byOutcome = { YES: 0, NO: 0, OTHER: 0 };

    const enrichedPositions = positions.map((pos) => {
      const value = pos.currentValue ?? pos.shares * (pos.currentPrice ?? pos.avgCostBasis);
      const cost = pos.shares * pos.avgCostBasis;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

      totalValue += value;
      totalCost += cost;

      // Track by platform
      const platform = pos.platform;
      if (!byPlatform[platform]) {
        byPlatform[platform] = { value: 0, cost: 0, count: 0 };
      }
      byPlatform[platform].value += value;
      byPlatform[platform].cost += cost;
      byPlatform[platform].count += 1;

      // Track by outcome
      const outcomeKey = pos.outcome.toUpperCase();
      if (outcomeKey === 'YES') {
        byOutcome.YES += value;
      } else if (outcomeKey === 'NO') {
        byOutcome.NO += value;
      } else {
        byOutcome.OTHER += value;
      }

      return {
        id: pos.id,
        platform: pos.platform,
        platformName: pos.platformMarket.platformConfig.displayName,
        marketId: pos.platformMarketId,
        marketQuestion: pos.platformMarket.unifiedMarket?.question ?? pos.platformMarket.question,
        marketSlug: pos.platformMarket.unifiedMarket?.slug,
        outcome: pos.outcome,
        shares: pos.shares,
        avgCostBasis: pos.avgCostBasis,
        currentPrice: pos.currentPrice,
        currentValue: value,
        unrealizedPnl: pnl,
        unrealizedPnlPct: pnlPct,
        isResolved: !!pos.platformMarket.unifiedMarket?.resolvedAt,
        resolution: pos.platformMarket.unifiedMarket?.resolution,
        updatedAt: pos.updatedAt,
      };
    });

    const unrealizedPnl = totalValue - totalCost;
    const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

    return c.json({
      success: true,
      data: {
        totalValue,
        totalCost,
        unrealizedPnl,
        unrealizedPnlPct,
        positionCount: positions.length,
        positions: enrichedPositions,
        byPlatform,
        byOutcome,
      },
    });
  } catch (error) {
    console.error('[Portfolio] Error fetching summary:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch portfolio',
      },
      500
    );
  }
});

// =============================================================================
// Position Management
// =============================================================================

/**
 * GET /portfolio/positions
 * List all positions with optional filtering
 */
portfolioRoutes.get('/positions', async (c) => {
  const query = c.req.query();
  const walletAddress = query.wallet;
  const userId = query.userId;
  const platform = query.platform;
  const activeOnly = query.active !== 'false';

  if (!walletAddress && !userId) {
    return c.json(
      {
        success: false,
        error: 'Either wallet address or userId is required',
      },
      400
    );
  }

  try {
    const whereClause: Record<string, unknown> = {};

    if (walletAddress) {
      const wallet = await prisma.walletConnection.findUnique({
        where: { address: walletAddress.toLowerCase() },
        select: { userId: true },
      });

      if (!wallet) {
        return c.json({ success: true, data: { positions: [] } });
      }

      whereClause.userId = wallet.userId;
    } else if (userId) {
      whereClause.userId = userId;
    }

    if (platform) {
      whereClause.platform = platform.toUpperCase();
    }

    if (activeOnly) {
      whereClause.platformMarket = {
        isActive: true,
        resolvedAt: null,
      };
    }

    const positions = await prisma.position.findMany({
      where: whereClause,
      include: {
        platformMarket: {
          include: {
            platformConfig: {
              select: { displayName: true },
            },
            unifiedMarket: {
              select: {
                question: true,
                slug: true,
                isActive: true,
                resolvedAt: true,
                resolution: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return c.json({
      success: true,
      data: { positions },
    });
  } catch (error) {
    console.error('[Portfolio] Error fetching positions:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch positions',
      },
      500
    );
  }
});

/**
 * POST /portfolio/positions
 * Add or update a position (manual entry)
 */
portfolioRoutes.post('/positions', async (c) => {
  const body = await c.req.json();

  const { userId, walletAddress, platform, marketExternalId, outcome, shares, avgCostBasis } = body;

  if (!userId && !walletAddress) {
    return c.json({ success: false, error: 'userId or walletAddress required' }, 400);
  }

  if (!platform || !marketExternalId || !outcome || shares === undefined) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }

  try {
    // OPTIMIZED: Use cached platform config lookup
    const platformConfigs = await batchLookupPlatformConfigs([platform.toLowerCase()]);
    const platformConfig = platformConfigs.get(platform.toLowerCase());

    if (!platformConfig) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }

    // Find the platform market
    const platformMarket = await prisma.platformMarket.findUnique({
      where: {
        platformConfigId_externalId: {
          platformConfigId: platformConfig.id,
          externalId: marketExternalId,
        },
      },
    });

    if (!platformMarket) {
      return c.json({ success: false, error: 'Market not found' }, 404);
    }

    // Get or find user ID
    let finalUserId = userId;
    if (walletAddress && !userId) {
      const wallet = await prisma.walletConnection.findUnique({
        where: { address: walletAddress.toLowerCase() },
      });
      if (wallet) {
        finalUserId = wallet.userId;
      } else {
        return c.json({ success: false, error: 'Wallet not connected to any user' }, 404);
      }
    }

    // Upsert position
    const position = await prisma.position.upsert({
      where: {
        userId_platformMarketId_outcome: {
          userId: finalUserId,
          platformMarketId: platformMarket.id,
          outcome,
        },
      },
      update: {
        shares,
        avgCostBasis: avgCostBasis ?? shares > 0 ? avgCostBasis : undefined,
        currentPrice: platformMarket.yesPrice ?? platformMarket.noPrice,
      },
      create: {
        userId: finalUserId,
        platform: platform.toUpperCase() as 'POLYMARKET' | 'LIMITLESS' | 'KALSHI' | 'IEM' | 'METACULUS' | 'MANIFOLD',
        platformMarketId: platformMarket.id,
        unifiedMarketId: platformMarket.unifiedMarketId,
        outcome,
        shares,
        avgCostBasis: avgCostBasis ?? 0.5,
        currentPrice: platformMarket.yesPrice ?? platformMarket.noPrice,
      },
    });

    return c.json({ success: true, data: { position } });
  } catch (error) {
    console.error('[Portfolio] Error creating position:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create position',
      },
      500
    );
  }
});

/**
 * DELETE /portfolio/positions/:id
 * Delete a position
 */
portfolioRoutes.delete('/positions/:id', async (c) => {
  const id = c.req.param('id');

  try {
    await prisma.position.delete({
      where: { id },
    });

    return c.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error('[Portfolio] Error deleting position:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete position',
      },
      500
    );
  }
});

// =============================================================================
// Wallet Connection
// =============================================================================

/**
 * POST /portfolio/connect-wallet
 * Connect a wallet address to track positions
 */
portfolioRoutes.post('/connect-wallet', async (c) => {
  const body = await c.req.json();
  const { address, label } = body;

  if (!address) {
    return c.json({ success: false, error: 'Wallet address required' }, 400);
  }

  try {
    // For now, create a temporary user for the wallet if none exists
    // In production, this would be handled by proper authentication
    const normalizedAddress = address.toLowerCase();

    const existingWallet = await prisma.walletConnection.findUnique({
      where: { address: normalizedAddress },
    });

    if (existingWallet) {
      return c.json({
        success: true,
        data: {
          wallet: {
            id: existingWallet.id,
            address: existingWallet.address,
            label: existingWallet.label,
            userId: existingWallet.userId,
          },
        },
      });
    }

    // Create a user and wallet connection
    const user = await prisma.user.create({
      data: {
        displayName: label || `User ${normalizedAddress.slice(0, 8)}`,
        walletConnections: {
          create: {
            address: normalizedAddress,
            label: label || 'Primary Wallet',
            chainId: 8453, // Base
          },
        },
      },
      include: {
        walletConnections: true,
      },
    });

    const newWallet = user.walletConnections[0];

    if (!newWallet) {
      throw new Error('Failed to create wallet connection');
    }

    return c.json({
      success: true,
      data: {
        wallet: {
          id: newWallet.id,
          address: newWallet.address,
          label: newWallet.label,
          userId: newWallet.userId,
        },
      },
    });
  } catch (error) {
    console.error('[Portfolio] Error connecting wallet:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      },
      500
    );
  }
});

/**
 * GET /portfolio/alerts
 * Get resolution alerts for user's positions
 */
portfolioRoutes.get('/alerts', async (c) => {
  const query = c.req.query();
  const walletAddress = query.wallet;
  const userId = query.userId;
  const daysBack = parseInt(query.days || '7');

  if (!walletAddress && !userId) {
    return c.json(
      {
        success: false,
        error: 'Either wallet address or userId is required',
      },
      400
    );
  }

  try {
    const whereClause: Record<string, unknown> = {};

    if (walletAddress) {
      const wallet = await prisma.walletConnection.findUnique({
        where: { address: walletAddress.toLowerCase() },
        select: { userId: true },
      });

      if (!wallet) {
        return c.json({ success: true, data: { alerts: [], count: 0 } });
      }

      whereClause.userId = wallet.userId;
    } else if (userId) {
      whereClause.userId = userId;
    }

    // Get positions with recently resolved markets
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const resolvedPositions = await prisma.position.findMany({
      where: {
        ...whereClause,
        platformMarket: {
          unifiedMarket: {
            resolvedAt: {
              gte: cutoffDate,
            },
          },
        },
      },
      include: {
        platformMarket: {
          include: {
            platformConfig: {
              select: {
                displayName: true,
              },
            },
            unifiedMarket: {
              select: {
                question: true,
                slug: true,
                resolvedAt: true,
                resolution: true,
              },
            },
          },
        },
      },
      orderBy: {
        platformMarket: {
          unifiedMarket: {
            resolvedAt: 'desc',
          },
        },
      },
    });

    const alerts = resolvedPositions.map((pos) => {
      const resolution = pos.platformMarket.unifiedMarket?.resolution;
      const userOutcome = pos.outcome.toUpperCase();

      // Determine if user won
      let isWinner = false;
      if (resolution) {
        const resolutionUpper = resolution.toUpperCase();
        if (resolutionUpper === 'YES' && userOutcome === 'YES') isWinner = true;
        if (resolutionUpper === 'NO' && userOutcome === 'NO') isWinner = true;
        if (resolutionUpper === userOutcome) isWinner = true;
      }

      // Calculate realized P&L
      const cost = pos.shares * pos.avgCostBasis;
      const payout = isWinner ? pos.shares : 0;
      const realizedPnl = payout - cost;
      const realizedPnlPct = cost > 0 ? (realizedPnl / cost) * 100 : 0;

      return {
        id: pos.id,
        type: 'RESOLUTION' as const,
        marketQuestion: pos.platformMarket.unifiedMarket?.question ?? pos.platformMarket.question,
        marketSlug: pos.platformMarket.unifiedMarket?.slug,
        platform: pos.platform,
        platformName: pos.platformMarket.platformConfig.displayName,
        outcome: pos.outcome,
        resolution,
        isWinner,
        shares: pos.shares,
        avgCostBasis: pos.avgCostBasis,
        payout,
        realizedPnl,
        realizedPnlPct,
        resolvedAt: pos.platformMarket.unifiedMarket?.resolvedAt,
      };
    });

    // OPTIMIZED: Single pass instead of 3 separate array iterations
    const stats = alerts.reduce(
      (acc, a) => {
        if (a.isWinner) {
          acc.wins++;
        } else {
          acc.losses++;
        }
        acc.totalRealizedPnl += a.realizedPnl;
        return acc;
      },
      { wins: 0, losses: 0, totalRealizedPnl: 0 }
    );

    return c.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        wins: stats.wins,
        losses: stats.losses,
        totalRealizedPnl: stats.totalRealizedPnl,
      },
    });
  } catch (error) {
    console.error('[Portfolio] Error fetching alerts:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch alerts',
      },
      500
    );
  }
});

/**
 * GET /portfolio/wallets
 * Get connected wallets for a user
 */
portfolioRoutes.get('/wallets', async (c) => {
  const query = c.req.query();
  const userId = query.userId;

  if (!userId) {
    return c.json({ success: false, error: 'userId required' }, 400);
  }

  try {
    const wallets = await prisma.walletConnection.findMany({
      where: { userId },
      select: {
        id: true,
        address: true,
        label: true,
        chainId: true,
        lastSyncAt: true,
        syncStatus: true,
      },
    });

    return c.json({ success: true, data: { wallets } });
  } catch (error) {
    console.error('[Portfolio] Error fetching wallets:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch wallets',
      },
      500
    );
  }
});

// =============================================================================
// On-Chain Position Scanning
// =============================================================================

/**
 * POST /portfolio/scan
 * Scan a wallet for on-chain positions
 */
portfolioRoutes.post('/scan', async (c) => {
  const body = await c.req.json();
  const { wallet, platforms, importPositions } = body;

  if (!wallet) {
    return c.json({ success: false, error: 'Wallet address required' }, 400);
  }

  try {
    console.log(`[Portfolio] Scanning wallet ${wallet} for on-chain positions`);

    // Scan on-chain
    const scanResult = await positionScanner.scanWallet(wallet, {
      platforms: platforms || ['LIMITLESS'],
      scanOnChain: true,
      includeResolved: false,
    });

    console.log(`[Portfolio] Found ${scanResult.positions.length} positions, errors: ${scanResult.errors.length}`);

    // Optionally import positions to database
    if (importPositions && scanResult.positions.length > 0) {
      // First, ensure wallet is connected
      let walletConnection = await prisma.walletConnection.findUnique({
        where: { address: wallet.toLowerCase() },
      });

      if (!walletConnection) {
        // Create wallet connection and user
        const user = await prisma.user.create({
          data: {
            displayName: `User ${wallet.slice(0, 8)}`,
            walletConnections: {
              create: {
                address: wallet.toLowerCase(),
                label: 'Primary Wallet',
                chainId: 8453,
              },
            },
          },
          include: { walletConnections: true },
        });
        walletConnection = user.walletConnections[0]!;
      }

      // Import positions
      const importResult = await positionScanner.importPositions(
        walletConnection.userId,
        scanResult,
        walletConnection.id
      );

      // Update wallet sync status
      await prisma.walletConnection.update({
        where: { id: walletConnection.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'SUCCESS',
        },
      });

      return c.json({
        success: true,
        data: {
          scan: {
            address: scanResult.address,
            positionsFound: scanResult.positions.length,
            totalValue: scanResult.totalValue,
            scanTimestamp: scanResult.scanTimestamp,
            errors: scanResult.errors,
          },
          import: importResult,
          positions: scanResult.positions,
        },
      });
    }

    // Return scan results without importing
    return c.json({
      success: true,
      data: {
        scan: {
          address: scanResult.address,
          positionsFound: scanResult.positions.length,
          totalValue: scanResult.totalValue,
          scanTimestamp: scanResult.scanTimestamp,
          errors: scanResult.errors,
        },
        positions: scanResult.positions,
      },
    });
  } catch (error) {
    console.error('[Portfolio] Error scanning wallet:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan wallet',
      },
      500
    );
  }
});

/**
 * GET /portfolio/scan/:wallet
 * Quick scan endpoint (GET version)
 */
portfolioRoutes.get('/scan/:wallet', async (c) => {
  const wallet = c.req.param('wallet');
  const query = c.req.query();
  const platform = query.platform || 'LIMITLESS';

  if (!wallet) {
    return c.json({ success: false, error: 'Wallet address required' }, 400);
  }

  try {
    const scanResult = await positionScanner.scanWallet(wallet, {
      platforms: [platform.toUpperCase() as 'LIMITLESS' | 'POLYMARKET'],
      scanOnChain: true,
      includeResolved: false,
    });

    return c.json({
      success: true,
      data: {
        address: scanResult.address,
        positions: scanResult.positions,
        positionsFound: scanResult.positions.length,
        totalValue: scanResult.totalValue,
        scanTimestamp: scanResult.scanTimestamp,
        errors: scanResult.errors,
      },
    });
  } catch (error) {
    console.error('[Portfolio] Error scanning wallet:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scan wallet',
      },
      500
    );
  }
});
