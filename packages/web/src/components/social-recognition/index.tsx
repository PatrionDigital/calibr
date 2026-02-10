'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export type ShoutoutType = 'milestone' | 'streak' | 'tier-up' | 'achievement';
export type RecognitionEventType = 'tier-up' | 'achievement' | 'streak' | 'milestone';

export interface ShoutoutData {
  id: string;
  type: ShoutoutType;
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  title: string;
  description: string;
  metric?: {
    label: string;
    value: number;
  };
  previousTier?: SuperforecasterTier;
  timestamp: string;
}

export interface RecognitionEvent {
  id: string;
  type: RecognitionEventType;
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  message: string;
  timestamp: string;
}

export interface SpotlightData {
  userId: string;
  displayName: string;
  tier: SuperforecasterTier;
  title: string;
  subtitle: string;
  bio: string;
  stats: {
    forecasts: number;
    accuracy: number;
    brierScore: number;
  };
  achievements: string[];
  featuredReason: string;
}

export interface ShareData {
  title: string;
  description: string;
  url: string;
  image?: string;
  stats?: {
    tier: SuperforecasterTier;
    forecasts: number;
    brierScore: number;
  };
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

const SHOUTOUT_ICONS: Record<ShoutoutType, string> = {
  milestone: '🏆',
  streak: '🔥',
  'tier-up': '⬆️',
  achievement: '🎖️',
};

const EVENT_ICONS: Record<RecognitionEventType, string> = {
  'tier-up': '⬆️',
  achievement: '🎖️',
  streak: '🔥',
  milestone: '🏆',
};

// =============================================================================
// Utility Functions
// =============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// ShoutoutCard Component
// =============================================================================

interface ShoutoutCardProps {
  data: ShoutoutData;
  onShare?: (data: ShoutoutData) => void;
}

export function ShoutoutCard({ data, onShare }: ShoutoutCardProps) {
  const tierConfig = TIER_CONFIG[data.tier];
  const icon = SHOUTOUT_ICONS[data.type];

  return (
    <motion.div
      data-testid="shoutout-card"
      data-tier={data.tier}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'ascii-box p-4 bg-[hsl(var(--card))] border-2',
        tierConfig.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span data-testid="shoutout-icon" className="text-2xl">
            {icon}
          </span>
          <div>
            <h4 data-testid="shoutout-title" className="font-bold text-[hsl(var(--foreground))]">
              {data.title}
            </h4>
            <div className="flex items-center gap-2">
              <span data-testid="shoutout-user" className={cn('font-medium', tierConfig.color)}>
                {data.displayName}
              </span>
              <span
                data-testid="shoutout-tier"
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
        </div>
        <span data-testid="shoutout-timestamp" className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatTimestamp(data.timestamp)}
        </span>
      </div>

      {/* Description */}
      <p data-testid="shoutout-description" className="text-sm text-[hsl(var(--muted-foreground))] mb-3">
        {data.description}
      </p>

      {/* Previous Tier (for tier-up) */}
      {data.type === 'tier-up' && data.previousTier && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span data-testid="shoutout-previous-tier" className="text-[hsl(var(--muted-foreground))]">
            {data.previousTier}
          </span>
          <span>→</span>
          <span className={tierConfig.color}>{data.tier}</span>
        </div>
      )}

      {/* Metric */}
      {data.metric && (
        <div className={cn('ascii-box p-3 text-center', tierConfig.bgColor)}>
          <div data-testid="shoutout-metric-value" className="text-2xl font-mono font-bold">
            {data.metric.value.toLocaleString()}
          </div>
          <div data-testid="shoutout-metric-label" className="text-xs text-[hsl(var(--muted-foreground))]">
            {data.metric.label}
          </div>
        </div>
      )}

      {/* Share Button */}
      <button
        data-testid="shoutout-share-button"
        onClick={() => onShare?.(data)}
        className="mt-3 w-full py-2 text-sm font-mono border border-[hsl(var(--border))] rounded transition-all duration-100 active:scale-[0.98] active:opacity-90 [@media(hover:hover)]:hover:bg-[hsl(var(--accent))]"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        Share
      </button>
    </motion.div>
  );
}

// =============================================================================
// ShareCard Component
// =============================================================================

interface ShareCardProps {
  data: ShareData;
  variant?: 'default' | 'preview';
}

