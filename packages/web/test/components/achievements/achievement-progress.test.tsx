/**
 * AchievementProgress Component Tests
 * Tests for progress bar display with tier colors
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementProgress } from '@/components/achievements/achievement-progress';

// =============================================================================
// Tests
// =============================================================================

describe('AchievementProgress', () => {
  describe('rendering', () => {
    it('renders the progress component', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      expect(screen.getByTestId('achievement-progress')).toBeDefined();
    });

    it('renders the progress bar', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      expect(screen.getByTestId('achievement-progress-bar')).toBeDefined();
    });

    it('renders the progress fill', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      expect(screen.getByTestId('progress-fill')).toBeDefined();
    });
  });

  describe('progress calculation', () => {
    it('sets correct width percentage', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('50%');
    });

    it('handles 0 progress', () => {
      render(<AchievementProgress progress={0} maxProgress={10} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('0%');
    });

    it('handles 100% progress', () => {
      render(<AchievementProgress progress={10} maxProgress={10} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('100%');
    });

    it('caps progress at 100%', () => {
      render(<AchievementProgress progress={15} maxProgress={10} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.style.width).toBe('100%');
    });

    it('handles fractional progress', () => {
      render(<AchievementProgress progress={1} maxProgress={3} />);
      const fill = screen.getByTestId('progress-fill');
      // 1/3 = 33.333...%
      expect(fill.style.width).toMatch(/33\.3+%/);
    });
  });

  describe('display mode', () => {
    it('shows fraction by default', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      expect(screen.getByText('5 / 10')).toBeDefined();
    });

    it('shows fraction when displayMode is fraction', () => {
      render(<AchievementProgress progress={5} maxProgress={10} displayMode="fraction" />);
      expect(screen.getByText('5 / 10')).toBeDefined();
    });

    it('shows percentage when displayMode is percentage', () => {
      render(<AchievementProgress progress={5} maxProgress={10} displayMode="percentage" />);
      expect(screen.getByText('50%')).toBeDefined();
    });

    it('rounds percentage display', () => {
      render(<AchievementProgress progress={1} maxProgress={3} displayMode="percentage" />);
      expect(screen.getByText('33%')).toBeDefined();
    });
  });

  describe('complete state', () => {
    it('sets data-complete to true when progress equals maxProgress', () => {
      render(<AchievementProgress progress={10} maxProgress={10} />);
      const progress = screen.getByTestId('achievement-progress');
      expect(progress.getAttribute('data-complete')).toBe('true');
    });

    it('sets data-complete to true when progress exceeds maxProgress', () => {
      render(<AchievementProgress progress={15} maxProgress={10} />);
      const progress = screen.getByTestId('achievement-progress');
      expect(progress.getAttribute('data-complete')).toBe('true');
    });

    it('sets data-complete to false when not complete', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      const progress = screen.getByTestId('achievement-progress');
      expect(progress.getAttribute('data-complete')).toBe('false');
    });
  });

  describe('tier colors', () => {
    it('uses primary color when no tier specified', () => {
      render(<AchievementProgress progress={5} maxProgress={10} />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-[hsl(var(--primary))]')).toBe(true);
    });

    it('applies BRONZE tier color', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="BRONZE" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-amber-600')).toBe(true);
    });

    it('applies SILVER tier color', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="SILVER" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-gray-400')).toBe(true);
    });

    it('applies GOLD tier color', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="GOLD" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-yellow-500')).toBe(true);
    });

    it('applies PLATINUM tier color', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="PLATINUM" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-slate-300')).toBe(true);
    });

    it('applies DIAMOND tier color', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="DIAMOND" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.classList.contains('bg-cyan-400')).toBe(true);
    });

    it('sets data-tier attribute when tier provided', () => {
      render(<AchievementProgress progress={5} maxProgress={10} tier="GOLD" />);
      const fill = screen.getByTestId('progress-fill');
      expect(fill.getAttribute('data-tier')).toBe('GOLD');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<AchievementProgress progress={5} maxProgress={10} className="custom-class" />);
      const progress = screen.getByTestId('achievement-progress');
      expect(progress.classList.contains('custom-class')).toBe(true);
    });
  });
});
