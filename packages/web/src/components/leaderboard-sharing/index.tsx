'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ShareableAchievement {
  id: string;
  type: 'rank_milestone' | 'tier_promotion' | 'streak' | 'accuracy' | 'custom';
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  value: number | null;
  shareText: string;
}

export interface ShareTarget {
  id: string;
  name: string;
  icon: string;
}

// =============================================================================
// AchievementCard Component
// =============================================================================

interface AchievementCardProps {
  achievement: ShareableAchievement;
  onShare?: (achievementId: string) => void;
  compact?: boolean;
}

export function AchievementCard({ achievement, onShare, compact = false }: AchievementCardProps) {
  const formattedDate = new Date(achievement.earnedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      data-testid="achievement-card"
      className={`border border-[var(--terminal-green)] font-mono ${compact ? 'compact p-2' : 'p-4'}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{achievement.icon}</span>
        <div className="flex-1">
          <h4 className="text-[var(--terminal-green)] font-bold">{achievement.title}</h4>
          <p className="text-[var(--terminal-dim)] text-xs">{achievement.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[var(--terminal-dim)] text-xs">{formattedDate}</span>
            {achievement.value !== null && (
              <span className="text-[var(--terminal-green)] font-bold text-sm">
                #{achievement.value}
              </span>
            )}
          </div>
        </div>
        {onShare && (
          <button
            aria-label="share"
            onClick={() => onShare(achievement.id)}
            className="border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-1 text-xs hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ShareButton Component
// =============================================================================

interface ShareButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ShareButton({ onClick, label = 'Share', disabled = false, size = 'md' }: ShareButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border border-[var(--terminal-green)] text-[var(--terminal-green)] font-mono hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]}`}
    >
      {label}
    </button>
  );
}

// =============================================================================
// ShareModal Component
// =============================================================================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: ShareableAchievement;
  targets: ShareTarget[];
  onShare?: (targetId: string, achievement: ShareableAchievement) => void;
}

export function ShareModal({ isOpen, onClose, achievement, targets, onShare }: ShareModalProps) {
  if (!isOpen) return null;

  return (
    <div data-testid="share-modal" className="fixed inset-0 z-50 flex items-center justify-center font-mono">
      <div className="absolute inset-0 bg-black bg-opacity-80" onClick={onClose} />
      <div className="relative border border-[var(--terminal-green)] bg-black p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--terminal-green)] font-bold">Share Achievement</h3>
          <button
            aria-label="close"
            onClick={onClose}
            className="text-[var(--terminal-green)] hover:text-white"
          >
            [X]
          </button>
        </div>

        <div className="mb-4 p-3 border border-[var(--terminal-green)] border-opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{achievement.icon}</span>
            <span className="text-[var(--terminal-green)] font-bold">{achievement.title}</span>
          </div>
          <p className="text-[var(--terminal-dim)] text-xs">{achievement.shareText}</p>
        </div>

        <div className="space-y-2">
          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => onShare?.(target.id, achievement)}
              className="w-full flex items-center gap-3 p-3 border border-[var(--terminal-green)] border-opacity-30 text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-10 transition-colors"
            >
              <span>{target.icon}</span>
              <span>{target.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AchievementBadge Component
// =============================================================================

interface AchievementBadgeProps {
  achievement: ShareableAchievement;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
}

export function AchievementBadge({ achievement, size = 'md', locked = false }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div
      data-testid="achievement-badge"
      title={achievement.title}
      className={`inline-flex items-center justify-center w-10 h-10 border border-[var(--terminal-green)] font-mono ${sizeClasses[size]} ${locked ? 'locked opacity-30 grayscale' : ''}`}
    >
      {achievement.icon}
    </div>
  );
}

// =============================================================================
// ShareableRankCard Component
// =============================================================================

interface ShareableRankCardProps {
  rank: number;
  tier: string;
  score: number;
  totalForecasters: number;
  displayName: string;
  onShare?: () => void;
}

export function ShareableRankCard({
  rank,
  tier,
  score,
  totalForecasters,
  displayName,
  onShare,
}: ShareableRankCardProps) {
  const percentile = ((rank / totalForecasters) * 100);
  const percentileLabel = percentile <= 1 ? 'Top 1%' : `Top ${Math.ceil(percentile)}%`;

  return (
    <div data-testid="shareable-rank-card" className="border border-[var(--terminal-green)] font-mono p-4">
      <div className="text-center mb-3">
        <div className="text-[var(--terminal-green)] text-3xl font-bold">#{rank}</div>
        <div className="text-[var(--terminal-green)]">{displayName}</div>
      </div>

      <div className="flex justify-between items-center mb-3 text-sm">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Score</div>
          <div className="text-[var(--terminal-green)] font-bold">{score}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Tier</div>
          <div className="text-[var(--terminal-green)] font-bold">{tier}</div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Percentile</div>
          <div className="text-[var(--terminal-green)] font-bold">{percentileLabel}</div>
        </div>
      </div>

      <div className="text-center text-[var(--terminal-dim)] text-xs mb-3">
        Out of {totalForecasters.toLocaleString()} forecasters
      </div>

      {onShare && (
        <button
          aria-label="share"
          onClick={onShare}
          className="w-full border border-[var(--terminal-green)] text-[var(--terminal-green)] py-2 text-sm hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors"
        >
          Share Rank
        </button>
      )}
    </div>
  );
}

// =============================================================================
// LeaderboardSharingPanel Component
// =============================================================================

interface LeaderboardSharingPanelProps {
  achievements: ShareableAchievement[];
  targets: ShareTarget[];
}

export function LeaderboardSharingPanel({ achievements, targets }: LeaderboardSharingPanelProps) {
  const { selectedAchievement, isModalOpen, openShareModal, closeShareModal } =
    useLeaderboardSharing(achievements);

  return (
    <div data-testid="leaderboard-sharing-panel" className="font-mono">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[var(--terminal-green)] text-lg">Achievements</h2>
        <span className="text-[var(--terminal-dim)] text-xs">
          {achievements.length} achievements
        </span>
      </div>

      {achievements.length === 0 ? (
        <div className="text-center py-8 text-[var(--terminal-dim)]">
          No achievements yet. Keep forecasting!
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onShare={openShareModal}
            />
          ))}
        </div>
      )}

      {selectedAchievement && (
        <ShareModal
          isOpen={isModalOpen}
          onClose={closeShareModal}
          achievement={selectedAchievement}
          targets={targets}
        />
      )}
    </div>
  );
}

// =============================================================================
// useLeaderboardSharing Hook
// =============================================================================

interface UseLeaderboardSharingReturn {
  selectedAchievement: ShareableAchievement | null;
  isModalOpen: boolean;
  openShareModal: (achievementId: string) => void;
  closeShareModal: () => void;
  shareCount: number;
}

export function useLeaderboardSharing(
  achievements: ShareableAchievement[]
): UseLeaderboardSharingReturn {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareCount] = useState(0);

  const selectedAchievement = useMemo(
    () => achievements.find((a) => a.id === selectedId) ?? null,
    [achievements, selectedId]
  );

  const openShareModal = useCallback(
    (achievementId: string) => {
      setSelectedId(achievementId);
      setIsModalOpen(true);
    },
    []
  );

  const closeShareModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    selectedAchievement,
    isModalOpen,
    openShareModal,
    closeShareModal,
    shareCount,
  };
}
