/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type {
  UserStats,
  AchievementEvent,
} from '../../src/components/achievement-tracking';
import {
  checkAchievements,
  evaluateAchievement,
  AchievementTracker,
  AchievementEventLog,
  AchievementUnlockBanner,
  NearestAchievementCard,
  AchievementTrackerDashboard,
  useAchievementTracker,
} from '../../src/components/achievement-tracking';

// =============================================================================
// Test Data
// =============================================================================

const mockStats: UserStats = {
  currentStreak: 10,
  longestStreak: 15,
  totalForecasts: 55,
  accuracyPercent: 72,
  currentTier: 'EXPERT',
};

const mockEmptyStats: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalForecasts: 0,
  accuracyPercent: 0,
  currentTier: 'NOVICE',
};

const mockEvents: AchievementEvent[] = [
  {
    id: 'evt-1',
    achievementId: 'streak-7',
    type: 'unlocked',
    timestamp: '2025-01-10T12:00:00Z',
  },
  {
    id: 'evt-2',
    achievementId: 'forecasts-10',
    type: 'unlocked',
    timestamp: '2025-01-08T10:00:00Z',
  },
  {
    id: 'evt-3',
    achievementId: 'accuracy-80',
    type: 'progress',
    timestamp: '2025-01-12T09:00:00Z',
    detail: '72% of 80% target',
  },
];

// =============================================================================
// checkAchievements Tests
// =============================================================================

describe('checkAchievements', () => {
  it('detects completed streak achievements', () => {
    const results = checkAchievements(mockStats);
    const streak7 = results.find((r) => r.achievementId === 'streak-7');
    expect(streak7).toBeDefined();
    expect(streak7!.completed).toBe(true);
  });

  it('detects incomplete achievements', () => {
    const results = checkAchievements(mockStats);
    const streak100 = results.find((r) => r.achievementId === 'streak-100');
    expect(streak100).toBeDefined();
    expect(streak100!.completed).toBe(false);
  });

  it('calculates progress percentage for streak', () => {
    const results = checkAchievements(mockStats);
    const streak30 = results.find((r) => r.achievementId === 'streak-30');
    expect(streak30).toBeDefined();
    expect(streak30!.percentage).toBeGreaterThan(0);
    expect(streak30!.percentage).toBeLessThan(100);
  });

  it('detects completed volume achievements', () => {
    const results = checkAchievements(mockStats);
    const vol10 = results.find((r) => r.achievementId === 'forecasts-10');
    const vol50 = results.find((r) => r.achievementId === 'forecasts-50');
    expect(vol10!.completed).toBe(true);
    expect(vol50!.completed).toBe(true);
  });

  it('detects completed accuracy achievements', () => {
    const results = checkAchievements(mockStats);
    const acc70 = results.find((r) => r.achievementId === 'accuracy-70');
    expect(acc70!.completed).toBe(true);
  });

  it('detects incomplete accuracy achievements', () => {
    const results = checkAchievements(mockStats);
    const acc80 = results.find((r) => r.achievementId === 'accuracy-80');
    expect(acc80!.completed).toBe(false);
  });

  it('detects tier achievements', () => {
    const results = checkAchievements(mockStats);
    const tierExpert = results.find((r) => r.achievementId === 'tier-expert');
    expect(tierExpert!.completed).toBe(true);
  });

  it('returns all achievements', () => {
    const results = checkAchievements(mockStats);
    expect(results.length).toBe(14);
  });

  it('handles empty stats', () => {
    const results = checkAchievements(mockEmptyStats);
    const completed = results.filter((r) => r.completed);
    expect(completed.length).toBe(0);
  });

  it('caps percentage at 100', () => {
    const results = checkAchievements(mockStats);
    for (const r of results) {
      expect(r.percentage).toBeLessThanOrEqual(100);
    }
  });
});

// =============================================================================
// evaluateAchievement Tests
// =============================================================================

describe('evaluateAchievement', () => {
  it('evaluates streak achievement correctly', () => {
    const result = evaluateAchievement('streak-7', mockStats);
    expect(result.completed).toBe(true);
    expect(result.currentValue).toBeGreaterThanOrEqual(7);
  });

  it('evaluates volume achievement correctly', () => {
    const result = evaluateAchievement('forecasts-50', mockStats);
    expect(result.completed).toBe(true);
    expect(result.currentValue).toBe(55);
  });

  it('evaluates accuracy achievement correctly', () => {
    const result = evaluateAchievement('accuracy-70', mockStats);
    expect(result.completed).toBe(true);
    expect(result.currentValue).toBe(72);
  });

  it('evaluates tier achievement correctly', () => {
    const result = evaluateAchievement('tier-expert', mockStats);
    expect(result.completed).toBe(true);
  });

  it('returns zero for unknown achievement', () => {
    const result = evaluateAchievement('unknown-id', mockStats);
    expect(result.currentValue).toBe(0);
    expect(result.completed).toBe(false);
  });
});

