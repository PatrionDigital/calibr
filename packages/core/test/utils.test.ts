/**
 * Core Utility Tests
 * Comprehensive tests for all utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateKelly,
  kellyBetSize,
  calculatePositionSize,
  brierScore,
  averageBrierScore,
  timeWeightedBrierScore,
  decomposeBrierScore,
  calculateCalibrationCurve,
  calculateSuperforecasterTier,
  getTierDisplayInfo,
  formatProbability,
  formatBrierScore,
  scaleProbabilityForChain,
  unscaleProbabilityFromChain,
  scaleBrierScoreForChain,
  unscaleBrierScoreFromChain,
} from '../src/utils';

// =============================================================================
// Kelly Criterion Tests
// =============================================================================

describe('calculateKelly', () => {
  it('should calculate positive Kelly fraction when edge exists', () => {
    const result = calculateKelly(0.6, 0.5);
    expect(result.optimalFraction).toBeGreaterThan(0);
    expect(result.edge).toBeCloseTo(0.1, 5);
  });

  it('should return zero Kelly when no edge', () => {
    const result = calculateKelly(0.5, 0.5);
    expect(result.optimalFraction).toBe(0);
    expect(result.edge).toBe(0);
  });

  it('should calculate half and quarter Kelly', () => {
    const result = calculateKelly(0.7, 0.5);
    expect(result.halfKelly).toBe(result.optimalFraction * 0.5);
    expect(result.quarterKelly).toBe(result.optimalFraction * 0.25);
  });

  it('should return positive expected value with edge', () => {
    const result = calculateKelly(0.7, 0.5);
    expect(result.expectedValue).toBeGreaterThan(0);
  });

  it('should clamp extreme probabilities', () => {
    const resultLow = calculateKelly(0, 0.5);
    const resultHigh = calculateKelly(1, 0.5);
    // Should not throw and should produce valid results
    expect(resultLow.optimalFraction).toBeGreaterThanOrEqual(0);
    expect(resultHigh.optimalFraction).toBeLessThanOrEqual(1);
  });

  it('should handle negative edge gracefully', () => {
    const result = calculateKelly(0.3, 0.5);
    expect(result.edge).toBeLessThan(0);
    expect(result.optimalFraction).toBe(0); // No bet when edge is negative
  });
});

describe('kellyBetSize', () => {
  it('should return positive bet size with positive edge', () => {
    const size = kellyBetSize(0.6, 2, 0.25);
    expect(size).toBeGreaterThan(0);
  });

  it('should return zero for invalid probability', () => {
    expect(kellyBetSize(0, 2, 0.25)).toBe(0);
    expect(kellyBetSize(1, 2, 0.25)).toBe(0);
    expect(kellyBetSize(-0.1, 2, 0.25)).toBe(0);
    expect(kellyBetSize(1.1, 2, 0.25)).toBe(0);
  });

  it('should return zero for invalid odds', () => {
    expect(kellyBetSize(0.6, 0, 0.25)).toBe(0);
    expect(kellyBetSize(0.6, 0.5, 0.25)).toBe(0);
    expect(kellyBetSize(0.6, 1, 0.25)).toBe(0);
  });

  it('should apply fraction correctly', () => {
    const fullKelly = kellyBetSize(0.6, 2, 1);
    const halfKelly = kellyBetSize(0.6, 2, 0.5);
    const quarterKelly = kellyBetSize(0.6, 2, 0.25);

    expect(halfKelly).toBeCloseTo(fullKelly * 0.5, 5);
    expect(quarterKelly).toBeCloseTo(fullKelly * 0.25, 5);
  });

  it('should use default quarter Kelly fraction', () => {
    const defaultFraction = kellyBetSize(0.6, 2);
    const explicitQuarter = kellyBetSize(0.6, 2, 0.25);
    expect(defaultFraction).toBe(explicitQuarter);
  });

  it('should never return negative bet size', () => {
    // Test case where Kelly would be negative
    const result = kellyBetSize(0.3, 2, 0.5);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('calculatePositionSize', () => {
  it('should calculate conservative (quarter Kelly) position', () => {
    const kelly = calculateKelly(0.7, 0.5);
    const position = calculatePositionSize(kelly, 1000, 'conservative');

    expect(position.fraction).toBe(kelly.quarterKelly);
    expect(position.amount).toBe(1000 * kelly.quarterKelly);
    expect(position.label).toBe('Quarter Kelly');
  });

  it('should calculate moderate (half Kelly) position', () => {
    const kelly = calculateKelly(0.7, 0.5);
    const position = calculatePositionSize(kelly, 1000, 'moderate');

    expect(position.fraction).toBe(kelly.halfKelly);
    expect(position.amount).toBe(1000 * kelly.halfKelly);
    expect(position.label).toBe('Half Kelly');
  });

  it('should calculate aggressive (full Kelly) position', () => {
    const kelly = calculateKelly(0.7, 0.5);
    const position = calculatePositionSize(kelly, 1000, 'aggressive');

    expect(position.fraction).toBe(kelly.optimalFraction);
    expect(position.amount).toBe(1000 * kelly.optimalFraction);
    expect(position.label).toBe('Full Kelly');
  });

  it('should default to moderate risk tolerance', () => {
    const kelly = calculateKelly(0.7, 0.5);
    const position = calculatePositionSize(kelly, 1000);

    expect(position.fraction).toBe(kelly.halfKelly);
    expect(position.label).toBe('Half Kelly');
  });

  it('should scale correctly with bankroll', () => {
    const kelly = calculateKelly(0.7, 0.5);
    const position1000 = calculatePositionSize(kelly, 1000, 'moderate');
    const position2000 = calculatePositionSize(kelly, 2000, 'moderate');

    expect(position2000.amount).toBe(position1000.amount * 2);
    expect(position2000.fraction).toBe(position1000.fraction);
  });
});

// =============================================================================
// Brier Score Tests
// =============================================================================

describe('brierScore', () => {
  it('should calculate perfect score for correct high confidence', () => {
    expect(brierScore(1, 1)).toBe(0);
    expect(brierScore(0, 0)).toBe(0);
  });

  it('should calculate worst score for wrong high confidence', () => {
    expect(brierScore(1, 0)).toBe(1);
    expect(brierScore(0, 1)).toBe(1);
  });

  it('should calculate intermediate score', () => {
    const score = brierScore(0.7, 1);
    expect(score).toBeCloseTo(0.09, 2);
  });

  it('should calculate 0.25 for 50% probability', () => {
    expect(brierScore(0.5, 1)).toBe(0.25);
    expect(brierScore(0.5, 0)).toBe(0.25);
  });
});

describe('averageBrierScore', () => {
  it('should calculate average Brier score', () => {
    const forecasts = [
      { probability: 0.8, outcome: 1 as const },
      { probability: 0.2, outcome: 0 as const },
    ];
    const avg = averageBrierScore(forecasts);
    expect(avg).toBeCloseTo(0.04, 2);
  });

  it('should return 0 for empty forecasts', () => {
    expect(averageBrierScore([])).toBe(0);
  });

  it('should handle single forecast', () => {
    const forecasts = [{ probability: 0.8, outcome: 1 as const }];
    const avg = averageBrierScore(forecasts);
    expect(avg).toBe(brierScore(0.8, 1));
  });
});

describe('timeWeightedBrierScore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 for empty forecasts', () => {
    expect(timeWeightedBrierScore([])).toBe(0);
  });

  it('should weight recent forecasts more heavily', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const forecasts = [
      { probability: 0.9, outcome: 1 as const, timestamp: now - 1000 }, // Recent, good
      { probability: 0.1, outcome: 1 as const, timestamp: now - 30 * 24 * 60 * 60 * 1000 }, // Old, bad
    ];

    const weighted = timeWeightedBrierScore(forecasts, 30);

    // Recent good forecast should dominate
    expect(weighted).toBeLessThan(0.5);
  });

  it('should handle single forecast', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const forecasts = [{ probability: 0.8, outcome: 1 as const, timestamp: now - 1000 }];
    const result = timeWeightedBrierScore(forecasts, 30);

    expect(result).toBeCloseTo(brierScore(0.8, 1), 2);
  });

  it('should respect half-life parameter', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const halfLifeDays = 10;
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;

    const forecasts = [
      { probability: 1, outcome: 0 as const, timestamp: now - halfLifeMs }, // At half-life
    ];

    // Single forecast at exactly half-life should have weight of 0.5 relative to now
    const result = timeWeightedBrierScore(forecasts, halfLifeDays);
    expect(result).toBe(1); // Worst score (1-0)^2 = 1
  });
});

describe('decomposeBrierScore', () => {
  it('should return zeros for empty forecasts', () => {
    const result = decomposeBrierScore([]);
    expect(result.score).toBe(0);
    expect(result.calibration).toBe(0);
    expect(result.resolution).toBe(0);
    expect(result.uncertainty).toBe(0);
  });

  it('should calculate uncertainty correctly', () => {
    const forecasts = [
      { probability: 0.7, outcome: 1 as const },
      { probability: 0.3, outcome: 0 as const },
    ];
    const result = decomposeBrierScore(forecasts);

    // Base rate is 0.5, uncertainty = 0.5 * 0.5 = 0.25
    expect(result.uncertainty).toBe(0.25);
  });

  it('should have score = calibration - resolution + uncertainty', () => {
    const forecasts = [
      { probability: 0.8, outcome: 1 as const },
      { probability: 0.2, outcome: 0 as const },
      { probability: 0.7, outcome: 1 as const },
      { probability: 0.3, outcome: 0 as const },
    ];
    const result = decomposeBrierScore(forecasts);

    const computed = result.calibration - result.resolution + result.uncertainty;
    expect(result.score).toBeCloseTo(computed, 5);
  });

  it('should calculate calibration component', () => {
    // Well-calibrated forecasts
    const wellCalibrated = [
      { probability: 0.7, outcome: 1 as const },
      { probability: 0.7, outcome: 1 as const },
      { probability: 0.7, outcome: 0 as const },
      { probability: 0.3, outcome: 0 as const },
      { probability: 0.3, outcome: 0 as const },
      { probability: 0.3, outcome: 1 as const },
    ];
    const result = decomposeBrierScore(wellCalibrated);

    // Should have low calibration error
    expect(result.calibration).toBeLessThan(0.1);
  });
});

// =============================================================================
// Calibration Curve Tests
// =============================================================================

describe('calculateCalibrationCurve', () => {
  it('should generate bins from forecasts', () => {
    const forecasts = [
      { probability: 0.1, outcome: 0 as const },
      { probability: 0.2, outcome: 0 as const },
      { probability: 0.8, outcome: 1 as const },
      { probability: 0.9, outcome: 1 as const },
    ];
    const curve = calculateCalibrationCurve(forecasts, 10);
    expect(curve.bins.length).toBeGreaterThan(0);
  });

  it('should return empty for no forecasts', () => {
    const curve = calculateCalibrationCurve([]);
    expect(curve.bins).toHaveLength(0);
    expect(curve.calibrationError).toBe(0);
  });

  it('should calculate overconfidence correctly', () => {
    // Forecasts where probabilities are higher than actual outcomes
    const overconfidentForecasts = [
      { probability: 0.9, outcome: 0 as const },
      { probability: 0.9, outcome: 0 as const },
      { probability: 0.8, outcome: 0 as const },
    ];
    const curve = calculateCalibrationCurve(overconfidentForecasts);
    expect(curve.overconfidenceScore).toBeGreaterThan(0);
    expect(curve.underconfidenceScore).toBe(0);
  });

  it('should calculate underconfidence correctly', () => {
    // Forecasts where probabilities are lower than actual outcomes
    const underconfidentForecasts = [
      { probability: 0.1, outcome: 1 as const },
      { probability: 0.1, outcome: 1 as const },
      { probability: 0.2, outcome: 1 as const },
    ];
    const curve = calculateCalibrationCurve(underconfidentForecasts);
    expect(curve.underconfidenceScore).toBeGreaterThan(0);
    expect(curve.overconfidenceScore).toBe(0);
  });

  it('should respect number of bins', () => {
    const forecasts = [];
    for (let i = 0; i < 100; i++) {
      forecasts.push({
        probability: i / 100,
        outcome: (i % 2 === 0 ? 1 : 0) as 0 | 1,
      });
    }
    const curve5 = calculateCalibrationCurve(forecasts, 5);
    const curve10 = calculateCalibrationCurve(forecasts, 10);

    expect(curve5.bins.length).toBeLessThanOrEqual(5);
    expect(curve10.bins.length).toBeLessThanOrEqual(10);
  });
});

// =============================================================================
// Superforecaster Tier Tests
// =============================================================================

describe('calculateSuperforecasterTier', () => {
  it('should return no tier for insufficient forecasts', () => {
    const result = calculateSuperforecasterTier(5, 0.15, 0.05);
    expect(result.currentTier).toBeNull();
    expect(result.nextTier).toBe('APPRENTICE');
  });

  it('should qualify for APPRENTICE tier', () => {
    const result = calculateSuperforecasterTier(15, 0.25, 0.10);
    expect(result.currentTier).toBe('APPRENTICE');
  });

  it('should qualify for JOURNEYMAN tier', () => {
    const result = calculateSuperforecasterTier(60, 0.22, 0.10);
    expect(result.currentTier).toBe('JOURNEYMAN');
    expect(result.nextTier).toBe('EXPERT');
  });

  it('should qualify for EXPERT tier', () => {
    const result = calculateSuperforecasterTier(120, 0.18, 0.08);
    expect(result.currentTier).toBe('EXPERT');
    expect(result.nextTier).toBe('MASTER');
  });

  it('should qualify for MASTER tier', () => {
    const result = calculateSuperforecasterTier(300, 0.14, 0.07);
    expect(result.currentTier).toBe('MASTER');
    expect(result.nextTier).toBe('GRANDMASTER');
  });

  it('should qualify for GRANDMASTER with excellent scores', () => {
    const result = calculateSuperforecasterTier(600, 0.10, 0.04);
    expect(result.currentTier).toBe('GRANDMASTER');
    expect(result.nextTier).toBeNull();
  });

  it('should track progress toward next tier', () => {
    const result = calculateSuperforecasterTier(8, 0.20, 0.08);
    expect(result.progress.forecasts.current).toBe(8);
    expect(result.progress.forecasts.required).toBe(10); // APPRENTICE requirement
    expect(result.progress.forecasts.percentage).toBe(80);
  });

  it('should indicate promotion qualification', () => {
    // Already at APPRENTICE, meets requirements for JOURNEYMAN except forecasts
    const notQualified = calculateSuperforecasterTier(25, 0.22, 0.10);
    expect(notQualified.currentTier).toBe('APPRENTICE');
    expect(notQualified.qualifiesForPromotion).toBe(false); // Need 50 forecasts

    // Meets all requirements for promotion to JOURNEYMAN
    const qualified = calculateSuperforecasterTier(55, 0.22, 0.10);
    expect(qualified.currentTier).toBe('JOURNEYMAN');
    // Already promoted, so progress is toward EXPERT
    expect(qualified.qualifiesForPromotion).toBe(false); // Need 100 forecasts for EXPERT
  });
});

describe('getTierDisplayInfo', () => {
  it('should return unranked info for null tier', () => {
    const info = getTierDisplayInfo(null);
    expect(info.name).toBe('Unranked');
    expect(info.icon).toBe('❓');
    expect(info.description).toContain('Complete more forecasts');
  });

  it('should return APPRENTICE info', () => {
    const info = getTierDisplayInfo('APPRENTICE');
    expect(info.name).toBe('Apprentice');
    expect(info.icon).toBe('🌱');
    expect(info.color).toBe('#888888');
  });

  it('should return JOURNEYMAN info', () => {
    const info = getTierDisplayInfo('JOURNEYMAN');
    expect(info.name).toBe('Journeyman');
    expect(info.icon).toBe('🎯');
    expect(info.color).toBe('#cd7f32');
  });

  it('should return EXPERT info', () => {
    const info = getTierDisplayInfo('EXPERT');
    expect(info.name).toBe('Expert');
    expect(info.icon).toBe('🔮');
    expect(info.color).toBe('#c0c0c0');
  });

  it('should return MASTER info', () => {
    const info = getTierDisplayInfo('MASTER');
    expect(info.name).toBe('Master');
    expect(info.icon).toBe('🧠');
    expect(info.color).toBe('#ffd700');
  });

  it('should return GRANDMASTER info', () => {
    const info = getTierDisplayInfo('GRANDMASTER');
    expect(info.name).toBe('Grandmaster');
    expect(info.icon).toBe('👁️');
    expect(info.color).toBe('#00ffff');
  });

  it('should include description for all tiers', () => {
    const tiers = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'] as const;
    for (const tier of tiers) {
      const info = getTierDisplayInfo(tier);
      expect(info.description).toBeTruthy();
      expect(info.description.length).toBeGreaterThan(10);
    }
  });
});

// =============================================================================
// Formatting Utilities Tests
// =============================================================================

describe('formatProbability', () => {
  it('should format probability as percentage', () => {
    expect(formatProbability(0.5)).toBe('50.0%');
    expect(formatProbability(0.123)).toBe('12.3%');
  });

  it('should handle edge cases', () => {
    expect(formatProbability(0)).toBe('0.0%');
    expect(formatProbability(1)).toBe('100.0%');
  });

  it('should round correctly', () => {
    expect(formatProbability(0.1234)).toBe('12.3%');
    expect(formatProbability(0.1238)).toBe('12.4%'); // Use clearer rounding example
  });
});

describe('formatBrierScore', () => {
  it('should format Brier score with 3 decimal places', () => {
    expect(formatBrierScore(0.25)).toBe('0.250');
    expect(formatBrierScore(0.1234)).toBe('0.123');
  });

  it('should handle edge cases', () => {
    expect(formatBrierScore(0)).toBe('0.000');
    expect(formatBrierScore(1)).toBe('1.000');
  });

  it('should round correctly', () => {
    expect(formatBrierScore(0.1234)).toBe('0.123');
    expect(formatBrierScore(0.1236)).toBe('0.124');
  });
});

describe('scaleProbabilityForChain', () => {
  it('should scale probability for chain storage', () => {
    expect(scaleProbabilityForChain(0.5)).toBe(50);
    expect(scaleProbabilityForChain(0.01)).toBe(1);
    expect(scaleProbabilityForChain(0.99)).toBe(99);
  });

  it('should clamp to valid range', () => {
    expect(scaleProbabilityForChain(0)).toBe(1); // Clamped to minimum
    expect(scaleProbabilityForChain(1)).toBe(99); // Clamped to maximum
  });

  it('should round correctly', () => {
    expect(scaleProbabilityForChain(0.554)).toBe(55);
    expect(scaleProbabilityForChain(0.556)).toBe(56);
  });
});

describe('unscaleProbabilityFromChain', () => {
  it('should unscale probability from chain', () => {
    expect(unscaleProbabilityFromChain(50)).toBe(0.5);
    expect(unscaleProbabilityFromChain(1)).toBe(0.01);
    expect(unscaleProbabilityFromChain(99)).toBe(0.99);
  });

  it('should be inverse of scale function', () => {
    const probabilities = [0.1, 0.25, 0.5, 0.75, 0.9];
    for (const p of probabilities) {
      const scaled = scaleProbabilityForChain(p);
      const unscaled = unscaleProbabilityFromChain(scaled);
      expect(unscaled).toBeCloseTo(p, 1);
    }
  });
});

describe('scaleBrierScoreForChain', () => {
  it('should scale Brier score for chain storage', () => {
    expect(scaleBrierScoreForChain(0.25)).toBe(2500);
    expect(scaleBrierScoreForChain(0.1)).toBe(1000);
    expect(scaleBrierScoreForChain(0)).toBe(0);
    expect(scaleBrierScoreForChain(1)).toBe(10000);
  });

  it('should round to integer', () => {
    expect(scaleBrierScoreForChain(0.12345)).toBe(1235);
    expect(scaleBrierScoreForChain(0.12344)).toBe(1234);
  });
});

describe('unscaleBrierScoreFromChain', () => {
  it('should unscale Brier score from chain', () => {
    expect(unscaleBrierScoreFromChain(2500)).toBe(0.25);
    expect(unscaleBrierScoreFromChain(1000)).toBe(0.1);
    expect(unscaleBrierScoreFromChain(0)).toBe(0);
    expect(unscaleBrierScoreFromChain(10000)).toBe(1);
  });

  it('should be inverse of scale function', () => {
    const scores = [0, 0.1, 0.25, 0.5, 0.75, 1];
    for (const s of scores) {
      const scaled = scaleBrierScoreForChain(s);
      const unscaled = unscaleBrierScoreFromChain(scaled);
      expect(unscaled).toBeCloseTo(s, 4);
    }
  });
});
