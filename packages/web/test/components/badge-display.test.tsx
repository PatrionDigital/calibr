/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  ProfileBadgeData,
  LeaderboardBadgeData,
} from '../../src/components/badge-display';
import {
  ProfileBadgeStrip,
  ProfileBadgeSection,
  LeaderboardBadgeCell,
  BadgeDetailModal,
  BadgeRarityIndicator,
  ProfileBadgeWall,
  BadgeDisplayPage,
  useBadgeDisplay,
} from '../../src/components/badge-display';

// =============================================================================
// Test Data
// =============================================================================

const mockBadges: ProfileBadgeData[] = [
  {
    id: 'streak-7',
    name: '7 Day Streak',
    description: 'Forecast for 7 consecutive days',
    icon: '🔥',
    category: 'streak',
    tier: 'NOVICE',
    earnedAt: '2025-01-10',
    rarity: 'common',
  },
  {
    id: 'accuracy-70',
    name: 'Calibrated',
    description: 'Achieve 70% accuracy over 50 forecasts',
    icon: '🎯',
    category: 'accuracy',
    tier: 'APPRENTICE',
    earnedAt: '2025-01-15',
    rarity: 'rare',
  },
  {
    id: 'forecasts-50',
    name: 'Active Forecaster',
    description: 'Complete 50 forecasts',
    icon: '📊',
    category: 'volume',
    tier: 'APPRENTICE',
    earnedAt: '2025-01-20',
    rarity: 'common',
  },
  {
    id: 'tier-expert',
    name: 'Expert Forecaster',
    description: 'Reach Expert tier',
    icon: '⭐',
    category: 'tier',
    tier: 'EXPERT',
    earnedAt: '2025-02-01',
    rarity: 'epic',
  },
  {
    id: 'streak-30',
    name: '30 Day Streak',
    description: 'Forecast for 30 consecutive days',
    icon: '🔥',
    category: 'streak',
    tier: 'EXPERT',
    earnedAt: '2025-02-10',
    rarity: 'rare',
  },
];

const mockLeaderboardBadges: LeaderboardBadgeData[] = [
  {
    address: '0x1234',
    displayName: 'alice.eth',
    badgeCount: 5,
    topBadges: mockBadges.slice(0, 3),
    tier: 'EXPERT',
  },
  {
    address: '0x5678',
    displayName: 'bob.eth',
    badgeCount: 2,
    topBadges: mockBadges.slice(0, 2),
    tier: 'APPRENTICE',
  },
  {
    address: '0x9abc',
    displayName: 'carol.eth',
    badgeCount: 0,
    topBadges: [],
    tier: 'NOVICE',
  },
];

// =============================================================================
// ProfileBadgeStrip Tests
// =============================================================================

describe('ProfileBadgeStrip', () => {
  it('renders badge strip', () => {
    render(<ProfileBadgeStrip badges={mockBadges} />);
    expect(screen.getByTestId('profile-badge-strip')).toBeInTheDocument();
  });

  it('shows badge icons', () => {
    render(<ProfileBadgeStrip badges={mockBadges} />);
    expect(screen.getAllByText('🔥').length).toBeGreaterThan(0);
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });

  it('limits displayed badges', () => {
    render(<ProfileBadgeStrip badges={mockBadges} maxDisplay={3} />);
    const items = screen.getAllByTestId('strip-badge');
    expect(items.length).toBe(3);
  });

  it('shows overflow count', () => {
    render(<ProfileBadgeStrip badges={mockBadges} maxDisplay={3} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ProfileBadgeStrip badges={[]} />);
    expect(screen.getByText(/no badges/i)).toBeInTheDocument();
  });

  it('calls onBadgeClick when badge clicked', () => {
    const onClick = vi.fn();
    render(<ProfileBadgeStrip badges={mockBadges} onBadgeClick={onClick} />);
    const items = screen.getAllByTestId('strip-badge');
    fireEvent.click(items[0]!);
    expect(onClick).toHaveBeenCalledWith('streak-7');
  });
});

// =============================================================================
// ProfileBadgeSection Tests
// =============================================================================

