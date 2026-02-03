'use client';

import { useState, useMemo } from 'react';
import { TierBadge, type LeaderboardTier } from '../leaderboard';

// =============================================================================
// Types
// =============================================================================

export interface RankHistoryEntry {
  date: string;
  rank: number;
  score: number;
  tier: LeaderboardTier;
  totalForecasters: number;
}

export type RankHistoryPeriod = 'week' | 'month' | 'year' | 'all';

// =============================================================================
// RankHistoryChart Component
// =============================================================================

interface RankHistoryChartProps {
  entries: RankHistoryEntry[];
  period?: RankHistoryPeriod;
  showMetricSelector?: boolean;
}

export function RankHistoryChart({
  entries,
  period: _period,
  showMetricSelector = false,
}: RankHistoryChartProps) {
  const [metric, setMetric] = useState<'rank' | 'score'>('rank');

  if (entries.length === 0) {
    return (
      <div data-testid="rank-history-chart" className="border border-[var(--terminal-green)] p-4 font-mono">
        <h3 className="text-[var(--terminal-green)] font-bold mb-4">Rank History</h3>
        <p className="text-[var(--terminal-dim)] text-center py-8">No history data available</p>
      </div>
    );
  }

  const maxValue = metric === 'rank'
    ? Math.max(...entries.map((e) => e.rank))
    : Math.max(...entries.map((e) => e.score));

  const minValue = metric === 'rank'
    ? Math.min(...entries.map((e) => e.rank))
    : Math.min(...entries.map((e) => e.score));

  return (
    <div data-testid="rank-history-chart" className="border border-[var(--terminal-green)] p-4 font-mono">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[var(--terminal-green)] font-bold">Rank History</h3>
        {showMetricSelector && (
          <div>
            <label htmlFor="chart-metric" className="sr-only">Metric</label>
            <select
              id="chart-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as 'rank' | 'score')}
              className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-xs"
            >
              <option value="rank">Rank</option>
              <option value="score">Score</option>
            </select>
          </div>
        )}
      </div>

      {/* ASCII Chart */}
      <div className="h-40 flex items-end gap-1 border-b border-l border-[var(--terminal-green)] p-2">
        {entries.map((entry, i) => {
          const value = metric === 'rank' ? entry.rank : entry.score;
          const range = maxValue - minValue || 1;
          const heightPercent = metric === 'rank'
            ? ((maxValue - value) / range) * 100  // Invert for rank (lower is better)
            : ((value - minValue) / range) * 100;

          return (
            <div
              key={entry.date}
              className="flex-1 flex flex-col items-center justify-end"
              title={`${entry.date}: ${metric === 'rank' ? '#' : ''}${value}`}
            >
              <div
                className="w-full bg-[var(--terminal-green)] min-h-[4px]"
                style={{ height: `${Math.max(5, heightPercent)}%` }}
              />
              {i % Math.ceil(entries.length / 5) === 0 && (
                <span className="text-[8px] text-[var(--terminal-dim)] mt-1 truncate">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-[var(--terminal-dim)] mt-2">
        <span>{metric === 'rank' ? `#${maxValue}` : minValue}</span>
        <span>{metric === 'rank' ? `#${minValue}` : maxValue}</span>
      </div>
    </div>
  );
}

// =============================================================================
// RankHistoryTable Component
// =============================================================================

interface RankHistoryTableProps {
  entries: RankHistoryEntry[];
  pageSize?: number;
}

export function RankHistoryTable({ entries, pageSize = 10 }: RankHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(entries.length / pageSize);
  const sortedEntries = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const paginatedEntries = sortedEntries.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (entries.length === 0) {
    return (
      <div data-testid="rank-history-table" className="border border-[var(--terminal-green)] p-4 font-mono">
        <p className="text-[var(--terminal-dim)] text-center">No history data available</p>
      </div>
    );
  }

  const getRankChange = (currentEntry: RankHistoryEntry, index: number) => {
    const prevEntry = sortedEntries[index + 1];
    if (!prevEntry) return null;
    return prevEntry.rank - currentEntry.rank;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div data-testid="rank-history-table" className="border border-[var(--terminal-green)] font-mono">
      <div className="flex items-center p-3 border-b border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-10 text-sm">
        <div className="w-28 text-[var(--terminal-green)]">Date</div>
        <div className="w-20 text-[var(--terminal-green)]">Rank</div>
        <div className="w-12 text-[var(--terminal-green)]">Δ</div>
        <div className="w-20 text-[var(--terminal-green)]">Score</div>
        <div className="flex-1 text-[var(--terminal-green)]">Tier</div>
      </div>

      {paginatedEntries.map((entry, i) => {
        const rankChange = getRankChange(entry, currentPage * pageSize + i);

        return (
          <div
            key={entry.date}
            className="flex items-center p-3 border-b border-[var(--terminal-green)] border-opacity-20"
          >
            <div className="w-28 text-[var(--terminal-dim)] text-sm">{formatDate(entry.date)}</div>
            <div className="w-20 text-[var(--terminal-green)] font-bold">#{entry.rank}</div>
            <div className="w-12">
              {rankChange !== null && (
                <span
                  data-testid="rank-change-indicator"
                  className={`text-sm ${rankChange > 0 ? 'text-green-400' : rankChange < 0 ? 'text-red-400' : 'text-[var(--terminal-dim)]'}`}
                >
                  {rankChange > 0 ? `▲${rankChange}` : rankChange < 0 ? `▼${Math.abs(rankChange)}` : '−'}
                </span>
              )}
            </div>
            <div className="w-20 text-[var(--terminal-green)]">{entry.score}</div>
            <div className="flex-1">
              <TierBadge tier={entry.tier} compact />
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex justify-between items-center p-3 text-sm">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="text-[var(--terminal-green)] disabled:opacity-50"
          >
            &lt; Prev
          </button>
          <span className="text-[var(--terminal-dim)]">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="text-[var(--terminal-green)] disabled:opacity-50"
          >
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RankHistoryStats Component
// =============================================================================

interface RankHistoryStatsProps {
  entries: RankHistoryEntry[];
}

export function RankHistoryStats({ entries }: RankHistoryStatsProps) {
  if (entries.length === 0) {
    return (
      <div data-testid="rank-history-stats" className="border border-[var(--terminal-green)] p-4 font-mono">
        <h3 className="text-[var(--terminal-green)] font-bold mb-4">Statistics</h3>
        <p className="text-[var(--terminal-dim)] text-center">No data available</p>
      </div>
    );
  }

  const sortedByDate = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstEntry = sortedByDate[0]!;
  const lastEntry = sortedByDate[sortedByDate.length - 1]!;

  const bestRank = Math.min(...entries.map((e) => e.rank));
  const averageRank = entries.reduce((sum, e) => sum + e.rank, 0) / entries.length;
  const rankImprovement = firstEntry.rank - lastEntry.rank;

  const currentPercentile = (lastEntry.rank / lastEntry.totalForecasters) * 100;

  // Track tier changes
  const tierProgression = sortedByDate.reduce(
    (acc, entry, i) => {
      if (i === 0 || entry.tier !== sortedByDate[i - 1]!.tier) {
        acc.push({ tier: entry.tier, date: entry.date });
      }
      return acc;
    },
    [] as { tier: LeaderboardTier; date: string }[]
  );

  return (
    <div data-testid="rank-history-stats" className="border border-[var(--terminal-green)] p-4 font-mono">
      <h3 className="text-[var(--terminal-green)] font-bold mb-4">Statistics</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Best Rank</div>
          <div className="text-[var(--terminal-green)] text-xl font-bold">#{bestRank}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Average Rank</div>
          <div className="text-[var(--terminal-green)] text-xl font-bold">#{averageRank.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Rank Improvement</div>
          <div className={`text-xl font-bold ${rankImprovement > 0 ? 'text-green-400' : rankImprovement < 0 ? 'text-red-400' : 'text-[var(--terminal-dim)]'}`}>
            {rankImprovement > 0 ? `+${rankImprovement}` : rankImprovement}
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Current Percentile</div>
          <div className="text-[var(--terminal-green)] text-xl font-bold">Top {currentPercentile.toFixed(1)}%</div>
        </div>
      </div>

      <div className="border-t border-[var(--terminal-green)] border-opacity-30 pt-4">
        <div className="text-[var(--terminal-dim)] text-xs mb-2">Tier Progression</div>
        <div className="flex flex-wrap gap-2">
          {tierProgression.map((progression, i) => (
            <div key={i} className="flex items-center gap-1">
              <TierBadge tier={progression.tier} compact />
              {i < tierProgression.length - 1 && (
                <span className="text-[var(--terminal-green)]">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RankComparisonCard Component
// =============================================================================

interface RankComparisonCardProps {
  current: RankHistoryEntry;
  previous?: RankHistoryEntry;
  period?: 'week' | 'month';
}

export function RankComparisonCard({ current, previous, period = 'week' }: RankComparisonCardProps) {
  const rankChange = previous ? previous.rank - current.rank : null;
  const scoreChange = previous ? current.score - previous.score : null;

  return (
    <div data-testid="rank-comparison-card" className="border border-[var(--terminal-green)] p-4 font-mono">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--terminal-green)] font-bold">Current Position</h3>
        <span className="text-[var(--terminal-dim)] text-xs">
          vs last {period}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <div className="text-3xl font-bold text-[var(--terminal-green)]">#{current.rank}</div>
          {rankChange !== null ? (
            <div
              data-testid="change-indicator"
              className={`text-sm ${rankChange > 0 ? 'positive text-green-400' : rankChange < 0 ? 'negative text-red-400' : 'text-[var(--terminal-dim)]'}`}
            >
              {rankChange > 0 ? `+${rankChange} positions` : rankChange < 0 ? `${rankChange} positions` : 'No change'}
            </div>
          ) : (
            <div className="text-sm text-[var(--terminal-dim)]">New entry</div>
          )}
        </div>

        <div className="border-l border-[var(--terminal-green)] border-opacity-30 pl-4">
          <div className="text-xl font-bold text-[var(--terminal-green)]">{current.score}</div>
          {scoreChange !== null && (
            <div className={`text-sm ${scoreChange > 0 ? 'text-green-400' : scoreChange < 0 ? 'text-red-400' : 'text-[var(--terminal-dim)]'}`}>
              {scoreChange > 0 ? `+${scoreChange}` : scoreChange} pts
            </div>
          )}
        </div>

        <div className="ml-auto">
          <TierBadge tier={current.tier} showEmoji />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LeaderboardHistoryPage Component
// =============================================================================

interface LeaderboardHistoryPageProps {
  entries: RankHistoryEntry[];
  userId: string;
  displayName?: string;
  loading?: boolean;
}

export function LeaderboardHistoryPage({
  entries,
  userId,
  displayName,
  loading = false,
}: LeaderboardHistoryPageProps) {
  const [period, setPeriod] = useState<RankHistoryPeriod>('all');

  const filteredEntries = useMemo(() => {
    if (period === 'all') return entries;

    const now = new Date();
    const cutoff = new Date();

    switch (period) {
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries, period]);

  const sortedEntries = [...filteredEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const currentEntry = sortedEntries[0];
  const previousEntry = sortedEntries[1];

  if (loading) {
    return (
      <div data-testid="leaderboard-history-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading rank history...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="leaderboard-history-page" className="max-w-4xl mx-auto p-4 font-mono">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[var(--terminal-green)] text-2xl">Rank History</h1>
          <p className="text-[var(--terminal-dim)] text-sm">
            {displayName || userId}
          </p>
        </div>

        <div>
          <label htmlFor="period-select" className="sr-only">Period</label>
          <select
            id="period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as RankHistoryPeriod)}
            className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-3 py-1 text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          {currentEntry && (
            <RankComparisonCard
              current={currentEntry}
              previous={previousEntry}
              period={period === 'week' || period === 'month' ? period : 'week'}
            />
          )}
        </div>
        <div>
          <RankHistoryStats entries={filteredEntries} />
        </div>
      </div>

      <div className="mb-6">
        <RankHistoryChart entries={filteredEntries} period={period} showMetricSelector />
      </div>

      <RankHistoryTable entries={filteredEntries} />
    </div>
  );
}

// =============================================================================
// useRankHistory Hook
// =============================================================================

interface UseRankHistoryReturn {
  filteredEntries: RankHistoryEntry[];
  period: RankHistoryPeriod;
  setPeriod: (period: RankHistoryPeriod) => void;
  bestRank: number;
  worstRank: number;
  averageRank: number;
  rankImprovement: number;
  currentPercentile: number;
}

export function useRankHistory(entries: RankHistoryEntry[]): UseRankHistoryReturn {
  const [period, setPeriod] = useState<RankHistoryPeriod>('all');

  const filteredEntries = useMemo(() => {
    if (period === 'all') return entries;

    const now = new Date();
    const cutoff = new Date();

    switch (period) {
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    return entries.filter((e) => new Date(e.date) >= cutoff);
  }, [entries, period]);

  const sortedEntries = useMemo(
    () => [...filteredEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filteredEntries]
  );

  const bestRank = useMemo(
    () => (filteredEntries.length > 0 ? Math.min(...filteredEntries.map((e) => e.rank)) : 0),
    [filteredEntries]
  );

  const worstRank = useMemo(
    () => (filteredEntries.length > 0 ? Math.max(...filteredEntries.map((e) => e.rank)) : 0),
    [filteredEntries]
  );

  const averageRank = useMemo(
    () => (filteredEntries.length > 0 ? filteredEntries.reduce((sum, e) => sum + e.rank, 0) / filteredEntries.length : 0),
    [filteredEntries]
  );

  const rankImprovement = useMemo(() => {
    if (sortedEntries.length < 2) return 0;
    const first = sortedEntries[0]!;
    const last = sortedEntries[sortedEntries.length - 1]!;
    return first.rank - last.rank;
  }, [sortedEntries]);

  const currentPercentile = useMemo(() => {
    if (sortedEntries.length === 0) return 100;
    const last = sortedEntries[sortedEntries.length - 1]!;
    return (last.rank / last.totalForecasters) * 100;
  }, [sortedEntries]);

  return {
    filteredEntries,
    period,
    setPeriod,
    bestRank,
    worstRank,
    averageRank,
    rankImprovement,
    currentPercentile,
  };
}
