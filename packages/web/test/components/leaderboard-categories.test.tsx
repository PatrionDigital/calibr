/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  LeaderboardCategory,
  PlatformLeaderboard,
} from '../../src/components/leaderboard-categories';
import {
  CategorySelector,
  CategoryLeaderboardCard,
  PlatformLeaderboardCard,
  CategoryStatsBar,
  LeaderboardCategoriesPage,
  useCategoryLeaderboard,
} from '../../src/components/leaderboard-categories';

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: LeaderboardCategory[] = [
  {
    id: 'overall',
    name: 'Overall',
    description: 'Combined ranking across all categories',
    icon: '🏆',
    entryCount: 1234,
  },
  {
    id: 'politics',
    name: 'Politics',
    description: 'Political event forecasting',
    icon: '🏛️',
    entryCount: 456,
  },
  {
    id: 'crypto',
    name: 'Crypto',
    description: 'Cryptocurrency and blockchain predictions',
    icon: '₿',
    entryCount: 789,
  },
  {
    id: 'sports',
    name: 'Sports',
    description: 'Sports event predictions',
    icon: '⚽',
    entryCount: 321,
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Scientific and tech predictions',
    icon: '🔬',
    entryCount: 198,
  },
];

const mockPlatforms: PlatformLeaderboard[] = [
  {
    id: 'polymarket',
    name: 'Polymarket',
    icon: '📊',
    topForecasters: [
      { address: '0x1111', ensName: 'alice.eth', score: 950, rank: 1 },
      { address: '0x2222', ensName: 'bob.eth', score: 920, rank: 2 },
      { address: '0x3333', ensName: null, score: 890, rank: 3 },
    ],
    totalParticipants: 500,
  },
  {
    id: 'limitless',
    name: 'Limitless',
    icon: '♾️',
    topForecasters: [
      { address: '0x4444', ensName: 'charlie.eth', score: 940, rank: 1 },
      { address: '0x5555', ensName: 'dave.eth', score: 910, rank: 2 },
    ],
    totalParticipants: 300,
  },
];

const mockCategoryEntries = [
  {
    address: '0x1111',
    ensName: 'alice.eth',
    score: 950,
    rank: 1,
    brierScore: 0.12,
    forecasts: 234,
    tier: 'GRANDMASTER' as const,
  },
  {
    address: '0x2222',
    ensName: 'bob.eth',
    score: 920,
    rank: 2,
    brierScore: 0.15,
    forecasts: 198,
    tier: 'MASTER' as const,
  },
  {
    address: '0x3333',
    ensName: null,
    score: 890,
    rank: 3,
    brierScore: 0.18,
    forecasts: 167,
    tier: 'MASTER' as const,
  },
];

// =============================================================================
// CategorySelector Tests
// =============================================================================

describe('CategorySelector', () => {
  it('renders selector', () => {
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={() => {}} />);
    expect(screen.getByTestId('category-selector')).toBeInTheDocument();
  });

  it('shows all categories', () => {
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={() => {}} />);
    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('Politics')).toBeInTheDocument();
    expect(screen.getByText('Crypto')).toBeInTheDocument();
    expect(screen.getByText('Sports')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
  });

  it('highlights selected category', () => {
    render(<CategorySelector categories={mockCategories} selectedId="politics" onSelect={() => {}} />);
    const selected = screen.getByTestId('category-option-politics');
    expect(selected).toHaveClass('selected');
  });

  it('calls onSelect when clicking category', () => {
    const onSelect = vi.fn();
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Crypto'));
    expect(onSelect).toHaveBeenCalledWith('crypto');
  });

  it('shows category icons', () => {
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={() => {}} />);
    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('🏛️')).toBeInTheDocument();
  });

  it('shows entry counts', () => {
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={() => {}} />);
    expect(screen.getByText(/1,234/)).toBeInTheDocument();
    expect(screen.getByText(/456/)).toBeInTheDocument();
  });

  it('supports compact mode', () => {
    render(<CategorySelector categories={mockCategories} selectedId="overall" onSelect={() => {}} compact />);
    expect(screen.getByTestId('category-selector')).toHaveClass('compact');
  });
});

// =============================================================================
// CategoryLeaderboardCard Tests
// =============================================================================

describe('CategoryLeaderboardCard', () => {
  const category = mockCategories[1]!;

  it('renders card', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByTestId('category-leaderboard-card')).toBeInTheDocument();
  });

  it('shows category name', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByText('Politics')).toBeInTheDocument();
  });

  it('shows category description', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByText('Political event forecasting')).toBeInTheDocument();
  });

  it('shows top entries', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
  });

  it('shows entry ranks', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('shows entry scores', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} />);
    expect(screen.getByText('950')).toBeInTheDocument();
    expect(screen.getByText('920')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<CategoryLeaderboardCard category={category} entries={[]} />);
    expect(screen.getByText(/no forecasters/i)).toBeInTheDocument();
  });

  it('limits displayed entries', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} maxEntries={2} />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
    expect(screen.queryByText('0x3333')).not.toBeInTheDocument();
  });

  it('shows view all link', () => {
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} onViewAll={() => {}} />);
    expect(screen.getByText(/view all/i)).toBeInTheDocument();
  });

  it('calls onViewAll when clicked', () => {
    const onViewAll = vi.fn();
    render(<CategoryLeaderboardCard category={category} entries={mockCategoryEntries} onViewAll={onViewAll} />);
    fireEvent.click(screen.getByText(/view all/i));
    expect(onViewAll).toHaveBeenCalledWith('politics');
  });
});

