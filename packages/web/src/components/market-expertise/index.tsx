'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ExpertiseLevel = 'expert' | 'advanced' | 'intermediate' | 'beginner' | 'novice';
export type TrendDirection = 'improving' | 'declining' | 'stable';

export interface MarketCategory {
  key: string;
  label: string;
  icon: string;
}

export interface ExpertiseStats {
  totalForecasts: number;
  accuracy: number;
  calibration: number;
  brierScore: number;
  avgConfidence: number;
  winRate: number;
  profitLoss: number;
}

export interface CategoryExpertise {
  category: MarketCategory;
  level: ExpertiseLevel;
  score: number;
  percentile: number;
  stats: ExpertiseStats;
  rank: number;
  totalInCategory: number;
  trend: TrendDirection;
  recentAccuracy: number;
  badges: string[];
}

export interface LeaderboardEntry {
  address: string;
  displayName: string;
  score: number;
  rank: number;
}

// =============================================================================
// ExpertiseBadge Component
// =============================================================================

export interface ExpertiseBadgeProps {
  level: ExpertiseLevel;
  score?: number;
  variant?: 'default' | 'compact';
}

export function ExpertiseBadge({ level, score, variant = 'default' }: ExpertiseBadgeProps) {
  const levelColors: Record<ExpertiseLevel, string> = {
    expert: 'text-yellow-400',
    advanced: 'text-purple-400',
    intermediate: 'text-blue-400',
    beginner: 'text-green-400',
    novice: 'text-zinc-400',
  };

  const levelIcons: Record<ExpertiseLevel, string> = {
    expert: '[★★★]',
    advanced: '[★★☆]',
    intermediate: '[★☆☆]',
    beginner: '[●●○]',
    novice: '[●○○]',
  };

  return (
    <div
      data-testid="expertise-badge"
      className={`inline-flex items-center gap-2 font-mono ${levelColors[level]} ${variant}`}
    >
      <span className="text-xs">{levelIcons[level]}</span>
      <span className="text-sm capitalize">{level}</span>
      {score !== undefined && (
        <span className="text-xs opacity-75">({score})</span>
      )}
    </div>
  );
}

// =============================================================================
// CategoryExpertiseCard Component
// =============================================================================

export interface CategoryExpertiseCardProps {
  expertise: CategoryExpertise;
  showRank?: boolean;
  showStats?: boolean;
  showTrend?: boolean;
}

