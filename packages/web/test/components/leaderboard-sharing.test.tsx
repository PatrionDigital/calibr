/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  ShareableAchievement,
  ShareTarget,
} from '../../src/components/leaderboard-sharing';
import {
  AchievementCard,
  ShareButton,
  ShareModal,
  AchievementBadge,
  ShareableRankCard,
  LeaderboardSharingPanel,
  useLeaderboardSharing,
} from '../../src/components/leaderboard-sharing';

// =============================================================================
// Test Data
// =============================================================================

const mockAchievement: ShareableAchievement = {
  id: 'ach-1',
  type: 'rank_milestone',
  title: 'Top 10 Forecaster',
  description: 'Reached top 10 in the overall leaderboard',
  icon: '🏆',
  earnedAt: '2025-01-15',
  value: 8,
  shareText: "I'm a Top 10 Forecaster on Calibr.xyz! Rank #8 overall.",
};

const mockAchievements: ShareableAchievement[] = [
  mockAchievement,
  {
    id: 'ach-2',
    type: 'tier_promotion',
    title: 'Master Tier',
    description: 'Promoted to Master tier',
    icon: '⭐',
    earnedAt: '2025-01-20',
    value: null,
    shareText: "I've reached Master tier on Calibr.xyz!",
  },
  {
    id: 'ach-3',
    type: 'streak',
    title: '10 Day Streak',
    description: 'Forecasted for 10 consecutive days',
    icon: '🔥',
    earnedAt: '2025-01-25',
    value: 10,
    shareText: "I'm on a 10-day forecasting streak on Calibr.xyz!",
  },
];

const mockShareTargets: ShareTarget[] = [
  { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
  { id: 'farcaster', name: 'Farcaster', icon: '🟣' },
  { id: 'clipboard', name: 'Copy Link', icon: '📋' },
];

// =============================================================================
// AchievementCard Tests
// =============================================================================

describe('AchievementCard', () => {
  it('renders achievement card', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByTestId('achievement-card')).toBeInTheDocument();
  });

  it('shows achievement title', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText('Top 10 Forecaster')).toBeInTheDocument();
  });

  it('shows achievement description', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText(/reached top 10/i)).toBeInTheDocument();
  });

  it('shows achievement icon', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('shows earned date', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText(/jan/i)).toBeInTheDocument();
  });

  it('shows share button when onShare provided', () => {
    render(<AchievementCard achievement={mockAchievement} onShare={() => {}} />);
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('calls onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(<AchievementCard achievement={mockAchievement} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    expect(onShare).toHaveBeenCalledWith('ach-1');
  });

  it('shows value when present', () => {
    render(<AchievementCard achievement={mockAchievement} />);
    expect(screen.getByText('#8')).toBeInTheDocument();
  });

  it('supports compact mode', () => {
    render(<AchievementCard achievement={mockAchievement} compact />);
    expect(screen.getByTestId('achievement-card')).toHaveClass('compact');
  });
});

// =============================================================================
// ShareButton Tests
// =============================================================================

