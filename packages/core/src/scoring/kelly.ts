/**
 * Kelly Criterion Calculator
 * Optimal position sizing for prediction market betting
 *
 * The Kelly Criterion maximizes the expected logarithm of wealth,
 * providing the optimal fraction of bankroll to bet given:
 * - Your estimated probability of the outcome
 * - The market price (implied probability)
 *
 * Formula: f* = (p * b - q) / b
 * Where:
 *   f* = optimal fraction of bankroll
 *   p = probability of winning
 *   q = probability of losing (1 - p)
 *   b = odds received on the bet (payout - 1)
 *
 * For prediction markets where you buy at price P and win $1:
 *   b = (1 - P) / P  (the profit per dollar risked)
 *   f* = (p - P) / (1 - P)  (simplified formula)
 */

// =============================================================================
// Types
// =============================================================================

export interface KellyInput {
  /** Your estimated probability of the outcome (0-1) */
  estimatedProbability: number;
  /** Current market price / implied probability (0-1) */
  marketPrice: number;
  /** Optional: Kelly fraction multiplier (default: 1.0 for full Kelly) */
  fractionMultiplier?: number;
  /** Optional: Maximum allowed position size as fraction of bankroll */
  maxPositionSize?: number;
}

export interface KellyResult {
  /** Recommended position size as fraction of bankroll (0-1) */
  recommendedFraction: number;
  /** Edge: your probability minus market price */
  edge: number;
  /** Edge as percentage of market price */
  edgePercentage: number;
  /** Whether there is positive expected value */
  hasPositiveEdge: boolean;
  /** Expected value per dollar bet */
  expectedValue: number;
  /** Kelly multiplier used */
  kellyMultiplier: number;
  /** Whether the position was capped */
  wasCapped: boolean;
  /** Side to bet on */
  recommendedSide: 'YES' | 'NO' | 'NONE';
}

export interface PortfolioKellyInput {
  /** Current bankroll in dollars */
  bankroll: number;
  /** Kelly fraction multiplier for all positions */
  fractionMultiplier?: number;
  /** Maximum position size as fraction of bankroll */
  maxPositionSize?: number;
  /** Markets to analyze */
  markets: Array<{
    marketId: string;
    marketQuestion: string;
    yesPrice: number;
    noPrice: number;
    estimatedProbability: number;
  }>;
}

export interface PortfolioKellyResult {
  /** Total recommended allocation as fraction of bankroll */
  totalAllocation: number;
  /** Whether positions were scaled down due to over-allocation */
  wasScaled: boolean;
  /** Scale factor applied (1.0 if no scaling) */
  scaleFactor: number;
  /** Individual position recommendations */
  positions: Array<{
    marketId: string;
    marketQuestion: string;
    side: 'YES' | 'NO' | 'NONE';
    edge: number;
    rawKellyFraction: number;
    adjustedFraction: number;
    dollarAmount: number;
    expectedValue: number;
  }>;
}

// =============================================================================
// Core Kelly Functions
// =============================================================================

/**
 * Calculate Kelly Criterion for a single market
 */
export function calculateKelly(input: KellyInput): KellyResult {
  const {
    estimatedProbability,
    marketPrice,
    fractionMultiplier = 1.0,
    maxPositionSize = 0.25,
  } = input;

  // Validate inputs
  if (estimatedProbability < 0 || estimatedProbability > 1) {
    throw new Error('Estimated probability must be between 0 and 1');
  }
  if (marketPrice <= 0 || marketPrice >= 1) {
    throw new Error('Market price must be between 0 and 1 (exclusive)');
  }
  if (fractionMultiplier <= 0 || fractionMultiplier > 1) {
    throw new Error('Fraction multiplier must be between 0 and 1');
  }

  // Calculate edge for YES position
  const yesEdge = estimatedProbability - marketPrice;
  // Calculate edge for NO position
  const noPrice = 1 - marketPrice;
  const noEdge = (1 - estimatedProbability) - noPrice;

  // Determine which side has better edge
  let edge: number;
  let recommendedSide: 'YES' | 'NO' | 'NONE';
  let effectivePrice: number;
  let effectiveProbability: number;

  if (yesEdge > noEdge && yesEdge > 0) {
    edge = yesEdge;
    recommendedSide = 'YES';
    effectivePrice = marketPrice;
    effectiveProbability = estimatedProbability;
  } else if (noEdge > 0) {
    edge = noEdge;
    recommendedSide = 'NO';
    effectivePrice = noPrice;
    effectiveProbability = 1 - estimatedProbability;
  } else {
    // No positive edge on either side
    return {
      recommendedFraction: 0,
      edge: Math.max(yesEdge, noEdge),
      edgePercentage: 0,
      hasPositiveEdge: false,
      expectedValue: 0,
      kellyMultiplier: fractionMultiplier,
      wasCapped: false,
      recommendedSide: 'NONE',
    };
  }

  // Calculate raw Kelly fraction
  // f* = (p - price) / (1 - price)
  const rawKelly = (effectiveProbability - effectivePrice) / (1 - effectivePrice);

  // Apply fraction multiplier (fractional Kelly)
  let adjustedKelly = rawKelly * fractionMultiplier;

  // Check if capped
  const wasCapped = adjustedKelly > maxPositionSize;
  if (wasCapped) {
    adjustedKelly = maxPositionSize;
  }

  // Ensure non-negative
  adjustedKelly = Math.max(0, adjustedKelly);

  // Calculate expected value per dollar bet
  // EV = p * (1 - price) - (1 - p) * price = p - price = edge
  const expectedValue = edge;

  // Edge as percentage of market price
  const edgePercentage = (edge / effectivePrice) * 100;

  return {
    recommendedFraction: adjustedKelly,
    edge,
    edgePercentage,
    hasPositiveEdge: true,
    expectedValue,
    kellyMultiplier: fractionMultiplier,
    wasCapped,
    recommendedSide,
  };
}

