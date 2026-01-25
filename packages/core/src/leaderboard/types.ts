/**
 * Leaderboard Types
 * Type definitions for the superforecaster leaderboard system
 */

// =============================================================================
// Tier System
// =============================================================================

export const FORECASTER_TIERS = [
  'APPRENTICE',
  'JOURNEYMAN',
  'EXPERT',
  'MASTER',
  'GRANDMASTER',
] as const;

export type ForecasterTier = (typeof FORECASTER_TIERS)[number];

export const TIER_THRESHOLDS: Record<ForecasterTier, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 200,
  EXPERT: 400,
  MASTER: 600,
  GRANDMASTER: 800,
};

// =============================================================================
// Reputation Sources
// =============================================================================

export const REPUTATION_PLATFORMS = [
  'CALIBR',
  'POLYMARKET',
  'LIMITLESS',
  'GITCOIN_PASSPORT',
  'COINBASE_VERIFICATION',
  'OPTIMISM_COLLECTIVE',
] as const;

export type ReputationPlatform = (typeof REPUTATION_PLATFORMS)[number];

export interface ReputationSource {
  platform: ReputationPlatform;
  score: number;
  lastUpdated: Date;
  verified: boolean;
}

export const REPUTATION_WEIGHTS: Record<ReputationPlatform, number> = {
  CALIBR: 0.40,
  POLYMARKET: 0.20,
  LIMITLESS: 0.15,
  GITCOIN_PASSPORT: 0.10,
  COINBASE_VERIFICATION: 0.10,
  OPTIMISM_COLLECTIVE: 0.05,
};

// =============================================================================
// Achievements
// =============================================================================

export type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  unlockedAt: Date | null;
  progress: number;
  maxProgress: number;
}

// =============================================================================
// Leaderboard Entry
// =============================================================================

export interface LeaderboardEntry {
  // Identity
  address: `0x${string}`;
  ensName: string | null;
  displayName: string;

  // Forecasting metrics
  brierScore: number;
  calibrationScore: number;
  totalForecasts: number;
  resolvedForecasts: number;
  accuracy: number;

  // Engagement
  streakDays: number;
  joinedAt: Date;
  lastForecastAt: Date;

  // Tier & Ranking
  tier: ForecasterTier;
  tierProgress: number;
  compositeScore: number;
  rank: number;
  previousRank: number | null;

  // Privacy
  isPrivate: boolean;

  // External reputation
  externalReputations: ReputationSource[];

  // Achievements
  achievements: Achievement[];
}

// =============================================================================
// Composite Score
// =============================================================================

export interface CompositeScore {
  baseScore: number;
  brierComponent: number;
  calibrationComponent: number;
  volumeBonus: number;
  streakBonus: number;
  reputationBonus: number;
  total: number;
}

// =============================================================================
// Leaderboard Categories & Filtering
// =============================================================================

export type LeaderboardCategory =
  | 'OVERALL'
  | 'POLYMARKET'
  | 'LIMITLESS'
  | 'CRYPTO'
  | 'POLITICS'
  | 'SPORTS';

export interface LeaderboardFilter {
  tier?: ForecasterTier;
  minForecasts?: number;
  minScore?: number;
  activeSince?: Date;
  category?: LeaderboardCategory;
  platform?: ReputationPlatform;
}

export interface LeaderboardRanking {
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  totalCount: number;
  updatedAt: Date;
}

// =============================================================================
// Privacy Options
// =============================================================================

export interface PrivacyFilterOptions {
  includeAnonymous?: boolean;
}
