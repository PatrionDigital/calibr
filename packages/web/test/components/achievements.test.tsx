/**
 * Achievement Display Components Tests
 * TDD tests for achievement UI components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AchievementBadge,
  AchievementCard,
  AchievementGrid,
  AchievementProgress,
  type Achievement,
  type AchievementTier,
  type AchievementCategory,
} from '@/components/achievements';

// =============================================================================
// Test Data
// =============================================================================

const mockUnlockedAchievement: Achievement = {
  id: 'STREAK_7',
  name: 'Week Warrior',
  description: 'Made forecasts for 7 consecutive days',
  category: 'STREAK' as AchievementCategory,
  tier: 'BRONZE' as AchievementTier,
  unlockedAt: new Date('2024-01-15'),
  progress: 7,
  maxProgress: 7,
};

const mockInProgressAchievement: Achievement = {
  id: 'FORECASTS_100',
  name: 'Century Forecaster',
  description: 'Make 100 forecasts',
  category: 'VOLUME' as AchievementCategory,
  tier: 'GOLD' as AchievementTier,
  unlockedAt: null,
  progress: 45,
  maxProgress: 100,
};

const mockLockedAchievement: Achievement = {
  id: 'BRIER_ELITE',
  name: 'Elite Forecaster',
  description: 'Achieve a Brier score below 0.10',
  category: 'ACCURACY' as AchievementCategory,
  tier: 'DIAMOND' as AchievementTier,
  unlockedAt: null,
  progress: 0,
  maxProgress: 1,
};

const mockAchievements: Achievement[] = [
  mockUnlockedAchievement,
  mockInProgressAchievement,
  mockLockedAchievement,
];

// =============================================================================
// AchievementBadge Tests
// =============================================================================

describe('AchievementBadge', () => {
  it('should render achievement name', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} />);
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
  });

  it('should display tier badge', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} />);
    expect(screen.getByTestId('achievement-badge')).toBeInTheDocument();
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
  });

  it('should show unlocked state with checkmark', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} />);
    expect(screen.getByTestId('achievement-unlocked')).toBeInTheDocument();
  });

  it('should show locked state for locked achievements', () => {
    render(<AchievementBadge achievement={mockLockedAchievement} />);
    expect(screen.getByTestId('achievement-locked')).toBeInTheDocument();
  });

  it('should apply compact styling when compact prop is true', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} compact />);
    const badge = screen.getByTestId('achievement-badge');
    expect(badge).toHaveClass('compact');
  });

  it('should show category icon based on category', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} showCategory />);
    expect(screen.getByTestId('achievement-category-icon')).toBeInTheDocument();
  });

  it('should apply tier-specific styling', () => {
    render(<AchievementBadge achievement={mockUnlockedAchievement} />);
    const badge = screen.getByTestId('achievement-badge');
    expect(badge).toHaveAttribute('data-tier', 'BRONZE');
  });
});

// =============================================================================
// AchievementCard Tests
// =============================================================================

describe('AchievementCard', () => {
  it('should render achievement name and description', () => {
    render(<AchievementCard achievement={mockUnlockedAchievement} />);
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Made forecasts for 7 consecutive days')).toBeInTheDocument();
  });

  it('should display tier badge', () => {
    render(<AchievementCard achievement={mockUnlockedAchievement} />);
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
  });

  it('should show progress bar for in-progress achievements', () => {
    render(<AchievementCard achievement={mockInProgressAchievement} />);
    expect(screen.getByTestId('achievement-progress-bar')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    render(<AchievementCard achievement={mockInProgressAchievement} />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('should show unlocked date for unlocked achievements', () => {
    render(<AchievementCard achievement={mockUnlockedAchievement} />);
    expect(screen.getByText(/Unlocked/)).toBeInTheDocument();
  });

  it('should hide progress bar for fully locked achievements', () => {
    render(<AchievementCard achievement={mockLockedAchievement} />);
    expect(screen.queryByTestId('achievement-progress-bar')).not.toBeInTheDocument();
  });

  it('should apply locked styling for locked achievements', () => {
    render(<AchievementCard achievement={mockLockedAchievement} />);
    const card = screen.getByTestId('achievement-card');
    expect(card).toHaveAttribute('data-locked', 'true');
  });

  it('should show category label', () => {
    render(<AchievementCard achievement={mockUnlockedAchievement} />);
    expect(screen.getByText('Consistency')).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementGrid Tests
// =============================================================================

describe('AchievementGrid', () => {
  it('should render all achievements', () => {
    render(<AchievementGrid achievements={mockAchievements} />);
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Century Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Elite Forecaster')).toBeInTheDocument();
  });

  it('should display achievement count', () => {
    render(<AchievementGrid achievements={mockAchievements} />);
    // 1 unlocked out of 3
    expect(screen.getByText(/1.*of.*3/)).toBeInTheDocument();
  });

  it('should filter by category when filter prop is provided', () => {
    render(<AchievementGrid achievements={mockAchievements} filterCategory="STREAK" />);
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.queryByText('Century Forecaster')).not.toBeInTheDocument();
  });

  it('should show only unlocked when showUnlockedOnly is true', () => {
    render(<AchievementGrid achievements={mockAchievements} showUnlockedOnly />);
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.queryByText('Century Forecaster')).not.toBeInTheDocument();
  });

  it('should render empty state when no achievements', () => {
    render(<AchievementGrid achievements={[]} />);
    expect(screen.getByText(/No achievements/i)).toBeInTheDocument();
  });

  it('should show loading skeleton when isLoading is true', () => {
    render(<AchievementGrid achievements={[]} isLoading />);
    expect(screen.getByTestId('achievement-grid-skeleton')).toBeInTheDocument();
  });

  it('should respect columns prop', () => {
    render(<AchievementGrid achievements={mockAchievements} columns={2} />);
    const grid = screen.getByTestId('achievement-grid');
    expect(grid).toHaveClass('grid-cols-2');
  });
});

// =============================================================================
// AchievementProgress Tests
// =============================================================================

describe('AchievementProgress', () => {
  it('should display current progress', () => {
    render(<AchievementProgress progress={45} maxProgress={100} />);
    expect(screen.getByText('45 / 100')).toBeInTheDocument();
  });

  it('should show progress bar at correct width', () => {
    render(<AchievementProgress progress={45} maxProgress={100} />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  it('should show 100% when complete', () => {
    render(<AchievementProgress progress={100} maxProgress={100} />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  it('should handle percentage display mode', () => {
    render(<AchievementProgress progress={45} maxProgress={100} displayMode="percentage" />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('should apply completed styling when progress equals maxProgress', () => {
    render(<AchievementProgress progress={7} maxProgress={7} />);
    const container = screen.getByTestId('achievement-progress');
    expect(container).toHaveAttribute('data-complete', 'true');
  });

  it('should show tier color when tier prop is provided', () => {
    render(<AchievementProgress progress={45} maxProgress={100} tier="GOLD" />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveAttribute('data-tier', 'GOLD');
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Achievement Components Integration', () => {
  it('should render AchievementCard with AchievementProgress', () => {
    render(<AchievementCard achievement={mockInProgressAchievement} />);
    expect(screen.getByTestId('achievement-card')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-progress')).toBeInTheDocument();
  });

  it('should render AchievementGrid with AchievementCards', () => {
    render(<AchievementGrid achievements={mockAchievements} />);
    const cards = screen.getAllByTestId('achievement-card');
    expect(cards).toHaveLength(3);
  });
});
