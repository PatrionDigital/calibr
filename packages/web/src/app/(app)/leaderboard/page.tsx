'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// =============================================================================
// Types
// =============================================================================

type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  compositeScore: number;
  brierScore: number | null;
  calibrationScore: number | null;
  totalForecasts: number;
  resolvedForecasts: number;
  streakDays: number;
  isPrivate: boolean;
}

interface TierInfo {
  tier: string;
  threshold: number;
  description: string;
  count: number;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_COLORS: Record<SuperforecasterTier, string> = {
  APPRENTICE: 'text-[hsl(var(--muted-foreground))]',
  JOURNEYMAN: 'text-[hsl(var(--info))]',
  EXPERT: 'text-[hsl(var(--success))]',
  MASTER: 'text-[hsl(var(--warning))]',
  GRANDMASTER: 'text-[hsl(var(--primary))]',
};

const TIER_BADGES: Record<SuperforecasterTier, string> = {
  APPRENTICE: '[A]',
  JOURNEYMAN: '[J]',
  EXPERT: '[E]',
  MASTER: '[M]',
  GRANDMASTER: '[G]',
};

// =============================================================================
// Components
// =============================================================================

function TierBadge({ tier }: { tier: SuperforecasterTier }) {
  return (
    <span className={`font-mono ${TIER_COLORS[tier]}`}>
      {TIER_BADGES[tier]}
    </span>
  );
}

function RankChange({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-[hsl(var(--muted-foreground))]">--</span>;

  const change = previous - current;
  if (change > 0) {
    return <span className="text-[hsl(var(--success))]">+{change}</span>;
  } else if (change < 0) {
    return <span className="text-[hsl(var(--destructive))]">{change}</span>;
  }
  return <span className="text-[hsl(var(--muted-foreground))]">--</span>;
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) {
  const rowClass = isCurrentUser
    ? 'bg-[hsl(var(--primary)/0.1)] border-l-2 border-[hsl(var(--primary))]'
    : 'hover:bg-[hsl(var(--accent))]';

  return (
    <tr className={`border-b border-[hsl(var(--border))] ${rowClass}`}>
      <td className="py-3 px-4 text-center font-mono">
        <span className="text-[hsl(var(--primary))]">#{entry.rank}</span>
      </td>
      <td className="py-3 px-2 text-center text-xs">
        <RankChange current={entry.rank} previous={entry.previousRank} />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <TierBadge tier={entry.tier} />
          <span className={entry.isPrivate ? 'italic text-[hsl(var(--muted-foreground))]' : ''}>
            {entry.displayName}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center font-mono text-[hsl(var(--primary))]">
        {entry.compositeScore}
      </td>
      <td className="py-3 px-4 text-center font-mono">
        {entry.brierScore !== null ? entry.brierScore.toFixed(3) : '--'}
      </td>
      <td className="py-3 px-4 text-center font-mono">
        {entry.resolvedForecasts}
      </td>
    </tr>
  );
}

function TierDistribution({ tiers }: { tiers: TierInfo[] }) {
  const total = tiers.reduce((sum, t) => sum + t.count, 0);

  return (
    <div className="ascii-box p-4">
      <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">[TIER DISTRIBUTION]</h3>
      <div className="space-y-2">
        {tiers.map((tier) => {
          const percentage = total > 0 ? (tier.count / total) * 100 : 0;
          const tierKey = tier.tier as SuperforecasterTier;

          return (
            <div key={tier.tier} className="flex items-center gap-2">
              <span className={`w-24 font-mono text-xs ${TIER_COLORS[tierKey]}`}>
                {TIER_BADGES[tierKey]} {tier.tier}
              </span>
              <div className="flex-1 h-4 bg-[hsl(var(--accent))] overflow-hidden">
                <div
                  className={`h-full ${tierKey === 'GRANDMASTER' ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted-foreground))]'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-12 text-xs text-right font-mono">
                {tier.count}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
        Total forecasters: {total}
      </div>
    </div>
  );
}

function FilterBar({
  selectedTier,
  onTierChange,
  minForecasts,
  onMinForecastsChange,
}: {
  selectedTier: SuperforecasterTier | 'ALL';
  onTierChange: (tier: SuperforecasterTier | 'ALL') => void;
  minForecasts: number;
  onMinForecastsChange: (min: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          TIER
        </label>
        <select
          value={selectedTier}
          onChange={(e) => onTierChange(e.target.value as SuperforecasterTier | 'ALL')}
          className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-3 py-1 text-sm font-mono"
        >
          <option value="ALL">All Tiers</option>
          <option value="GRANDMASTER">Grandmaster</option>
          <option value="MASTER">Master</option>
          <option value="EXPERT">Expert</option>
          <option value="JOURNEYMAN">Journeyman</option>
          <option value="APPRENTICE">Apprentice</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
          MIN FORECASTS
        </label>
        <select
          value={minForecasts}
          onChange={(e) => onMinForecastsChange(parseInt(e.target.value))}
          className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-3 py-1 text-sm font-mono"
        >
          <option value="0">Any</option>
          <option value="10">10+</option>
          <option value="50">50+</option>
          <option value="100">100+</option>
          <option value="500">500+</option>
        </select>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<SuperforecasterTier | 'ALL'>('ALL');
  const [minForecasts, setMinForecasts] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const LIMIT = 50;

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: LIMIT.toString(),
          offset: offset.toString(),
        });

        if (selectedTier !== 'ALL') {
          params.append('tier', selectedTier);
        }
        if (minForecasts > 0) {
          params.append('minForecasts', minForecasts.toString());
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
    }

    fetchLeaderboard();
  }, [API_BASE, selectedTier, minForecasts, offset]);

  // Fetch tier distribution
  useEffect(() => {
    async function fetchTiers() {
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
    }

    fetchTiers();
  }, [API_BASE]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [selectedTier, minForecasts]);

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
        <div className="ascii-box p-3 mb-6 flex flex-wrap gap-4 text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Tiers:</span>
          <span className={TIER_COLORS.GRANDMASTER}>[G] Grandmaster (800+)</span>
          <span className={TIER_COLORS.MASTER}>[M] Master (600+)</span>
          <span className={TIER_COLORS.EXPERT}>[E] Expert (400+)</span>
          <span className={TIER_COLORS.JOURNEYMAN}>[J] Journeyman (200+)</span>
          <span className={TIER_COLORS.APPRENTICE}>[A] Apprentice</span>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Leaderboard */}
          <div className="lg:col-span-3">
            <FilterBar
              selectedTier={selectedTier}
              onTierChange={setSelectedTier}
              minForecasts={minForecasts}
              onMinForecastsChange={setMinForecasts}
            />

            {error && (
              <div className="ascii-box p-4 mb-4 border-[hsl(var(--destructive))]">
                <p className="text-[hsl(var(--destructive))]">{error}</p>
              </div>
            )}

            <div className="ascii-box overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[hsl(var(--accent))] border-b border-[hsl(var(--border))]">
                    <th className="py-2 px-4 text-center font-mono">RANK</th>
                    <th className="py-2 px-2 text-center font-mono text-xs">CHG</th>
                    <th className="py-2 px-4 text-left font-mono">FORECASTER</th>
                    <th className="py-2 px-4 text-center font-mono">SCORE</th>
                    <th className="py-2 px-4 text-center font-mono">BRIER</th>
                    <th className="py-2 px-4 text-center font-mono">RESOLVED</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                        Loading leaderboard...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[hsl(var(--muted-foreground))]">
                        No forecasters found matching criteria
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <LeaderboardRow key={entry.userId} entry={entry} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  disabled={offset === 0}
                  className="ascii-box px-4 py-2 text-sm disabled:opacity-50"
                >
                  &lt; PREV
                </button>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">
                  Showing {offset + 1}-{Math.min(offset + entries.length, total)} of {total}
                </span>
                <button
                  onClick={() => setOffset(offset + LIMIT)}
                  disabled={!hasMore}
                  className="ascii-box px-4 py-2 text-sm disabled:opacity-50"
                >
                  NEXT &gt;
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tier Distribution */}
            {tiers.length > 0 && <TierDistribution tiers={tiers} />}

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

            {/* Your Position (placeholder) */}
            <div className="ascii-box p-4">
              <h3 className="text-sm font-bold mb-3 text-[hsl(var(--primary))]">[YOUR POSITION]</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Connect wallet to see your ranking
              </p>
              <button className="mt-3 w-full ascii-box px-4 py-2 text-sm hover:border-[hsl(var(--primary))] transition-colors">
                CONNECT WALLET
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
