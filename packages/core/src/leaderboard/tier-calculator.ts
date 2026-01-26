/**
 * Tier Calculator (Phase 6.1)
 * Detects tier promotions and demotions
 */

import { type ForecasterTier, FORECASTER_TIERS } from './types';

// =============================================================================
// Types
// =============================================================================

export type TierChangeDirection = 'up' | 'down' | 'none';

export interface TierChangeResult {
  changed: boolean;
  direction: TierChangeDirection;
  previousTier: ForecasterTier;
  newTier: ForecasterTier;
  delta: number;
  shouldCelebrate: boolean;
  requiresAttestation: boolean;
}

// =============================================================================
// Tier Index
// =============================================================================

/**
 * Get the numerical index of a tier (0 = APPRENTICE, 4 = GRANDMASTER)
 */
export function getTierIndex(tier: ForecasterTier): number {
  return FORECASTER_TIERS.indexOf(tier);
}

// =============================================================================
// Tier Delta
// =============================================================================

/**
 * Calculate the difference between two tiers
 * Positive = promotion, negative = demotion, zero = no change
 */
export function calculateTierDelta(
  previousTier: ForecasterTier,
  newTier: ForecasterTier
): number {
  return getTierIndex(newTier) - getTierIndex(previousTier);
}

// =============================================================================
// Tier Change Detection
// =============================================================================

/**
 * Detect if a tier change occurred and its characteristics
 */
export function detectTierChange(
  previousTier: ForecasterTier | null | undefined,
  newTier: ForecasterTier
): TierChangeResult {
  // Default to APPRENTICE for null/undefined previous tier
  const safePreviousTier: ForecasterTier = previousTier ?? 'APPRENTICE';

  const delta = calculateTierDelta(safePreviousTier, newTier);
  const changed = delta !== 0;

  let direction: TierChangeDirection = 'none';
  if (delta > 0) {
    direction = 'up';
  } else if (delta < 0) {
    direction = 'down';
  }

  return {
    changed,
    direction,
    previousTier: safePreviousTier,
    newTier,
    delta,
    shouldCelebrate: direction === 'up',
    requiresAttestation: changed,
  };
}
