/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  LeaderboardEntry as LeaderboardEntryType,
  LeaderboardTier,
  LeaderboardFilter,
} from '../../src/components/leaderboard';
import {
  LeaderboardEntry,
  LeaderboardTable,
  LeaderboardFilters,
  LeaderboardPodium,
  LeaderboardStats,
  LeaderboardPage,
  TierBadge,
  useLeaderboard,
} from '../../src/components/leaderboard';

// =============================================================================
// Test Data
// =============================================================================

const mockEntries: LeaderboardEntryType[] = [
  {
    rank: 1,
    address: '0x1234...5678',
    ensName: 'alice.eth',
    tier: 'GRANDMASTER',
    score: 985,
    brierScore: 0.12,
    forecasts: 523,
    accuracy: 0.89,
    streak: 45,
    change: 0,
  },
  {
    rank: 2,
    address: '0x2345...6789',
    ensName: 'bob.eth',
    tier: 'MASTER',
    score: 920,
    brierScore: 0.15,
    forecasts: 412,
    accuracy: 0.85,
    streak: 32,
    change: 1,
  },
  {
    rank: 3,
    address: '0x3456...7890',
    ensName: null,
    tier: 'MASTER',
    score: 890,
    brierScore: 0.18,
    forecasts: 389,
    accuracy: 0.82,
    streak: 28,
    change: -1,
  },
  {
    rank: 4,
    address: '0x4567...8901',
    ensName: 'charlie.eth',
    tier: 'EXPERT',
    score: 780,
    brierScore: 0.22,
    forecasts: 256,
    accuracy: 0.78,
    streak: 15,
    change: 2,
  },
  {
    rank: 5,
    address: '0x5678...9012',
    ensName: null,
    tier: 'JOURNEYMAN',
    score: 650,
    brierScore: 0.28,
    forecasts: 142,
    accuracy: 0.72,
    streak: 8,
    change: 0,
  },
];

const tiers: LeaderboardTier[] = [
  'GRANDMASTER',
  'MASTER',
  'EXPERT',
  'JOURNEYMAN',
  'APPRENTICE',
];

// =============================================================================
// TierBadge Tests
// =============================================================================

describe('TierBadge', () => {
  it('renders tier name', () => {
    render(<TierBadge tier="GRANDMASTER" />);
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });

  it('has tier-specific styling', () => {
    render(<TierBadge tier="GRANDMASTER" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveClass('grandmaster');
  });

  it('renders all tier levels correctly', () => {
    const { rerender } = render(<TierBadge tier="MASTER" />);
    expect(screen.getByText('MASTER')).toBeInTheDocument();

    rerender(<TierBadge tier="EXPERT" />);
    expect(screen.getByText('EXPERT')).toBeInTheDocument();

    rerender(<TierBadge tier="JOURNEYMAN" />);
    expect(screen.getByText('JOURNEYMAN')).toBeInTheDocument();

    rerender(<TierBadge tier="APPRENTICE" />);
    expect(screen.getByText('APPRENTICE')).toBeInTheDocument();
  });

  it('supports compact mode', () => {
    render(<TierBadge tier="GRANDMASTER" compact={true} />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveClass('compact');
  });
});

// =============================================================================
// LeaderboardEntry Tests
// =============================================================================

describe('LeaderboardEntry', () => {
  const entry = mockEntries[0]!;

  it('renders rank', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('displays ENS name when available', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
  });

  it('displays address when no ENS', () => {
    render(<LeaderboardEntry entry={mockEntries[2]!} />);
    expect(screen.getByText('0x3456...7890')).toBeInTheDocument();
  });

  it('shows tier badge', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('GRANDMASTER')).toBeInTheDocument();
  });

  it('displays score', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('985')).toBeInTheDocument();
  });

  it('shows Brier score', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('0.12')).toBeInTheDocument();
  });

  it('shows forecast count', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByText('523')).toBeInTheDocument();
  });

  it('shows rank change indicator - up', () => {
    render(<LeaderboardEntry entry={mockEntries[1]!} />);
    expect(screen.getByTestId('rank-change')).toHaveClass('up');
  });

  it('shows rank change indicator - down', () => {
    render(<LeaderboardEntry entry={mockEntries[2]!} />);
    expect(screen.getByTestId('rank-change')).toHaveClass('down');
  });

  it('shows no change indicator when unchanged', () => {
    render(<LeaderboardEntry entry={entry} />);
    expect(screen.getByTestId('rank-change')).toHaveClass('unchanged');
  });

  it('is clickable', () => {
    const onClick = vi.fn();
    render(<LeaderboardEntry entry={entry} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('leaderboard-entry'));
    expect(onClick).toHaveBeenCalledWith(entry.address);
  });
});

