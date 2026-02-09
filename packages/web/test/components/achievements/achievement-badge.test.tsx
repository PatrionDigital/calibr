/**
 * AchievementBadge Component Tests
 * Tests for compact badge display of achievements
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementBadge } from '@/components/achievements/achievement-badge';
import type { Achievement } from '@/components/achievements/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'test-achievement-1',
  name: 'First Forecast',
  description: 'Make your first forecast',
  category: 'STREAK',
  tier: 'BRONZE',
  unlockedAt: null,
  progress: 0,
  maxProgress: 1,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('AchievementBadge', () => {
  describe('rendering', () => {
    it('renders the achievement badge', () => {
      render(<AchievementBadge achievement={createAchievement()} />);
      expect(screen.getByTestId('achievement-badge')).toBeDefined();
    });

    it('displays the achievement name', () => {
      render(<AchievementBadge achievement={createAchievement({ name: 'Test Achievement' })} />);
      expect(screen.getByText('Test Achievement')).toBeDefined();
    });

    it('displays the tier label', () => {
      render(<AchievementBadge achievement={createAchievement({ tier: 'GOLD' })} />);
      expect(screen.getByText('GOLD')).toBeDefined();
    });

    it('sets data-tier attribute', () => {
      render(<AchievementBadge achievement={createAchievement({ tier: 'PLATINUM' })} />);
      const badge = screen.getByTestId('achievement-badge');
      expect(badge.getAttribute('data-tier')).toBe('PLATINUM');
    });
  });

  describe('locked state', () => {
    it('shows lock icon when not unlocked', () => {
      render(<AchievementBadge achievement={createAchievement({ unlockedAt: null })} />);
      expect(screen.getByTestId('achievement-locked')).toBeDefined();
      expect(screen.queryByTestId('achievement-unlocked')).toBeNull();
    });

    it('shows checkmark when unlocked', () => {
      render(<AchievementBadge achievement={createAchievement({ unlockedAt: new Date() })} />);
      expect(screen.getByTestId('achievement-unlocked')).toBeDefined();
      expect(screen.queryByTestId('achievement-locked')).toBeNull();
    });
  });

  describe('category icon', () => {
    it('does not show category icon by default', () => {
      render(<AchievementBadge achievement={createAchievement()} />);
      expect(screen.queryByTestId('achievement-category-icon')).toBeNull();
    });

    it('shows category icon when showCategory is true', () => {
      render(<AchievementBadge achievement={createAchievement()} showCategory />);
      expect(screen.getByTestId('achievement-category-icon')).toBeDefined();
    });

    it('shows streak icon for STREAK category', () => {
      render(<AchievementBadge achievement={createAchievement({ category: 'STREAK' })} showCategory />);
      expect(screen.getByTestId('achievement-category-icon').textContent).toBe('🔥');
    });

    it('shows volume icon for VOLUME category', () => {
      render(<AchievementBadge achievement={createAchievement({ category: 'VOLUME' })} showCategory />);
      expect(screen.getByTestId('achievement-category-icon').textContent).toBe('📊');
    });

    it('shows accuracy icon for ACCURACY category', () => {
      render(<AchievementBadge achievement={createAchievement({ category: 'ACCURACY' })} showCategory />);
      expect(screen.getByTestId('achievement-category-icon').textContent).toBe('🎯');
    });

    it('shows calibration icon for CALIBRATION category', () => {
      render(<AchievementBadge achievement={createAchievement({ category: 'CALIBRATION' })} showCategory />);
      expect(screen.getByTestId('achievement-category-icon').textContent).toBe('⚖️');
    });

    it('shows special icon for SPECIAL category', () => {
      render(<AchievementBadge achievement={createAchievement({ category: 'SPECIAL' })} showCategory />);
      expect(screen.getByTestId('achievement-category-icon').textContent).toBe('⭐');
    });
  });

  describe('compact mode', () => {
    it('applies compact class when compact is true', () => {
      render(<AchievementBadge achievement={createAchievement()} compact />);
      const badge = screen.getByTestId('achievement-badge');
      expect(badge.classList.contains('compact')).toBe(true);
    });

    it('does not apply compact class by default', () => {
      render(<AchievementBadge achievement={createAchievement()} />);
      const badge = screen.getByTestId('achievement-badge');
      expect(badge.classList.contains('compact')).toBe(false);
    });
  });

  describe('tier styling', () => {
    it.each([
      ['BRONZE', 'text-amber-600'],
      ['SILVER', 'text-gray-400'],
      ['GOLD', 'text-yellow-500'],
      ['PLATINUM', 'text-slate-300'],
      ['DIAMOND', 'text-cyan-400'],
    ] as const)('applies correct color for %s tier', (tier, expectedClass) => {
      render(<AchievementBadge achievement={createAchievement({ tier })} />);
      const badge = screen.getByText(tier);
      expect(badge.classList.contains(expectedClass)).toBe(true);
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<AchievementBadge achievement={createAchievement()} className="custom-class" />);
      const badge = screen.getByTestId('achievement-badge');
      expect(badge.classList.contains('custom-class')).toBe(true);
    });
  });
});