describe('ShareButton', () => {
  it('renders share button', () => {
    render(<ShareButton onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows share label', () => {
    render(<ShareButton onClick={() => {}} />);
    expect(screen.getByText(/share/i)).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ShareButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('supports custom label', () => {
    render(<ShareButton onClick={() => {}} label="Share Achievement" />);
    expect(screen.getByText('Share Achievement')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<ShareButton onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports different sizes', () => {
    render(<ShareButton onClick={() => {}} size="sm" />);
    expect(screen.getByRole('button')).toHaveClass('text-xs');
  });
});

// =============================================================================
// ShareModal Tests
// =============================================================================

describe('ShareModal', () => {
  it('renders modal when open', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    expect(screen.getByTestId('share-modal')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ShareModal
        isOpen={false}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
  });

  it('shows achievement title in modal', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    expect(screen.getByText('Top 10 Forecaster')).toBeInTheDocument();
  });

  it('shows share targets', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    expect(screen.getByText('Twitter/X')).toBeInTheDocument();
    expect(screen.getByText('Farcaster')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('shows share text preview', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    expect(screen.getByText(/top 10 forecaster on calibr/i)).toBeInTheDocument();
  });

  it('calls onShare when target clicked', () => {
    const onShare = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
        onShare={onShare}
      />
    );
    fireEvent.click(screen.getByText('Twitter/X'));
    expect(onShare).toHaveBeenCalledWith('twitter', mockAchievement);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={onClose}
        achievement={mockAchievement}
        targets={mockShareTargets}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows copy success feedback', async () => {
    const onShare = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        achievement={mockAchievement}
        targets={mockShareTargets}
        onShare={onShare}
      />
    );
    fireEvent.click(screen.getByText('Copy Link'));
    expect(onShare).toHaveBeenCalledWith('clipboard', mockAchievement);
  });
});

// =============================================================================
// AchievementBadge Tests
// =============================================================================

describe('AchievementBadge', () => {
  it('renders badge', () => {
    render(<AchievementBadge achievement={mockAchievement} />);
    expect(screen.getByTestId('achievement-badge')).toBeInTheDocument();
  });

  it('shows icon', () => {
    render(<AchievementBadge achievement={mockAchievement} />);
    expect(screen.getByText('🏆')).toBeInTheDocument();
  });

  it('shows title on hover', () => {
    render(<AchievementBadge achievement={mockAchievement} />);
    expect(screen.getByTitle('Top 10 Forecaster')).toBeInTheDocument();
  });

  it('supports different sizes', () => {
    render(<AchievementBadge achievement={mockAchievement} size="lg" />);
    expect(screen.getByTestId('achievement-badge')).toHaveClass('text-2xl');
  });

  it('shows locked state', () => {
    render(<AchievementBadge achievement={mockAchievement} locked />);
    expect(screen.getByTestId('achievement-badge')).toHaveClass('locked');
  });
});

// =============================================================================
// ShareableRankCard Tests
// =============================================================================

describe('ShareableRankCard', () => {
  it('renders rank card', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
      />
    );
    expect(screen.getByTestId('shareable-rank-card')).toBeInTheDocument();
  });

  it('shows rank', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
      />
    );
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('shows display name', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
      />
    );
    expect(screen.getByText('alice.eth')).toBeInTheDocument();
  });

  it('shows score', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
      />
    );
    expect(screen.getByText('870')).toBeInTheDocument();
  });

  it('shows percentile', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
      />
    );
    expect(screen.getByText(/top 1%/i)).toBeInTheDocument();
  });

  it('shows share button', () => {
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
        onShare={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('calls onShare when clicked', () => {
    const onShare = vi.fn();
    render(
      <ShareableRankCard
        rank={5}
        tier="MASTER"
        score={870}
        totalForecasters={500}
        displayName="alice.eth"
        onShare={onShare}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    expect(onShare).toHaveBeenCalled();
  });
});

// =============================================================================
// LeaderboardSharingPanel Tests
// =============================================================================

describe('LeaderboardSharingPanel', () => {
  it('renders sharing panel', () => {
    render(<LeaderboardSharingPanel achievements={mockAchievements} targets={mockShareTargets} />);
    expect(screen.getByTestId('leaderboard-sharing-panel')).toBeInTheDocument();
  });

  it('shows panel title', () => {
    render(<LeaderboardSharingPanel achievements={mockAchievements} targets={mockShareTargets} />);
    expect(screen.getAllByText(/achievements/i).length).toBeGreaterThan(0);
  });

  it('shows all achievements', () => {
    render(<LeaderboardSharingPanel achievements={mockAchievements} targets={mockShareTargets} />);
    expect(screen.getByText('Top 10 Forecaster')).toBeInTheDocument();
    expect(screen.getByText('Master Tier')).toBeInTheDocument();
    expect(screen.getByText('10 Day Streak')).toBeInTheDocument();
  });

  it('shows achievement count', () => {
    render(<LeaderboardSharingPanel achievements={mockAchievements} targets={mockShareTargets} />);
    expect(screen.getByText(/3 achievements/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<LeaderboardSharingPanel achievements={[]} targets={mockShareTargets} />);
    expect(screen.getByText(/no achievements/i)).toBeInTheDocument();
  });

  it('opens share modal on achievement share', () => {
    render(<LeaderboardSharingPanel achievements={mockAchievements} targets={mockShareTargets} />);
    const shareButtons = screen.getAllByRole('button', { name: /share/i });
    fireEvent.click(shareButtons[0]!);
    expect(screen.getByTestId('share-modal')).toBeInTheDocument();
  });
});

// =============================================================================
// useLeaderboardSharing Hook Tests
// =============================================================================

describe('useLeaderboardSharing', () => {
  function TestComponent({ achievements }: { achievements: ShareableAchievement[] }) {
    const {
      selectedAchievement,
      isModalOpen,
      openShareModal,
      closeShareModal,
      shareCount,
    } = useLeaderboardSharing(achievements);

    return (
      <div>
        <span data-testid="modal-open">{String(isModalOpen)}</span>
        <span data-testid="selected-id">{selectedAchievement?.id ?? 'none'}</span>
        <span data-testid="share-count">{shareCount}</span>
        <button onClick={() => openShareModal('ach-1')}>Open Modal</button>
        <button onClick={() => closeShareModal()}>Close Modal</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with modal closed', () => {
    render(<TestComponent achievements={mockAchievements} />);
    expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
  });

  it('starts with no selected achievement', () => {
    render(<TestComponent achievements={mockAchievements} />);
    expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
  });

  it('opens modal with selected achievement', () => {
    render(<TestComponent achievements={mockAchievements} />);
    fireEvent.click(screen.getByText('Open Modal'));
    expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('selected-id')).toHaveTextContent('ach-1');
  });

  it('closes modal', () => {
    render(<TestComponent achievements={mockAchievements} />);
    fireEvent.click(screen.getByText('Open Modal'));
    fireEvent.click(screen.getByText('Close Modal'));
    expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
  });

  it('tracks share count', () => {
    render(<TestComponent achievements={mockAchievements} />);
    expect(screen.getByTestId('share-count')).toHaveTextContent('0');
  });
});
