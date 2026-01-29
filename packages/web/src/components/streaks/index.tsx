'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalActiveDays: number;
  streakStartDate: string | null;
  isActive: boolean;
}

export type StreakMilestoneType = 7 | 14 | 30 | 60 | 100 | 365;
export type StreakIntensity = 'low' | 'medium' | 'high' | 'max';
export type StreakSize = 'sm' | 'md' | 'lg';

// =============================================================================
// Constants
// =============================================================================

const MILESTONES: StreakMilestoneType[] = [7, 14, 30, 60, 100, 365];

const MILESTONE_MESSAGES: Record<StreakMilestoneType, { title: string; subtitle: string }> = {
  7: { title: 'Week Streak!', subtitle: 'One week of consistent forecasting' },
  14: { title: 'Two Weeks!', subtitle: 'Building strong habits' },
  30: { title: 'Month Streak!', subtitle: 'A full month of dedication' },
  60: { title: 'Two Months!', subtitle: 'True forecaster commitment' },
  100: { title: 'Centurion!', subtitle: '100 days of forecasting excellence' },
  365: { title: 'Yearly Legend!', subtitle: 'An entire year of predictions' },
};

const SIZE_CLASSES: Record<StreakSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const INTENSITY_COLORS: Record<StreakIntensity, string> = {
  low: 'text-orange-300',
  medium: 'text-orange-400',
  high: 'text-orange-500',
  max: 'text-red-500',
};

// =============================================================================
// Utility Functions
// =============================================================================

function getStreakIntensity(streak: number): StreakIntensity {
  if (streak >= 100) return 'max';
  if (streak >= 30) return 'high';
  if (streak >= 7) return 'medium';
  return 'low';
}

function isMilestoneStreak(streak: number): boolean {
  return MILESTONES.includes(streak as StreakMilestoneType);
}

function getNextMilestone(streak: number): StreakMilestoneType {
  for (const milestone of MILESTONES) {
    if (milestone > streak) {
      return milestone;
    }
  }
  return 365;
}

