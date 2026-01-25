/**
 * Core utilities for Calibr.xyz
 * Includes: Kelly Criterion, Brier Scoring, Calibration, Superforecaster Tiers
 */

// Import and re-export shared types
import type { SuperforecasterTier } from '../types/eas';
export type { SuperforecasterTier } from '../types/eas';

// =============================================================================
// Kelly Criterion Utilities
// =============================================================================

export interface KellyResult {
  optimalFraction: number;
  quarterKelly: number;
  halfKelly: number;
  edge: number;
  expectedValue: number;
}

/**
 * Calculate full Kelly Criterion analysis
 * @param probability Your estimated probability of winning (0-1)
 * @param marketProbability Market's implied probability (0-1)
 * @param bankroll Total available bankroll
 * @returns Full Kelly analysis with optimal and fractional recommendations
 */
export function calculateKelly(
  probability: number,
  marketProbability: number,
  _bankroll?: number
): KellyResult {
  // Clamp probability to valid range
  const p = Math.max(0.01, Math.min(0.99, probability));
  const mp = Math.max(0.01, Math.min(0.99, marketProbability));

  // Calculate edge: your probability minus market probability
  const edge = p - mp;

  // Kelly formula for binary markets: f* = (p * b - q) / b
  // where b = odds - 1 = (1 - mp) / mp for YES side
  // Simplified: f* = p - q / b = p - (1-p) * mp / (1-mp)
  const q = 1 - p;
  const b = (1 - mp) / mp; // decimal odds minus 1
  const optimalFraction = Math.max(0, (p * b - q) / b);

  // Expected value: edge * optimal bet
  const expectedValue = edge * optimalFraction;

  return {
    optimalFraction,
    quarterKelly: optimalFraction * 0.25,
    halfKelly: optimalFraction * 0.5,
    edge,
    expectedValue,
  };
}

/**
 * Simple Kelly bet size (backward compatible)
 */
export function kellyBetSize(
  probability: number,
  odds: number,
  fraction = 0.25
): number {
  if (probability <= 0 || probability >= 1) return 0;
  if (odds <= 1) return 0;

  const q = 1 - probability;
  const kelly = (probability * odds - q) / odds;

  return Math.max(0, kelly * fraction);
}

/**
 * Calculate position size recommendation
 * @param kelly Kelly calculation result
 * @param bankroll Available bankroll
 * @param riskTolerance 'conservative' | 'moderate' | 'aggressive'
 */
export function calculatePositionSize(
  kelly: KellyResult,
  bankroll: number,
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): { amount: number; fraction: number; label: string } {
  let fraction: number;
  let label: string;

  switch (riskTolerance) {
    case 'conservative':
      fraction = kelly.quarterKelly;
      label = 'Quarter Kelly';
      break;
    case 'aggressive':
      fraction = kelly.optimalFraction;
      label = 'Full Kelly';
      break;
    case 'moderate':
    default:
      fraction = kelly.halfKelly;
      label = 'Half Kelly';
  }

  return {
    amount: bankroll * fraction,
    fraction,
    label,
  };
}

// =============================================================================
// Brier Score Utilities
// =============================================================================

export interface BrierResult {
  score: number;
  calibration: number;
  resolution: number;
  uncertainty: number;
}

/**
 * Calculate Brier score for a single forecast
 * @param probability Forecasted probability (0-1)
 * @param outcome Actual outcome (0 or 1)
 * @returns Brier score (lower is better, 0-1 range)
 */
export function brierScore(probability: number, outcome: 0 | 1): number {
  return Math.pow(probability - outcome, 2);
}

/**
 * Calculate average Brier score for multiple forecasts
 * @param forecasts Array of { probability, outcome } objects
 * @returns Average Brier score
 */
export function averageBrierScore(
  forecasts: Array<{ probability: number; outcome: 0 | 1 }>
): number {
  if (forecasts.length === 0) return 0;

  const totalScore = forecasts.reduce(
    (sum, f) => sum + brierScore(f.probability, f.outcome),
    0
  );

  return totalScore / forecasts.length;
}

/**
 * Calculate time-weighted Brier score with exponential decay
 * More recent forecasts are weighted more heavily
 * @param forecasts Array of { probability, outcome, timestamp } objects
 * @param halfLifeDays Number of days for half-life decay (default 30)
 * @returns Time-weighted Brier score
 */