/**
 * Calculate Kelly allocations across a portfolio of markets
 * Handles correlation and over-allocation issues
 */
export function calculatePortfolioKelly(input: PortfolioKellyInput): PortfolioKellyResult {
  const {
    bankroll,
    fractionMultiplier = 0.5, // Default to half-Kelly for portfolio
    maxPositionSize = 0.15,
    markets,
  } = input;

  // Calculate Kelly for each market
  const rawPositions = markets.map((market) => {
    const result = calculateKelly({
      estimatedProbability: market.estimatedProbability,
      marketPrice: market.yesPrice,
      fractionMultiplier: 1.0, // Calculate full Kelly first
      maxPositionSize: 1.0, // No cap yet
    });

    return {
      marketId: market.marketId,
      marketQuestion: market.marketQuestion,
      side: result.recommendedSide,
      edge: result.edge,
      rawKellyFraction: result.recommendedFraction,
      adjustedFraction: 0, // Will be calculated
      dollarAmount: 0, // Will be calculated
      expectedValue: result.expectedValue,
    };
  });

  // Filter to only positive edge positions
  const positiveEdgePositions = rawPositions.filter(
    (p) => p.side !== 'NONE' && p.rawKellyFraction > 0
  );

  // Calculate total raw Kelly allocation
  const totalRawKelly = positiveEdgePositions.reduce(
    (sum, p) => sum + p.rawKellyFraction,
    0
  );

  // Apply fraction multiplier
  const targetAllocation = totalRawKelly * fractionMultiplier;

  // Check if we need to scale down
  const maxTotalAllocation = 0.8; // Never allocate more than 80% of bankroll
  const wasScaled = targetAllocation > maxTotalAllocation;
  const scaleFactor = wasScaled ? maxTotalAllocation / targetAllocation : 1.0;

  // Apply adjustments to each position
  const adjustedPositions = rawPositions.map((p) => {
    if (p.side === 'NONE' || p.rawKellyFraction <= 0) {
      return {
        ...p,
        adjustedFraction: 0,
        dollarAmount: 0,
      };
    }

    // Apply fraction multiplier and scale factor
    let adjustedFraction = p.rawKellyFraction * fractionMultiplier * scaleFactor;

    // Apply individual position cap
    if (adjustedFraction > maxPositionSize) {
      adjustedFraction = maxPositionSize;
    }

    return {
      ...p,
      adjustedFraction,
      dollarAmount: adjustedFraction * bankroll,
    };
  });

  // Calculate final total allocation
  const totalAllocation = adjustedPositions.reduce(
    (sum, p) => sum + p.adjustedFraction,
    0
  );

  return {
    totalAllocation,
    wasScaled,
    scaleFactor,
    positions: adjustedPositions,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the edge given your probability and market price
 */
export function calculateEdge(
  estimatedProbability: number,
  marketPrice: number
): { yesEdge: number; noEdge: number; bestSide: 'YES' | 'NO' | 'NONE'; bestEdge: number } {
  const yesEdge = estimatedProbability - marketPrice;
  const noEdge = (1 - estimatedProbability) - (1 - marketPrice);

  if (yesEdge > noEdge && yesEdge > 0) {
    return { yesEdge, noEdge, bestSide: 'YES', bestEdge: yesEdge };
  } else if (noEdge > 0) {
    return { yesEdge, noEdge, bestSide: 'NO', bestEdge: noEdge };
  }

  return { yesEdge, noEdge, bestSide: 'NONE', bestEdge: Math.max(yesEdge, noEdge) };
}

/**
 * Format Kelly recommendation for display
 */
export function formatKellyRecommendation(
  result: KellyResult,
  bankroll?: number
): string {
  if (!result.hasPositiveEdge) {
    return 'No edge - do not bet';
  }

  const pct = (result.recommendedFraction * 100).toFixed(1);
  const edgePct = result.edgePercentage.toFixed(1);

  let str = `${result.recommendedSide}: ${pct}% of bankroll (${edgePct}% edge)`;

  if (bankroll) {
    const amount = (result.recommendedFraction * bankroll).toFixed(2);
    str += ` = $${amount}`;
  }

  if (result.wasCapped) {
    str += ' (capped)';
  }

  return str;
}

/**
 * Get Kelly multiplier description
 */
export function getKellyMultiplierDescription(multiplier: number): string {
  if (multiplier >= 1.0) return 'Full Kelly (aggressive)';
  if (multiplier >= 0.75) return 'Three-quarter Kelly';
  if (multiplier >= 0.5) return 'Half Kelly (recommended)';
  if (multiplier >= 0.25) return 'Quarter Kelly (conservative)';
  return 'Very conservative';
}

/**
 * Suggested Kelly multipliers based on confidence
 */
export const KELLY_MULTIPLIERS = {
  FULL: 1.0,
  THREE_QUARTER: 0.75,
  HALF: 0.5,
  QUARTER: 0.25,
  CONSERVATIVE: 0.1,
} as const;