describe('ProfileBadgeSection', () => {
  it('renders section', () => {
    render(<ProfileBadgeSection badges={mockBadges} />);
    expect(screen.getByTestId('profile-badge-section')).toBeInTheDocument();
  });

  it('shows section title', () => {
    render(<ProfileBadgeSection badges={mockBadges} />);
    expect(screen.getAllByText(/badges/i).length).toBeGreaterThan(0);
  });

  it('shows badge count', () => {
    render(<ProfileBadgeSection badges={mockBadges} />);
    const section = screen.getByTestId('profile-badge-section');
    expect(section).toHaveTextContent('5');
  });

  it('groups by category', () => {
    render(<ProfileBadgeSection badges={mockBadges} />);
    expect(screen.getAllByText(/streak/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/accuracy/i).length).toBeGreaterThan(0);
  });

  it('shows badge names', () => {
    render(<ProfileBadgeSection badges={mockBadges} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Calibrated')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ProfileBadgeSection badges={[]} />);
    expect(screen.getByText(/no badges earned/i)).toBeInTheDocument();
  });

  it('calls onBadgeClick', () => {
    const onClick = vi.fn();
    render(<ProfileBadgeSection badges={mockBadges} onBadgeClick={onClick} />);
    fireEvent.click(screen.getByText('7 Day Streak'));
    expect(onClick).toHaveBeenCalledWith('streak-7');
  });
});

// =============================================================================
// LeaderboardBadgeCell Tests
// =============================================================================

describe('LeaderboardBadgeCell', () => {
  it('renders cell', () => {
    render(<LeaderboardBadgeCell data={mockLeaderboardBadges[0]!} />);
    expect(screen.getByTestId('leaderboard-badge-cell')).toBeInTheDocument();
  });

  it('shows badge icons', () => {
    render(<LeaderboardBadgeCell data={mockLeaderboardBadges[0]!} />);
    expect(screen.getAllByText('🔥').length).toBeGreaterThan(0);
  });

  it('shows badge count', () => {
    render(<LeaderboardBadgeCell data={mockLeaderboardBadges[0]!} />);
    const cell = screen.getByTestId('leaderboard-badge-cell');
    expect(cell).toHaveTextContent('5');
  });

  it('shows empty state for no badges', () => {
    render(<LeaderboardBadgeCell data={mockLeaderboardBadges[2]!} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('limits displayed icons', () => {
    render(<LeaderboardBadgeCell data={mockLeaderboardBadges[0]!} maxIcons={2} />);
    const icons = screen.getAllByTestId('cell-badge-icon');
    expect(icons.length).toBe(2);
  });
});

// =============================================================================
// BadgeDetailModal Tests
// =============================================================================

describe('BadgeDetailModal', () => {
  it('renders modal', () => {
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={() => {}} />);
    expect(screen.getByTestId('badge-detail-modal')).toBeInTheDocument();
  });

  it('shows badge name', () => {
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={() => {}} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows badge description', () => {
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={() => {}} />);
    expect(screen.getByText(/7 consecutive days/i)).toBeInTheDocument();
  });

  it('shows earned date', () => {
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={() => {}} />);
    expect(screen.getByText(/jan/i)).toBeInTheDocument();
  });

  it('shows badge icon', () => {
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={() => {}} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows rarity', () => {
    render(<BadgeDetailModal badge={mockBadges[3]!} onClose={() => {}} />);
    expect(screen.getAllByText(/epic/i).length).toBeGreaterThan(0);
  });

  it('shows tier', () => {
    render(<BadgeDetailModal badge={mockBadges[3]!} onClose={() => {}} />);
    expect(screen.getByText('EXPERT')).toBeInTheDocument();
  });

  it('calls onClose when close clicked', () => {
    const onClose = vi.fn();
    render(<BadgeDetailModal badge={mockBadges[0]!} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// BadgeRarityIndicator Tests
// =============================================================================

describe('BadgeRarityIndicator', () => {
  it('renders indicator', () => {
    render(<BadgeRarityIndicator rarity="common" />);
    expect(screen.getByTestId('rarity-indicator')).toBeInTheDocument();
  });

  it('shows common rarity', () => {
    render(<BadgeRarityIndicator rarity="common" />);
    expect(screen.getByText(/common/i)).toBeInTheDocument();
  });

  it('shows rare rarity', () => {
    render(<BadgeRarityIndicator rarity="rare" />);
    expect(screen.getByText(/rare/i)).toBeInTheDocument();
  });

  it('shows epic rarity', () => {
    render(<BadgeRarityIndicator rarity="epic" />);
    expect(screen.getByText(/epic/i)).toBeInTheDocument();
  });

  it('shows legendary rarity', () => {
    render(<BadgeRarityIndicator rarity="legendary" />);
    expect(screen.getByText(/legendary/i)).toBeInTheDocument();
  });

  it('applies rarity-specific styling', () => {
    render(<BadgeRarityIndicator rarity="legendary" />);
    const indicator = screen.getByTestId('rarity-indicator');
    expect(indicator.className).toContain('legendary');
  });
});

// =============================================================================
// ProfileBadgeWall Tests
// =============================================================================

describe('ProfileBadgeWall', () => {
  it('renders wall', () => {
    render(<ProfileBadgeWall badges={mockBadges} />);
    expect(screen.getByTestId('profile-badge-wall')).toBeInTheDocument();
  });

  it('shows all badges', () => {
    render(<ProfileBadgeWall badges={mockBadges} />);
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Calibrated')).toBeInTheDocument();
    expect(screen.getByText('Expert Forecaster')).toBeInTheDocument();
  });

  it('shows badge icons', () => {
    render(<ProfileBadgeWall badges={mockBadges} />);
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ProfileBadgeWall badges={[]} />);
    expect(screen.getByText(/no badges/i)).toBeInTheDocument();
  });

  it('calls onBadgeClick', () => {
    const onClick = vi.fn();
    render(<ProfileBadgeWall badges={mockBadges} onBadgeClick={onClick} />);
    fireEvent.click(screen.getByText('Calibrated'));
    expect(onClick).toHaveBeenCalledWith('accuracy-70');
  });

  it('shows rarity indicators', () => {
    render(<ProfileBadgeWall badges={mockBadges} />);
    const indicators = screen.getAllByTestId('rarity-indicator');
    expect(indicators.length).toBe(5);
  });
});

// =============================================================================
// BadgeDisplayPage Tests
// =============================================================================

describe('BadgeDisplayPage', () => {
  it('renders page', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    expect(screen.getByTestId('badge-display-page')).toBeInTheDocument();
  });

  it('shows page title', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    expect(screen.getAllByText(/badges/i).length).toBeGreaterThan(0);
  });

  it('shows badge wall', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    expect(screen.getByTestId('profile-badge-wall')).toBeInTheDocument();
  });

  it('shows leaderboard section', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    expect(screen.getByTestId('leaderboard-badges-section')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <BadgeDisplayPage
        badges={[]}
        leaderboardData={[]}
        loading={true}
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('opens detail modal on badge click', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    fireEvent.click(screen.getByText('7 Day Streak'));
    expect(screen.getByTestId('badge-detail-modal')).toBeInTheDocument();
  });

  it('closes detail modal', () => {
    render(
      <BadgeDisplayPage
        badges={mockBadges}
        leaderboardData={mockLeaderboardBadges}
      />
    );
    fireEvent.click(screen.getByText('7 Day Streak'));
    expect(screen.getByTestId('badge-detail-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-modal'));
    expect(screen.queryByTestId('badge-detail-modal')).not.toBeInTheDocument();
  });
});

// =============================================================================
// useBadgeDisplay Hook Tests
// =============================================================================

describe('useBadgeDisplay', () => {
  function TestComponent({ badges }: { badges: ProfileBadgeData[] }) {
    const {
      sortedBadges,
      badgesByCategory,
      selectedBadge,
      selectBadge,
      clearSelection,
      rarityStats,
    } = useBadgeDisplay(badges);

    return (
      <div>
        <span data-testid="sorted-count">{sortedBadges.length}</span>
        <span data-testid="category-count">{Object.keys(badgesByCategory).length}</span>
        <span data-testid="selected-id">{selectedBadge?.id ?? 'none'}</span>
        <span data-testid="common-count">{rarityStats.common}</span>
        <span data-testid="rare-count">{rarityStats.rare}</span>
        <span data-testid="epic-count">{rarityStats.epic}</span>
        <button onClick={() => selectBadge('streak-7')}>Select</button>
        <button onClick={clearSelection}>Clear</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts badges by rarity', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('sorted-count')).toHaveTextContent('5');
  });

  it('groups badges by category', () => {
    render(<TestComponent badges={mockBadges} />);
    const count = parseInt(screen.getByTestId('category-count').textContent!);
    expect(count).toBeGreaterThan(0);
  });

  it('selects badge', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    expect(screen.getByTestId('selected-id')).toHaveTextContent('streak-7');
  });

  it('clears selection', () => {
    render(<TestComponent badges={mockBadges} />);
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });

  it('calculates rarity stats', () => {
    render(<TestComponent badges={mockBadges} />);
    expect(screen.getByTestId('common-count')).toHaveTextContent('2');
    expect(screen.getByTestId('rare-count')).toHaveTextContent('2');
    expect(screen.getByTestId('epic-count')).toHaveTextContent('1');
  });

  it('handles empty badges', () => {
    render(<TestComponent badges={[]} />);
    expect(screen.getByTestId('sorted-count')).toHaveTextContent('0');
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });
});
