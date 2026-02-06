/**
 * ProfileAchievementPanel Component Tests
 *
 * Tests for the achievement panel components:
 * - AchievementCard - single achievement display (compact/full modes)
 * - AchievementGrid - grid with unlocked/in-progress/locked sections
 * - AchievementSummary - summary stats display
 * - AchievementCategoryFilter - category filter buttons
 * - AchievementPanel - main panel with loading/error/data states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  AchievementCard,
  AchievementGrid,
  AchievementSummary,
  AchievementCategoryFilter,
  AchievementPanel,
} from '@/components/profile-achievement-panel';

// =============================================================================
// Types
// =============================================================================

type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  unlockedAt: Date | null;
  progress: number;
  maxProgress: number;
}

// =============================================================================
// Test Data
// =============================================================================

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'ach-1',
  name: 'First Prediction',
  description: 'Make your first prediction on the platform',
  category: 'ACCURACY',
  tier: 'BRONZE',
  unlockedAt: null,
  progress: 0,
  maxProgress: 1,
  ...overrides,
});

const unlockedAchievement: Achievement = {
  id: 'ach-unlocked',
  name: 'Streak Master',
  description: 'Maintain a 7-day prediction streak',
  category: 'STREAK',
  tier: 'GOLD',
  unlockedAt: new Date('2024-01-15'),
  progress: 7,
  maxProgress: 7,
};

const inProgressAchievement: Achievement = {
  id: 'ach-progress',
  name: 'Volume Trader',
  description: 'Trade $1000 worth of predictions',
  category: 'VOLUME',
  tier: 'SILVER',
  unlockedAt: null,
  progress: 500,
  maxProgress: 1000,
};

const lockedAchievement: Achievement = {
  id: 'ach-locked',
  name: 'Diamond Hands',
  description: 'Hold a position for 30 days',
  category: 'SPECIAL',
  tier: 'DIAMOND',
  unlockedAt: null,
  progress: 0,
  maxProgress: 30,
};

// =============================================================================
// Mocks
// =============================================================================

// Mock fetch for AchievementPanel tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// AchievementCard Tests
// =============================================================================

describe('AchievementCard', () => {
  describe('full mode (default)', () => {
    it('renders achievement name', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
    });

    it('renders achievement description', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.getByText('Maintain a 7-day prediction streak')).toBeInTheDocument();
    });

    it('renders category icon for STREAK', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });

    it('renders category icon for VOLUME', () => {
      render(<AchievementCard achievement={inProgressAchievement} />);
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('renders category icon for ACCURACY', () => {
      const achievement = createAchievement({ category: 'ACCURACY' });
      render(<AchievementCard achievement={achievement} />);
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });

    it('renders category icon for CALIBRATION', () => {
      const achievement = createAchievement({ category: 'CALIBRATION' });
      render(<AchievementCard achievement={achievement} />);
      expect(screen.getByText('⚖️')).toBeInTheDocument();
    });

    it('renders category icon for SPECIAL', () => {
      render(<AchievementCard achievement={lockedAchievement} />);
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('renders tier badge for BRONZE', () => {
      const achievement = createAchievement({ tier: 'BRONZE' });
      render(<AchievementCard achievement={achievement} />);
      expect(screen.getByText('[B]')).toBeInTheDocument();
    });

    it('renders tier badge for SILVER', () => {
      render(<AchievementCard achievement={inProgressAchievement} />);
      expect(screen.getByText('[S]')).toBeInTheDocument();
    });

    it('renders tier badge for GOLD', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.getByText('[G]')).toBeInTheDocument();
    });

    it('renders tier badge for PLATINUM', () => {
      const achievement = createAchievement({ tier: 'PLATINUM' });
      render(<AchievementCard achievement={achievement} />);
      expect(screen.getByText('[P]')).toBeInTheDocument();
    });

    it('renders tier badge for DIAMOND', () => {
      render(<AchievementCard achievement={lockedAchievement} />);
      expect(screen.getByText('[D]')).toBeInTheDocument();
    });

    it('shows unlock date for unlocked achievement', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.getByText(/Unlocked/)).toBeInTheDocument();
    });

    it('shows progress bar for in-progress achievement', () => {
      render(<AchievementCard achievement={inProgressAchievement} />);
      expect(screen.getByText('500/1000')).toBeInTheDocument();
    });

    it('shows progress bar for locked achievement', () => {
      render(<AchievementCard achievement={lockedAchievement} />);
      expect(screen.getByText('0/30')).toBeInTheDocument();
    });

    it('does not show progress bar for unlocked achievement', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      expect(screen.queryByText('7/7')).not.toBeInTheDocument();
    });

    it('applies tier color to unlocked achievement name', () => {
      render(<AchievementCard achievement={unlockedAchievement} />);
      const name = screen.getByText('Streak Master');
      expect(name).toHaveClass('text-yellow-400'); // GOLD color
    });

    it('applies tier border to unlocked achievement', () => {
      const { container } = render(<AchievementCard achievement={unlockedAchievement} />);
      const card = container.firstChild;
      expect(card).toHaveClass('border-yellow-400');
    });

    it('applies reduced opacity to locked achievement', () => {
      const { container } = render(<AchievementCard achievement={lockedAchievement} />);
      const card = container.firstChild;
      expect(card).toHaveClass('opacity-75');
    });
  });

  describe('compact mode', () => {
    it('renders achievement name in compact mode', () => {
      render(<AchievementCard achievement={unlockedAchievement} compact />);
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
    });

    it('hides description in compact mode', () => {
      render(<AchievementCard achievement={unlockedAchievement} compact />);
      expect(screen.queryByText('Maintain a 7-day prediction streak')).not.toBeInTheDocument();
    });

    it('shows checkmark for unlocked achievement in compact mode', () => {
      render(<AchievementCard achievement={unlockedAchievement} compact />);
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows percentage for locked achievement in compact mode', () => {
      render(<AchievementCard achievement={inProgressAchievement} compact />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows 0% for achievement with no progress', () => {
      render(<AchievementCard achievement={lockedAchievement} compact />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('applies lower opacity to locked achievement in compact mode', () => {
      const { container } = render(<AchievementCard achievement={lockedAchievement} compact />);
      const card = container.firstChild;
      expect(card).toHaveClass('opacity-60');
    });
  });
});

// =============================================================================
// AchievementGrid Tests
// =============================================================================

describe('AchievementGrid', () => {
  const mixedAchievements: Achievement[] = [
    unlockedAchievement,
    inProgressAchievement,
    lockedAchievement,
    {
      ...unlockedAchievement,
      id: 'ach-unlocked-2',
      name: 'Second Unlock',
      category: 'ACCURACY',
    },
    {
      ...inProgressAchievement,
      id: 'ach-progress-2',
      name: 'Second Progress',
      category: 'CALIBRATION',
      progress: 250,
    },
  ];

  it('renders unlocked section header', () => {
    render(<AchievementGrid achievements={mixedAchievements} />);
    expect(screen.getByText('[UNLOCKED] (2)')).toBeInTheDocument();
  });

  it('renders in-progress section header', () => {
    render(<AchievementGrid achievements={mixedAchievements} />);
    expect(screen.getByText('[IN PROGRESS] (2)')).toBeInTheDocument();
  });

  it('renders locked section header', () => {
    render(<AchievementGrid achievements={mixedAchievements} />);
    expect(screen.getByText('[LOCKED] (1)')).toBeInTheDocument();
  });

  it('hides unlocked section when no unlocked achievements', () => {
    const achievements = [inProgressAchievement, lockedAchievement];
    render(<AchievementGrid achievements={achievements} />);
    expect(screen.queryByText(/\[UNLOCKED\]/)).not.toBeInTheDocument();
  });

  it('hides in-progress section when no in-progress achievements', () => {
    const achievements = [unlockedAchievement, lockedAchievement];
    render(<AchievementGrid achievements={achievements} />);
    expect(screen.queryByText(/\[IN PROGRESS\]/)).not.toBeInTheDocument();
  });

  it('hides locked section when no locked achievements', () => {
    const achievements = [unlockedAchievement, inProgressAchievement];
    render(<AchievementGrid achievements={achievements} />);
    expect(screen.queryByText(/\[LOCKED\]/)).not.toBeInTheDocument();
  });

  it('renders all achievement names', () => {
    render(<AchievementGrid achievements={mixedAchievements} />);
    expect(screen.getByText('Streak Master')).toBeInTheDocument();
    expect(screen.getByText('Volume Trader')).toBeInTheDocument();
    expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
    expect(screen.getByText('Second Unlock')).toBeInTheDocument();
    expect(screen.getByText('Second Progress')).toBeInTheDocument();
  });

  describe('category filtering', () => {
    it('filters by STREAK category', () => {
      render(<AchievementGrid achievements={mixedAchievements} category="STREAK" />);
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
      expect(screen.queryByText('Volume Trader')).not.toBeInTheDocument();
    });

    it('filters by VOLUME category', () => {
      render(<AchievementGrid achievements={mixedAchievements} category="VOLUME" />);
      expect(screen.getByText('Volume Trader')).toBeInTheDocument();
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument();
    });

    it('filters by ACCURACY category', () => {
      render(<AchievementGrid achievements={mixedAchievements} category="ACCURACY" />);
      expect(screen.getByText('Second Unlock')).toBeInTheDocument();
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument();
    });

    it('filters by CALIBRATION category', () => {
      render(<AchievementGrid achievements={mixedAchievements} category="CALIBRATION" />);
      expect(screen.getByText('Second Progress')).toBeInTheDocument();
      expect(screen.queryByText('Volume Trader')).not.toBeInTheDocument();
    });

    it('filters by SPECIAL category', () => {
      render(<AchievementGrid achievements={mixedAchievements} category="SPECIAL" />);
      expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument();
    });

    it('shows all achievements when no category filter', () => {
      render(<AchievementGrid achievements={mixedAchievements} />);
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
      expect(screen.getByText('Volume Trader')).toBeInTheDocument();
      expect(screen.getByText('Diamond Hands')).toBeInTheDocument();
    });

    it('shows empty sections when filtered category has no achievements', () => {
      const streakOnly = [unlockedAchievement]; // STREAK category
      render(<AchievementGrid achievements={streakOnly} category="VOLUME" />);
      expect(screen.queryByText(/\[UNLOCKED\]/)).not.toBeInTheDocument();
    });
  });

  it('renders locked achievements in compact mode', () => {
    render(<AchievementGrid achievements={[lockedAchievement]} />);
    // Compact mode shows percentage instead of full description
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles empty achievements array', () => {
    const { container } = render(<AchievementGrid achievements={[]} />);
    expect(container.querySelector('.space-y-6')).toBeInTheDocument();
    expect(screen.queryByText(/\[UNLOCKED\]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[IN PROGRESS\]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[LOCKED\]/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// AchievementSummary Tests
// =============================================================================

describe('AchievementSummary', () => {
  it('renders the achievement progress header', () => {
    render(<AchievementSummary unlockedCount={5} totalCount={20} achievementScore={150} />);
    expect(screen.getByText('[ACHIEVEMENT PROGRESS]')).toBeInTheDocument();
  });

  it('renders unlocked count', () => {
    render(<AchievementSummary unlockedCount={5} totalCount={20} achievementScore={150} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
  });

  it('renders total count', () => {
    render(<AchievementSummary unlockedCount={5} totalCount={20} achievementScore={150} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders achievement score', () => {
    render(<AchievementSummary unlockedCount={5} totalCount={20} achievementScore={150} />);
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
  });

  it('calculates and displays percentage complete', () => {
    render(<AchievementSummary unlockedCount={5} totalCount={20} achievementScore={150} />);
    expect(screen.getByText('25% Complete')).toBeInTheDocument();
  });

  it('rounds percentage to nearest integer', () => {
    render(<AchievementSummary unlockedCount={3} totalCount={7} achievementScore={100} />);
    expect(screen.getByText('43% Complete')).toBeInTheDocument();
  });

  it('shows progress bar with correct fraction', () => {
    render(<AchievementSummary unlockedCount={10} totalCount={40} achievementScore={300} />);
    expect(screen.getByText('10/40')).toBeInTheDocument();
  });

  it('shows 0% complete when no achievements unlocked', () => {
    render(<AchievementSummary unlockedCount={0} totalCount={20} achievementScore={0} />);
    expect(screen.getByText('0% Complete')).toBeInTheDocument();
  });

  it('shows 100% complete when all achievements unlocked', () => {
    render(<AchievementSummary unlockedCount={20} totalCount={20} achievementScore={500} />);
    expect(screen.getByText('100% Complete')).toBeInTheDocument();
  });

  it('displays large numbers correctly', () => {
    render(<AchievementSummary unlockedCount={99} totalCount={150} achievementScore={9999} />);
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('9999')).toBeInTheDocument();
  });
});

// =============================================================================
// AchievementCategoryFilter Tests
// =============================================================================

describe('AchievementCategoryFilter', () => {
  it('renders ALL button', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('renders STREAK button with icon', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('🔥 STREAK')).toBeInTheDocument();
  });

  it('renders VOLUME button with icon', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('📊 VOLUME')).toBeInTheDocument();
  });

  it('renders ACCURACY button with icon', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('🎯 ACCURACY')).toBeInTheDocument();
  });

  it('renders CALIBRATION button with icon', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('⚖️ CALIBRATION')).toBeInTheDocument();
  });

  it('renders SPECIAL button with icon', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    expect(screen.getByText('⭐ SPECIAL')).toBeInTheDocument();
  });

  it('highlights selected ALL button', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    const button = screen.getByText('ALL');
    expect(button).toHaveClass('border-[hsl(var(--primary))]');
  });

  it('highlights selected STREAK button', () => {
    render(<AchievementCategoryFilter selected="STREAK" onSelect={vi.fn()} />);
    const button = screen.getByText('🔥 STREAK');
    expect(button).toHaveClass('border-[hsl(var(--primary))]');
  });

  it('calls onSelect with ALL when ALL clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="STREAK" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('ALL'));
    expect(onSelect).toHaveBeenCalledWith('ALL');
  });

  it('calls onSelect with STREAK when STREAK clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="ALL" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('🔥 STREAK'));
    expect(onSelect).toHaveBeenCalledWith('STREAK');
  });

  it('calls onSelect with VOLUME when VOLUME clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="ALL" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('📊 VOLUME'));
    expect(onSelect).toHaveBeenCalledWith('VOLUME');
  });

  it('calls onSelect with ACCURACY when ACCURACY clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="ALL" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('🎯 ACCURACY'));
    expect(onSelect).toHaveBeenCalledWith('ACCURACY');
  });

  it('calls onSelect with CALIBRATION when CALIBRATION clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="ALL" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('⚖️ CALIBRATION'));
    expect(onSelect).toHaveBeenCalledWith('CALIBRATION');
  });

  it('calls onSelect with SPECIAL when SPECIAL clicked', () => {
    const onSelect = vi.fn();
    render(<AchievementCategoryFilter selected="ALL" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('⭐ SPECIAL'));
    expect(onSelect).toHaveBeenCalledWith('SPECIAL');
  });

  it('does not highlight non-selected buttons', () => {
    render(<AchievementCategoryFilter selected="ALL" onSelect={vi.fn()} />);
    const button = screen.getByText('🔥 STREAK');
    expect(button).not.toHaveClass('border-[hsl(var(--primary))]');
    expect(button).toHaveClass('border-[hsl(var(--border))]');
  });
});

// =============================================================================
// AchievementPanel Tests
// =============================================================================

describe('AchievementPanel', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('no userId state', () => {
    it('renders connect wallet message when no userId', () => {
      render(<AchievementPanel />);
      expect(screen.getByText('Connect wallet to view your achievements')).toBeInTheDocument();
    });

    it('renders achievements header when no userId', () => {
      render(<AchievementPanel />);
      expect(screen.getByText('[ACHIEVEMENTS]')).toBeInTheDocument();
    });

    it('does not fetch when no userId', () => {
      render(<AchievementPanel />);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows loading message while fetching', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<AchievementPanel userId="user-123" />);
      expect(screen.getByText('Loading achievements...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('shows generic error for non-Error throws', async () => {
      mockFetch.mockRejectedValue('Something went wrong');
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });

    it('shows error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch achievements')).toBeInTheDocument();
      });
    });
  });

  describe('success state', () => {
    const mockSuccessResponse = {
      success: true,
      data: {
        unlocked: [unlockedAchievement],
        inProgress: [inProgressAchievement],
        unlockedCount: 5,
        totalCount: 20,
        achievementScore: 150,
      },
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResponse),
      });
    });

    it('fetches achievements with correct URL', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/leaderboard/achievements/user/user-123')
        );
      });
    });

    it('renders achievement summary', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('[ACHIEVEMENT PROGRESS]')).toBeInTheDocument();
      });
    });

    it('displays correct unlocked count in summary', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('displays correct total count in summary', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('20')).toBeInTheDocument();
      });
    });

    it('displays achievement score in summary', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });

    it('renders category filter section', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('[FILTER BY CATEGORY]')).toBeInTheDocument();
      });
    });

    it('renders ALL filter button', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('ALL')).toBeInTheDocument();
      });
    });

    it('renders achievements from response', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Streak Master')).toBeInTheDocument();
      });
    });

    it('renders in-progress achievements', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Volume Trader')).toBeInTheDocument();
      });
    });

    it('allows category filtering', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Streak Master')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('📊 VOLUME'));
      expect(screen.getByText('Volume Trader')).toBeInTheDocument();
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument();
    });

    it('shows all achievements when ALL filter selected', async () => {
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('Streak Master')).toBeInTheDocument();
      });

      // First filter to VOLUME
      fireEvent.click(screen.getByText('📊 VOLUME'));
      expect(screen.queryByText('Streak Master')).not.toBeInTheDocument();

      // Then back to ALL
      fireEvent.click(screen.getByText('ALL'));
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
      expect(screen.getByText('Volume Trader')).toBeInTheDocument();
    });
  });

  describe('API response handling', () => {
    it('handles response with no unlocked achievements', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              unlocked: [],
              inProgress: [inProgressAchievement],
              unlockedCount: 0,
              totalCount: 10,
              achievementScore: 0,
            },
          }),
      });
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.queryByText('[UNLOCKED]')).not.toBeInTheDocument();
      });
    });

    it('handles response with no in-progress achievements', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              unlocked: [unlockedAchievement],
              inProgress: [],
              unlockedCount: 1,
              totalCount: 10,
              achievementScore: 50,
            },
          }),
      });
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.queryByText('[IN PROGRESS]')).not.toBeInTheDocument();
      });
    });

    it('handles response with empty achievements', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              unlocked: [],
              inProgress: [],
              unlockedCount: 0,
              totalCount: 0,
              achievementScore: 0,
            },
          }),
      });
      render(<AchievementPanel userId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('[ACHIEVEMENT PROGRESS]')).toBeInTheDocument();
      });
    });
  });
});

// =============================================================================
// Progress Bar Tests (tested via AchievementCard)
// =============================================================================

describe('ProgressBar (via AchievementCard)', () => {
  it('shows correct progress fraction', () => {
    const achievement = createAchievement({ progress: 3, maxProgress: 10 });
    render(<AchievementCard achievement={achievement} />);
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('handles 0 progress', () => {
    const achievement = createAchievement({ progress: 0, maxProgress: 5 });
    render(<AchievementCard achievement={achievement} />);
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('handles max progress', () => {
    const achievement = createAchievement({
      progress: 100,
      maxProgress: 100,
      unlockedAt: null, // Still locked to show progress bar
    });
    render(<AchievementCard achievement={achievement} />);
    expect(screen.getByText('100/100')).toBeInTheDocument();
  });

  it('handles progress exceeding max (capped at 100%)', () => {
    const achievement = createAchievement({
      progress: 150,
      maxProgress: 100,
      unlockedAt: null,
    });
    render(<AchievementCard achievement={achievement} />);
    expect(screen.getByText('150/100')).toBeInTheDocument();
  });
});

// =============================================================================
// Tier Styling Tests
// =============================================================================

describe('Tier Styling', () => {
  it('applies BRONZE color class', () => {
    const achievement = createAchievement({ tier: 'BRONZE', unlockedAt: new Date() });
    render(<AchievementCard achievement={achievement} />);
    const badge = screen.getByText('[B]');
    expect(badge).toHaveClass('text-amber-600');
  });

  it('applies SILVER color class', () => {
    const achievement = createAchievement({ tier: 'SILVER', unlockedAt: new Date() });
    render(<AchievementCard achievement={achievement} />);
    const badge = screen.getByText('[S]');
    expect(badge).toHaveClass('text-gray-300');
  });

  it('applies GOLD color class', () => {
    const achievement = createAchievement({ tier: 'GOLD', unlockedAt: new Date() });
    render(<AchievementCard achievement={achievement} />);
    const badge = screen.getByText('[G]');
    expect(badge).toHaveClass('text-yellow-400');
  });

  it('applies PLATINUM color class', () => {
    const achievement = createAchievement({ tier: 'PLATINUM', unlockedAt: new Date() });
    render(<AchievementCard achievement={achievement} />);
    const badge = screen.getByText('[P]');
    expect(badge).toHaveClass('text-blue-200');
  });

  it('applies DIAMOND color class', () => {
    const achievement = createAchievement({ tier: 'DIAMOND', unlockedAt: new Date() });
    render(<AchievementCard achievement={achievement} />);
    const badge = screen.getByText('[D]');
    expect(badge).toHaveClass('text-cyan-300');
  });
});
