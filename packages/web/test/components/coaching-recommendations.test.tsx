/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  CoachingRecommendation,
  ImprovementArea,
  CoachingPriority,
  ActionableStep,
} from '../../src/components/coaching-recommendations';
import {
  RecommendationCard,
  ImprovementAreaList,
  CoachingPriorityIndicator,
  ActionableSteps,
  CoachingProgress,
  CoachingDashboard,
  useCoachingRecommendations,
} from '../../src/components/coaching-recommendations';

// =============================================================================
// Test Data
// =============================================================================

const mockSteps: ActionableStep[] = [
  {
    id: 'step-1',
    description: 'Review your recent forecasts with low confidence',
    completed: true,
    category: 'review',
  },
  {
    id: 'step-2',
    description: 'Practice with calibration exercises',
    completed: false,
    category: 'practice',
  },
  {
    id: 'step-3',
    description: 'Analyze your accuracy in politics category',
    completed: false,
    category: 'analysis',
  },
];

const mockHighPriorityRecommendation: CoachingRecommendation = {
  id: 'rec-1',
  title: 'Improve Calibration',
  description: 'Your calibration score has declined 15% over the past month. Focus on aligning your confidence levels with actual outcomes.',
  priority: 'high',
  area: 'calibration',
  areaLabel: 'Calibration',
  impact: 'significant',
  impactScore: 8.5,
  steps: mockSteps,
  metrics: {
    current: 0.72,
    target: 0.85,
    improvement: 18,
  },
  relatedInsights: ['Overconfidence detected in politics category', 'Low confidence in tech predictions'],
  createdAt: Date.now() - 86400000, // 1 day ago
};

const mockMediumPriorityRecommendation: CoachingRecommendation = {
  id: 'rec-2',
  title: 'Increase Forecast Volume',
  description: 'You have been making fewer forecasts recently. Consistency helps improve accuracy over time.',
  priority: 'medium',
  area: 'volume',
  areaLabel: 'Forecast Volume',
  impact: 'moderate',
  impactScore: 5.2,
  steps: [
    { id: 'step-v1', description: 'Set a daily forecasting goal', completed: false, category: 'goal' },
    { id: 'step-v2', description: 'Enable market notifications', completed: true, category: 'setup' },
  ],
  metrics: {
    current: 3,
    target: 7,
    improvement: 133,
  },
  relatedInsights: ['Weekly forecast count dropped from 10 to 3'],
  createdAt: Date.now() - 172800000, // 2 days ago
};

const mockLowPriorityRecommendation: CoachingRecommendation = {
  id: 'rec-3',
  title: 'Diversify Categories',
  description: 'Consider exploring new prediction categories to broaden your expertise.',
  priority: 'low',
  area: 'diversity',
  areaLabel: 'Category Diversity',
  impact: 'minor',
  impactScore: 2.8,
  steps: [
    { id: 'step-d1', description: 'Browse sports markets', completed: false, category: 'explore' },
  ],
  metrics: {
    current: 2,
    target: 4,
    improvement: 100,
  },
  relatedInsights: [],
  createdAt: Date.now(),
};

const mockImprovementAreas: ImprovementArea[] = [
  {
    key: 'calibration',
    label: 'Calibration',
    currentScore: 0.72,
    targetScore: 0.85,
    gap: 0.13,
    trend: 'declining',
    priority: 'high',
  },
  {
    key: 'accuracy',
    label: 'Accuracy',
    currentScore: 0.68,
    targetScore: 0.75,
    gap: 0.07,
    trend: 'stable',
    priority: 'medium',
  },
  {
    key: 'volume',
    label: 'Forecast Volume',
    currentScore: 35,
    targetScore: 50,
    gap: 15,
    trend: 'improving',
    priority: 'low',
  },
];

// =============================================================================
// RecommendationCard Tests
// =============================================================================

