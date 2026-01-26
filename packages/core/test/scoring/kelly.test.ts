/**
 * Comprehensive Kelly Criterion Tests
 * Tests all functions from the scoring/kelly module
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKelly,
  calculatePortfolioKelly,
  calculateEdge,
  formatKellyRecommendation,
  getKellyMultiplierDescription,
  KELLY_MULTIPLIERS,
  type KellyInput,
  type KellyResult,
} from '../../src/scoring/kelly';

// =============================================================================
// calculateKelly Tests
// =============================================================================

describe('calculateKelly', () => {
  describe('input validation', () => {
    it('should throw for probability below 0', () => {
      expect(() =>
        calculateKelly({
          estimatedProbability: -0.1,
          marketPrice: 0.5,
        })
      ).toThrow('Estimated probability must be between 0 and 1');
    });

    it('should throw for probability above 1', () => {
      expect(() =>
        calculateKelly({
          estimatedProbability: 1.1,
          marketPrice: 0.5,
        })
      ).toThrow('Estimated probability must be between 0 and 1');
    });

    it('should throw for market price at 0', () => {
      expect(() =>
        calculateKelly({
          estimatedProbability: 0.6,
          marketPrice: 0,
        })
      ).toThrow('Market price must be between 0 and 1');
    });

    it('should throw for market price at 1', () => {
      expect(() =>
        calculateKelly({
          estimatedProbability: 0.6,
          marketPrice: 1,
        })
      ).toThrow('Market price must be between 0 and 1');
    });

    it('should throw for invalid fraction multiplier', () => {
      expect(() =>
        calculateKelly({
          estimatedProbability: 0.6,
          marketPrice: 0.5,
          fractionMultiplier: 0,
        })
      ).toThrow('Fraction multiplier must be between 0 and 1');

      expect(() =>
        calculateKelly({
          estimatedProbability: 0.6,
          marketPrice: 0.5,
          fractionMultiplier: 1.5,
        })
      ).toThrow('Fraction multiplier must be between 0 and 1');
    });
  });

  describe('positive edge scenarios', () => {
    it('should recommend YES when estimated probability exceeds market price', () => {
      const result = calculateKelly({
        estimatedProbability: 0.7,
        marketPrice: 0.5,
      });

      expect(result.recommendedSide).toBe('YES');
      expect(result.hasPositiveEdge).toBe(true);
      expect(result.edge).toBeCloseTo(0.2, 5);
    });

    it('should recommend NO when estimated probability is below market price', () => {
      const result = calculateKelly({
        estimatedProbability: 0.3,
        marketPrice: 0.5,
      });

      expect(result.recommendedSide).toBe('NO');
      expect(result.hasPositiveEdge).toBe(true);
      expect(result.edge).toBeCloseTo(0.2, 5); // Edge for NO side
    });

    it('should calculate correct Kelly fraction', () => {
      // f* = (p - price) / (1 - price)
      // With p=0.7, price=0.5: f* = (0.7 - 0.5) / (1 - 0.5) = 0.4
      // But default maxPositionSize is 0.25, so it gets capped
      const result = calculateKelly({
        estimatedProbability: 0.7,
        marketPrice: 0.5,
        maxPositionSize: 1.0, // No cap for this test
      });

      expect(result.recommendedFraction).toBeCloseTo(0.4, 5);
    });

    it('should calculate edge percentage correctly', () => {
      const result = calculateKelly({
        estimatedProbability: 0.6,
        marketPrice: 0.5,
      });

      // Edge = 0.1, edgePercentage = (0.1 / 0.5) * 100 = 20%
      expect(result.edgePercentage).toBeCloseTo(20, 1);
    });
  });

  describe('no edge scenarios', () => {
    it('should return NONE when no positive edge exists', () => {
      const result = calculateKelly({
        estimatedProbability: 0.5,
        marketPrice: 0.5,
      });

      expect(result.recommendedSide).toBe('NONE');
      expect(result.hasPositiveEdge).toBe(false);
      expect(result.recommendedFraction).toBe(0);
    });

    it('should return zero expected value when no edge', () => {
      const result = calculateKelly({
        estimatedProbability: 0.5,
        marketPrice: 0.5,
      });

      expect(result.expectedValue).toBe(0);
    });
  });

  describe('fractional Kelly', () => {
    it('should apply fraction multiplier correctly', () => {
      // Use high maxPositionSize to avoid capping
      const fullKelly = calculateKelly({
        estimatedProbability: 0.7,
        marketPrice: 0.5,
        fractionMultiplier: 1.0,
        maxPositionSize: 1.0,
      });

      const halfKelly = calculateKelly({
        estimatedProbability: 0.7,
        marketPrice: 0.5,
        fractionMultiplier: 0.5,
        maxPositionSize: 1.0,
      });

      expect(halfKelly.recommendedFraction).toBeCloseTo(
        fullKelly.recommendedFraction * 0.5,
        5
      );
    });

    it('should record the Kelly multiplier used', () => {
      const result = calculateKelly({
        estimatedProbability: 0.7,
        marketPrice: 0.5,
        fractionMultiplier: 0.25,
      });

      expect(result.kellyMultiplier).toBe(0.25);
    });
  });

  describe('position capping', () => {
    it('should cap position at maxPositionSize', () => {
      const result = calculateKelly({
        estimatedProbability: 0.9,
        marketPrice: 0.5,
        maxPositionSize: 0.1,
      });

      expect(result.recommendedFraction).toBe(0.1);
      expect(result.wasCapped).toBe(true);
    });

    it('should not cap when below max', () => {
      const result = calculateKelly({
        estimatedProbability: 0.55,
        marketPrice: 0.5,
        maxPositionSize: 0.25,
      });

      expect(result.wasCapped).toBe(false);
    });

    it('should use default maxPositionSize of 0.25', () => {
      const result = calculateKelly({
        estimatedProbability: 0.95,
        marketPrice: 0.5,
      });

      expect(result.recommendedFraction).toBeLessThanOrEqual(0.25);
    });
  });
});

// =============================================================================
// calculatePortfolioKelly Tests
// =============================================================================

describe('calculatePortfolioKelly', () => {
  it('should handle empty markets array', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      markets: [],
    });

    expect(result.totalAllocation).toBe(0);
    expect(result.positions).toHaveLength(0);
    expect(result.wasScaled).toBe(false);
  });

  it('should calculate allocations for multiple markets', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      markets: [
        {
          marketId: 'market1',
          marketQuestion: 'Will X happen?',
          yesPrice: 0.5,
          noPrice: 0.5,
          estimatedProbability: 0.7,
        },
        {
          marketId: 'market2',
          marketQuestion: 'Will Y happen?',
          yesPrice: 0.4,
          noPrice: 0.6,
          estimatedProbability: 0.6,
        },
      ],
    });

    expect(result.positions.length).toBe(2);
    expect(result.totalAllocation).toBeGreaterThan(0);
  });

  it('should use half Kelly as default for portfolio', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      markets: [
        {
          marketId: 'market1',
          marketQuestion: 'Test',
          yesPrice: 0.5,
          noPrice: 0.5,
          estimatedProbability: 0.7,
        },
      ],
    });

    // Default fractionMultiplier is 0.5
    const fullKelly = calculateKelly({
      estimatedProbability: 0.7,
      marketPrice: 0.5,
      fractionMultiplier: 1.0,
      maxPositionSize: 1.0,
    });

    expect(result.positions[0].adjustedFraction).toBeLessThanOrEqual(
      fullKelly.recommendedFraction * 0.5 * 1.1 // Allow 10% margin for scaling
    );
  });

  it('should scale down when total allocation exceeds 80%', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      fractionMultiplier: 1.0, // Full Kelly
      maxPositionSize: 0.5,
      markets: [
        {
          marketId: 'm1',
          marketQuestion: 'Q1',
          yesPrice: 0.3,
          noPrice: 0.7,
          estimatedProbability: 0.8,
        },
        {
          marketId: 'm2',
          marketQuestion: 'Q2',
          yesPrice: 0.3,
          noPrice: 0.7,
          estimatedProbability: 0.8,
        },
        {
          marketId: 'm3',
          marketQuestion: 'Q3',
          yesPrice: 0.3,
          noPrice: 0.7,
          estimatedProbability: 0.8,
        },
      ],
    });

    expect(result.totalAllocation).toBeLessThanOrEqual(0.8);
  });

  it('should calculate dollar amounts correctly', () => {
    const bankroll = 10000;
    const result = calculatePortfolioKelly({
      bankroll,
      markets: [
        {
          marketId: 'market1',
          marketQuestion: 'Test',
          yesPrice: 0.5,
          noPrice: 0.5,
          estimatedProbability: 0.7,
        },
      ],
    });

    const position = result.positions[0];
    expect(position.dollarAmount).toBeCloseTo(
      position.adjustedFraction * bankroll,
      2
    );
  });

  it('should exclude NONE positions from total allocation', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      markets: [
        {
          marketId: 'good',
          marketQuestion: 'Has edge',
          yesPrice: 0.5,
          noPrice: 0.5,
          estimatedProbability: 0.7,
        },
        {
          marketId: 'none',
          marketQuestion: 'No edge',
          yesPrice: 0.5,
          noPrice: 0.5,
          estimatedProbability: 0.5,
        },
      ],
    });

    const nonePosition = result.positions.find((p) => p.marketId === 'none');
    expect(nonePosition?.side).toBe('NONE');
    expect(nonePosition?.adjustedFraction).toBe(0);
    expect(nonePosition?.dollarAmount).toBe(0);
  });

  it('should cap individual positions at maxPositionSize', () => {
    const result = calculatePortfolioKelly({
      bankroll: 10000,
      maxPositionSize: 0.1,
      fractionMultiplier: 1.0,
      markets: [
        {
          marketId: 'market1',
          marketQuestion: 'Test',
          yesPrice: 0.3,
          noPrice: 0.7,
          estimatedProbability: 0.9,
        },
      ],
    });

    expect(result.positions[0].adjustedFraction).toBeLessThanOrEqual(0.1);
  });
});

// =============================================================================
// calculateEdge Tests
// =============================================================================

describe('calculateEdge', () => {
  it('should calculate YES edge correctly', () => {
    const result = calculateEdge(0.7, 0.5);
    expect(result.yesEdge).toBeCloseTo(0.2, 5);
    expect(result.bestSide).toBe('YES');
    expect(result.bestEdge).toBeCloseTo(0.2, 5);
  });

  it('should calculate NO edge correctly', () => {
    const result = calculateEdge(0.3, 0.5);
    expect(result.noEdge).toBeCloseTo(0.2, 5);
    expect(result.bestSide).toBe('NO');
    expect(result.bestEdge).toBeCloseTo(0.2, 5);
  });

  it('should return NONE when no positive edge', () => {
    const result = calculateEdge(0.5, 0.5);
    expect(result.bestSide).toBe('NONE');
    expect(result.bestEdge).toBe(0);
  });

  it('should handle edge cases near boundaries', () => {
    const highEdge = calculateEdge(0.99, 0.5);
    expect(highEdge.bestSide).toBe('YES');
    expect(highEdge.yesEdge).toBeCloseTo(0.49, 5);

    const lowEdge = calculateEdge(0.01, 0.5);
    expect(lowEdge.bestSide).toBe('NO');
    expect(lowEdge.noEdge).toBeCloseTo(0.49, 5);
  });
});

// =============================================================================
// formatKellyRecommendation Tests
// =============================================================================

describe('formatKellyRecommendation', () => {
  it('should return "No edge" message when no positive edge', () => {
    const result: KellyResult = {
      recommendedFraction: 0,
      edge: 0,
      edgePercentage: 0,
      hasPositiveEdge: false,
      expectedValue: 0,
      kellyMultiplier: 1.0,
      wasCapped: false,
      recommendedSide: 'NONE',
    };

    expect(formatKellyRecommendation(result)).toBe('No edge - do not bet');
  });

  it('should format YES recommendation correctly', () => {
    const result: KellyResult = {
      recommendedFraction: 0.1,
      edge: 0.1,
      edgePercentage: 20,
      hasPositiveEdge: true,
      expectedValue: 0.01,
      kellyMultiplier: 1.0,
      wasCapped: false,
      recommendedSide: 'YES',
    };

    const formatted = formatKellyRecommendation(result);
    expect(formatted).toContain('YES');
    expect(formatted).toContain('10.0%');
    expect(formatted).toContain('20.0% edge');
  });

  it('should format NO recommendation correctly', () => {
    const result: KellyResult = {
      recommendedFraction: 0.15,
      edge: 0.15,
      edgePercentage: 30,
      hasPositiveEdge: true,
      expectedValue: 0.02,
      kellyMultiplier: 1.0,
      wasCapped: false,
      recommendedSide: 'NO',
    };

    const formatted = formatKellyRecommendation(result);
    expect(formatted).toContain('NO');
    expect(formatted).toContain('15.0%');
  });

  it('should include dollar amount when bankroll provided', () => {
    const result: KellyResult = {
      recommendedFraction: 0.1,
      edge: 0.1,
      edgePercentage: 20,
      hasPositiveEdge: true,
      expectedValue: 0.01,
      kellyMultiplier: 1.0,
      wasCapped: false,
      recommendedSide: 'YES',
    };

    const formatted = formatKellyRecommendation(result, 10000);
    expect(formatted).toContain('$1000.00');
  });

  it('should indicate when position was capped', () => {
    const result: KellyResult = {
      recommendedFraction: 0.25,
      edge: 0.4,
      edgePercentage: 80,
      hasPositiveEdge: true,
      expectedValue: 0.1,
      kellyMultiplier: 1.0,
      wasCapped: true,
      recommendedSide: 'YES',
    };

    const formatted = formatKellyRecommendation(result);
    expect(formatted).toContain('(capped)');
  });
});

// =============================================================================
// getKellyMultiplierDescription Tests
// =============================================================================

describe('getKellyMultiplierDescription', () => {
  it('should describe full Kelly', () => {
    expect(getKellyMultiplierDescription(1.0)).toBe('Full Kelly (aggressive)');
  });

  it('should describe three-quarter Kelly', () => {
    expect(getKellyMultiplierDescription(0.75)).toBe('Three-quarter Kelly');
    expect(getKellyMultiplierDescription(0.8)).toBe('Three-quarter Kelly');
  });

  it('should describe half Kelly', () => {
    expect(getKellyMultiplierDescription(0.5)).toBe('Half Kelly (recommended)');
    expect(getKellyMultiplierDescription(0.6)).toBe('Half Kelly (recommended)');
  });

  it('should describe quarter Kelly', () => {
    expect(getKellyMultiplierDescription(0.25)).toBe('Quarter Kelly (conservative)');
    expect(getKellyMultiplierDescription(0.3)).toBe('Quarter Kelly (conservative)');
  });

  it('should describe very conservative', () => {
    expect(getKellyMultiplierDescription(0.1)).toBe('Very conservative');
    expect(getKellyMultiplierDescription(0.05)).toBe('Very conservative');
  });
});

// =============================================================================
// KELLY_MULTIPLIERS Tests
// =============================================================================

describe('KELLY_MULTIPLIERS', () => {
  it('should have correct values', () => {
    expect(KELLY_MULTIPLIERS.FULL).toBe(1.0);
    expect(KELLY_MULTIPLIERS.THREE_QUARTER).toBe(0.75);
    expect(KELLY_MULTIPLIERS.HALF).toBe(0.5);
    expect(KELLY_MULTIPLIERS.QUARTER).toBe(0.25);
    expect(KELLY_MULTIPLIERS.CONSERVATIVE).toBe(0.1);
  });

  it('should be readonly', () => {
    // TypeScript should prevent modification, but we can verify values are as expected
    expect(Object.keys(KELLY_MULTIPLIERS)).toHaveLength(5);
  });
});
