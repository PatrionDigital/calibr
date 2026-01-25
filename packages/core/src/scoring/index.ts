/**
 * Scoring Module
 * Proper scoring rules for probabilistic forecasts
 */

export {
  // Core functions
  calculateSingleBrier,
  calculateBrierScore,
  calculateTimeWeightedBrier,

  // Calibration analysis
  analyzeCalibration,

  // Category analysis
  calculateBrierByCategory,

  // Time series
  calculateBrierTimeSeries,

  // Superforecaster tiers
  calculateTier,
  getTierProgress,

  // Types
  type Forecast,
  type BrierScoreResult,
  type CalibrationBucket,
  type CalibrationResult,
  type TimeSeriesScore,
  type SuperforecasterTier,
  type TierRequirements,
} from './brier';

export {
  // Kelly Criterion
  calculateKelly,
  calculatePortfolioKelly,
  calculateEdge,
  formatKellyRecommendation,
  getKellyMultiplierDescription,
  KELLY_MULTIPLIERS,

  // Types
  type KellyInput,
  type KellyResult,
  type PortfolioKellyInput,
  type PortfolioKellyResult,
} from './kelly';
