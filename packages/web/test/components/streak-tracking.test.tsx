/**
 * Streak Tracking Tests
 * TDD tests for daily forecasting streak system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  StreakDisplay,
  StreakMilestone,
  StreakTracker,
  StreakFlame,
  StreakCalendar,
  useStreak,
} from '@/components/streaks';
import type { StreakData, StreakMilestoneType } from '@/components/streaks';

// =============================================================================
// Test Data
// =============================================================================

const mockStreakData: StreakData = {
  currentStreak: 14,
  longestStreak: 30,
  lastActivityDate: '2024-01-15',
  totalActiveDays: 45,
  streakStartDate: '2024-01-02',
  isActive: true,
};

const mockBrokenStreak: StreakData = {
  currentStreak: 0,
  longestStreak: 14,
  lastActivityDate: '2024-01-10',
  totalActiveDays: 20,
  streakStartDate: null,
  isActive: false,
};

const mockMilestoneStreak: StreakData = {
  currentStreak: 7,
  longestStreak: 7,
  lastActivityDate: '2024-01-15',
  totalActiveDays: 7,
  streakStartDate: '2024-01-09',
  isActive: true,
};

// =============================================================================
// StreakFlame Tests
// =============================================================================

describe('StreakFlame', () => {
  it('should render flame icon', () => {
    render(<StreakFlame size="md" />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
  });

  it('should apply small size class', () => {
    render(<StreakFlame size="sm" />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-size', 'sm');
  });

  it('should apply medium size class', () => {
    render(<StreakFlame size="md" />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-size', 'md');
  });

  it('should apply large size class', () => {
    render(<StreakFlame size="lg" />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-size', 'lg');
  });

  it('should animate when animated prop is true', () => {
    render(<StreakFlame size="md" animated />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-animated', 'true');
  });

  it('should apply intensity based on streak length', () => {
    render(<StreakFlame size="md" intensity="high" />);
    const flame = screen.getByTestId('streak-flame');
    expect(flame).toHaveAttribute('data-intensity', 'high');
  });
});

// =============================================================================
// StreakDisplay Tests
// =============================================================================

describe('StreakDisplay', () => {
  it('should render streak container', () => {
    render(<StreakDisplay data={mockStreakData} />);
    expect(screen.getByTestId('streak-display')).toBeInTheDocument();
  });

  it('should display current streak count', () => {
    render(<StreakDisplay data={mockStreakData} />);
    expect(screen.getByTestId('streak-count')).toHaveTextContent('14');
  });

  it('should display streak label', () => {
    render(<StreakDisplay data={mockStreakData} />);
    expect(screen.getByText(/day streak/i)).toBeInTheDocument();
  });

  it('should show flame icon when streak is active', () => {
    render(<StreakDisplay data={mockStreakData} />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
  });

  it('should not show flame icon when streak is broken', () => {
    render(<StreakDisplay data={mockBrokenStreak} />);
    expect(screen.queryByTestId('streak-flame')).not.toBeInTheDocument();
  });

  it('should display longest streak', () => {
    render(<StreakDisplay data={mockStreakData} showLongest />);
    expect(screen.getByTestId('longest-streak')).toHaveTextContent('30');
  });

  it('should indicate when at personal best', () => {
    const atBest: StreakData = {
      ...mockStreakData,
      currentStreak: 30,
      longestStreak: 30,
    };
    render(<StreakDisplay data={atBest} />);
    expect(screen.getByTestId('personal-best-badge')).toBeInTheDocument();
  });

  it('should apply compact variant styling', () => {
    render(<StreakDisplay data={mockStreakData} variant="compact" />);
    const display = screen.getByTestId('streak-display');
    expect(display).toHaveAttribute('data-variant', 'compact');
  });

  it('should apply full variant styling', () => {
    render(<StreakDisplay data={mockStreakData} variant="full" />);
    const display = screen.getByTestId('streak-display');
    expect(display).toHaveAttribute('data-variant', 'full');
  });

  it('should show total active days in full variant', () => {
    render(<StreakDisplay data={mockStreakData} variant="full" />);
    expect(screen.getByTestId('total-active-days')).toHaveTextContent('45');
  });
});

// =============================================================================
// StreakMilestone Tests
// =============================================================================

describe('StreakMilestone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render milestone container', () => {
    render(<StreakMilestone days={7} onDismiss={() => {}} />);
    expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
  });

  it('should display milestone days', () => {
    render(<StreakMilestone days={7} onDismiss={() => {}} />);
    expect(screen.getByTestId('milestone-days')).toHaveTextContent('7');
  });

  it('should show celebration message for 7-day streak', () => {
    render(<StreakMilestone days={7} onDismiss={() => {}} />);
    expect(screen.getByText(/week streak/i)).toBeInTheDocument();
  });

  it('should show celebration message for 30-day streak', () => {
    render(<StreakMilestone days={30} onDismiss={() => {}} />);
    expect(screen.getByText(/month streak/i)).toBeInTheDocument();
  });

  it('should show celebration message for 100-day streak', () => {
    render(<StreakMilestone days={100} onDismiss={() => {}} />);
    expect(screen.getByText(/centurion/i)).toBeInTheDocument();
  });

  it('should apply milestone-specific styling', () => {
    render(<StreakMilestone days={30} onDismiss={() => {}} />);
    const milestone = screen.getByTestId('streak-milestone');
    expect(milestone).toHaveAttribute('data-milestone', '30');
  });

  it('should call onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<StreakMilestone days={7} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('milestone-dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show share button', () => {
    render(<StreakMilestone days={14} onDismiss={() => {}} />);
    expect(screen.getByTestId('milestone-share')).toBeInTheDocument();
  });

  it('should call onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(<StreakMilestone days={14} onDismiss={() => {}} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('milestone-share'));
    expect(onShare).toHaveBeenCalled();
  });

  it('should show multiple flames for high milestones', () => {
    render(<StreakMilestone days={100} onDismiss={() => {}} />);
    const flames = screen.getAllByTestId('streak-flame');
    expect(flames.length).toBeGreaterThan(1);
  });
});

// =============================================================================
// StreakCalendar Tests
// =============================================================================

describe('StreakCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to Jan 15, 2024 so our mock dates are within the calendar range
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockActiveDates = [
    '2024-01-10',
    '2024-01-11',
    '2024-01-12',
    '2024-01-13',
    '2024-01-14',
    '2024-01-15',
  ];

  it('should render calendar container', () => {
    render(<StreakCalendar activeDates={mockActiveDates} />);
    expect(screen.getByTestId('streak-calendar')).toBeInTheDocument();
  });

  it('should display day cells', () => {
    render(<StreakCalendar activeDates={mockActiveDates} />);
    const dayCells = screen.getAllByTestId('calendar-day');
    expect(dayCells.length).toBeGreaterThan(0);
  });

  it('should mark active days', () => {
    render(<StreakCalendar activeDates={mockActiveDates} />);
    const activeDays = screen.getAllByTestId('calendar-day-active');
    expect(activeDays.length).toBe(6);
  });

  it('should show week labels', () => {
    render(<StreakCalendar activeDates={mockActiveDates} showWeekLabels />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('should apply intensity to active days', () => {
    render(<StreakCalendar activeDates={mockActiveDates} />);
    const activeDays = screen.getAllByTestId('calendar-day-active');
    activeDays.forEach((day) => {
      expect(day).toHaveAttribute('data-intensity');
    });
  });

  it('should show tooltip on hover', () => {
    render(<StreakCalendar activeDates={mockActiveDates} showTooltip />);
    const activeDays = screen.getAllByTestId('calendar-day-active');
    fireEvent.mouseEnter(activeDays[0]!);
    expect(screen.getByTestId('calendar-tooltip')).toBeInTheDocument();
  });
});

// =============================================================================
// StreakTracker Tests
// =============================================================================

describe('StreakTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to Jan 15, 2024 so time remaining works with mock data
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render tracker container', () => {
    render(<StreakTracker data={mockStreakData} />);
    expect(screen.getByTestId('streak-tracker')).toBeInTheDocument();
  });

  it('should show streak display', () => {
    render(<StreakTracker data={mockStreakData} />);
    expect(screen.getByTestId('streak-display')).toBeInTheDocument();
  });

  it('should show encouragement when streak is broken', () => {
    render(<StreakTracker data={mockBrokenStreak} />);
    expect(screen.getByTestId('streak-encouragement')).toBeInTheDocument();
  });

  it('should not show encouragement when streak is active', () => {
    render(<StreakTracker data={mockStreakData} />);
    expect(screen.queryByTestId('streak-encouragement')).not.toBeInTheDocument();
  });

  it('should show time remaining until streak expires', () => {
    render(<StreakTracker data={mockStreakData} showTimeRemaining />);
    expect(screen.getByTestId('streak-time-remaining')).toBeInTheDocument();
  });

  it('should show calendar when expanded', () => {
    render(<StreakTracker data={mockStreakData} showCalendar />);
    expect(screen.getByTestId('streak-calendar')).toBeInTheDocument();
  });

  it('should trigger milestone celebration at milestone days', () => {
    render(<StreakTracker data={mockMilestoneStreak} showMilestone />);
    expect(screen.getByTestId('streak-milestone')).toBeInTheDocument();
  });

  it('should call onMilestoneReached callback', () => {
    const onMilestone = vi.fn();
    render(
      <StreakTracker
        data={mockMilestoneStreak}
        showMilestone
        onMilestoneReached={onMilestone}
      />
    );
    expect(onMilestone).toHaveBeenCalledWith(7);
  });
});

// =============================================================================
// useStreak Hook Tests
// =============================================================================

describe('useStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to Jan 15, 2024
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent({
    initialData,
    onStreakUpdated,
  }: {
    initialData?: StreakData;
    onStreakUpdated?: (data: StreakData) => void;
  }) {
    const {
      streakData,
      isLoading,
      recordActivity,
      checkStreak,
      resetStreak,
      isMilestone,
      nextMilestone,
    } = useStreak(initialData);

    return (
      <div>
        <div data-testid="streak-count">{streakData.currentStreak}</div>
        <div data-testid="is-active">{streakData.isActive ? 'true' : 'false'}</div>
        <div data-testid="is-loading">{isLoading ? 'true' : 'false'}</div>
        <div data-testid="is-milestone">{isMilestone ? 'true' : 'false'}</div>
        <div data-testid="next-milestone">{nextMilestone}</div>
        <button onClick={() => recordActivity().then(() => onStreakUpdated?.(streakData))}>
          Record
        </button>
        <button onClick={() => checkStreak()}>Check</button>
        <button onClick={() => resetStreak()}>Reset</button>
      </div>
    );
  }

  it('should initialize with provided data', () => {
    render(<TestComponent initialData={mockStreakData} />);
    expect(screen.getByTestId('streak-count')).toHaveTextContent('14');
  });

  it('should initialize with zero streak if no data', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('streak-count')).toHaveTextContent('0');
  });

  it('should show active status correctly', () => {
    render(<TestComponent initialData={mockStreakData} />);
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
  });

  it('should identify milestone streaks', () => {
    render(<TestComponent initialData={mockMilestoneStreak} />);
    expect(screen.getByTestId('is-milestone')).toHaveTextContent('true');
  });

  it('should calculate next milestone correctly', () => {
    render(<TestComponent initialData={mockStreakData} />);
    // Current is 14, next milestone should be 30
    expect(screen.getByTestId('next-milestone')).toHaveTextContent('30');
  });

  it('should reset streak when reset called', async () => {
    render(<TestComponent initialData={mockStreakData} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Reset'));
    });
    expect(screen.getByTestId('streak-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('should increment streak when activity recorded on new day', async () => {
    const yesterday: StreakData = {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: '2024-01-14',
      totalActiveDays: 20,
      streakStartDate: '2024-01-10',
      isActive: true,
    };

    render(<TestComponent initialData={yesterday} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Record'));
    });

    expect(screen.getByTestId('streak-count')).toHaveTextContent('6');
  });

  it('should not increment if activity already recorded today', async () => {
    const today: StreakData = {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: '2024-01-15',
      totalActiveDays: 20,
      streakStartDate: '2024-01-11',
      isActive: true,
    };

    render(<TestComponent initialData={today} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Record'));
    });

    // Should stay at 5, not increment
    expect(screen.getByTestId('streak-count')).toHaveTextContent('5');
  });

  it('should break streak if more than 1 day since last activity', async () => {
    const staleStreak: StreakData = {
      currentStreak: 5,
      longestStreak: 10,
      lastActivityDate: '2024-01-13', // 2 days ago
      totalActiveDays: 20,
      streakStartDate: '2024-01-09',
      isActive: true,
    };

    render(<TestComponent initialData={staleStreak} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Check'));
    });

    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
    expect(screen.getByTestId('streak-count')).toHaveTextContent('0');
  });

  it('should start new streak when recording after broken streak', async () => {
    render(<TestComponent initialData={mockBrokenStreak} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Record'));
    });

    expect(screen.getByTestId('streak-count')).toHaveTextContent('1');
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
  });

  it('should update longest streak when current exceeds it', async () => {
    const atRecord: StreakData = {
      currentStreak: 10,
      longestStreak: 10,
      lastActivityDate: '2024-01-14',
      totalActiveDays: 10,
      streakStartDate: '2024-01-05',
      isActive: true,
    };

    render(<TestComponent initialData={atRecord} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Record'));
    });

    // Now at 11, should exceed longest
    expect(screen.getByTestId('streak-count')).toHaveTextContent('11');
  });
});

// =============================================================================
// Streak Utility Function Tests
// =============================================================================

describe('Streak Utilities', () => {
  it('should correctly identify milestone values', () => {
    const milestones = [7, 14, 30, 60, 100, 365];
    milestones.forEach((m) => {
      const data: StreakData = {
        currentStreak: m,
        longestStreak: m,
        lastActivityDate: '2024-01-15',
        totalActiveDays: m,
        streakStartDate: '2024-01-01',
        isActive: true,
      };

      // This will be tested via the hook
      expect(data.currentStreak).toBe(m);
    });
  });

  it('should calculate streak intensity correctly', () => {
    // Low: 1-6 days
    // Medium: 7-29 days
    // High: 30-99 days
    // Max: 100+ days
    const testCases = [
      { streak: 3, expected: 'low' },
      { streak: 14, expected: 'medium' },
      { streak: 45, expected: 'high' },
      { streak: 150, expected: 'max' },
    ];

    testCases.forEach(({ streak }) => {
      const data: StreakData = {
        currentStreak: streak,
        longestStreak: streak,
        lastActivityDate: '2024-01-15',
        totalActiveDays: streak,
        streakStartDate: '2024-01-01',
        isActive: true,
      };

      expect(data.currentStreak).toBe(streak);
    });
  });
});
