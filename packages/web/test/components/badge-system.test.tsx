/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  BadgeDefinition,
  BadgeCollection,
} from '../../src/components/badge-system';
import {
  TierBadgeSvg,
  AchievementBadgeSvg,
  BadgeCard,
  BadgeGrid,
  BadgeShowcase,
  BadgeProgress,
  BadgeSystemPage,
  useBadgeSystem,
} from '../../src/components/badge-system';

// =============================================================================
// Test Data
// =============================================================================

const mockBadges: BadgeDefinition[] = [
  {
    id: 'badge-novice',
    name: 'Novice Forecaster',
    description: 'Made your first forecast',
    tier: 'NOVICE',
    icon: '🌱',
    category: 'tier',
    requirement: 'Complete 1 forecast',
    earned: true,
    earnedAt: '2025-01-01',
  },
  {
    id: 'badge-expert',
    name: 'Expert Forecaster',
    description: 'Reached Expert tier',
    tier: 'EXPERT',
    icon: '⭐',
    category: 'tier',
    requirement: 'Reach Expert tier',
    earned: true,
    earnedAt: '2025-01-15',
  },
  {
    id: 'badge-master',
    name: 'Master Forecaster',
    description: 'Reached Master tier',
    tier: 'MASTER',
    icon: '💎',
    category: 'tier',
    requirement: 'Reach Master tier',
    earned: false,
    earnedAt: null,
  },
  {
    id: 'badge-streak-7',
    name: '7 Day Streak',
    description: 'Forecasted for 7 consecutive days',
    tier: 'EXPERT',
    icon: '🔥',
    category: 'streak',
    requirement: 'Forecast 7 days in a row',
    earned: true,
    earnedAt: '2025-01-10',
  },
  {
    id: 'badge-accuracy-80',
    name: 'Sharp Shooter',
    description: 'Achieved 80% accuracy',
    tier: 'MASTER',
    icon: '🎯',
    category: 'accuracy',
    requirement: 'Maintain 80% accuracy over 50 forecasts',
    earned: false,
    earnedAt: null,
  },
];

const mockCollection: BadgeCollection = {
  earned: mockBadges.filter((b) => b.earned),
  available: mockBadges.filter((b) => !b.earned),
  totalCount: mockBadges.length,
  earnedCount: mockBadges.filter((b) => b.earned).length,
};

// =============================================================================
// TierBadgeSvg Tests
// =============================================================================

