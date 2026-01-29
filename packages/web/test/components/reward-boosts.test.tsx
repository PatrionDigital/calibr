/**
 * Reward Boosts Tests
 * TDD tests for $CALIBR reward boost system
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  BoostMultiplierDisplay,
  BoostCalculator,
  RewardHistoryItem,
  RewardHistory,
  StreakBonus,
  AchievementBonus,
  BoostPreview,
  TotalBoostSummary,
  useRewardBoosts,
} from '@/components/reward-boosts';
import type {
  RewardHistoryEntry,
  BoostConfig,
  BoostBreakdown,
} from '@/components/reward-boosts';

// =============================================================================
// Test Data
// =============================================================================

const mockBoostConfig: BoostConfig = {
  tierMultipliers: {
    APPRENTICE: 1.0,
    JOURNEYMAN: 1.25,
    EXPERT: 1.5,
    MASTER: 2.0,
    GRANDMASTER: 3.0,
  },
  streakBonuses: {
    7: 0.05,
    14: 0.1,
    30: 0.2,
    60: 0.35,
    100: 0.5,
  },
  achievementBonuses: {
    'first-forecast': 0.01,
    'week-streak': 0.02,
    'accuracy-elite': 0.05,
    'centurion': 0.1,
    'grandmaster': 0.15,
  },
};

const mockRewardHistory: RewardHistoryEntry[] = [
  {
    id: 'reward-001',
    type: 'forecast',
    baseAmount: 100,
    boostMultiplier: 2.35,
    finalAmount: 235,
    breakdown: {
      tierBoost: 2.0,
      streakBoost: 0.2,
      achievementBoost: 0.15,
    },
    timestamp: '2024-01-15T10:30:00Z',
    description: 'Forecast reward',
  },
  {
    id: 'reward-002',
    type: 'resolution',
    baseAmount: 500,
    boostMultiplier: 2.35,
    finalAmount: 1175,
    breakdown: {
      tierBoost: 2.0,
      streakBoost: 0.2,
      achievementBoost: 0.15,
    },
    timestamp: '2024-01-14T15:00:00Z',
    description: 'Correct prediction bonus',
  },
  {
    id: 'reward-003',
    type: 'achievement',
    baseAmount: 1000,
    boostMultiplier: 1.0,
    finalAmount: 1000,
    breakdown: {
      tierBoost: 1.0,
      streakBoost: 0,
      achievementBoost: 0,
    },
    timestamp: '2024-01-13T09:00:00Z',
    description: 'Centurion achievement unlocked',
  },
];

// =============================================================================
// BoostMultiplierDisplay Tests
// =============================================================================

describe('BoostMultiplierDisplay', () => {
  it('should render multiplier container', () => {
    render(<BoostMultiplierDisplay tier="MASTER" multiplier={2.0} />);
    expect(screen.getByTestId('boost-multiplier-display')).toBeInTheDocument();
  });

  it('should display multiplier value', () => {
    render(<BoostMultiplierDisplay tier="MASTER" multiplier={2.0} />);
    expect(screen.getByTestId('multiplier-value')).toHaveTextContent('2.0x');
  });

  it('should display tier name', () => {
    render(<BoostMultiplierDisplay tier="GRANDMASTER" multiplier={3.0} />);
    expect(screen.getByTestId('multiplier-tier')).toHaveTextContent('GRANDMASTER');
  });

  it('should show tier emoji', () => {
    render(<BoostMultiplierDisplay tier="GRANDMASTER" multiplier={3.0} />);
    expect(screen.getByTestId('multiplier-emoji')).toHaveTextContent('👁️');
  });

  it('should apply tier-specific styling', () => {
    render(<BoostMultiplierDisplay tier="GRANDMASTER" multiplier={3.0} />);
    const display = screen.getByTestId('boost-multiplier-display');
    expect(display).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should show boost label', () => {
    render(<BoostMultiplierDisplay tier="EXPERT" multiplier={1.5} />);
    expect(screen.getByText(/boost/i)).toBeInTheDocument();
  });

  it('should highlight high multipliers', () => {
    render(<BoostMultiplierDisplay tier="GRANDMASTER" multiplier={3.0} />);
    const value = screen.getByTestId('multiplier-value');
    expect(value).toHaveAttribute('data-highlighted', 'true');
  });

  it('should apply compact variant', () => {
    render(<BoostMultiplierDisplay tier="MASTER" multiplier={2.0} variant="compact" />);
    const display = screen.getByTestId('boost-multiplier-display');
    expect(display).toHaveAttribute('data-variant', 'compact');
  });
});

// =============================================================================
// BoostCalculator Tests
// =============================================================================

describe('BoostCalculator', () => {
  it('should render calculator container', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="MASTER"
        streakDays={30}
        achievements={['centurion']}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('boost-calculator')).toBeInTheDocument();
  });

  it('should display base amount', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="JOURNEYMAN"
        streakDays={0}
        achievements={[]}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-base-amount')).toHaveTextContent('100');
  });

  it('should display tier multiplier', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="MASTER"
        streakDays={0}
        achievements={[]}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-tier-multiplier')).toHaveTextContent('2.0x');
  });

  it('should display streak bonus when applicable', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="JOURNEYMAN"
        streakDays={30}
        achievements={[]}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-streak-bonus')).toHaveTextContent('+20%');
  });

  it('should not show streak bonus when below threshold', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="JOURNEYMAN"
        streakDays={5}
        achievements={[]}
        config={mockBoostConfig}
      />
    );
    expect(screen.queryByTestId('calc-streak-bonus')).not.toBeInTheDocument();
  });

  it('should display achievement bonus when applicable', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="JOURNEYMAN"
        streakDays={0}
        achievements={['centurion', 'accuracy-elite']}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-achievement-bonus')).toHaveTextContent('+15%');
  });

  it('should calculate final amount correctly', () => {
    // Base: 100, Tier: 2.0x, Streak: +20%, Achievement: +10%
    // Final = 100 * (2.0 + 0.2 + 0.1) = 100 * 2.3 = 230
    render(
      <BoostCalculator
        baseAmount={100}
        tier="MASTER"
        streakDays={30}
        achievements={['centurion']}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-final-amount')).toHaveTextContent('230');
  });

  it('should show total multiplier', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="MASTER"
        streakDays={30}
        achievements={['centurion']}
        config={mockBoostConfig}
      />
    );
    expect(screen.getByTestId('calc-total-multiplier')).toHaveTextContent('2.3x');
  });

  it('should show CALIBR token symbol', () => {
    render(
      <BoostCalculator
        baseAmount={100}
        tier="JOURNEYMAN"
        streakDays={0}
        achievements={[]}
        config={mockBoostConfig}
      />
    );
    expect(screen.getAllByText(/\$CALIBR/).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// RewardHistoryItem Tests
// =============================================================================

describe('RewardHistoryItem', () => {
  it('should render history item', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-history-item')).toBeInTheDocument();
  });

  it('should display reward type', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-type')).toHaveTextContent('forecast');
  });

  it('should display base amount', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-base')).toHaveTextContent('100');
  });

  it('should display final amount', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-final')).toHaveTextContent('235');
  });

  it('should display boost multiplier', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-multiplier')).toHaveTextContent('2.35x');
  });

  it('should display description', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-description')).toHaveTextContent('Forecast reward');
  });

  it('should display timestamp', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-timestamp')).toBeInTheDocument();
  });

  it('should show breakdown on expand', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} expandable />);
    fireEvent.click(screen.getByTestId('reward-history-item'));
    expect(screen.getByTestId('reward-breakdown')).toBeInTheDocument();
  });

  it('should show type-specific icon', () => {
    render(<RewardHistoryItem entry={mockRewardHistory[0]!} />);
    expect(screen.getByTestId('reward-icon')).toBeInTheDocument();
  });
});

// =============================================================================
// RewardHistory Tests
// =============================================================================

describe('RewardHistory', () => {
  it('should render history container', () => {
    render(<RewardHistory entries={mockRewardHistory} />);
    expect(screen.getByTestId('reward-history')).toBeInTheDocument();
  });

  it('should render all history entries', () => {
    render(<RewardHistory entries={mockRewardHistory} />);
    const items = screen.getAllByTestId('reward-history-item');
    expect(items).toHaveLength(3);
  });

  it('should show empty state when no entries', () => {
    render(<RewardHistory entries={[]} />);
    expect(screen.getByTestId('reward-history-empty')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<RewardHistory entries={mockRewardHistory} title="Reward History" />);
    expect(screen.getByText('Reward History')).toBeInTheDocument();
  });

  it('should show total earned', () => {
    render(<RewardHistory entries={mockRewardHistory} showTotal />);
    expect(screen.getByTestId('history-total')).toBeInTheDocument();
  });

  it('should calculate total correctly', () => {
    // 235 + 1175 + 1000 = 2410
    render(<RewardHistory entries={mockRewardHistory} showTotal />);
    expect(screen.getByTestId('history-total')).toHaveTextContent('2,410');
  });

  it('should limit displayed entries with maxEntries', () => {
    render(<RewardHistory entries={mockRewardHistory} maxEntries={2} />);
    const items = screen.getAllByTestId('reward-history-item');
    expect(items).toHaveLength(2);
  });

  it('should show view all link when limited', () => {
    render(<RewardHistory entries={mockRewardHistory} maxEntries={2} />);
    expect(screen.getByTestId('view-all-link')).toBeInTheDocument();
  });
});

// =============================================================================
// StreakBonus Tests
// =============================================================================

describe('StreakBonus', () => {
  it('should render streak bonus container', () => {
    render(<StreakBonus streakDays={30} bonusPercentage={20} />);
    expect(screen.getByTestId('streak-bonus')).toBeInTheDocument();
  });

  it('should display streak days', () => {
    render(<StreakBonus streakDays={30} bonusPercentage={20} />);
    expect(screen.getByTestId('streak-days')).toHaveTextContent('30');
  });

  it('should display bonus percentage', () => {
    render(<StreakBonus streakDays={30} bonusPercentage={20} />);
    expect(screen.getByTestId('streak-bonus-percent')).toHaveTextContent('+20%');
  });

  it('should show flame icon', () => {
    render(<StreakBonus streakDays={30} bonusPercentage={20} />);
    expect(screen.getByTestId('streak-flame')).toBeInTheDocument();
  });

  it('should show next milestone when provided', () => {
    render(<StreakBonus streakDays={25} bonusPercentage={10} nextMilestone={30} nextBonus={20} />);
    expect(screen.getByTestId('next-milestone')).toHaveTextContent('30');
  });

  it('should show days until next milestone', () => {
    render(<StreakBonus streakDays={25} bonusPercentage={10} nextMilestone={30} nextBonus={20} />);
    expect(screen.getByTestId('days-until-next')).toHaveTextContent('5');
  });

  it('should apply active styling when bonus is active', () => {
    render(<StreakBonus streakDays={30} bonusPercentage={20} />);
    const bonus = screen.getByTestId('streak-bonus');
    expect(bonus).toHaveAttribute('data-active', 'true');
  });

  it('should show inactive state when no bonus', () => {
    render(<StreakBonus streakDays={5} bonusPercentage={0} />);
    const bonus = screen.getByTestId('streak-bonus');
    expect(bonus).toHaveAttribute('data-active', 'false');
  });
});

// =============================================================================
// AchievementBonus Tests
// =============================================================================

describe('AchievementBonus', () => {
  const achievements = [
    { id: 'centurion', name: 'Centurion', bonus: 10 },
    { id: 'accuracy-elite', name: 'Accuracy Elite', bonus: 5 },
  ];

  it('should render achievement bonus container', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} />);
    expect(screen.getByTestId('achievement-bonus')).toBeInTheDocument();
  });

  it('should display total bonus', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} />);
    expect(screen.getByTestId('achievement-total-bonus')).toHaveTextContent('+15%');
  });

  it('should display achievement count', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} />);
    expect(screen.getByTestId('achievement-count')).toHaveTextContent('2');
  });

  it('should list individual achievements', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} showList />);
    expect(screen.getByText('Centurion')).toBeInTheDocument();
    expect(screen.getByText('Accuracy Elite')).toBeInTheDocument();
  });

  it('should show individual bonus amounts', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} showList />);
    const bonuses = screen.getAllByTestId('individual-bonus');
    expect(bonuses).toHaveLength(2);
  });

  it('should show trophy icon', () => {
    render(<AchievementBonus achievements={achievements} totalBonus={15} />);
    expect(screen.getByTestId('achievement-icon')).toBeInTheDocument();
  });

  it('should show empty state when no achievements', () => {
    render(<AchievementBonus achievements={[]} totalBonus={0} />);
    expect(screen.getByTestId('achievement-bonus-empty')).toBeInTheDocument();
  });
});

// =============================================================================
// BoostPreview Tests
// =============================================================================

describe('BoostPreview', () => {
  const previewData: BoostBreakdown = {
    baseAmount: 100,
    tierMultiplier: 2.0,
    tierName: 'MASTER',
    streakBonus: 0.2,
    streakDays: 30,
    achievementBonus: 0.1,
    achievementCount: 2,
    totalMultiplier: 2.3,
    finalAmount: 230,
  };

  it('should render preview container', () => {
    render(<BoostPreview breakdown={previewData} />);
    expect(screen.getByTestId('boost-preview')).toBeInTheDocument();
  });

  it('should show before amount', () => {
    render(<BoostPreview breakdown={previewData} />);
    expect(screen.getByTestId('preview-before')).toHaveTextContent('100');
  });

  it('should show after amount', () => {
    render(<BoostPreview breakdown={previewData} />);
    expect(screen.getByTestId('preview-after')).toHaveTextContent('230');
  });

  it('should show boost gained', () => {
    render(<BoostPreview breakdown={previewData} />);
    expect(screen.getByTestId('preview-boost-gained')).toHaveTextContent('+130');
  });

  it('should show breakdown sections', () => {
    render(<BoostPreview breakdown={previewData} showBreakdown />);
    expect(screen.getByTestId('preview-tier-section')).toBeInTheDocument();
    expect(screen.getByTestId('preview-streak-section')).toBeInTheDocument();
    expect(screen.getByTestId('preview-achievement-section')).toBeInTheDocument();
  });

  it('should show arrow between amounts', () => {
    render(<BoostPreview breakdown={previewData} />);
    expect(screen.getByTestId('preview-arrow')).toBeInTheDocument();
  });

  it('should apply compact variant', () => {
    render(<BoostPreview breakdown={previewData} variant="compact" />);
    const preview = screen.getByTestId('boost-preview');
    expect(preview).toHaveAttribute('data-variant', 'compact');
  });
});

// =============================================================================
// TotalBoostSummary Tests
// =============================================================================

describe('TotalBoostSummary', () => {
  it('should render summary container', () => {
    render(
      <TotalBoostSummary
        tier="MASTER"
        tierMultiplier={2.0}
        streakBonus={0.2}
        achievementBonus={0.1}
        totalMultiplier={2.3}
      />
    );
    expect(screen.getByTestId('total-boost-summary')).toBeInTheDocument();
  });

  it('should display total multiplier prominently', () => {
    render(
      <TotalBoostSummary
        tier="MASTER"
        tierMultiplier={2.0}
        streakBonus={0.2}
        achievementBonus={0.1}
        totalMultiplier={2.3}
      />
    );
    expect(screen.getByTestId('total-multiplier')).toHaveTextContent('2.3x');
  });

  it('should show tier contribution', () => {
    render(
      <TotalBoostSummary
        tier="MASTER"
        tierMultiplier={2.0}
        streakBonus={0.2}
        achievementBonus={0.1}
        totalMultiplier={2.3}
      />
    );
    expect(screen.getByTestId('tier-contribution')).toHaveTextContent('2.0x');
  });

  it('should show streak contribution', () => {
    render(
      <TotalBoostSummary
        tier="MASTER"
        tierMultiplier={2.0}
        streakBonus={0.2}
        achievementBonus={0.1}
        totalMultiplier={2.3}
      />
    );
    expect(screen.getByTestId('streak-contribution')).toHaveTextContent('+20%');
  });

  it('should show achievement contribution', () => {
    render(
      <TotalBoostSummary
        tier="MASTER"
        tierMultiplier={2.0}
        streakBonus={0.2}
        achievementBonus={0.1}
        totalMultiplier={2.3}
      />
    );
    expect(screen.getByTestId('achievement-contribution')).toHaveTextContent('+10%');
  });

  it('should apply tier styling', () => {
    render(
      <TotalBoostSummary
        tier="GRANDMASTER"
        tierMultiplier={3.0}
        streakBonus={0.5}
        achievementBonus={0.15}
        totalMultiplier={3.65}
      />
    );
    const summary = screen.getByTestId('total-boost-summary');
    expect(summary).toHaveAttribute('data-tier', 'GRANDMASTER');
  });
});

// =============================================================================
// useRewardBoosts Hook Tests
// =============================================================================

describe('useRewardBoosts', () => {
  function TestComponent({
    tier,
    streakDays,
    achievements,
  }: {
    tier: string;
    streakDays: number;
    achievements: string[];
  }) {
    const {
      tierMultiplier,
      streakBonus,
      achievementBonus,
      totalMultiplier,
      calculateReward,
      nextStreakMilestone,
    } = useRewardBoosts({
      tier: tier as any,
      streakDays,
      achievements,
      config: mockBoostConfig,
    });

    return (
      <div>
        <div data-testid="tier-mult">{tierMultiplier}</div>
        <div data-testid="streak-bonus">{streakBonus}</div>
        <div data-testid="achievement-bonus">{achievementBonus}</div>
        <div data-testid="total-mult">{totalMultiplier}</div>
        <div data-testid="calculated">{calculateReward(100)}</div>
        <div data-testid="next-milestone">{nextStreakMilestone ?? 'none'}</div>
      </div>
    );
  }

  it('should calculate tier multiplier correctly', () => {
    render(<TestComponent tier="MASTER" streakDays={0} achievements={[]} />);
    expect(screen.getByTestId('tier-mult')).toHaveTextContent('2');
  });

  it('should calculate streak bonus correctly', () => {
    render(<TestComponent tier="APPRENTICE" streakDays={30} achievements={[]} />);
    expect(screen.getByTestId('streak-bonus')).toHaveTextContent('0.2');
  });

  it('should calculate achievement bonus correctly', () => {
    render(<TestComponent tier="APPRENTICE" streakDays={0} achievements={['centurion', 'accuracy-elite']} />);
    // centurion: 0.1 + accuracy-elite: 0.05 = 0.15
    expect(screen.getByTestId('achievement-bonus')).toHaveTextContent('0.15');
  });

  it('should calculate total multiplier correctly', () => {
    // Tier: 2.0 + Streak: 0.2 + Achievement: 0.1 = 2.3
    render(<TestComponent tier="MASTER" streakDays={30} achievements={['centurion']} />);
    expect(screen.getByTestId('total-mult')).toHaveTextContent('2.3');
  });

  it('should calculate reward correctly', () => {
    // 100 * 2.3 = 230
    render(<TestComponent tier="MASTER" streakDays={30} achievements={['centurion']} />);
    expect(screen.getByTestId('calculated')).toHaveTextContent('230');
  });

  it('should find next streak milestone', () => {
    render(<TestComponent tier="APPRENTICE" streakDays={10} achievements={[]} />);
    expect(screen.getByTestId('next-milestone')).toHaveTextContent('14');
  });

  it('should return no milestone when at max', () => {
    render(<TestComponent tier="APPRENTICE" streakDays={100} achievements={[]} />);
    expect(screen.getByTestId('next-milestone')).toHaveTextContent('none');
  });

  it('should handle GRANDMASTER tier', () => {
    render(<TestComponent tier="GRANDMASTER" streakDays={100} achievements={['grandmaster', 'centurion']} />);
    // 3.0 + 0.5 + 0.25 = 3.75
    expect(screen.getByTestId('total-mult')).toHaveTextContent('3.75');
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Reward Boosts Integration', () => {
  it('should render complete boost dashboard', () => {
    render(
      <div>
        <TotalBoostSummary
          tier="MASTER"
          tierMultiplier={2.0}
          streakBonus={0.2}
          achievementBonus={0.1}
          totalMultiplier={2.3}
        />
        <StreakBonus streakDays={30} bonusPercentage={20} />
        <AchievementBonus
          achievements={[{ id: 'centurion', name: 'Centurion', bonus: 10 }]}
          totalBonus={10}
        />
      </div>
    );

    expect(screen.getByTestId('total-boost-summary')).toBeInTheDocument();
    expect(screen.getByTestId('streak-bonus')).toBeInTheDocument();
    expect(screen.getByTestId('achievement-bonus')).toBeInTheDocument();
  });
});
