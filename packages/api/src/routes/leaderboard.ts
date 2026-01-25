/**
 * Leaderboard API Routes
 * Endpoints for superforecaster rankings and tier system
 */

import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import type { SuperforecasterTier } from '@prisma/client';

export const leaderboardRoutes = new Hono();

// =============================================================================
// Types
// =============================================================================

interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  compositeScore: number;
  brierScore: number | null;
  calibrationScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  streakDays: number;
  isPrivate: boolean;
}

// =============================================================================
// Leaderboard Queries
// =============================================================================

/**
 * GET /leaderboard
 * Get the main leaderboard with pagination and filtering
 */
leaderboardRoutes.get('/', async (c) => {
  const query = c.req.query();

  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const offset = parseInt(query.offset || '0');
  const tier = query.tier as SuperforecasterTier | undefined;
  const minForecasts = parseInt(query.minForecasts || '0');
  const category = query.category;

  // Build where clause
  const where: Record<string, unknown> = {
    user: {
      showOnLeaderboard: true,
    },
  };

  if (tier) {
    where.currentTier = tier;
  }

  if (minForecasts > 0) {
    where.resolvedForecasts = { gte: minForecasts };
  }

  // Fetch calibration data with user info
  const [calibrations, total] = await Promise.all([
    prisma.userCalibration.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { globalRank: 'asc' },
        { avgBrierScore: 'asc' },
      ],
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            publicProfile: true,
            walletConnections: {
              where: { verifiedAt: { not: null } },
              take: 1,
              select: { address: true },
            },
          },
        },
      },
    }),
    prisma.userCalibration.count({ where }),
  ]);

  // Transform to leaderboard entries
  const entries: LeaderboardEntry[] = calibrations.map((cal, index) => {
    const rank = cal.globalRank ?? (offset + index + 1);
    const isPrivate = !cal.user.publicProfile;

    return {
      rank,
      previousRank: null, // TODO: Implement historical tracking
      userId: isPrivate ? 'anonymous' : cal.userId,
      displayName: isPrivate ? 'Anonymous Forecaster' : (cal.user.displayName || 'Forecaster'),
      tier: cal.currentTier,
      compositeScore: calculateCompositeScore(cal),
      brierScore: cal.avgBrierScore,
      calibrationScore: cal.avgTimeWeightedBrier,
      totalForecasts: cal.totalForecasts,
      resolvedForecasts: cal.resolvedForecasts,
      streakDays: 0, // TODO: Calculate from forecast history
      isPrivate,
    };
  });

  return c.json({
    success: true,
    data: {
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      },
      category: category || 'OVERALL',
      updatedAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /leaderboard/tiers
 * Get tier distribution and thresholds
 */
leaderboardRoutes.get('/tiers', async (c) => {
  // Get tier distribution
  const tierCounts = await prisma.userCalibration.groupBy({
    by: ['currentTier'],
    _count: true,
  });

  const tiers = [
    { tier: 'APPRENTICE', threshold: 0, description: 'Beginning forecaster' },
    { tier: 'JOURNEYMAN', threshold: 200, description: 'Developing accuracy' },
    { tier: 'EXPERT', threshold: 400, description: 'Consistently accurate' },
    { tier: 'MASTER', threshold: 600, description: 'Exceptional calibration' },
    { tier: 'GRANDMASTER', threshold: 800, description: 'Top-tier superforecaster' },
  ];

  const distribution = tiers.map((t) => ({
    ...t,
    count: tierCounts.find((tc) => tc.currentTier === t.tier)?._count || 0,
  }));

  return c.json({
    success: true,
    data: {
      tiers: distribution,
      totalForecasters: tierCounts.reduce((sum, tc) => sum + tc._count, 0),
    },
  });
});

/**
 * GET /leaderboard/user/:userId
 * Get a specific user's leaderboard position
 */
leaderboardRoutes.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const calibration = await prisma.userCalibration.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          publicProfile: true,
          showOnLeaderboard: true,
          walletConnections: {
            where: { verifiedAt: { not: null } },
            take: 1,
            select: { address: true },
          },
        },
      },
    },
  });

  if (!calibration) {
    return c.json(
      {
        success: false,
        error: 'User not found or has no calibration data',
      },
      404
    );
  }

  // Check privacy
  if (!calibration.user.publicProfile) {
    return c.json(
      {
        success: false,
        error: 'This user has a private profile',
      },
      403
    );
  }

  // Get surrounding forecasters
  const totalAbove = calibration.globalRank
    ? await prisma.userCalibration.count({
        where: { globalRank: { lt: calibration.globalRank } },
      })
    : 0;

  const total = await prisma.userCalibration.count({
    where: { user: { showOnLeaderboard: true } },
  });

  const percentile = total > 0 ? ((total - (calibration.globalRank || total)) / total) * 100 : 0;

  // Calculate tier progress
  const tierProgress = calculateTierProgress(
    calculateCompositeScore(calibration),
    calibration.currentTier
  );

  return c.json({
    success: true,
    data: {
      userId: calibration.userId,
      displayName: calibration.user.displayName || 'Forecaster',
      rank: calibration.globalRank || totalAbove + 1,
      percentile,
      tier: calibration.currentTier,
      tierProgress,
      compositeScore: calculateCompositeScore(calibration),
      brierScore: calibration.avgBrierScore,
      calibrationScore: calibration.avgTimeWeightedBrier,
      totalForecasts: calibration.totalForecasts,
      resolvedForecasts: calibration.resolvedForecasts,
      walletAddress: calibration.user.walletConnections[0]?.address || null,
    },
  });
});