describe('RecommendationCard', () => {
  it('renders card container', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByTestId('recommendation-card')).toBeInTheDocument();
  });

  it('displays recommendation title', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByText(/improve calibration/i)).toBeInTheDocument();
  });

  it('shows recommendation description', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByText(/calibration score has declined/i)).toBeInTheDocument();
  });

  it('displays priority indicator', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByTestId('priority-indicator')).toBeInTheDocument();
  });

  it('shows area label', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    // "Calibration" appears in multiple places - use getAllByText
    expect(screen.getAllByText(/calibration/i).length).toBeGreaterThan(0);
  });

  it('displays impact score', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} showImpact />);
    expect(screen.getByTestId('impact-score')).toHaveTextContent('8.5');
  });

  it('shows current and target metrics', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} showMetrics />);
    expect(screen.getByTestId('current-value')).toBeInTheDocument();
    expect(screen.getByTestId('target-value')).toBeInTheDocument();
  });

  it('displays step count', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByText(/3 steps/i)).toBeInTheDocument();
  });

  it('shows completed step count', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByText(/1 completed/i)).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} />);
    expect(screen.getByTestId('recommendation-card')).toHaveClass('ascii-box');
  });

  it('handles expand/collapse', () => {
    render(<RecommendationCard recommendation={mockHighPriorityRecommendation} expandable />);
    const expandButton = screen.getByTestId('expand-button');
    fireEvent.click(expandButton);
    expect(screen.getByTestId('expanded-content')).toBeInTheDocument();
  });
});

// =============================================================================
// CoachingPriorityIndicator Tests
// =============================================================================

describe('CoachingPriorityIndicator', () => {
  it('renders indicator container', () => {
    render(<CoachingPriorityIndicator priority="high" />);
    expect(screen.getByTestId('priority-indicator')).toBeInTheDocument();
  });

  it('displays high priority with red color', () => {
    render(<CoachingPriorityIndicator priority="high" />);
    expect(screen.getByTestId('priority-indicator')).toHaveClass('text-red-400');
  });

  it('displays medium priority with yellow color', () => {
    render(<CoachingPriorityIndicator priority="medium" />);
    expect(screen.getByTestId('priority-indicator')).toHaveClass('text-yellow-400');
  });

  it('displays low priority with green color', () => {
    render(<CoachingPriorityIndicator priority="low" />);
    expect(screen.getByTestId('priority-indicator')).toHaveClass('text-green-400');
  });

  it('shows priority label when requested', () => {
    render(<CoachingPriorityIndicator priority="high" showLabel />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('displays priority icon', () => {
    render(<CoachingPriorityIndicator priority="high" />);
    expect(screen.getByTestId('priority-icon')).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<CoachingPriorityIndicator priority="high" variant="compact" />);
    expect(screen.getByTestId('priority-indicator')).toHaveClass('compact');
  });
});

// =============================================================================
// ImprovementAreaList Tests
// =============================================================================

describe('ImprovementAreaList', () => {
  it('renders list container', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} />);
    expect(screen.getByTestId('improvement-area-list')).toBeInTheDocument();
  });

  it('displays all areas', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} />);
    expect(screen.getByText(/calibration/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/forecast volume/i)).toBeInTheDocument();
  });

  it('shows current scores', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} showScores />);
    expect(screen.getAllByTestId('current-score').length).toBe(3);
  });

  it('displays target scores', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} showScores />);
    expect(screen.getAllByTestId('target-score').length).toBe(3);
  });

  it('shows gap indicator', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} showGap />);
    expect(screen.getAllByTestId('gap-indicator').length).toBe(3);
  });

  it('displays trend direction', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} showTrend />);
    expect(screen.getAllByTestId('trend-indicator').length).toBe(3);
  });

  it('sorts by priority when requested', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} sortBy="priority" />);
    const items = screen.getAllByTestId('area-item');
    // First item should be high priority (calibration)
    expect(items[0]).toHaveTextContent(/calibration/i);
  });

  it('applies terminal styling', () => {
    render(<ImprovementAreaList areas={mockImprovementAreas} />);
    expect(screen.getByTestId('improvement-area-list')).toHaveClass('ascii-box');
  });
});

// =============================================================================
// ActionableSteps Tests
// =============================================================================

