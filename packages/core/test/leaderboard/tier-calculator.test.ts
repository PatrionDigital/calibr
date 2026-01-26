/**
 * Tier Calculator Tests (Phase 6.1)
 * Tests for tier promotion/demotion detection
 * TDD: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest';
import {
  detectTierChange,
  type TierChangeResult,
  getTierIndex,
  calculateTierDelta,
} from '../../src/leaderboard/tier-calculator';
import { type ForecasterTier, FORECASTER_TIERS } from '../../src/leaderboard/types';

// =============================================================================
// Tier Index Tests
// =============================================================================

describe('getTierIndex', () => {
  it('should return correct index for APPRENTICE', () => {
    expect(getTierIndex('APPRENTICE')).toBe(0);
  });

  it('should return correct index for JOURNEYMAN', () => {
    expect(getTierIndex('JOURNEYMAN')).toBe(1);
  });

  it('should return correct index for EXPERT', () => {
    expect(getTierIndex('EXPERT')).toBe(2);
  });

  it('should return correct index for MASTER', () => {
    expect(getTierIndex('MASTER')).toBe(3);
  });

  it('should return correct index for GRANDMASTER', () => {
    expect(getTierIndex('GRANDMASTER')).toBe(4);
  });
});

// =============================================================================
// Tier Delta Tests
// =============================================================================

describe('calculateTierDelta', () => {
  it('should return 0 for same tier', () => {
    expect(calculateTierDelta('JOURNEYMAN', 'JOURNEYMAN')).toBe(0);
  });

  it('should return positive for promotion by 1 tier', () => {
    expect(calculateTierDelta('APPRENTICE', 'JOURNEYMAN')).toBe(1);
  });

  it('should return positive for promotion by multiple tiers', () => {
    expect(calculateTierDelta('APPRENTICE', 'EXPERT')).toBe(2);
    expect(calculateTierDelta('APPRENTICE', 'GRANDMASTER')).toBe(4);
  });

  it('should return negative for demotion by 1 tier', () => {
    expect(calculateTierDelta('JOURNEYMAN', 'APPRENTICE')).toBe(-1);
  });

  it('should return negative for demotion by multiple tiers', () => {
    expect(calculateTierDelta('GRANDMASTER', 'JOURNEYMAN')).toBe(-3);
  });
});

// =============================================================================
// Tier Change Detection Tests
// =============================================================================

describe('detectTierChange', () => {
  describe('no change scenarios', () => {
    it('should return no change when tiers are the same', () => {
      const result = detectTierChange('JOURNEYMAN', 'JOURNEYMAN');

      expect(result.changed).toBe(false);
      expect(result.direction).toBe('none');
      expect(result.previousTier).toBe('JOURNEYMAN');
      expect(result.newTier).toBe('JOURNEYMAN');
      expect(result.delta).toBe(0);
    });

    it('should return no change for APPRENTICE to APPRENTICE', () => {
      const result = detectTierChange('APPRENTICE', 'APPRENTICE');

      expect(result.changed).toBe(false);
      expect(result.direction).toBe('none');
    });

    it('should return no change for GRANDMASTER to GRANDMASTER', () => {
      const result = detectTierChange('GRANDMASTER', 'GRANDMASTER');

      expect(result.changed).toBe(false);
      expect(result.direction).toBe('none');
    });
  });

  describe('promotion scenarios', () => {
    it('should detect single tier promotion', () => {
      const result = detectTierChange('APPRENTICE', 'JOURNEYMAN');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('up');
      expect(result.previousTier).toBe('APPRENTICE');
      expect(result.newTier).toBe('JOURNEYMAN');
      expect(result.delta).toBe(1);
    });

    it('should detect double tier promotion', () => {
      const result = detectTierChange('APPRENTICE', 'EXPERT');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('up');
      expect(result.delta).toBe(2);
    });

    it('should detect promotion to GRANDMASTER', () => {
      const result = detectTierChange('MASTER', 'GRANDMASTER');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('up');
      expect(result.newTier).toBe('GRANDMASTER');
    });

    it('should detect full tier jump from APPRENTICE to GRANDMASTER', () => {
      const result = detectTierChange('APPRENTICE', 'GRANDMASTER');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('up');
      expect(result.delta).toBe(4);
    });
  });

  describe('demotion scenarios', () => {
    it('should detect single tier demotion', () => {
      const result = detectTierChange('JOURNEYMAN', 'APPRENTICE');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('down');
      expect(result.previousTier).toBe('JOURNEYMAN');
      expect(result.newTier).toBe('APPRENTICE');
      expect(result.delta).toBe(-1);
    });

    it('should detect double tier demotion', () => {
      const result = detectTierChange('EXPERT', 'APPRENTICE');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('down');
      expect(result.delta).toBe(-2);
    });

    it('should detect demotion from GRANDMASTER', () => {
      const result = detectTierChange('GRANDMASTER', 'MASTER');

      expect(result.changed).toBe(true);
      expect(result.direction).toBe('down');
      expect(result.previousTier).toBe('GRANDMASTER');
      expect(result.newTier).toBe('MASTER');
    });
  });

  describe('result properties', () => {
    it('should include celebration flag for promotions', () => {
      const result = detectTierChange('APPRENTICE', 'JOURNEYMAN');

      expect(result.shouldCelebrate).toBe(true);
    });

    it('should not include celebration flag for demotions', () => {
      const result = detectTierChange('JOURNEYMAN', 'APPRENTICE');

      expect(result.shouldCelebrate).toBe(false);
    });

    it('should not include celebration flag for no change', () => {
      const result = detectTierChange('JOURNEYMAN', 'JOURNEYMAN');

      expect(result.shouldCelebrate).toBe(false);
    });

    it('should include attestation requirement flag for tier changes', () => {
      const promotion = detectTierChange('APPRENTICE', 'JOURNEYMAN');
      const demotion = detectTierChange('JOURNEYMAN', 'APPRENTICE');
      const noChange = detectTierChange('JOURNEYMAN', 'JOURNEYMAN');

      expect(promotion.requiresAttestation).toBe(true);
      expect(demotion.requiresAttestation).toBe(true);
      expect(noChange.requiresAttestation).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined previous tier as APPRENTICE', () => {
      const result = detectTierChange(null as unknown as ForecasterTier, 'JOURNEYMAN');

      expect(result.changed).toBe(true);
      expect(result.previousTier).toBe('APPRENTICE');
      expect(result.direction).toBe('up');
    });

    it('should handle all tier combinations correctly', () => {
      // Test every possible tier combination
      for (let i = 0; i < FORECASTER_TIERS.length; i++) {
        for (let j = 0; j < FORECASTER_TIERS.length; j++) {
          const previous = FORECASTER_TIERS[i]!;
          const current = FORECASTER_TIERS[j]!;
          const result = detectTierChange(previous, current);

          if (i === j) {
            expect(result.changed).toBe(false);
          } else {
            expect(result.changed).toBe(true);
            expect(result.direction).toBe(j > i ? 'up' : 'down');
          }
        }
      }
    });
  });
});