export function CategoryExpertiseCard({
  expertise,
  showRank = false,
  showStats = false,
  showTrend = false,
}: CategoryExpertiseCardProps) {
  const trendColors: Record<TrendDirection, string> = {
    improving: 'text-green-400',
    declining: 'text-red-400',
    stable: 'text-yellow-400',
  };

  const trendIcons: Record<TrendDirection, string> = {
    improving: '[^]',
    declining: '[v]',
    stable: '[-]',
  };

  return (
    <div data-testid="category-expertise-card" className="ascii-box p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span data-testid="category-icon" className="text-xl">
            {expertise.category.icon}
          </span>
          <span className="font-mono font-bold">{expertise.category.label}</span>
        </div>
        <ExpertiseBadge level={expertise.level} />
      </div>

      {/* Score and Percentile */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div data-testid="expertise-score" className="text-3xl font-mono font-bold text-blue-400">
            {expertise.score}
          </div>
          <div className="text-xs text-zinc-500 font-mono">expertise score</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono text-green-400">
            Top {100 - expertise.percentile}%
          </div>
          {showRank && (
            <div data-testid="rank-position" className="text-xs text-zinc-500 font-mono">
              #{expertise.rank} of {expertise.totalInCategory}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm font-mono">
          <div>
            <div data-testid="total-forecasts" className="text-white">
              {expertise.stats.totalForecasts}
            </div>
            <div className="text-xs text-zinc-500">forecasts</div>
          </div>
          <div>
            <div data-testid="accuracy-stat" className="text-white">
              {Math.round(expertise.stats.accuracy * 100)}%
            </div>
            <div className="text-xs text-zinc-500">accuracy</div>
          </div>
          <div>
            <div className="text-white">{Math.round(expertise.stats.winRate * 100)}%</div>
            <div className="text-xs text-zinc-500">win rate</div>
          </div>
        </div>
      )}

      {/* Trend */}
      {showTrend && (
        <div className="flex items-center gap-2 mb-4">
          <span
            data-testid="trend-indicator"
            className={`font-mono ${trendColors[expertise.trend]}`}
          >
            {trendIcons[expertise.trend]}
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            Recent: {Math.round(expertise.recentAccuracy * 100)}% accuracy
          </span>
        </div>
      )}

      {/* Badges */}
      {expertise.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {expertise.badges.map((badge) => (
            <span
              key={badge}
              className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ExpertiseRadarChart Component
// =============================================================================

export interface ExpertiseRadarChartProps {
  expertise: CategoryExpertise[];
  title?: string;
  showLegend?: boolean;
  height?: number;
  highlightStrongest?: boolean;
}

export function ExpertiseRadarChart({
  expertise,
  title,
  showLegend = false,
  height = 300,
  highlightStrongest = false,
}: ExpertiseRadarChartProps) {
  const maxScore = Math.max(...expertise.map((e) => e.score));
  const strongest = expertise.reduce((a, b) => (a.score > b.score ? a : b));

  // Calculate radar points
  const numCategories = expertise.length;
  const angleStep = (2 * Math.PI) / numCategories;
  const centerX = 50;
  const centerY = 50;
  const maxRadius = 40;

  const points = expertise.map((e, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (e.score / maxScore) * maxRadius;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      labelX: centerX + (maxRadius + 8) * Math.cos(angle),
      labelY: centerY + (maxRadius + 8) * Math.sin(angle),
      expertise: e,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';

  return (
    <div
      data-testid="expertise-radar-chart"
      className="ascii-box p-4"
      style={{ height: `${height}px` }}
    >
      {title && <h3 className="font-mono font-bold text-sm mb-4">{title}</h3>}

      <div data-testid="radar-visualization" className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-48">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <circle
              key={r}
              cx={centerX}
              cy={centerY}
              r={maxRadius * r}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="0.5"
            />
          ))}

          {/* Grid lines */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={centerX + maxRadius * Math.cos(i * angleStep - Math.PI / 2)}
              y2={centerY + maxRadius * Math.sin(i * angleStep - Math.PI / 2)}
              stroke="#3f3f46"
              strokeWidth="0.5"
            />
          ))}

          {/* Data polygon */}
          <path d={pathD} fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" strokeWidth="2" />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="2"
              fill={highlightStrongest && p.expertise === strongest ? '#facc15' : '#3b82f6'}
            />
          ))}
        </svg>

        {/* Category labels */}
        <div className="absolute inset-0 pointer-events-none">
          {points.map((p, i) => (
            <div
              key={i}
              className="absolute text-xs font-mono text-zinc-400 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${p.labelX}%`,
                top: `${p.labelY}%`,
              }}
            >
              {p.expertise.category.label}
            </div>
          ))}
        </div>

        {highlightStrongest && (
          <div data-testid="strongest-highlight" className="hidden" />
        )}
      </div>

      {showLegend && (
        <div data-testid="chart-legend" className="mt-4 flex flex-wrap gap-3 text-xs font-mono">
          {expertise.map((e) => (
            <div key={e.category.key} className="flex items-center gap-1">
              <span>{e.category.icon}</span>
              <span className="text-zinc-400">{e.category.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ExpertiseLeaderboard Component
// =============================================================================

export interface ExpertiseLeaderboardProps {
  category: MarketCategory;
  entries: LeaderboardEntry[];
  currentUserAddress?: string;
}

export function ExpertiseLeaderboard({
  category,
  entries,
  currentUserAddress,
}: ExpertiseLeaderboardProps) {
  return (
    <div data-testid="expertise-leaderboard" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">
        [{category.icon} {category.label.toUpperCase()} LEADERBOARD]
      </h3>

      <div className="space-y-2">
        {entries.map((entry) => {
          const isCurrentUser = entry.address === currentUserAddress;
          return (
            <div
              key={entry.address}
              data-testid={isCurrentUser ? 'current-user-entry' : 'leaderboard-entry'}
              className={`flex items-center justify-between py-2 px-3 rounded font-mono text-sm ${
                isCurrentUser ? 'bg-blue-500/20 border border-blue-500' : 'bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 ${
                    entry.rank <= 3 ? 'text-yellow-400 font-bold' : 'text-zinc-500'
                  }`}
                >
                  #{entry.rank}
                </span>
                <span className={isCurrentUser ? 'text-blue-400' : 'text-white'}>
                  {entry.displayName}
                </span>
              </div>
              <span className="text-green-400">{entry.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// ExpertiseBreakdown Component
// =============================================================================

export interface ExpertiseBreakdownProps {
  expertise: CategoryExpertise[];
  showScores?: boolean;
  showProgressBars?: boolean;
  sortBy?: 'name' | 'score' | 'level';
  expandable?: boolean;
}

export function ExpertiseBreakdown({
  expertise,
  showScores = false,
  showProgressBars = false,
  sortBy = 'name',
  expandable = false,
}: ExpertiseBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const maxScore = Math.max(...expertise.map((e) => e.score));

  const levelOrder: Record<ExpertiseLevel, number> = {
    expert: 0,
    advanced: 1,
    intermediate: 2,
    beginner: 3,
    novice: 4,
  };

  const sortedExpertise = [...expertise].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.score - a.score;
      case 'level':
        return levelOrder[a.level] - levelOrder[b.level];
      default:
        return a.category.label.localeCompare(b.category.label);
    }
  });

  return (
    <div data-testid="expertise-breakdown" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">[EXPERTISE BREAKDOWN]</h3>

      <div className="space-y-3">
        {sortedExpertise.map((e) => (
          <div key={e.category.key}>
            <div
              data-testid="category-row"
              className="flex items-center justify-between py-2 border-b border-zinc-800"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{e.category.icon}</span>
                <span className="font-mono text-sm">{e.category.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {showScores && (
                  <span className="font-mono text-sm text-zinc-400">{e.score}</span>
                )}
                <ExpertiseBadge level={e.level} variant="compact" />
                {expandable && (
                  <button
                    data-testid="expand-button"
                    onClick={() =>
                      setExpandedCategory(
                        expandedCategory === e.category.key ? null : e.category.key
                      )
                    }
                    className="text-blue-400 font-mono text-sm"
                  >
                    {expandedCategory === e.category.key ? '[-]' : '[+]'}
                  </button>
                )}
              </div>
            </div>

            {showProgressBars && (
              <div data-testid="progress-bar" className="mt-2 h-1.5 bg-zinc-800 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(e.score / maxScore) * 100}%` }}
                />
              </div>
            )}

            {expandable && expandedCategory === e.category.key && (
              <div data-testid="expanded-details" className="mt-3 ml-8 space-y-2 text-sm font-mono text-zinc-400">
                <div>Forecasts: {e.stats.totalForecasts}</div>
                <div>Accuracy: {Math.round(e.stats.accuracy * 100)}%</div>
                <div>Rank: #{e.rank} of {e.totalInCategory}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ExpertiseSummary Component
// =============================================================================

export interface ExpertiseSummaryProps {
  expertise: CategoryExpertise[];
}

export function ExpertiseSummary({ expertise }: ExpertiseSummaryProps) {
  const strongest = expertise.reduce((a, b) => (a.score > b.score ? a : b));
  const weakest = expertise.reduce((a, b) => (a.score < b.score ? a : b));
  const avgScore = Math.round(expertise.reduce((sum, e) => sum + e.score, 0) / expertise.length);
  const improvingCount = expertise.filter((e) => e.trend === 'improving').length;

  // Calculate overall level based on average score
  const getOverallLevel = (score: number): ExpertiseLevel => {
    if (score >= 800) return 'expert';
    if (score >= 600) return 'advanced';
    if (score >= 400) return 'intermediate';
    if (score >= 200) return 'beginner';
    return 'novice';
  };

  const overallLevel = getOverallLevel(avgScore);

  return (
    <div data-testid="expertise-summary" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">[EXPERTISE SUMMARY]</h3>

      {/* Overall Level */}
      <div className="mb-4 p-3 bg-zinc-800/50 rounded">
        <div className="text-xs text-zinc-500 font-mono mb-1">Overall Level</div>
        <div data-testid="overall-level">
          <ExpertiseBadge level={overallLevel} score={avgScore} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div data-testid="categories-count" className="text-2xl font-mono font-bold text-blue-400">
            {expertise.length}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Categories</div>
        </div>
        <div>
          <div data-testid="average-score" className="text-2xl font-mono font-bold text-green-400">
            {avgScore}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Avg Score</div>
        </div>
      </div>

      {/* Strongest/Weakest */}
      <div className="space-y-3 text-sm font-mono">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Strongest:</span>
          <span data-testid="strongest-category" className="text-green-400">
            {strongest.category.icon} {strongest.category.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Needs work:</span>
          <span data-testid="weakest-category" className="text-yellow-400">
            {weakest.category.icon} {weakest.category.label}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Improving:</span>
          <span data-testid="improving-count" className="text-blue-400">
            {improvingCount} categories
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// useMarketExpertise Hook
// =============================================================================

export function useMarketExpertise(userAddress: string) {
  const [expertise, setExpertise] = useState<CategoryExpertise[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpertise = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!userAddress || userAddress === '0xinvalid' || userAddress.length < 10) {
        throw new Error('Invalid address');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      const mockCategories: MarketCategory[] = [
        { key: 'politics', label: 'Politics', icon: '🏛️' },
        { key: 'crypto', label: 'Crypto', icon: '₿' },
        { key: 'sports', label: 'Sports', icon: '⚽' },
        { key: 'tech', label: 'Technology', icon: '💻' },
      ];

      const mockExpertise: CategoryExpertise[] = [
        {
          category: mockCategories[0]!,
          level: 'expert',
          score: 892,
          percentile: 94,
          stats: {
            totalForecasts: 85,
            accuracy: 0.82,
            calibration: 0.78,
            brierScore: 0.15,
            avgConfidence: 0.72,
            winRate: 0.68,
            profitLoss: 245.50,
          },
          rank: 15,
          totalInCategory: 1250,
          trend: 'improving',
          recentAccuracy: 0.85,
          badges: ['Top 10%'],
        },
        {
          category: mockCategories[1]!,
          level: 'advanced',
          score: 720,
          percentile: 82,
          stats: {
            totalForecasts: 120,
            accuracy: 0.75,
            calibration: 0.72,
            brierScore: 0.18,
            avgConfidence: 0.68,
            winRate: 0.62,
            profitLoss: 180.25,
          },
          rank: 45,
          totalInCategory: 2100,
          trend: 'stable',
          recentAccuracy: 0.74,
          badges: [],
        },
        {
          category: mockCategories[2]!,
          level: 'intermediate',
          score: 480,
          percentile: 58,
          stats: {
            totalForecasts: 35,
            accuracy: 0.62,
            calibration: 0.65,
            brierScore: 0.22,
            avgConfidence: 0.60,
            winRate: 0.55,
            profitLoss: -25.00,
          },
          rank: 180,
          totalInCategory: 890,
          trend: 'declining',
          recentAccuracy: 0.55,
          badges: [],
        },
        {
          category: mockCategories[3]!,
          level: 'beginner',
          score: 150,
          percentile: 25,
          stats: {
            totalForecasts: 12,
            accuracy: 0.50,
            calibration: 0.55,
            brierScore: 0.28,
            avgConfidence: 0.55,
            winRate: 0.45,
            profitLoss: -50.00,
          },
          rank: 450,
          totalInCategory: 600,
          trend: 'improving',
          recentAccuracy: 0.58,
          badges: [],
        },
      ];

      setCategories(mockCategories);
      setExpertise(mockExpertise);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    loadExpertise();
  }, [loadExpertise]);

  const strongestCategory = useMemo(() => {
    if (expertise.length === 0) return null;
    return expertise.reduce((a, b) => (a.score > b.score ? a : b));
  }, [expertise]);

  const weakestCategory = useMemo(() => {
    if (expertise.length === 0) return null;
    return expertise.reduce((a, b) => (a.score < b.score ? a : b));
  }, [expertise]);

  const overallLevel = useMemo(() => {
    if (expertise.length === 0) return null;
    const avgScore = expertise.reduce((sum, e) => sum + e.score, 0) / expertise.length;
    if (avgScore >= 800) return 'expert';
    if (avgScore >= 600) return 'advanced';
    if (avgScore >= 400) return 'intermediate';
    if (avgScore >= 200) return 'beginner';
    return 'novice';
  }, [expertise]);

  return {
    expertise,
    categories,
    isLoading,
    error,
    strongestCategory,
    weakestCategory,
    overallLevel,
    refresh: loadExpertise,
  };
}
