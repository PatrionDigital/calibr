/**
 * Tests for Leaderboard Ranking Functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  rankForecasters,
  filterLeaderboard,
  getLeaderboardByCategory,
  applyPrivacyFilter,
  maskPrivateEntries,
  calculateRankChanges,
  getTopForecasters,
  findForecasterPosition,
} from '../../src/leaderboard/ranking';
import type { LeaderboardEntry, LeaderboardFilter } from '../../src/leaderboard/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    ensName: null,
    displayName: 'Test Forecaster',
    brierScore: 0.25,
    calibrationScore: 0.85,
    totalForecasts: 100,
    resolvedForecasts: 50,
    accuracy: 0.75,
    streakDays: 10,
    joinedAt: new Date('2024-01-01'),
    lastForecastAt: new Date('2024-06-01'),
    tier: 'JOURNEYMAN',
    tierProgress: 50,
    compositeScore: 500,
    rank: 0,
    previousRank: null,
    isPrivate: false,
    externalReputations: [],
    achievements: [],
    ...overrides,
  };
}

// =============================================================================
// rankForecasters Tests
// =============================================================================

describe('rankForecasters', () => {
  it('should rank forecasters by composite score descending', () => {
    const forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 300 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', compositeScore: 500 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', compositeScore: 400 }),
    ];

    const ranked = rankForecasters(forecasters);

    expect(ranked[0].address).toBe('0x0000000000000000000000000000000000000002');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].address).toBe('0x0000000000000000000000000000000000000003');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].address).toBe('0x0000000000000000000000000000000000000001');
    expect(ranked[2].rank).toBe(3);
  });

  it('should break ties by earlier join date', () => {
    const forecasters = [
      createMockEntry({
        address: '0x0000000000000000000000000000000000000001',
        compositeScore: 500,
        joinedAt: new Date('2024-03-01'),
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000002',
        compositeScore: 500,
        joinedAt: new Date('2024-01-01'), // Earlier = better
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000003',
        compositeScore: 500,
        joinedAt: new Date('2024-02-01'),
      }),
    ];

    const ranked = rankForecasters(forecasters);

    // Same score should get same rank
    expect(ranked[0].address).toBe('0x0000000000000000000000000000000000000002'); // Earliest
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].address).toBe('0x0000000000000000000000000000000000000003');
    expect(ranked[1].rank).toBe(1); // Same score = same rank
    expect(ranked[2].address).toBe('0x0000000000000000000000000000000000000001'); // Latest
    expect(ranked[2].rank).toBe(1); // Same score = same rank
  });

  it('should assign same rank to equal scores', () => {
    const forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 600 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', compositeScore: 500 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', compositeScore: 500 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000004', compositeScore: 400 }),
    ];

    const ranked = rankForecasters(forecasters);

    expect(ranked[0].rank).toBe(1); // 600
    expect(ranked[1].rank).toBe(2); // 500
    expect(ranked[2].rank).toBe(2); // 500 (tied)
    expect(ranked[3].rank).toBe(4); // 400 (skips rank 3)
  });

  it('should preserve previous rank if entry had a rank', () => {
    const forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 500, rank: 5 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', compositeScore: 400, rank: 3 }),
    ];

    const ranked = rankForecasters(forecasters);

    expect(ranked[0].previousRank).toBe(5);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].previousRank).toBe(3);
    expect(ranked[1].rank).toBe(2);
  });

  it('should set previousRank to null if entry had rank 0', () => {
    const forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 500, rank: 0 }),
    ];

    const ranked = rankForecasters(forecasters);

    expect(ranked[0].previousRank).toBe(null);
  });

  it('should handle empty array', () => {
    const ranked = rankForecasters([]);
    expect(ranked).toEqual([]);
  });

  it('should handle single entry', () => {
    const forecasters = [createMockEntry({ compositeScore: 100 })];
    const ranked = rankForecasters(forecasters);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank).toBe(1);
  });
});

// =============================================================================
// filterLeaderboard Tests
// =============================================================================

describe('filterLeaderboard', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({
        address: '0x0000000000000000000000000000000000000001',
        tier: 'EXPERT',
        resolvedForecasts: 100,
        compositeScore: 600,
        lastForecastAt: new Date('2024-06-01'),
        externalReputations: [{ platform: 'POLYMARKET', score: 80, verified: true, lastUpdated: new Date() }],
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000002',
        tier: 'JOURNEYMAN',
        resolvedForecasts: 30,
        compositeScore: 400,
        lastForecastAt: new Date('2024-03-01'),
        externalReputations: [{ platform: 'LIMITLESS', score: 60, verified: true, lastUpdated: new Date() }],
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000003',
        tier: 'APPRENTICE',
        resolvedForecasts: 10,
        compositeScore: 200,
        lastForecastAt: new Date('2024-01-01'),
        externalReputations: [],
      }),
    ];
  });

  it('should filter by tier', () => {
    const filter: LeaderboardFilter = { tier: 'EXPERT' };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].tier).toBe('EXPERT');
  });

  it('should filter by minimum forecasts', () => {
    const filter: LeaderboardFilter = { minForecasts: 50 };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].resolvedForecasts).toBeGreaterThanOrEqual(50);
  });

  it('should filter by minimum score', () => {
    const filter: LeaderboardFilter = { minScore: 500 };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].compositeScore).toBeGreaterThanOrEqual(500);
  });

  it('should filter by active since date', () => {
    const filter: LeaderboardFilter = { activeSince: new Date('2024-05-01') };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].lastForecastAt >= new Date('2024-05-01')).toBe(true);
  });

  it('should filter by platform with verified reputation', () => {
    const filter: LeaderboardFilter = { platform: 'POLYMARKET' };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].externalReputations[0]?.platform).toBe('POLYMARKET');
  });

  it('should not include unverified platform reputations', () => {
    forecasters[0].externalReputations = [
      { platform: 'POLYMARKET', score: 80, verified: false, lastUpdated: new Date() },
    ];
    const filter: LeaderboardFilter = { platform: 'POLYMARKET' };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(0);
  });

  it('should apply multiple filters together', () => {
    const filter: LeaderboardFilter = {
      tier: 'EXPERT',
      minForecasts: 50,
      minScore: 500,
    };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].tier).toBe('EXPERT');
    expect(filtered[0].resolvedForecasts).toBeGreaterThanOrEqual(50);
    expect(filtered[0].compositeScore).toBeGreaterThanOrEqual(500);
  });

  it('should return all entries when no filters applied', () => {
    const filter: LeaderboardFilter = {};
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(3);
  });

  it('should return empty array when no entries match', () => {
    const filter: LeaderboardFilter = { tier: 'GRANDMASTER' };
    const filtered = filterLeaderboard(forecasters, filter);

    expect(filtered).toHaveLength(0);
  });
});

// =============================================================================
// getLeaderboardByCategory Tests
// =============================================================================

describe('getLeaderboardByCategory', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({
        address: '0x0000000000000000000000000000000000000001',
        compositeScore: 600,
        externalReputations: [{ platform: 'POLYMARKET', score: 80, verified: true, lastUpdated: new Date() }],
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000002',
        compositeScore: 500,
        externalReputations: [{ platform: 'LIMITLESS', score: 60, verified: true, lastUpdated: new Date() }],
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000003',
        compositeScore: 400,
        externalReputations: [],
      }),
    ];
  });

  it('should return OVERALL category with all forecasters ranked', () => {
    const result = getLeaderboardByCategory(forecasters, 'OVERALL');

    expect(result.category).toBe('OVERALL');
    expect(result.entries).toHaveLength(3);
    expect(result.totalCount).toBe(3);
    expect(result.entries[0].rank).toBe(1);
  });

  it('should filter POLYMARKET category by verified platform', () => {
    const result = getLeaderboardByCategory(forecasters, 'POLYMARKET');

    expect(result.category).toBe('POLYMARKET');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].externalReputations[0]?.platform).toBe('POLYMARKET');
  });

  it('should filter LIMITLESS category by verified platform', () => {
    const result = getLeaderboardByCategory(forecasters, 'LIMITLESS');

    expect(result.category).toBe('LIMITLESS');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].externalReputations[0]?.platform).toBe('LIMITLESS');
  });

  it('should return all forecasters for CRYPTO category', () => {
    const result = getLeaderboardByCategory(forecasters, 'CRYPTO');

    expect(result.category).toBe('CRYPTO');
    expect(result.entries).toHaveLength(3);
  });

  it('should return all forecasters for POLITICS category', () => {
    const result = getLeaderboardByCategory(forecasters, 'POLITICS');

    expect(result.category).toBe('POLITICS');
    expect(result.entries).toHaveLength(3);
  });

  it('should return all forecasters for SPORTS category', () => {
    const result = getLeaderboardByCategory(forecasters, 'SPORTS');

    expect(result.category).toBe('SPORTS');
    expect(result.entries).toHaveLength(3);
  });

  it('should include updatedAt timestamp', () => {
    const result = getLeaderboardByCategory(forecasters, 'OVERALL');

    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should rank filtered entries correctly', () => {
    forecasters[1].externalReputations.push({
      platform: 'POLYMARKET',
      score: 90,
      verified: true,
      lastUpdated: new Date(),
    });

    const result = getLeaderboardByCategory(forecasters, 'POLYMARKET');

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].rank).toBe(1);
    expect(result.entries[1].rank).toBe(2);
  });
});

// =============================================================================
// applyPrivacyFilter Tests
// =============================================================================

describe('applyPrivacyFilter', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({
        address: '0x0000000000000000000000000000000000000001',
        displayName: 'Public User',
        ensName: 'public.eth',
        isPrivate: false,
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000002',
        displayName: 'Private User',
        ensName: 'private.eth',
        isPrivate: true,
      }),
      createMockEntry({
        address: '0x0000000000000000000000000000000000000003',
        displayName: 'Another Public',
        ensName: null,
        isPrivate: false,
      }),
    ];
  });

  it('should filter out private entries by default', () => {
    const filtered = applyPrivacyFilter(forecasters);

    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => !e.isPrivate)).toBe(true);
  });

  it('should include anonymized private entries when includeAnonymous is true', () => {
    const filtered = applyPrivacyFilter(forecasters, { includeAnonymous: true });

    expect(filtered).toHaveLength(3);
  });

  it('should anonymize private entries when includeAnonymous is true', () => {
    const filtered = applyPrivacyFilter(forecasters, { includeAnonymous: true });
    const privateEntry = filtered.find((e) => e.isPrivate);

    expect(privateEntry?.displayName).toBe('Anonymous Forecaster');
    expect(privateEntry?.ensName).toBe(null);
  });

  it('should not modify public entries when includeAnonymous is true', () => {
    const filtered = applyPrivacyFilter(forecasters, { includeAnonymous: true });
    const publicEntry = filtered.find((e) => e.address === '0x0000000000000000000000000000000000000001');

    expect(publicEntry?.displayName).toBe('Public User');
    expect(publicEntry?.ensName).toBe('public.eth');
  });

  it('should handle empty options', () => {
    const filtered = applyPrivacyFilter(forecasters, {});

    expect(filtered).toHaveLength(2);
  });

  it('should handle all public entries', () => {
    const allPublic = forecasters.filter((e) => !e.isPrivate);
    const filtered = applyPrivacyFilter(allPublic);

    expect(filtered).toHaveLength(2);
  });

  it('should handle all private entries', () => {
    const allPrivate = forecasters.map((e) => ({ ...e, isPrivate: true }));
    const filtered = applyPrivacyFilter(allPrivate);

    expect(filtered).toHaveLength(0);
  });
});

// =============================================================================
// maskPrivateEntries Tests
// =============================================================================

describe('maskPrivateEntries', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        displayName: 'Public User',
        ensName: 'public.eth',
        isPrivate: false,
      }),
      createMockEntry({
        address: '0xabcdef1234567890abcdef1234567890abcd5678',
        displayName: 'Private User',
        ensName: 'private.eth',
        isPrivate: true,
      }),
    ];
  });

  it('should not modify public entries', () => {
    const masked = maskPrivateEntries(forecasters);
    const publicEntry = masked.find((e) => !e.isPrivate);

    expect(publicEntry?.displayName).toBe('Public User');
    expect(publicEntry?.ensName).toBe('public.eth');
    expect(publicEntry?.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('should mask private entry display name', () => {
    const masked = maskPrivateEntries(forecasters);
    const privateEntry = masked.find((e) => e.isPrivate);

    expect(privateEntry?.displayName).toBe('Anonymous Forecaster');
  });

  it('should mask private entry ENS name', () => {
    const masked = maskPrivateEntries(forecasters);
    const privateEntry = masked.find((e) => e.isPrivate);

    expect(privateEntry?.ensName).toBe(null);
  });

  it('should mask address keeping only last 4 characters', () => {
    const masked = maskPrivateEntries(forecasters);
    const privateEntry = masked.find((e) => e.isPrivate);

    expect(privateEntry?.address).toMatch(/^0x\*{36}5678$/);
  });

  it('should preserve stats on private entries', () => {
    const masked = maskPrivateEntries(forecasters);
    const privateEntry = masked.find((e) => e.isPrivate);
    const originalPrivate = forecasters.find((e) => e.isPrivate);

    expect(privateEntry?.brierScore).toBe(originalPrivate?.brierScore);
    expect(privateEntry?.compositeScore).toBe(originalPrivate?.compositeScore);
    expect(privateEntry?.totalForecasts).toBe(originalPrivate?.totalForecasts);
  });

  it('should handle empty array', () => {
    const masked = maskPrivateEntries([]);
    expect(masked).toEqual([]);
  });

  it('should handle all public entries', () => {
    const allPublic = forecasters.filter((e) => !e.isPrivate);
    const masked = maskPrivateEntries(allPublic);

    expect(masked).toEqual(allPublic);
  });
});

// =============================================================================
// calculateRankChanges Tests
// =============================================================================

describe('calculateRankChanges', () => {
  it('should calculate positive rank change (improvement)', () => {
    const current = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 2 }),
    ];
    const previous = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 5 }),
    ];

    const changes = calculateRankChanges(current, previous);

    expect(changes.get('0x0000000000000000000000000000000000000001')).toBe(3); // 5 - 2 = +3
  });

  it('should calculate negative rank change (drop)', () => {
    const current = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 8 }),
    ];
    const previous = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 3 }),
    ];

    const changes = calculateRankChanges(current, previous);

    expect(changes.get('0x0000000000000000000000000000000000000001')).toBe(-5); // 3 - 8 = -5
  });

  it('should return 0 for unchanged rank', () => {
    const current = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 5 }),
    ];
    const previous = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 5 }),
    ];

    const changes = calculateRankChanges(current, previous);

    expect(changes.get('0x0000000000000000000000000000000000000001')).toBe(0);
  });

  it('should not include new forecasters without previous rank', () => {
    const current = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 5 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', rank: 10 }),
    ];
    const previous = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 5 }),
    ];

    const changes = calculateRankChanges(current, previous);

    expect(changes.has('0x0000000000000000000000000000000000000001')).toBe(true);
    expect(changes.has('0x0000000000000000000000000000000000000002')).toBe(false);
  });

  it('should handle multiple forecasters', () => {
    const current = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 1 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', rank: 3 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', rank: 5 }),
    ];
    const previous = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', rank: 3 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', rank: 1 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', rank: 5 }),
    ];

    const changes = calculateRankChanges(current, previous);

    expect(changes.get('0x0000000000000000000000000000000000000001')).toBe(2); // Improved
    expect(changes.get('0x0000000000000000000000000000000000000002')).toBe(-2); // Dropped
    expect(changes.get('0x0000000000000000000000000000000000000003')).toBe(0); // Unchanged
  });

  it('should handle empty arrays', () => {
    const changes = calculateRankChanges([], []);
    expect(changes.size).toBe(0);
  });
});

// =============================================================================
// getTopForecasters Tests
// =============================================================================

describe('getTopForecasters', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 300 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', compositeScore: 500 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', compositeScore: 400 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000004', compositeScore: 600 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000005', compositeScore: 200 }),
    ];
  });

  it('should return top N forecasters ranked', () => {
    const top3 = getTopForecasters(forecasters, 3);

    expect(top3).toHaveLength(3);
    expect(top3[0].compositeScore).toBe(600);
    expect(top3[1].compositeScore).toBe(500);
    expect(top3[2].compositeScore).toBe(400);
  });

  it('should assign correct ranks', () => {
    const top3 = getTopForecasters(forecasters, 3);

    expect(top3[0].rank).toBe(1);
    expect(top3[1].rank).toBe(2);
    expect(top3[2].rank).toBe(3);
  });

  it('should return all if count exceeds array length', () => {
    const top10 = getTopForecasters(forecasters, 10);

    expect(top10).toHaveLength(5);
  });

  it('should return empty array for count 0', () => {
    const top0 = getTopForecasters(forecasters, 0);
    expect(top0).toHaveLength(0);
  });

  it('should handle empty forecasters array', () => {
    const top3 = getTopForecasters([], 3);
    expect(top3).toHaveLength(0);
  });

  it('should return single entry for count 1', () => {
    const top1 = getTopForecasters(forecasters, 1);

    expect(top1).toHaveLength(1);
    expect(top1[0].compositeScore).toBe(600);
    expect(top1[0].rank).toBe(1);
  });
});

// =============================================================================
// findForecasterPosition Tests
// =============================================================================

describe('findForecasterPosition', () => {
  let forecasters: LeaderboardEntry[];

  beforeEach(() => {
    forecasters = [
      createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 600 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000002', compositeScore: 500 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000003', compositeScore: 400 }),
      createMockEntry({ address: '0x0000000000000000000000000000000000000004', compositeScore: 300 }),
    ];
  });

  it('should find forecaster position and return entry', () => {
    const result = findForecasterPosition(forecasters, '0x0000000000000000000000000000000000000002');

    expect(result).not.toBeNull();
    expect(result?.entry.address).toBe('0x0000000000000000000000000000000000000002');
    expect(result?.rank).toBe(2);
  });

  it('should calculate correct percentile for top rank', () => {
    const result = findForecasterPosition(forecasters, '0x0000000000000000000000000000000000000001');

    // Rank 1 of 4: (4 - 1 + 1) / 4 * 100 = 100%
    expect(result?.percentile).toBe(100);
  });

  it('should calculate correct percentile for bottom rank', () => {
    const result = findForecasterPosition(forecasters, '0x0000000000000000000000000000000000000004');

    // Rank 4 of 4: (4 - 4 + 1) / 4 * 100 = 25%
    expect(result?.percentile).toBe(25);
  });

  it('should calculate correct percentile for middle rank', () => {
    const result = findForecasterPosition(forecasters, '0x0000000000000000000000000000000000000002');

    // Rank 2 of 4: (4 - 2 + 1) / 4 * 100 = 75%
    expect(result?.percentile).toBe(75);
  });

  it('should return null for non-existent address', () => {
    const result = findForecasterPosition(forecasters, '0x9999999999999999999999999999999999999999');
    expect(result).toBeNull();
  });

  it('should match address case-insensitively', () => {
    const result = findForecasterPosition(forecasters, '0x0000000000000000000000000000000000000001'.toUpperCase() as `0x${string}`);

    expect(result).not.toBeNull();
    expect(result?.rank).toBe(1);
  });

  it('should handle empty forecasters array', () => {
    const result = findForecasterPosition([], '0x0000000000000000000000000000000000000001');
    expect(result).toBeNull();
  });

  it('should handle single forecaster', () => {
    const single = [createMockEntry({ address: '0x0000000000000000000000000000000000000001', compositeScore: 500 })];
    const result = findForecasterPosition(single, '0x0000000000000000000000000000000000000001');

    expect(result?.rank).toBe(1);
    expect(result?.percentile).toBe(100);
  });
});
