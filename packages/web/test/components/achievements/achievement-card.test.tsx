/**
 * AchievementCard Component Tests
 * Tests for full achievement card display with progress
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementCard } from '@/components/achievements/achievement-card';
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
  maxProgress: 10,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('AchievementCard', () => {
  describe('rendering', () => {
    it('renders the achievement card', () => {
      render(<AchievementCard achievement={createAchievement()} />);
      expect(screen.getByTestId('achievement-card')).toBeDefined();
    });

    it('displays the achievement name', () => {
      render(<AchievementCard achievement={createAchievement({ name: 'Test Achievement' })} />);
      expect(screen.getByText('Test Achievement')).toBeDefined();
    });

    it('displays the achievement description', () => {
      render(<AchievementCard achievement={createAchievement({ description: 'Test description here' })} />);
      expect(screen.getByText('Test description here')).toBeDefined();
    });

    it('displays the tier badge', () => {
      render(<AchievementCard achievement={createAchievement({ tier: 'GOLD' })} />);
      expect(screen.getByText('GOLD')).toBeDefined();
    });
  });

  describe('category labels', () => {
    it('displays Consistency label for STREAK category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'STREAK' })} />);
      expect(screen.getByText('Consistency')).toBeDefined();
    });

    it('displays Volume label for VOLUME category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'VOLUME' })} />);
      expect(screen.getByText('Volume')).toBeDefined();
    });

    it('displays Accuracy label for ACCURACY category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'ACCURACY' })} />);
      expect(screen.getByText('Accuracy')).toBeDefined();
    });

    it('displays Calibration label for CALIBRATION category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'CALIBRATION' })} />);
      expect(screen.getByText('Calibration')).toBeDefined();
    });

    it('displays Special label for SPECIAL category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'SPECIAL' })} />);
      expect(screen.getByText('Special')).toBeDefined();
    });
  });

  describe('locked state', () => {
    it('sets data-locked to true when not unlocked', () => {
      render(<AchievementCard achievement={createAchievement({ unlockedAt: null })} />);
      const card = screen.getByTestId('achievement-card');
      expect(card.getAttribute('data-locked')).toBe('true');
    });

    it('sets data-locked to false when unlocked', () => {
      render(<AchievementCard achievement={createAchievement({ unlockedAt: new Date() })} />);
      const card = screen.getByTestId('achievement-card');
      expect(card.getAttribute('data-locked')).toBe('false');
    });

    it('applies opacity when locked', () => {
      render(<AchievementCard achievement={createAchievement({ unlockedAt: null })} />);
      const card = screen.getByTestId('achievement-card');
      expect(card.classList.contains('opacity-70')).toBe(true);
    });
  });

  describe('unlocked state', () => {
    it('shows unlocked message when achievement is unlocked', () => {
      render(<AchievementCard achievement={createAchievement({ unlockedAt: new Date('2024-01-15') })} />);
      expect(screen.getByText('✓ Unlocked')).toBeDefined();
    });

    it('displays unlock date', () => {
      const unlockDate = new Date('2024-01-15');
      render(<AchievementCard achievement={createAchievement({ unlockedAt: unlockDate })} />);
      expect(screen.getByText(unlockDate.toLocaleDateString())).toBeDefined();
    });

    it('does not show progress when unlocked', () => {
      render(<AchievementCard achievement={createAchievement({ unlockedAt: new Date(), progress: 5 })} />);
      expect(screen.queryByTestId('achievement-card-progress')).toBeNull();
    });
  });

  describe('in-progress state', () => {
    it('shows progress when in progress (not unlocked, has progress)', () => {
      render(<AchievementCard achievement={createAchievement({ progress: 5, maxProgress: 10 })} />);
      expect(screen.getByTestId('achievement-card-progress')).toBeDefined();
    });

    it('displays percentage', () => {
      render(<AchievementCard achievement={createAchievement({ progress: 5, maxProgress: 10 })} />);
      expect(screen.getByText('50%')).toBeDefined();
    });

    it('shows Progress label', () => {
      render(<AchievementCard achievement={createAchievement({ progress: 3, maxProgress: 10 })} />);
      expect(screen.getByText('Progress')).toBeDefined();
    });

    it('does not show progress when progress is 0', () => {
      render(<AchievementCard achievement={createAchievement({ progress: 0, maxProgress: 10 })} />);
      expect(screen.queryByTestId('achievement-card-progress')).toBeNull();
    });

    it('renders AchievementProgress component', () => {
      render(<AchievementCard achievement={createAchievement({ progress: 5, maxProgress: 10 })} />);
      expect(screen.getByTestId('achievement-progress')).toBeDefined();
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
      render(<AchievementCard achievement={createAchievement({ tier })} />);
      const tierBadge = screen.getByText(tier);
      expect(tierBadge.classList.contains(expectedClass)).toBe(true);
    });
  });

  describe('category icons', () => {
    it('shows streak icon for STREAK category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'STREAK' })} />);
      expect(screen.getByText('🔥')).toBeDefined();
    });

    it('shows volume icon for VOLUME category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'VOLUME' })} />);
      expect(screen.getByText('📊')).toBeDefined();
    });

    it('shows accuracy icon for ACCURACY category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'ACCURACY' })} />);
      expect(screen.getByText('🎯')).toBeDefined();
    });

    it('shows calibration icon for CALIBRATION category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'CALIBRATION' })} />);
      expect(screen.getByText('⚖️')).toBeDefined();
    });

    it('shows special icon for SPECIAL category', () => {
      render(<AchievementCard achievement={createAchievement({ category: 'SPECIAL' })} />);
      expect(screen.getByText('⭐')).toBeDefined();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<AchievementCard achievement={createAchievement()} className="custom-class" />);
      const card = screen.getByTestId('achievement-card');
      expect(card.classList.contains('custom-class')).toBe(true);
    });
  });
});
