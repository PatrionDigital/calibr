/**
 * Reputation Dashboard Components
 * Task 6.4.6: Build reputation dashboard
 *
 * Show all connected platform reputations in a unified view.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface PlatformReputation {
  platform: string;
  name: string;
  icon: string;
  connected: boolean;
  score: number;
  maxScore: number;
  level: string | null;
  badges: string[];
  lastUpdated: number | null;
  details: Record<string, unknown> | null;
}

export interface ReputationSummary {
  totalScore: number;
  maxPossibleScore: number;
  percentile: number;
  connectedPlatforms: number;
  totalPlatforms: number;
  totalBadges: number;
  lastUpdated: number;
  overallLevel: string;
}

export interface ReputationTrend {
  date: number;
  score: number;
}

// =============================================================================
// ReputationScoreCard
// =============================================================================

interface ReputationScoreCardProps {
  score: number;
  maxScore: number;
  label: string;
  icon?: string;
  showPercentage?: boolean;
  compact?: boolean;
}

export function ReputationScoreCard({
  score,
  maxScore,
  label,
  icon,
  showPercentage,
  compact,
}: ReputationScoreCardProps) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div
      data-testid="reputation-score-card"
      className={`ascii-box ${compact ? 'p-2' : 'p-4'} border-blue-400/30 border`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-sm text-[hsl(var(--muted-foreground))] capitalize">{label}</span>
        </div>
        {showPercentage && (
          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{percentage}%</span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-mono font-bold">{score}</span>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">/ {maxScore}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 bg-zinc-800 rounded overflow-hidden"
      >
        <div
          data-testid="progress-fill"
          className="h-full bg-blue-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// ReputationPlatformList
// =============================================================================

interface ReputationPlatformListProps {
  platforms: PlatformReputation[];
  onPlatformClick?: (platform: string) => void;
}

export function ReputationPlatformList({
  platforms,
  onPlatformClick,
}: ReputationPlatformListProps) {
  if (platforms.length === 0) {
    return (
      <div data-testid="reputation-platform-list" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No platforms connected</p>
      </div>
    );
  }

  return (
    <div data-testid="reputation-platform-list" className="space-y-2">
      {platforms.map((platform) => (
        <div
          key={platform.platform}
          data-testid="platform-item"
          onClick={() => onPlatformClick?.(platform.platform)}
          className={`ascii-box p-3 ${onPlatformClick ? 'cursor-pointer hover:border-blue-400/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{platform.icon}</span>
              <div>
                <div className="font-mono text-sm">{platform.name}</div>
                {platform.level && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {platform.level}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {platform.connected ? (
                <span
                  data-testid="connected-indicator"
                  className="w-2 h-2 rounded-full bg-green-400"
                />
              ) : (
                <span
                  data-testid="disconnected-indicator"
                  className="w-2 h-2 rounded-full bg-zinc-500"
                />
              )}
              <div className="text-right">
                <div className="font-mono font-bold">{platform.score}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  / {platform.maxScore}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <div data-testid="badge-count" className="text-[hsl(var(--muted-foreground))]">
              {platform.badges.length} badges
            </div>
            {platform.lastUpdated && (
              <div data-testid="last-updated" className="text-[hsl(var(--muted-foreground))] font-mono">
                {new Date(platform.lastUpdated).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// ReputationTrendChart
// =============================================================================

interface ReputationTrendChartProps {
  trends: ReputationTrend[];
  title?: string;
  showPeriodSelector?: boolean;
}

export function ReputationTrendChart({
  trends,
  title,
  showPeriodSelector,
}: ReputationTrendChartProps) {
  if (trends.length === 0) {
    return (
      <div data-testid="reputation-trend-chart" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No trend data available</p>
      </div>
    );
  }

  const currentScore = trends[trends.length - 1]!.score;
  const previousScore = trends.length > 1 ? trends[0]!.score : currentScore;
  const change = currentScore - previousScore;
  const isPositive = change >= 0;

  // Calculate chart points for simple SVG visualization
  const maxScore = Math.max(...trends.map((t) => t.score));
  const minScore = Math.min(...trends.map((t) => t.score));
  const range = maxScore - minScore || 1;

  const points = trends
    .map((t, i) => {
      const x = (i / (trends.length - 1 || 1)) * 100;
      const y = 100 - ((t.score - minScore) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div data-testid="reputation-trend-chart" className="ascii-box p-4 border-blue-400/30 border">
      <div className="flex items-center justify-between mb-4">
        {title && <h3 className="font-mono font-bold text-sm">{title}</h3>}
        {showPeriodSelector && (
          <div data-testid="period-selector" className="flex gap-2">
            {['7D', '30D', '90D', '1Y'].map((period) => (
              <button
                key={period}
                className="px-2 py-1 text-xs font-mono bg-zinc-800 rounded hover:bg-zinc-700"
              >
                {period}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-mono font-bold">{currentScore}</span>
        <div data-testid="trend-indicator" className="flex items-center gap-1">
          {isPositive ? (
            <span data-testid="positive-trend" className="text-green-400 text-sm">
              ↑ +{change}
            </span>
          ) : (
            <span data-testid="negative-trend" className="text-red-400 text-sm">
              ↓ {change}
            </span>
          )}
        </div>
      </div>

      <div data-testid="chart-area" className="h-24 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-400"
            points={points}
          />
          <polyline
            fill="url(#gradient)"
            stroke="none"
            points={`0,100 ${points} 100,100`}
          />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(96, 165, 250)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(96, 165, 250)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// =============================================================================
// ReputationComparisonCard
// =============================================================================

interface ReputationComparisonCardProps {
  platforms: PlatformReputation[];
  showSuggestions?: boolean;
}

export function ReputationComparisonCard({
  platforms,
  showSuggestions,
}: ReputationComparisonCardProps) {
  if (platforms.length === 0) {
    return (
      <div data-testid="reputation-comparison-card" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No platforms to compare</p>
      </div>
    );
  }

  const sortedPlatforms = [...platforms].sort(
    (a, b) => (b.score / b.maxScore) - (a.score / a.maxScore)
  );
  const lowestPlatform = sortedPlatforms[sortedPlatforms.length - 1]!;

  return (
    <div data-testid="reputation-comparison-card" className="ascii-box p-4 border-blue-400/30 border">
      <h3 className="font-mono font-bold text-sm mb-4">Platform Comparison</h3>

      <div className="space-y-3">
        {sortedPlatforms.map((platform, index) => {
          const percentage = Math.round((platform.score / platform.maxScore) * 100);
          const isStrongest = index === 0;

          return (
            <div key={platform.platform}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span>{platform.icon}</span>
                  <span className="capitalize">{platform.platform}</span>
                  {isStrongest && (
                    <span
                      data-testid="strongest-platform"
                      className="text-green-400 text-[10px]"
                    >
                      ★
                    </span>
                  )}
                </div>
                <span className="font-mono">{percentage}%</span>
              </div>
              <div
                data-testid="comparison-bar"
                className="h-2 bg-zinc-800 rounded overflow-hidden"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    isStrongest ? 'bg-green-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showSuggestions && (
        <div data-testid="improvement-suggestions" className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Improve your {lowestPlatform.name} reputation to boost your overall score.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ReputationConnectionPanel
// =============================================================================

interface ReputationConnectionPanelProps {
  platforms: PlatformReputation[];
  onConnect: (platform: string) => void;
  onDisconnect: (platform: string) => void;
  connectingPlatform?: string;
}

export function ReputationConnectionPanel({
  platforms,
  onConnect,
  onDisconnect,
  connectingPlatform,
}: ReputationConnectionPanelProps) {
  return (
    <div data-testid="reputation-connection-panel" className="ascii-box p-4 border-blue-400/30 border">
      <h3 className="font-mono font-bold text-sm mb-4">Connected Platforms</h3>

      <div className="space-y-2">
        {platforms.map((platform) => {
          const isConnecting = connectingPlatform === platform.platform;

          return (
            <div
              key={platform.platform}
              data-testid="connection-item"
              className="flex items-center justify-between p-2 bg-zinc-800/50 rounded"
            >
              <div className="flex items-center gap-2">
                <span>{platform.icon}</span>
                <span className="font-mono text-sm">{platform.name}</span>
                {platform.connected && (
                  <span className="text-xs text-green-400">Connected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isConnecting && (
                  <span data-testid="connecting-indicator" className="animate-spin text-xs">
                    ⟳
                  </span>
                )}
                {platform.connected ? (
                  <button
                    onClick={() => onDisconnect(platform.platform)}
                    disabled={isConnecting}
                    className="px-2 py-1 text-xs font-mono bg-red-400/20 text-red-400 rounded hover:bg-red-400/30 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onConnect(platform.platform)}
                    disabled={isConnecting}
                    className="px-2 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30 disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ReputationSummaryCard
// =============================================================================

interface ReputationSummaryCardProps {
  summary: ReputationSummary;
}

export function ReputationSummaryCard({ summary }: ReputationSummaryCardProps) {
  const percentage = Math.round((summary.totalScore / summary.maxPossibleScore) * 100);

  return (
    <div data-testid="reputation-summary-card" className="ascii-box p-6 border-blue-400/30 border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Total Reputation Score</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold">{summary.totalScore}</span>
            <span className="text-lg text-[hsl(var(--muted-foreground))]">/ {summary.maxPossibleScore}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Percentile</div>
          <div className="text-2xl font-mono font-bold text-green-400">
            Top {100 - summary.percentile}%
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 bg-zinc-800 rounded overflow-hidden mb-4"
      >
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div data-testid="connected-count" className="text-xl font-mono font-bold">
            {summary.connectedPlatforms}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            of {summary.totalPlatforms} platforms
          </div>
        </div>
        <div className="text-center">
          <div data-testid="total-badges" className="text-xl font-mono font-bold">
            {summary.totalBadges}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">badges earned</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-mono font-bold text-blue-400">
            {summary.percentile}%
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">percentile</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Level: </span>
          <span className="font-mono font-bold text-blue-400">{summary.overallLevel}</span>
        </div>
        <div data-testid="summary-last-updated" className="text-xs text-[hsl(var(--muted-foreground))]">
          Updated: {new Date(summary.lastUpdated).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ReputationDashboard
// =============================================================================

interface ReputationDashboardProps {
  platforms: PlatformReputation[];
  summary: ReputationSummary;
  trends: ReputationTrend[];
  onConnect: (platform: string) => void;
  onDisconnect: (platform: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  error?: string;
  address?: string;
  ensName?: string;
  connectingPlatform?: string;
}

export function ReputationDashboard({
  platforms,
  summary,
  trends,
  onConnect,
  onDisconnect,
  onRefresh,
  isLoading,
  error,
  address,
  ensName,
  connectingPlatform,
}: ReputationDashboardProps) {
  if (isLoading) {
    return (
      <div data-testid="reputation-dashboard" className="space-y-6">
        <div data-testid="loading-indicator" className="ascii-box p-6 text-center">
          <span className="animate-spin inline-block">⟳</span>
          <span className="ml-2">Loading reputation data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="reputation-dashboard" className="space-y-6">
        <div className="ascii-box p-6 text-center border-red-400/30 border">
          <span className="text-red-400">⚠</span>
          <span className="ml-2 text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="reputation-dashboard" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Reputation Dashboard</h2>
            {(ensName || address) && (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">
                {ensName && <span className="text-blue-400">{ensName}</span>}
                {ensName && address && <span className="mx-1">•</span>}
                {address && <span className="font-mono">{address}</span>}
              </div>
            )}
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      <ReputationSummaryCard summary={summary} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <ReputationTrendChart trends={trends} title="Score History" showPeriodSelector />

        {/* Comparison */}
        <ReputationComparisonCard platforms={platforms} showSuggestions />
      </div>

      {/* Platform List */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Platform Reputations
        </h3>
        <ReputationPlatformList platforms={platforms} />
      </div>

      {/* Connection Panel */}
      <ReputationConnectionPanel
        platforms={platforms}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        connectingPlatform={connectingPlatform}
      />
    </div>
  );
}

