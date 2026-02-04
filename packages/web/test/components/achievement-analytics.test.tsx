/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  AchievementUnlockRecord,
  AchievementAnalyticsData,
} from '../../src/components/achievement-analytics';
import {
  UnlockRateCard,
  UnlockTimeline,
  CategoryBreakdownChart,
  RarestAchievementsPanel,
  PopularAchievementsPanel,
  AchievementCompletionFunnel,
  AchievementAnalyticsDashboard,
  useAchievementAnalytics,
} from '../../src/components/achievement-analytics';

// =============================================================================
// Test Data
// =============================================================================

const mockUnlocks: AchievementUnlockRecord[] = [
  {
    achievementId: 'streak-7',
    achievementName: '7 Day Streak',
    achievementIcon: '🔥',
    category: 'streak',
    tier: 'NOVICE',
    unlockedAt: '2025-01-10T12:00:00Z',
    totalEligible: 1000,
    totalUnlocked: 800,
  },
  {
    achievementId: 'accuracy-70',
    achievementName: 'Calibrated',
    achievementIcon: '🎯',
    category: 'accuracy',
    tier: 'APPRENTICE',
    unlockedAt: '2025-01-15T14:00:00Z',
    totalEligible: 1000,
    totalUnlocked: 350,
  },
  {
    achievementId: 'forecasts-100',
    achievementName: 'Century',
    achievementIcon: '📊',
    category: 'volume',
    tier: 'EXPERT',
    unlockedAt: '2025-02-01T10:00:00Z',
    totalEligible: 1000,
    totalUnlocked: 120,
  },
  {
    achievementId: 'tier-master',
    achievementName: 'Master Forecaster',
    achievementIcon: '⭐',
    category: 'tier',
    tier: 'MASTER',
    unlockedAt: '2025-02-10T08:00:00Z',
    totalEligible: 1000,
    totalUnlocked: 45,
  },
  {
    achievementId: 'streak-30',
    achievementName: '30 Day Streak',
    achievementIcon: '🔥',
    category: 'streak',
    tier: 'EXPERT',
    unlockedAt: '2025-02-15T11:00:00Z',
    totalEligible: 1000,
    totalUnlocked: 200,
  },
];

const mockAnalytics: AchievementAnalyticsData = {
  totalAchievements: 14,
  totalUnlocked: 5,
  overallUnlockRate: 35.7,
  unlocks: mockUnlocks,
  periodLabel: 'Last 30 Days',
};

// =============================================================================
// UnlockRateCard Tests
// =============================================================================

describe('UnlockRateCard', () => {
  it('renders card', () => {
    render(<UnlockRateCard totalAchievements={14} totalUnlocked={5} unlockRate={35.7} />);
    expect(screen.getByTestId('unlock-rate-card')).toBeInTheDocument();
  });

  it('shows unlock rate', () => {
    render(<UnlockRateCard totalAchievements={14} totalUnlocked={5} unlockRate={35.7} />);
    const card = screen.getByTestId('unlock-rate-card');
    expect(card).toHaveTextContent('35.7%');
  });

  it('shows total unlocked', () => {
    render(<UnlockRateCard totalAchievements={14} totalUnlocked={5} unlockRate={35.7} />);
    const card = screen.getByTestId('unlock-rate-card');
    expect(card).toHaveTextContent('5');
  });

  it('shows total achievements', () => {
    render(<UnlockRateCard totalAchievements={14} totalUnlocked={5} unlockRate={35.7} />);
    const card = screen.getByTestId('unlock-rate-card');
    expect(card).toHaveTextContent('14');
  });

  it('shows zero state', () => {
    render(<UnlockRateCard totalAchievements={14} totalUnlocked={0} unlockRate={0} />);
    const card = screen.getByTestId('unlock-rate-card');
    expect(card).toHaveTextContent('0%');
  });
});

// =============================================================================
// UnlockTimeline Tests
// =============================================================================