// =============================================================================
// LeaderboardTable Tests
// =============================================================================

describe('LeaderboardTable', () => {
  it('renders all entries', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
    expect(screen.getByText('charlie.eth')).toBeInTheDocument();
  });

  it('shows table headers', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByText(/no forecasters/i)).toBeInTheDocument();
  });

  it('supports sorting by column', () => {
    const onSort = vi.fn();
    render(<LeaderboardTable entries={mockEntries} onSort={onSort} />);
    fireEvent.click(screen.getByText('Score'));
    expect(onSort).toHaveBeenCalledWith('score');
  });

  it('highlights current user entry', () => {
    render(<LeaderboardTable entries={mockEntries} currentUserAddress="0x2345...6789" />);
    const userEntry = screen.getByText('bob.eth').closest('[data-testid="leaderboard-entry"]');
    expect(userEntry).toHaveClass('current-user');
  });

  it('shows loading state', () => {
    render(<LeaderboardTable entries={[]} loading={true} />);
    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
  });

  it('has data-testid', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardFilters Tests
// =============================================================================

describe('LeaderboardFilters', () => {
  it('renders filter controls', () => {
    render(<LeaderboardFilters onFilterChange={() => {}} />);
    expect(screen.getByTestId('leaderboard-filters')).toBeInTheDocument();
  });

  it('shows tier filter', () => {
    render(<LeaderboardFilters onFilterChange={() => {}} />);
    expect(screen.getByLabelText(/tier/i)).toBeInTheDocument();
  });

  it('shows time period filter', () => {
    render(<LeaderboardFilters onFilterChange={() => {}} />);
    expect(screen.getByLabelText(/period/i)).toBeInTheDocument();
  });

  it('shows category filter', () => {
    render(<LeaderboardFilters onFilterChange={() => {}} />);
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('calls onFilterChange when tier changes', () => {
    const onFilterChange = vi.fn();
    render(<LeaderboardFilters onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByLabelText(/tier/i), { target: { value: 'MASTER' } });
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('calls onFilterChange when period changes', () => {
    const onFilterChange = vi.fn();
    render(<LeaderboardFilters onFilterChange={onFilterChange} />);
    fireEvent.change(screen.getByLabelText(/period/i), { target: { value: 'month' } });
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('shows search input', () => {
    render(<LeaderboardFilters onFilterChange={() => {}} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardPodium Tests
// =============================================================================

describe('LeaderboardPodium', () => {
  const topThree = mockEntries.slice(0, 3);

  it('renders podium display', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getByTestId('leaderboard-podium')).toBeInTheDocument();
  });

  it('shows first place', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getByTestId('podium-1st')).toBeInTheDocument();
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
  });

  it('shows second place', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getByTestId('podium-2nd')).toBeInTheDocument();
    expect(screen.getByText('bob.eth')).toBeInTheDocument();
  });

  it('shows third place', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getByTestId('podium-3rd')).toBeInTheDocument();
  });

  it('displays scores for each place', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getByText('985')).toBeInTheDocument();
    expect(screen.getByText('920')).toBeInTheDocument();
    expect(screen.getByText('890')).toBeInTheDocument();
  });

  it('shows trophy icons', () => {
    render(<LeaderboardPodium entries={topThree} />);
    expect(screen.getAllByTestId('trophy-icon').length).toBe(3);
  });

  it('handles less than 3 entries', () => {
    render(<LeaderboardPodium entries={[mockEntries[0]!]} />);
    expect(screen.getByTestId('podium-1st')).toBeInTheDocument();
    expect(screen.queryByTestId('podium-2nd')).not.toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardStats Tests
// =============================================================================

describe('LeaderboardStats', () => {
  it('renders stats panel', () => {
    render(<LeaderboardStats entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-stats')).toBeInTheDocument();
  });

  it('shows total forecasters', () => {
    render(<LeaderboardStats entries={mockEntries} totalForecasters={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('shows total forecasts', () => {
    render(<LeaderboardStats entries={mockEntries} totalForecasts={45678} />);
    expect(screen.getByText('45,678')).toBeInTheDocument();
  });

  it('shows average Brier score', () => {
    render(<LeaderboardStats entries={mockEntries} />);
    expect(screen.getByText(/average.*brier/i)).toBeInTheDocument();
  });

  it('shows tier distribution', () => {
    render(<LeaderboardStats entries={mockEntries} />);
    expect(screen.getByTestId('tier-distribution')).toBeInTheDocument();
  });
});

// =============================================================================
// LeaderboardPage Tests
// =============================================================================

describe('LeaderboardPage', () => {
  it('renders leaderboard page', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getAllByText(/leaderboard/i).length).toBeGreaterThan(0);
  });

  it('shows podium', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-podium')).toBeInTheDocument();
  });

  it('shows filters', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-filters')).toBeInTheDocument();
  });

  it('shows table', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-table')).toBeInTheDocument();
  });

  it('filters entries when filter changes', async () => {
    render(<LeaderboardPage entries={mockEntries} />);
    fireEvent.change(screen.getByLabelText(/tier/i), { target: { value: 'MASTER' } });
    await waitFor(() => {
      // After filtering to MASTER tier, only bob.eth and 0x3456...7890 should show in table
      const table = screen.getByTestId('leaderboard-table');
      expect(table).not.toHaveTextContent('alice.eth');
      expect(screen.getAllByText('bob.eth').length).toBeGreaterThan(0);
    });
  });

  it('shows user rank when logged in', () => {
    render(<LeaderboardPage entries={mockEntries} currentUserAddress="0x2345...6789" />);
    expect(screen.getByTestId('user-rank-card')).toBeInTheDocument();
  });

  it('shows stats panel', () => {
    render(<LeaderboardPage entries={mockEntries} />);
    expect(screen.getByTestId('leaderboard-stats')).toBeInTheDocument();
  });
});

// =============================================================================
// useLeaderboard Hook Tests
// =============================================================================

describe('useLeaderboard', () => {
  function TestComponent({ entries }: { entries: LeaderboardEntryType[] }) {
    const {
      filteredEntries,
      filters,
      setFilters,
      sortBy,
      setSortBy,
      sortDirection,
      toggleSortDirection,
      topThree,
    } = useLeaderboard(entries);

    return (
      <div>
        <span data-testid="filtered-count">{filteredEntries.length}</span>
        <span data-testid="sort-by">{sortBy}</span>
        <span data-testid="sort-direction">{sortDirection}</span>
        <span data-testid="top-three-count">{topThree.length}</span>
        <span data-testid="tier-filter">{filters.tier || 'all'}</span>
        <button onClick={() => setFilters({ tier: 'MASTER' })}>Filter Master</button>
        <button onClick={() => setSortBy('brierScore')}>Sort by Brier</button>
        <button onClick={toggleSortDirection}>Toggle Direction</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all entries initially', () => {
    render(<TestComponent entries={mockEntries} />);
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('5');
  });

  it('defaults to score sorting', () => {
    render(<TestComponent entries={mockEntries} />);
    expect(screen.getByTestId('sort-by')).toHaveTextContent('score');
  });

  it('defaults to descending sort', () => {
    render(<TestComponent entries={mockEntries} />);
    expect(screen.getByTestId('sort-direction')).toHaveTextContent('desc');
  });

  it('extracts top three entries', () => {
    render(<TestComponent entries={mockEntries} />);
    expect(screen.getByTestId('top-three-count')).toHaveTextContent('3');
  });

  it('filters by tier', () => {
    render(<TestComponent entries={mockEntries} />);
    fireEvent.click(screen.getByText('Filter Master'));
    expect(screen.getByTestId('filtered-count')).toHaveTextContent('2');
  });

  it('changes sort field', () => {
    render(<TestComponent entries={mockEntries} />);
    fireEvent.click(screen.getByText('Sort by Brier'));
    expect(screen.getByTestId('sort-by')).toHaveTextContent('brierScore');
  });

  it('toggles sort direction', () => {
    render(<TestComponent entries={mockEntries} />);
    fireEvent.click(screen.getByText('Toggle Direction'));
    expect(screen.getByTestId('sort-direction')).toHaveTextContent('asc');
  });
});
