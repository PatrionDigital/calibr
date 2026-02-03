'use client';

import { useState, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type BadgeTier = 'NOVICE' | 'APPRENTICE' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;
  category: 'tier' | 'streak' | 'accuracy' | 'volume' | 'special';
  requirement: string;
  earned: boolean;
  earnedAt: string | null;
}

export interface BadgeCollection {
  earned: BadgeDefinition[];
  available: BadgeDefinition[];
  totalCount: number;
  earnedCount: number;
}

// =============================================================================
// Tier Colors
// =============================================================================

const TIER_COLORS: Record<BadgeTier, { fill: string; stroke: string; text: string }> = {
  NOVICE: { fill: '#1a3a1a', stroke: '#00ff00', text: '#00ff00' },
  APPRENTICE: { fill: '#1a2a3a', stroke: '#00aaff', text: '#00aaff' },
  EXPERT: { fill: '#3a3a1a', stroke: '#ffaa00', text: '#ffaa00' },
  MASTER: { fill: '#2a1a3a', stroke: '#aa00ff', text: '#aa00ff' },
  GRANDMASTER: { fill: '#3a1a1a', stroke: '#ff0044', text: '#ff0044' },
};

// =============================================================================
// TierBadgeSvg Component
// =============================================================================

interface TierBadgeSvgProps {
  tier: BadgeTier;
  size?: number;
}

export function TierBadgeSvg({ tier, size = 48 }: TierBadgeSvgProps) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.NOVICE;
  const fontSize = Math.max(6, size / 8);

  return (
    <div data-testid="tier-badge-svg">
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="50,5 95,30 95,70 50,95 5,70 5,30"
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="2"
        />
        <polygon
          points="50,15 85,35 85,65 50,85 15,65 15,35"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="1"
          opacity="0.5"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={fontSize}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {tier}
        </text>
      </svg>
    </div>
  );
}

// =============================================================================
// AchievementBadgeSvg Component
// =============================================================================

interface AchievementBadgeSvgProps {
  badge: BadgeDefinition;
  size?: number;
}

export function AchievementBadgeSvg({ badge, size = 48 }: AchievementBadgeSvgProps) {
  const colors = TIER_COLORS[badge.tier] ?? TIER_COLORS.NOVICE;
  const isLocked = !badge.earned;

  return (
    <div data-testid="achievement-badge-svg" className={isLocked ? 'locked opacity-40' : ''}>
      <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={isLocked ? '#111' : colors.fill}
          stroke={isLocked ? '#333' : colors.stroke}
          strokeWidth="2"
        />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke={isLocked ? '#222' : colors.stroke}
          strokeWidth="1"
          opacity="0.5"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
        >
          {badge.icon}
        </text>
      </svg>
    </div>
  );
}

// =============================================================================
// BadgeCard Component
// =============================================================================

interface BadgeCardProps {
  badge: BadgeDefinition;
  onClick?: (badgeId: string) => void;
}

