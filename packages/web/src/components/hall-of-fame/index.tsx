'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export interface FeaturedForecasterData {
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  rank: number;
  compositeScore: number;
  brierScore: number;
  calibrationScore: number;
  totalForecasts: number;
  streakDays: number;
  bio?: string;
  achievements: string[];
  joinedAt: string;
  featuredReason?: string;
}

export interface HistoricalChampionData {
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  period: string;
  periodLabel: string;
  finalRank: number;
  compositeScore: number;
  brierScore: number;
  totalForecasts: number;
  notableAchievement?: string;
}

export interface HallOfFamePeriod {
  id: string;
  label: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<SuperforecasterTier, {
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  APPRENTICE: {
    emoji: '🌱',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
    glowColor: 'shadow-green-400/10',
  },
  JOURNEYMAN: {
    emoji: '🎯',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    glowColor: 'shadow-blue-400/10',
  },
  EXPERT: {
    emoji: '🔮',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    glowColor: 'shadow-purple-400/15',
  },
  MASTER: {
    emoji: '🧠',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    glowColor: 'shadow-yellow-400/15',
  },
  GRANDMASTER: {
    emoji: '👁️',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-300/10',
    borderColor: 'border-cyan-300/50',
    glowColor: 'shadow-cyan-300/20',
  },
};

// =============================================================================
// FeaturedForecaster Component
// =============================================================================

interface FeaturedForecasterProps {
  data: FeaturedForecasterData;
  featured?: boolean;
  onClick?: (userId: string) => void;
}

export function FeaturedForecaster({
  data,
  featured = false,
  onClick,
}: FeaturedForecasterProps) {
  const tierConfig = TIER_CONFIG[data.tier];

  return (
    <motion.div
      data-testid="featured-forecaster"
      data-tier={data.tier}
      data-featured={featured ? 'true' : 'false'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onClick?.(data.userId)}
      className={cn(
        'ascii-box p-5 cursor-pointer transition-all hover:scale-[1.02]',
        'bg-[hsl(var(--card))] border-2',
        tierConfig.borderColor,
        featured && `shadow-lg ${tierConfig.glowColor}`
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tierConfig.emoji}</span>
          <div>
            <h3
              data-testid="forecaster-name"
              className={cn('font-bold text-lg', tierConfig.color)}
            >
              {data.displayName}
            </h3>
            <div className="flex items-center gap-2">
              <span
                data-testid="forecaster-tier"
                className={cn(
                  'text-xs font-mono px-1.5 py-0.5 border rounded',
                  tierConfig.color,
                  tierConfig.bgColor,
                  tierConfig.borderColor
                )}
              >
                {data.tier}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span
            data-testid="forecaster-rank"
            className="text-2xl font-mono font-bold text-[hsl(var(--foreground))]"
          >
            #{data.rank}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="ascii-box p-2 bg-[hsl(var(--muted))]/30">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Score</div>
          <div data-testid="forecaster-score" className="font-mono font-bold text-lg">
            {data.compositeScore}
          </div>
        </div>
        <div className="ascii-box p-2 bg-[hsl(var(--muted))]/30">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Brier</div>
          <div data-testid="forecaster-brier" className="font-mono font-bold text-lg">
            {data.brierScore.toFixed(2)}
          </div>
        </div>
        <div className="ascii-box p-2 bg-[hsl(var(--muted))]/30">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Calibration</div>
          <div data-testid="forecaster-calibration" className="font-mono font-bold text-lg">
            {Math.round(data.calibrationScore * 100)}%
          </div>
        </div>
        <div className="ascii-box p-2 bg-[hsl(var(--muted))]/30">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Forecasts</div>
          <div data-testid="forecaster-forecasts" className="font-mono font-bold text-lg">
            {data.totalForecasts}
          </div>
        </div>
      </div>

      {/* Streak */}
      {data.streakDays > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-orange-400">🔥</span>
          <span data-testid="forecaster-streak" className="font-mono text-orange-400">
            {data.streakDays}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">day streak</span>
        </div>
      )}

      {/* Bio */}
      {data.bio && (
        <p
          data-testid="forecaster-bio"
          className="text-sm text-[hsl(var(--muted-foreground))] mb-3 line-clamp-2"
        >
          {data.bio}
        </p>
      )}

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <div data-testid="forecaster-achievements" className="flex flex-wrap gap-1 mb-3">
          {data.achievements.slice(0, 4).map((achievement) => (
            <span
              key={achievement}
              className="text-xs px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded"
            >
              {achievement}
            </span>
          ))}
          {data.achievements.length > 4 && (
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              +{data.achievements.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Featured Reason */}
      {data.featuredReason && (
        <div
          data-testid="featured-reason"
          className={cn(
            'text-xs p-2 rounded border',
            tierConfig.bgColor,
            tierConfig.borderColor,
            tierConfig.color
          )}
        >
          ⭐ {data.featuredReason}
        </div>
      )}

      {/* View Profile Button */}
      <button
        data-testid="view-profile-button"
        className={cn(
          'w-full mt-4 py-2 text-sm font-mono border rounded transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          tierConfig.borderColor
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(data.userId);
        }}
      >
        View Profile
      </button>
    </motion.div>
  );
}

// =============================================================================
// LegendHighlight Component
// =============================================================================

interface LegendHighlightProps {
  data: FeaturedForecasterData;
}

export function LegendHighlight({ data }: LegendHighlightProps) {
  // Only render for GRANDMASTER tier
  if (data.tier !== 'GRANDMASTER') {
    return null;
  }

  const tierConfig = TIER_CONFIG[data.tier];

  return (
    <motion.div
      data-testid="legend-highlight"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'ascii-box p-6 bg-gradient-to-br from-[hsl(var(--card))] to-cyan-950/20',
        'border-2 shadow-lg',
        tierConfig.borderColor,
        tierConfig.glowColor
      )}
    >
      {/* Legend Badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-xs font-mono text-cyan-300 tracking-widest">★ LEGEND ★</span>
      </div>

      {/* Large Emoji */}
      <div className="flex justify-center mb-4">
        <span data-testid="legend-emoji" className="text-6xl">
          {tierConfig.emoji}
        </span>
      </div>

      {/* Name */}
      <h2
        data-testid="legend-name"
        className="text-center text-2xl font-bold text-cyan-300 mb-2"
      >
        {data.displayName}
      </h2>

      {/* Stats */}
      <div data-testid="legend-stats" className="flex justify-center gap-6 mb-4">
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[hsl(var(--foreground))]">
            #{data.rank}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Rank</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[hsl(var(--foreground))]">
            {data.compositeScore}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold text-[hsl(var(--foreground))]">
            {data.brierScore.toFixed(2)}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Brier</div>
        </div>
      </div>

      {/* Achievement Count */}
      <div className="text-center">
        <span
          data-testid="legend-achievement-count"
          className="inline-flex items-center gap-1 text-sm text-cyan-300"
        >
          🏆 {data.achievements.length} achievements
        </span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// HallOfFameGrid Component
// =============================================================================

interface HallOfFameGridProps {
  forecasters: FeaturedForecasterData[];
  showLegend?: boolean;
  onForecasterClick?: (userId: string) => void;
}

export function HallOfFameGrid({
  forecasters,
  showLegend = false,
  onForecasterClick,
}: HallOfFameGridProps) {
  const sortedForecasters = useMemo(
    () => [...forecasters].sort((a, b) => a.rank - b.rank),
    [forecasters]
  );

  if (forecasters.length === 0) {
    return (
      <div
        data-testid="hall-of-fame-empty"
        className="ascii-box p-8 text-center bg-[hsl(var(--muted))]/30"
      >
        <span className="text-4xl mb-4 block">🏆</span>
        <p className="text-[hsl(var(--muted-foreground))]">
          No featured forecasters yet. Start forecasting to appear here!
        </p>
      </div>
    );
  }

  const topForecaster = sortedForecasters[0];
  const showLegendHighlight = showLegend && topForecaster?.tier === 'GRANDMASTER';

  return (
    <div data-testid="hall-of-fame-grid" className="space-y-6">
      {/* Legend Highlight for #1 GRANDMASTER */}
      {showLegendHighlight && topForecaster && (
        <LegendHighlight data={topForecaster} />
      )}

      {/* Grid of forecasters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedForecasters.map((forecaster, index) => (
          <FeaturedForecaster
            key={forecaster.userId}
            data={forecaster}
            featured={index === 0}
            onClick={onForecasterClick}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// HallOfFameHeader Component
// =============================================================================

interface HallOfFameHeaderProps {
  className?: string;
}

export function HallOfFameHeader({ className }: HallOfFameHeaderProps) {
  return (
    <div
      data-testid="hall-of-fame-header"
      className={cn('text-center py-8', className)}
    >
      <div data-testid="header-trophy" className="text-5xl mb-4">
        🏆
      </div>
      <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2 tracking-wider">
        HALL OF FAME
      </h1>
      <p
        data-testid="hall-of-fame-subtitle"
        className="text-[hsl(var(--muted-foreground))] max-w-md mx-auto"
      >
        Celebrating the greatest superforecasters in prediction markets
      </p>
    </div>
  );
}

// =============================================================================
// HistoricalChampion Component
// =============================================================================

interface HistoricalChampionProps {
  data: HistoricalChampionData;
}

export function HistoricalChampion({ data }: HistoricalChampionProps) {
  const tierConfig = TIER_CONFIG[data.tier];

  return (
    <div
      data-testid="historical-champion"
      data-tier={data.tier}
      className={cn(
        'ascii-box p-4 bg-[hsl(var(--card))] border',
        tierConfig.borderColor
      )}
    >
      {/* Trophy and Period */}
      <div className="flex items-center justify-between mb-3">
        <span data-testid="champion-trophy" className="text-2xl">🏆</span>
        <span
          data-testid="champion-period"
          className="text-sm font-mono text-[hsl(var(--muted-foreground))]"
        >
          {data.periodLabel}
        </span>
      </div>

      {/* Champion Info */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{tierConfig.emoji}</span>
        <div>
          <h4
            data-testid="champion-name"
            className={cn('font-bold', tierConfig.color)}
          >
            {data.displayName}
          </h4>
          <span
            data-testid="champion-tier"
            className={cn(
              'text-xs font-mono px-1 py-0.5 border rounded',
              tierConfig.color,
              tierConfig.bgColor,
              tierConfig.borderColor
            )}
          >
            {data.tier}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-[hsl(var(--muted-foreground))]">Final Score</span>
        <span data-testid="champion-score" className="font-mono font-bold">
          {data.compositeScore}
        </span>
      </div>

      {/* Notable Achievement */}
      {data.notableAchievement && (
        <div
          data-testid="champion-achievement"
          className={cn(
            'text-xs p-2 rounded border mt-3',
            tierConfig.bgColor,
            tierConfig.borderColor
          )}
        >
          ⭐ {data.notableAchievement}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HallOfFamePeriodSelector Component
// =============================================================================

interface HallOfFamePeriodSelectorProps {
  periods: HallOfFamePeriod[];
  selectedPeriod: string;
  onPeriodChange: (periodId: string) => void;
}

export function HallOfFamePeriodSelector({
  periods,
  selectedPeriod,
  onPeriodChange,
}: HallOfFamePeriodSelectorProps) {
  return (
    <div
      data-testid="period-selector"
      className="flex flex-wrap gap-2 justify-center"
    >
      {periods.map((period) => {
        const isSelected = period.id === selectedPeriod;
        return (
          <button
            key={period.id}
            data-testid={`period-option-${period.id}`}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => {
              if (!isSelected) {
                onPeriodChange(period.id);
              }
            }}
            className={cn(
              'px-4 py-2 text-sm font-mono border rounded transition-colors',
              isSelected
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]'
                : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
            )}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
