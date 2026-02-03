'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type LeaderboardTier = 'GRANDMASTER' | 'MASTER' | 'EXPERT' | 'JOURNEYMAN' | 'APPRENTICE';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  ensName: string | null;
  tier: LeaderboardTier;
  score: number;
  brierScore: number;
  forecasts: number;
  accuracy: number;
  streak: number;
  change: number;
}

export interface LeaderboardFilter {
  tier?: LeaderboardTier;
  period?: 'week' | 'month' | 'year' | 'all';
  category?: string;
  search?: string;
  minForecasts?: number;
}

// Alias for page compatibility
export type LeaderboardFilterState = LeaderboardFilter;
export type SortKey = 'rank' | 'score' | 'brierScore' | 'forecasts' | 'accuracy';

// =============================================================================
// TierBadge Component
// =============================================================================

interface TierBadgeProps {
  tier: LeaderboardTier | string;
  compact?: boolean;
  showEmoji?: boolean;
}

const tierColors: Record<LeaderboardTier, string> = {
  GRANDMASTER: 'text-yellow-400 border-yellow-400',
  MASTER: 'text-purple-400 border-purple-400',
  EXPERT: 'text-blue-400 border-blue-400',
  JOURNEYMAN: 'text-green-400 border-green-400',
  APPRENTICE: 'text-gray-400 border-gray-400',
};

const tierEmojis: Record<LeaderboardTier, string> = {
  GRANDMASTER: '👑',
  MASTER: '⭐',
  EXPERT: '🎯',
  JOURNEYMAN: '📈',
  APPRENTICE: '🌱',
};

export function TierBadge({ tier, compact = false, showEmoji = false }: TierBadgeProps) {
  const tierKey = tier as LeaderboardTier;
  const tierClass = tier.toLowerCase();
  return (
    <span
      data-testid="tier-badge"
      className={`inline-block border px-2 py-0.5 text-xs font-mono ${tierColors[tierKey] || 'text-gray-400 border-gray-400'} ${tierClass} ${
        compact ? 'compact text-[10px] px-1' : ''
      }`}
    >
      {showEmoji && tierEmojis[tierKey] && <span className="mr-1">{tierEmojis[tierKey]}</span>}
      {tier}
    </span>
  );
}

// =============================================================================
// LeaderboardEntry Component
// =============================================================================

interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
  onClick?: (address: string) => void;
  isCurrentUser?: boolean;
}

export function LeaderboardEntry({ entry, onClick, isCurrentUser = false }: LeaderboardEntryProps) {
  const displayName = entry.ensName || entry.address;
  const changeClass = entry.change > 0 ? 'up' : entry.change < 0 ? 'down' : 'unchanged';

  return (
    <div
      data-testid="leaderboard-entry"
      onClick={() => onClick?.(entry.address)}
      className={`flex items-center gap-4 p-3 border-b border-[var(--terminal-green)] border-opacity-20 font-mono hover:bg-[var(--terminal-green)] hover:bg-opacity-5 cursor-pointer transition-colors ${
        isCurrentUser ? 'current-user bg-[var(--terminal-green)] bg-opacity-10' : ''
      }`}
    >
      <div className="w-12 text-[var(--terminal-green)] font-bold">#{entry.rank}</div>

      <div
        data-testid="rank-change"
        className={`w-8 text-xs ${changeClass} ${
          entry.change > 0 ? 'text-green-400' : entry.change < 0 ? 'text-red-400' : 'text-[var(--terminal-dim)]'
        }`}
      >
        {entry.change > 0 ? `▲${entry.change}` : entry.change < 0 ? `▼${Math.abs(entry.change)}` : '−'}
      </div>

      <div className="flex-1">
        <div className="text-[var(--terminal-green)]">{displayName}</div>
        <TierBadge tier={entry.tier} compact />
      </div>

      <div className="w-16 text-right text-[var(--terminal-green)] font-bold">{entry.score}</div>
      <div className="w-16 text-right text-[var(--terminal-dim)] text-sm">{entry.brierScore.toFixed(2)}</div>
      <div className="w-16 text-right text-[var(--terminal-dim)] text-sm">{entry.forecasts}</div>
    </div>
  );
}

// =============================================================================
// LeaderboardTable Component
// =============================================================================

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  onSort?: (field: SortKey) => void;
  currentUserAddress?: string;
  currentUserId?: string;
  loading?: boolean;
  isLoading?: boolean;
  sortKey?: SortKey;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (userId: string) => void;
}