// =============================================================================
// PlatformLeaderboardCard Tests
// =============================================================================

describe('PlatformLeaderboardCard', () => {
  const platform = mockPlatforms[0]!;

  it('renders card', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByTestId('platform-leaderboard-card')).toBeInTheDocument();
  });

  it('shows platform name', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText('Polymarket')).toBeInTheDocument();
  });

  it('shows platform icon', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('shows top forecasters', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
  });

  it('shows participant count', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it('shows address when no ENS', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText('0x3333')).toBeInTheDocument();
  });

  it('shows ranks', () => {
    render(<PlatformLeaderboardCard platform={platform} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });
});

// =============================================================================
// CategoryStatsBar Tests
// =============================================================================

describe('CategoryStatsBar', () => {
  it('renders stats bar', () => {
    render(<CategoryStatsBar categories={mockCategories} />);
    expect(screen.getByTestId('category-stats-bar')).toBeInTheDocument();
  });

  it('shows total forecasters', () => {
    render(<CategoryStatsBar categories={mockCategories} />);
    // Sum: 1234 + 456 + 789 + 321 + 198 = 2998
    expect(screen.getByText(/2,998/)).toBeInTheDocument();
  });

  it('shows category count', () => {
    render(<CategoryStatsBar categories={mockCategories} />);
    expect(screen.getByText(/5 categories/i)).toBeInTheDocument();
  });

  it('shows largest category', () => {
    render(<CategoryStatsBar categories={mockCategories} />);
    expect(screen.getByText(/overall/i)).toBeInTheDocument();
  });

  it('handles empty categories', () => {
    render(<CategoryStatsBar categories={[]} />);
    expect(screen.getByTestId('category-stats-bar')).toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardCategoriesPage Tests
// =============================================================================

describe('LeaderboardCategoriesPage', () => {
  it('renders page', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getByTestId('leaderboard-categories-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getAllByText(/leaderboard/i).length).toBeGreaterThan(0);
  });

  it('shows category selector', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getByTestId('category-selector')).toBeInTheDocument();
  });

  it('shows platform cards', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getByText('Polymarket')).toBeInTheDocument();
    expect(screen.getByText('Limitless')).toBeInTheDocument();
  });

  it('shows stats bar', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getByTestId('category-stats-bar')).toBeInTheDocument();
  });

  it('shows entries for selected category', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={mockCategoryEntries}
      />
    );
    expect(screen.getAllByText('alice.eth').length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    render(
      <LeaderboardCategoriesPage
        categories={mockCategories}
        platforms={mockPlatforms}
        entries={[]}
        loading={true}
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// useCategoryLeaderboard Hook Tests
// =============================================================================

describe('useCategoryLeaderboard', () => {
  function TestComponent({
    categories,
    entries,
  }: {
    categories: LeaderboardCategory[];
    entries: typeof mockCategoryEntries;
  }) {
    const {
      selectedCategory,
      setSelectedCategory,
      filteredEntries,
      categoryStats,
    } = useCategoryLeaderboard(categories, entries);

    return (
      <div>
        <span data-testid="selected-category">{selectedCategory}</span>
        <span data-testid="filtered-count">{filteredEntries.length}</span>
        <span data-testid="total-entries">{categoryStats.totalEntries}</span>
        <span data-testid="category-count">{categoryStats.categoryCount}</span>
        <button onClick={() => setSelectedCategory('politics')}>Select Politics</button>
        <button onClick={() => setSelectedCategory('overall')}>Select Overall</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to overall category', () => {
    render(<TestComponent categories={mockCategories} entries={mockCategoryEntries} />);
    expect(screen.getByTestId('selected-category')).toHaveTextContent('overall');
  });

  it('returns all entries for overall', () => {
    render(<TestComponent categories={mockCategories} entries={mockCategoryEntries} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('3');
  });

  it('changes selected category', () => {
    render(<TestComponent categories={mockCategories} entries={mockCategoryEntries} />);
    fireEvent.click(screen.getByText('Select Politics'));
    expect(screen.getByTestId('selected-category')).toHaveTextContent('politics');
  });

  it('provides category stats', () => {
    render(<TestComponent categories={mockCategories} entries={mockCategoryEntries} />);
    expect(screen.getByTestId('category-count')).toHaveTextContent('5');
  });

  it('calculates total entries', () => {
    render(<TestComponent categories={mockCategories} entries={mockCategoryEntries} />);
    expect(screen.getByTestId('total-entries')).toHaveTextContent('3');
  });
});
