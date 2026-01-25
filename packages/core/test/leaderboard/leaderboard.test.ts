/**
 * Superforecaster Leaderboard Tests (Phase 6.1)
 * Tests for leaderboard data structures, scoring, and tier system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Types
  type LeaderboardEntry,
  type LeaderboardRanking,
  type LeaderboardFilter,
  type LeaderboardCategory,
  type ForecasterTier,
  type CompositeScore,
  type ReputationSource,
  type Achievement,
  // Constants
  FORECASTER_TIERS,
  TIER_THRESHOLDS,
  REPUTATION_WEIGHTS,
  // Functions
  calculateCompositeScore,
  calculateTier,
  calculateTierProgress,
  rankForecasters,
  filterLeaderboard,
  getLeaderboardByCategory,
  calculateStreakBonus,
  applyPrivacyFilter,
} from '../../src/leaderboard';

// =============================================================================
// Test Data
// =============================================================================

const mockForecaster = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
  address: '0x1234567890123456789012345678901234567890',
  ensName: null,
  displayName: 'Forecaster1',
  brierScore: 0.15,
  calibrationScore: 0.85,
  totalForecasts: 100,
  resolvedForecasts: 80,
  accuracy: 0.72,
  streakDays: 30,
  joinedAt: new Date('2024-01-01'),
  lastForecastAt: new Date('2024-12-01'),
  tier: 'JOURNEYMAN',
  tierProgress: 0.65,
  compositeScore: 850,
  rank: 1,
  previousRank: 2,
  isPrivate: false,
  externalReputations: [],
  achievements: [],
  ...overrides,
});

const mockReputationSource = (source: string, score: number): ReputationSource => ({
  platform: source as ReputationSource['platform'],
  score,
  lastUpdated: new Date(),
  verified: true,
});

// =============================================================================
// 6.1.1 - Leaderboard Data Structure Tests
// =============================================================================

describe('Phase 6.1.1 - Leaderboard Data Structure', () => {
  describe('FORECASTER_TIERS', () => {
    it('should define all tier levels', () => {
      expect(FORECASTER_TIERS).toContain('APPRENTICE');
      expect(FORECASTER_TIERS).toContain('JOURNEYMAN');
      expect(FORECASTER_TIERS).toContain('EXPERT');
      expect(FORECASTER_TIERS).toContain('MASTER');
      expect(FORECASTER_TIERS).toContain('GRANDMASTER');
    });

    it('should have tiers in ascending order', () => {
      const tierOrder = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];
      expect(FORECASTER_TIERS).toEqual(tierOrder);
    });
  });

  describe('TIER_THRESHOLDS', () => {
    it('should define thresholds for each tier', () => {
      expect(TIER_THRESHOLDS.APPRENTICE).toBe(0);
      expect(TIER_THRESHOLDS.JOURNEYMAN).toBeGreaterThan(TIER_THRESHOLDS.APPRENTICE);
      expect(TIER_THRESHOLDS.EXPERT).toBeGreaterThan(TIER_THRESHOLDS.JOURNEYMAN);
      expect(TIER_THRESHOLDS.MASTER).toBeGreaterThan(TIER_THRESHOLDS.EXPERT);
      expect(TIER_THRESHOLDS.GRANDMASTER).toBeGreaterThan(TIER_THRESHOLDS.MASTER);
    });
  });

  describe('LeaderboardEntry structure', () => {
    it('should have required fields', () => {
      const entry = mockForecaster();

      expect(entry.address).toBeDefined();
      expect(entry.brierScore).toBeDefined();
      expect(entry.calibrationScore).toBeDefined();
      expect(entry.totalForecasts).toBeDefined();
      expect(entry.tier).toBeDefined();
      expect(entry.compositeScore).toBeDefined();
      expect(entry.rank).toBeDefined();
    });

    it('should support optional ENS name', () => {
      const withEns = mockForecaster({ ensName: 'forecaster.eth' });
      const withoutEns = mockForecaster({ ensName: null });

      expect(withEns.ensName).toBe('forecaster.eth');
      expect(withoutEns.ensName).toBeNull();
    });

    it('should track rank changes', () => {
      const improving = mockForecaster({ rank: 5, previousRank: 10 });
      const declining = mockForecaster({ rank: 15, previousRank: 10 });

      expect(improving.rank).toBeLessThan(improving.previousRank!);
      expect(declining.rank).toBeGreaterThan(declining.previousRank!);
    });
  });
});

// =============================================================================
// 6.1.2 - Composite Scoring Algorithm Tests
// =============================================================================

describe('Phase 6.1.2 - Composite Scoring Algorithm', () => {
  describe('calculateCompositeScore', () => {
    it('should calculate score from Brier score and calibration', () => {
      const entry = mockForecaster({
        brierScore: 0.15,
        calibrationScore: 0.85,
        totalForecasts: 100,
      });

      const score = calculateCompositeScore(entry);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should weight Brier score heavily (lower is better)', () => {
      const goodBrier = mockForecaster({ brierScore: 0.1, calibrationScore: 0.7 });
      const badBrier = mockForecaster({ brierScore: 0.4, calibrationScore: 0.7 });

      expect(calculateCompositeScore(goodBrier)).toBeGreaterThan(
        calculateCompositeScore(badBrier)
      );
    });

    it('should factor in calibration score', () => {
      const wellCalibrated = mockForecaster({ brierScore: 0.2, calibrationScore: 0.9 });
      const poorlyCalibrated = mockForecaster({ brierScore: 0.2, calibrationScore: 0.5 });

      expect(calculateCompositeScore(wellCalibrated)).toBeGreaterThan(
        calculateCompositeScore(poorlyCalibrated)
      );
    });

    it('should apply volume bonus for high forecast count', () => {
      const highVolume = mockForecaster({ totalForecasts: 500, resolvedForecasts: 400 });
      const lowVolume = mockForecaster({ totalForecasts: 10, resolvedForecasts: 8 });

      // Same accuracy but different volumes
      highVolume.brierScore = 0.2;
      lowVolume.brierScore = 0.2;

      expect(calculateCompositeScore(highVolume)).toBeGreaterThan(
        calculateCompositeScore(lowVolume)
      );
    });

    it('should include external reputation when available', () => {
      const withReputation = mockForecaster({
        externalReputations: [
          mockReputationSource('POLYMARKET', 85),
          mockReputationSource('GITCOIN_PASSPORT', 70),
        ],
      });
      const withoutReputation = mockForecaster({ externalReputations: [] });

      // Set same internal metrics
      withReputation.brierScore = 0.2;
      withoutReputation.brierScore = 0.2;

      expect(calculateCompositeScore(withReputation)).toBeGreaterThan(
        calculateCompositeScore(withoutReputation)
      );
    });

    it('should handle edge cases gracefully', () => {
      const noForecasts = mockForecaster({ totalForecasts: 0, resolvedForecasts: 0 });
      const perfectScore = mockForecaster({ brierScore: 0, calibrationScore: 1 });

      expect(calculateCompositeScore(noForecasts)).toBe(0);
      expect(calculateCompositeScore(perfectScore)).toBeGreaterThan(900);
    });
  });

  describe('REPUTATION_WEIGHTS', () => {
    it('should define weights for all reputation sources', () => {
      expect(REPUTATION_WEIGHTS.CALIBR).toBeDefined();
      expect(REPUTATION_WEIGHTS.POLYMARKET).toBeDefined();
      expect(REPUTATION_WEIGHTS.LIMITLESS).toBeDefined();
      expect(REPUTATION_WEIGHTS.GITCOIN_PASSPORT).toBeDefined();
      expect(REPUTATION_WEIGHTS.COINBASE_VERIFICATION).toBeDefined();
    });

    it('should have Calibr score as highest weight', () => {
      expect(REPUTATION_WEIGHTS.CALIBR).toBeGreaterThan(REPUTATION_WEIGHTS.POLYMARKET);
      expect(REPUTATION_WEIGHTS.CALIBR).toBeGreaterThan(REPUTATION_WEIGHTS.GITCOIN_PASSPORT);
    });

    it('should have weights sum to approximately 1', () => {
      const totalWeight = Object.values(REPUTATION_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });
  });
});

// =============================================================================
// 6.1.3 - Tier Calculation System Tests
// =============================================================================

describe('Phase 6.1.3 - Tier Calculation System', () => {
  describe('calculateTier', () => {
    it('should return APPRENTICE for low scores', () => {
      expect(calculateTier(0)).toBe('APPRENTICE');
      expect(calculateTier(100)).toBe('APPRENTICE');
    });

    it('should return JOURNEYMAN for intermediate scores', () => {
      expect(calculateTier(300)).toBe('JOURNEYMAN');
    });

    it('should return EXPERT for higher scores', () => {
      expect(calculateTier(500)).toBe('EXPERT');
    });

    it('should return MASTER for excellent scores', () => {
      expect(calculateTier(700)).toBe('MASTER');
    });

    it('should return GRANDMASTER for top scores', () => {
      expect(calculateTier(900)).toBe('GRANDMASTER');
    });

    it('should handle exact threshold boundaries', () => {
      // At exactly the threshold, should be the higher tier
      expect(calculateTier(TIER_THRESHOLDS.JOURNEYMAN)).toBe('JOURNEYMAN');
      expect(calculateTier(TIER_THRESHOLDS.EXPERT)).toBe('EXPERT');
    });
  });

  describe('calculateTierProgress', () => {
    it('should return 0 at tier start', () => {
      const progress = calculateTierProgress(TIER_THRESHOLDS.JOURNEYMAN, 'JOURNEYMAN');
      expect(progress).toBe(0);
    });

    it('should return progress towards next tier', () => {
      const midPoint = (TIER_THRESHOLDS.JOURNEYMAN + TIER_THRESHOLDS.EXPERT) / 2;
      const progress = calculateTierProgress(midPoint, 'JOURNEYMAN');
      expect(progress).toBeCloseTo(0.5, 1);
    });

    it('should cap at 1 for max tier', () => {
      const progress = calculateTierProgress(1000, 'GRANDMASTER');
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateStreakBonus', () => {
    it('should return 0 for no streak', () => {
      expect(calculateStreakBonus(0)).toBe(0);
    });

    it('should give small bonus for short streaks', () => {
      const bonus = calculateStreakBonus(7);
      expect(bonus).toBeGreaterThan(0);
      expect(bonus).toBeLessThan(50);
    });

    it('should give larger bonus for long streaks', () => {
      const shortStreak = calculateStreakBonus(7);
      const longStreak = calculateStreakBonus(30);

      expect(longStreak).toBeGreaterThan(shortStreak);
    });

    it('should cap bonus at maximum', () => {
      const veryLongStreak = calculateStreakBonus(365);
      const maxStreak = calculateStreakBonus(1000);

      expect(veryLongStreak).toBe(maxStreak);
    });
  });
});

// =============================================================================
// 6.1.4 - Leaderboard Ranking & Filtering Tests
// =============================================================================

describe('Phase 6.1.4 - Leaderboard Ranking & Filtering', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      mockForecaster({ address: '0x1111', compositeScore: 800, tier: 'MASTER' }),
      mockForecaster({ address: '0x2222', compositeScore: 600, tier: 'EXPERT' }),
      mockForecaster({ address: '0x3333', compositeScore: 900, tier: 'GRANDMASTER' }),
      mockForecaster({ address: '0x4444', compositeScore: 400, tier: 'JOURNEYMAN' }),
      mockForecaster({ address: '0x5555', compositeScore: 200, tier: 'APPRENTICE' }),
    ];
  });

  describe('rankForecasters', () => {
    it('should rank by composite score descending', () => {
      const ranked = rankForecasters(forecasters);

      expect(ranked[0].address).toBe('0x3333'); // 900
      expect(ranked[1].address).toBe('0x1111'); // 800
      expect(ranked[2].address).toBe('0x2222'); // 600
    });

    it('should assign correct rank numbers', () => {
      const ranked = rankForecasters(forecasters);

      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[4].rank).toBe(5);
    });

    it('should handle ties by earlier join date', () => {
      const tiedForecasters = [
        mockForecaster({ address: '0xaaa', compositeScore: 500, joinedAt: new Date('2024-06-01') }),
        mockForecaster({ address: '0xbbb', compositeScore: 500, joinedAt: new Date('2024-01-01') }),
      ];

      const ranked = rankForecasters(tiedForecasters);

      expect(ranked[0].address).toBe('0xbbb'); // Earlier join date
    });
  });

  describe('filterLeaderboard', () => {
    it('should filter by tier', () => {
      const filter: LeaderboardFilter = { tier: 'MASTER' };
      const filtered = filterLeaderboard(forecasters, filter);

      expect(filtered.length).toBe(1);
      expect(filtered[0].tier).toBe('MASTER');
    });

    it('should filter by minimum forecasts', () => {
      forecasters[0].totalForecasts = 50;
      forecasters[1].totalForecasts = 150;

      const filter: LeaderboardFilter = { minForecasts: 100 };
      const filtered = filterLeaderboard(forecasters, filter);

      expect(filtered.every((f) => f.totalForecasts >= 100)).toBe(true);
    });

    it('should filter by time period', () => {
      forecasters[0].lastForecastAt = new Date('2025-01-20');
      forecasters[1].lastForecastAt = new Date('2024-06-01');

      const filter: LeaderboardFilter = {
        activeSince: new Date('2025-01-01'),
      };
      const filtered = filterLeaderboard(forecasters, filter);

      expect(filtered.length).toBe(1);
    });

    it('should combine multiple filters', () => {
      const filter: LeaderboardFilter = {
        tier: 'EXPERT',
        minForecasts: 50,
      };

      forecasters[1].totalForecasts = 150;

      const filtered = filterLeaderboard(forecasters, filter);

      expect(filtered.every((f) => f.tier === 'EXPERT' && f.totalForecasts >= 50)).toBe(true);
    });
  });

  describe('getLeaderboardByCategory', () => {
    it('should return overall leaderboard by default', () => {
      const result = getLeaderboardByCategory(forecasters, 'OVERALL');

      expect(result.category).toBe('OVERALL');
      expect(result.entries.length).toBe(5);
    });

    it('should return platform-specific leaderboard', () => {
      forecasters[0].externalReputations = [mockReputationSource('POLYMARKET', 90)];
      forecasters[1].externalReputations = [mockReputationSource('LIMITLESS', 80)];

      const result = getLeaderboardByCategory(forecasters, 'POLYMARKET');

      expect(result.category).toBe('POLYMARKET');
      expect(result.entries.every((e) =>
        e.externalReputations.some((r) => r.platform === 'POLYMARKET')
      )).toBe(true);
    });
  });

  describe('applyPrivacyFilter', () => {
    it('should hide private forecasters', () => {
      forecasters[0].isPrivate = true;
      forecasters[1].isPrivate = false;

      const filtered = applyPrivacyFilter(forecasters);

      expect(filtered.every((f) => !f.isPrivate)).toBe(true);
    });

    it('should anonymize private entries when includeAnonymous is true', () => {
      forecasters[0].isPrivate = true;
      forecasters[0].displayName = 'SecretUser';

      const filtered = applyPrivacyFilter(forecasters, { includeAnonymous: true });

      const anonymized = filtered.find((f) => f.address === forecasters[0].address);
      expect(anonymized?.displayName).toBe('Anonymous Forecaster');
    });

    it('should preserve public entries unchanged', () => {
      forecasters[0].isPrivate = false;
      forecasters[0].displayName = 'PublicUser';

      const filtered = applyPrivacyFilter(forecasters);

      expect(filtered[0].displayName).toBe('PublicUser');
    });
  });
});

// =============================================================================
// 6.1.6 - Historical Tracking Tests
// =============================================================================

describe('Phase 6.1.6 - Historical Leaderboard Tracking', () => {
  describe('LeaderboardRanking historical data', () => {
    it('should track previous rank', () => {
      const entry = mockForecaster({ rank: 5, previousRank: 10 });

      expect(entry.previousRank).toBe(10);
      expect(entry.rank - entry.previousRank!).toBe(-5); // Improved by 5
    });

    it('should indicate rank direction', () => {
      const improved = mockForecaster({ rank: 5, previousRank: 10 });
      const declined = mockForecaster({ rank: 15, previousRank: 10 });
      const stable = mockForecaster({ rank: 10, previousRank: 10 });

      expect(improved.rank < improved.previousRank!).toBe(true);
      expect(declined.rank > declined.previousRank!).toBe(true);
      expect(stable.rank === stable.previousRank!).toBe(true);
    });
  });
});

// =============================================================================
// 6.1.7 - Leaderboard Categories Tests
// =============================================================================

describe('Phase 6.1.7 - Leaderboard Categories', () => {
  const categories: LeaderboardCategory[] = [
    'OVERALL',
    'POLYMARKET',
    'LIMITLESS',
    'CRYPTO',
    'POLITICS',
    'SPORTS',
  ];

  it('should support all defined categories', () => {
    categories.forEach((category) => {
      expect(['OVERALL', 'POLYMARKET', 'LIMITLESS', 'CRYPTO', 'POLITICS', 'SPORTS']).toContain(
        category
      );
    });
  });
});

// =============================================================================
// Achievement System Tests (6.2 preview)
// =============================================================================

describe('Phase 6.2 - Achievement Definitions', () => {
  describe('Achievement structure', () => {
    it('should define achievement types', () => {
      const streakAchievement: Achievement = {
        id: 'STREAK_30',
        name: '30 Day Streak',
        description: 'Made forecasts for 30 consecutive days',
        category: 'STREAK',
        tier: 'SILVER',
        unlockedAt: new Date(),
        progress: 1,
        maxProgress: 1,
      };

      expect(streakAchievement.id).toBeDefined();
      expect(streakAchievement.category).toBe('STREAK');
    });

    it('should track achievement progress', () => {
      const inProgress: Achievement = {
        id: 'FORECASTS_100',
        name: 'Century Forecaster',
        description: 'Make 100 forecasts',
        category: 'VOLUME',
        tier: 'BRONZE',
        unlockedAt: null,
        progress: 75,
        maxProgress: 100,
      };

      expect(inProgress.progress).toBeLessThan(inProgress.maxProgress);
      expect(inProgress.unlockedAt).toBeNull();
    });
  });
});