export function LeaderboardTable({
  entries,
  onSort,
  currentUserAddress,
  currentUserId,
  loading: loadingProp,
  isLoading,
  sortKey: _sortKey,
  sortDirection: _sortDirection,
  onRowClick,
}: LeaderboardTableProps) {
  const loading = isLoading ?? loadingProp ?? false;
  const currentUser = currentUserId || currentUserAddress;

  if (loading) {
    return (
      <div data-testid="leaderboard-loading" className="text-center py-8 font-mono">
        <div className="animate-pulse text-[var(--terminal-green)]">Loading leaderboard...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div data-testid="leaderboard-table" className="text-center py-8 font-mono">
        <p className="text-[var(--terminal-dim)]">No forecasters found</p>
      </div>
    );
  }

  return (
    <div data-testid="leaderboard-table" className="border border-[var(--terminal-green)]">
      <div className="flex items-center gap-4 p-3 border-b border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-10 font-mono text-sm">
        <div className="w-12 text-[var(--terminal-green)]">Rank</div>
        <div className="w-8"></div>
        <div className="flex-1 text-[var(--terminal-green)]">Forecaster</div>
        <div
          className="w-16 text-right text-[var(--terminal-green)] cursor-pointer hover:underline"
          onClick={() => onSort?.('score')}
        >
          Score
        </div>
        <div
          className="w-16 text-right text-[var(--terminal-green)] cursor-pointer hover:underline"
          onClick={() => onSort?.('brierScore')}
        >
          Brier
        </div>
        <div className="w-16 text-right text-[var(--terminal-green)]">Forecasts</div>
      </div>

      {entries.map((entry) => (
        <LeaderboardEntry
          key={entry.address}
          entry={entry}
          isCurrentUser={entry.address === currentUser}
          onClick={onRowClick}
        />
      ))}
    </div>
  );
}

// =============================================================================
// LeaderboardFilters Component
// =============================================================================

interface LeaderboardFiltersProps {
  onFilterChange: (filters: LeaderboardFilter) => void;
  filters?: LeaderboardFilter;
  currentFilters?: LeaderboardFilter;
  className?: string;
}

export function LeaderboardFilters({ onFilterChange, filters: filtersProp, currentFilters, className }: LeaderboardFiltersProps) {
  const filters = currentFilters || filtersProp || {};
  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, tier: e.target.value as LeaderboardTier || undefined });
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, period: e.target.value as LeaderboardFilter['period'] || undefined });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, category: e.target.value || undefined });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value || undefined });
  };

  return (
    <div data-testid="leaderboard-filters" className={`flex flex-wrap gap-4 mb-6 font-mono ${className || ''}`}>
      <div>
        <label htmlFor="tier-filter" className="block text-[var(--terminal-dim)] text-xs mb-1">Tier</label>
        <select
          id="tier-filter"
          value={filters.tier || ''}
          onChange={handleTierChange}
          className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
        >
          <option value="">All Tiers</option>
          <option value="GRANDMASTER">Grandmaster</option>
          <option value="MASTER">Master</option>
          <option value="EXPERT">Expert</option>
          <option value="JOURNEYMAN">Journeyman</option>
          <option value="APPRENTICE">Apprentice</option>
        </select>
      </div>

      <div>
        <label htmlFor="period-filter" className="block text-[var(--terminal-dim)] text-xs mb-1">Period</label>
        <select
          id="period-filter"
          value={filters.period || ''}
          onChange={handlePeriodChange}
          className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
        >
          <option value="">All Time</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div>
        <label htmlFor="category-filter" className="block text-[var(--terminal-dim)] text-xs mb-1">Category</label>
        <select
          id="category-filter"
          value={filters.category || ''}
          onChange={handleCategoryChange}
          className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
        >
          <option value="">All Categories</option>
          <option value="politics">Politics</option>
          <option value="crypto">Crypto</option>
          <option value="sports">Sports</option>
          <option value="science">Science</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search-input" className="block text-[var(--terminal-dim)] text-xs mb-1">Search</label>
        <input
          id="search-input"
          type="text"
          placeholder="Search forecasters..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="w-full bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}

// =============================================================================
// LeaderboardPodium Component
// =============================================================================