describe('TierBadgeSvg', () => {
  it('renders SVG badge', () => {
    render(<TierBadgeSvg tier="NOVICE" />);
    expect(screen.getByTestId('tier-badge-svg')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    const { container } = render(<TierBadgeSvg tier="NOVICE" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows tier label', () => {
    render(<TierBadgeSvg tier="EXPERT" />);
    expect(screen.getByText('EXPERT')).toBeInTheDocument();
  });

  it('supports different tiers', () => {
    const { rerender } = render(<TierBadgeSvg tier="NOVICE" />);
    expect(screen.getByText('NOVICE')).toBeInTheDocument();

    rerender(<TierBadgeSvg tier="MASTER" />);
    expect(screen.getByText('MASTER')).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    render(<TierBadgeSvg tier="EXPERT" size={64} />);
    const svg = screen.getByTestId('tier-badge-svg').querySelector('svg');
    expect(svg).toHaveAttribute('width', '64');
  });

  it('renders grandmaster tier', () => {
    render(<TierBadgeSvg tier="GRANDMASTER" />);
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementBadgeSvg Tests
// =============================================================================

describe('AchievementBadgeSvg', () => {
  it('renders SVG badge', () => {
    render(<AchievementBadgeSvg badge={mockBadges[3]!} />);
    expect(screen.getByTestId('achievement-badge-svg')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    const { container } = render(<AchievementBadgeSvg badge={mockBadges[3]!} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows badge icon', () => {
    render(<AchievementBadgeSvg badge={mockBadges[3]!} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows locked state for unearned badges', () => {
    render(<AchievementBadgeSvg badge={mockBadges[2]!} />);
    expect(screen.getByTestId('achievement-badge-svg')).toHaveClass('locked');
  });

  it('supports different sizes', () => {
    render(<AchievementBadgeSvg badge={mockBadges[3]!} size={80} />);
    const svg = screen.getByTestId('achievement-badge-svg').querySelector('svg');
    expect(svg).toHaveAttribute('width', '80');
  });
});

// =============================================================================
// BadgeCard Tests
// =============================================================================

describe('BadgeCard', () => {
  it('renders badge card', () => {
    render(<BadgeCard badge={mockBadges[0]!} />);
    expect(screen.getByTestId('badge-card')).toBeInTheDocument();
  });

  it('shows badge name', () => {
    render(<BadgeCard badge={mockBadges[0]!} />);
    expect(screen.getByText('Novice Forecaster')).toBeInTheDocument();
  });

  it('shows badge description', () => {
    render(<BadgeCard badge={mockBadges[0]!} />);
    expect(screen.getByText(/first forecast/i)).toBeInTheDocument();
  });

  it('shows earned date for earned badges', () => {
    render(<BadgeCard badge={mockBadges[0]!} />);
    expect(screen.getByText(/jan/i)).toBeInTheDocument();
  });

  it('shows requirement for unearned badges', () => {
    render(<BadgeCard badge={mockBadges[2]!} />);
    expect(screen.getByText(/reach master tier/i)).toBeInTheDocument();
  });

  it('shows locked indicator for unearned badges', () => {
    render(<BadgeCard badge={mockBadges[2]!} />);
    expect(screen.getByText(/locked/i)).toBeInTheDocument();
  });

  it('shows earned indicator for earned badges', () => {
    render(<BadgeCard badge={mockBadges[0]!} />);
    expect(screen.getByText(/earned/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<BadgeCard badge={mockBadges[0]!} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('badge-card'));
    expect(onClick).toHaveBeenCalledWith('badge-novice');
  });
});

// =============================================================================
// BadgeGrid Tests
// =============================================================================

describe('BadgeGrid', () => {
  it('renders badge grid', () => {
    render(<BadgeGrid badges={mockBadges} />);
    expect(screen.getByTestId('badge-grid')).toBeInTheDocument();
  });

  it('shows all badges', () => {
    render(<BadgeGrid badges={mockBadges} />);
    expect(screen.getByText('Novice Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Expert Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Master Forecaster')).toBeInTheDocument();
  });

  it('shows empty state when no badges', () => {
    render(<BadgeGrid badges={[]} />);
    expect(screen.getByText(/no badges/i)).toBeInTheDocument();
  });

  it('filters by category', () => {
    render(<BadgeGrid badges={mockBadges} category="streak" />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
    expect(screen.queryByText('Novice Forecaster')).not.toBeInTheDocument();
  });

  it('calls onBadgeClick when badge clicked', () => {
    const onBadgeClick = vi.fn();
    render(<BadgeGrid badges={mockBadges} onBadgeClick={onBadgeClick} />);
    fireEvent.click(screen.getByText('Novice Forecaster'));
    expect(onBadgeClick).toHaveBeenCalledWith('badge-novice');
  });
});

// =============================================================================
// BadgeShowcase Tests
// =============================================================================

describe('BadgeShowcase', () => {
  it('renders showcase', () => {
    render(<BadgeShowcase badges={mockCollection.earned} />);
    expect(screen.getByTestId('badge-showcase')).toBeInTheDocument();
  });

  it('shows showcase title', () => {
    render(<BadgeShowcase badges={mockCollection.earned} />);
    expect(screen.getByText(/showcase/i)).toBeInTheDocument();
  });

  it('shows earned badges', () => {
    render(<BadgeShowcase badges={mockCollection.earned} />);
    expect(screen.getByText('Novice Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Expert Forecaster')).toBeInTheDocument();
  });

  it('limits displayed badges', () => {
    render(<BadgeShowcase badges={mockCollection.earned} maxDisplay={2} />);
    const cards = screen.getAllByTestId('badge-card');
    expect(cards.length).toBe(2);
  });

  it('shows empty state', () => {
    render(<BadgeShowcase badges={[]} />);
    expect(screen.getByText(/no badges earned/i)).toBeInTheDocument();
  });
});

// =============================================================================
// BadgeProgress Tests
// =============================================================================

describe('BadgeProgress', () => {
  it('renders progress bar', () => {
    render(<BadgeProgress earned={3} total={5} />);
    expect(screen.getByTestId('badge-progress')).toBeInTheDocument();
  });

  it('shows earned count', () => {
    render(<BadgeProgress earned={3} total={5} />);
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });

  it('shows total count', () => {
    render(<BadgeProgress earned={3} total={5} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('shows percentage', () => {
    render(<BadgeProgress earned={3} total={5} />);
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });

  it('handles zero total', () => {
    render(<BadgeProgress earned={0} total={0} />);
    expect(screen.getByTestId('badge-progress')).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<BadgeProgress earned={3} total={5} label="Badges Collected" />);
    expect(screen.getByText('Badges Collected')).toBeInTheDocument();
  });
});

// =============================================================================
// BadgeSystemPage Tests
// =============================================================================

describe('BadgeSystemPage', () => {
  it('renders page', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getByTestId('badge-system-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getAllByText(/badges/i).length).toBeGreaterThan(0);
  });

  it('shows badge progress', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getByTestId('badge-progress')).toBeInTheDocument();
  });

  it('shows badge grid', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getByTestId('badge-grid')).toBeInTheDocument();
  });

  it('shows showcase', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getByTestId('badge-showcase')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <BadgeSystemPage
        collection={{ earned: [], available: [], totalCount: 0, earnedCount: 0 }}
        loading={true}
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows category filter', () => {
    render(<BadgeSystemPage collection={mockCollection} />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useBadgeSystem Hook Tests
// =============================================================================

describe('useBadgeSystem', () => {
  function TestComponent({ badges }: { badges: BadgeDefinition[] }) {
    const {
      collection,
      selectedCategory,
      setSelectedCategory,
      filteredBadges,
      progressPercentage,
    } = useBadgeSystem(badges);

    return (
      <div>
        <span data-testid="earned-count">{collection.earnedCount}</span>
        <span data-testid="total-count">{collection.totalCount}</span>
        <span data-testid="selected-category">{selectedCategory}</span>
        <span data-testid="filtered-count">{filteredBadges.length}</span>
        <span data-testid="progress">{progressPercentage}</span>
        <button onClick={() => setSelectedCategory('streak')}>Filter Streak</button>
        <button onClick={() => setSelectedCategory('all')}>Show All</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates earned count', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('earned-count')).toHaveTextContent('3');
  });

  it('calculates total count', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('total-count')).toHaveTextContent('5');
  });

  it('defaults to all category', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('selected-category')).toHaveTextContent('all');
  });

  it('shows all badges initially', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('5');
  });

  it('filters by category', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Filter Streak'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('1');
  });

  it('resets filter to all', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Filter Streak'));
    fireEvent.click(screen.getByText('Show All'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('5');
  });

  it('calculates progress percentage', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('progress')).toHaveTextContent('60');
  });
});
