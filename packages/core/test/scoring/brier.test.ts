/**
 * Comprehensive Brier Score Tests
 * Tests all functions from the scoring/brier module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateSingleBrier,
  calculateBrierScore,
  calculateTimeWeightedBrier,
  analyzeCalibration,
  calculateBrierByCategory,
  calculateBrierTimeSeries,
  calculateTier,
  getTierProgress,
  type Forecast,
  type SuperforecasterTier,
} from '../../src/scoring/brier';

// =============================================================================
// calculateSingleBrier Tests
// =============================================================================

describe('calculateSingleBrier', () => {
  it('should return 0 for perfect prediction of YES outcome', () => {
    expect(calculateSingleBrier(1.0, true)).toBe(0);
  });

  it('should return 0 for perfect prediction of NO outcome', () => {
    expect(calculateSingleBrier(0.0, false)).toBe(0);
  });

  it('should return 1 for completely wrong YES prediction', () => {
    expect(calculateSingleBrier(1.0, false)).toBe(1);
  });

  it('should return 1 for completely wrong NO prediction', () => {
    expect(calculateSingleBrier(0.0, true)).toBe(1);
  });

  it('should return 0.25 for 50% prediction regardless of outcome', () => {
    expect(calculateSingleBrier(0.5, true)).toBe(0.25);
    expect(calculateSingleBrier(0.5, false)).toBe(0.25);
  });

  it('should calculate correct score for 70% YES prediction that came true', () => {
    // (0.7 - 1)^2 = 0.09
    expect(calculateSingleBrier(0.7, true)).toBeCloseTo(0.09, 5);
  });

  it('should calculate correct score for 70% YES prediction that was wrong', () => {
    // (0.7 - 0)^2 = 0.49
    expect(calculateSingleBrier(0.7, false)).toBeCloseTo(0.49, 5);
  });

  it('should handle edge probabilities', () => {
    expect(calculateSingleBrier(0.01, false)).toBeCloseTo(0.0001, 5);
    expect(calculateSingleBrier(0.99, true)).toBeCloseTo(0.0001, 5);
  });
});

// =============================================================================
// calculateBrierScore Tests
// =============================================================================

describe('calculateBrierScore', () => {
  it('should return zero score and count for empty forecasts', () => {
    const result = calculateBrierScore([]);
    expect(result.score).toBe(0);
    expect(result.count).toBe(0);
    expect(result.skillScore).toBe(0);
  });

  it('should return zero score and count when no forecasts are resolved', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: null },
      { probability: 0.5, outcome: null },
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.score).toBe(0);
    expect(result.count).toBe(0);
  });

  it('should only count resolved forecasts', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true },
      { probability: 0.5, outcome: null },
      { probability: 0.8, outcome: false },
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.count).toBe(2);
  });

  it('should calculate correct average for multiple forecasts', () => {
    const forecasts: Forecast[] = [
      { probability: 0.8, outcome: true }, // (0.8-1)^2 = 0.04
      { probability: 0.2, outcome: false }, // (0.2-0)^2 = 0.04
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.score).toBeCloseTo(0.04, 5);
    expect(result.count).toBe(2);
  });

  it('should calculate positive skill score for good forecaster', () => {
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true },
      { probability: 0.1, outcome: false },
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.skillScore).toBeGreaterThan(0);
  });

  it('should calculate negative skill score for poor forecaster', () => {
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: false },
      { probability: 0.1, outcome: true },
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.skillScore).toBeLessThan(0);
  });

  it('should calculate weighted score when weights provided', () => {
    const forecasts: Forecast[] = [
      { probability: 0.8, outcome: true, weight: 2 },
      { probability: 0.2, outcome: false, weight: 1 },
    ];
    const result = calculateBrierScore(forecasts);
    expect(result.weightedScore).toBeDefined();
    expect(result.weightedScore).toBeCloseTo(0.04, 5); // Same score when both predictions are equally good
  });
});

// =============================================================================
// calculateTimeWeightedBrier Tests
// =============================================================================

describe('calculateTimeWeightedBrier', () => {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it('should return zero for empty forecasts', () => {
    const result = calculateTimeWeightedBrier([]);
    expect(result.score).toBe(0);
    expect(result.count).toBe(0);
  });

  it('should return zero for forecasts without timestamps', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true },
    ];
    const result = calculateTimeWeightedBrier(forecasts);
    expect(result.score).toBe(0);
    expect(result.count).toBe(0);
  });

  it('should give higher weight to recent forecasts', () => {
    // Two forecasts: one recent (good), one old (bad)
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true, timestamp: daysAgo(1) }, // Recent, good
      { probability: 0.1, outcome: true, timestamp: daysAgo(180) }, // Old, bad
    ];
    const result = calculateTimeWeightedBrier(forecasts, 90);

    // The time-weighted score should be closer to the recent good forecast
    // Recent: 0.01, Old: 0.81
    expect(result.score).toBeLessThan(0.41); // Less than simple average
  });

  it('should use custom half-life', () => {
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true, timestamp: daysAgo(30) },
    ];

    const shortHalfLife = calculateTimeWeightedBrier(forecasts, 30);
    const longHalfLife = calculateTimeWeightedBrier(forecasts, 90);

    // Both should calculate same score for single forecast
    expect(shortHalfLife.score).toBeCloseTo(longHalfLife.score, 5);
  });

  it('should include weightedScore in result', () => {
    const forecasts: Forecast[] = [
      { probability: 0.8, outcome: true, timestamp: daysAgo(10) },
    ];
    const result = calculateTimeWeightedBrier(forecasts);
    expect(result.weightedScore).toBeDefined();
  });
});

// =============================================================================
// analyzeCalibration Tests
// =============================================================================

describe('analyzeCalibration', () => {
  it('should return empty result for no forecasts', () => {
    const result = analyzeCalibration([]);
    expect(result.brierScore).toBe(0);
    expect(result.calibration).toBe(0);
    expect(result.resolution).toBe(0);
    expect(result.uncertainty).toBe(0);
    expect(result.buckets).toHaveLength(0);
    expect(result.ece).toBe(0);
  });

  it('should return empty result when no forecasts are resolved', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: null },
    ];
    const result = analyzeCalibration(forecasts);
    expect(result.buckets).toHaveLength(0);
  });

  it('should create buckets for resolved forecasts', () => {
    const forecasts: Forecast[] = [
      { probability: 0.15, outcome: true },
      { probability: 0.85, outcome: true },
    ];
    const result = analyzeCalibration(forecasts, 10);
    expect(result.buckets.length).toBeGreaterThan(0);
  });

  it('should calculate correct ECE', () => {
    // Perfect calibration: 80% predictions are correct 80% of the time
    const forecasts: Forecast[] = [
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: true },
      { probability: 0.8, outcome: false },
    ];
    const result = analyzeCalibration(forecasts, 10);
    // 4/5 = 80% actual frequency, matching prediction = low ECE
    expect(result.ece).toBeLessThan(0.05);
  });

  it('should detect poor calibration', () => {
    // Overconfident: 90% predictions but 50% correct
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true },
      { probability: 0.9, outcome: false },
    ];
    const result = analyzeCalibration(forecasts, 10);
    expect(result.calibration).toBeGreaterThan(0);
  });

  it('should calculate correct uncertainty based on base rate', () => {
    // All positive outcomes
    const allPositive: Forecast[] = [
      { probability: 0.5, outcome: true },
      { probability: 0.5, outcome: true },
    ];
    const resultAllPositive = analyzeCalibration(allPositive);
    expect(resultAllPositive.uncertainty).toBe(0); // Base rate 1.0, uncertainty = 1*(1-1) = 0

    // 50/50 outcomes
    const balanced: Forecast[] = [
      { probability: 0.5, outcome: true },
      { probability: 0.5, outcome: false },
    ];
    const resultBalanced = analyzeCalibration(balanced);
    expect(resultBalanced.uncertainty).toBe(0.25); // Base rate 0.5, uncertainty = 0.5*0.5 = 0.25
  });
});

// =============================================================================
// calculateBrierByCategory Tests
// =============================================================================

describe('calculateBrierByCategory', () => {
  it('should return empty map for no forecasts', () => {
    const result = calculateBrierByCategory([]);
    expect(result.size).toBe(0);
  });

  it('should group forecasts by category', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true, category: 'politics' },
      { probability: 0.6, outcome: true, category: 'politics' },
      { probability: 0.8, outcome: false, category: 'sports' },
    ];
    const result = calculateBrierByCategory(forecasts);

    expect(result.has('politics')).toBe(true);
    expect(result.has('sports')).toBe(true);
    expect(result.get('politics')?.count).toBe(2);
    expect(result.get('sports')?.count).toBe(1);
  });

  it('should categorize uncategorized forecasts', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true },
      { probability: 0.6, outcome: false },
    ];
    const result = calculateBrierByCategory(forecasts);

    expect(result.has('uncategorized')).toBe(true);
    expect(result.get('uncategorized')?.count).toBe(2);
  });

  it('should calculate correct scores per category', () => {
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true, category: 'good' }, // 0.01
      { probability: 0.1, outcome: false, category: 'good' }, // 0.01
      { probability: 0.1, outcome: true, category: 'bad' }, // 0.81
      { probability: 0.9, outcome: false, category: 'bad' }, // 0.81
    ];
    const result = calculateBrierByCategory(forecasts);

    expect(result.get('good')?.score).toBeCloseTo(0.01, 5);
    expect(result.get('bad')?.score).toBeCloseTo(0.81, 5);
  });
});

// =============================================================================
// calculateBrierTimeSeries Tests
// =============================================================================

describe('calculateBrierTimeSeries', () => {
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it('should return empty array for no forecasts', () => {
    const result = calculateBrierTimeSeries([]);
    expect(result).toHaveLength(0);
  });

  it('should return empty when forecasts have no timestamps', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true },
    ];
    const result = calculateBrierTimeSeries(forecasts);
    expect(result).toHaveLength(0);
  });

  it('should return empty when no forecasts are resolved', () => {
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: null, timestamp: daysAgo(10) },
    ];
    const result = calculateBrierTimeSeries(forecasts);
    expect(result).toHaveLength(0);
  });

  it('should group forecasts into time periods', () => {
    const periodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true, timestamp: daysAgo(5) },
      { probability: 0.6, outcome: true, timestamp: daysAgo(10) },
      { probability: 0.8, outcome: false, timestamp: daysAgo(40) },
    ];
    const result = calculateBrierTimeSeries(forecasts, periodMs);

    expect(result.length).toBeGreaterThan(0);
  });

  it('should calculate cumulative scores', () => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const forecasts: Forecast[] = [
      { probability: 0.9, outcome: true, timestamp: daysAgo(60) }, // Period 1
      { probability: 0.1, outcome: true, timestamp: daysAgo(10) }, // Period 2
    ];
    const result = calculateBrierTimeSeries(forecasts, periodMs);

    if (result.length >= 2) {
      // Cumulative should include all previous periods
      expect(result[result.length - 1].cumulativeScore).toBeDefined();
    }
  });

  it('should include count per period', () => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const forecasts: Forecast[] = [
      { probability: 0.7, outcome: true, timestamp: daysAgo(5) },
      { probability: 0.6, outcome: true, timestamp: daysAgo(10) },
    ];
    const result = calculateBrierTimeSeries(forecasts, periodMs);

    if (result.length > 0) {
      expect(result[0].count).toBe(2);
    }
  });
});

// =============================================================================
// calculateTier Tests
// =============================================================================

describe('calculateTier', () => {
  it('should return APPRENTICE for minimal qualifying performance', () => {
    const tier = calculateTier(0.30, 15, -0.2);
    expect(tier).toBe('APPRENTICE');
  });

  it('should return JOURNEYMAN for moderate performance', () => {
    const tier = calculateTier(0.22, 60, 0.12);
    expect(tier).toBe('JOURNEYMAN');
  });

  it('should return ADEPT for good performance', () => {
    const tier = calculateTier(0.18, 120, 0.28);
    expect(tier).toBe('ADEPT');
  });

  it('should return EXPERT for excellent performance', () => {
    const tier = calculateTier(0.14, 300, 0.44);
    expect(tier).toBe('EXPERT');
  });

  it('should return GRANDMASTER for top performance', () => {
    const tier = calculateTier(0.08, 600, 0.68);
    expect(tier).toBe('GRANDMASTER');
  });

  it('should return APPRENTICE when insufficient forecasts for higher tier', () => {
    // Excellent scores but only 20 forecasts
    const tier = calculateTier(0.05, 20, 0.8);
    expect(tier).toBe('APPRENTICE');
  });

  it('should return APPRENTICE when Brier score too high for qualification', () => {
    // Many forecasts but poor Brier score
    const tier = calculateTier(0.40, 600, 0.5);
    expect(tier).toBe('APPRENTICE');
  });

  it('should return APPRENTICE for default case', () => {
    // Doesn't meet any tier requirements
    const tier = calculateTier(0.50, 5, -0.5);
    expect(tier).toBe('APPRENTICE');
  });
});

// =============================================================================
// getTierProgress Tests
// =============================================================================

describe('getTierProgress', () => {
  it('should return null nextTier for GRANDMASTER', () => {
    const progress = getTierProgress('GRANDMASTER', 0.05, 600, 0.8);
    expect(progress.nextTier).toBeNull();
    expect(progress.forecastProgress).toBe(1);
    expect(progress.scoreProgress).toBe(1);
    expect(progress.skillProgress).toBe(1);
  });

  it('should calculate progress toward JOURNEYMAN from APPRENTICE', () => {
    const progress = getTierProgress('APPRENTICE', 0.30, 25, 0.0);
    expect(progress.nextTier).toBe('JOURNEYMAN');
    expect(progress.forecastProgress).toBe(0.5); // 25/50
  });

  it('should cap progress at 1', () => {
    const progress = getTierProgress('APPRENTICE', 0.15, 100, 0.5);
    expect(progress.forecastProgress).toBe(1);
  });

  it('should calculate score progress correctly', () => {
    // APPRENTICE max is 0.35, JOURNEYMAN max is 0.25
    // Progress = (0.35 - current) / (0.35 - 0.25)
    const progress = getTierProgress('APPRENTICE', 0.30, 50, 0.0);
    expect(progress.scoreProgress).toBeCloseTo(0.5, 1); // (0.35 - 0.30) / (0.35 - 0.25) = 0.5
  });

  it('should calculate skill progress correctly', () => {
    // APPRENTICE min is -0.4, JOURNEYMAN min is 0.0
    // Progress = (current - (-0.4)) / (0.0 - (-0.4))
    const progress = getTierProgress('APPRENTICE', 0.25, 50, -0.2);
    expect(progress.skillProgress).toBeCloseTo(0.5, 1); // (-0.2 - (-0.4)) / (0.0 - (-0.4)) = 0.5
  });

  it('should return correct next tier for each tier', () => {
    expect(getTierProgress('APPRENTICE', 0.3, 10, 0).nextTier).toBe('JOURNEYMAN');
    expect(getTierProgress('JOURNEYMAN', 0.2, 50, 0.1).nextTier).toBe('ADEPT');
    expect(getTierProgress('ADEPT', 0.15, 100, 0.3).nextTier).toBe('EXPERT');
    expect(getTierProgress('EXPERT', 0.12, 250, 0.5).nextTier).toBe('GRANDMASTER');
  });
});