function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isYesterday(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function getDaysDifference(dateString: string | null): number {
  if (!dateString) return Infinity;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================================================
// StreakFlame Component
// =============================================================================

interface StreakFlameProps {
  size: StreakSize;
  animated?: boolean;
  intensity?: StreakIntensity;
}

export function StreakFlame({
  size,
  animated = false,
  intensity = 'medium',
}: StreakFlameProps) {
  const flameContent = (
    <span
      data-testid="streak-flame"
      data-size={size}
      data-animated={animated ? 'true' : 'false'}
      data-intensity={intensity}
      className={cn(SIZE_CLASSES[size], INTENSITY_COLORS[intensity])}
    >
      🔥
    </span>
  );

  if (animated) {
    return (
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
      >
        {flameContent}
      </motion.span>
    );
  }

  return flameContent;
}

// =============================================================================
// StreakDisplay Component
// =============================================================================

interface StreakDisplayProps {
  data: StreakData;
  variant?: 'compact' | 'full';
  showLongest?: boolean;
}

export function StreakDisplay({
  data,
  variant = 'compact',
  showLongest = false,
}: StreakDisplayProps) {
  const intensity = getStreakIntensity(data.currentStreak);
  const isAtPersonalBest = data.currentStreak > 0 && data.currentStreak >= data.longestStreak;

  return (
    <div
      data-testid="streak-display"
      data-variant={variant}
      className={cn(
        'ascii-box bg-[hsl(var(--card))] p-4',
        variant === 'compact' ? 'inline-flex items-center gap-3' : 'flex flex-col gap-3'
      )}
    >
      {/* Current Streak */}
      <div className="flex items-center gap-2">
        {data.isActive && <StreakFlame size="md" animated intensity={intensity} />}
        <div className="flex flex-col">
          <span
            data-testid="streak-count"
            className={cn(
              'font-mono text-2xl font-bold',
              data.isActive ? 'text-orange-400' : 'text-[hsl(var(--muted-foreground))]'
            )}
          >
            {data.currentStreak}
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            day streak
          </span>
        </div>
        {isAtPersonalBest && data.currentStreak > 0 && (
          <span
            data-testid="personal-best-badge"
            className="px-1.5 py-0.5 text-xs font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded"
          >
            BEST
          </span>
        )}
      </div>

      {/* Longest Streak */}
      {showLongest && (
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <span>Longest:</span>
          <span data-testid="longest-streak" className="font-mono font-bold">
            {data.longestStreak}
          </span>
        </div>
      )}

      {/* Full variant extras */}
      {variant === 'full' && (
        <div className="flex items-center gap-4 pt-2 border-t border-[hsl(var(--border))]">
          <div className="flex flex-col">
            <span
              data-testid="total-active-days"
              className="font-mono font-bold text-[hsl(var(--foreground))]"
            >
              {data.totalActiveDays}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">total days</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// StreakMilestone Component
// =============================================================================

interface StreakMilestoneProps {
  days: StreakMilestoneType;
  onDismiss: () => void;
  onShare?: () => void;
}

export function StreakMilestone({ days, onDismiss, onShare }: StreakMilestoneProps) {
  const message = MILESTONE_MESSAGES[days];
  const flameCount = days >= 100 ? 5 : days >= 30 ? 3 : days >= 14 ? 2 : 1;
  const intensity = getStreakIntensity(days);

  return (
    <motion.div
      data-testid="streak-milestone"
      data-milestone={days}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className={cn(
        'ascii-box bg-[hsl(var(--card))] p-6 text-center',
        'border-2 border-orange-500/50'
      )}
    >
      {/* Flames */}
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: flameCount }).map((_, i) => (
          <StreakFlame key={i} size="lg" animated intensity={intensity} />
        ))}
      </div>

      {/* Days */}
      <div className="mb-2">
        <span
          data-testid="milestone-days"
          className="font-mono text-4xl font-bold text-orange-400"
        >
          {days}
        </span>
        <span className="text-lg text-[hsl(var(--muted-foreground))]"> days</span>
      </div>

      {/* Message */}
      <h3 className="text-xl font-bold text-[hsl(var(--foreground))] mb-1">
        {message?.title ?? 'Milestone!'}
      </h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        {message?.subtitle ?? 'Keep up the great work!'}
      </p>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button
          data-testid="milestone-share"
          onClick={onShare}
          className="px-4 py-2 text-sm font-mono bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30 transition-colors"
        >
          Share
        </button>
        <button
          data-testid="milestone-dismiss"
          onClick={onDismiss}
          className="px-4 py-2 text-sm font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

// =============================================================================
// StreakCalendar Component
// =============================================================================

interface StreakCalendarProps {
  activeDates: string[];
  showWeekLabels?: boolean;
  showTooltip?: boolean;
  weeks?: number;
}

export function StreakCalendar({
  activeDates,
  showWeekLabels = false,
  showTooltip = false,
  weeks = 8,
}: StreakCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const activeDatesSet = useMemo(() => new Set(activeDates), [activeDates]);

  const calendarDays = useMemo(() => {
    const days: { date: string; isActive: boolean }[] = [];
    const today = new Date();
    const totalDays = weeks * 7;

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] ?? '';
      days.push({
        date: dateStr,
        isActive: activeDatesSet.has(dateStr),
      });
    }

    return days;
  }, [weeks, activeDatesSet]);

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div data-testid="streak-calendar" className="relative">
      {showWeekLabels && (
        <div className="flex flex-col gap-1 mr-2 text-xs text-[hsl(var(--muted-foreground))]">
          {weekLabels.map((label) => (
            <span key={label} className="h-3 leading-3">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-rows-7 grid-flow-col gap-1">
        {calendarDays.map(({ date, isActive }) => {
          const intensity = isActive ? 'medium' : 'low';
          return (
            <div
              key={date}
              data-testid={isActive ? 'calendar-day-active' : 'calendar-day'}
              data-intensity={intensity}
              onMouseEnter={() => showTooltip && setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              className={cn(
                'w-3 h-3 rounded-sm',
                isActive
                  ? 'bg-orange-500'
                  : 'bg-[hsl(var(--muted))]'
              )}
            />
          );
        })}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && hoveredDate && (
          <motion.div
            data-testid="calendar-tooltip"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-mono bg-[hsl(var(--popover))] border border-[hsl(var(--border))] rounded"
          >
            {hoveredDate}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// StreakTracker Component
// =============================================================================

interface StreakTrackerProps {
  data: StreakData;
  activeDates?: string[];
  showTimeRemaining?: boolean;
  showCalendar?: boolean;
  showMilestone?: boolean;
  onMilestoneReached?: (days: number) => void;
  onMilestoneDismiss?: () => void;
}

export function StreakTracker({
  data,
  activeDates = [],
  showTimeRemaining = false,
  showCalendar = false,
  showMilestone = false,
  onMilestoneReached,
  onMilestoneDismiss,
}: StreakTrackerProps) {
  const [showingMilestone, setShowingMilestone] = useState(false);

  const isMilestone = isMilestoneStreak(data.currentStreak);

  useEffect(() => {
    if (showMilestone && isMilestone && data.isActive) {
      setShowingMilestone(true);
      onMilestoneReached?.(data.currentStreak);
    }
  }, [showMilestone, isMilestone, data.isActive, data.currentStreak, onMilestoneReached]);

  const handleMilestoneDismiss = useCallback(() => {
    setShowingMilestone(false);
    onMilestoneDismiss?.();
  }, [onMilestoneDismiss]);

  // Calculate time remaining until streak expires (next midnight + grace period)
  const timeRemaining = useMemo(() => {
    if (!data.isActive || !data.lastActivityDate) return null;

    const lastActivity = new Date(data.lastActivityDate);
    const expiresAt = new Date(lastActivity);
    expiresAt.setDate(expiresAt.getDate() + 2); // End of next day
    expiresAt.setHours(0, 0, 0, 0);

    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return null;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes };
  }, [data.isActive, data.lastActivityDate]);

  return (
    <div data-testid="streak-tracker" className="flex flex-col gap-4">
      {/* Main Display */}
      <StreakDisplay data={data} variant="full" showLongest />

      {/* Time Remaining */}
      {showTimeRemaining && timeRemaining && (
        <div
          data-testid="streak-time-remaining"
          className="text-sm text-[hsl(var(--muted-foreground))] font-mono"
        >
          Streak expires in: {timeRemaining.hours}h {timeRemaining.minutes}m
        </div>
      )}

      {/* Encouragement for broken streak */}
      {!data.isActive && (
        <div
          data-testid="streak-encouragement"
          className="ascii-box p-3 bg-[hsl(var(--muted))]/50 text-center"
        >
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Make a forecast today to start a new streak!
          </p>
        </div>
      )}

      {/* Calendar */}
      {showCalendar && (
        <StreakCalendar activeDates={activeDates} showWeekLabels showTooltip />
      )}

      {/* Milestone Celebration */}
      <AnimatePresence>
        {showingMilestone && isMilestone && (
          <StreakMilestone
            days={data.currentStreak as StreakMilestoneType}
            onDismiss={handleMilestoneDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// useStreak Hook
// =============================================================================

const DEFAULT_STREAK_DATA: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  totalActiveDays: 0,
  streakStartDate: null,
  isActive: false,
};

export function useStreak(initialData?: StreakData) {
  const [streakData, setStreakData] = useState<StreakData>(
    initialData ?? DEFAULT_STREAK_DATA
  );
  const [isLoading, setIsLoading] = useState(false);

  const isMilestone = useMemo(
    () => isMilestoneStreak(streakData.currentStreak),
    [streakData.currentStreak]
  );

  const nextMilestone = useMemo(
    () => getNextMilestone(streakData.currentStreak),
    [streakData.currentStreak]
  );

  const checkStreak = useCallback(async () => {
    setIsLoading(true);

    try {
      const daysSinceActivity = getDaysDifference(streakData.lastActivityDate);

      // If more than 1 day since last activity, streak is broken
      if (daysSinceActivity > 1) {
        setStreakData((prev) => ({
          ...prev,
          currentStreak: 0,
          streakStartDate: null,
          isActive: false,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [streakData.lastActivityDate]);

  const recordActivity = useCallback(async () => {
    setIsLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0] ?? '';

      // Already recorded today
      if (isToday(streakData.lastActivityDate)) {
        return;
      }

      // Check if streak is still valid (yesterday was last activity)
      const wasYesterday = isYesterday(streakData.lastActivityDate);
      const wasToday = isToday(streakData.lastActivityDate);

      if (wasYesterday || wasToday) {
        // Continue streak
        const newStreak = streakData.currentStreak + 1;
        setStreakData((prev) => ({
          ...prev,
          currentStreak: newStreak,
          longestStreak: Math.max(prev.longestStreak, newStreak),
          lastActivityDate: todayStr,
          totalActiveDays: prev.totalActiveDays + 1,
          isActive: true,
        }));
      } else {
        // Start new streak
        setStreakData((prev) => ({
          ...prev,
          currentStreak: 1,
          longestStreak: Math.max(prev.longestStreak, 1),
          lastActivityDate: todayStr,
          totalActiveDays: prev.totalActiveDays + 1,
          streakStartDate: todayStr,
          isActive: true,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, [streakData]);

  const resetStreak = useCallback(() => {
    setStreakData({
      ...streakData,
      currentStreak: 0,
      streakStartDate: null,
      isActive: false,
    });
  }, [streakData]);

  return {
    streakData,
    isLoading,
    isMilestone,
    nextMilestone,
    recordActivity,
    checkStreak,
    resetStreak,
  };
}