describe('ActionableSteps', () => {
  it('renders steps container', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} />);
    expect(screen.getByTestId('actionable-steps')).toBeInTheDocument();
  });

  it('displays all steps', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} />);
    expect(screen.getAllByTestId('step-item').length).toBe(3);
  });

  it('shows step descriptions', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} />);
    expect(screen.getByText(/review your recent forecasts/i)).toBeInTheDocument();
  });

  it('indicates completed steps', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} />);
    const completedStep = screen.getAllByTestId('step-item')[0];
    expect(completedStep).toHaveClass('completed');
  });

  it('calls onToggle when step is clicked', () => {
    let toggledId = '';
    const onToggle = (id: string) => { toggledId = id; };
    render(<ActionableSteps steps={mockSteps} onToggle={onToggle} />);

    fireEvent.click(screen.getAllByTestId('step-checkbox')[1]!);
    expect(toggledId).toBe('step-2');
  });

  it('shows completion progress', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} showProgress />);
    expect(screen.getByTestId('completion-progress')).toHaveTextContent('1/3');
  });

  it('groups steps by category when requested', () => {
    render(<ActionableSteps steps={mockSteps} onToggle={() => {}} groupByCategory />);
    expect(screen.getByTestId('category-review')).toBeInTheDocument();
    expect(screen.getByTestId('category-practice')).toBeInTheDocument();
  });
});

// =============================================================================
// CoachingProgress Tests
// =============================================================================

describe('CoachingProgress', () => {
  it('renders progress container', () => {
    render(
      <CoachingProgress
        totalRecommendations={5}
        completedRecommendations={2}
        totalSteps={15}
        completedSteps={8}
      />
    );
    expect(screen.getByTestId('coaching-progress')).toBeInTheDocument();
  });

  it('displays recommendation progress', () => {
    render(
      <CoachingProgress
        totalRecommendations={5}
        completedRecommendations={2}
        totalSteps={15}
        completedSteps={8}
      />
    );
    expect(screen.getByTestId('recommendation-progress')).toHaveTextContent('2/5');
  });

  it('shows step progress', () => {
    render(
      <CoachingProgress
        totalRecommendations={5}
        completedRecommendations={2}
        totalSteps={15}
        completedSteps={8}
      />
    );
    expect(screen.getByTestId('step-progress')).toHaveTextContent('8/15');
  });

  it('displays progress percentage', () => {
    render(
      <CoachingProgress
        totalRecommendations={5}
        completedRecommendations={2}
        totalSteps={15}
        completedSteps={8}
      />
    );
    expect(screen.getByTestId('progress-percentage')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(
      <CoachingProgress
        totalRecommendations={5}
        completedRecommendations={2}
        totalSteps={15}
        completedSteps={8}
      />
    );
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });
});

// =============================================================================
// CoachingDashboard Tests
// =============================================================================

describe('CoachingDashboard', () => {
  it('renders dashboard container', () => {
    render(<CoachingDashboard userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('coaching-dashboard')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CoachingDashboard userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('displays dashboard title', () => {
    render(<CoachingDashboard userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByText(/coaching/i)).toBeInTheDocument();
  });

  it('applies terminal styling', () => {
    render(<CoachingDashboard userAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('coaching-dashboard')).toHaveClass('ascii-box');
  });
});

// =============================================================================
// useCoachingRecommendations Hook Tests
// =============================================================================

describe('useCoachingRecommendations', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      recommendations,
      improvementAreas,
      isLoading,
      error,
      highPriorityCount,
      completedStepsCount,
      totalStepsCount,
    } = useCoachingRecommendations(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="recommendations-count">{recommendations.length}</div>
        <div data-testid="areas-count">{improvementAreas.length}</div>
        <div data-testid="high-priority-count">{highPriorityCount}</div>
        <div data-testid="completed-steps">{completedStepsCount}</div>
        <div data-testid="total-steps">{totalStepsCount}</div>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads recommendations on mount', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('recommendations-count')).not.toHaveTextContent('0');
  });

  it('handles invalid address', async () => {
    render(<TestComponent address="0xinvalid" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('provides improvement areas', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('areas-count')).not.toHaveTextContent('0');
  });

  it('counts high priority recommendations', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('high-priority-count')).toBeInTheDocument();
  });

  it('tracks step completion', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('completed-steps')).toBeInTheDocument();
    expect(screen.getByTestId('total-steps')).toBeInTheDocument();
  });
});