describe('UnlockTimeline', () => {
  it('renders timeline', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    expect(screen.getByTestId('unlock-timeline')).toBeInTheDocument();
  });

  it('shows all unlock entries', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries.length).toBe(5);
  });

  it('shows achievement names', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Calibrated')).toBeInTheDocument();
    expect(screen.getByText('Century')).toBeInTheDocument();
  });

  it('shows icons', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    expect(screen.getAllByText('🔥').length).toBeGreaterThan(0);
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('shows dates', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    expect(screen.getAllByText(/jan|feb/i).length).toBeGreaterThan(0);
  });

  it('shows empty state', () => {
    render(<UnlockTimeline unlocks={[]} />);
    expect(screen.getByText(/no unlocks/i)).toBeInTheDocument();
  });

  it('orders by most recent first', () => {
    render(<UnlockTimeline unlocks={mockUnlocks} />);
    const entries = screen.getAllByTestId('timeline-entry');
    expect(entries[0]).toHaveTextContent('30 Day Streak');
  });
});

// =============================================================================
// CategoryBreakdownChart Tests
// =============================================================================

describe('CategoryBreakdownChart', () => {
  it('renders chart', () => {
    render(<CategoryBreakdownChart unlocks={mockUnlocks} />);
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
  });

  it('shows all categories', () => {
    render(<CategoryBreakdownChart unlocks={mockUnlocks} />);
    const chart = screen.getByTestId('category-breakdown');
    expect(chart).toHaveTextContent(/streak/i);
    expect(chart).toHaveTextContent(/accuracy/i);
    expect(chart).toHaveTextContent(/volume/i);
    expect(chart).toHaveTextContent(/tier/i);
  });

  it('shows counts per category', () => {
    render(<CategoryBreakdownChart unlocks={mockUnlocks} />);
    const bars = screen.getAllByTestId('category-bar');
    expect(bars.length).toBeGreaterThanOrEqual(4);
  });

  it('shows empty state', () => {
    render(<CategoryBreakdownChart unlocks={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

// =============================================================================
// RarestAchievementsPanel Tests
// =============================================================================

describe('RarestAchievementsPanel', () => {
  it('renders panel', () => {
    render(<RarestAchievementsPanel unlocks={mockUnlocks} />);
    expect(screen.getByTestId('rarest-achievements')).toBeInTheDocument();
  });

  it('shows rarest first', () => {
    render(<RarestAchievementsPanel unlocks={mockUnlocks} />);
    const items = screen.getAllByTestId('rarest-item');
    expect(items[0]).toHaveTextContent('Master Forecaster');
  });

  it('shows unlock rate per achievement', () => {
    render(<RarestAchievementsPanel unlocks={mockUnlocks} />);
    const panel = screen.getByTestId('rarest-achievements');
    expect(panel).toHaveTextContent('4.5%');
  });

  it('limits displayed items', () => {
    render(<RarestAchievementsPanel unlocks={mockUnlocks} limit={3} />);
    const items = screen.getAllByTestId('rarest-item');
    expect(items.length).toBe(3);
  });

  it('shows empty state', () => {
    render(<RarestAchievementsPanel unlocks={[]} />);
    expect(screen.getByText(/no achievements/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PopularAchievementsPanel Tests
// =============================================================================

describe('PopularAchievementsPanel', () => {
  it('renders panel', () => {
    render(<PopularAchievementsPanel unlocks={mockUnlocks} />);
    expect(screen.getByTestId('popular-achievements')).toBeInTheDocument();
  });

  it('shows most popular first', () => {
    render(<PopularAchievementsPanel unlocks={mockUnlocks} />);
    const items = screen.getAllByTestId('popular-item');
    expect(items[0]).toHaveTextContent('7 Day Streak');
  });

  it('shows unlock rate per achievement', () => {
    render(<PopularAchievementsPanel unlocks={mockUnlocks} />);
    const panel = screen.getByTestId('popular-achievements');
    expect(panel).toHaveTextContent('80%');
  });

  it('limits displayed items', () => {
    render(<PopularAchievementsPanel unlocks={mockUnlocks} limit={2} />);
    const items = screen.getAllByTestId('popular-item');
    expect(items.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<PopularAchievementsPanel unlocks={[]} />);
    expect(screen.getByText(/no achievements/i)).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementCompletionFunnel Tests
// =============================================================================

describe('AchievementCompletionFunnel', () => {
  it('renders funnel', () => {
    render(<AchievementCompletionFunnel unlocks={mockUnlocks} />);
    expect(screen.getByTestId('completion-funnel')).toBeInTheDocument();
  });

  it('shows tiers', () => {
    render(<AchievementCompletionFunnel unlocks={mockUnlocks} />);
    const funnel = screen.getByTestId('completion-funnel');
    expect(funnel).toHaveTextContent(/novice/i);
    expect(funnel).toHaveTextContent(/expert/i);
    expect(funnel).toHaveTextContent(/master/i);
  });

  it('shows tier counts', () => {
    render(<AchievementCompletionFunnel unlocks={mockUnlocks} />);
    const steps = screen.getAllByTestId('funnel-step');
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it('shows empty state', () => {
    render(<AchievementCompletionFunnel unlocks={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementAnalyticsDashboard Tests
// =============================================================================

describe('AchievementAnalyticsDashboard', () => {
  it('renders dashboard', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getAllByText(/analytics/i).length).toBeGreaterThan(0);
  });

  it('shows unlock rate card', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('unlock-rate-card')).toBeInTheDocument();
  });

  it('shows unlock timeline', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('unlock-timeline')).toBeInTheDocument();
  });

  it('shows category breakdown', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
  });

  it('shows rarest panel', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('rarest-achievements')).toBeInTheDocument();
  });

  it('shows popular panel', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('popular-achievements')).toBeInTheDocument();
  });

  it('shows completion funnel', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByTestId('completion-funnel')).toBeInTheDocument();
  });

  it('shows period label', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} />);
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<AchievementAnalyticsDashboard analytics={mockAnalytics} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// useAchievementAnalytics Hook Tests
// =============================================================================

describe('useAchievementAnalytics', () => {
  function TestComponent({ unlocks }: { unlocks: AchievementUnlockRecord[] }) {
    const {
      analytics,
      rarestAchievements,
      popularAchievements,
      categoryBreakdown,
      tierBreakdown,
      averageUnlockRate,
    } = useAchievementAnalytics(unlocks, 14);

    return (
      <div>
        <span data-testid="total-unlocked">{analytics.totalUnlocked}</span>
        <span data-testid="unlock-rate">{analytics.overallUnlockRate}</span>
        <span data-testid="rarest-count">{rarestAchievements.length}</span>
        <span data-testid="popular-count">{popularAchievements.length}</span>
        <span data-testid="category-count">{Object.keys(categoryBreakdown).length}</span>
        <span data-testid="tier-count">{Object.keys(tierBreakdown).length}</span>
        <span data-testid="avg-rate">{averageUnlockRate.toFixed(1)}</span>
      </div>
    );
  }

  it('calculates total unlocked', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    expect(screen.getByTestId('total-unlocked')).toHaveTextContent('5');
  });

  it('calculates overall unlock rate', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    const rate = parseFloat(screen.getByTestId('unlock-rate').textContent!);
    expect(rate).toBeCloseTo(35.7, 1);
  });

  it('sorts rarest achievements', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    expect(screen.getByTestId('rarest-count')).toHaveTextContent('5');
  });

  it('sorts popular achievements', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    expect(screen.getByTestId('popular-count')).toHaveTextContent('5');
  });

  it('groups by category', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    const count = parseInt(screen.getByTestId('category-count').textContent!);
    expect(count).toBe(4);
  });

  it('groups by tier', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    const count = parseInt(screen.getByTestId('tier-count').textContent!);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('calculates average unlock rate', () => {
    render(<TestComponent unlocks={mockUnlocks} />);
    const rate = parseFloat(screen.getByTestId('avg-rate').textContent!);
    expect(rate).toBeGreaterThan(0);
  });

  it('handles empty unlocks', () => {
    render(<TestComponent unlocks={[]} />);
    expect(screen.getByTestId('total-unlocked')).toHaveTextContent('0');
    expect(screen.getByTestId('unlock-rate')).toHaveTextContent('0');
  });
});