interface LeaderboardPodiumProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  return (
    <div data-testid="leaderboard-podium" className="flex justify-center items-end gap-4 mb-8 font-mono">
      {second && (
        <div data-testid="podium-2nd" className="text-center">
          <div data-testid="trophy-icon" className="text-3xl mb-2">🥈</div>
          <div className="bg-[var(--terminal-green)] bg-opacity-10 border border-[var(--terminal-green)] p-4 h-28 flex flex-col justify-end">
            <div className="text-[var(--terminal-green)] font-bold">{second.ensName || second.address}</div>
            <div className="text-[var(--terminal-green)] text-2xl font-bold">{second.score}</div>
            <TierBadge tier={second.tier} compact />
          </div>
        </div>
      )}

      {first && (
        <div data-testid="podium-1st" className="text-center">
          <div data-testid="trophy-icon" className="text-4xl mb-2">🥇</div>
          <div className="bg-[var(--terminal-green)] bg-opacity-20 border-2 border-[var(--terminal-green)] p-4 h-36 flex flex-col justify-end">
            <div className="text-[var(--terminal-green)] font-bold">{first.ensName || first.address}</div>
            <div className="text-[var(--terminal-green)] text-3xl font-bold">{first.score}</div>
            <TierBadge tier={first.tier} />
          </div>
        </div>
      )}

      {third && (
        <div data-testid="podium-3rd" className="text-center">
          <div data-testid="trophy-icon" className="text-3xl mb-2">🥉</div>
          <div className="bg-[var(--terminal-green)] bg-opacity-10 border border-[var(--terminal-green)] p-4 h-24 flex flex-col justify-end">
            <div className="text-[var(--terminal-green)] font-bold">{third.ensName || third.address}</div>
            <div className="text-[var(--terminal-green)] text-2xl font-bold">{third.score}</div>
            <TierBadge tier={third.tier} compact />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LeaderboardStats Component
// =============================================================================

interface LeaderboardStatsProps {
  entries: LeaderboardEntry[];
  totalForecasters?: number;
  totalForecasts?: number;
}

export function LeaderboardStats({ entries, totalForecasters, totalForecasts }: LeaderboardStatsProps) {
  const avgBrier = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.brierScore, 0) / entries.length
    : 0;

  const tierCounts = entries.reduce((acc, e) => {
    acc[e.tier] = (acc[e.tier] || 0) + 1;
    return acc;
  }, {} as Record<LeaderboardTier, number>);

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div data-testid="leaderboard-stats" className="border border-[var(--terminal-green)] p-4 mb-6 font-mono">
      <h3 className="text-[var(--terminal-green)] font-bold mb-4">Leaderboard Stats</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {totalForecasters !== undefined && (
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Total Forecasters</div>
            <div className="text-[var(--terminal-green)] text-xl font-bold">{formatNumber(totalForecasters)}</div>
          </div>
        )}
        {totalForecasts !== undefined && (
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Total Forecasts</div>
            <div className="text-[var(--terminal-green)] text-xl font-bold">{formatNumber(totalForecasts)}</div>
          </div>
        )}
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Average Brier Score</div>
          <div className="text-[var(--terminal-green)] text-xl font-bold">{avgBrier.toFixed(3)}</div>
        </div>
      </div>

      <div data-testid="tier-distribution">
        <div className="text-[var(--terminal-dim)] text-xs mb-2">Tier Distribution</div>
        <div className="flex gap-2 flex-wrap">
          {(['GRANDMASTER', 'MASTER', 'EXPERT', 'JOURNEYMAN', 'APPRENTICE'] as LeaderboardTier[]).map((tier) => (
            <div key={tier} className="text-xs">
              <TierBadge tier={tier} compact />
              <span className="text-[var(--terminal-dim)] ml-1">{tierCounts[tier] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// UserRankCard Component
// =============================================================================

interface UserRankCardProps {
  userId: string;
  displayName: string | null;
  rank: number | null;
  percentile: number;
  tier: LeaderboardTier;
  tierProgress: number;
  compositeScore: number;
  brierScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  isLoading?: boolean;
}

export function UserRankCard({
  userId,
  displayName,
  rank,
  percentile,
  tier,
  tierProgress,
  compositeScore,
  brierScore,
  totalForecasts,
  resolvedForecasts,
  isLoading = false,
}: UserRankCardProps) {
  if (isLoading) {
    return (
      <div data-testid="user-rank-card" className="border border-[var(--terminal-green)] p-4 font-mono">
        <h3 className="text-[var(--terminal-green)] font-bold mb-3">[YOUR POSITION]</h3>
        <div className="animate-pulse text-[var(--terminal-dim)]">Loading...</div>
      </div>
    );
  }

  return (
    <div data-testid="user-rank-card" className="border border-[var(--terminal-green)] p-4 font-mono">
      <h3 className="text-[var(--terminal-green)] font-bold mb-3">[YOUR POSITION]</h3>

      <div className="mb-4">
        <div className="text-[var(--terminal-green)] text-lg font-bold">
          {displayName || userId.slice(0, 10) + '...'}
        </div>
        <TierBadge tier={tier} showEmoji />
      </div>

      <div className="space-y-2 text-sm">
        {rank && (
          <div className="flex justify-between">
            <span className="text-[var(--terminal-dim)]">Rank:</span>
            <span className="text-[var(--terminal-green)] font-bold">#{rank}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--terminal-dim)]">Percentile:</span>
          <span className="text-[var(--terminal-green)]">Top {percentile.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--terminal-dim)]">Score:</span>
          <span className="text-[var(--terminal-green)] font-bold">{compositeScore.toFixed(0)}</span>
        </div>
        {brierScore !== null && (
          <div className="flex justify-between">
            <span className="text-[var(--terminal-dim)]">Brier Score:</span>
            <span className="text-[var(--terminal-green)]">{brierScore.toFixed(3)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--terminal-dim)]">Forecasts:</span>
          <span className="text-[var(--terminal-green)]">{resolvedForecasts}/{totalForecasts}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[var(--terminal-dim)] text-xs mb-1">Tier Progress</div>
        <div className="h-2 bg-[var(--terminal-green)] bg-opacity-20 rounded overflow-hidden">
          <div
            className="h-full bg-[var(--terminal-green)]"
            style={{ width: `${tierProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LeaderboardPage Component
// =============================================================================

interface LeaderboardPageProps {
  entries: LeaderboardEntry[];
  currentUserAddress?: string;
  totalForecasters?: number;
  totalForecasts?: number;
}

export function LeaderboardPage({
  entries,
  currentUserAddress,
  totalForecasters,
  totalForecasts,
}: LeaderboardPageProps) {
  const [filters, setFilters] = useState<LeaderboardFilter>({});

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (filters.tier) {
      result = result.filter((e) => e.tier === filters.tier);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.address.toLowerCase().includes(search) ||
          (e.ensName && e.ensName.toLowerCase().includes(search))
      );
    }

    return result;
  }, [entries, filters]);

  const topThree = filteredEntries.slice(0, 3);
  const currentUserEntry = entries.find((e) => e.address === currentUserAddress);

  return (
    <div data-testid="leaderboard-page" className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-[var(--terminal-green)] text-2xl mb-6">Superforecaster Leaderboard</h1>

      {currentUserEntry && (
        <div data-testid="user-rank-card" className="border border-[var(--terminal-green)] p-4 mb-6 bg-[var(--terminal-green)] bg-opacity-10">
          <div className="text-[var(--terminal-dim)] text-xs mb-1">Your Rank</div>
          <div className="flex items-center gap-4">
            <div className="text-[var(--terminal-green)] text-3xl font-bold">#{currentUserEntry.rank}</div>
            <div>
              <div className="text-[var(--terminal-green)]">{currentUserEntry.ensName || currentUserEntry.address}</div>
              <TierBadge tier={currentUserEntry.tier} />
            </div>
            <div className="ml-auto text-right">
              <div className="text-[var(--terminal-green)] text-xl font-bold">{currentUserEntry.score}</div>
              <div className="text-[var(--terminal-dim)] text-xs">points</div>
            </div>
          </div>
        </div>
      )}

      <LeaderboardStats entries={entries} totalForecasters={totalForecasters} totalForecasts={totalForecasts} />
      <LeaderboardPodium entries={topThree} />
      <LeaderboardFilters onFilterChange={setFilters} filters={filters} />
      <LeaderboardTable entries={filteredEntries} currentUserAddress={currentUserAddress} />
    </div>
  );
}

// =============================================================================
// useLeaderboard Hook
// =============================================================================

interface UseLeaderboardReturn {
  filteredEntries: LeaderboardEntry[];
  filters: LeaderboardFilter;
  setFilters: (filters: LeaderboardFilter) => void;
  sortBy: string;
  setSortBy: (field: string) => void;
  sortDirection: 'asc' | 'desc';
  toggleSortDirection: () => void;
  topThree: LeaderboardEntry[];
}

export function useLeaderboard(entries: LeaderboardEntry[]): UseLeaderboardReturn {
  const [filters, setFilters] = useState<LeaderboardFilter>({});
  const [sortBy, setSortBy] = useState('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (filters.tier) {
      result = result.filter((e) => e.tier === filters.tier);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.address.toLowerCase().includes(search) ||
          (e.ensName && e.ensName.toLowerCase().includes(search))
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof LeaderboardEntry];
      const bVal = b[sortBy as keyof LeaderboardEntry];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });

    return result;
  }, [entries, filters, sortBy, sortDirection]);

  const topThree = useMemo(() => filteredEntries.slice(0, 3), [filteredEntries]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  return {
    filteredEntries,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortDirection,
    toggleSortDirection,
    topThree,
  };
}
