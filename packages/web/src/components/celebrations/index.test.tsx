/**
 * Celebrations Component Tests
 *
 * Tests for celebration animations:
 * - ScreenFlash
 * - AsciiFireworks
 * - TierConfetti
 * - RisingEmojis
 * - CelebrationOrchestrator
 * - useCelebrationSequence hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import {
  ScreenFlash,
  AsciiFireworks,
  TierConfetti,
  RisingEmojis,
  CelebrationOrchestrator,
  useCelebrationSequence,
  type SuperforecasterTier,
} from './index';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// =============================================================================
// Tests
// =============================================================================

describe('ScreenFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when not active', () => {
      render(<ScreenFlash active={false} />);
      expect(screen.queryByTestId('screen-flash')).not.toBeInTheDocument();
    });

    it('renders when active', () => {
      render(<ScreenFlash active={true} />);
      expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
    });

    it('displays tier data attribute', () => {
      render(<ScreenFlash active={true} tier="MASTER" />);
      expect(screen.getByTestId('screen-flash')).toHaveAttribute('data-tier', 'MASTER');
    });

    it('defaults to JOURNEYMAN tier', () => {
      render(<ScreenFlash active={true} />);
      expect(screen.getByTestId('screen-flash')).toHaveAttribute('data-tier', 'JOURNEYMAN');
    });
  });

  describe('callbacks', () => {
    it('calls onComplete after duration', () => {
      const onComplete = vi.fn();
      render(<ScreenFlash active={true} duration={300} onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('respects custom duration', () => {
      const onComplete = vi.fn();
      render(<ScreenFlash active={true} duration={500} onComplete={onComplete} />);

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('has fixed positioning', () => {
      render(<ScreenFlash active={true} />);
      expect(screen.getByTestId('screen-flash')).toHaveClass('fixed');
    });

    it('has pointer-events-none', () => {
      render(<ScreenFlash active={true} />);
      expect(screen.getByTestId('screen-flash')).toHaveClass('pointer-events-none');
    });

    it('has high z-index', () => {
      render(<ScreenFlash active={true} />);
      expect(screen.getByTestId('screen-flash')).toHaveClass('z-[100]');
    });
  });
});

describe('AsciiFireworks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when not active', () => {
      render(<AsciiFireworks active={false} />);
      expect(screen.queryByTestId('ascii-fireworks')).not.toBeInTheDocument();
    });

    it('renders when active', () => {
      render(<AsciiFireworks active={true} />);
      expect(screen.getByTestId('ascii-fireworks')).toBeInTheDocument();
    });

    it('renders burst containers', () => {
      render(<AsciiFireworks active={true} burstCount={3} />);
      const bursts = screen.getAllByTestId('firework-burst');
      expect(bursts.length).toBe(3);
    });

    it('renders particles for each burst', () => {
      render(<AsciiFireworks active={true} burstCount={1} />);
      const particles = screen.getAllByTestId('firework-particle');
      expect(particles.length).toBe(12); // Default 12 particles per burst
    });
  });

  describe('callbacks', () => {
    it('calls onComplete after duration', () => {
      const onComplete = vi.fn();
      render(<AsciiFireworks active={true} duration={2000} onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('clears bursts when deactivated', () => {
      const { rerender } = render(<AsciiFireworks active={true} burstCount={3} />);
      expect(screen.getAllByTestId('firework-burst').length).toBe(3);

      rerender(<AsciiFireworks active={false} burstCount={3} />);
      expect(screen.queryAllByTestId('firework-burst').length).toBe(0);
    });
  });

  describe('styling', () => {
    it('has fixed positioning', () => {
      render(<AsciiFireworks active={true} />);
      expect(screen.getByTestId('ascii-fireworks')).toHaveClass('fixed');
    });

    it('has overflow hidden', () => {
      render(<AsciiFireworks active={true} />);
      expect(screen.getByTestId('ascii-fireworks')).toHaveClass('overflow-hidden');
    });
  });
});

describe('TierConfetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when not active', () => {
      render(<TierConfetti active={false} tier="JOURNEYMAN" />);
      expect(screen.queryByTestId('tier-confetti')).not.toBeInTheDocument();
    });

    it('renders when active', () => {
      render(<TierConfetti active={true} tier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-confetti')).toBeInTheDocument();
    });

    it('displays tier data attribute', () => {
      render(<TierConfetti active={true} tier="EXPERT" />);
      expect(screen.getByTestId('tier-confetti')).toHaveAttribute('data-tier', 'EXPERT');
    });

    it('renders correct number of particles', () => {
      render(<TierConfetti active={true} tier="JOURNEYMAN" particleCount={10} />);
      const particles = screen.getAllByTestId('tier-confetti-particle');
      expect(particles.length).toBe(10);
    });

    it('respects default particle count', () => {
      render(<TierConfetti active={true} tier="JOURNEYMAN" />);
      const particles = screen.getAllByTestId('tier-confetti-particle');
      expect(particles.length).toBe(60); // Default
    });
  });

  describe('tier variations', () => {
    const tiers: SuperforecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

    tiers.forEach((tier) => {
      it(`renders for ${tier} tier`, () => {
        render(<TierConfetti active={true} tier={tier} />);
        expect(screen.getByTestId('tier-confetti')).toHaveAttribute('data-tier', tier);
      });
    });
  });

  describe('callbacks', () => {
    it('calls onComplete after duration', () => {
      const onComplete = vi.fn();
      render(<TierConfetti active={true} tier="JOURNEYMAN" duration={3000} onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('has z-index 80', () => {
      render(<TierConfetti active={true} tier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-confetti')).toHaveClass('z-[80]');
    });
  });
});

describe('RisingEmojis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when not active', () => {
      render(<RisingEmojis active={false} tier="MASTER" />);
      expect(screen.queryByTestId('rising-emojis-container')).not.toBeInTheDocument();
    });

    it('renders when active', () => {
      render(<RisingEmojis active={true} tier="MASTER" />);
      expect(screen.getByTestId('rising-emojis-container')).toBeInTheDocument();
    });

    it('renders correct number of emojis', () => {
      render(<RisingEmojis active={true} tier="MASTER" count={5} />);
      const emojis = screen.getAllByTestId('rising-emoji');
      expect(emojis.length).toBe(5);
    });

    it('uses tier emoji', () => {
      render(<RisingEmojis active={true} tier="MASTER" count={1} />);
      const emoji = screen.getByTestId('rising-emoji');
      expect(emoji.textContent).toBe('🧠'); // MASTER emoji
    });
  });

  describe('tier emojis', () => {
    it('renders APPRENTICE emoji', () => {
      render(<RisingEmojis active={true} tier="APPRENTICE" count={1} />);
      expect(screen.getByTestId('rising-emoji').textContent).toBe('🌱');
    });

    it('renders JOURNEYMAN emoji', () => {
      render(<RisingEmojis active={true} tier="JOURNEYMAN" count={1} />);
      expect(screen.getByTestId('rising-emoji').textContent).toBe('🎯');
    });

    it('renders EXPERT emoji', () => {
      render(<RisingEmojis active={true} tier="EXPERT" count={1} />);
      expect(screen.getByTestId('rising-emoji').textContent).toBe('🔮');
    });

    it('renders GRANDMASTER emoji', () => {
      render(<RisingEmojis active={true} tier="GRANDMASTER" count={1} />);
      expect(screen.getByTestId('rising-emoji').textContent).toBe('👁️');
    });
  });

  describe('callbacks', () => {
    it('calls onComplete after duration', () => {
      const onComplete = vi.fn();
      render(<RisingEmojis active={true} tier="MASTER" duration={2500} onComplete={onComplete} />);

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CelebrationOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders nothing when not active', () => {
      render(<CelebrationOrchestrator active={false} tier="JOURNEYMAN" />);
      expect(screen.queryByTestId('celebration-orchestrator')).not.toBeInTheDocument();
    });

    it('renders when active', () => {
      render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);
      expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
    });

    it('displays intensity based on tier', () => {
      render(<CelebrationOrchestrator active={true} tier="MASTER" />);
      expect(screen.getByTestId('celebration-orchestrator')).toHaveAttribute('data-intensity', 'high');
    });
  });

  describe('tier intensity', () => {
    it('APPRENTICE has low intensity', () => {
      render(<CelebrationOrchestrator active={true} tier="APPRENTICE" />);
      expect(screen.getByTestId('celebration-orchestrator')).toHaveAttribute('data-intensity', 'low');
    });

    it('JOURNEYMAN has medium intensity', () => {
      render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);
      expect(screen.getByTestId('celebration-orchestrator')).toHaveAttribute('data-intensity', 'medium');
    });

    it('GRANDMASTER has max intensity', () => {
      render(<CelebrationOrchestrator active={true} tier="GRANDMASTER" />);
      expect(screen.getByTestId('celebration-orchestrator')).toHaveAttribute('data-intensity', 'max');
    });
  });

  describe('child components', () => {
    it('renders screen flash on activation', () => {
      render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);
      expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
    });

    it('renders confetti after delay', () => {
      render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByTestId('tier-confetti')).toBeInTheDocument();
    });

    it('renders fireworks for EXPERT tier', () => {
      render(<CelebrationOrchestrator active={true} tier="EXPERT" />);

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByTestId('ascii-fireworks')).toBeInTheDocument();
    });

    it('renders rising emojis for MASTER tier', () => {
      render(<CelebrationOrchestrator active={true} tier="MASTER" />);

      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('rising-emojis-container')).toBeInTheDocument();
    });

    it('does not render fireworks for APPRENTICE tier', () => {
      render(<CelebrationOrchestrator active={true} tier="APPRENTICE" />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByTestId('ascii-fireworks')).not.toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onComplete after celebration ends', () => {
      const onComplete = vi.fn();
      render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" onComplete={onComplete} />);

      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('resets state when deactivated', () => {
      const { rerender } = render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByTestId('tier-confetti')).toBeInTheDocument();

      rerender(<CelebrationOrchestrator active={false} tier="JOURNEYMAN" />);
      expect(screen.queryByTestId('celebration-orchestrator')).not.toBeInTheDocument();
    });
  });
});

describe('useCelebrationSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useCelebrationSequence());

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentPhase).toBe('idle');
    expect(result.current.currentTier).toBeNull();
  });

  it('starts celebration with tier', () => {
    const { result } = renderHook(() => useCelebrationSequence());

    act(() => {
      result.current.start('EXPERT');
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentPhase).toBe('flash');
    expect(result.current.currentTier).toBe('EXPERT');
  });

  it('progresses through phases', () => {
    const { result } = renderHook(() => useCelebrationSequence());

    act(() => {
      result.current.start('MASTER');
    });
    expect(result.current.currentPhase).toBe('flash');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.currentPhase).toBe('confetti');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.currentPhase).toBe('fireworks');

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(result.current.currentPhase).toBe('emojis');
  });

  it('completes and resets after sequence', () => {
    const { result } = renderHook(() => useCelebrationSequence());

    act(() => {
      result.current.start('JOURNEYMAN');
    });

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(result.current.currentPhase).toBe('complete');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentPhase).toBe('idle');
    expect(result.current.currentTier).toBeNull();
  });

  it('can be stopped manually', () => {
    const { result } = renderHook(() => useCelebrationSequence());

    act(() => {
      result.current.start('EXPERT');
    });
    expect(result.current.isActive).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.currentPhase).toBe('idle');
    expect(result.current.currentTier).toBeNull();
  });
});