export function ShareCard({ data, variant = 'default' }: ShareCardProps) {
  const tierConfig = data.stats?.tier ? TIER_CONFIG[data.stats.tier] : TIER_CONFIG.JOURNEYMAN;

  return (
    <div
      data-testid="share-card"
      data-variant={variant}
      className={cn(
        'ascii-box p-5 bg-[hsl(var(--card))] border-2',
        tierConfig.borderColor,
        variant === 'preview' && 'aspect-[1.91/1] flex flex-col justify-between'
      )}
    >
      {/* Header with emoji */}
      {data.stats?.tier && (
        <div className="flex items-center gap-2 mb-3">
          <span data-testid="share-tier-emoji" className="text-3xl">
            {tierConfig.emoji}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 data-testid="share-title" className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
        {data.title}
      </h3>

      {/* Description */}
      <p data-testid="share-description" className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        {data.description}
      </p>

      {/* Stats */}
      {data.stats && (
        <div className="flex gap-4 mb-4">
          <div className="text-center">
            <div data-testid="share-stat-tier" className={cn('font-mono font-bold', tierConfig.color)}>
              {data.stats.tier}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Tier</div>
          </div>
          <div className="text-center">
            <div data-testid="share-stat-forecasts" className="font-mono font-bold">
              {data.stats.forecasts}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Forecasts</div>
          </div>
          <div className="text-center">
            <div data-testid="share-stat-brier" className="font-mono font-bold">
              {data.stats.brierScore.toFixed(2)}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Brier</div>
          </div>
        </div>
      )}

      {/* Branding */}
      <div data-testid="share-branding" className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
        calibr.xyz
      </div>
    </div>
  );
}

// =============================================================================
// RecognitionFeed Component
// =============================================================================

interface RecognitionFeedProps {
  events: RecognitionEvent[];
  title?: string;
  maxEvents?: number;
  onEventClick?: (event: RecognitionEvent) => void;
}

export function RecognitionFeed({
  events,
  title,
  maxEvents,
  onEventClick,
}: RecognitionFeedProps) {
  const displayEvents = maxEvents ? events.slice(0, maxEvents) : events;

  if (events.length === 0) {
    return (
      <div
        data-testid="recognition-feed-empty"
        className="ascii-box p-6 text-center bg-[hsl(var(--muted))]/30"
      >
        <p className="text-[hsl(var(--muted-foreground))]">No recent activity</p>
      </div>
    );
  }

  return (
    <div data-testid="recognition-feed" className="space-y-2">
      {title && (
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          {title}
        </h3>
      )}

      {displayEvents.map((event) => {
        const tierConfig = TIER_CONFIG[event.tier];
        const icon = EVENT_ICONS[event.type];

        return (
          <motion.div
            key={event.id}
            data-testid="recognition-event"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => onEventClick?.(event)}
            className={cn(
              'ascii-box p-3 bg-[hsl(var(--card))] cursor-pointer',
              'hover:bg-[hsl(var(--accent))] transition-colors'
            )}
          >
            <div className="flex items-center gap-3">
              <span data-testid="event-icon" className="text-lg">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium', tierConfig.color)}>
                    {event.displayName}
                  </span>
                  <span
                    data-testid="event-tier-badge"
                    className={cn(
                      'text-xs font-mono px-1 py-0.5 border rounded',
                      tierConfig.color,
                      tierConfig.bgColor,
                      tierConfig.borderColor
                    )}
                  >
                    {event.tier.charAt(0)}
                  </span>
                </div>
                <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                  {event.message}
                </p>
              </div>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// =============================================================================
// FeaturedSpotlight Component
// =============================================================================

interface FeaturedSpotlightProps {
  data: SpotlightData;
}

export function FeaturedSpotlight({ data }: FeaturedSpotlightProps) {
  const tierConfig = TIER_CONFIG[data.tier];

  return (
    <motion.div
      data-testid="featured-spotlight"
      data-tier={data.tier}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'ascii-box p-6 bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted))]/20',
        'border-2',
        tierConfig.borderColor
      )}
    >
      {/* Star decoration */}
      <div className="flex justify-center mb-4">
        <span data-testid="spotlight-star" className="text-4xl">⭐</span>
      </div>

      {/* Title */}
      <h2
        data-testid="spotlight-title"
        className="text-center text-xl font-bold text-[hsl(var(--foreground))] mb-1"
      >
        {data.title}
      </h2>
      <p
        data-testid="spotlight-subtitle"
        className="text-center text-sm text-[hsl(var(--muted-foreground))] mb-4"
      >
        {data.subtitle}
      </p>

      {/* User info */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <span className="text-3xl">{tierConfig.emoji}</span>
        <div>
          <h3 data-testid="spotlight-user" className={cn('text-lg font-bold', tierConfig.color)}>
            {data.displayName}
          </h3>
          <span
            data-testid="spotlight-tier"
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

      {/* Bio */}
      <p
        data-testid="spotlight-bio"
        className="text-center text-sm text-[hsl(var(--muted-foreground))] mb-4"
      >
        {data.bio}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div data-testid="spotlight-stat-forecasts" className="text-xl font-mono font-bold">
            {data.stats.forecasts}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Forecasts</div>
        </div>
        <div className="text-center">
          <div data-testid="spotlight-stat-accuracy" className="text-xl font-mono font-bold text-[hsl(var(--success))]">
            {Math.round(data.stats.accuracy * 100)}%
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Accuracy</div>
        </div>
        <div className="text-center">
          <div data-testid="spotlight-stat-brier" className="text-xl font-mono font-bold">
            {data.stats.brierScore.toFixed(2)}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Brier</div>
        </div>
      </div>

      {/* Achievements */}
      <div data-testid="spotlight-achievements" className="flex flex-wrap justify-center gap-1 mb-4">
        {data.achievements.map((achievement) => (
          <span
            key={achievement}
            className="text-xs px-2 py-0.5 bg-[hsl(var(--muted))] rounded"
          >
            {achievement}
          </span>
        ))}
      </div>

      {/* Featured reason */}
      <div
        data-testid="spotlight-reason"
        className={cn(
          'text-center text-sm p-3 rounded border',
          tierConfig.bgColor,
          tierConfig.borderColor
        )}
      >
        ⭐ {data.featuredReason}
      </div>
    </motion.div>
  );
}

// =============================================================================
// CongratulationsMessage Component
// =============================================================================

interface CongratulationsMessageProps {
  type: 'tier-up' | 'achievement' | 'streak';
  userName: string;
  tier: SuperforecasterTier;
  previousTier?: SuperforecasterTier;
  achievementName?: string;
  streakDays?: number;
}

export function CongratulationsMessage({
  type,
  userName,
  tier,
  previousTier,
  achievementName,
  streakDays,
}: CongratulationsMessageProps) {
  const tierConfig = TIER_CONFIG[tier];

  const getMessage = () => {
    switch (type) {
      case 'tier-up':
        return `${userName} has been promoted to ${tier}!`;
      case 'achievement':
        return `${userName} unlocked the ${achievementName} achievement!`;
      case 'streak':
        return `${userName} reached a ${streakDays} day streak!`;
      default:
        return `Congratulations ${userName}!`;
    }
  };

  const getEmoji = () => {
    switch (type) {
      case 'tier-up':
        return '🎉';
      case 'achievement':
        return '🏆';
      case 'streak':
        return '🔥';
      default:
        return '⭐';
    }
  };

  return (
    <motion.div
      data-testid="congratulations-message"
      data-tier={tier}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'ascii-box p-4 text-center',
        tierConfig.bgColor,
        tierConfig.borderColor,
        'border-2'
      )}
    >
      <span data-testid="congrats-emoji" className="text-3xl block mb-2">
        {getEmoji()}
      </span>
      <p className={cn('font-bold', tierConfig.color)}>
        {getMessage()}
      </p>
      {type === 'tier-up' && previousTier && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {previousTier} → {tier}
        </p>
      )}
    </motion.div>
  );
}

// =============================================================================
// ShareButtons Component
// =============================================================================

interface ShareButtonsProps {
  url: string;
  text: string;
  variant?: 'default' | 'compact';
  onShare?: (platform: string) => void;
}

export function ShareButtons({
  url,
  text,
  variant = 'default',
  onShare,
}: ShareButtonsProps) {
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
    onShare?.('twitter');
  };

  const handleFarcasterShare = () => {
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
    window.open(farcasterUrl, '_blank');
    onShare?.('farcaster');
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url);
    onShare?.('copy');
  };

  return (
    <div
      data-testid="share-buttons"
      data-variant={variant}
      className={cn(
        'flex gap-2',
        variant === 'compact' ? 'flex-row' : 'flex-col sm:flex-row'
      )}
    >
      <button
        data-testid="share-twitter"
        onClick={handleTwitterShare}
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2',
          'bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/30',
          'rounded font-mono text-sm transition-all duration-100',
          'active:scale-[0.98] active:opacity-90 [@media(hover:hover)]:hover:bg-[#1DA1F2]/20',
          variant === 'compact' && 'px-3 py-1.5'
        )}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <span>𝕏</span>
        {variant !== 'compact' && <span>Twitter</span>}
      </button>

      <button
        data-testid="share-farcaster"
        onClick={handleFarcasterShare}
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2',
          'bg-purple-500/10 text-purple-400 border border-purple-500/30',
          'rounded font-mono text-sm transition-all duration-100',
          'active:scale-[0.98] active:opacity-90 [@media(hover:hover)]:hover:bg-purple-500/20',
          variant === 'compact' && 'px-3 py-1.5'
        )}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <span>🟣</span>
        {variant !== 'compact' && <span>Farcaster</span>}
      </button>

      <button
        data-testid="share-copy"
        onClick={handleCopyLink}
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2',
          'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
          'border border-[hsl(var(--border))] rounded font-mono text-sm',
          'transition-all duration-100 active:scale-[0.98] active:opacity-90',
          '[@media(hover:hover)]:hover:bg-[hsl(var(--accent))]',
          variant === 'compact' && 'px-3 py-1.5'
        )}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <span>📋</span>
        {variant !== 'compact' && <span>Copy Link</span>}
      </button>
    </div>
  );
}
