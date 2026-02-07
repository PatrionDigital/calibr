/**
 * Ceremonies Component Tests
 *
 * Tests for promotion ceremony components:
 * - TierComparisonDisplay
 * - TierBadgeDisplay
 * - BenefitsReveal
 * - PromotionStats
 * - CeremonyActions
 * - PromotionCeremony
 * - usePromotionCeremony hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import {
  TierComparisonDisplay,
  TierBadgeDisplay,
  BenefitsReveal,
  PromotionStats,
  CeremonyActions,
  PromotionCeremony,
  usePromotionCeremony,
  type SuperforecasterTier,
  type PromotionData,
  type PromotionStats as PromotionStatsType,
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
    li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
      <li {...props}>{children}</li>
    ),
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 {...props}>{children}</h2>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/celebrations', () => ({
  CelebrationOrchestrator: ({ active, tier }: { active: boolean; tier: string }) =>
    active ? <div data-testid="celebration-orchestrator" data-tier={tier} /> : null,
}));

// =============================================================================
// Test Data
// =============================================================================

const sampleStats: PromotionStatsType = {
  totalForecasts: 150,
  brierScore: 0.18,
  calibrationScore: 0.85,
  streakDays: 14,
};

const exceptionalStats: PromotionStatsType = {
  totalForecasts: 500,
  brierScore: 0.12,
  calibrationScore: 0.95,
  streakDays: 60,
};

const samplePromotionData: PromotionData = {
  previousTier: 'JOURNEYMAN',
  newTier: 'EXPERT',
  promotedAt: new Date('2024-01-15'),
  stats: sampleStats,
};

// =============================================================================
// Tests
// =============================================================================

describe('TierComparisonDisplay', () => {
  describe('rendering', () => {
    it('renders previous tier', () => {
      render(<TierComparisonDisplay previousTier="APPRENTICE" newTier="JOURNEYMAN" />);
      expect(screen.getByTestId('previous-tier')).toHaveTextContent('APPRENTICE');
    });

    it('renders new tier', () => {
      render(<TierComparisonDisplay previousTier="APPRENTICE" newTier="JOURNEYMAN" />);
      expect(screen.getByTestId('new-tier')).toHaveTextContent('JOURNEYMAN');
    });

    it('renders transition arrow', () => {
      render(<TierComparisonDisplay previousTier="APPRENTICE" newTier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-arrow')).toHaveTextContent('→');
    });

    it('renders previous tier emoji', () => {
      render(<TierComparisonDisplay previousTier="APPRENTICE" newTier="JOURNEYMAN" />);
      expect(screen.getByTestId('previous-tier-emoji')).toHaveTextContent('🌱');
    });

    it('renders new tier emoji', () => {
      render(<TierComparisonDisplay previousTier="APPRENTICE" newTier="JOURNEYMAN" />);
      expect(screen.getByTestId('new-tier-emoji')).toHaveTextContent('🎯');
    });
  });

  describe('tier data attributes', () => {
    it('sets data-tier on new tier element', () => {
      render(<TierComparisonDisplay previousTier="EXPERT" newTier="MASTER" />);
      expect(screen.getByTestId('new-tier')).toHaveAttribute('data-tier', 'MASTER');
    });
  });

  describe('all tier combinations', () => {
    const tiers: SuperforecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

    tiers.slice(0, -1).forEach((prevTier, index) => {
      const newTier = tiers[index + 1];
      it(`renders ${prevTier} → ${newTier}`, () => {
        render(<TierComparisonDisplay previousTier={prevTier} newTier={newTier!} />);
        expect(screen.getByTestId('previous-tier')).toHaveTextContent(prevTier);
        expect(screen.getByTestId('new-tier')).toHaveTextContent(newTier!);
      });
    });
  });
});

describe('TierBadgeDisplay', () => {
  describe('rendering', () => {
    it('renders badge element', () => {
      render(<TierBadgeDisplay tier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-badge')).toBeInTheDocument();
    });

    it('displays tier name', () => {
      render(<TierBadgeDisplay tier="EXPERT" />);
      expect(screen.getByTestId('tier-badge-name')).toHaveTextContent('EXPERT');
    });

    it('displays tier emoji', () => {
      render(<TierBadgeDisplay tier="MASTER" />);
      expect(screen.getByTestId('tier-badge-emoji')).toHaveTextContent('🧠');
    });
  });

  describe('data attributes', () => {
    it('sets tier data attribute', () => {
      render(<TierBadgeDisplay tier="GRANDMASTER" />);
      expect(screen.getByTestId('tier-badge')).toHaveAttribute('data-tier', 'GRANDMASTER');
    });

    it('sets animated data attribute to false by default', () => {
      render(<TierBadgeDisplay tier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-badge')).toHaveAttribute('data-animated', 'false');
    });

    it('sets animated data attribute to true when animated', () => {
      render(<TierBadgeDisplay tier="JOURNEYMAN" animated />);
      expect(screen.getByTestId('tier-badge')).toHaveAttribute('data-animated', 'true');
    });
  });

  describe('glow effect', () => {
    it('does not show glow by default', () => {
      render(<TierBadgeDisplay tier="EXPERT" />);
      expect(screen.queryByTestId('tier-badge-glow')).not.toBeInTheDocument();
    });

    it('shows glow when showGlow is true', () => {
      render(<TierBadgeDisplay tier="EXPERT" showGlow />);
      expect(screen.getByTestId('tier-badge-glow')).toBeInTheDocument();
    });
  });

  describe('tier emojis', () => {
    it('shows APPRENTICE emoji', () => {
      render(<TierBadgeDisplay tier="APPRENTICE" />);
      expect(screen.getByTestId('tier-badge-emoji')).toHaveTextContent('🌱');
    });

    it('shows JOURNEYMAN emoji', () => {
      render(<TierBadgeDisplay tier="JOURNEYMAN" />);
      expect(screen.getByTestId('tier-badge-emoji')).toHaveTextContent('🎯');
    });

    it('shows GRANDMASTER emoji', () => {
      render(<TierBadgeDisplay tier="GRANDMASTER" />);
      expect(screen.getByTestId('tier-badge-emoji')).toHaveTextContent('👁️');
    });
  });
});

describe('BenefitsReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders benefits container', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated={false} />);
      expect(screen.getByTestId('benefits-reveal')).toBeInTheDocument();
    });

    it('renders header text', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated={false} />);
      expect(screen.getByText('[NEW BENEFITS]')).toBeInTheDocument();
    });

    it('renders all benefits immediately when not animated', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated={false} />);
      const benefits = screen.getAllByTestId('benefit-item');
      expect(benefits.length).toBe(3); // JOURNEYMAN has 3 benefits
    });

    it('renders checkmarks for each benefit', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated={false} />);
      const checkmarks = screen.getAllByTestId('benefit-checkmark');
      expect(checkmarks.length).toBe(3);
      checkmarks.forEach((check) => {
        expect(check).toHaveTextContent('✓');
      });
    });
  });

  describe('tier benefits', () => {
    it('shows APPRENTICE benefits', () => {
      render(<BenefitsReveal tier="APPRENTICE" animated={false} />);
      expect(screen.getByText('Basic forecasting tools')).toBeInTheDocument();
      expect(screen.getByText('Public leaderboard access')).toBeInTheDocument();
    });

    it('shows EXPERT benefits', () => {
      render(<BenefitsReveal tier="EXPERT" animated={false} />);
      expect(screen.getByText('Advanced analytics')).toBeInTheDocument();
      expect(screen.getByText('Cross-platform insights')).toBeInTheDocument();
      expect(screen.getByText('Private attestations')).toBeInTheDocument();
    });

    it('shows GRANDMASTER benefits', () => {
      render(<BenefitsReveal tier="GRANDMASTER" animated={false} />);
      expect(screen.getByText('Legend status')).toBeInTheDocument();
      expect(screen.getByText('Governance rights')).toBeInTheDocument();
      expect(screen.getByText('Mentor privileges')).toBeInTheDocument();
      expect(screen.getByText('Exclusive events')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('reveals benefits one by one when animated', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated staggerDelay={400} />);

      // Initially no benefits
      expect(screen.queryAllByTestId('benefit-item').length).toBe(0);

      // First benefit after first delay
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getAllByTestId('benefit-item').length).toBe(1);

      // Second benefit
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getAllByTestId('benefit-item').length).toBe(2);

      // Third benefit
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getAllByTestId('benefit-item').length).toBe(3);
    });

    it('calls onRevealComplete after all benefits shown', () => {
      const onRevealComplete = vi.fn();
      render(
        <BenefitsReveal
          tier="APPRENTICE"
          animated
          staggerDelay={400}
          onRevealComplete={onRevealComplete}
        />
      );

      // APPRENTICE has 2 benefits
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onRevealComplete).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(onRevealComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      render(<BenefitsReveal tier="JOURNEYMAN" animated={false} />);
      expect(screen.getByTestId('benefits-reveal')).toHaveClass('ascii-box');
    });
  });
});

describe('PromotionStats', () => {
  describe('rendering', () => {
    it('renders stats container', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('promotion-stats')).toBeInTheDocument();
    });

    it('renders header text', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByText('[YOUR STATS]')).toBeInTheDocument();
    });

    it('displays total forecasts', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-forecasts')).toHaveTextContent('150');
    });

    it('displays brier score', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-brier')).toHaveTextContent('0.18');
    });

    it('displays calibration score as percentage', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-calibration')).toHaveTextContent('85%');
    });

    it('displays streak days', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-streak')).toHaveTextContent('14');
    });
  });

  describe('exceptional values', () => {
    it('marks exceptional brier score', () => {
      render(<PromotionStats stats={exceptionalStats} />);
      expect(screen.getByTestId('stat-brier')).toHaveAttribute('data-exceptional', 'true');
    });

    it('marks exceptional calibration score', () => {
      render(<PromotionStats stats={exceptionalStats} />);
      expect(screen.getByTestId('stat-calibration')).toHaveAttribute('data-exceptional', 'true');
    });

    it('does not mark non-exceptional brier score', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-brier')).toHaveAttribute('data-exceptional', 'false');
    });

    it('does not mark non-exceptional calibration score', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('stat-calibration')).toHaveAttribute('data-exceptional', 'false');
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      render(<PromotionStats stats={sampleStats} />);
      expect(screen.getByTestId('promotion-stats')).toHaveClass('ascii-box');
    });
  });
});

describe('CeremonyActions', () => {
  describe('rendering', () => {
    it('renders actions container', () => {
      render(<CeremonyActions onClose={vi.fn()} />);
      expect(screen.getByTestId('ceremony-actions')).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(<CeremonyActions onClose={vi.fn()} />);
      expect(screen.getByTestId('action-share')).toHaveTextContent('[ SHARE ]');
    });

    it('renders profile button', () => {
      render(<CeremonyActions onClose={vi.fn()} />);
      expect(screen.getByTestId('action-profile')).toHaveTextContent('[ PROFILE ]');
    });

    it('renders close/continue button', () => {
      render(<CeremonyActions onClose={vi.fn()} />);
      expect(screen.getByTestId('action-close')).toHaveTextContent('[ CONTINUE ]');
    });
  });

  describe('click handlers', () => {
    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<CeremonyActions onClose={onClose} />);

      fireEvent.click(screen.getByTestId('action-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onShare when share button clicked', () => {
      const onShare = vi.fn();
      render(<CeremonyActions onClose={vi.fn()} onShare={onShare} />);

      fireEvent.click(screen.getByTestId('action-share'));
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it('calls onViewProfile when profile button clicked', () => {
      const onViewProfile = vi.fn();
      render(<CeremonyActions onClose={vi.fn()} onViewProfile={onViewProfile} />);

      fireEvent.click(screen.getByTestId('action-profile'));
      expect(onViewProfile).toHaveBeenCalledTimes(1);
    });
  });
});

describe('PromotionCeremony', () => {
  describe('rendering', () => {
    it('renders nothing when not open', () => {
      render(<PromotionCeremony isOpen={false} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.queryByTestId('promotion-ceremony')).not.toBeInTheDocument();
    });

    it('renders when open', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('promotion-ceremony')).toBeInTheDocument();
    });

    it('renders backdrop', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('ceremony-backdrop')).toBeInTheDocument();
    });

    it('renders TIER PROMOTION header', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByText('TIER PROMOTION')).toBeInTheDocument();
    });

    it('renders tier badge', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('tier-badge')).toBeInTheDocument();
    });

    it('renders congratulations message', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
    });

    it('renders benefits reveal', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('benefits-reveal')).toBeInTheDocument();
    });

    it('renders promotion stats', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('promotion-stats')).toBeInTheDocument();
    });

    it('renders ceremony actions', () => {
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={vi.fn()} />);
      expect(screen.getByTestId('ceremony-actions')).toBeInTheDocument();
    });
  });

  describe('celebration for high tiers', () => {
    it('shows celebration for EXPERT tier', () => {
      render(
        <PromotionCeremony
          isOpen={true}
          data={{ ...samplePromotionData, newTier: 'EXPERT' }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
    });

    it('shows celebration for MASTER tier', () => {
      render(
        <PromotionCeremony
          isOpen={true}
          data={{ ...samplePromotionData, newTier: 'MASTER' }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
    });

    it('shows celebration for GRANDMASTER tier', () => {
      render(
        <PromotionCeremony
          isOpen={true}
          data={{ ...samplePromotionData, newTier: 'GRANDMASTER' }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
    });

    it('does not show celebration for APPRENTICE tier', () => {
      render(
        <PromotionCeremony
          isOpen={true}
          data={{ ...samplePromotionData, newTier: 'APPRENTICE' }}
          onClose={vi.fn()}
        />
      );
      expect(screen.queryByTestId('celebration-orchestrator')).not.toBeInTheDocument();
    });

    it('does not show celebration for JOURNEYMAN tier', () => {
      render(
        <PromotionCeremony
          isOpen={true}
          data={{ ...samplePromotionData, newTier: 'JOURNEYMAN' }}
          onClose={vi.fn()}
        />
      );
      expect(screen.queryByTestId('celebration-orchestrator')).not.toBeInTheDocument();
    });
  });

  describe('backdrop interaction', () => {
    it('calls onClose when backdrop clicked', () => {
      const onClose = vi.fn();
      render(<PromotionCeremony isOpen={true} data={samplePromotionData} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('ceremony-backdrop'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('action callbacks', () => {
    it('passes onShare to actions', () => {
      const onShare = vi.fn();
      render(
        <PromotionCeremony
          isOpen={true}
          data={samplePromotionData}
          onClose={vi.fn()}
          onShare={onShare}
        />
      );

      fireEvent.click(screen.getByTestId('action-share'));
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it('passes onViewProfile to actions', () => {
      const onViewProfile = vi.fn();
      render(
        <PromotionCeremony
          isOpen={true}
          data={samplePromotionData}
          onClose={vi.fn()}
          onViewProfile={onViewProfile}
        />
      );

      fireEvent.click(screen.getByTestId('action-profile'));
      expect(onViewProfile).toHaveBeenCalledTimes(1);
    });
  });
});

describe('usePromotionCeremony', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => usePromotionCeremony());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.currentPhase).toBe('idle');
  });

  it('opens with promotion data', () => {
    const { result } = renderHook(() => usePromotionCeremony());

    act(() => {
      result.current.open(samplePromotionData);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.data).toEqual(samplePromotionData);
    expect(result.current.currentPhase).toBe('intro');
  });

  it('progresses through phases', () => {
    const { result } = renderHook(() => usePromotionCeremony());

    act(() => {
      result.current.open(samplePromotionData);
    });
    expect(result.current.currentPhase).toBe('intro');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.currentPhase).toBe('reveal');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.currentPhase).toBe('benefits');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.currentPhase).toBe('stats');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.currentPhase).toBe('complete');
  });

  it('closes and resets state', () => {
    const { result } = renderHook(() => usePromotionCeremony());

    act(() => {
      result.current.open(samplePromotionData);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.currentPhase).toBe('idle');
  });
});
