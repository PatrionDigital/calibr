'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export interface BoostConfig {
  tierMultipliers: Record<SuperforecasterTier, number>;
  streakBonuses: Record<number, number>;
  achievementBonuses: Record<string, number>;
}

export interface RewardHistoryEntry {
  id: string;
  type: 'forecast' | 'resolution' | 'achievement' | 'bonus';
  baseAmount: number;
  boostMultiplier: number;
  finalAmount: number;
  breakdown: {
    tierBoost: number;
    streakBoost: number;
    achievementBoost: number;
  };
  timestamp: string;
  description: string;
}

export interface BoostBreakdown {
  baseAmount: number;
  tierMultiplier: number;
  tierName: SuperforecasterTier;
  streakBonus: number;
  streakDays: number;
  achievementBonus: number;
  achievementCount: number;
  totalMultiplier: number;
  finalAmount: number;
}

export interface AchievementBonusItem {
  id: string;
  name: string;
  bonus: number;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<SuperforecasterTier, {
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  APPRENTICE: {
    emoji: '🌱',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
  },
  JOURNEYMAN: {
    emoji: '🎯',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  EXPERT: {
    emoji: '🔮',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
  },
  MASTER: {
    emoji: '🧠',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
  },
  GRANDMASTER: {
    emoji: '👁️',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-300/10',
    borderColor: 'border-cyan-300/50',
  },
};

const REWARD_TYPE_ICONS: Record<string, string> = {
  forecast: '📊',
  resolution: '✅',
  achievement: '🏆',
  bonus: '💰',
};

// =============================================================================
// Utility Functions
// =============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

function getStreakBonus(streakDays: number, bonuses: Record<number, number>): number {
  const thresholds = Object.keys(bonuses)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (streakDays >= threshold) {
      return bonuses[threshold] ?? 0;
    }
  }
  return 0;
}

function getNextStreakMilestone(streakDays: number, bonuses: Record<number, number>): number | null {
  const thresholds = Object.keys(bonuses)
    .map(Number)
    .sort((a, b) => a - b);

  for (const threshold of thresholds) {
    if (threshold > streakDays) {
      return threshold;
    }
  }
  return null;
}

// =============================================================================
// BoostMultiplierDisplay Component
// =============================================================================

interface BoostMultiplierDisplayProps {
  tier: SuperforecasterTier;
  multiplier: number;
  variant?: 'default' | 'compact';
}

export function BoostMultiplierDisplay({
  tier,
  multiplier,
  variant = 'default',
}: BoostMultiplierDisplayProps) {
  const tierConfig = TIER_CONFIG[tier];
  const isHighlighted = multiplier >= 2.0;

  return (
    <div
      data-testid="boost-multiplier-display"
      data-tier={tier}
      data-variant={variant}
      className={cn(
        'ascii-box p-4 text-center',
        tierConfig.bgColor,
        tierConfig.borderColor,
        'border-2'
      )}
    >
      <span data-testid="multiplier-emoji" className="text-2xl block mb-2">
        {tierConfig.emoji}
      </span>
      <div
        data-testid="multiplier-value"
        data-highlighted={isHighlighted ? 'true' : 'false'}
        className={cn(
          'text-3xl font-mono font-bold',
          isHighlighted ? tierConfig.color : 'text-[hsl(var(--foreground))]'
        )}
      >
        {multiplier.toFixed(1)}x
      </div>
      <div data-testid="multiplier-tier" className="text-sm text-[hsl(var(--muted-foreground))]">
        {tier}
      </div>
      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
        Tier Boost
      </div>
    </div>
  );
}

// =============================================================================
// BoostCalculator Component
// =============================================================================

interface BoostCalculatorProps {
  baseAmount: number;
  tier: SuperforecasterTier;
  streakDays: number;
  achievements: string[];
  config: BoostConfig;
}

export function BoostCalculator({
  baseAmount,
  tier,
  streakDays,
  achievements,
  config,
}: BoostCalculatorProps) {
  const tierConfig = TIER_CONFIG[tier];
  const tierMultiplier = config.tierMultipliers[tier];
  const streakBonus = getStreakBonus(streakDays, config.streakBonuses);

  const achievementBonus = achievements.reduce((total, ach) => {
    return total + (config.achievementBonuses[ach] ?? 0);
  }, 0);

  const totalMultiplier = tierMultiplier + streakBonus + achievementBonus;
  const finalAmount = Math.round(baseAmount * totalMultiplier);

  return (
    <div
      data-testid="boost-calculator"
      className={cn('ascii-box p-4 bg-[hsl(var(--card))]', tierConfig.borderColor, 'border')}
    >
      <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-4">
        $CALIBR Boost Calculator
      </h3>

      {/* Base Amount */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">Base Reward</span>
        <span data-testid="calc-base-amount" className="font-mono">
          {baseAmount}
        </span>
      </div>

      {/* Tier Multiplier */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          {tier} Tier
        </span>
        <span data-testid="calc-tier-multiplier" className={cn('font-mono font-bold', tierConfig.color)}>
          {tierMultiplier.toFixed(1)}x
        </span>
      </div>

      {/* Streak Bonus */}
      {streakBonus > 0 && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            🔥 {streakDays} Day Streak
          </span>
          <span data-testid="calc-streak-bonus" className="font-mono text-orange-400">
            +{Math.round(streakBonus * 100)}%
          </span>
        </div>
      )}

      {/* Achievement Bonus */}
      {achievementBonus > 0 && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            🏆 Achievements ({achievements.length})
          </span>
          <span data-testid="calc-achievement-bonus" className="font-mono text-yellow-400">
            +{Math.round(achievementBonus * 100)}%
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[hsl(var(--border))] my-3" />

      {/* Total Multiplier */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold">Total Multiplier</span>
        <span data-testid="calc-total-multiplier" className={cn('font-mono font-bold text-lg', tierConfig.color)}>
          {totalMultiplier.toFixed(1)}x
        </span>
      </div>

      {/* Final Amount */}
      <div className={cn('ascii-box p-3 text-center', tierConfig.bgColor)}>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">Final Reward</div>
        <div data-testid="calc-final-amount" className="text-2xl font-mono font-bold">
          {finalAmount.toLocaleString()}
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">$CALIBR</div>
      </div>
    </div>
  );
}

// =============================================================================
// RewardHistoryItem Component
// =============================================================================

interface RewardHistoryItemProps {
  entry: RewardHistoryEntry;
  expandable?: boolean;
}

export function RewardHistoryItem({ entry, expandable = false }: RewardHistoryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = REWARD_TYPE_ICONS[entry.type] ?? '💰';

  return (
    <div
      data-testid="reward-history-item"
      onClick={() => expandable && setExpanded(!expanded)}
      className={cn(
        'ascii-box p-3 bg-[hsl(var(--card))]',
        expandable && 'cursor-pointer hover:bg-[hsl(var(--accent))]'
      )}
    >
      <div className="flex items-center gap-3">
        <span data-testid="reward-icon" className="text-xl">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span data-testid="reward-type" className="text-sm font-medium capitalize">
              {entry.type}
            </span>
            <span data-testid="reward-multiplier" className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
              {entry.boostMultiplier.toFixed(2)}x
            </span>
          </div>
          <p data-testid="reward-description" className="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {entry.description}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span data-testid="reward-base" className="text-xs text-[hsl(var(--muted-foreground))] line-through">
              {entry.baseAmount}
            </span>
            <span data-testid="reward-final" className="font-mono font-bold text-[hsl(var(--success))]">
              {entry.finalAmount}
            </span>
          </div>
          <span data-testid="reward-timestamp" className="text-xs text-[hsl(var(--muted-foreground))]">
            {formatTimestamp(entry.timestamp)}
          </span>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div data-testid="reward-breakdown" className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[hsl(var(--muted-foreground))]">Tier</div>
              <div className="font-mono">{entry.breakdown.tierBoost}x</div>
            </div>
            <div>
              <div className="text-[hsl(var(--muted-foreground))]">Streak</div>
              <div className="font-mono">+{Math.round(entry.breakdown.streakBoost * 100)}%</div>
            </div>
            <div>
              <div className="text-[hsl(var(--muted-foreground))]">Achievement</div>
              <div className="font-mono">+{Math.round(entry.breakdown.achievementBoost * 100)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RewardHistory Component
// =============================================================================

interface RewardHistoryProps {
  entries: RewardHistoryEntry[];
  title?: string;
  showTotal?: boolean;
  maxEntries?: number;
}

export function RewardHistory({
  entries,
  title,
  showTotal = false,
  maxEntries,
}: RewardHistoryProps) {
  const displayEntries = maxEntries ? entries.slice(0, maxEntries) : entries;
  const total = entries.reduce((sum, entry) => sum + entry.finalAmount, 0);
  const hasMore = maxEntries && entries.length > maxEntries;

  if (entries.length === 0) {
    return (
      <div
        data-testid="reward-history-empty"
        className="ascii-box p-6 text-center bg-[hsl(var(--muted))]/30"
      >
        <p className="text-[hsl(var(--muted-foreground))]">No rewards yet</p>
      </div>
    );
  }

  return (
    <div data-testid="reward-history" className="space-y-3">
      {title && (
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          {title}
        </h3>
      )}

      {showTotal && (
        <div className="ascii-box p-3 bg-[hsl(var(--muted))]/30 text-center">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Total Earned</div>
          <div data-testid="history-total" className="text-xl font-mono font-bold text-[hsl(var(--success))]">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">$CALIBR</div>
        </div>
      )}

      <div className="space-y-2">
        {displayEntries.map((entry) => (
          <RewardHistoryItem key={entry.id} entry={entry} expandable />
        ))}
      </div>

      {hasMore && (
        <button
          data-testid="view-all-link"
          className="w-full py-2 text-sm font-mono text-[hsl(var(--primary))] hover:underline"
        >
          View all ({entries.length} rewards)
        </button>
      )}
    </div>
  );
}

// =============================================================================
// StreakBonus Component
// =============================================================================

interface StreakBonusProps {
  streakDays: number;
  bonusPercentage: number;
  nextMilestone?: number;
  nextBonus?: number;
}

export function StreakBonus({
  streakDays,
  bonusPercentage,
  nextMilestone,
  nextBonus,
}: StreakBonusProps) {
  const isActive = bonusPercentage > 0;
  const daysUntilNext = nextMilestone ? nextMilestone - streakDays : 0;

  return (
    <div
      data-testid="streak-bonus"
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        'ascii-box p-4',
        isActive ? 'bg-orange-500/10 border-orange-500/30' : 'bg-[hsl(var(--muted))]/30',
        'border'
      )}
    >
      <div className="flex items-center gap-3">
        <span data-testid="streak-flame" className="text-2xl">
          🔥
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span data-testid="streak-days" className="font-mono font-bold text-lg">
              {streakDays}
            </span>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">day streak</span>
          </div>
          {isActive && (
            <span
              data-testid="streak-bonus-percent"
              className="text-sm font-mono text-orange-400"
            >
              +{bonusPercentage}% boost
            </span>
          )}
        </div>
      </div>

      {nextMilestone && daysUntilNext > 0 && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">
            <span data-testid="days-until-next">{daysUntilNext}</span> days until{' '}
            <span data-testid="next-milestone">{nextMilestone}</span>-day bonus
            {nextBonus && ` (+${nextBonus}%)`}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// AchievementBonus Component
// =============================================================================

interface AchievementBonusProps {
  achievements: AchievementBonusItem[];
  totalBonus: number;
  showList?: boolean;
}

export function AchievementBonus({
  achievements,
  totalBonus,
  showList = false,
}: AchievementBonusProps) {
  if (achievements.length === 0) {
    return (
      <div
        data-testid="achievement-bonus-empty"
        className="ascii-box p-4 bg-[hsl(var(--muted))]/30 text-center"
      >
        <span className="text-[hsl(var(--muted-foreground))]">No achievement bonuses yet</span>
      </div>
    );
  }

  return (
    <div
      data-testid="achievement-bonus"
      className="ascii-box p-4 bg-yellow-500/10 border border-yellow-500/30"
    >
      <div className="flex items-center gap-3">
        <span data-testid="achievement-icon" className="text-2xl">
          🏆
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span data-testid="achievement-count" className="font-mono font-bold text-lg">
              {achievements.length}
            </span>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">achievements</span>
          </div>
          <span
            data-testid="achievement-total-bonus"
            className="text-sm font-mono text-yellow-400"
          >
            +{totalBonus}% boost
          </span>
        </div>
      </div>

      {showList && (
        <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] space-y-2">
          {achievements.map((ach) => (
            <div key={ach.id} className="flex justify-between text-sm">
              <span>{ach.name}</span>
              <span data-testid="individual-bonus" className="font-mono text-yellow-400">
                +{ach.bonus}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BoostPreview Component
// =============================================================================

interface BoostPreviewProps {
  breakdown: BoostBreakdown;
  showBreakdown?: boolean;
  variant?: 'default' | 'compact';
}

export function BoostPreview({
  breakdown,
  showBreakdown = false,
  variant = 'default',
}: BoostPreviewProps) {
  const tierConfig = TIER_CONFIG[breakdown.tierName];
  const boostGained = breakdown.finalAmount - breakdown.baseAmount;

  return (
    <div
      data-testid="boost-preview"
      data-variant={variant}
      className={cn('ascii-box p-4 bg-[hsl(var(--card))]', tierConfig.borderColor, 'border')}
    >
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Before</div>
          <div data-testid="preview-before" className="font-mono text-xl">
            {breakdown.baseAmount}
          </div>
        </div>

        <span data-testid="preview-arrow" className="text-2xl">→</span>

        <div className="text-center">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">After</div>
          <div data-testid="preview-after" className={cn('font-mono text-xl font-bold', tierConfig.color)}>
            {breakdown.finalAmount}
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <span
          data-testid="preview-boost-gained"
          className="text-sm font-mono text-[hsl(var(--success))]"
        >
          +{boostGained} $CALIBR
        </span>
      </div>

      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] space-y-2">
          <div data-testid="preview-tier-section" className="flex justify-between text-sm">
            <span>{breakdown.tierName} Tier</span>
            <span className="font-mono">{breakdown.tierMultiplier}x</span>
          </div>
          {breakdown.streakBonus > 0 && (
            <div data-testid="preview-streak-section" className="flex justify-between text-sm">
              <span>🔥 {breakdown.streakDays}d Streak</span>
              <span className="font-mono">+{Math.round(breakdown.streakBonus * 100)}%</span>
            </div>
          )}
          {breakdown.achievementBonus > 0 && (
            <div data-testid="preview-achievement-section" className="flex justify-between text-sm">
              <span>🏆 {breakdown.achievementCount} Achievements</span>
              <span className="font-mono">+{Math.round(breakdown.achievementBonus * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TotalBoostSummary Component
// =============================================================================

interface TotalBoostSummaryProps {
  tier: SuperforecasterTier;
  tierMultiplier: number;
  streakBonus: number;
  achievementBonus: number;
  totalMultiplier: number;
}

export function TotalBoostSummary({
  tier,
  tierMultiplier,
  streakBonus,
  achievementBonus,
  totalMultiplier,
}: TotalBoostSummaryProps) {
  const tierConfig = TIER_CONFIG[tier];

  return (
    <div
      data-testid="total-boost-summary"
      data-tier={tier}
      className={cn(
        'ascii-box p-5 text-center',
        tierConfig.bgColor,
        tierConfig.borderColor,
        'border-2'
      )}
    >
      <div className="mb-4">
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Total Boost</div>
        <div
          data-testid="total-multiplier"
          className={cn('text-4xl font-mono font-bold', tierConfig.color)}
        >
          {totalMultiplier.toFixed(1)}x
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">{tier}</div>
          <div data-testid="tier-contribution" className="font-mono font-bold">
            {tierMultiplier.toFixed(1)}x
          </div>
        </div>
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">🔥 Streak</div>
          <div data-testid="streak-contribution" className="font-mono font-bold text-orange-400">
            +{Math.round(streakBonus * 100)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">🏆 Achieve</div>
          <div data-testid="achievement-contribution" className="font-mono font-bold text-yellow-400">
            +{Math.round(achievementBonus * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// useRewardBoosts Hook
// =============================================================================

interface UseRewardBoostsOptions {
  tier: SuperforecasterTier;
  streakDays: number;
  achievements: string[];
  config: BoostConfig;
}

export function useRewardBoosts({
  tier,
  streakDays,
  achievements,
  config,
}: UseRewardBoostsOptions) {
  const tierMultiplier = useMemo(
    () => config.tierMultipliers[tier],
    [tier, config.tierMultipliers]
  );

  const streakBonus = useMemo(
    () => getStreakBonus(streakDays, config.streakBonuses),
    [streakDays, config.streakBonuses]
  );

  const achievementBonus = useMemo(
    () => achievements.reduce((total, ach) => total + (config.achievementBonuses[ach] ?? 0), 0),
    [achievements, config.achievementBonuses]
  );

  const totalMultiplier = useMemo(
    () => tierMultiplier + streakBonus + achievementBonus,
    [tierMultiplier, streakBonus, achievementBonus]
  );

  const nextStreakMilestone = useMemo(
    () => getNextStreakMilestone(streakDays, config.streakBonuses),
    [streakDays, config.streakBonuses]
  );

  const calculateReward = (baseAmount: number) => {
    return Math.round(baseAmount * totalMultiplier);
  };

  const getBreakdown = (baseAmount: number): BoostBreakdown => ({
    baseAmount,
    tierMultiplier,
    tierName: tier,
    streakBonus,
    streakDays,
    achievementBonus,
    achievementCount: achievements.length,
    totalMultiplier,
    finalAmount: calculateReward(baseAmount),
  });

  return {
    tierMultiplier,
    streakBonus,
    achievementBonus,
    totalMultiplier,
    nextStreakMilestone,
    calculateReward,
    getBreakdown,
  };
}