/**
 * GET /leaderboard/top
 * Get top N forecasters (quick endpoint for displays)
 */
leaderboardRoutes.get('/top', async (c) => {
  const query = c.req.query();
  const count = Math.min(parseInt(query.count || '10'), 50);

  const calibrations = await prisma.userCalibration.findMany({
    where: {
      user: { showOnLeaderboard: true },
    },
    take: count,
    orderBy: { globalRank: 'asc' },
    include: {
      user: {
        select: {
          displayName: true,
          publicProfile: true,
        },
      },
    },
  });

  const topForecasters = calibrations.map((cal, index) => ({
    rank: cal.globalRank || index + 1,
    displayName: cal.user.publicProfile
      ? (cal.user.displayName || 'Forecaster')
      : 'Anonymous',
    tier: cal.currentTier,
    compositeScore: calculateCompositeScore(cal),
  }));

  return c.json({
    success: true,
    data: { topForecasters },
  });
});

/**
 * GET /leaderboard/by-category/:category
 * Get leaderboard filtered by market category
 */
leaderboardRoutes.get('/by-category/:category', async (c) => {
  const category = c.req.param('category').toUpperCase();
  const query = c.req.query();

  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const offset = parseInt(query.offset || '0');

  // For category-specific leaderboards, we need to aggregate from forecast scores
  // This requires joining with forecasts filtered by market category
  // For now, return the overall leaderboard with category metadata

  // Get calibrations
  const calibrations = await prisma.userCalibration.findMany({
    where: {
      user: { showOnLeaderboard: true },
    },
    take: limit,
    skip: offset,
    orderBy: { globalRank: 'asc' },
    include: {
      user: {
        select: {
          displayName: true,
          publicProfile: true,
        },
      },
    },
  });

  const entries = calibrations.map((cal, index) => ({
    rank: cal.globalRank || offset + index + 1,
    displayName: cal.user.publicProfile
      ? (cal.user.displayName || 'Forecaster')
      : 'Anonymous',
    tier: cal.currentTier,
    compositeScore: calculateCompositeScore(cal),
    totalForecasts: cal.totalForecasts,
  }));

  return c.json({
    success: true,
    data: {
      category,
      entries,
      note: 'Category-specific scoring coming soon',
    },
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate composite score from calibration data
 */
function calculateCompositeScore(calibration: {
  avgBrierScore: number | null;
  avgTimeWeightedBrier: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
}): number {
  if (calibration.totalForecasts === 0) {
    return 0;
  }

  const MAX_SCORE = 1000;
  const BRIER_WEIGHT = 0.55;
  const CALIBRATION_WEIGHT = 0.35;
  const VOLUME_WEIGHT = 0.05;
  const REMAINING_WEIGHT = 0.05;

  // Brier score component (lower is better, so we invert)
  const brierScore = calibration.avgBrierScore ?? 0.5;
  const brierComponent = (1 - brierScore) * MAX_SCORE * BRIER_WEIGHT;

  // Calibration component (using time-weighted Brier as proxy)
  const calibrationScore = 1 - (calibration.avgTimeWeightedBrier ?? 0.5);
  const calibrationComponent = calibrationScore * MAX_SCORE * CALIBRATION_WEIGHT;

  // Volume bonus
  const volumeRatio = Math.min(calibration.resolvedForecasts / 500, 1);
  const volumeBonus = calibration.resolvedForecasts >= 50
    ? volumeRatio * MAX_SCORE * VOLUME_WEIGHT
    : 0;

  // Base remaining component
  const baseBonus = REMAINING_WEIGHT * MAX_SCORE * 0.5;

  const total = Math.round(brierComponent + calibrationComponent + volumeBonus + baseBonus);

  return Math.min(total, MAX_SCORE);
}

/**
 * Calculate progress towards next tier
 */
function calculateTierProgress(
  compositeScore: number,
  currentTier: SuperforecasterTier
): number {
  const TIER_THRESHOLDS: Record<SuperforecasterTier, number> = {
    APPRENTICE: 0,
    JOURNEYMAN: 200,
    EXPERT: 400,
    MASTER: 600,
    GRANDMASTER: 800,
  };

  const TIER_ORDER: SuperforecasterTier[] = [
    'APPRENTICE',
    'JOURNEYMAN',
    'EXPERT',
    'MASTER',
    'GRANDMASTER',
  ];

  const tierIndex = TIER_ORDER.indexOf(currentTier);

  // If at max tier, show progress within that tier
  if (tierIndex === TIER_ORDER.length - 1) {
    const currentThreshold = TIER_THRESHOLDS[currentTier];
    const progressInTier = (compositeScore - currentThreshold) / (1000 - currentThreshold);
    return Math.min(progressInTier, 1);
  }

  const nextTier = TIER_ORDER[tierIndex + 1];
  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];

  const progress = (compositeScore - currentThreshold) / (nextThreshold - currentThreshold);
  return Math.max(0, Math.min(progress, 1));
}
