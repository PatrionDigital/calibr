/**
 * Leaderboard Scoring Tests
 * Tests for composite scoring algorithm and tier calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCompositeScore,
  calculateCompositeScoreDetails,
  calculateStreakBonus,
  calculateTier,
  calculateTierProgress,
} from '../../src/leaderboard/scoring';
import type { LeaderboardEntry, ReputationSource } from '../../src/leaderboard/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createLeaderboardEntry = (
  overrides: Partial<LeaderboardEntry> = {}
): LeaderboardEntry => ({
  address: '0x1234567890123456789012345678901234567890',
  ensName: null,
  displayName: 'TestUser',
  brierScore: 0.2,
  calibrationScore: 0.85,
  totalForecasts: 100,
  resolvedForecasts: 80,
  accuracy: 0.75,
  streakDays: 30,
  joinedAt: new Date('2024-01-01'),
  lastForecastAt: new Date('2024-06-01'),
  tier: 'JOURNEYMAN',
  tierProgress: 0.5,
  compositeScore: 500,
  rank: 10,
  previousRank: 12,
  isPrivate: false,
  externalReputations: [],
  achievements: [],
  ...overrides,
});

const createReputationSource = (
  overrides: Partial<ReputationSource> = {}
): ReputationSource => ({
  platform: 'CALIBR',
  score: 80,
  lastUpdated: new Date(),
  verified: true,
  ...overrides,
});

// =============================================================================
// calculateCompositeScore Tests
// =============================================================================

describe('calculateCompositeScore', () => {
  describe('basic scoring', () => {
    it('returns 0 for entry with no forecasts', () => {
      const entry = createLeaderboardEntry({ totalForecasts: 0 });
      expect(calculateCompositeScore(entry)).toBe(0);
    });

    it('calculates score for basic entry', () => {
      const entry = createLeaderboardEntry({
        brierScore: 0.2,
        calibrationScore: 0.85,
        resolvedForecasts: 80,
        streakDays: 30,
      });
      const score = calculateCompositeScore(entry);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('perfect forecaster gets high score', () => {
      const entry = createLeaderboardEntry({
        brierScore: 0, // Perfect Brier score
        calibrationScore: 1.0, // Perfect calibration
        resolvedForecasts: 500,
        streakDays: 365,
      });
      const score = calculateCompositeScore(entry);
      expect(score).toBeGreaterThan(800); // Should be high
    });

    it('poor forecaster gets low score', () => {
      const entry = createLeaderboardEntry({
        brierScore: 0.5, // High Brier score (bad)
        calibrationScore: 0.3, // Low calibration
        resolvedForecasts: 10,
        streakDays: 0,
      });
      const score = calculateCompositeScore(entry);
      expect(score).toBeLessThan(400);
    });
  });

  describe('brier score impact', () => {
    it('lower brier score gives higher composite score', () => {
      const goodBrier = createLeaderboardEntry({ brierScore: 0.1, calibrationScore: 0.5 });
      const badBrier = createLeaderboardEntry({ brierScore: 0.4, calibrationScore: 0.5 });

      expect(calculateCompositeScore(goodBrier)).toBeGreaterThan(
        calculateCompositeScore(badBrier)
      );
    });

    it('brier score of 0 gives maximum brier component', () => {
      const perfectBrier = createLeaderboardEntry({ brierScore: 0 });
      const score = calculateCompositeScore(perfectBrier);
      expect(score).toBeGreaterThan(500); // 55% weight at max
    });
  });

  describe('calibration score impact', () => {
    it('higher calibration score gives higher composite score', () => {
      const goodCalibration = createLeaderboardEntry({
        brierScore: 0.3,
        calibrationScore: 0.9,
      });
      const badCalibration = createLeaderboardEntry({
        brierScore: 0.3,
        calibrationScore: 0.4,
      });

      expect(calculateCompositeScore(goodCalibration)).toBeGreaterThan(
        calculateCompositeScore(badCalibration)
      );
    });
  });

  describe('volume bonus', () => {
    it('no bonus under 50 forecasts', () => {
      const lowVolume = createLeaderboardEntry({ resolvedForecasts: 40 });
      const noVolume = createLeaderboardEntry({ resolvedForecasts: 0 });

      // Volume bonus should not change the score significantly
      const diff = calculateCompositeScore(lowVolume) - calculateCompositeScore(noVolume);
      expect(diff).toBeLessThan(5);
    });

    it('bonus increases with more forecasts', () => {
      const medium = createLeaderboardEntry({ resolvedForecasts: 100 });
      const high = createLeaderboardEntry({ resolvedForecasts: 300 });

      expect(calculateCompositeScore(high)).toBeGreaterThan(
        calculateCompositeScore(medium)
      );
    });

    it('bonus caps at 500 forecasts', () => {
      const atCap = createLeaderboardEntry({ resolvedForecasts: 500 });
      const overCap = createLeaderboardEntry({ resolvedForecasts: 1000 });

      // Both should have same volume bonus
      expect(calculateCompositeScore(overCap)).toBe(calculateCompositeScore(atCap));
    });
  });

  describe('streak bonus', () => {
    it('no streak gives no bonus', () => {
      const noStreak = createLeaderboardEntry({ streakDays: 0 });
      const withStreak = createLeaderboardEntry({ streakDays: 30 });

      expect(calculateCompositeScore(withStreak)).toBeGreaterThan(
        calculateCompositeScore(noStreak)
      );
    });

    it('longer streak gives higher bonus', () => {
      const shortStreak = createLeaderboardEntry({ streakDays: 7 });
      const longStreak = createLeaderboardEntry({ streakDays: 100 });

      expect(calculateCompositeScore(longStreak)).toBeGreaterThan(
        calculateCompositeScore(shortStreak)
      );
    });
  });

  describe('reputation bonus', () => {
    it('verified external reputation adds bonus', () => {
      const noRep = createLeaderboardEntry({ externalReputations: [] });
      const withRep = createLeaderboardEntry({
        externalReputations: [
          createReputationSource({ platform: 'POLYMARKET', score: 90, verified: true }),
        ],
      });

      expect(calculateCompositeScore(withRep)).toBeGreaterThan(
        calculateCompositeScore(noRep)
      );
    });

    it('unverified reputation gives no bonus', () => {
      const noRep = createLeaderboardEntry({ externalReputations: [] });
      const unverifiedRep = createLeaderboardEntry({
        externalReputations: [
          createReputationSource({ platform: 'POLYMARKET', score: 90, verified: false }),
        ],
      });

      expect(calculateCompositeScore(unverifiedRep)).toBe(calculateCompositeScore(noRep));
    });

    it('multiple verified reputations stack', () => {
      const oneRep = createLeaderboardEntry({
        externalReputations: [
          createReputationSource({ platform: 'POLYMARKET', score: 80, verified: true }),
        ],
      });
      const multiRep = createLeaderboardEntry({
        externalReputations: [
          createReputationSource({ platform: 'POLYMARKET', score: 80, verified: true }),
          createReputationSource({ platform: 'LIMITLESS', score: 75, verified: true }),
        ],
      });

      expect(calculateCompositeScore(multiRep)).toBeGreaterThan(
        calculateCompositeScore(oneRep)
      );
    });
  });

  describe('score capping', () => {
    it('score never exceeds 1000', () => {
      const perfectEntry = createLeaderboardEntry({
        brierScore: 0,
        calibrationScore: 1.0,
        resolvedForecasts: 1000,
        streakDays: 500,
        externalReputations: [
          createReputationSource({ platform: 'CALIBR', score: 100, verified: true }),
          createReputationSource({ platform: 'POLYMARKET', score: 100, verified: true }),
        ],
      });

      expect(calculateCompositeScore(perfectEntry)).toBeLessThanOrEqual(1000);
    });
  });
});

// =============================================================================
// calculateCompositeScoreDetails Tests
// =============================================================================

describe('calculateCompositeScoreDetails', () => {
  it('returns zero breakdown for no forecasts', () => {
    const entry = createLeaderboardEntry({ totalForecasts: 0 });
    const details = calculateCompositeScoreDetails(entry);

    expect(details.total).toBe(0);
    expect(details.baseScore).toBe(0);
    expect(details.brierComponent).toBe(0);
    expect(details.calibrationComponent).toBe(0);
    expect(details.volumeBonus).toBe(0);
    expect(details.streakBonus).toBe(0);
    expect(details.reputationBonus).toBe(0);
  });

  it('returns breakdown matching total', () => {
    const entry = createLeaderboardEntry();
    const details = calculateCompositeScoreDetails(entry);

    // Components should roughly sum to total (accounting for rounding)
    const componentsSum =
      details.brierComponent +
      details.calibrationComponent +
      details.volumeBonus +
      details.streakBonus +
      details.reputationBonus;

    expect(Math.abs(componentsSum - details.total)).toBeLessThanOrEqual(5);
  });

  it('baseScore is sum of brier and calibration components', () => {
    const entry = createLeaderboardEntry();
    const details = calculateCompositeScoreDetails(entry);

    expect(details.baseScore).toBe(
      details.brierComponent + details.calibrationComponent
    );
  });

  it('returns integer values', () => {
    const entry = createLeaderboardEntry({
      brierScore: 0.333,
      calibrationScore: 0.777,
    });
    const details = calculateCompositeScoreDetails(entry);

    expect(Number.isInteger(details.total)).toBe(true);
    expect(Number.isInteger(details.baseScore)).toBe(true);
    expect(Number.isInteger(details.brierComponent)).toBe(true);
    expect(Number.isInteger(details.calibrationComponent)).toBe(true);
    expect(Number.isInteger(details.volumeBonus)).toBe(true);
    expect(Number.isInteger(details.streakBonus)).toBe(true);
    expect(Number.isInteger(details.reputationBonus)).toBe(true);
  });
});

// =============================================================================
// calculateStreakBonus Tests
// =============================================================================

describe('calculateStreakBonus', () => {
  it('returns 0 for no streak', () => {
    expect(calculateStreakBonus(0)).toBe(0);
  });

  it('returns 0 for negative streak', () => {
    expect(calculateStreakBonus(-5)).toBe(0);
  });

  it('returns positive bonus for active streak', () => {
    expect(calculateStreakBonus(7)).toBeGreaterThan(0);
  });

  it('increases with more streak days', () => {
    const day1 = calculateStreakBonus(1);
    const day10 = calculateStreakBonus(10);
    const day100 = calculateStreakBonus(100);

    // Should monotonically increase
    expect(day10).toBeGreaterThan(day1);
    expect(day100).toBeGreaterThan(day10);
  });

  it('caps at 365 days', () => {
    const atCap = calculateStreakBonus(365);
    const overCap = calculateStreakBonus(500);

    expect(overCap).toBe(atCap);
  });

  it('returns integer values', () => {
    expect(Number.isInteger(calculateStreakBonus(30))).toBe(true);
    expect(Number.isInteger(calculateStreakBonus(100))).toBe(true);
  });
});

// =============================================================================
// calculateTier Tests
// =============================================================================

describe('calculateTier', () => {
  it('returns APPRENTICE for score 0', () => {
    expect(calculateTier(0)).toBe('APPRENTICE');
  });

  it('returns APPRENTICE for scores under 200', () => {
    expect(calculateTier(50)).toBe('APPRENTICE');
    expect(calculateTier(199)).toBe('APPRENTICE');
  });

  it('returns JOURNEYMAN for scores 200-399', () => {
    expect(calculateTier(200)).toBe('JOURNEYMAN');
    expect(calculateTier(300)).toBe('JOURNEYMAN');
    expect(calculateTier(399)).toBe('JOURNEYMAN');
  });

  it('returns EXPERT for scores 400-599', () => {
    expect(calculateTier(400)).toBe('EXPERT');
    expect(calculateTier(500)).toBe('EXPERT');
    expect(calculateTier(599)).toBe('EXPERT');
  });

  it('returns MASTER for scores 600-799', () => {
    expect(calculateTier(600)).toBe('MASTER');
    expect(calculateTier(700)).toBe('MASTER');
    expect(calculateTier(799)).toBe('MASTER');
  });

  it('returns GRANDMASTER for scores 800+', () => {
    expect(calculateTier(800)).toBe('GRANDMASTER');
    expect(calculateTier(900)).toBe('GRANDMASTER');
    expect(calculateTier(1000)).toBe('GRANDMASTER');
  });

  it('handles boundary cases exactly', () => {
    expect(calculateTier(199)).toBe('APPRENTICE');
    expect(calculateTier(200)).toBe('JOURNEYMAN');
    expect(calculateTier(399)).toBe('JOURNEYMAN');
    expect(calculateTier(400)).toBe('EXPERT');
  });
});

// =============================================================================
// calculateTierProgress Tests
// =============================================================================

describe('calculateTierProgress', () => {
  describe('normal tier progress', () => {
    it('returns 0 at tier threshold', () => {
      expect(calculateTierProgress(200, 'JOURNEYMAN')).toBe(0);
      expect(calculateTierProgress(400, 'EXPERT')).toBe(0);
    });

    it('returns 0.5 at midpoint', () => {
      // JOURNEYMAN: 200-400, midpoint is 300
      expect(calculateTierProgress(300, 'JOURNEYMAN')).toBe(0.5);

      // EXPERT: 400-600, midpoint is 500
      expect(calculateTierProgress(500, 'EXPERT')).toBe(0.5);
    });

    it('returns 1 at next tier threshold', () => {
      // Just below next threshold gives progress approaching 1
      expect(calculateTierProgress(399, 'JOURNEYMAN')).toBeCloseTo(0.995, 2);
    });

    it('returns progress between 0 and 1', () => {
      const progress = calculateTierProgress(250, 'JOURNEYMAN');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe('APPRENTICE tier', () => {
    it('calculates progress towards JOURNEYMAN', () => {
      expect(calculateTierProgress(0, 'APPRENTICE')).toBe(0);
      expect(calculateTierProgress(100, 'APPRENTICE')).toBe(0.5);
      expect(calculateTierProgress(199, 'APPRENTICE')).toBeCloseTo(0.995, 2);
    });
  });

  describe('GRANDMASTER tier (max tier)', () => {
    it('returns 0 at threshold', () => {
      expect(calculateTierProgress(800, 'GRANDMASTER')).toBe(0);
    });

    it('returns progress within max tier', () => {
      // Progress towards 1000 (max score)
      expect(calculateTierProgress(900, 'GRANDMASTER')).toBe(0.5);
      expect(calculateTierProgress(1000, 'GRANDMASTER')).toBe(1);
    });

    it('caps at 1 for scores above max', () => {
      expect(calculateTierProgress(1100, 'GRANDMASTER')).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('handles score exactly at threshold', () => {
      expect(calculateTierProgress(600, 'MASTER')).toBe(0);
    });

    it('clamps progress to 0-1 range', () => {
      // Score below tier threshold should give 0
      expect(calculateTierProgress(100, 'EXPERT')).toBe(0);
    });
  });
});
