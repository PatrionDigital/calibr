/**
 * Brier Score Calculator
 * Implements proper scoring rules for probabilistic forecasts
 *
 * The Brier score is calculated as: BS = (1/N) * Σ(f - o)²
 * where f = forecasted probability, o = actual outcome (0 or 1)
 *
 * Lower scores are better:
 * - 0.0 = perfect calibration
 * - 0.25 = random guessing (always predicting 50%)
 * - 1.0 = always wrong with maximum confidence
 */

// =============================================================================
// Types
// =============================================================================

export interface Forecast {
  /** Forecasted probability (0-1) */
  probability: number;
  /** Actual outcome (true = occurred, false = did not occur) */
  outcome: boolean | null;
  /** Optional weight for weighted calculations */
  weight?: number;
  /** Market ID for reference */
  marketId?: string;
  /** Timestamp of the forecast */
  timestamp?: Date;
  /** Category for category-specific scoring */
  category?: string;
}

export interface BrierScoreResult {
  /** Overall Brier score (0-1, lower is better) */
  score: number;
  /** Number of forecasts included */
  count: number;
  /** Skill score relative to always predicting 50% (positive = better than chance) */
  skillScore: number;
  /** Confidence-weighted score */
  weightedScore?: number;
}

export interface CalibrationBucket {
  /** Lower bound of probability range */
  rangeStart: number;
  /** Upper bound of probability range */
  rangeEnd: number;
  /** Average predicted probability in this bucket */
  avgPrediction: number;
  /** Actual frequency of positive outcomes */
  actualFrequency: number;
  /** Number of forecasts in this bucket */
  count: number;
  /** Calibration error for this bucket */
  calibrationError: number;
}

export interface CalibrationResult {
  /** Overall Brier score */
  brierScore: number;
  /** Calibration component (reliability) */
  calibration: number;
  /** Resolution component (ability to discriminate) */
  resolution: number;
  /** Uncertainty component (base rate uncertainty) */
  uncertainty: number;
  /** Calibration buckets for plotting */
  buckets: CalibrationBucket[];
  /** Expected calibration error */
  ece: number;
}

