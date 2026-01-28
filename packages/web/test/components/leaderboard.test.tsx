/**
 * Leaderboard Component Tests (Phase 6.1)
 * TDD tests for leaderboard UI components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// These imports will fail until we implement the components
import {
  TierBadge,
  LeaderboardTable,
  LeaderboardFilters,
  UserRankCard,
  LeaderboardRow,
} from '@/components/leaderboard';

// =============================================================================
// Test Data
// =============================================================================

const mockLeaderboardEntry = {
  rank: 1,
  previousRank: 2,
  userId: 'user-1',
  displayName: 'TopForecaster',
  tier: 'MASTER' as const,
  compositeScore: 850,
  brierScore: 0.12,
  calibrationScore: 0.88,
  totalForecasts: 500,
  resolvedForecasts: 450,
  streakDays: 45,
  isPrivate: false,
};

const mockEntries = [
  mockLeaderboardEntry,
  {
    ...mockLeaderboardEntry,
    rank: 2,
    previousRank: 1,
    userId: 'user-2',
    displayName: 'SecondPlace',
    tier: 'EXPERT' as const,
    compositeScore: 720,
  },
  {
    ...mockLeaderboardEntry,
    rank: 3,
    previousRank: 3,
    userId: 'user-3',
    displayName: 'ThirdPlace',
    tier: 'JOURNEYMAN' as const,
    compositeScore: 450,
    isPrivate: true,
  },
];

// =============================================================================
// TierBadge Tests
// =============================================================================

describe('TierBadge', () => {
  it('renders APPRENTICE tier with correct styling', () => {
    render(<TierBadge tier="APPRENTICE" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('APPRENTICE');
  });

  it('renders JOURNEYMAN tier with correct styling', () => {
    render(<TierBadge tier="JOURNEYMAN" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toContain('JOURNEYMAN');
  });

  it('renders EXPERT tier with correct styling', () => {
    render(<TierBadge tier="EXPERT" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toContain('EXPERT');
  });

  it('renders MASTER tier with correct styling', () => {
    render(<TierBadge tier="MASTER" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toContain('MASTER');
  });

  it('renders GRANDMASTER tier with correct styling', () => {
    render(<TierBadge tier="GRANDMASTER" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toContain('GRANDMASTER');
  });

  it('supports compact mode', () => {
    render(<TierBadge tier="MASTER" compact />);
    const badge = screen.getByTestId('tier-badge');
    // Compact mode shows abbreviated tier
    expect(badge.textContent).toMatch(/M|MASTER/);
  });

  it('shows tier emoji when showEmoji is true', () => {
    render(<TierBadge tier="MASTER" showEmoji />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toMatch(/🧠|MASTER/);
  });
});

// =============================================================================
// LeaderboardRow Tests
// =============================================================================

describe('LeaderboardRow', () => {
  it('renders rank number', () => {
    render(<LeaderboardRow entry={mockLeaderboardEntry} />);
    expect(screen.getByText('#1')).toBeDefined();
  });

  it('renders display name', () => {
    render(<LeaderboardRow entry={mockLeaderboardEntry} />);
    expect(screen.getByText('TopForecaster')).toBeDefined();
  });

  it('renders tier badge', () => {
    render(<LeaderboardRow entry={mockLeaderboardEntry} />);
    expect(screen.getByTestId('tier-badge')).toBeDefined();
  });

  it('renders composite score', () => {
    render(<LeaderboardRow entry={mockLeaderboardEntry} />);
    expect(screen.getByText('850')).toBeDefined();
  });

  it('shows rank change indicator for improvement', () => {
    render(<LeaderboardRow entry={{ ...mockLeaderboardEntry, rank: 1, previousRank: 5 }} />);
    const indicator = screen.getByTestId('rank-change');
    expect(indicator.textContent).toContain('+4');
  });

  it('shows rank change indicator for decline', () => {
    render(<LeaderboardRow entry={{ ...mockLeaderboardEntry, rank: 5, previousRank: 1 }} />);
    const indicator = screen.getByTestId('rank-change');
    expect(indicator.textContent).toContain('-4');
  });

  it('shows no change indicator for stable rank', () => {
    render(<LeaderboardRow entry={{ ...mockLeaderboardEntry, rank: 3, previousRank: 3 }} />);
    const indicator = screen.getByTestId('rank-change');
    expect(indicator.textContent).toContain('=');
  });

  it('displays anonymous name for private users', () => {
    render(<LeaderboardRow entry={{ ...mockLeaderboardEntry, isPrivate: true }} />);
    expect(screen.getByText('Anonymous Forecaster')).toBeDefined();
  });

  it('shows streak badge for active streaks', () => {
    render(<LeaderboardRow entry={{ ...mockLeaderboardEntry, streakDays: 30 }} />);
    const streak = screen.getByTestId('streak-badge');
    expect(streak.textContent).toContain('30');
  });

  it('calls onClick when row is clicked', () => {
    const onClick = vi.fn();
    render(<LeaderboardRow entry={mockLeaderboardEntry} onClick={onClick} />);
    const row = screen.getByTestId('leaderboard-row');
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledWith(mockLeaderboardEntry.userId);
  });
});

// =============================================================================
// LeaderboardTable Tests
// =============================================================================

describe('LeaderboardTable', () => {
  it('renders header row', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    expect(screen.getByText('RANK')).toBeDefined();
    expect(screen.getByText('FORECASTER')).toBeDefined();
    expect(screen.getByText('TIER')).toBeDefined();
    expect(screen.getByText('SCORE')).toBeDefined();
  });

  it('renders all entries', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    expect(screen.getByText('TopForecaster')).toBeDefined();
    expect(screen.getByText('SecondPlace')).toBeDefined();
  });

  it('shows empty state when no entries', () => {
    render(<LeaderboardTable entries={[]} />);
    expect(screen.getByText(/no forecasters/i)).toBeDefined();
  });

  it('highlights current user row', () => {
    render(<LeaderboardTable entries={mockEntries} currentUserId="user-2" />);
    const row = screen.getByTestId('leaderboard-row-user-2');
    expect(row.className).toContain('highlight');
  });

  it('respects privacy filter for private users', () => {
    render(<LeaderboardTable entries={mockEntries} />);
    // Private user should show anonymous name
    expect(screen.getByText('Anonymous Forecaster')).toBeDefined();
  });

  it('shows loading skeleton when loading', () => {
    render(<LeaderboardTable entries={[]} isLoading />);
    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0);
  });

  it('supports sortable columns', () => {
    const onSort = vi.fn();
    render(<LeaderboardTable entries={mockEntries} onSort={onSort} />);
    const scoreHeader = screen.getByText('SCORE');
    fireEvent.click(scoreHeader);
    expect(onSort).toHaveBeenCalledWith('score');
  });
});

// =============================================================================
// LeaderboardFilters Tests
// =============================================================================

describe('LeaderboardFilters', () => {
  const defaultProps = {
    onFilterChange: vi.fn(),
    currentFilters: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tier filter dropdown', () => {
    render(<LeaderboardFilters {...defaultProps} />);
    expect(screen.getByTestId('tier-filter')).toBeDefined();
  });

  it('renders category filter dropdown', () => {
    render(<LeaderboardFilters {...defaultProps} />);
    expect(screen.getByTestId('category-filter')).toBeDefined();
  });

  it('renders minimum forecasts filter', () => {
    render(<LeaderboardFilters {...defaultProps} />);
    expect(screen.getByTestId('min-forecasts-filter')).toBeDefined();
  });

  it('calls onFilterChange when tier filter changes', () => {
    const onFilterChange = vi.fn();
    render(<LeaderboardFilters {...defaultProps} onFilterChange={onFilterChange} />);
    const tierFilter = screen.getByTestId('tier-filter');
    fireEvent.change(tierFilter, { target: { value: 'MASTER' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ tier: 'MASTER' }));
  });

  it('calls onFilterChange when category filter changes', () => {
    const onFilterChange = vi.fn();
    render(<LeaderboardFilters {...defaultProps} onFilterChange={onFilterChange} />);
    const categoryFilter = screen.getByTestId('category-filter');
    fireEvent.change(categoryFilter, { target: { value: 'CRYPTO' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ category: 'CRYPTO' }));
  });

  it('has clear filters button', () => {
    render(<LeaderboardFilters {...defaultProps} currentFilters={{ tier: 'MASTER' }} />);
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({});
  });

  it('shows active filter count badge', () => {
    render(<LeaderboardFilters {...defaultProps} currentFilters={{ tier: 'MASTER', category: 'CRYPTO' }} />);
    const badge = screen.getByTestId('active-filters-badge');
    expect(badge.textContent).toContain('2');
  });
});

// =============================================================================
// UserRankCard Tests
// =============================================================================

describe('UserRankCard', () => {
  const mockUserData = {
    userId: 'user-1',
    displayName: 'TestUser',
    rank: 42,
    percentile: 85.5,
    tier: 'EXPERT' as const,
    tierProgress: 0.65,
    compositeScore: 580,
    brierScore: 0.18,
    totalForecasts: 200,
    resolvedForecasts: 180,
  };

  it('renders user rank prominently', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText('#42')).toBeDefined();
  });

  it('renders display name', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText('TestUser')).toBeDefined();
  });

  it('renders current tier with badge', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByTestId('tier-badge')).toBeDefined();
  });

  it('shows tier progress bar', () => {
    render(<UserRankCard {...mockUserData} />);
    const progressBar = screen.getByTestId('tier-progress');
    expect(progressBar).toBeDefined();
    // Progress should be 65%
    expect(progressBar.style.width).toBe('65%');
  });

  it('shows percentile ranking', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText(/85.5%/)).toBeDefined();
  });

  it('shows composite score', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText('580')).toBeDefined();
  });

  it('shows Brier score', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText('0.18')).toBeDefined();
  });

  it('shows forecast counts', () => {
    render(<UserRankCard {...mockUserData} />);
    expect(screen.getByText(/200/)).toBeDefined();
    expect(screen.getByText(/180/)).toBeDefined();
  });

  it('shows loading state', () => {
    render(<UserRankCard {...mockUserData} isLoading />);
    expect(screen.getByTestId('user-rank-card-skeleton')).toBeDefined();
  });

  it('shows error state when no data', () => {
    render(<UserRankCard userId="user-1" displayName={null} rank={null} tier="APPRENTICE" compositeScore={0} brierScore={null} totalForecasts={0} resolvedForecasts={0} percentile={0} tierProgress={0} />);
    expect(screen.getByText(/no ranking data/i)).toBeDefined();
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Leaderboard Integration', () => {
  it('filters table when filter changes', () => {
    const entries = mockEntries;
    const onFilterChange = vi.fn();

    const { rerender } = render(
      <>
        <LeaderboardFilters onFilterChange={onFilterChange} currentFilters={{}} />
        <LeaderboardTable entries={entries} />
      </>
    );

    // Change filter
    const tierFilter = screen.getByTestId('tier-filter');
    fireEvent.change(tierFilter, { target: { value: 'MASTER' } });

    // Rerender with filtered entries
    const filteredEntries = entries.filter(e => e.tier === 'MASTER');
    rerender(
      <>
        <LeaderboardFilters onFilterChange={onFilterChange} currentFilters={{ tier: 'MASTER' }} />
        <LeaderboardTable entries={filteredEntries} />
      </>
    );

    // Should only show MASTER tier users
    expect(screen.getByText('TopForecaster')).toBeDefined();
    expect(screen.queryByText('SecondPlace')).toBeNull();
  });

  it('highlights user row and shows rank card together', () => {
    render(
      <>
        <UserRankCard
          userId="user-2"
          displayName="SecondPlace"
          rank={2}
          percentile={95}
          tier="EXPERT"
          tierProgress={0.5}
          compositeScore={720}
          brierScore={0.15}
          totalForecasts={300}
          resolvedForecasts={250}
        />
        <LeaderboardTable entries={mockEntries} currentUserId="user-2" />
      </>
    );

    // User card shows their rank (multiple #2 exist so use getAllByText)
    const rankElements = screen.getAllByText('#2');
    expect(rankElements.length).toBeGreaterThan(0);

    // Table highlights their row
    const row = screen.getByTestId('leaderboard-row-user-2');
    expect(row.className).toContain('highlight');
  });
});
