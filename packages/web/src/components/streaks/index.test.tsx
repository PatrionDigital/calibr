/**
 * Streaks Component Tests
 *
 * Tests for streak tracking components:
 * - StreakFlame
 * - StreakDisplay
 * - StreakMilestone
 * - StreakCalendar
 * - StreakTracker
 * - useStreak hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import {
  StreakFlame,
  StreakDisplay,
  StreakMilestone,
  StreakCalendar,
  StreakTracker,
  useStreak,
  type StreakData,
  type StreakMilestoneType,
} from './index';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// =============================================================================
// Test Data
// =============================================================================

const today = new Date().toISOString().split('T')[0] ?? '';
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] ?? '';

const activeStreak: StreakData = {
  currentStreak: 15,
  longestStreak: 21,
  lastActivityDate: today,
  totalActiveDays: 45,
  streakStartDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0] ?? '',
  isActive: true,
};

const inactiveStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 21,
  lastActivityDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0] ?? '',
  totalActiveDays: 45,
  streakStartDate: null,
  isActive: false,
};

const milestoneStreak: StreakData = {
  currentStreak: 30,
  longestStreak: 30,
  lastActivityDate: today,
  totalActiveDays: 60,
  streakStartDate: new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0] ?? '',
  isActive: true,
};

const personalBestStreak: StreakData = {
  currentStreak: 25,
  longestStreak: 25,
  lastActivityDate: today,
  totalActiveDays: 50,
  streakStartDate: new Date(Date.now() - 24 * 86400000).toISOString().split('T')[0] ?? '',
  isActive: true,
};

// =============================================================================
// Tests
// =============================================================================

describe('StreakFlame', () => {
  describe('rendering', () => {
    it('renders flame emoji', () => {
      render(<StreakFlame size="md" />);
      expect(screen.getByTestId('streak-flame')).toHaveTextContent('🔥');
    });

    it('sets size data attribute', () => {
      render(<StreakFlame size="lg" />);
      expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-size', 'lg');
    });

    it('sets animated data attribute to false by default', () => {
      render(<StreakFlame size="md" />);
      expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-animated', 'false');
    });

    it('sets animated data attribute to true when animated', () => {
      render(<StreakFlame size="md" animated />);
      expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-animated', 'true');
    });

    it('sets intensity data attribute', () => {
      render(<StreakFlame size="md" intensity="high" />);
      expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-intensity', 'high');
    });
  });

  describe('sizes', () => {
    it('applies small size class', () => {
      render(<StreakFlame size="sm" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-lg');
    });

    it('applies medium size class', () => {
      render(<StreakFlame size="md" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-2xl');
    });

    it('applies large size class', () => {
      render(<StreakFlame size="lg" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-4xl');
    });
  });

  describe('intensity colors', () => {
    it('applies low intensity color', () => {
      render(<StreakFlame size="md" intensity="low" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-orange-300');
    });

    it('applies medium intensity color', () => {
      render(<StreakFlame size="md" intensity="medium" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-orange-400');
    });

    it('applies high intensity color', () => {
      render(<StreakFlame size="md" intensity="high" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-orange-500');
    });

    it('applies max intensity color', () => {
      render(<StreakFlame size="md" intensity="max" />);
      expect(screen.getByTestId('streak-flame')).toHaveClass('text-red-500');
    });
  });
});

describe('StreakDisplay', () => {
  describe('rendering', () => {
    it('renders display container', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-display')).toBeInTheDocument();
    });

    it('displays current streak count', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-count')).toHaveTextContent('15');
    });

    it('displays day streak label', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByText('day streak')).toBeInTheDocument();
    });

    it('shows flame for active streaks', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
    });

    it('does not show flame for inactive streaks', () => {
      render(<StreakDisplay data={inactiveStreak} />);
      expect(screen.queryByTestId('streak-flame')).not.toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('defaults to compact variant', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-display')).toHaveAttribute('data-variant', 'compact');
    });

    it('renders full variant', () => {
      render(<StreakDisplay data={activeStreak} variant="full" />);
      expect(screen.getByTestId('streak-display')).toHaveAttribute('data-variant', 'full');
    });

    it('shows total active days in full variant', () => {
      render(<StreakDisplay data={activeStreak} variant="full" />);
      expect(screen.getByTestId('total-active-days')).toHaveTextContent('45');
    });

    it('does not show total active days in compact variant', () => {
      render(<StreakDisplay data={activeStreak} variant="compact" />);
      expect(screen.queryByTestId('total-active-days')).not.toBeInTheDocument();
    });
  });

  describe('longest streak', () => {
    it('does not show longest streak by default', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.queryByTestId('longest-streak')).not.toBeInTheDocument();
    });

    it('shows longest streak when showLongest is true', () => {
      render(<StreakDisplay data={activeStreak} showLongest />);
      expect(screen.getByTestId('longest-streak')).toHaveTextContent('21');
    });

    it('displays Longest label', () => {
      render(<StreakDisplay data={activeStreak} showLongest />);
      expect(screen.getByText('Longest:')).toBeInTheDocument();
    });
  });

  describe('personal best badge', () => {
    it('shows BEST badge when at personal best', () => {
      render(<StreakDisplay data={personalBestStreak} />);
      expect(screen.getByTestId('personal-best-badge')).toHaveTextContent('BEST');
    });

    it('does not show BEST badge when below personal best', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.queryByTestId('personal-best-badge')).not.toBeInTheDocument();
    });

    it('does not show BEST badge for zero streak', () => {
      const zeroStreak = { ...inactiveStreak, currentStreak: 0, longestStreak: 0 };
      render(<StreakDisplay data={zeroStreak} />);
      expect(screen.queryByTestId('personal-best-badge')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-display')).toHaveClass('ascii-box');
    });

    it('applies orange color for active streak count', () => {
      render(<StreakDisplay data={activeStreak} />);
      expect(screen.getByTestId('streak-count')).toHaveClass('text-orange-400');
    });

    it('applies muted color for inactive streak count', () => {
      render(<StreakDisplay data={inactiveStreak} />);
      expect(screen.getByTestId('streak-count')).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });
  });
});

describe('StreakMilestone', () => {
  describe('rendering', () => {
    it('renders milestone container', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
    });

    it('sets milestone data attribute', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('streak-milestone')).toHaveAttribute('data-milestone', '30');
    });

    it('displays milestone days', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('milestone-days')).toHaveTextContent('30');
    });

    it('displays share button', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('milestone-share')).toHaveTextContent('Share');
    });

    it('displays dismiss button', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('milestone-dismiss')).toHaveTextContent('Continue');
    });
  });

  describe('milestone messages', () => {
    const milestones: StreakMilestoneType[] = [7, 14, 30, 60, 100, 365];

    milestones.forEach((days) => {
      it(`shows message for ${days}-day milestone`, () => {
        render(<StreakMilestone days={days} onDismiss={vi.fn()} />);
        // Just verify it renders without error
        expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
      });
    });

    it('shows Week Streak title for 7 days', () => {
      render(<StreakMilestone days={7} onDismiss={vi.fn()} />);
      expect(screen.getByText('Week Streak!')).toBeInTheDocument();
    });

    it('shows Month Streak title for 30 days', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByText('Month Streak!')).toBeInTheDocument();
    });

    it('shows Centurion title for 100 days', () => {
      render(<StreakMilestone days={100} onDismiss={vi.fn()} />);
      expect(screen.getByText('Centurion!')).toBeInTheDocument();
    });

    it('shows Yearly Legend title for 365 days', () => {
      render(<StreakMilestone days={365} onDismiss={vi.fn()} />);
      expect(screen.getByText('Yearly Legend!')).toBeInTheDocument();
    });
  });

  describe('flame count', () => {
    it('shows 1 flame for 7 days', () => {
      render(<StreakMilestone days={7} onDismiss={vi.fn()} />);
      const flames = screen.getAllByTestId('streak-flame');
      expect(flames.length).toBe(1);
    });

    it('shows 2 flames for 14 days', () => {
      render(<StreakMilestone days={14} onDismiss={vi.fn()} />);
      const flames = screen.getAllByTestId('streak-flame');
      expect(flames.length).toBe(2);
    });

    it('shows 3 flames for 30 days', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      const flames = screen.getAllByTestId('streak-flame');
      expect(flames.length).toBe(3);
    });

    it('shows 5 flames for 100 days', () => {
      render(<StreakMilestone days={100} onDismiss={vi.fn()} />);
      const flames = screen.getAllByTestId('streak-flame');
      expect(flames.length).toBe(5);
    });
  });

  describe('callbacks', () => {
    it('calls onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn();
      render(<StreakMilestone days={30} onDismiss={onDismiss} />);

      fireEvent.click(screen.getByTestId('milestone-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onShare when share button clicked', () => {
      const onShare = vi.fn();
      render(<StreakMilestone days={30} onDismiss={vi.fn()} onShare={onShare} />);

      fireEvent.click(screen.getByTestId('milestone-share'));
      expect(onShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('streak-milestone')).toHaveClass('ascii-box');
    });

    it('has orange border', () => {
      render(<StreakMilestone days={30} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('streak-milestone')).toHaveClass('border-orange-500/50');
    });
  });
});

describe('StreakCalendar', () => {
  const activeDates = [
    today,
    yesterday,
    new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0] ?? '',
  ];

  describe('rendering', () => {
    it('renders calendar container', () => {
      render(<StreakCalendar activeDates={[]} />);
      expect(screen.getByTestId('streak-calendar')).toBeInTheDocument();
    });

    it('renders day cells', () => {
      render(<StreakCalendar activeDates={[]} weeks={1} />);
      // 1 week = 7 days
      const dayCells = screen.getAllByTestId('calendar-day');
      expect(dayCells.length).toBe(7);
    });

    it('marks active dates', () => {
      render(<StreakCalendar activeDates={activeDates} weeks={1} />);
      const activeDays = screen.getAllByTestId('calendar-day-active');
      expect(activeDays.length).toBeGreaterThan(0);
    });

    it('defaults to 8 weeks', () => {
      render(<StreakCalendar activeDates={[]} />);
      // 8 weeks = 56 days total, but all inactive
      const allDays = screen.getAllByTestId('calendar-day');
      expect(allDays.length).toBe(56);
    });
  });

  describe('week labels', () => {
    it('does not show week labels by default', () => {
      render(<StreakCalendar activeDates={[]} />);
      expect(screen.queryByText('Mon')).not.toBeInTheDocument();
    });

    it('shows week labels when showWeekLabels is true', () => {
      render(<StreakCalendar activeDates={[]} showWeekLabels />);
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('does not show tooltip by default', () => {
      render(<StreakCalendar activeDates={activeDates} weeks={1} />);
      expect(screen.queryByTestId('calendar-tooltip')).not.toBeInTheDocument();
    });

    it('shows tooltip on hover when showTooltip is true', () => {
      render(<StreakCalendar activeDates={activeDates} weeks={1} showTooltip />);

      const dayCell = screen.getAllByTestId('calendar-day')[0];
      fireEvent.mouseEnter(dayCell!);

      expect(screen.getByTestId('calendar-tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      render(<StreakCalendar activeDates={activeDates} weeks={1} showTooltip />);

      const dayCell = screen.getAllByTestId('calendar-day')[0];
      fireEvent.mouseEnter(dayCell!);
      fireEvent.mouseLeave(dayCell!);

      expect(screen.queryByTestId('calendar-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies orange color to active days', () => {
      render(<StreakCalendar activeDates={activeDates} weeks={1} />);
      const activeDays = screen.getAllByTestId('calendar-day-active');
      activeDays.forEach((day) => {
        expect(day).toHaveClass('bg-orange-500');
      });
    });

    it('applies muted color to inactive days', () => {
      render(<StreakCalendar activeDates={[]} weeks={1} />);
      const days = screen.getAllByTestId('calendar-day');
      days.forEach((day) => {
        expect(day).toHaveClass('bg-[hsl(var(--muted))]');
      });
    });
  });
});

describe('StreakTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders tracker container', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.getByTestId('streak-tracker')).toBeInTheDocument();
    });

    it('renders streak display', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.getByTestId('streak-display')).toBeInTheDocument();
    });

    it('uses full variant for display', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.getByTestId('streak-display')).toHaveAttribute('data-variant', 'full');
    });

    it('shows longest streak', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.getByTestId('longest-streak')).toBeInTheDocument();
    });
  });

  describe('time remaining', () => {
    it('does not show time remaining by default', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.queryByTestId('streak-time-remaining')).not.toBeInTheDocument();
    });

    it('shows time remaining when enabled', () => {
      render(<StreakTracker data={activeStreak} showTimeRemaining />);
      expect(screen.getByTestId('streak-time-remaining')).toBeInTheDocument();
    });

    it('displays hours and minutes', () => {
      render(<StreakTracker data={activeStreak} showTimeRemaining />);
      expect(screen.getByTestId('streak-time-remaining').textContent).toMatch(/\d+h \d+m/);
    });
  });

  describe('encouragement for broken streak', () => {
    it('does not show encouragement for active streak', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.queryByTestId('streak-encouragement')).not.toBeInTheDocument();
    });

    it('shows encouragement for inactive streak', () => {
      render(<StreakTracker data={inactiveStreak} />);
      expect(screen.getByTestId('streak-encouragement')).toBeInTheDocument();
    });

    it('displays encouragement message', () => {
      render(<StreakTracker data={inactiveStreak} />);
      expect(screen.getByText(/Make a forecast today/)).toBeInTheDocument();
    });
  });

  describe('calendar', () => {
    it('does not show calendar by default', () => {
      render(<StreakTracker data={activeStreak} />);
      expect(screen.queryByTestId('streak-calendar')).not.toBeInTheDocument();
    });

    it('shows calendar when showCalendar is true', () => {
      render(<StreakTracker data={activeStreak} showCalendar activeDates={[today]} />);
      expect(screen.getByTestId('streak-calendar')).toBeInTheDocument();
    });
  });

  describe('milestone celebration', () => {
    it('does not show milestone by default', () => {
      render(<StreakTracker data={milestoneStreak} />);
      expect(screen.queryByTestId('streak-milestone')).not.toBeInTheDocument();
    });

    it('shows milestone when showMilestone is true and at milestone', () => {
      render(<StreakTracker data={milestoneStreak} showMilestone />);
      expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
    });

    it('calls onMilestoneReached callback', () => {
      const onMilestoneReached = vi.fn();
      render(
        <StreakTracker
          data={milestoneStreak}
          showMilestone
          onMilestoneReached={onMilestoneReached}
        />
      );
      expect(onMilestoneReached).toHaveBeenCalledWith(30);
    });

    it('calls onMilestoneDismiss when dismissed', () => {
      const onMilestoneDismiss = vi.fn();
      render(
        <StreakTracker
          data={milestoneStreak}
          showMilestone
          onMilestoneDismiss={onMilestoneDismiss}
        />
      );

      fireEvent.click(screen.getByTestId('milestone-dismiss'));
      expect(onMilestoneDismiss).toHaveBeenCalledTimes(1);
    });

    it('hides milestone after dismiss', () => {
      render(<StreakTracker data={milestoneStreak} showMilestone />);

      expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('milestone-dismiss'));
      expect(screen.queryByTestId('streak-milestone')).not.toBeInTheDocument();
    });
  });
});

describe('useStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useStreak());

      expect(result.current.streakData.currentStreak).toBe(0);
      expect(result.current.streakData.longestStreak).toBe(0);
      expect(result.current.streakData.isActive).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('accepts initial data', () => {
      const { result } = renderHook(() => useStreak(activeStreak));

      expect(result.current.streakData.currentStreak).toBe(15);
      expect(result.current.streakData.longestStreak).toBe(21);
      expect(result.current.streakData.isActive).toBe(true);
    });
  });

  describe('milestone detection', () => {
    it('detects milestone streak', () => {
      const { result } = renderHook(() => useStreak(milestoneStreak));
      expect(result.current.isMilestone).toBe(true);
    });

    it('detects non-milestone streak', () => {
      const { result } = renderHook(() => useStreak(activeStreak));
      expect(result.current.isMilestone).toBe(false);
    });
  });

  describe('next milestone calculation', () => {
    it('returns 7 for new streaks', () => {
      const { result } = renderHook(() => useStreak());
      expect(result.current.nextMilestone).toBe(7);
    });

    it('returns 14 after 7-day streak', () => {
      const streak = { ...activeStreak, currentStreak: 8 };
      const { result } = renderHook(() => useStreak(streak));
      expect(result.current.nextMilestone).toBe(14);
    });

    it('returns 30 after 14-day streak', () => {
      const streak = { ...activeStreak, currentStreak: 15 };
      const { result } = renderHook(() => useStreak(streak));
      expect(result.current.nextMilestone).toBe(30);
    });

    it('returns 365 for high streaks', () => {
      const streak = { ...activeStreak, currentStreak: 200 };
      const { result } = renderHook(() => useStreak(streak));
      expect(result.current.nextMilestone).toBe(365);
    });
  });

  describe('recordActivity', () => {
    it('starts new streak when no previous activity', async () => {
      const { result } = renderHook(() => useStreak());

      await act(async () => {
        await result.current.recordActivity();
      });

      expect(result.current.streakData.currentStreak).toBe(1);
      expect(result.current.streakData.isActive).toBe(true);
    });

    it('continues streak when last activity was yesterday', async () => {
      const yesterdayStreak: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: '2024-06-14',
        totalActiveDays: 20,
        streakStartDate: '2024-06-10',
        isActive: true,
      };

      const { result } = renderHook(() => useStreak(yesterdayStreak));

      await act(async () => {
        await result.current.recordActivity();
      });

      expect(result.current.streakData.currentStreak).toBe(6);
    });

    it('does not double-count activity for today', async () => {
      const todayStreak: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: '2024-06-15', // Today
        totalActiveDays: 20,
        streakStartDate: '2024-06-10',
        isActive: true,
      };

      const { result } = renderHook(() => useStreak(todayStreak));

      await act(async () => {
        await result.current.recordActivity();
      });

      // Should not increase since already recorded today
      expect(result.current.streakData.currentStreak).toBe(5);
    });

    it('updates longest streak when exceeding previous best', async () => {
      const atBestStreak: StreakData = {
        currentStreak: 10,
        longestStreak: 10,
        lastActivityDate: '2024-06-14',
        totalActiveDays: 20,
        streakStartDate: '2024-06-05',
        isActive: true,
      };

      const { result } = renderHook(() => useStreak(atBestStreak));

      await act(async () => {
        await result.current.recordActivity();
      });

      expect(result.current.streakData.longestStreak).toBe(11);
    });
  });

  describe('checkStreak', () => {
    it('breaks streak when more than 1 day since activity', async () => {
      const oldStreak: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: '2024-06-12', // 3 days ago
        totalActiveDays: 20,
        streakStartDate: '2024-06-08',
        isActive: true,
      };

      const { result } = renderHook(() => useStreak(oldStreak));

      await act(async () => {
        await result.current.checkStreak();
      });

      expect(result.current.streakData.currentStreak).toBe(0);
      expect(result.current.streakData.isActive).toBe(false);
    });

    it('preserves streak when activity was yesterday', async () => {
      const recentStreak: StreakData = {
        currentStreak: 5,
        longestStreak: 10,
        lastActivityDate: '2024-06-14', // Yesterday
        totalActiveDays: 20,
        streakStartDate: '2024-06-10',
        isActive: true,
      };

      const { result } = renderHook(() => useStreak(recentStreak));

      await act(async () => {
        await result.current.checkStreak();
      });

      expect(result.current.streakData.currentStreak).toBe(5);
    });
  });

  describe('resetStreak', () => {
    it('resets current streak to 0', () => {
      const { result } = renderHook(() => useStreak(activeStreak));

      act(() => {
        result.current.resetStreak();
      });

      expect(result.current.streakData.currentStreak).toBe(0);
      expect(result.current.streakData.isActive).toBe(false);
      expect(result.current.streakData.streakStartDate).toBeNull();
    });

    it('preserves longest streak', () => {
      const { result } = renderHook(() => useStreak(activeStreak));

      act(() => {
        result.current.resetStreak();
      });

      expect(result.current.streakData.longestStreak).toBe(21);
    });

    it('preserves total active days', () => {
      const { result } = renderHook(() => useStreak(activeStreak));

      act(() => {
        result.current.resetStreak();
      });

      expect(result.current.streakData.totalActiveDays).toBe(45);
    });
  });
});
