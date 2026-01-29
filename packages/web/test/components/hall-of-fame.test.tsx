/**
 * Hall of Fame Tests
 * TDD tests for showcasing top performers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  FeaturedForecaster,
  LegendHighlight,
  HallOfFameGrid,
  HallOfFameHeader,
  HistoricalChampion,
  HallOfFamePeriodSelector,
} from '@/components/hall-of-fame';
import type {
  FeaturedForecasterData,
  HistoricalChampionData,
  HallOfFamePeriod,
} from '@/components/hall-of-fame';

// =============================================================================
// Test Data
// =============================================================================

const mockGrandmaster: FeaturedForecasterData = {
  userId: 'gm-001',
  displayName: 'OracleVision',
  tier: 'GRANDMASTER',
  rank: 1,
  compositeScore: 9850,
  brierScore: 0.08,
  calibrationScore: 0.96,
  totalForecasts: 1250,
  streakDays: 180,
  bio: 'Specializing in geopolitical forecasts with a focus on Eastern European events.',
  achievements: ['centurion', 'perfect-week', 'grandmaster'],
  joinedAt: '2023-01-15',
  featuredReason: 'Top performer for 6 consecutive months',
};

const mockMaster: FeaturedForecasterData = {
  userId: 'master-001',
  displayName: 'PredictorPrime',
  tier: 'MASTER',
  rank: 2,
  compositeScore: 8920,
  brierScore: 0.12,
  calibrationScore: 0.91,
  totalForecasts: 850,
  streakDays: 45,
  bio: 'Technology and crypto market specialist.',
  achievements: ['month-streak', 'accuracy-elite'],
  joinedAt: '2023-06-20',
};

const mockExpert: FeaturedForecasterData = {
  userId: 'expert-001',
  displayName: 'InsightSeeker',
  tier: 'EXPERT',
  rank: 3,
  compositeScore: 7500,
  brierScore: 0.18,
  calibrationScore: 0.85,
  totalForecasts: 420,
  streakDays: 21,
  achievements: ['rising-star'],
  joinedAt: '2024-01-10',
};

const mockHistoricalChampion: HistoricalChampionData = {
  userId: 'champ-2023',
  displayName: 'LegacyOracle',
  tier: 'GRANDMASTER',
  period: '2023',
  periodLabel: '2023 Champion',
  finalRank: 1,
  compositeScore: 9920,
  brierScore: 0.07,
  totalForecasts: 1500,
  notableAchievement: 'Highest accuracy in platform history',
};

const mockFeaturedForecasters: FeaturedForecasterData[] = [
  mockGrandmaster,
  mockMaster,
  mockExpert,
];

// =============================================================================
// FeaturedForecaster Tests
// =============================================================================

describe('FeaturedForecaster', () => {
  it('should render forecaster card', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('featured-forecaster')).toBeInTheDocument();
  });

  it('should display forecaster name', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-name')).toHaveTextContent('OracleVision');
  });

  it('should display rank', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-rank')).toHaveTextContent('#1');
  });

  it('should display tier badge', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-tier')).toHaveTextContent('GRANDMASTER');
  });

  it('should display composite score', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-score')).toHaveTextContent('9850');
  });

  it('should display Brier score', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-brier')).toHaveTextContent('0.08');
  });

  it('should display calibration score as percentage', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-calibration')).toHaveTextContent('96%');
  });

  it('should display forecast count', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-forecasts')).toHaveTextContent('1250');
  });

  it('should display streak if active', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-streak')).toHaveTextContent('180');
  });

  it('should display bio if provided', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-bio')).toHaveTextContent(/geopolitical forecasts/);
  });

  it('should not display bio section if not provided', () => {
    const noBio = { ...mockExpert, bio: undefined };
    render(<FeaturedForecaster data={noBio} />);
    expect(screen.queryByTestId('forecaster-bio')).not.toBeInTheDocument();
  });

  it('should display achievements', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('forecaster-achievements')).toBeInTheDocument();
  });

  it('should display featured reason for top performers', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('featured-reason')).toHaveTextContent(/6 consecutive months/);
  });

  it('should apply GRANDMASTER styling', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    const card = screen.getByTestId('featured-forecaster');
    expect(card).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FeaturedForecaster data={mockGrandmaster} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('featured-forecaster'));
    expect(onClick).toHaveBeenCalledWith('gm-001');
  });

  it('should show view profile button', () => {
    render(<FeaturedForecaster data={mockGrandmaster} />);
    expect(screen.getByTestId('view-profile-button')).toBeInTheDocument();
  });
});

// =============================================================================
// LegendHighlight Tests
// =============================================================================

describe('LegendHighlight', () => {
  it('should render legend container', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    expect(screen.getByTestId('legend-highlight')).toBeInTheDocument();
  });

  it('should display legend title', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    expect(screen.getByText(/LEGEND/i)).toBeInTheDocument();
  });

  it('should display large tier emoji', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    expect(screen.getByTestId('legend-emoji')).toHaveTextContent('👁️');
  });

  it('should display forecaster name prominently', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    const name = screen.getByTestId('legend-name');
    expect(name).toHaveTextContent('OracleVision');
  });

  it('should display key stats', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    expect(screen.getByTestId('legend-stats')).toBeInTheDocument();
  });

  it('should show glow effect for GRANDMASTER', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    const highlight = screen.getByTestId('legend-highlight');
    expect(highlight).toHaveClass('shadow-cyan-300/20');
  });

  it('should display achievement count', () => {
    render(<LegendHighlight data={mockGrandmaster} />);
    expect(screen.getByTestId('legend-achievement-count')).toHaveTextContent('3');
  });

  it('should not render for non-GRANDMASTER tier', () => {
    render(<LegendHighlight data={mockMaster} />);
    expect(screen.queryByTestId('legend-highlight')).not.toBeInTheDocument();
  });
});

// =============================================================================
// HallOfFameGrid Tests
// =============================================================================

describe('HallOfFameGrid', () => {
  it('should render grid container', () => {
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} />);
    expect(screen.getByTestId('hall-of-fame-grid')).toBeInTheDocument();
  });

  it('should render all forecasters', () => {
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} />);
    const cards = screen.getAllByTestId('featured-forecaster');
    expect(cards).toHaveLength(3);
  });

  it('should highlight first place forecaster', () => {
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} />);
    const firstPlace = screen.getAllByTestId('featured-forecaster')[0];
    expect(firstPlace).toHaveAttribute('data-featured', 'true');
  });

  it('should show legend highlight for GRANDMASTER in first place', () => {
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} showLegend />);
    expect(screen.getByTestId('legend-highlight')).toBeInTheDocument();
  });

  it('should show empty state when no forecasters', () => {
    render(<HallOfFameGrid forecasters={[]} />);
    expect(screen.getByTestId('hall-of-fame-empty')).toBeInTheDocument();
  });

  it('should call onForecasterClick when forecaster clicked', () => {
    const onClick = vi.fn();
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} onForecasterClick={onClick} />);
    fireEvent.click(screen.getAllByTestId('featured-forecaster')[0]!);
    expect(onClick).toHaveBeenCalledWith('gm-001');
  });

  it('should apply correct grid layout', () => {
    render(<HallOfFameGrid forecasters={mockFeaturedForecasters} />);
    const grid = screen.getByTestId('hall-of-fame-grid');
    // Container uses space-y-6 for vertical spacing, inner div has grid
    expect(grid).toHaveClass('space-y-6');
  });
});

// =============================================================================
// HallOfFameHeader Tests
// =============================================================================

describe('HallOfFameHeader', () => {
  it('should render header container', () => {
    render(<HallOfFameHeader />);
    expect(screen.getByTestId('hall-of-fame-header')).toBeInTheDocument();
  });

  it('should display title', () => {
    render(<HallOfFameHeader />);
    expect(screen.getByText(/HALL OF FAME/i)).toBeInTheDocument();
  });

  it('should display subtitle', () => {
    render(<HallOfFameHeader />);
    expect(screen.getByTestId('hall-of-fame-subtitle')).toBeInTheDocument();
  });

  it('should display trophy icon', () => {
    render(<HallOfFameHeader />);
    expect(screen.getByTestId('header-trophy')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<HallOfFameHeader className="custom-class" />);
    const header = screen.getByTestId('hall-of-fame-header');
    expect(header).toHaveClass('custom-class');
  });
});

// =============================================================================
// HistoricalChampion Tests
// =============================================================================

describe('HistoricalChampion', () => {
  it('should render champion card', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('historical-champion')).toBeInTheDocument();
  });

  it('should display period label', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-period')).toHaveTextContent('2023 Champion');
  });

  it('should display champion name', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-name')).toHaveTextContent('LegacyOracle');
  });

  it('should display tier', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-tier')).toHaveTextContent('GRANDMASTER');
  });

  it('should display final score', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-score')).toHaveTextContent('9920');
  });

  it('should display notable achievement', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-achievement')).toHaveTextContent(/Highest accuracy/);
  });

  it('should apply tier-specific styling', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    const card = screen.getByTestId('historical-champion');
    expect(card).toHaveAttribute('data-tier', 'GRANDMASTER');
  });

  it('should show trophy for champion', () => {
    render(<HistoricalChampion data={mockHistoricalChampion} />);
    expect(screen.getByTestId('champion-trophy')).toBeInTheDocument();
  });
});

// =============================================================================
// HallOfFamePeriodSelector Tests
// =============================================================================

describe('HallOfFamePeriodSelector', () => {
  const periods: HallOfFamePeriod[] = [
    { id: 'all-time', label: 'All Time' },
    { id: 'yearly', label: '2024' },
    { id: 'monthly', label: 'January 2024' },
  ];

  it('should render selector container', () => {
    render(
      <HallOfFamePeriodSelector
        periods={periods}
        selectedPeriod="all-time"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByTestId('period-selector')).toBeInTheDocument();
  });

  it('should display all period options', () => {
    render(
      <HallOfFamePeriodSelector
        periods={periods}
        selectedPeriod="all-time"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByText('All Time')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('should highlight selected period', () => {
    render(
      <HallOfFamePeriodSelector
        periods={periods}
        selectedPeriod="yearly"
        onPeriodChange={() => {}}
      />
    );
    const selected = screen.getByTestId('period-option-yearly');
    expect(selected).toHaveAttribute('data-selected', 'true');
  });

  it('should call onPeriodChange when period clicked', () => {
    const onChange = vi.fn();
    render(
      <HallOfFamePeriodSelector
        periods={periods}
        selectedPeriod="all-time"
        onPeriodChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('2024'));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });

  it('should not call onPeriodChange when already selected period clicked', () => {
    const onChange = vi.fn();
    render(
      <HallOfFamePeriodSelector
        periods={periods}
        selectedPeriod="all-time"
        onPeriodChange={onChange}
      />
    );
    fireEvent.click(screen.getByText('All Time'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Hall of Fame Integration', () => {
  it('should display complete hall of fame layout', () => {
    render(
      <>
        <HallOfFameHeader />
        <HallOfFameGrid forecasters={mockFeaturedForecasters} showLegend />
      </>
    );

    expect(screen.getByTestId('hall-of-fame-header')).toBeInTheDocument();
    expect(screen.getByTestId('hall-of-fame-grid')).toBeInTheDocument();
    expect(screen.getByTestId('legend-highlight')).toBeInTheDocument();
  });

  it('should sort forecasters by rank', () => {
    const unsorted = [mockExpert, mockGrandmaster, mockMaster];
    render(<HallOfFameGrid forecasters={unsorted} />);

    const cards = screen.getAllByTestId('featured-forecaster');
    expect(cards[0]).toHaveAttribute('data-tier', 'GRANDMASTER');
  });
});