export function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const formattedDate = badge.earnedAt
    ? new Date(badge.earnedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      data-testid="badge-card"
      onClick={() => onClick?.(badge.id)}
      className={`border font-mono p-3 transition-colors ${
        badge.earned
          ? 'border-[var(--terminal-green)] cursor-pointer hover:bg-[var(--terminal-green)] hover:bg-opacity-10'
          : 'border-[var(--terminal-dim)] opacity-60'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <AchievementBadgeSvg badge={badge} size={48} />
        <div className="flex-1 min-w-0">
          <h4 className="text-[var(--terminal-green)] font-bold text-sm">{badge.name}</h4>
          <p className="text-[var(--terminal-dim)] text-xs">{badge.description}</p>
          {badge.earned ? (
            <div className="mt-1">
              <span className="text-[var(--terminal-green)] text-xs">Earned</span>
              {formattedDate && (
                <span className="text-[var(--terminal-dim)] text-xs ml-2">{formattedDate}</span>
              )}
            </div>
          ) : (
            <div className="mt-1">
              <span className="text-[var(--terminal-dim)] text-xs">Locked</span>
              <span className="text-[var(--terminal-dim)] text-xs ml-2">— {badge.requirement}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BadgeGrid Component
// =============================================================================

interface BadgeGridProps {
  badges: BadgeDefinition[];
  category?: string;
  onBadgeClick?: (badgeId: string) => void;
}

export function BadgeGrid({ badges, category, onBadgeClick }: BadgeGridProps) {
  const filtered = category ? badges.filter((b) => b.category === category) : badges;

  return (
    <div data-testid="badge-grid" className="font-mono">
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-[var(--terminal-dim)]">No badges available</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} onClick={onBadgeClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BadgeShowcase Component
// =============================================================================

interface BadgeShowcaseProps {
  badges: BadgeDefinition[];
  maxDisplay?: number;
}

export function BadgeShowcase({ badges, maxDisplay }: BadgeShowcaseProps) {
  const displayed = maxDisplay ? badges.slice(0, maxDisplay) : badges;

  return (
    <div data-testid="badge-showcase" className="border border-[var(--terminal-green)] font-mono p-4">
      <h3 className="text-[var(--terminal-green)] font-bold mb-3">Badge Showcase</h3>
      {badges.length === 0 ? (
        <div className="text-center py-4 text-[var(--terminal-dim)]">No badges earned yet</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {displayed.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BadgeProgress Component
// =============================================================================

interface BadgeProgressProps {
  earned: number;
  total: number;
  label?: string;
}

export function BadgeProgress({ earned, total, label }: BadgeProgressProps) {
  const percentage = total > 0 ? Math.round((earned / total) * 100) : 0;

  return (
    <div data-testid="badge-progress" className="font-mono">
      {label && <div className="text-[var(--terminal-green)] text-sm mb-1">{label}</div>}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 border border-[var(--terminal-green)] bg-black">
          <div
            className="h-full bg-[var(--terminal-green)] transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-[var(--terminal-green)] text-sm whitespace-nowrap">
          {earned}/{total} ({percentage}%)
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BadgeSystemPage Component
// =============================================================================

interface BadgeSystemPageProps {
  collection: BadgeCollection;
  loading?: boolean;
}

export function BadgeSystemPage({ collection, loading = false }: BadgeSystemPageProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (loading) {
    return (
      <div data-testid="badge-system-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading badges...</div>
        </div>
      </div>
    );
  }

  const allBadges = [...collection.earned, ...collection.available];
  const filteredBadges =
    selectedCategory === 'all'
      ? allBadges
      : allBadges.filter((b) => b.category === selectedCategory);

  return (
    <div data-testid="badge-system-page" className="max-w-4xl mx-auto p-4 font-mono">
      <h1 className="text-[var(--terminal-green)] text-2xl mb-6">Badges & Achievements</h1>

      <div className="mb-6">
        <BadgeProgress
          earned={collection.earnedCount}
          total={collection.totalCount}
          label="Collection Progress"
        />
      </div>

      <div className="mb-6">
        <BadgeShowcase badges={collection.earned} maxDisplay={4} />
      </div>

      <div className="mb-4">
        <label htmlFor="badge-category" className="text-[var(--terminal-green)] text-sm mr-2">
          Category:
        </label>
        <select
          id="badge-category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-black border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="tier">Tier</option>
          <option value="streak">Streak</option>
          <option value="accuracy">Accuracy</option>
          <option value="volume">Volume</option>
          <option value="special">Special</option>
        </select>
      </div>

      <BadgeGrid badges={filteredBadges} />
    </div>
  );
}

// =============================================================================
// useBadgeSystem Hook
// =============================================================================

interface UseBadgeSystemReturn {
  collection: BadgeCollection;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  filteredBadges: BadgeDefinition[];
  progressPercentage: number;
}

export function useBadgeSystem(badges: BadgeDefinition[]): UseBadgeSystemReturn {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const collection = useMemo<BadgeCollection>(() => {
    const earned = badges.filter((b) => b.earned);
    const available = badges.filter((b) => !b.earned);
    return {
      earned,
      available,
      totalCount: badges.length,
      earnedCount: earned.length,
    };
  }, [badges]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === 'all') return badges;
    return badges.filter((b) => b.category === selectedCategory);
  }, [badges, selectedCategory]);

  const progressPercentage = useMemo(() => {
    if (badges.length === 0) return 0;
    return Math.round((collection.earnedCount / collection.totalCount) * 100);
  }, [collection]);

  return {
    collection,
    selectedCategory,
    setSelectedCategory,
    filteredBadges,
    progressPercentage,
  };
}
