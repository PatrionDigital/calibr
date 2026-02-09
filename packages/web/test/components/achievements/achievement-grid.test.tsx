/**
 * AchievementGrid Component Tests
 * Tests for grid display of achievements with filtering
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementGrid } from '@/components/achievements/achievement-grid';
import type { Achievement, AchievementCategory } from '@/components/achievements/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: `achievement-${Math.random().toString(36).slice(2)}`,
  name: 'Test Achievement',
  description: 'Test description',
  category: 'STREAK',
  tier: 'BRONZE',
  unlockedAt: null,
  progress: 0,
  maxProgress: 10,
  ...overrides,
});

const createAchievements = (count: number, overrides: Partial<Achievement> = {}): Achievement[] =>
  Array.from({ length: count }, (_, i) => createAchievement({ id: `achievement-${i}`, ...overrides }));

// =============================================================================
// Tests
// =============================================================================

describe('AchievementGrid', () => {
  describe('rendering', () => {
    it('renders the achievement grid', () => {
      render(<AchievementGrid achievements={createAchievements(3)} />);
      expect(screen.getByTestId('achievement-grid')).toBeDefined();
    });

    it('renders achievement cards', () => {
      render(<AchievementGrid achievements={createAchievements(3)} />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(3);
    });

    it('displays header with title', () => {
      render(<AchievementGrid achievements={createAchievements(3)} />);
      expect(screen.getByText('[ACHIEVEMENTS]')).toBeDefined();
    });

    it('displays count of unlocked achievements', () => {
      const achievements = [
        createAchievement({ id: '1', unlockedAt: new Date() }),
        createAchievement({ id: '2', unlockedAt: null }),
        createAchievement({ id: '3', unlockedAt: new Date() }),
      ];
      render(<AchievementGrid achievements={achievements} />);
      expect(screen.getByText('2 of 3 unlocked')).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      render(<AchievementGrid achievements={[]} isLoading />);
      expect(screen.getByTestId('achievement-grid-skeleton')).toBeDefined();
    });

    it('does not render achievements when loading', () => {
      render(<AchievementGrid achievements={createAchievements(3)} isLoading />);
      expect(screen.queryByTestId('achievement-grid')).toBeNull();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no achievements', () => {
      render(<AchievementGrid achievements={[]} />);
      expect(screen.getByText('No achievements found')).toBeDefined();
    });

    it('shows trophy icon in empty state', () => {
      render(<AchievementGrid achievements={[]} />);
      expect(screen.getByText('🏆')).toBeDefined();
    });

    it('shows appropriate message when filtering unlocked only', () => {
      render(<AchievementGrid achievements={[]} showUnlockedOnly />);
      expect(screen.getByText('No achievements unlocked')).toBeDefined();
    });
  });

  describe('category filtering', () => {
    it('filters achievements by category', () => {
      const achievements = [
        createAchievement({ id: '1', category: 'STREAK' }),
        createAchievement({ id: '2', category: 'VOLUME' }),
        createAchievement({ id: '3', category: 'STREAK' }),
      ];
      render(<AchievementGrid achievements={achievements} filterCategory="STREAK" />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(2);
    });

    it('supports deprecated category prop', () => {
      const achievements = [
        createAchievement({ id: '1', category: 'ACCURACY' }),
        createAchievement({ id: '2', category: 'VOLUME' }),
      ];
      render(<AchievementGrid achievements={achievements} category="ACCURACY" />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(1);
    });

    it('filterCategory takes precedence over deprecated category', () => {
      const achievements = [
        createAchievement({ id: '1', category: 'ACCURACY' }),
        createAchievement({ id: '2', category: 'VOLUME' }),
        createAchievement({ id: '3', category: 'STREAK' }),
      ];
      render(<AchievementGrid achievements={achievements} category="ACCURACY" filterCategory="VOLUME" />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(1);
    });

    it('shows empty state when no achievements match filter', () => {
      const achievements = [
        createAchievement({ id: '1', category: 'STREAK' }),
      ];
      render(<AchievementGrid achievements={achievements} filterCategory="CALIBRATION" />);
      expect(screen.getByText('No achievements found')).toBeDefined();
    });
  });

  describe('unlocked only filtering', () => {
    it('shows only unlocked achievements when showUnlockedOnly is true', () => {
      const achievements = [
        createAchievement({ id: '1', unlockedAt: new Date() }),
        createAchievement({ id: '2', unlockedAt: null }),
        createAchievement({ id: '3', unlockedAt: new Date() }),
      ];
      render(<AchievementGrid achievements={achievements} showUnlockedOnly />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(2);
    });

    it('shows all achievements when showUnlockedOnly is false', () => {
      const achievements = [
        createAchievement({ id: '1', unlockedAt: new Date() }),
        createAchievement({ id: '2', unlockedAt: null }),
      ];
      render(<AchievementGrid achievements={achievements} showUnlockedOnly={false} />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(2);
    });
  });

  describe('combined filtering', () => {
    it('filters by both category and unlocked status', () => {
      const achievements = [
        createAchievement({ id: '1', category: 'STREAK', unlockedAt: new Date() }),
        createAchievement({ id: '2', category: 'STREAK', unlockedAt: null }),
        createAchievement({ id: '3', category: 'VOLUME', unlockedAt: new Date() }),
      ];
      render(<AchievementGrid achievements={achievements} filterCategory="STREAK" showUnlockedOnly />);
      const cards = screen.getAllByTestId('achievement-card');
      expect(cards).toHaveLength(1);
    });
  });

  describe('column layout', () => {
    it('uses 2 columns by default', () => {
      render(<AchievementGrid achievements={createAchievements(3)} />);
      const grid = screen.getByTestId('achievement-grid');
      expect(grid.classList.contains('grid-cols-2')).toBe(true);
    });

    it('applies 1 column layout', () => {
      render(<AchievementGrid achievements={createAchievements(3)} columns={1} />);
      const grid = screen.getByTestId('achievement-grid');
      expect(grid.classList.contains('grid-cols-1')).toBe(true);
    });

    it('applies 3 column layout', () => {
      render(<AchievementGrid achievements={createAchievements(3)} columns={3} />);
      const grid = screen.getByTestId('achievement-grid');
      expect(grid.classList.contains('grid-cols-3')).toBe(true);
    });

    it('applies 4 column layout', () => {
      render(<AchievementGrid achievements={createAchievements(3)} columns={4} />);
      const grid = screen.getByTestId('achievement-grid');
      expect(grid.classList.contains('grid-cols-4')).toBe(true);
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <AchievementGrid achievements={createAchievements(3)} className="custom-class" />
      );
      expect((container.firstChild as HTMLElement)?.classList.contains('custom-class')).toBe(true);
    });
  });
});
