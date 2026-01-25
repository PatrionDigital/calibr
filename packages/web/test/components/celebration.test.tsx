/**
 * Celebration Component Tests
 * Tests for confetti, tier promotion modal, and achievement toast
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Confetti, TierPromotionModal, AchievementToast } from '@/components/celebration';

describe('Confetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders particles when active', () => {
    render(<Confetti active={true} />);
    const particles = screen.getAllByTestId('confetti-particle');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('does not render when inactive', () => {
    render(<Confetti active={false} />);
    expect(screen.queryByTestId('confetti-particle')).toBeNull();
  });

  it('uses ASCII characters for particles', () => {
    render(<Confetti active={true} />);
    const particles = screen.getAllByTestId('confetti-particle');
    const asciiChars = ['*', '+', '·', '░', '▒', '▓', '█', '■', '□', '▪', '▫'];
    particles.forEach(particle => {
      const text = particle.textContent || '';
      expect(asciiChars.some(char => text.includes(char))).toBe(true);
    });
  });

  it('cleans up after duration', async () => {
    const onComplete = vi.fn();
    render(<Confetti active={true} duration={1000} onComplete={onComplete} />);
    expect(screen.getAllByTestId('confetti-particle').length).toBeGreaterThan(0);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('accepts custom particle count', () => {
    render(<Confetti active={true} particleCount={10} />);
    const particles = screen.getAllByTestId('confetti-particle');
    expect(particles).toHaveLength(10);
  });
});

describe('TierPromotionModal', () => {
  const defaultProps = {
    isOpen: true,
    previousTier: 'APPRENTICE' as const,
    newTier: 'JOURNEYMAN' as const,
    onClose: vi.fn(),
  };

  it('renders when open', () => {
    render(<TierPromotionModal {...defaultProps} />);
    expect(screen.getByText(/TIER PROMOTION/i)).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<TierPromotionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/TIER PROMOTION/i)).toBeNull();
  });

  it('displays previous and new tier', () => {
    render(<TierPromotionModal {...defaultProps} />);
    expect(screen.getByText(/APPRENTICE/i)).toBeDefined();
    expect(screen.getByText(/JOURNEYMAN/i)).toBeDefined();
  });

  it('shows tier emoji badges', () => {
    render(<TierPromotionModal {...defaultProps} />);
    expect(screen.getByText('🎯')).toBeDefined();
  });

  it('shows tier benefits', () => {
    render(<TierPromotionModal {...defaultProps} />);
    expect(screen.getByText(/NEW BENEFITS/i)).toBeDefined();
  });

  it('calls onClose when dismiss button clicked', () => {
    const onClose = vi.fn();
    render(<TierPromotionModal {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers confetti animation', () => {
    render(<TierPromotionModal {...defaultProps} />);
    expect(screen.getAllByTestId('confetti-particle').length).toBeGreaterThan(0);
  });
});

describe('AchievementToast', () => {
  const defaultProps = {
    achievement: {
      id: 'test-achievement',
      name: 'First Forecast',
      description: 'Make your first forecast',
      category: 'ACCURACY' as const,
      tier: 'BRONZE' as const,
    },
    isVisible: true,
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when visible', () => {
    render(<AchievementToast {...defaultProps} />);
    expect(screen.getByText(/ACHIEVEMENT UNLOCKED/i)).toBeDefined();
    expect(screen.getByText('First Forecast')).toBeDefined();
  });

  it('does not render when not visible', () => {
    render(<AchievementToast {...defaultProps} isVisible={false} />);
    expect(screen.queryByText(/ACHIEVEMENT UNLOCKED/i)).toBeNull();
  });

  it('shows category icon', () => {
    render(<AchievementToast {...defaultProps} />);
    expect(screen.getByText('🎯')).toBeDefined();
  });

  it('shows tier badge', () => {
    render(<AchievementToast {...defaultProps} />);
    expect(screen.getByText('[B]')).toBeDefined();
  });

  it('auto-dismisses after duration', () => {
    const onDismiss = vi.fn();
    render(<AchievementToast {...defaultProps} onDismiss={onDismiss} duration={3000} />);
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('can be manually dismissed', () => {
    const onDismiss = vi.fn();
    render(<AchievementToast {...defaultProps} onDismiss={onDismiss} />);
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });
});
