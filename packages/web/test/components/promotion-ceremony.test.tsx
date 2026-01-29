/**
 * Promotion Ceremony Tests
 * TDD tests for tier promotion ceremony UI system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  PromotionCeremony,
  TierComparisonDisplay,
  BenefitsReveal,
  TierBadgeDisplay,
  PromotionStats,
  CeremonyActions,
  usePromotionCeremony,
} from '@/components/ceremonies';
import type { SuperforecasterTier, PromotionData } from '@/components/ceremonies';

// =============================================================================
// Test Data
// =============================================================================

const mockPromotionData: PromotionData = {
  previousTier: 'JOURNEYMAN',
  newTier: 'EXPERT',
  promotedAt: new Date('2024-01-15T10:30:00Z'),
  stats: {
    totalForecasts: 150,
    brierScore: 0.18,
    calibrationScore: 0.85,
    streakDays: 14,
  },
};

const mockGrandmasterPromotion: PromotionData = {
  previousTier: 'MASTER',
  newTier: 'GRANDMASTER',
  promotedAt: new Date('2024-01-20T15:00:00Z'),
  stats: {
    totalForecasts: 500,
    brierScore: 0.08,
    calibrationScore: 0.95,
    streakDays: 60,
  },
};

// =============================================================================
// TierComparisonDisplay Tests
// =============================================================================

describe('TierComparisonDisplay', () => {
  it('should render previous and new tier', () => {
    render(
      <TierComparisonDisplay
        previousTier="JOURNEYMAN"
        newTier="EXPERT"
      />
    );
    expect(screen.getByTestId('previous-tier')).toHaveTextContent('JOURNEYMAN');
    expect(screen.getByTestId('new-tier')).toHaveTextContent('EXPERT');
  });

  it('should show tier emojis', () => {
    render(
      <TierComparisonDisplay
        previousTier="APPRENTICE"
        newTier="JOURNEYMAN"
      />
    );
    expect(screen.getByTestId('previous-tier-emoji')).toHaveTextContent('🌱');
    expect(screen.getByTestId('new-tier-emoji')).toHaveTextContent('🎯');
  });

  it('should display arrow between tiers', () => {
    render(
      <TierComparisonDisplay
        previousTier="EXPERT"
        newTier="MASTER"
      />
    );
    expect(screen.getByTestId('tier-arrow')).toBeInTheDocument();
  });

  it('should apply tier-specific colors to new tier', () => {
    render(
      <TierComparisonDisplay
        previousTier="MASTER"
        newTier="GRANDMASTER"
      />
    );
    const newTier = screen.getByTestId('new-tier');
    expect(newTier).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should dim the previous tier', () => {
    render(
      <TierComparisonDisplay
        previousTier="JOURNEYMAN"
        newTier="EXPERT"
      />
    );
    const previousTier = screen.getByTestId('previous-tier-container');
    expect(previousTier).toHaveClass('opacity-50');
  });
});

// =============================================================================
// TierBadgeDisplay Tests
// =============================================================================

describe('TierBadgeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render tier badge with emoji', () => {
    render(<TierBadgeDisplay tier="MASTER" />);
    expect(screen.getByTestId('tier-badge')).toBeInTheDocument();
    expect(screen.getByTestId('tier-badge-emoji')).toHaveTextContent('🧠');
  });

  it('should display tier name', () => {
    render(<TierBadgeDisplay tier="EXPERT" />);
    expect(screen.getByTestId('tier-badge-name')).toHaveTextContent('EXPERT');
  });

  it('should apply tier-specific styling', () => {
    render(<TierBadgeDisplay tier="GRANDMASTER" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should animate on mount when animated prop is true', () => {
    render(<TierBadgeDisplay tier="MASTER" animated />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveAttribute('data-animated', 'true');
  });

  it('should show glow effect for high tiers', () => {
    render(<TierBadgeDisplay tier="GRANDMASTER" showGlow />);
    expect(screen.getByTestId('tier-badge-glow')).toBeInTheDocument();
  });
});

// =============================================================================
// BenefitsReveal Tests
// =============================================================================

describe('BenefitsReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render benefits container', () => {
    render(<BenefitsReveal tier="EXPERT" />);
    expect(screen.getByTestId('benefits-reveal')).toBeInTheDocument();
  });

  it('should show benefits header', () => {
    render(<BenefitsReveal tier="MASTER" />);
    expect(screen.getByText(/NEW BENEFITS/i)).toBeInTheDocument();
  });

  it('should reveal benefits one by one when animated', () => {
    render(<BenefitsReveal tier="JOURNEYMAN" animated staggerDelay={500} />);

    // Initially no benefits visible
    expect(screen.queryAllByTestId('benefit-item')).toHaveLength(0);

    // After first delay, first benefit appears
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getAllByTestId('benefit-item').length).toBeGreaterThanOrEqual(1);
  });

  it('should show all benefits immediately when not animated', () => {
    render(<BenefitsReveal tier="EXPERT" animated={false} />);
    const benefits = screen.getAllByTestId('benefit-item');
    expect(benefits.length).toBeGreaterThan(0);
  });

  it('should display checkmark icons for each benefit', () => {
    render(<BenefitsReveal tier="MASTER" animated={false} />);
    const checkmarks = screen.getAllByTestId('benefit-checkmark');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('should call onRevealComplete when all benefits revealed', () => {
    const onComplete = vi.fn();
    render(
      <BenefitsReveal
        tier="JOURNEYMAN"
        animated
        staggerDelay={100}
        onRevealComplete={onComplete}
      />
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalled();
  });
});

// =============================================================================
// PromotionStats Tests
// =============================================================================

describe('PromotionStats', () => {
  it('should render stats container', () => {
    render(<PromotionStats stats={mockPromotionData.stats} />);
    expect(screen.getByTestId('promotion-stats')).toBeInTheDocument();
  });

  it('should display total forecasts', () => {
    render(<PromotionStats stats={mockPromotionData.stats} />);
    expect(screen.getByTestId('stat-forecasts')).toHaveTextContent('150');
  });

  it('should display Brier score', () => {
    render(<PromotionStats stats={mockPromotionData.stats} />);
    expect(screen.getByTestId('stat-brier')).toHaveTextContent('0.18');
  });

  it('should display calibration score', () => {
    render(<PromotionStats stats={mockPromotionData.stats} />);
    expect(screen.getByTestId('stat-calibration')).toHaveTextContent('85%');
  });

  it('should display streak days', () => {
    render(<PromotionStats stats={mockPromotionData.stats} />);
    expect(screen.getByTestId('stat-streak')).toHaveTextContent('14');
  });

  it('should highlight exceptional stats', () => {
    render(<PromotionStats stats={mockGrandmasterPromotion.stats} />);
    const brierStat = screen.getByTestId('stat-brier');
    expect(brierStat).toHaveAttribute('data-exceptional', 'true');
  });
});

// =============================================================================
// CeremonyActions Tests
// =============================================================================

describe('CeremonyActions', () => {
  it('should render action buttons', () => {
    render(<CeremonyActions onClose={() => {}} />);
    expect(screen.getByTestId('ceremony-actions')).toBeInTheDocument();
  });

  it('should have share button', () => {
    render(<CeremonyActions onClose={() => {}} />);
    expect(screen.getByTestId('action-share')).toBeInTheDocument();
  });

  it('should have view profile button', () => {
    render(<CeremonyActions onClose={() => {}} />);
    expect(screen.getByTestId('action-profile')).toBeInTheDocument();
  });

  it('should have close/continue button', () => {
    render(<CeremonyActions onClose={() => {}} />);
    expect(screen.getByTestId('action-close')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<CeremonyActions onClose={onClose} />);
    fireEvent.click(screen.getByTestId('action-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onShare when share button clicked', () => {
    const onShare = vi.fn();
    render(<CeremonyActions onClose={() => {}} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('action-share'));
    expect(onShare).toHaveBeenCalled();
  });

  it('should call onViewProfile when profile button clicked', () => {
    const onViewProfile = vi.fn();
    render(<CeremonyActions onClose={() => {}} onViewProfile={onViewProfile} />);
    fireEvent.click(screen.getByTestId('action-profile'));
    expect(onViewProfile).toHaveBeenCalled();
  });
});

// =============================================================================
// PromotionCeremony Tests
// =============================================================================

describe('PromotionCeremony', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when not open', () => {
    render(
      <PromotionCeremony
        isOpen={false}
        data={mockPromotionData}
        onClose={() => {}}
      />
    );
    expect(screen.queryByTestId('promotion-ceremony')).not.toBeInTheDocument();
  });

  it('should render ceremony modal when open', () => {
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('promotion-ceremony')).toBeInTheDocument();
  });

  it('should display promotion header', () => {
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={() => {}}
      />
    );
    expect(screen.getByText(/PROMOTION/i)).toBeInTheDocument();
  });

  it('should show tier comparison', () => {
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('previous-tier')).toBeInTheDocument();
    expect(screen.getByTestId('new-tier')).toBeInTheDocument();
  });

  it('should show tier badge', () => {
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('tier-badge')).toBeInTheDocument();
  });

  it('should trigger celebration animations for high tiers', () => {
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockGrandmasterPromotion}
        onClose={() => {}}
      />
    );
    expect(screen.getByTestId('celebration-orchestrator')).toBeInTheDocument();
  });

  it('should call onClose when ceremony dismissed', () => {
    const onClose = vi.fn();
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('action-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should show backdrop that closes on click', () => {
    const onClose = vi.fn();
    render(
      <PromotionCeremony
        isOpen={true}
        data={mockPromotionData}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('ceremony-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// usePromotionCeremony Hook Tests
// =============================================================================

describe('usePromotionCeremony', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent() {
    const {
      isOpen,
      data,
      open,
      close,
      currentPhase,
    } = usePromotionCeremony();

    return (
      <div>
        <div data-testid="is-open">{isOpen ? 'true' : 'false'}</div>
        <div data-testid="current-phase">{currentPhase}</div>
        <div data-testid="new-tier">{data?.newTier ?? 'none'}</div>
        <button onClick={() => open(mockPromotionData)}>Open</button>
        <button onClick={close}>Close</button>
      </div>
    );
  }

  it('should start closed', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('should open ceremony with data', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    expect(screen.getByTestId('new-tier')).toHaveTextContent('EXPERT');
  });

  it('should start in intro phase', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('current-phase')).toHaveTextContent('intro');
  });

  it('should progress through phases', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Open'));

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId('current-phase')).toHaveTextContent('reveal');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('current-phase')).toHaveTextContent('benefits');
  });

  it('should close and reset state', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByText('Close'));
    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    expect(screen.getByTestId('current-phase')).toHaveTextContent('idle');
  });
});