// =============================================================================
// useReputationDashboard Hook
// =============================================================================

export function useReputationDashboard(address: string) {
  const [platforms, setPlatforms] = useState<PlatformReputation[]>([]);
  const [summary, setSummary] = useState<ReputationSummary | null>(null);
  const [trends, setTrends] = useState<ReputationTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock platform data
      setPlatforms([
        {
          platform: 'optimism',
          name: 'Optimism Collective',
          icon: '🔴',
          connected: true,
          score: 850,
          maxScore: 1000,
          level: 'Contributor',
          badges: ['RetroPGF Participant', 'Delegate'],
          lastUpdated: Date.now(),
          details: {},
        },
        {
          platform: 'coinbase',
          name: 'Coinbase',
          icon: '🔵',
          connected: true,
          score: 720,
          maxScore: 1000,
          level: 'Verified',
          badges: ['KYC Verified'],
          lastUpdated: Date.now(),
          details: {},
        },
        {
          platform: 'gitcoin',
          name: 'Gitcoin Passport',
          icon: '🟢',
          connected: true,
          score: 45,
          maxScore: 100,
          level: 'Human',
          badges: ['Humanity Verified'],
          lastUpdated: Date.now(),
          details: {},
        },
        {
          platform: 'ens',
          name: 'ENS',
          icon: '📛',
          connected: true,
          score: 100,
          maxScore: 100,
          level: 'Domain Owner',
          badges: ['ENS Holder'],
          lastUpdated: Date.now(),
          details: {},
        },
      ]);

      setSummary({
        totalScore: 1715,
        maxPossibleScore: 2200,
        percentile: 92,
        connectedPlatforms: 4,
        totalPlatforms: 4,
        totalBadges: 5,
        lastUpdated: Date.now(),
        overallLevel: 'Expert Forecaster',
      });

      setTrends([
        { date: Date.now() - 14 * 86400000, score: 1500 },
        { date: Date.now() - 10 * 86400000, score: 1550 },
        { date: Date.now() - 5 * 86400000, score: 1650 },
        { date: Date.now(), score: 1715 },
      ]);

      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [address, loadDashboard]);

  const refresh = useCallback(() => {
    loadDashboard();
  }, [loadDashboard]);

  const connect = useCallback(async (platform: string) => {
    setConnectionStatus('connecting');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPlatforms((prev) =>
        prev.map((p) => (p.platform === platform ? { ...p, connected: true } : p))
      );
      setConnectionStatus('connected');
    } catch {
      setConnectionStatus('error');
    }
  }, []);

  const disconnect = useCallback(async (platform: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.platform === platform ? { ...p, connected: false } : p))
    );
  }, []);

  return {
    platforms,
    summary,
    trends,
    isLoading,
    error,
    connectionStatus,
    refresh,
    connect,
    disconnect,
  };
}
