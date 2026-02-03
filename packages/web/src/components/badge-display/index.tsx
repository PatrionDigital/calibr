'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ProfileBadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'accuracy' | 'volume' | 'tier' | 'special';
  tier: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardBadgeData {
  address: string;
  displayName: string;
  badgeCount: number;
  topBadges: ProfileBadgeData[];
  tier: string;
}

// =============================================================================
// Rarity Config
// =============================================================================

const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3,
};

const RARITY_COLORS: Record<string, string> = {
  common: 'text-[var(--terminal-dim)] border-[var(--terminal-dim)]',
  rare: 'text-blue-400 border-blue-400',
  epic: 'text-purple-400 border-purple-400',
  legendary: 'text-yellow-400 border-yellow-400',
};

// =============================================================================
// ProfileBadgeStrip Component
// =============================================================================

interface ProfileBadgeStripProps {
  badges: ProfileBadgeData[];
  maxDisplay?: number;
  onBadgeClick?: (badgeId: string) => void;
}

export function ProfileBadgeStrip({ badges, maxDisplay, onBadgeClick }: ProfileBadgeStripProps) {
  const displayed = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const overflow = maxDisplay && badges.length > maxDisplay ? badges.length - maxDisplay : 0;

  return (
    <div data-testid="profile-badge-strip" className="flex items-center gap-1 font-mono">
      {badges.length === 0 ? (
        <span className="text-[var(--terminal-dim)] text-xs">No badges</span>
      ) : (
        <>
          {displayed.map((badge) => (
            <span
              key={badge.id}
              data-testid="strip-badge"
              onClick={() => onBadgeClick?.(badge.id)}
              title={badge.name}
              className={`text-lg cursor-pointer hover:scale-110 transition-transform ${
                onBadgeClick ? 'cursor-pointer' : ''
              }`}
            >
              {badge.icon}
            </span>
          ))}
          {overflow > 0 && (
            <span className="text-[var(--terminal-dim)] text-xs ml-1">+{overflow}</span>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// ProfileBadgeSection Component
// =============================================================================

interface ProfileBadgeSectionProps {
  badges: ProfileBadgeData[];
  onBadgeClick?: (badgeId: string) => void;
}

export function ProfileBadgeSection({ badges, onBadgeClick }: ProfileBadgeSectionProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ProfileBadgeData[]>();
    for (const badge of badges) {
      const existing = map.get(badge.category) ?? [];
      existing.push(badge);
      map.set(badge.category, existing);
    }
    return map;
  }, [badges]);

  return (
    <div data-testid="profile-badge-section" className="font-mono">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[var(--terminal-green)] font-bold">Badges</h3>
        <span className="text-[var(--terminal-dim)] text-sm">{badges.length} earned</span>
      </div>
      {badges.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No badges earned yet
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, catBadges]) => (
            <div key={category}>
              <div className="text-[var(--terminal-dim)] text-xs uppercase mb-2">{category}</div>
              <div className="space-y-1">
                {catBadges.map((badge) => (
                  <div
                    key={badge.id}
                    onClick={() => onBadgeClick?.(badge.id)}
                    className={`flex items-center gap-2 p-2 border border-[var(--terminal-dim)] ${
                      onBadgeClick ? 'cursor-pointer hover:border-[var(--terminal-green)]' : ''
                    } transition-colors`}
                  >
                    <span>{badge.icon}</span>
                    <span className="text-[var(--terminal-green)] text-sm">{badge.name}</span>
                    <span className="ml-auto">
                      <BadgeRarityIndicator rarity={badge.rarity} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LeaderboardBadgeCell Component
// =============================================================================

interface LeaderboardBadgeCellProps {
  data: LeaderboardBadgeData;
  maxIcons?: number;
}

export function LeaderboardBadgeCell({ data, maxIcons = 3 }: LeaderboardBadgeCellProps) {
  const displayed = data.topBadges.slice(0, maxIcons);

  return (
    <div data-testid="leaderboard-badge-cell" className="flex items-center gap-1 font-mono">
      {data.badgeCount === 0 ? (
        <span className="text-[var(--terminal-dim)]">—</span>
      ) : (
        <>
          {displayed.map((badge) => (
            <span key={badge.id} data-testid="cell-badge-icon" className="text-sm" title={badge.name}>
              {badge.icon}
            </span>
          ))}
          <span className="text-[var(--terminal-dim)] text-xs ml-1">{data.badgeCount}</span>
        </>
      )}
    </div>
  );
}

// =============================================================================
// BadgeDetailModal Component
// =============================================================================

interface BadgeDetailModalProps {
  badge: ProfileBadgeData;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  const formattedDate = new Date(badge.earnedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      data-testid="badge-detail-modal"
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 font-mono"
      onClick={onClose}
    >
      <div
        className="border-2 border-[var(--terminal-green)] bg-black p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <span className="text-4xl">{badge.icon}</span>
          <button
            data-testid="close-modal"
            onClick={onClose}
            className="text-[var(--terminal-green)] hover:text-white text-xl leading-none"
          >
            x
          </button>
        </div>

        <h2 className="text-[var(--terminal-green)] font-bold text-xl mb-2">{badge.name}</h2>
        <p className="text-[var(--terminal-dim)] text-sm mb-4">{badge.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Tier</div>
            <div className="text-[var(--terminal-green)] font-bold">{badge.tier}</div>
          </div>
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Category</div>
            <div className="text-[var(--terminal-green)] capitalize">{badge.category}</div>
          </div>
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Rarity</div>
            <BadgeRarityIndicator rarity={badge.rarity} />
          </div>
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Earned</div>
            <div className="text-[var(--terminal-green)] text-sm">{formattedDate}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BadgeRarityIndicator Component
// =============================================================================

interface BadgeRarityIndicatorProps {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export function BadgeRarityIndicator({ rarity }: BadgeRarityIndicatorProps) {
  const colorClass = RARITY_COLORS[rarity] ?? RARITY_COLORS.common;

  return (
    <span
      data-testid="rarity-indicator"
      className={`text-xs border px-1 capitalize ${rarity} ${colorClass}`}
    >
      {rarity}
    </span>
  );
}

// =============================================================================
// ProfileBadgeWall Component
// =============================================================================

interface ProfileBadgeWallProps {
  badges: ProfileBadgeData[];
  onBadgeClick?: (badgeId: string) => void;
}

export function ProfileBadgeWall({ badges, onBadgeClick }: ProfileBadgeWallProps) {
  return (
    <div data-testid="profile-badge-wall" className="font-mono">
      {badges.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-6">
          No badges earned yet
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              onClick={() => onBadgeClick?.(badge.id)}
              className={`border border-[var(--terminal-dim)] p-3 text-center ${
                onBadgeClick ? 'cursor-pointer hover:border-[var(--terminal-green)]' : ''
              } transition-colors`}
            >
              <div className="text-2xl mb-1">{badge.icon}</div>
              <div className="text-[var(--terminal-green)] text-sm font-bold">{badge.name}</div>
              <div className="mt-1">
                <BadgeRarityIndicator rarity={badge.rarity} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BadgeDisplayPage Component
// =============================================================================

interface BadgeDisplayPageProps {
  badges: ProfileBadgeData[];
  leaderboardData: LeaderboardBadgeData[];
  loading?: boolean;
}

export function BadgeDisplayPage({ badges, leaderboardData, loading = false }: BadgeDisplayPageProps) {
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadgeData | null>(null);

  if (loading) {
    return (
      <div data-testid="badge-display-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading badges...</div>
        </div>
      </div>
    );
  }

  const handleBadgeClick = (badgeId: string) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (badge) setSelectedBadge(badge);
  };

  return (
    <div data-testid="badge-display-page" className="max-w-4xl mx-auto p-4 font-mono space-y-6">
      <h1 className="text-[var(--terminal-green)] text-2xl">Badge Display</h1>

      <ProfileBadgeWall badges={badges} onBadgeClick={handleBadgeClick} />

      <div data-testid="leaderboard-badges-section">
        <h2 className="text-[var(--terminal-green)] font-bold mb-3">Leaderboard Badges</h2>
        <div className="space-y-2">
          {leaderboardData.map((entry) => (
            <div
              key={entry.address}
              className="flex items-center gap-3 p-2 border border-[var(--terminal-dim)]"
            >
              <span className="text-[var(--terminal-green)] text-sm w-24 truncate">
                {entry.displayName}
              </span>
              <LeaderboardBadgeCell data={entry} />
            </div>
          ))}
        </div>
      </div>

      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}

// =============================================================================
// useBadgeDisplay Hook
// =============================================================================

interface RarityStats {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

interface UseBadgeDisplayReturn {
  sortedBadges: ProfileBadgeData[];
  badgesByCategory: Record<string, ProfileBadgeData[]>;
  selectedBadge: ProfileBadgeData | null;
  selectBadge: (badgeId: string) => void;
  clearSelection: () => void;
  rarityStats: RarityStats;
}

export function useBadgeDisplay(badges: ProfileBadgeData[]): UseBadgeDisplayReturn {
  const [selectedBadge, setSelectedBadge] = useState<ProfileBadgeData | null>(null);

  const sortedBadges = useMemo(() => {
    return [...badges].sort(
      (a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
    );
  }, [badges]);

  const badgesByCategory = useMemo(() => {
    const map: Record<string, ProfileBadgeData[]> = {};
    for (const badge of badges) {
      if (!map[badge.category]) map[badge.category] = [];
      map[badge.category]!.push(badge);
    }
    return map;
  }, [badges]);

  const selectBadge = useCallback(
    (badgeId: string) => {
      const badge = badges.find((b) => b.id === badgeId);
      if (badge) setSelectedBadge(badge);
    },
    [badges]
  );

  const clearSelection = useCallback(() => {
    setSelectedBadge(null);
  }, []);

  const rarityStats = useMemo<RarityStats>(() => {
    const stats: RarityStats = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const badge of badges) {
      stats[badge.rarity]++;
    }
    return stats;
  }, [badges]);

  return {
    sortedBadges,
    badgesByCategory,
    selectedBadge,
    selectBadge,
    clearSelection,
    rarityStats,
  };
}
