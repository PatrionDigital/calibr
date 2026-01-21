/**
 * Core Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKelly,
  brierScore,
  averageBrierScore,
  calculateCalibrationCurve,
  calculateSuperforecasterTier,
  formatProbability,
  scaleProbabilityForChain,
  unscaleProbabilityFromChain,
} from '../src/utils';

describe('Kelly Criterion', () => {
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
});

describe('Brier Score', () => {
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

  it('should calculate average Brier score', () => {
    const forecasts = [
      { probability: 0.8, outcome: 1 as const },
      { probability: 0.2, outcome: 0 as const },
    ];
    const avg = averageBrierScore(forecasts);
    expect(avg).toBeCloseTo(0.04, 2);
  });
});

describe('Calibration Curve', () => {
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
});

describe('Superforecaster Tiers', () => {
  it('should return no tier for insufficient forecasts', () => {
    const result = calculateSuperforecasterTier(5, 0.15, 0.05);
    expect(result.currentTier).toBeNull();
    expect(result.nextTier).toBe('APPRENTICE');
  });

  it('should qualify for APPRENTICE tier', () => {
    const result = calculateSuperforecasterTier(15, 0.25, 0.10);
    expect(result.currentTier).toBe('APPRENTICE');
  });

  it('should qualify for GRANDMASTER with excellent scores', () => {
    const result = calculateSuperforecasterTier(600, 0.10, 0.04);
    expect(result.currentTier).toBe('GRANDMASTER');
    expect(result.nextTier).toBeNull();
  });
});

describe('Formatting Utilities', () => {
  it('should format probability as percentage', () => {
    expect(formatProbability(0.5)).toBe('50.0%');
    expect(formatProbability(0.123)).toBe('12.3%');
  });

  it('should scale probability for chain storage', () => {
    expect(scaleProbabilityForChain(0.5)).toBe(50);
    expect(scaleProbabilityForChain(0.01)).toBe(1);
    expect(scaleProbabilityForChain(0.99)).toBe(99);
  });

  it('should unscale probability from chain', () => {
    expect(unscaleProbabilityFromChain(50)).toBe(0.5);
    expect(unscaleProbabilityFromChain(1)).toBe(0.01);
  });
});
