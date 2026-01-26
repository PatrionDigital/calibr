/**
 * Tier Badge Tests (Phase 6.2)
 * Tests for EAS badge attestation when tier changes
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTierBadgeData,
  formatTierBadgeForAttestation,
  type TierBadgeData,
} from '../../src/leaderboard/tier-badge';
import { type ForecasterTier } from '../../src/leaderboard/types';
import { type TierChangeResult } from '../../src/leaderboard/tier-calculator';

// =============================================================================
// Create Badge Data Tests
// =============================================================================

describe('createTierBadgeData', () => {
  const mockTierChange: TierChangeResult = {
    changed: true,
    direction: 'up',
    previousTier: 'APPRENTICE',
    newTier: 'JOURNEYMAN',
    delta: 1,
    shouldCelebrate: true,
    requiresAttestation: true,
  };

  it('should create badge data with correct tier', () => {
    const result = createTierBadgeData({
      tierChange: mockTierChange,
      compositeScore: 250,
      rank: 42,
      category: 'OVERALL',
    });

    expect(result.tier).toBe('JOURNEYMAN');
    expect(result.score).toBe(250);
    expect(result.rank).toBe(42);
    expect(result.category).toBe('OVERALL');
  });

  it('should include period timestamp', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = createTierBadgeData({
      tierChange: mockTierChange,
      compositeScore: 250,
      rank: 42,
      category: 'OVERALL',
    });
    const after = Math.floor(Date.now() / 1000);

    expect(result.period).toBeGreaterThanOrEqual(before);
    expect(result.period).toBeLessThanOrEqual(after);
  });

  it('should return null when tier has not changed', () => {
    const noChange: TierChangeResult = {
      changed: false,
      direction: 'none',
      previousTier: 'JOURNEYMAN',
      newTier: 'JOURNEYMAN',
      delta: 0,
      shouldCelebrate: false,
      requiresAttestation: false,
    };

    const result = createTierBadgeData({
      tierChange: noChange,
      compositeScore: 250,
      rank: 42,
      category: 'OVERALL',
    });

    expect(result).toBeNull();
  });

  it('should include celebration metadata for promotions', () => {
    const result = createTierBadgeData({
      tierChange: mockTierChange,
      compositeScore: 250,
      rank: 42,
      category: 'OVERALL',
    });

    expect(result?.celebrationMetadata).toBeDefined();
    expect(result?.celebrationMetadata?.shouldCelebrate).toBe(true);
    expect(result?.celebrationMetadata?.tierDelta).toBe(1);
    expect(result?.celebrationMetadata?.previousTier).toBe('APPRENTICE');
  });

  it('should not include celebration metadata for demotions', () => {
    const demotion: TierChangeResult = {
      changed: true,
      direction: 'down',
      previousTier: 'JOURNEYMAN',
      newTier: 'APPRENTICE',
      delta: -1,
      shouldCelebrate: false,
      requiresAttestation: true,
    };

    const result = createTierBadgeData({
      tierChange: demotion,
      compositeScore: 150,
      rank: 100,
      category: 'OVERALL',
    });

    expect(result?.celebrationMetadata?.shouldCelebrate).toBe(false);
  });

  it('should handle GRANDMASTER tier correctly', () => {
    const grandmasterPromotion: TierChangeResult = {
      changed: true,
      direction: 'up',
      previousTier: 'MASTER',
      newTier: 'GRANDMASTER',
      delta: 1,
      shouldCelebrate: true,
      requiresAttestation: true,
    };

    const result = createTierBadgeData({
      tierChange: grandmasterPromotion,
      compositeScore: 900,
      rank: 1,
      category: 'OVERALL',
    });

    expect(result?.tier).toBe('GRANDMASTER');
    expect(result?.celebrationMetadata?.shouldCelebrate).toBe(true);
  });
});

// =============================================================================
// Format for Attestation Tests
// =============================================================================

describe('formatTierBadgeForAttestation', () => {
  const mockBadgeData: TierBadgeData = {
    tier: 'EXPERT',
    score: 550,
    period: 1706540400,
    category: 'OVERALL',
    rank: 25,
    celebrationMetadata: {
      shouldCelebrate: true,
      tierDelta: 1,
      previousTier: 'JOURNEYMAN',
    },
  };

  it('should format badge data for SuperforecasterAttestationData', () => {
    const result = formatTierBadgeForAttestation(mockBadgeData);

    expect(result.tier).toBe('EXPERT');
    expect(result.score).toBe(550);
    expect(result.period).toBe(1706540400);
    expect(result.category).toBe('OVERALL');
    expect(result.rank).toBe(25);
  });

  it('should not include celebration metadata in attestation data', () => {
    const result = formatTierBadgeForAttestation(mockBadgeData);

    // Attestation data should only have the schema fields
    const keys = Object.keys(result);
    expect(keys).toContain('tier');
    expect(keys).toContain('score');
    expect(keys).toContain('period');
    expect(keys).toContain('category');
    expect(keys).toContain('rank');
    expect(keys).not.toContain('celebrationMetadata');
  });

  it('should handle all tier values', () => {
    const tiers: ForecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

    tiers.forEach((tier) => {
      const badgeData: TierBadgeData = {
        ...mockBadgeData,
        tier,
      };

      const result = formatTierBadgeForAttestation(badgeData);
      expect(result.tier).toBe(tier);
    });
  });

  it('should handle zero values correctly', () => {
    const zeroData: TierBadgeData = {
      tier: 'APPRENTICE',
      score: 0,
      period: 0,
      category: 'OVERALL',
      rank: 0,
      celebrationMetadata: {
        shouldCelebrate: false,
        tierDelta: 0,
        previousTier: 'APPRENTICE',
      },
    };

    const result = formatTierBadgeForAttestation(zeroData);

    expect(result.score).toBe(0);
    expect(result.period).toBe(0);
    expect(result.rank).toBe(0);
  });
});