export function timeWeightedBrierScore(
  forecasts: Array<{ probability: number; outcome: 0 | 1; timestamp: number }>,
  halfLifeDays = 30
): number {
  if (forecasts.length === 0) return 0;

  const now = Date.now();
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  const lambda = Math.LN2 / halfLifeMs;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const f of forecasts) {
    const age = now - f.timestamp;
    const weight = Math.exp(-lambda * age);
    const score = brierScore(f.probability, f.outcome);

    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Decompose Brier score into calibration, resolution, and uncertainty
 * Uses the Murphy decomposition: BS = Calibration - Resolution + Uncertainty
 */
export function decomposeBrierScore(
  forecasts: Array<{ probability: number; outcome: 0 | 1 }>
): BrierResult {
  if (forecasts.length === 0) {
    return { score: 0, calibration: 0, resolution: 0, uncertainty: 0 };
  }

  const n = forecasts.length;
  const baseRate = forecasts.reduce((sum, f) => sum + f.outcome, 0) / n;
  const uncertainty = baseRate * (1 - baseRate);

  // Group forecasts into bins for calibration/resolution calculation
  const bins = new Map<number, { forecasts: typeof forecasts; count: number }>();

  for (const f of forecasts) {
    // Round to nearest 0.1 for binning
    const binKey = Math.round(f.probability * 10) / 10;
    if (!bins.has(binKey)) {
      bins.set(binKey, { forecasts: [], count: 0 });
    }
    const bin = bins.get(binKey)!;
    bin.forecasts.push(f);
    bin.count++;
  }

  let calibration = 0;
  let resolution = 0;

  for (const [binProb, bin] of bins) {
    const binOutcomeRate = bin.forecasts.reduce((sum, f) => sum + f.outcome, 0) / bin.count;
    const binWeight = bin.count / n;

    calibration += binWeight * Math.pow(binProb - binOutcomeRate, 2);
    resolution += binWeight * Math.pow(binOutcomeRate - baseRate, 2);
  }

  const score = calibration - resolution + uncertainty;

  return { score, calibration, resolution, uncertainty };
}

// =============================================================================
// Calibration Utilities
// =============================================================================

export interface CalibrationBin {
  binCenter: number;
  binStart: number;
  binEnd: number;
  forecastCount: number;
  outcomeRate: number;
  avgForecast: number;
}

export interface CalibrationCurve {
  bins: CalibrationBin[];
  overconfidenceScore: number;
  underconfidenceScore: number;
  calibrationError: number;
}

/**
 * Generate calibration curve data
 * @param forecasts Array of { probability, outcome } objects
 * @param numBins Number of bins (default 10 for deciles)
 * @returns Calibration curve with bins and metrics
 */
export function calculateCalibrationCurve(
  forecasts: Array<{ probability: number; outcome: 0 | 1 }>,
  numBins = 10
): CalibrationCurve {
  const binWidth = 1 / numBins;
  const bins: CalibrationBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const binStart = i * binWidth;
    const binEnd = (i + 1) * binWidth;
    const binCenter = (binStart + binEnd) / 2;

    const binForecasts = forecasts.filter(
      (f) => f.probability >= binStart && f.probability < binEnd
    );

    if (binForecasts.length > 0) {
      const outcomeRate =
        binForecasts.reduce((sum, f) => sum + f.outcome, 0) / binForecasts.length;
      const avgForecast =
        binForecasts.reduce((sum, f) => sum + f.probability, 0) / binForecasts.length;

      bins.push({
        binCenter,
        binStart,
        binEnd,
        forecastCount: binForecasts.length,
        outcomeRate,
        avgForecast,
      });
    }
  }

  // Calculate calibration metrics
  let overconfidence = 0;
  let underconfidence = 0;
  let totalError = 0;
  let totalWeight = 0;

  for (const bin of bins) {
    const error = bin.avgForecast - bin.outcomeRate;
    const weight = bin.forecastCount;

    totalError += Math.abs(error) * weight;
    totalWeight += weight;

    if (error > 0) {
      overconfidence += error * weight;
    } else {
      underconfidence += Math.abs(error) * weight;
    }
  }

  return {
    bins,
    overconfidenceScore: totalWeight > 0 ? overconfidence / totalWeight : 0,
    underconfidenceScore: totalWeight > 0 ? underconfidence / totalWeight : 0,
    calibrationError: totalWeight > 0 ? totalError / totalWeight : 0,
  };
}

// =============================================================================
// Superforecaster Tier Utilities
// =============================================================================

export interface TierThresholds {
  minForecasts: number;
  maxBrierScore: number;
  maxCalibrationError: number;
}

export const TIER_THRESHOLDS: Record<SuperforecasterTier, TierThresholds> = {
  APPRENTICE: { minForecasts: 10, maxBrierScore: 0.30, maxCalibrationError: 0.15 },
  JOURNEYMAN: { minForecasts: 50, maxBrierScore: 0.25, maxCalibrationError: 0.12 },
  EXPERT: { minForecasts: 100, maxBrierScore: 0.20, maxCalibrationError: 0.10 },
  MASTER: { minForecasts: 250, maxBrierScore: 0.15, maxCalibrationError: 0.08 },
  GRANDMASTER: { minForecasts: 500, maxBrierScore: 0.12, maxCalibrationError: 0.05 },
};

