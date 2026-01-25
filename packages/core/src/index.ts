/**
 * @calibr/core - Shared business logic and utilities
 */

export * from "./types";
export * from "./utils";
export * from "./eas";
export * from "./storage";

// Re-export scoring with explicit names to avoid conflicts
export {
  // Brier scoring
  calculateSingleBrier,
  calculateBrierScore,
  calculateTimeWeightedBrier,
  analyzeCalibration,
  calculateBrierByCategory,
  calculateBrierTimeSeries,
  calculateTier,
  getTierProgress,

  // Kelly Criterion
  calculateKelly,
  calculatePortfolioKelly,
  calculateEdge,
  formatKellyRecommendation,
  getKellyMultiplierDescription,
  KELLY_MULTIPLIERS,

  // Types
  type BrierScoreResult,
  type CalibrationBucket,
  type CalibrationResult,
  type TimeSeriesScore,
  type TierRequirements,
  type KellyInput,
  type KellyResult,
  type PortfolioKellyInput,
  type PortfolioKellyResult,
} from "./scoring";
export type { Forecast as ScoringForecast, SuperforecasterTier } from "./scoring";
