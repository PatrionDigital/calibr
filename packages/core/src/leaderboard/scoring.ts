/**
 * Leaderboard Scoring
 * Composite scoring algorithm for forecaster rankings
 */

import {
  type LeaderboardEntry,
  type ForecasterTier,
  type CompositeScore,
  TIER_THRESHOLDS,
  REPUTATION_WEIGHTS,
  FORECASTER_TIERS,
} from './types';

// =============================================================================
// Constants
// =============================================================================

const MAX_COMPOSITE_SCORE = 1000;
const BRIER_WEIGHT = 0.55;
const CALIBRATION_WEIGHT = 0.35;
const VOLUME_WEIGHT = 0.05;
const STREAK_WEIGHT = 0.03;
const REPUTATION_WEIGHT = 0.02;

const VOLUME_BONUS_THRESHOLD = 50;
const VOLUME_BONUS_MAX = 500;
const STREAK_BONUS_MAX = 100;
const MAX_STREAK_DAYS = 365;

// =============================================================================
// Composite Score Calculation
// =============================================================================

/**
 * Calculate the composite score for a forecaster
 * Higher scores are better, max is 1000
 */
export function calculateCompositeScore(entry: LeaderboardEntry): number {
  // No forecasts = no score
  if (entry.totalForecasts === 0) {
    return 0;
  }

  // Brier score component (lower is better, so we invert)
  // Brier ranges 0-1, perfect is 0
  const brierComponent = (1 - entry.brierScore) * MAX_COMPOSITE_SCORE * BRIER_WEIGHT;

  // Calibration component (higher is better)
  const calibrationComponent = entry.calibrationScore * MAX_COMPOSITE_SCORE * CALIBRATION_WEIGHT;

  // Volume bonus (more forecasts = small bonus)
  const volumeRatio = Math.min(entry.resolvedForecasts / VOLUME_BONUS_MAX, 1);
  const volumeBonus = entry.resolvedForecasts >= VOLUME_BONUS_THRESHOLD
    ? volumeRatio * MAX_COMPOSITE_SCORE * VOLUME_WEIGHT
    : 0;

  // Streak bonus
  const streakBonus = calculateStreakBonus(entry.streakDays) * STREAK_WEIGHT;

  // External reputation bonus
  const reputationBonus = calculateReputationBonus(entry) * REPUTATION_WEIGHT;

  const total = Math.round(
    brierComponent + calibrationComponent + volumeBonus + streakBonus + reputationBonus
  );

  return Math.min(total, MAX_COMPOSITE_SCORE);
}

/**
 * Calculate detailed composite score breakdown
 */
export function calculateCompositeScoreDetails(entry: LeaderboardEntry): CompositeScore {
  if (entry.totalForecasts === 0) {
    return {
      baseScore: 0,
      brierComponent: 0,
      calibrationComponent: 0,
      volumeBonus: 0,
      streakBonus: 0,
      reputationBonus: 0,
      total: 0,
    };
  }

  const brierComponent = (1 - entry.brierScore) * MAX_COMPOSITE_SCORE * BRIER_WEIGHT;
  const calibrationComponent = entry.calibrationScore * MAX_COMPOSITE_SCORE * CALIBRATION_WEIGHT;
  const volumeRatio = Math.min(entry.resolvedForecasts / VOLUME_BONUS_MAX, 1);
  const volumeBonus = entry.resolvedForecasts >= VOLUME_BONUS_THRESHOLD
    ? volumeRatio * MAX_COMPOSITE_SCORE * VOLUME_WEIGHT
    : 0;
  const streakBonus = calculateStreakBonus(entry.streakDays) * STREAK_WEIGHT;
  const reputationBonus = calculateReputationBonus(entry) * REPUTATION_WEIGHT;

  const baseScore = brierComponent + calibrationComponent;
  const total = Math.min(
    Math.round(baseScore + volumeBonus + streakBonus + reputationBonus),
    MAX_COMPOSITE_SCORE
  );

  return {
    baseScore: Math.round(baseScore),
    brierComponent: Math.round(brierComponent),
    calibrationComponent: Math.round(calibrationComponent),
    volumeBonus: Math.round(volumeBonus),
    streakBonus: Math.round(streakBonus),
    reputationBonus: Math.round(reputationBonus),
    total,
  };
}

// =============================================================================
// Streak Bonus
// =============================================================================

/**
 * Calculate bonus points for forecasting streak
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays <= 0) {
    return 0;
  }

  // Logarithmic scaling to reward consistency without being too extreme
  const normalizedStreak = Math.min(streakDays, MAX_STREAK_DAYS);
  const bonus = Math.log10(normalizedStreak + 1) * (STREAK_BONUS_MAX / Math.log10(MAX_STREAK_DAYS + 1));

  return Math.round(bonus);
}

// =============================================================================
// Reputation Bonus
// =============================================================================

/**
 * Calculate bonus from external reputation sources
 */
function calculateReputationBonus(entry: LeaderboardEntry): number {
  if (entry.externalReputations.length === 0) {
    return 0;
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const rep of entry.externalReputations) {
    if (rep.verified) {
      const weight = REPUTATION_WEIGHTS[rep.platform] || 0;
      weightedSum += (rep.score / 100) * weight * MAX_COMPOSITE_SCORE;
      totalWeight += weight;
    }
  }

  // Normalize by actual weights used
  if (totalWeight > 0) {
    return Math.round(weightedSum);
  }

  return 0;
}

// =============================================================================
// Tier Calculation
// =============================================================================

/**
 * Calculate the tier based on composite score
 */
export function calculateTier(compositeScore: number): ForecasterTier {
  // Iterate in reverse to find the highest tier the score qualifies for
  for (let i = FORECASTER_TIERS.length - 1; i >= 0; i--) {
    const tier = FORECASTER_TIERS[i]!;
    if (compositeScore >= TIER_THRESHOLDS[tier]) {
      return tier;
    }
  }

  return 'APPRENTICE';
}

/**
 * Calculate progress towards the next tier (0-1)
 */
export function calculateTierProgress(compositeScore: number, currentTier: ForecasterTier): number {
  const tierIndex = FORECASTER_TIERS.indexOf(currentTier);

  // If already at max tier, progress is based on score within that tier
  if (tierIndex === FORECASTER_TIERS.length - 1) {
    const currentThreshold = TIER_THRESHOLDS[currentTier];
    const progressInTier = (compositeScore - currentThreshold) / (MAX_COMPOSITE_SCORE - currentThreshold);
    return Math.min(progressInTier, 1);
  }

  const nextTier = FORECASTER_TIERS[tierIndex + 1]!;
  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const nextThreshold = TIER_THRESHOLDS[nextTier];

  const progress = (compositeScore - currentThreshold) / (nextThreshold - currentThreshold);
  return Math.max(0, Math.min(progress, 1));
}
