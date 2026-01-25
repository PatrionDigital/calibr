/**
 * Leaderboard Ranking
 * Functions for ranking, filtering, and organizing forecaster leaderboards
 */

import {
  type LeaderboardEntry,
  type LeaderboardFilter,
  type LeaderboardCategory,
  type LeaderboardRanking,
  type PrivacyFilterOptions,
} from './types';

// =============================================================================
// Ranking Functions
// =============================================================================

/**
 * Rank forecasters by composite score
 * Uses existing compositeScore on entries, assigns rank numbers
 * Ties are broken by earlier join date
 */
export function rankForecasters(forecasters: LeaderboardEntry[]): LeaderboardEntry[] {
  // Sort by composite score descending, then by join date ascending (earlier = better)
  const sorted = [...forecasters].sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    // Tie-breaker: earlier join date ranks higher
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });

  // Assign ranks (handling ties - same score gets same rank)
  let currentRank = 1;
  let previousScore = -1;

  return sorted.map((entry, index) => {
    if (entry.compositeScore !== previousScore) {
      currentRank = index + 1;
    }

    previousScore = entry.compositeScore;

    return {
      ...entry,
      previousRank: entry.rank !== 0 ? entry.rank : null,
      rank: currentRank,
    };
  });
}

// =============================================================================
// Filtering Functions
// =============================================================================

/**
 * Filter leaderboard entries based on criteria
 */
export function filterLeaderboard(
  forecasters: LeaderboardEntry[],
  filter: LeaderboardFilter
): LeaderboardEntry[] {
  return forecasters.filter((entry) => {
    // Tier filter
    if (filter.tier && entry.tier !== filter.tier) {
      return false;
    }

    // Minimum forecasts filter
    if (filter.minForecasts !== undefined && entry.resolvedForecasts < filter.minForecasts) {
      return false;
    }

    // Minimum score filter
    if (filter.minScore !== undefined && entry.compositeScore < filter.minScore) {
      return false;
    }

    // Active since filter
    if (filter.activeSince && entry.lastForecastAt < filter.activeSince) {
      return false;
    }

    // Platform filter - check if user has verified reputation on platform
    if (filter.platform) {
      const hasVerifiedPlatform = entry.externalReputations.some(
        (rep) => rep.platform === filter.platform && rep.verified
      );
      if (!hasVerifiedPlatform) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get leaderboard for a specific category
 * Categories can filter by platform or topic
 */
export function getLeaderboardByCategory(
  forecasters: LeaderboardEntry[],
  category: LeaderboardCategory
): LeaderboardRanking {
  let filtered: LeaderboardEntry[];

  switch (category) {
    case 'POLYMARKET':
      filtered = forecasters.filter((entry) =>
        entry.externalReputations.some((rep) => rep.platform === 'POLYMARKET' && rep.verified)
      );
      break;

    case 'LIMITLESS':
      filtered = forecasters.filter((entry) =>
        entry.externalReputations.some((rep) => rep.platform === 'LIMITLESS' && rep.verified)
      );
      break;

    case 'OVERALL':
    default:
      filtered = [...forecasters];
      break;

    // Note: CRYPTO, POLITICS, SPORTS categories would need market-level tagging
    // For now, they return all forecasters
    case 'CRYPTO':
    case 'POLITICS':
    case 'SPORTS':
      filtered = [...forecasters];
      break;
  }

  // Rank the filtered entries
  const ranked = rankForecasters(filtered);

  return {
    category,
    entries: ranked,
    totalCount: ranked.length,
    updatedAt: new Date(),
  };
}

// =============================================================================
// Privacy Functions
// =============================================================================

/**
 * Apply privacy filter to leaderboard entries
 * Hides private profiles unless specifically included
 * When includeAnonymous is true, private entries are included but anonymized
 */
export function applyPrivacyFilter(
  forecasters: LeaderboardEntry[],
  options: PrivacyFilterOptions = {}
): LeaderboardEntry[] {
  const { includeAnonymous = false } = options;

  if (includeAnonymous) {
    // Include all entries but anonymize private ones
    return forecasters.map((entry) => {
      if (!entry.isPrivate) {
        return entry;
      }
      // Mask private profile data
      return {
        ...entry,
        displayName: 'Anonymous Forecaster',
        ensName: null,
      };
    });
  }

  // Filter out private entries entirely
  return forecasters.filter((entry) => !entry.isPrivate);
}

/**
 * Mask private entries for public display
 * Returns entries with masked personal information
 */
export function maskPrivateEntries(forecasters: LeaderboardEntry[]): LeaderboardEntry[] {
  return forecasters.map((entry) => {
    if (!entry.isPrivate) {
      return entry;
    }

    // Mask private profile data
    return {
      ...entry,
      displayName: 'Anonymous Forecaster',
      ensName: null,
      // Keep address but show only partial
      address: `0x${'*'.repeat(36)}${entry.address.slice(-4)}` as `0x${string}`,
      // Keep stats visible for rankings
    };
  });
}

// =============================================================================
// Leaderboard Updates
// =============================================================================

/**
 * Calculate rank changes between two snapshots
 */
export function calculateRankChanges(
  current: LeaderboardEntry[],
  previous: LeaderboardEntry[]
): Map<`0x${string}`, number> {
  const previousRanks = new Map<`0x${string}`, number>();
  previous.forEach((entry) => {
    previousRanks.set(entry.address, entry.rank);
  });

  const changes = new Map<`0x${string}`, number>();
  current.forEach((entry) => {
    const prevRank = previousRanks.get(entry.address);
    if (prevRank !== undefined) {
      // Positive = improved (went up in rankings)
      changes.set(entry.address, prevRank - entry.rank);
    }
  });

  return changes;
}

/**
 * Get top N forecasters
 */
export function getTopForecasters(
  forecasters: LeaderboardEntry[],
  count: number
): LeaderboardEntry[] {
  const ranked = rankForecasters(forecasters);
  return ranked.slice(0, count);
}

/**
 * Find forecaster's position in leaderboard
 */
export function findForecasterPosition(
  forecasters: LeaderboardEntry[],
  address: `0x${string}`
): { entry: LeaderboardEntry; rank: number; percentile: number } | null {
  const ranked = rankForecasters(forecasters);
  const entry = ranked.find((e) => e.address.toLowerCase() === address.toLowerCase());

  if (!entry) {
    return null;
  }

  const percentile = ((ranked.length - entry.rank + 1) / ranked.length) * 100;

  return {
    entry,
    rank: entry.rank,
    percentile,
  };
}