export interface TierCalculation {
  currentTier: SuperforecasterTier | null;
  nextTier: SuperforecasterTier | null;
  progress: {
    forecasts: { current: number; required: number; percentage: number };
    brierScore: { current: number; required: number; percentage: number };
    calibration: { current: number; required: number; percentage: number };
  };
  qualifiesForPromotion: boolean;
}

/**
 * Calculate a user's superforecaster tier
 * @param forecasts Number of resolved forecasts
 * @param brierScore Average Brier score
 * @param calibrationError Calibration error
 * @returns Tier calculation with progress
 */
export function calculateSuperforecasterTier(
  forecastCount: number,
  brierScore: number,
  calibrationError: number
): TierCalculation {
  const tiers: SuperforecasterTier[] = [
    'GRANDMASTER',
    'MASTER',
    'EXPERT',
    'JOURNEYMAN',
    'APPRENTICE',
  ];

  let currentTier: SuperforecasterTier | null = null;

  // Find highest qualifying tier
  for (const tier of tiers) {
    const threshold = TIER_THRESHOLDS[tier];
    if (
      forecastCount >= threshold.minForecasts &&
      brierScore <= threshold.maxBrierScore &&
      calibrationError <= threshold.maxCalibrationError
    ) {
      currentTier = tier;
      break;
    }
  }

  // Find next tier
  let nextTier: SuperforecasterTier | null = null;
  if (currentTier) {
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex > 0) {
      nextTier = tiers[currentIndex - 1] ?? null;
    }
  } else {
    nextTier = 'APPRENTICE';
  }

  // Calculate progress toward next tier
  const targetThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : TIER_THRESHOLDS.APPRENTICE;

  const progress = {
    forecasts: {
      current: forecastCount,
      required: targetThreshold.minForecasts,
      percentage: Math.min(100, (forecastCount / targetThreshold.minForecasts) * 100),
    },
    brierScore: {
      current: brierScore,
      required: targetThreshold.maxBrierScore,
      percentage: brierScore <= targetThreshold.maxBrierScore
        ? 100
        : Math.max(0, ((0.5 - brierScore) / (0.5 - targetThreshold.maxBrierScore)) * 100),
    },
    calibration: {
      current: calibrationError,
      required: targetThreshold.maxCalibrationError,
      percentage: calibrationError <= targetThreshold.maxCalibrationError
        ? 100
        : Math.max(0, ((0.25 - calibrationError) / (0.25 - targetThreshold.maxCalibrationError)) * 100),
    },
  };

  const qualifiesForPromotion =
    progress.forecasts.percentage >= 100 &&
    progress.brierScore.percentage >= 100 &&
    progress.calibration.percentage >= 100;

  return {
    currentTier,
    nextTier,
    progress,
    qualifiesForPromotion,
  };
}

/**
 * Get tier display info
 */
export function getTierDisplayInfo(tier: SuperforecasterTier | null): {
  name: string;
  icon: string;
  color: string;
  description: string;
} {
  const tierInfo: Record<SuperforecasterTier, { name: string; icon: string; color: string; description: string }> = {
    APPRENTICE: {
      name: 'Apprentice',
      icon: '🌱',
      color: '#888888',
      description: 'Beginning your forecasting journey',
    },
    JOURNEYMAN: {
      name: 'Journeyman',
      icon: '🎯',
      color: '#cd7f32',
      description: 'Developing solid forecasting skills',
    },
    EXPERT: {
      name: 'Expert',
      icon: '🔮',
      color: '#c0c0c0',
      description: 'Consistently accurate predictions',
    },
    MASTER: {
      name: 'Master',
      icon: '🧠',
      color: '#ffd700',
      description: 'Elite calibration and accuracy',
    },
    GRANDMASTER: {
      name: 'Grandmaster',
      icon: '👁️',
      color: '#00ffff',
      description: 'Among the best forecasters',
    },
  };

  if (!tier) {
    return {
      name: 'Unranked',
      icon: '❓',
      color: '#444444',
      description: 'Complete more forecasts to earn a tier',
    };
  }

  return tierInfo[tier];
}

// =============================================================================
// Formatting Utilities
// =============================================================================

/**
 * Format probability as percentage string
 */
export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

/**
 * Format Brier score for display
 */
export function formatBrierScore(score: number): string {
  return score.toFixed(3);
}

/**
 * Scale probability for on-chain storage (1-99 integer)
 */
export function scaleProbabilityForChain(probability: number): number {
  return Math.round(Math.max(1, Math.min(99, probability * 100)));
}

/**
 * Unscale probability from chain format
 */
export function unscaleProbabilityFromChain(scaled: number): number {
  return scaled / 100;
}

/**
 * Scale Brier score for on-chain storage (0-10000 integer)
 */
export function scaleBrierScoreForChain(score: number): number {
  return Math.round(score * 10000);
}

/**
 * Unscale Brier score from chain format
 */
export function unscaleBrierScoreFromChain(scaled: number): number {
  return scaled / 10000;
}
