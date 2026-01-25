/**
 * Achievement System Tests (Phase 6.2)
 * Tests for achievement definitions, unlock logic, and tracking
 */

import { describe, it, expect } from 'vitest';
import {
  type LeaderboardEntry,
  type Achievement,
  // Achievement functions
  ACHIEVEMENT_DEFINITIONS,
  getAchievementDefinition,
  getAllAchievementDefinitions,
  getAchievementsByCategory,
  checkAchievements,
  checkNewlyUnlocked,
  getUnlockedAchievements,
  getInProgressAchievements,
  calculateAchievementScore,
  getTierDisplayName,
  formatAchievementProgress,
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
  compositeScore: 500,
  rank: 50,
  previousRank: 60,
  isPrivate: false,
  externalReputations: [],
  achievements: [],
  ...overrides,
});

// =============================================================================
// Achievement Definitions Tests
// =============================================================================

describe('Phase 6.2 - Achievement Definitions', () => {
  describe('ACHIEVEMENT_DEFINITIONS', () => {
    it('should have all required categories', () => {
      const categories = new Set(ACHIEVEMENT_DEFINITIONS.map((a) => a.category));
      expect(categories.has('STREAK')).toBe(true);
      expect(categories.has('VOLUME')).toBe(true);
      expect(categories.has('ACCURACY')).toBe(true);
      expect(categories.has('CALIBRATION')).toBe(true);
      expect(categories.has('SPECIAL')).toBe(true);
    });

    it('should have all required tiers', () => {
      const tiers = new Set(ACHIEVEMENT_DEFINITIONS.map((a) => a.tier));
      expect(tiers.has('BRONZE')).toBe(true);
      expect(tiers.has('SILVER')).toBe(true);
      expect(tiers.has('GOLD')).toBe(true);
      expect(tiers.has('PLATINUM')).toBe(true);
      expect(tiers.has('DIAMOND')).toBe(true);
    });

    it('should have unique IDs', () => {
      const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid checkCriteria functions', () => {
      const forecaster = mockForecaster();
      ACHIEVEMENT_DEFINITIONS.forEach((def) => {
        const result = def.checkCriteria(forecaster);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getAchievementDefinition', () => {
    it('should return definition for valid ID', () => {
      const def = getAchievementDefinition('STREAK_7');
      expect(def).toBeDefined();
      expect(def?.name).toBe('Week Warrior');
    });

    it('should return undefined for invalid ID', () => {
      const def = getAchievementDefinition('INVALID_ID');
      expect(def).toBeUndefined();
    });
  });

  describe('getAllAchievementDefinitions', () => {
    it('should return all definitions', () => {
      const defs = getAllAchievementDefinitions();
      expect(defs.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
    });
  });

  describe('getAchievementsByCategory', () => {
    it('should filter by category', () => {
      const streakAchievements = getAchievementsByCategory('STREAK');
      expect(streakAchievements.length).toBeGreaterThan(0);
      expect(streakAchievements.every((a) => a.category === 'STREAK')).toBe(true);
    });
  });
});

// =============================================================================
// Achievement Checking Tests
// =============================================================================

describe('Phase 6.2 - Achievement Checking', () => {
  describe('checkAchievements', () => {
    it('should return achievements for all definitions', () => {
      const forecaster = mockForecaster();
      const achievements = checkAchievements(forecaster);
      expect(achievements.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
    });

    it('should unlock streak achievements based on streak days', () => {
      const forecaster = mockForecaster({ streakDays: 35 });
      const achievements = checkAchievements(forecaster);

      const streak7 = achievements.find((a) => a.id === 'STREAK_7');
      const streak30 = achievements.find((a) => a.id === 'STREAK_30');
      const streak90 = achievements.find((a) => a.id === 'STREAK_90');

      expect(streak7?.unlockedAt).not.toBeNull();
      expect(streak30?.unlockedAt).not.toBeNull();
      expect(streak90?.unlockedAt).toBeNull();
    });

    it('should unlock volume achievements based on total forecasts', () => {
      const forecaster = mockForecaster({ totalForecasts: 75 });
      const achievements = checkAchievements(forecaster);

      const forecasts10 = achievements.find((a) => a.id === 'FORECASTS_10');
      const forecasts50 = achievements.find((a) => a.id === 'FORECASTS_50');
      const forecasts100 = achievements.find((a) => a.id === 'FORECASTS_100');

      expect(forecasts10?.unlockedAt).not.toBeNull();
      expect(forecasts50?.unlockedAt).not.toBeNull();
      expect(forecasts100?.unlockedAt).toBeNull();
    });

    it('should unlock accuracy achievements based on Brier score', () => {
      const forecaster = mockForecaster({ brierScore: 0.12 });
      const achievements = checkAchievements(forecaster);

      const brierGood = achievements.find((a) => a.id === 'BRIER_GOOD');
      const brierExcellent = achievements.find((a) => a.id === 'BRIER_EXCELLENT');
      const brierElite = achievements.find((a) => a.id === 'BRIER_ELITE');

      expect(brierGood?.unlockedAt).not.toBeNull();
      expect(brierExcellent?.unlockedAt).not.toBeNull();
      expect(brierElite?.unlockedAt).toBeNull(); // 0.12 > 0.10
    });

    it('should unlock calibration achievements based on calibration score', () => {
      const forecaster = mockForecaster({ calibrationScore: 0.92 });
      const achievements = checkAchievements(forecaster);

      const calibGood = achievements.find((a) => a.id === 'CALIBRATION_GOOD');
      const calibExcellent = achievements.find((a) => a.id === 'CALIBRATION_EXCELLENT');
      const calibPerfect = achievements.find((a) => a.id === 'CALIBRATION_PERFECT');

      expect(calibGood?.unlockedAt).not.toBeNull();
      expect(calibExcellent?.unlockedAt).not.toBeNull();
      expect(calibPerfect?.unlockedAt).toBeNull(); // 0.92 < 0.95
    });

    it('should unlock tier achievements based on current tier', () => {
      const forecaster = mockForecaster({ tier: 'EXPERT' });
      const achievements = checkAchievements(forecaster);

      const tierJourneyman = achievements.find((a) => a.id === 'TIER_JOURNEYMAN');
      const tierExpert = achievements.find((a) => a.id === 'TIER_EXPERT');
      const tierMaster = achievements.find((a) => a.id === 'TIER_MASTER');

      expect(tierJourneyman?.unlockedAt).not.toBeNull();
      expect(tierExpert?.unlockedAt).not.toBeNull();
      expect(tierMaster?.unlockedAt).toBeNull();
    });

    it('should track progress for partial achievements', () => {
      const forecaster = mockForecaster({ streakDays: 15 });
      const achievements = checkAchievements(forecaster);

      const streak30 = achievements.find((a) => a.id === 'STREAK_30');
      expect(streak30?.progress).toBe(15);
      expect(streak30?.maxProgress).toBe(30);
    });
  });

  describe('checkNewlyUnlocked', () => {
    it('should detect newly unlocked achievements', () => {
      const forecaster = mockForecaster({ streakDays: 35 });

      // Previous state had only STREAK_7 unlocked
      const previousAchievements: Achievement[] = [
        {
          id: 'STREAK_7',
          name: 'Week Warrior',
          description: 'Made forecasts for 7 consecutive days',
          category: 'STREAK',
          tier: 'BRONZE',
          unlockedAt: new Date('2024-01-08'),
          progress: 7,
          maxProgress: 7,
        },
      ];

      const newlyUnlocked = checkNewlyUnlocked(forecaster, previousAchievements);

      // STREAK_30 should be newly unlocked
      expect(newlyUnlocked.some((a) => a.id === 'STREAK_30')).toBe(true);
      // STREAK_7 should NOT be in newly unlocked (was already unlocked)
      expect(newlyUnlocked.some((a) => a.id === 'STREAK_7')).toBe(false);
    });
  });

  describe('getUnlockedAchievements', () => {
    it('should return only unlocked achievements', () => {
      const forecaster = mockForecaster({
        streakDays: 10,
        totalForecasts: 60,
      });

      const unlocked = getUnlockedAchievements(forecaster);

      expect(unlocked.every((a) => a.unlockedAt !== null)).toBe(true);
      expect(unlocked.length).toBeGreaterThan(0);
    });
  });

  describe('getInProgressAchievements', () => {
    it('should return achievements with partial progress', () => {
      const forecaster = mockForecaster({
        streakDays: 15,
        totalForecasts: 40,
      });

      const inProgress = getInProgressAchievements(forecaster);

      expect(inProgress.every((a) => a.unlockedAt === null)).toBe(true);
      expect(inProgress.every((a) => a.progress > 0)).toBe(true);
    });
  });
});

// =============================================================================
// Achievement Scoring Tests
// =============================================================================

describe('Phase 6.2 - Achievement Scoring', () => {
  describe('calculateAchievementScore', () => {
    it('should calculate score based on tier values', () => {
      const achievements: Achievement[] = [
        {
          id: 'TEST_1',
          name: 'Test 1',
          description: 'Test',
          category: 'VOLUME',
          tier: 'BRONZE',
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1,
        },
        {
          id: 'TEST_2',
          name: 'Test 2',
          description: 'Test',
          category: 'VOLUME',
          tier: 'GOLD',
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1,
        },
      ];

      const score = calculateAchievementScore(achievements);

      // BRONZE = 10, GOLD = 50
      expect(score).toBe(60);
    });

    it('should only count unlocked achievements', () => {
      const achievements: Achievement[] = [
        {
          id: 'TEST_1',
          name: 'Test 1',
          description: 'Test',
          category: 'VOLUME',
          tier: 'BRONZE',
          unlockedAt: new Date(),
          progress: 1,
          maxProgress: 1,
        },
        {
          id: 'TEST_2',
          name: 'Test 2',
          description: 'Test',
          category: 'VOLUME',
          tier: 'DIAMOND', // 200 points if unlocked
          unlockedAt: null, // Not unlocked
          progress: 0,
          maxProgress: 1,
        },
      ];

      const score = calculateAchievementScore(achievements);

      expect(score).toBe(10); // Only BRONZE counted
    });
  });
});

// =============================================================================
// Display Helper Tests
// =============================================================================

describe('Phase 6.2 - Display Helpers', () => {
  describe('getTierDisplayName', () => {
    it('should return properly capitalized tier name', () => {
      expect(getTierDisplayName('BRONZE')).toBe('Bronze');
      expect(getTierDisplayName('DIAMOND')).toBe('Diamond');
    });
  });

  describe('formatAchievementProgress', () => {
    it('should return 100% for unlocked achievements', () => {
      const achievement: Achievement = {
        id: 'TEST',
        name: 'Test',
        description: 'Test',
        category: 'VOLUME',
        tier: 'BRONZE',
        unlockedAt: new Date(),
        progress: 10,
        maxProgress: 10,
      };

      expect(formatAchievementProgress(achievement)).toBe('100%');
    });

    it('should return correct percentage for in-progress', () => {
      const achievement: Achievement = {
        id: 'TEST',
        name: 'Test',
        description: 'Test',
        category: 'VOLUME',
        tier: 'BRONZE',
        unlockedAt: null,
        progress: 5,
        maxProgress: 10,
      };

      expect(formatAchievementProgress(achievement)).toBe('50%');
    });
  });
});