// =============================================================================
// AchievementTracker Component Tests
// =============================================================================

describe('AchievementTracker', () => {
  it('renders tracker', () => {
    render(<AchievementTracker stats={mockStats} />);
    expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
  });

  it('shows completed count', () => {
    render(<AchievementTracker stats={mockStats} />);
    const tracker = screen.getByTestId('achievement-tracker');
    expect(tracker).toHaveTextContent(/\d+/);
  });

  it('shows achievement items', () => {
    render(<AchievementTracker stats={mockStats} />);
    const items = screen.getAllByTestId('tracked-achievement');
    expect(items.length).toBeGreaterThan(0);
  });

  it('marks completed achievements', () => {
    render(<AchievementTracker stats={mockStats} />);
    const items = screen.getAllByTestId('tracked-achievement');
    const completedItems = items.filter((el) => el.classList.contains('completed'));
    expect(completedItems.length).toBeGreaterThan(0);
  });

  it('shows progress for incomplete achievements', () => {
    render(<AchievementTracker stats={mockStats} />);
    const bars = screen.getAllByTestId('tracking-progress-bar');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('handles empty stats', () => {
    render(<AchievementTracker stats={mockEmptyStats} />);
    expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
  });

  it('filters by category when provided', () => {
    render(<AchievementTracker stats={mockStats} category="streak" />);
    const items = screen.getAllByTestId('tracked-achievement');
    expect(items.length).toBe(3);
  });
});

// =============================================================================
// AchievementEventLog Component Tests
// =============================================================================

describe('AchievementEventLog', () => {
  it('renders event log', () => {
    render(<AchievementEventLog events={mockEvents} />);
    expect(screen.getByTestId('achievement-event-log')).toBeInTheDocument();
  });

  it('shows events', () => {
    render(<AchievementEventLog events={mockEvents} />);
    const entries = screen.getAllByTestId('event-entry');
    expect(entries.length).toBe(3);
  });

  it('shows event type', () => {
    render(<AchievementEventLog events={mockEvents} />);
    expect(screen.getAllByText(/unlocked/i).length).toBeGreaterThan(0);
  });

  it('shows empty state', () => {
    render(<AchievementEventLog events={[]} />);
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });

  it('shows event detail when present', () => {
    render(<AchievementEventLog events={mockEvents} />);
    expect(screen.getByText(/72%/)).toBeInTheDocument();
  });

  it('limits displayed events', () => {
    render(<AchievementEventLog events={mockEvents} maxEvents={2} />);
    const entries = screen.getAllByTestId('event-entry');
    expect(entries.length).toBe(2);
  });
});

// =============================================================================
// AchievementUnlockBanner Component Tests
// =============================================================================

describe('AchievementUnlockBanner', () => {
  it('renders banner', () => {
    render(
      <AchievementUnlockBanner achievementId="streak-7" onDismiss={() => {}} />
    );
    expect(screen.getByTestId('unlock-banner')).toBeInTheDocument();
  });

  it('shows achievement name', () => {
    render(
      <AchievementUnlockBanner achievementId="streak-7" onDismiss={() => {}} />
    );
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows unlock message', () => {
    render(
      <AchievementUnlockBanner achievementId="streak-7" onDismiss={() => {}} />
    );
    expect(screen.getAllByText(/unlocked/i).length).toBeGreaterThan(0);
  });

  it('shows achievement icon', () => {
    render(
      <AchievementUnlockBanner achievementId="streak-7" onDismiss={() => {}} />
    );
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('calls onDismiss when clicked', () => {
    const onDismiss = vi.fn();
    render(
      <AchievementUnlockBanner achievementId="streak-7" onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByTestId('dismiss-banner'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('handles unknown achievement gracefully', () => {
    render(
      <AchievementUnlockBanner achievementId="unknown" onDismiss={() => {}} />
    );
    expect(screen.getByTestId('unlock-banner')).toBeInTheDocument();
  });
});

// =============================================================================
// NearestAchievementCard Component Tests
// =============================================================================

describe('NearestAchievementCard', () => {
  it('renders card', () => {
    render(<NearestAchievementCard stats={mockStats} />);
    expect(screen.getByTestId('nearest-achievement')).toBeInTheDocument();
  });

  it('shows nearest achievement name', () => {
    render(<NearestAchievementCard stats={mockStats} />);
    const card = screen.getByTestId('nearest-achievement');
    expect(card.textContent).toBeTruthy();
  });

  it('shows progress towards nearest', () => {
    render(<NearestAchievementCard stats={mockStats} />);
    expect(screen.getByTestId('nearest-progress-bar')).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<NearestAchievementCard stats={mockStats} />);
    const card = screen.getByTestId('nearest-achievement');
    expect(card).toHaveTextContent(/%/);
  });

  it('shows empty state when all completed', () => {
    const maxStats: UserStats = {
      currentStreak: 200,
      longestStreak: 200,
      totalForecasts: 2000,
      accuracyPercent: 95,
      currentTier: 'GRANDMASTER',
    };
    render(<NearestAchievementCard stats={maxStats} />);
    expect(screen.getByText(/all.*completed/i)).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementTrackerDashboard Component Tests
// =============================================================================

describe('AchievementTrackerDashboard', () => {
  it('renders dashboard', () => {
    render(
      <AchievementTrackerDashboard stats={mockStats} events={mockEvents} />
    );
    expect(screen.getByTestId('achievement-tracker-dashboard')).toBeInTheDocument();
  });

  it('shows tracker', () => {
    render(
      <AchievementTrackerDashboard stats={mockStats} events={mockEvents} />
    );
    expect(screen.getByTestId('achievement-tracker')).toBeInTheDocument();
  });

  it('shows event log', () => {
    render(
      <AchievementTrackerDashboard stats={mockStats} events={mockEvents} />
    );
    expect(screen.getByTestId('achievement-event-log')).toBeInTheDocument();
  });

  it('shows nearest achievement', () => {
    render(
      <AchievementTrackerDashboard stats={mockStats} events={mockEvents} />
    );
    expect(screen.getByTestId('nearest-achievement')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <AchievementTrackerDashboard
        stats={mockEmptyStats}
        events={[]}
        loading={true}
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows dashboard title', () => {
    render(
      <AchievementTrackerDashboard stats={mockStats} events={mockEvents} />
    );
    expect(screen.getAllByText(/track/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// useAchievementTracker Hook Tests
// =============================================================================

describe('useAchievementTracker', () => {
  function TestComponent({ stats }: { stats: UserStats }) {
    const {
      trackedAchievements,
      completedCount,
      totalCount,
      nearestAchievement,
      newlyUnlocked,
      dismissUnlock,
    } = useAchievementTracker(stats);

    return (
      <div>
        <span data-testid="completed-count">{completedCount}</span>
        <span data-testid="total-count">{totalCount}</span>
        <span data-testid="tracked-count">{trackedAchievements.length}</span>
        <span data-testid="nearest-id">
          {nearestAchievement?.achievementId ?? 'none'}
        </span>
        <span data-testid="newly-unlocked-count">{newlyUnlocked.length}</span>
        {newlyUnlocked.map((id) => (
          <button key={id} data-testid={`dismiss-${id}`} onClick={() => dismissUnlock(id)}>
            Dismiss {id}
          </button>
        ))}
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates completed count', () => {
    render(<TestComponent stats={mockStats} />);
    const count = parseInt(screen.getByTestId('completed-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('calculates total count', () => {
    render(<TestComponent stats={mockStats} />);
    expect(screen.getByTestId('total-count')).toHaveTextContent('14');
  });

  it('tracks all achievements', () => {
    render(<TestComponent stats={mockStats} />);
    expect(screen.getByTestId('tracked-count')).toHaveTextContent('14');
  });

  it('finds nearest achievement', () => {
    render(<TestComponent stats={mockStats} />);
    expect(screen.getByTestId('nearest-id')).not.toHaveTextContent('none');
  });

  it('handles empty stats', () => {
    render(<TestComponent stats={mockEmptyStats} />);
    expect(screen.getByTestId('completed-count')).toHaveTextContent('0');
  });

  it('detects newly unlocked achievements', () => {
    const { rerender } = render(<TestComponent stats={mockEmptyStats} />);
    act(() => {
      rerender(<TestComponent stats={mockStats} />);
    });
    const count = parseInt(screen.getByTestId('newly-unlocked-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('dismisses unlocked achievement', () => {
    const { rerender } = render(<TestComponent stats={mockEmptyStats} />);
    act(() => {
      rerender(<TestComponent stats={mockStats} />);
    });
    const beforeCount = parseInt(screen.getByTestId('newly-unlocked-count').textContent!);
    if (beforeCount > 0) {
      const buttons = screen.getAllByText(/^Dismiss /);
      fireEvent.click(buttons[0]!);
      const afterCount = parseInt(screen.getByTestId('newly-unlocked-count').textContent!);
      expect(afterCount).toBe(beforeCount - 1);
    }
  });
});