export interface TimeSeriesScore {
  /** Timestamp or period label */
  period: string;
  /** Brier score for this period */
  score: number;
  /** Number of forecasts */
  count: number;
  /** Cumulative score up to this point */
  cumulativeScore: number;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate Brier score for a single forecast
 */
export function calculateSingleBrier(probability: number, outcome: boolean): number {
  const o = outcome ? 1 : 0;
  return Math.pow(probability - o, 2);
}

/**
 * Calculate overall Brier score for multiple forecasts
 */
export function calculateBrierScore(forecasts: Forecast[]): BrierScoreResult {
  // Filter to only resolved forecasts
  const resolved = forecasts.filter((f) => f.outcome !== null);

  if (resolved.length === 0) {
    return {
      score: 0,
      count: 0,
      skillScore: 0,
    };
  }

  // Calculate mean Brier score
  let totalScore = 0;
  let totalWeight = 0;
  let weightedScore = 0;

  for (const forecast of resolved) {
    const singleScore = calculateSingleBrier(forecast.probability, forecast.outcome!);
    totalScore += singleScore;

    if (forecast.weight !== undefined) {
      weightedScore += singleScore * forecast.weight;
      totalWeight += forecast.weight;
    }
  }

  const meanScore = totalScore / resolved.length;

  // Calculate skill score (improvement over always predicting 50%)
  // Brier score for always predicting 0.5 is 0.25
  const referenceScore = 0.25;
  const skillScore = 1 - meanScore / referenceScore;

  return {
    score: meanScore,
    count: resolved.length,
    skillScore,
    weightedScore: totalWeight > 0 ? weightedScore / totalWeight : undefined,
  };
}

/**
 * Calculate time-weighted Brier score
 * More recent forecasts get higher weight
 */
export function calculateTimeWeightedBrier(
  forecasts: Forecast[],
  halfLifeDays: number = 90
): BrierScoreResult {
  const now = new Date();
  const resolved = forecasts.filter((f) => f.outcome !== null && f.timestamp);

  if (resolved.length === 0) {
    return { score: 0, count: 0, skillScore: 0 };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const forecast of resolved) {
    const daysSinceForecast = (now.getTime() - forecast.timestamp!.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.pow(0.5, daysSinceForecast / halfLifeDays);

    const singleScore = calculateSingleBrier(forecast.probability, forecast.outcome!);
    totalWeightedScore += singleScore * weight;
    totalWeight += weight;
  }

  const weightedScore = totalWeightedScore / totalWeight;
  const skillScore = 1 - weightedScore / 0.25;

  return {
    score: weightedScore,
    count: resolved.length,
    skillScore,
    weightedScore,
  };
}

// =============================================================================
// Calibration Analysis
// =============================================================================

/**
 * Perform calibration analysis
 * Decomposes Brier score into calibration, resolution, and uncertainty
 */
export function analyzeCalibration(
  forecasts: Forecast[],
  numBuckets: number = 10
): CalibrationResult {
  const resolved = forecasts.filter((f) => f.outcome !== null);

  if (resolved.length === 0) {
    return {
      brierScore: 0,
      calibration: 0,
      resolution: 0,
      uncertainty: 0,
      buckets: [],
      ece: 0,
    };
  }

  // Calculate base rate
  const baseRate = resolved.filter((f) => f.outcome).length / resolved.length;
  const uncertainty = baseRate * (1 - baseRate);

  // Create calibration buckets
  const bucketSize = 1 / numBuckets;
  const buckets: CalibrationBucket[] = [];

  for (let i = 0; i < numBuckets; i++) {
    const rangeStart = i * bucketSize;
    const rangeEnd = (i + 1) * bucketSize;

    const bucketForecasts = resolved.filter(
      (f) => f.probability >= rangeStart && f.probability < rangeEnd
    );

    if (bucketForecasts.length > 0) {
      const avgPrediction =
        bucketForecasts.reduce((sum, f) => sum + f.probability, 0) / bucketForecasts.length;
      const actualFrequency =
        bucketForecasts.filter((f) => f.outcome).length / bucketForecasts.length;
      const calibrationError = Math.abs(avgPrediction - actualFrequency);

      buckets.push({
        rangeStart,
        rangeEnd,
        avgPrediction,
        actualFrequency,
        count: bucketForecasts.length,
        calibrationError,
      });
    }
  }

  // Calculate calibration (reliability) and resolution
  let calibration = 0;
  let resolution = 0;
  const n = resolved.length;

  for (const bucket of buckets) {
    const weight = bucket.count / n;
    calibration += weight * Math.pow(bucket.avgPrediction - bucket.actualFrequency, 2);
    resolution += weight * Math.pow(bucket.actualFrequency - baseRate, 2);
  }

  // Calculate Brier score
  const brierScore = calculateBrierScore(resolved).score;

  // Calculate Expected Calibration Error (ECE)
  const ece = buckets.reduce(
    (sum, b) => sum + (b.count / n) * b.calibrationError,
    0
  );

  return {
    brierScore,
    calibration,
    resolution,
    uncertainty,
    buckets,
    ece,
  };
}

// =============================================================================
// Category-Specific Scoring
// =============================================================================

/**
 * Calculate Brier scores by category
 */
export function calculateBrierByCategory(
  forecasts: Forecast[]
): Map<string, BrierScoreResult> {
  const byCategory = new Map<string, Forecast[]>();

  // Group by category
  for (const forecast of forecasts) {
    const category = forecast.category || 'uncategorized';
    const categoryForecasts = byCategory.get(category);
    if (categoryForecasts) {
      categoryForecasts.push(forecast);
    } else {
      byCategory.set(category, [forecast]);
    }
  }

  // Calculate scores for each category
  const results = new Map<string, BrierScoreResult>();
  for (const [category, categoryForecasts] of byCategory) {
    results.set(category, calculateBrierScore(categoryForecasts));
  }

  return results;
}

// =============================================================================
// Time Series Analysis
// =============================================================================

/**
 * Calculate Brier scores over time (e.g., monthly)
 */
export function calculateBrierTimeSeries(
  forecasts: Forecast[],
  periodMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): TimeSeriesScore[] {
  const resolved = forecasts
    .filter((f) => f.outcome !== null && f.timestamp)
    .sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());

  if (resolved.length === 0) {
    return [];
  }

  const firstForecast = resolved[0];
  if (!firstForecast) {
    return [];
  }

  const results: TimeSeriesScore[] = [];
  let periodStart = firstForecast.timestamp!.getTime();
  let periodForecasts: Forecast[] = [];
  let allPreviousForecasts: Forecast[] = [];

  for (const forecast of resolved) {
    const forecastTime = forecast.timestamp!.getTime();

    // Check if we've moved to a new period
    while (forecastTime >= periodStart + periodMs) {
      // Save current period if it has forecasts
      if (periodForecasts.length > 0) {
        const periodScore = calculateBrierScore(periodForecasts);
        const cumulativeScore = calculateBrierScore(allPreviousForecasts);

        results.push({
          period: new Date(periodStart).toISOString().slice(0, 10),
          score: periodScore.score,
          count: periodScore.count,
          cumulativeScore: cumulativeScore.score,
        });

        allPreviousForecasts = [...allPreviousForecasts, ...periodForecasts];
        periodForecasts = [];
      }

      periodStart += periodMs;
    }

    periodForecasts.push(forecast);
  }

  // Don't forget the last period
  if (periodForecasts.length > 0) {
    const periodScore = calculateBrierScore(periodForecasts);
    const allForecasts = [...allPreviousForecasts, ...periodForecasts];
    const cumulativeScore = calculateBrierScore(allForecasts);

    results.push({
      period: new Date(periodStart).toISOString().slice(0, 10),
      score: periodScore.score,
      count: periodScore.count,
      cumulativeScore: cumulativeScore.score,
    });
  }

  return results;
}

// =============================================================================
// Superforecaster Tier Calculation
// =============================================================================

export type SuperforecasterTier =
  | 'APPRENTICE'
  | 'JOURNEYMAN'
  | 'ADEPT'
  | 'EXPERT'
  | 'GRANDMASTER';

export interface TierRequirements {
  minForecasts: number;
  maxBrierScore: number;
  minSkillScore: number;
}

const TIER_REQUIREMENTS: Record<SuperforecasterTier, TierRequirements> = {
  APPRENTICE: { minForecasts: 10, maxBrierScore: 0.35, minSkillScore: -0.4 },
  JOURNEYMAN: { minForecasts: 50, maxBrierScore: 0.25, minSkillScore: 0.0 },
  ADEPT: { minForecasts: 100, maxBrierScore: 0.20, minSkillScore: 0.2 },
  EXPERT: { minForecasts: 250, maxBrierScore: 0.15, minSkillScore: 0.4 },
  GRANDMASTER: { minForecasts: 500, maxBrierScore: 0.10, minSkillScore: 0.6 },
};

/**
 * Calculate superforecaster tier based on performance
 */
export function calculateTier(
  brierScore: number,
  forecastCount: number,
  skillScore: number
): SuperforecasterTier {
  const tiers: SuperforecasterTier[] = [
    'GRANDMASTER',
    'EXPERT',
    'ADEPT',
    'JOURNEYMAN',
    'APPRENTICE',
  ];

  for (const tier of tiers) {
    const req = TIER_REQUIREMENTS[tier];
    if (
      forecastCount >= req.minForecasts &&
      brierScore <= req.maxBrierScore &&
      skillScore >= req.minSkillScore
    ) {
      return tier;
    }
  }

  return 'APPRENTICE';
}

/**
 * Get progress toward next tier
 */
export function getTierProgress(
  currentTier: SuperforecasterTier,
  brierScore: number,
  forecastCount: number,
  skillScore: number
): {
  nextTier: SuperforecasterTier | null;
  forecastProgress: number;
  scoreProgress: number;
  skillProgress: number;
} {
  const tierOrder: SuperforecasterTier[] = [
    'APPRENTICE',
    'JOURNEYMAN',
    'ADEPT',
    'EXPERT',
    'GRANDMASTER',
  ];

  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= tierOrder.length - 1) {
    return {
      nextTier: null,
      forecastProgress: 1,
      scoreProgress: 1,
      skillProgress: 1,
    };
  }

  const nextTier = tierOrder[currentIndex + 1] as SuperforecasterTier;
  const nextReq = TIER_REQUIREMENTS[nextTier];
  const currentReq = TIER_REQUIREMENTS[currentTier];

  return {
    nextTier: nextTier,
    forecastProgress: Math.min(1, forecastCount / nextReq.minForecasts),
    scoreProgress: Math.min(1, (currentReq.maxBrierScore - brierScore) /
      (currentReq.maxBrierScore - nextReq.maxBrierScore)),
    skillProgress: Math.min(1, (skillScore - currentReq.minSkillScore) /
      (nextReq.minSkillScore - currentReq.minSkillScore)),
  };
}
