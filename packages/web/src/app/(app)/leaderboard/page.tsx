'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LeaderboardTable,
  LeaderboardFilters,
  UserRankCard,
  TierBadge,
  type LeaderboardEntry,
  type LeaderboardFilterState,
  type SortKey,
} from '@/components/leaderboard';

// =============================================================================
// Types
// =============================================================================

interface TierInfo {
  tier: string;
  threshold: number;
  description: string;
  count: number;
}

// =============================================================================
// Main Page
// =============================================================================

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeaderboardFilterState>({});
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // User's own position
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<{
    userId: string;
    displayName: string;
    rank: number;
    percentile: number;
    tier: 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';
    tierProgress: number;
    compositeScore: number;
    brierScore: number | null;
    totalForecasts: number;
    resolvedForecasts: number;
  } | null>(null);
  const [loadingUserRank, setLoadingUserRank] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const LIMIT = 50;

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: offset.toString(),
      });

      if (filters.tier) {
        params.append('tier', filters.tier);
      }
      if (filters.minForecasts && filters.minForecasts > 0) {
        params.append('minForecasts', filters.minForecasts.toString());
      }
      if (filters.category) {
        params.append('category', filters.category);
      }

      const response = await fetch(`${API_BASE}/api/leaderboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');

      const data = await response.json();
      if (data.success) {
        setEntries(data.data.entries);
        setHasMore(data.data.pagination.hasMore);
        setTotal(data.data.pagination.total);
      } else {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, filters, offset]);

  // Fetch tier distribution
  const fetchTiers = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/leaderboard/tiers`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setTiers(data.data.tiers);
      }
    } catch {
      // Silently fail for tier distribution
    }
  }, [API_BASE]);

  // Fetch user's rank
  const fetchUserRank = useCallback(async (userId: string) => {
    try {
      setLoadingUserRank(true);
      const response = await fetch(`${API_BASE}/api/leaderboard/user/${userId}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        setUserRank(data.data);
      }
    } catch {
      // User might not have rank data
    } finally {
      setLoadingUserRank(false);
    }
  }, [API_BASE]);

  // Effects
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  useEffect(() => {
    const storedUserId = localStorage.getItem('calibr_user_id');
    if (storedUserId) {
      setCurrentUserId(storedUserId);
      fetchUserRank(storedUserId);
    }
  }, [fetchUserRank]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [filters]);

  // Handlers
  const handleFilterChange = (newFilters: LeaderboardFilterState) => {
    setFilters(newFilters);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (userId: string) => {
    router.push(`/forecaster/${userId}`);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]">
            &lt; BACK
          </Link>
          <h1 className="text-2xl font-bold terminal-glow">SUPERFORECASTER LEADERBOARD</h1>
        </div>

        {/* Tier Legend */}
        <div className="ascii-box p-3 mb-6 flex flex-wrap gap-4 text-sm items-center">
          <span className="text-[hsl(var(--muted-foreground))]">Tiers:</span>
          <TierBadge tier="GRANDMASTER" showEmoji />
          <TierBadge tier="MASTER" showEmoji />
          <TierBadge tier="EXPERT" showEmoji />
          <TierBadge tier="JOURNEYMAN" showEmoji />
          <TierBadge tier="APPRENTICE" showEmoji />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Leaderboard */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <LeaderboardFilters
              currentFilters={filters}
              onFilterChange={handleFilterChange}
              className="mb-4"
            />

            {/* Error Display */}
            {error && (
              <div className="ascii-box p-4 mb-4 border-[hsl(var(--destructive))]">
                <p className="text-[hsl(var(--destructive))]">{error}</p>
              </div>
            )}

            {/* Leaderboard Table */}
            <LeaderboardTable
              entries={entries}
              currentUserId={currentUserId || undefined}
              isLoading={loading}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onRowClick={handleRowClick}
            />

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  disabled={offset === 0}
                  className="ascii-box px-4 py-2 text-sm disabled:opacity-50 hover:border-[hsl(var(--primary))] transition-colors"
                >
                  &lt; PREV
                </button>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Showing {offset + 1}-{Math.min(offset + entries.length, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + LIMIT)}
                  disabled={!hasMore}
                  className="ascii-box px-4 py-2 text-sm disabled:opacity-50 hover:border-[hsl(var(--primary))] transition-colors"
                >
                  NEXT &gt;
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* User's Position */}
            {currentUserId ? (
              <UserRankCard
                userId={userRank?.userId || currentUserId}
                displayName={userRank?.displayName || null}
                rank={userRank?.rank || null}
                percentile={userRank?.percentile || 0}
                tier={userRank?.tier || 'APPRENTICE'}
                tierProgress={userRank?.tierProgress || 0}
                compositeScore={userRank?.compositeScore || 0}
                brierScore={userRank?.brierScore || null}
                totalForecasts={userRank?.totalForecasts || 0}
                resolvedForecasts={userRank?.resolvedForecasts || 0}
                isLoading={loadingUserRank}
              />
            ) : (
              <div className="ascii-box p-4">
                <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">[YOUR POSITION]</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Connect wallet to see your ranking
                </p>
                <button className="mt-3 w-full ascii-box px-4 py-2 text-sm hover:border-[hsl(var(--primary))] transition-colors">
                  CONNECT WALLET
                </button>
              </div>
            )}

            {/* Tier Distribution */}
            {tiers.length > 0 && (
              <div className="ascii-box p-4">
                <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">[TIER DISTRIBUTION]</h3>
                <div className="space-y-2">
                  {tiers.map((tier) => {
                    const totalForecasters = tiers.reduce((sum, t) => sum + t.count, 0);
                    const percentage = totalForecasters > 0 ? (tier.count / totalForecasters) * 100 : 0;

                    return (
                      <div key={tier.tier} className="flex items-center gap-2">
                        <TierBadge tier={tier.tier as 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER'} compact />
                        <div className="flex-1 h-3 bg-[hsl(var(--muted))] overflow-hidden rounded">
                          <div
                            className="h-full bg-[hsl(var(--primary))]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-10 text-xs text-right font-mono">
                          {tier.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                  Total forecasters: {tiers.reduce((sum, t) => sum + t.count, 0)}
                </div>
              </div>
            )}

            {/* Scoring Info */}
            <div className="ascii-box p-4">
              <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">[SCORING]</h3>
              <div className="space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                <p>Composite Score (0-1000) based on:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Brier Score (55%)</li>
                  <li>Calibration (35%)</li>
                  <li>Volume Bonus (5%)</li>
                  <li>Streak & Reputation (5%)</li>
                </ul>
                <p className="mt-3">Lower Brier score = better accuracy</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
