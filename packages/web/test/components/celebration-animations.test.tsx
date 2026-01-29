/**
 * Celebration Animations Tests
 * TDD tests for tier promotion celebration effects
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ScreenFlash,
  AsciiFireworks,
  TierConfetti,
  RisingEmojis,
  CelebrationOrchestrator,
  useCelebrationSequence,
} from '@/components/celebrations';
import type { SuperforecasterTier } from '@/components/celebrations';

// =============================================================================
// ScreenFlash Tests
// =============================================================================

describe('ScreenFlash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render flash overlay when active', () => {
    render(<ScreenFlash active={true} />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
  });

  it('should not render when inactive', () => {
    render(<ScreenFlash active={false} />);
    expect(screen.queryByTestId('screen-flash')).not.toBeInTheDocument();
  });

  it('should use tier-specific color for GRANDMASTER', () => {
    render(<ScreenFlash active={true} tier="GRANDMASTER" />);
    const flash = screen.getByTestId('screen-flash');
    expect(flash).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should use tier-specific color for MASTER', () => {
    render(<ScreenFlash active={true} tier="MASTER" />);
    const flash = screen.getByTestId('screen-flash');
    expect(flash).toHaveAttribute('data-tier', 'MASTER');
  });

  it('should call onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<ScreenFlash active={true} duration={500} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('should have pointer-events-none to not block interactions', () => {
    render(<ScreenFlash active={true} />);
    const flash = screen.getByTestId('screen-flash');
    expect(flash).toHaveClass('pointer-events-none');
  });
});

// =============================================================================
// AsciiFireworks Tests
// =============================================================================

describe('AsciiFireworks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render firework particles when active', () => {
    render(<AsciiFireworks active={true} />);
    const particles = screen.getAllByTestId('firework-particle');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('should not render when inactive', () => {
    render(<AsciiFireworks active={false} />);
    expect(screen.queryByTestId('firework-particle')).not.toBeInTheDocument();
  });

  it('should use ASCII characters for particles', () => {
    render(<AsciiFireworks active={true} />);
    const particles = screen.getAllByTestId('firework-particle');
    const asciiChars = ['✦', '✧', '★', '☆', '◆', '◇', '●', '○', '✶', '✴', '✵'];
    particles.forEach(particle => {
      const text = particle.textContent || '';
      expect(asciiChars.some(char => text.includes(char))).toBe(true);
    });
  });

  it('should create multiple bursts', () => {
    render(<AsciiFireworks active={true} burstCount={3} />);
    const bursts = screen.getAllByTestId('firework-burst');
    expect(bursts).toHaveLength(3);
  });

  it('should call onComplete after all bursts finish', () => {
    const onComplete = vi.fn();
    render(<AsciiFireworks active={true} duration={1000} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('should position bursts randomly across viewport', () => {
    render(<AsciiFireworks active={true} burstCount={2} />);
    const bursts = screen.getAllByTestId('firework-burst');
    // Each burst should have position styles
    bursts.forEach(burst => {
      expect(burst).toHaveStyle({ position: 'absolute' });
    });
  });
});

// =============================================================================
// TierConfetti Tests
// =============================================================================

describe('TierConfetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render confetti particles when active', () => {
    render(<TierConfetti active={true} tier="JOURNEYMAN" />);
    const particles = screen.getAllByTestId('tier-confetti-particle');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('should not render when inactive', () => {
    render(<TierConfetti active={false} tier="JOURNEYMAN" />);
    expect(screen.queryByTestId('tier-confetti-particle')).not.toBeInTheDocument();
  });

  it('should use APPRENTICE colors (green)', () => {
    render(<TierConfetti active={true} tier="APPRENTICE" />);
    const container = screen.getByTestId('tier-confetti');
    expect(container).toHaveAttribute('data-tier', 'APPRENTICE');
  });

  it('should use JOURNEYMAN colors (blue)', () => {
    render(<TierConfetti active={true} tier="JOURNEYMAN" />);
    const container = screen.getByTestId('tier-confetti');
    expect(container).toHaveAttribute('data-tier', 'JOURNEYMAN');
  });

  it('should use EXPERT colors (purple)', () => {
    render(<TierConfetti active={true} tier="EXPERT" />);
    const container = screen.getByTestId('tier-confetti');
    expect(container).toHaveAttribute('data-tier', 'EXPERT');
  });

  it('should use MASTER colors (yellow/gold)', () => {
    render(<TierConfetti active={true} tier="MASTER" />);
    const container = screen.getByTestId('tier-confetti');
    expect(container).toHaveAttribute('data-tier', 'MASTER');
  });

  it('should use GRANDMASTER colors (cyan/rainbow)', () => {
    render(<TierConfetti active={true} tier="GRANDMASTER" />);
    const container = screen.getByTestId('tier-confetti');
    expect(container).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should include tier emoji in particles for GRANDMASTER', () => {
    render(<TierConfetti active={true} tier="GRANDMASTER" includeEmoji={true} />);
    const particles = screen.getAllByTestId('tier-confetti-particle');
    const hasEmoji = particles.some(p => p.textContent === '👁️');
    expect(hasEmoji).toBe(true);
  });

  it('should call onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<TierConfetti active={true} tier="MASTER" duration={2000} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(onComplete).toHaveBeenCalled();
  });
});

// =============================================================================
// RisingEmojis Tests
// =============================================================================

describe('RisingEmojis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render rising emojis when active', () => {
    render(<RisingEmojis active={true} tier="MASTER" />);
    const emojis = screen.getAllByTestId('rising-emoji');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('should not render when inactive', () => {
    render(<RisingEmojis active={false} tier="MASTER" />);
    expect(screen.queryByTestId('rising-emoji')).not.toBeInTheDocument();
  });

  it('should use tier emoji for particles', () => {
    render(<RisingEmojis active={true} tier="GRANDMASTER" />);
    const emojis = screen.getAllByTestId('rising-emoji');
    const hasGrandmasterEmoji = emojis.some(e => e.textContent === '👁️');
    expect(hasGrandmasterEmoji).toBe(true);
  });

  it('should animate emojis rising from bottom', () => {
    render(<RisingEmojis active={true} tier="EXPERT" />);
    const container = screen.getByTestId('rising-emojis-container');
    expect(container).toHaveClass('overflow-hidden');
  });

  it('should call onComplete after duration', () => {
    const onComplete = vi.fn();
    render(<RisingEmojis active={true} tier="MASTER" duration={1500} onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).toHaveBeenCalled();
  });
});

// =============================================================================
// CelebrationOrchestrator Tests
// =============================================================================

describe('CelebrationOrchestrator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render nothing when not celebrating', () => {
    render(<CelebrationOrchestrator active={false} tier="JOURNEYMAN" />);
    expect(screen.queryByTestId('celebration-orchestrator')).not.toBeInTheDocument();
  });

  it('should render celebration container when active', () => {
    render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" />);
    expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
  });

  it('should trigger screen flash first', () => {
    render(<CelebrationOrchestrator active={true} tier="MASTER" />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
  });

  it('should trigger confetti after flash', () => {
    render(<CelebrationOrchestrator active={true} tier="EXPERT" />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('tier-confetti')).toBeInTheDocument();
  });

  it('should trigger fireworks for high tiers', () => {
    render(<CelebrationOrchestrator active={true} tier="GRANDMASTER" />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId('ascii-fireworks')).toBeInTheDocument();
  });

  it('should not trigger fireworks for low tiers', () => {
    render(<CelebrationOrchestrator active={true} tier="APPRENTICE" />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId('ascii-fireworks')).not.toBeInTheDocument();
  });

  it('should trigger rising emojis for MASTER and above', () => {
    render(<CelebrationOrchestrator active={true} tier="MASTER" />);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByTestId('rising-emojis-container')).toBeInTheDocument();
  });

  it('should call onComplete when all animations finish', () => {
    const onComplete = vi.fn();
    render(<CelebrationOrchestrator active={true} tier="JOURNEYMAN" onComplete={onComplete} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('should apply intensity based on tier', () => {
    render(<CelebrationOrchestrator active={true} tier="GRANDMASTER" />);
    const orchestrator = screen.getByTestId('celebration-orchestrator');
    expect(orchestrator).toHaveAttribute('data-intensity', 'max');
  });
});

// =============================================================================
// useCelebrationSequence Hook Tests
// =============================================================================

describe('useCelebrationSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent({ tier }: { tier: SuperforecasterTier }) {
    const {
      isActive,
      currentPhase,
      start,
      stop,
    } = useCelebrationSequence();

    return (
      <div>
        <div data-testid="is-active">{isActive ? 'true' : 'false'}</div>
        <div data-testid="current-phase">{currentPhase}</div>
        <button onClick={() => start(tier)}>Start</button>
        <button onClick={() => stop()}>Stop</button>
      </div>
    );
  }

  it('should start with inactive state', () => {
    render(<TestComponent tier="JOURNEYMAN" />);
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('should activate when start called', () => {
    render(<TestComponent tier="MASTER" />);
    act(() => {
      screen.getByText('Start').click();
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
  });

  it('should progress through phases', () => {
    render(<TestComponent tier="EXPERT" />);
    act(() => {
      screen.getByText('Start').click();
    });
    expect(screen.getByTestId('current-phase')).toHaveTextContent('flash');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('current-phase')).toHaveTextContent('confetti');
  });

  it('should deactivate when stop called', () => {
    render(<TestComponent tier="JOURNEYMAN" />);
    act(() => {
      screen.getByText('Start').click();
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
    act(() => {
      screen.getByText('Stop').click();
    });
    expect(screen.getByTestId('is-active')).toHaveTextContent('false');
  });

  it('should reset to idle phase when stopped', () => {
    render(<TestComponent tier="MASTER" />);
    act(() => {
      screen.getByText('Start').click();
      vi.advanceTimersByTime(500);
    });
    act(() => {
      screen.getByText('Stop').click();
    });
    expect(screen.getByTestId('current-phase')).toHaveTextContent('idle');
  });
});
