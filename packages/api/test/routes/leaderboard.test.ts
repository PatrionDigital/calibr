/**
 * Leaderboard Routes Integration Tests
 * Tests superforecaster rankings, tiers, and achievements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { leaderboardRoutes } from '../../src/routes/leaderboard';

// Mock @calibr/core/leaderboard
vi.mock('@calibr/core/leaderboard', () => ({
  ACHIEVEMENT_DEFINITIONS: [
    { id: 'first_forecast', name: 'First Forecast', description: 'Make your first forecast', category: 'VOLUME', tier: 'BRONZE', maxProgress: 1 },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'STREAK', tier: 'SILVER', maxProgress: 7 },
    { id: 'accuracy_master', name: 'Accuracy Master', description: 'Achieve 90% accuracy', category: 'ACCURACY', tier: 'GOLD', maxProgress: 90 },
  ],
  getAchievementsByCategory: vi.fn((category: string) => {
    const all = [
      { id: 'first_forecast', name: 'First Forecast', description: 'Make your first forecast', category: 'VOLUME', tier: 'BRONZE', maxProgress: 1 },
      { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'STREAK', tier: 'SILVER', maxProgress: 7 },
      { id: 'accuracy_master', name: 'Accuracy Master', description: 'Achieve 90% accuracy', category: 'ACCURACY', tier: 'GOLD', maxProgress: 90 },
    ];
    return all.filter((a) => a.category === category);
  }),
  checkAchievements: vi.fn(() => [
    { id: 'first_forecast', name: 'First Forecast', description: 'Make your first forecast', category: 'VOLUME', tier: 'BRONZE', progress: 1, maxProgress: 1, unlockedAt: new Date() },
    { id: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'STREAK', tier: 'SILVER', progress: 3, maxProgress: 7, unlockedAt: null },
  ]),
  calculateAchievementScore: vi.fn(() => 100),
  ACHIEVEMENT_TIER_COLORS: { BRONZE: '#cd7f32', SILVER: '#c0c0c0', GOLD: '#ffd700' },
  ACHIEVEMENT_CATEGORY_LABELS: { STREAK: 'Streak', VOLUME: 'Volume', ACCURACY: 'Accuracy', CALIBRATION: 'Calibration', SPECIAL: 'Special' },
  detectTierChange: vi.fn((oldTier: string, newTier: string) => ({
    changed: oldTier !== newTier,
    previousTier: oldTier,
    newTier: newTier,
    direction: oldTier < newTier ? 'up' : 'down',
    delta: 1,
    shouldCelebrate: oldTier !== newTier && oldTier < newTier,
  })),
  createTierBadgeData: vi.fn(() => ({
    tier: 'EXPERT',
    achievedAt: new Date().toISOString(),
    rank: 50,
    category: 'OVERALL',
  })),
  formatTierBadgeForAttestation: vi.fn(() => ({
    tierLevel: 2,
    achievedAt: Date.now(),
    rank: 50,
  })),
}));

// Mock prisma
vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    userCalibration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
    },
    achievementUnlock: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as unknown as {
  userCalibration: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  achievementUnlock: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

// Create test app
const app = new Hono();
app.route('/leaderboard', leaderboardRoutes);

describe('Leaderboard Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // GET /leaderboard Tests
  // =============================================================================

  describe('GET /leaderboard', () => {
    it('should return empty leaderboard when no calibrations', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      const res = await app.request('/leaderboard');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.entries).toEqual([]);
      expect(data.data.pagination.total).toBe(0);
    });

    it('should return leaderboard entries with correct structure', async () => {
      const mockCalibration = {
        userId: 'user-1',
        globalRank: 1,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          id: 'user-1',
          displayName: 'Top Forecaster',
          publicProfile: true,
          walletConnections: [{ address: '0x1234' }],
        },
      };

      mockPrisma.userCalibration.findMany.mockResolvedValue([mockCalibration]);
      mockPrisma.userCalibration.count.mockResolvedValue(1);

      const res = await app.request('/leaderboard');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.entries).toHaveLength(1);
      expect(data.data.entries[0].rank).toBe(1);
      expect(data.data.entries[0].displayName).toBe('Top Forecaster');
      expect(data.data.entries[0].tier).toBe('EXPERT');
      expect(data.data.entries[0].isPrivate).toBe(false);
    });

    it('should anonymize private profiles', async () => {
      const mockCalibration = {
        userId: 'user-1',
        globalRank: 1,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          id: 'user-1',
          displayName: 'Secret User',
          publicProfile: false,
          walletConnections: [],
        },
      };

      mockPrisma.userCalibration.findMany.mockResolvedValue([mockCalibration]);
      mockPrisma.userCalibration.count.mockResolvedValue(1);

      const res = await app.request('/leaderboard');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.entries[0].userId).toBe('anonymous');
      expect(data.data.entries[0].displayName).toBe('Anonymous Forecaster');
      expect(data.data.entries[0].isPrivate).toBe(true);
    });

    it('should respect limit and offset parameters', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(100);

      await app.request('/leaderboard?limit=10&offset=20');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should cap limit at 100', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      await app.request('/leaderboard?limit=200');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should filter by tier when provided', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      await app.request('/leaderboard?tier=EXPERT');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentTier: 'EXPERT',
          }),
        })
      );
    });

    it('should filter by minimum forecasts when provided', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      await app.request('/leaderboard?minForecasts=50');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resolvedForecasts: { gte: 50 },
          }),
        })
      );
    });

    it('should include category metadata in response', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      const res = await app.request('/leaderboard?category=CRYPTO');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.category).toBe('CRYPTO');
    });

    it('should default category to OVERALL', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);
      mockPrisma.userCalibration.count.mockResolvedValue(0);

      const res = await app.request('/leaderboard');

      const data = await res.json();
      expect(data.data.category).toBe('OVERALL');
    });
  });

  // =============================================================================
  // GET /leaderboard/tiers Tests
  // =============================================================================

  describe('GET /leaderboard/tiers', () => {
    it('should return tier distribution', async () => {
      mockPrisma.userCalibration.groupBy.mockResolvedValue([
        { currentTier: 'APPRENTICE', _count: 100 },
        { currentTier: 'JOURNEYMAN', _count: 50 },
        { currentTier: 'EXPERT', _count: 20 },
        { currentTier: 'MASTER', _count: 5 },
        { currentTier: 'GRANDMASTER', _count: 1 },
      ]);

      const res = await app.request('/leaderboard/tiers');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.tiers).toHaveLength(5);
      expect(data.data.totalForecasters).toBe(176);
    });

    it('should include tier thresholds and descriptions', async () => {
      mockPrisma.userCalibration.groupBy.mockResolvedValue([]);

      const res = await app.request('/leaderboard/tiers');

      const data = await res.json();
      expect(data.data.tiers[0]).toEqual(expect.objectContaining({
        tier: 'APPRENTICE',
        threshold: 0,
        description: 'Beginning forecaster',
      }));
      expect(data.data.tiers[4]).toEqual(expect.objectContaining({
        tier: 'GRANDMASTER',
        threshold: 800,
        description: 'Top-tier superforecaster',
      }));
    });

    it('should handle empty tier counts', async () => {
      mockPrisma.userCalibration.groupBy.mockResolvedValue([]);

      const res = await app.request('/leaderboard/tiers');

      const data = await res.json();
      expect(data.data.totalForecasters).toBe(0);
      expect(data.data.tiers.every((t: { count: number }) => t.count === 0)).toBe(true);
    });
  });

  // =============================================================================
  // GET /leaderboard/user/:userId Tests
  // =============================================================================

  describe('GET /leaderboard/user/:userId', () => {
    it('should return 404 when user not found', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);

      const res = await app.request('/leaderboard/user/non-existent');

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not found or has no calibration data');
    });

    it('should return 403 for private profile', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        user: {
          publicProfile: false,
          showOnLeaderboard: true,
          displayName: 'Private User',
          walletConnections: [],
        },
      });

      const res = await app.request('/leaderboard/user/user-1');

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('This user has a private profile');
    });

    it('should return user leaderboard position', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 25,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          id: 'user-1',
          displayName: 'Test User',
          publicProfile: true,
          showOnLeaderboard: true,
          walletConnections: [{ address: '0x1234abcd' }],
        },
      });
      mockPrisma.userCalibration.count.mockResolvedValue(100);

      const res = await app.request('/leaderboard/user/user-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-1');
      expect(data.data.displayName).toBe('Test User');
      expect(data.data.rank).toBe(25);
      expect(data.data.tier).toBe('EXPERT');
      expect(data.data.walletAddress).toBe('0x1234abcd');
    });

    it('should calculate percentile correctly', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 10,
        currentTier: 'MASTER',
        avgBrierScore: 0.15,
        avgTimeWeightedBrier: 0.14,
        totalForecasts: 200,
        resolvedForecasts: 150,
        user: {
          displayName: 'Pro Forecaster',
          publicProfile: true,
          showOnLeaderboard: true,
          walletConnections: [],
        },
      });
      mockPrisma.userCalibration.count.mockResolvedValue(100);

      const res = await app.request('/leaderboard/user/user-1');

      const data = await res.json();
      expect(data.data.percentile).toBeGreaterThan(0);
    });

    it('should include tier progress', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 50,
        currentTier: 'JOURNEYMAN',
        avgBrierScore: 0.3,
        avgTimeWeightedBrier: 0.28,
        totalForecasts: 50,
        resolvedForecasts: 40,
        user: {
          displayName: 'Rising Star',
          publicProfile: true,
          showOnLeaderboard: true,
          walletConnections: [],
        },
      });
      mockPrisma.userCalibration.count.mockResolvedValue(100);

      const res = await app.request('/leaderboard/user/user-1');

      const data = await res.json();
      expect(data.data.tierProgress).toBeGreaterThanOrEqual(0);
      expect(data.data.tierProgress).toBeLessThanOrEqual(1);
    });
  });

  // =============================================================================
  // GET /leaderboard/top Tests
  // =============================================================================

  describe('GET /leaderboard/top', () => {
    it('should return top forecasters with default count', async () => {
      const mockCalibrations = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i + 1}`,
        globalRank: i + 1,
        currentTier: 'MASTER',
        avgBrierScore: 0.1 + i * 0.01,
        avgTimeWeightedBrier: 0.1 + i * 0.01,
        totalForecasts: 100 - i * 5,
        resolvedForecasts: 80 - i * 4,
        user: {
          displayName: `Top ${i + 1}`,
          publicProfile: true,
        },
      }));

      mockPrisma.userCalibration.findMany.mockResolvedValue(mockCalibrations);

      const res = await app.request('/leaderboard/top');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.topForecasters).toHaveLength(10);
    });

    it('should respect count parameter', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);

      await app.request('/leaderboard/top?count=5');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should cap count at 50', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);

      await app.request('/leaderboard/top?count=100');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should anonymize private profiles in top list', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          globalRank: 1,
          currentTier: 'GRANDMASTER',
          avgBrierScore: 0.1,
          avgTimeWeightedBrier: 0.1,
          totalForecasts: 500,
          resolvedForecasts: 400,
          user: {
            displayName: 'Hidden Champion',
            publicProfile: false,
          },
        },
      ]);

      const res = await app.request('/leaderboard/top');

      const data = await res.json();
      expect(data.data.topForecasters[0].displayName).toBe('Anonymous');
    });
  });

  // =============================================================================
  // GET /leaderboard/by-category/:category Tests
  // =============================================================================

  describe('GET /leaderboard/by-category/:category', () => {
    it('should return leaderboard with category metadata', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);

      const res = await app.request('/leaderboard/by-category/crypto');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('CRYPTO');
      expect(data.data.note).toBe('Category-specific scoring coming soon');
    });

    it('should uppercase the category', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);

      const res = await app.request('/leaderboard/by-category/politics');

      const data = await res.json();
      expect(data.data.category).toBe('POLITICS');
    });

    it('should support pagination', async () => {
      mockPrisma.userCalibration.findMany.mockResolvedValue([]);

      await app.request('/leaderboard/by-category/sports?limit=25&offset=50');

      expect(mockPrisma.userCalibration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        })
      );
    });
  });

  // =============================================================================
  // GET /leaderboard/achievements Tests
  // =============================================================================

  describe('GET /leaderboard/achievements', () => {
    it('should return all achievement definitions', async () => {
      const res = await app.request('/leaderboard/achievements');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.achievements).toBeDefined();
      expect(data.data.categories).toBeDefined();
      expect(data.data.tierColors).toBeDefined();
    });

    it('should filter achievements by category', async () => {
      const res = await app.request('/leaderboard/achievements?category=streak');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.achievements.every((a: { category: string }) => a.category === 'STREAK')).toBe(true);
    });

    it('should include category labels', async () => {
      const res = await app.request('/leaderboard/achievements');

      const data = await res.json();
      expect(data.data.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'STREAK', label: 'Streak' }),
          expect.objectContaining({ key: 'VOLUME', label: 'Volume' }),
        ])
      );
    });
  });

  // =============================================================================
  // GET /leaderboard/achievements/user/:userId Tests
  // =============================================================================

  describe('GET /leaderboard/achievements/user/:userId', () => {
    it('should return 404 when user not found', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);

      const res = await app.request('/leaderboard/achievements/user/non-existent');

      expect(res.status).toBe(404);
    });

    it('should return user achievements', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 50,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          displayName: 'Achievement Hunter',
          publicProfile: true,
        },
      });

      const res = await app.request('/leaderboard/achievements/user/user-1');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-1');
      expect(data.data.achievementScore).toBeDefined();
      expect(data.data.unlocked).toBeDefined();
      expect(data.data.inProgress).toBeDefined();
    });

    it('should separate unlocked and in-progress achievements', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 50,
        currentTier: 'JOURNEYMAN',
        avgBrierScore: 0.25,
        avgTimeWeightedBrier: 0.23,
        totalForecasts: 50,
        resolvedForecasts: 40,
        user: {
          displayName: 'Test User',
          publicProfile: true,
        },
      });

      const res = await app.request('/leaderboard/achievements/user/user-1');

      const data = await res.json();
      expect(data.data.unlocked.every((a: { unlockedAt: Date | null }) => a.unlockedAt !== null)).toBe(true);
      expect(data.data.inProgress.every((a: { unlockedAt: Date | null }) => a.unlockedAt === null)).toBe(true);
    });
  });

  // =============================================================================
  // GET /leaderboard/achievements/stats Tests
  // =============================================================================

  describe('GET /leaderboard/achievements/stats', () => {
    it('should return achievement statistics', async () => {
      mockPrisma.userCalibration.count.mockResolvedValue(500);

      const res = await app.request('/leaderboard/achievements/stats');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.totalAchievements).toBeDefined();
      expect(data.data.categoryStats).toBeDefined();
      expect(data.data.totalUsers).toBe(500);
    });

    it('should include category breakdown', async () => {
      mockPrisma.userCalibration.count.mockResolvedValue(100);

      const res = await app.request('/leaderboard/achievements/stats');

      const data = await res.json();
      expect(data.data.categoryStats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ category: 'STREAK' }),
          expect.objectContaining({ category: 'VOLUME' }),
        ])
      );
    });
  });

  // =============================================================================
  // POST /leaderboard/achievements/check/:userId Tests
  // =============================================================================

  describe('POST /leaderboard/achievements/check/:userId', () => {
    it('should return 404 when user not found', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([]);

      const res = await app.request('/leaderboard/achievements/check/non-existent', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should check and return newly unlocked achievements', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 50,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          displayName: 'Test User',
          publicProfile: true,
        },
      });
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([]);
      mockPrisma.achievementUnlock.createMany.mockResolvedValue({ count: 1 });

      const res = await app.request('/leaderboard/achievements/check/user-1', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.userId).toBe('user-1');
      expect(data.data.newlyUnlocked).toBeDefined();
    });

    it('should not duplicate existing unlocks', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        globalRank: 50,
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        user: {
          displayName: 'Test User',
          publicProfile: true,
        },
      });
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([
        { achievementId: 'first_forecast' },
      ]);

      const res = await app.request('/leaderboard/achievements/check/user-1', {
        method: 'POST',
      });

      const data = await res.json();
      expect(data.data.newlyUnlocked).not.toContainEqual(
        expect.objectContaining({ id: 'first_forecast' })
      );
    });
  });

  // =============================================================================
  // GET /leaderboard/achievements/recent Tests
  // =============================================================================

  describe('GET /leaderboard/achievements/recent', () => {
    it('should return recent achievement unlocks', async () => {
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([
        {
          achievementId: 'first_forecast',
          category: 'VOLUME',
          tier: 'BRONZE',
          createdAt: new Date(),
          userId: 'user-1',
        },
      ]);

      const res = await app.request('/leaderboard/achievements/recent');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.recentUnlocks).toBeDefined();
      expect(data.data.recentUnlocks).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([]);

      await app.request('/leaderboard/achievements/recent?limit=5');

      expect(mockPrisma.achievementUnlock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should cap limit at 50', async () => {
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([]);

      await app.request('/leaderboard/achievements/recent?limit=100');

      expect(mockPrisma.achievementUnlock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    it('should include achievement details in response', async () => {
      mockPrisma.achievementUnlock.findMany.mockResolvedValue([
        {
          achievementId: 'first_forecast',
          category: 'VOLUME',
          tier: 'BRONZE',
          createdAt: new Date('2024-01-15'),
          userId: 'user-1',
        },
      ]);

      const res = await app.request('/leaderboard/achievements/recent');

      const data = await res.json();
      expect(data.data.recentUnlocks[0]).toEqual(expect.objectContaining({
        achievementId: 'first_forecast',
        name: 'First Forecast',
        category: 'VOLUME',
        tier: 'BRONZE',
      }));
    });
  });

  // =============================================================================
  // POST /leaderboard/tier/check/:userId Tests
  // =============================================================================

  describe('POST /leaderboard/tier/check/:userId', () => {
    it('should return 404 when user not found', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue(null);

      const res = await app.request('/leaderboard/tier/check/non-existent', {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });

    it('should return no change when tier is same', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        currentTier: 'EXPERT',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        globalRank: 50,
        user: {
          displayName: 'Test User',
        },
      });

      // Mock detectTierChange to return no change
      const { detectTierChange } = await import('@calibr/core/leaderboard');
      vi.mocked(detectTierChange).mockReturnValue({
        changed: false,
        previousTier: 'EXPERT',
        newTier: 'EXPERT',
        direction: 'same',
        delta: 0,
        shouldCelebrate: false,
      });

      const res = await app.request('/leaderboard/tier/check/user-1', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.tierChanged).toBe(false);
      expect(data.data.currentTier).toBe('EXPERT');
    });

    it('should return celebration data on tier promotion', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        currentTier: 'JOURNEYMAN',
        avgBrierScore: 0.2,
        avgTimeWeightedBrier: 0.18,
        totalForecasts: 100,
        resolvedForecasts: 80,
        globalRank: 50,
        user: {
          displayName: 'Rising Star',
        },
      });
      mockPrisma.userCalibration.update.mockResolvedValue({});

      // Mock detectTierChange to return promotion
      const { detectTierChange } = await import('@calibr/core/leaderboard');
      vi.mocked(detectTierChange).mockReturnValue({
        changed: true,
        previousTier: 'JOURNEYMAN',
        newTier: 'EXPERT',
        direction: 'up',
        delta: 1,
        shouldCelebrate: true,
      });

      const res = await app.request('/leaderboard/tier/check/user-1', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.tierChanged).toBe(true);
      expect(data.data.tierChange.previousTier).toBe('JOURNEYMAN');
      expect(data.data.tierChange.newTier).toBe('EXPERT');
      expect(data.data.celebration).toBeDefined();
      expect(data.data.celebration.show).toBe(true);
    });

    it('should update database when tier changes', async () => {
      mockPrisma.userCalibration.findUnique.mockResolvedValue({
        userId: 'user-1',
        currentTier: 'EXPERT',
        avgBrierScore: 0.15,
        avgTimeWeightedBrier: 0.14,
        totalForecasts: 200,
        resolvedForecasts: 160,
        globalRank: 25,
        user: {
          displayName: 'Climbing',
        },
      });
      mockPrisma.userCalibration.update.mockResolvedValue({});

      const { detectTierChange } = await import('@calibr/core/leaderboard');
      vi.mocked(detectTierChange).mockReturnValue({
        changed: true,
        previousTier: 'EXPERT',
        newTier: 'MASTER',
        direction: 'up',
        delta: 1,
        shouldCelebrate: true,
      });

      await app.request('/leaderboard/tier/check/user-1', {
        method: 'POST',
      });

      expect(mockPrisma.userCalibration.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            currentTier: expect.any(String),
            tierPromotedAt: expect.any(Date),
          }),
        })
      );
    });
  });
});
