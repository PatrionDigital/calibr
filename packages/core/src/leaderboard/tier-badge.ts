/**
 * Tier Badge Module (Phase 6.2)
 * Creates badge data for EAS attestation when tier changes
 */

import { type ForecasterTier } from './types';
import { type TierChangeResult } from './tier-calculator';
import { type SuperforecasterAttestationData } from '../types/eas';

// =============================================================================
// Types
// =============================================================================

export interface CelebrationMetadata {
  shouldCelebrate: boolean;
  tierDelta: number;
  previousTier: ForecasterTier;
}

export interface TierBadgeData {
  tier: ForecasterTier;
  score: number;
  period: number;
  category: string;
  rank: number;
  celebrationMetadata?: CelebrationMetadata;
}

export interface CreateTierBadgeParams {
  tierChange: TierChangeResult;
  compositeScore: number;
  rank: number;
  category: string;
}

// =============================================================================
// Badge Data Creation
// =============================================================================

/**
 * Create tier badge data for attestation
 * Returns null if no tier change occurred
 */
export function createTierBadgeData(params: CreateTierBadgeParams): TierBadgeData | null {
  const { tierChange, compositeScore, rank, category } = params;

  // No attestation needed if tier hasn't changed
  if (!tierChange.changed || !tierChange.requiresAttestation) {
    return null;
  }

  const period = Math.floor(Date.now() / 1000);

  return {
    tier: tierChange.newTier,
    score: compositeScore,
    period,
    category,
    rank,
    celebrationMetadata: {
      shouldCelebrate: tierChange.shouldCelebrate,
      tierDelta: tierChange.delta,
      previousTier: tierChange.previousTier,
    },
  };
}

// =============================================================================
// Attestation Formatting
// =============================================================================

/**
 * Format tier badge data for EAS attestation
 * Strips celebration metadata, returns only on-chain data
 */
export function formatTierBadgeForAttestation(
  badgeData: TierBadgeData
): SuperforecasterAttestationData {
  return {
    tier: badgeData.tier,
    score: badgeData.score,
    period: badgeData.period,
    category: badgeData.category,
    rank: badgeData.rank,
  };
}
