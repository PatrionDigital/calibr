'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import type { Achievement, AchievementTier, AchievementCategory } from './types';

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<AchievementTier, {
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}> = {
  BRONZE: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/10',
    borderColor: 'border-amber-600/50',
    glowColor: 'shadow-amber-600/20',
  },
  SILVER: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/50',
    glowColor: 'shadow-gray-400/20',
  },
  GOLD: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
    glowColor: 'shadow-yellow-500/30',
  },
  PLATINUM: {
    color: 'text-slate-300',
    bgColor: 'bg-slate-300/10',
    borderColor: 'border-slate-300/50',
    glowColor: 'shadow-slate-300/20',
  },
  DIAMOND: {
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/50',
    glowColor: 'shadow-cyan-400/30',
  },
};

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  STREAK: '🔥',
  VOLUME: '📊',
  ACCURACY: '🎯',
  CALIBRATION: '⚖️',
  SPECIAL: '⭐',
};

const DEFAULT_DURATION = 5000;

// =============================================================================
// Types
// =============================================================================

export interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
  duration?: number;
}

export interface AchievementNotificationStackProps {
  notifications: Achievement[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  duration?: number;
}

// =============================================================================
// AchievementNotification Component
// =============================================================================

export function AchievementNotification({
  achievement,
  onDismiss,
  duration = DEFAULT_DURATION,
}: AchievementNotificationProps) {
  const tierConfig = TIER_CONFIG[achievement.tier];

  useEffect(() => {
    if (duration > 0) {
      const timeout = setTimeout(onDismiss, duration);
      return () => clearTimeout(timeout);
    }
  }, [duration, onDismiss]);

  return (
    <motion.div
      data-testid="achievement-notification"
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        'ascii-box bg-[hsl(var(--background))] p-4 min-w-[320px] max-w-sm',
        'border-2 shadow-lg',
        tierConfig.borderColor,
        tierConfig.glowColor
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{ repeat: 3, repeatType: 'reverse', duration: 0.15 }}
            className="text-lg"
          >
            🏆
          </motion.span>
          <span className="text-xs font-bold text-[hsl(var(--success))] tracking-wider">
            ACHIEVEMENT UNLOCKED
          </span>
        </div>
        <button
          data-testid="notification-close-button"
          onClick={onDismiss}
          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <motion.span
          data-testid="notification-category-icon"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="text-3xl"
        >
          {CATEGORY_ICONS[achievement.category]}
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              data-testid="notification-tier-badge"
              className={cn(
                'px-1.5 py-0.5 text-xs font-mono border rounded',
                tierConfig.color,
                tierConfig.bgColor,
                tierConfig.borderColor
              )}
            >
              {achievement.tier}
            </span>
          </div>
          <h4 className="font-bold text-[hsl(var(--foreground))] truncate">
            {achievement.name}
          </h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        data-testid="notification-progress-bar"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={cn(
          'mt-3 h-0.5 origin-left',
          achievement.tier === 'GOLD' || achievement.tier === 'DIAMOND'
            ? 'bg-[hsl(var(--primary))]'
            : 'bg-[hsl(var(--muted-foreground))]'
        )}
      />
    </motion.div>
  );
}

// =============================================================================
// AchievementNotificationStack Component
// =============================================================================

export function AchievementNotificationStack({
  notifications,
  onDismiss,
  maxVisible = 3,
  duration = DEFAULT_DURATION,
}: AchievementNotificationStackProps) {
  const visibleNotifications = notifications.slice(0, maxVisible);
  const overflowCount = Math.max(0, notifications.length - maxVisible);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="notification-stack"
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            layout
            style={{ zIndex: maxVisible - index }}
          >
            <AchievementNotification
              achievement={achievement}
              onDismiss={() => onDismiss(achievement.id)}
              duration={duration}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Overflow Indicator */}
      {overflowCount > 0 && (
        <motion.div
          data-testid="notification-overflow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-[hsl(var(--muted-foreground))] font-mono"
        >
          +{overflowCount} more
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// useAchievementNotifications Hook
// =============================================================================

interface NotificationState {
  notifications: Achievement[];
  isActive: boolean;
}

export function useAchievementNotifications(autoDismissMs = DEFAULT_DURATION) {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    isActive: false,
  });

  const notify = useCallback((achievement: Achievement) => {
    setState((prev) => {
      // Don't add duplicates
      if (prev.notifications.some((n) => n.id === achievement.id)) {
        return prev;
      }
      return {
        notifications: [...prev.notifications, achievement],
        isActive: true,
      };
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.notifications.filter((n) => n.id !== id);
      return {
        notifications: remaining,
        isActive: remaining.length > 0,
      };
    });
  }, []);

  const dismissAll = useCallback(() => {
    setState({
      notifications: [],
      isActive: false,
    });
  }, []);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (state.notifications.length === 0) return;

    const timeouts = state.notifications.map((notification) =>
      setTimeout(() => {
        dismiss(notification.id);
      }, autoDismissMs)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [state.notifications, autoDismissMs, dismiss]);

  return {
    notifications: state.notifications,
    isActive: state.isActive,
    notify,
    dismiss,
    dismissAll,
  };
}
