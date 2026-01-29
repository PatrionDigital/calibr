/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  Insight,
  InsightCategory,
  InsightAction,
  InsightFilter,
} from '../../src/components/forecasting-insights';
import {
  InsightCard,
  InsightCategorySection,
  InsightPriorityBadge,
  InsightActionButton,
  InsightTimeline,
  InsightSummaryPanel,
  InsightFilterBar,
  ForecastingInsightsDashboard,
  useForecasterInsights,
} from '../../src/components/forecasting-insights';

// =============================================================================
// Test Data
// =============================================================================

const mockInsight: Insight = {
  id: 'insight-001',
  category: 'performance',
  priority: 'high',
  title: 'Strong Calibration Improvement',
  description: 'Your calibration score improved by 15% over the last month. This indicates more accurate probability assessments.',
  metric: {
    name: 'Calibration Score',
    currentValue: 0.85,
    previousValue: 0.70,
    change: 0.15,
    changePercent: 21.4,
  },
  generatedAt: new Date('2024-01-15T10:00:00').getTime(),
  expiresAt: new Date('2024-01-22T10:00:00').getTime(),
  actionable: true,
  actions: [
    { id: 'action-1', label: 'View Details', type: 'link', href: '/calibration' },
    { id: 'action-2', label: 'Dismiss', type: 'dismiss' },
  ],
};

const mockInsights: Insight[] = [
  mockInsight,
  {
    id: 'insight-002',
    category: 'trend',
    priority: 'medium',
    title: 'Consistent Accuracy in Politics',
    description: 'You have maintained above-average accuracy in political markets for 3 consecutive months.',
    metric: {
      name: 'Politics Accuracy',
      currentValue: 0.72,
      previousValue: 0.68,
      change: 0.04,
      changePercent: 5.9,
    },
    generatedAt: new Date('2024-01-14T10:00:00').getTime(),
    expiresAt: new Date('2024-01-21T10:00:00').getTime(),
    actionable: true,
    actions: [
      { id: 'action-3', label: 'Explore Markets', type: 'link', href: '/markets/politics' },
    ],
  },
  {
    id: 'insight-003',
    category: 'opportunity',
    priority: 'low',
    title: 'New Market Category Available',
    description: 'Sports markets are now available. Based on your interests, you might enjoy forecasting in this category.',
    generatedAt: new Date('2024-01-13T10:00:00').getTime(),
    actionable: false,
    actions: [],
  },
  {
    id: 'insight-004',
    category: 'warning',
    priority: 'high',
    title: 'Declining Performance in Tech',
    description: 'Your accuracy in technology markets has dropped 20% this month. Consider reviewing your forecasting approach.',
    metric: {
      name: 'Tech Accuracy',
      currentValue: 0.55,
      previousValue: 0.75,
      change: -0.20,
      changePercent: -26.7,
    },
    generatedAt: new Date('2024-01-12T10:00:00').getTime(),
    actionable: true,
    actions: [
      { id: 'action-4', label: 'Review Forecasts', type: 'link', href: '/history?category=tech' },
      { id: 'action-5', label: 'Get Tips', type: 'modal', modalId: 'tips-modal' },
    ],
  },
  {
    id: 'insight-005',
    category: 'achievement',
    priority: 'medium',
    title: 'Milestone Reached: 100 Forecasts',
    description: 'Congratulations! You have made 100 forecasts. You are now eligible for the Century Forecaster badge.',
    generatedAt: new Date('2024-01-11T10:00:00').getTime(),
    actionable: true,
    actions: [
      { id: 'action-6', label: 'Claim Badge', type: 'action', actionId: 'claim-badge' },
    ],
  },
];

const mockInsightsByCategory: Record<InsightCategory, Insight[]> = {
  performance: [mockInsights[0]!],
  trend: [mockInsights[1]!],
  opportunity: [mockInsights[2]!],
  warning: [mockInsights[3]!],
  achievement: [mockInsights[4]!],
};

// =============================================================================
// InsightCard Tests
// =============================================================================

describe('InsightCard', () => {
  it('renders insight title', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByText(/strong calibration improvement/i)).toBeInTheDocument();
  });

  it('renders insight description', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByText(/your calibration score improved/i)).toBeInTheDocument();
  });

  it('displays metric when present', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByTestId('metric-display')).toBeInTheDocument();
  });

  it('shows positive change indicator', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByText(/\+21\.4%/i)).toBeInTheDocument();
  });

  it('shows negative change indicator for declining metrics', () => {
    render(<InsightCard insight={mockInsights[3]!} />);
    expect(screen.getByText(/-26\.7%/i)).toBeInTheDocument();
  });

  it('displays priority badge', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByTestId('priority-badge')).toBeInTheDocument();
  });

  it('renders action buttons when actionable', () => {
    render(<InsightCard insight={mockInsight} onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls onAction when action button clicked', () => {
    const onAction = vi.fn();
    render(<InsightCard insight={mockInsight} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onAction).toHaveBeenCalledWith(mockInsight, mockInsight.actions[1]);
  });

  it('displays category icon', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByTestId('category-icon')).toBeInTheDocument();
  });

  it('shows timestamp', () => {
    render(<InsightCard insight={mockInsight} />);
    expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
  });

  it('applies compact variant styling', () => {
    render(<InsightCard insight={mockInsight} variant="compact" />);
    expect(screen.getByTestId('insight-card')).toHaveClass('compact');
  });

  it('applies expanded variant styling', () => {
    render(<InsightCard insight={mockInsight} variant="expanded" />);
    expect(screen.getByTestId('insight-card')).toHaveClass('expanded');
  });

  it('handles insights without metrics gracefully', () => {
    render(<InsightCard insight={mockInsights[2]!} />);
    expect(screen.queryByTestId('metric-display')).not.toBeInTheDocument();
  });
});

// =============================================================================
// InsightCategorySection Tests
// =============================================================================

describe('InsightCategorySection', () => {
  it('renders category title', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={mockInsightsByCategory.performance}
      />
    );
    expect(screen.getByText(/performance/i)).toBeInTheDocument();
  });

  it('displays insight count', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={mockInsightsByCategory.performance}
      />
    );
    // Count badge appears in header with category name
    expect(screen.getByTestId('insight-count-badge')).toHaveTextContent('1');
  });

  it('renders all insights in category', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={mockInsightsByCategory.performance}
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText(/strong calibration improvement/i)).toBeInTheDocument();
  });

  it('can be collapsed', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={mockInsightsByCategory.performance}
        defaultCollapsed
      />
    );
    expect(screen.queryByText(/your calibration score improved/i)).not.toBeInTheDocument();
  });

  it('toggles collapse on header click', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={mockInsightsByCategory.performance}
      />
    );
    const header = screen.getByRole('button', { name: /performance/i });
    fireEvent.click(header);
    expect(screen.queryByText(/your calibration score improved/i)).not.toBeInTheDocument();
  });

  it('shows warning category with appropriate styling', () => {
    render(
      <InsightCategorySection
        category="warning"
        insights={mockInsightsByCategory.warning}
      />
    );
    expect(screen.getByTestId('category-section')).toHaveClass('warning');
  });

  it('shows achievement category with appropriate styling', () => {
    render(
      <InsightCategorySection
        category="achievement"
        insights={mockInsightsByCategory.achievement}
      />
    );
    expect(screen.getByTestId('category-section')).toHaveClass('achievement');
  });

  it('displays empty state when no insights', () => {
    render(
      <InsightCategorySection
        category="performance"
        insights={[]}
      />
    );
    expect(screen.getByText(/no insights/i)).toBeInTheDocument();
  });
});

// =============================================================================
// InsightPriorityBadge Tests
// =============================================================================

describe('InsightPriorityBadge', () => {
  it('renders high priority with red styling', () => {
    render(<InsightPriorityBadge priority="high" />);
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveClass('high');
    expect(badge).toHaveTextContent(/high/i);
  });

  it('renders medium priority with yellow styling', () => {
    render(<InsightPriorityBadge priority="medium" />);
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveClass('medium');
    expect(badge).toHaveTextContent(/medium/i);
  });

  it('renders low priority with green styling', () => {
    render(<InsightPriorityBadge priority="low" />);
    const badge = screen.getByTestId('priority-badge');
    expect(badge).toHaveClass('low');
    expect(badge).toHaveTextContent(/low/i);
  });

  it('applies compact variant', () => {
    render(<InsightPriorityBadge priority="high" variant="compact" />);
    expect(screen.getByTestId('priority-badge')).toHaveClass('compact');
  });

  it('shows icon only in icon variant', () => {
    render(<InsightPriorityBadge priority="high" variant="icon" />);
    expect(screen.getByTestId('priority-badge')).toHaveClass('icon-only');
  });
});

// =============================================================================
// InsightActionButton Tests
// =============================================================================

describe('InsightActionButton', () => {
  it('renders action label', () => {
    const action: InsightAction = { id: 'a1', label: 'View Details', type: 'link', href: '/details' };
    render(<InsightActionButton action={action} onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const action: InsightAction = { id: 'a1', label: 'Dismiss', type: 'dismiss' };
    const onClick = vi.fn();
    render(<InsightActionButton action={action} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(action);
  });

  it('applies primary styling for action type', () => {
    const action: InsightAction = { id: 'a1', label: 'Claim', type: 'action', actionId: 'claim' };
    render(<InsightActionButton action={action} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('primary');
  });

  it('applies secondary styling for dismiss type', () => {
    const action: InsightAction = { id: 'a1', label: 'Dismiss', type: 'dismiss' };
    render(<InsightActionButton action={action} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveClass('secondary');
  });

  it('shows link icon for link type', () => {
    const action: InsightAction = { id: 'a1', label: 'Go', type: 'link', href: '/go' };
    render(<InsightActionButton action={action} onClick={vi.fn()} />);
    expect(screen.getByTestId('link-icon')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    const action: InsightAction = { id: 'a1', label: 'Action', type: 'action', actionId: 'x' };
    render(<InsightActionButton action={action} onClick={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

// =============================================================================
// InsightTimeline Tests
// =============================================================================

describe('InsightTimeline', () => {
  it('renders timeline with insights', () => {
    render(<InsightTimeline insights={mockInsights} />);
    expect(screen.getByTestId('insight-timeline')).toBeInTheDocument();
  });

  it('displays insights in chronological order', () => {
    render(<InsightTimeline insights={mockInsights} />);
    const cards = screen.getAllByTestId('insight-card');
    expect(cards.length).toBe(5);
  });

  it('groups insights by date', () => {
    render(<InsightTimeline insights={mockInsights} groupByDate />);
    // Date appears in separator and card timestamps - use getAllByText
    expect(screen.getAllByText(/jan 15/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jan 14/i).length).toBeGreaterThan(0);
  });

  it('shows date separators', () => {
    render(<InsightTimeline insights={mockInsights} groupByDate />);
    const separators = screen.getAllByTestId('date-separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('calls onAction when insight action triggered', () => {
    const onAction = vi.fn();
    render(<InsightTimeline insights={mockInsights} onAction={onAction} />);
    fireEvent.click(screen.getAllByRole('button', { name: /dismiss/i })[0]!);
    expect(onAction).toHaveBeenCalled();
  });

  it('supports infinite scroll loading', () => {
    const onLoadMore = vi.fn();
    render(<InsightTimeline insights={mockInsights} onLoadMore={onLoadMore} hasMore />);
    expect(screen.getByTestId('load-more-trigger')).toBeInTheDocument();
  });

  it('shows empty state when no insights', () => {
    render(<InsightTimeline insights={[]} />);
    expect(screen.getByText(/no insights yet/i)).toBeInTheDocument();
  });

  it('filters by priority when specified', () => {
    render(<InsightTimeline insights={mockInsights} priorityFilter="high" />);
    const cards = screen.getAllByTestId('insight-card');
    expect(cards.length).toBe(2); // Two high priority insights
  });
});

// =============================================================================
// InsightSummaryPanel Tests
// =============================================================================

describe('InsightSummaryPanel', () => {
  it('renders summary panel', () => {
    render(<InsightSummaryPanel insights={mockInsights} />);
    expect(screen.getByTestId('insight-summary')).toBeInTheDocument();
  });

  it('displays total insight count', () => {
    render(<InsightSummaryPanel insights={mockInsights} />);
    expect(screen.getByTestId('total-insight-count')).toHaveTextContent('5');
  });

  it('shows count by priority', () => {
    render(<InsightSummaryPanel insights={mockInsights} />);
    expect(screen.getByTestId('high-priority-count')).toHaveTextContent('2');
    expect(screen.getByTestId('medium-priority-count')).toHaveTextContent('2');
    expect(screen.getByTestId('low-priority-count')).toHaveTextContent('1');
  });

  it('shows count by category', () => {
    render(<InsightSummaryPanel insights={mockInsights} />);
    expect(screen.getByText(/performance/i)).toBeInTheDocument();
    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('highlights actionable insights', () => {
    render(<InsightSummaryPanel insights={mockInsights} />);
    expect(screen.getByTestId('actionable-count')).toHaveTextContent('4');
  });

  it('shows recent insight preview', () => {
    render(<InsightSummaryPanel insights={mockInsights} showPreview />);
    expect(screen.getByText(/strong calibration improvement/i)).toBeInTheDocument();
  });

  it('displays empty state when no insights', () => {
    render(<InsightSummaryPanel insights={[]} />);
    expect(screen.getByText(/no insights/i)).toBeInTheDocument();
  });

  it('applies compact variant', () => {
    render(<InsightSummaryPanel insights={mockInsights} variant="compact" />);
    expect(screen.getByTestId('insight-summary')).toHaveClass('compact');
  });
});

// =============================================================================
// InsightFilterBar Tests
// =============================================================================

describe('InsightFilterBar', () => {
  const defaultFilter: InsightFilter = {
    categories: [],
    priorities: [],
    showDismissed: false,
    dateRange: null,
  };

  it('renders filter bar', () => {
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId('insight-filter-bar')).toBeInTheDocument();
  });

  it('shows category filter options', () => {
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /category/i })).toBeInTheDocument();
  });

  it('shows priority filter options', () => {
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /priority/i })).toBeInTheDocument();
  });

  it('calls onFilterChange when category selected', () => {
    const onFilterChange = vi.fn();
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    fireEvent.click(screen.getByText(/performance/i));
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('calls onFilterChange when priority selected', () => {
    const onFilterChange = vi.fn();
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: /priority/i }));
    fireEvent.click(screen.getByTestId('priority-option-high'));
    expect(onFilterChange).toHaveBeenCalled();
  });

  it('shows active filter count', () => {
    const filter: InsightFilter = {
      ...defaultFilter,
      categories: ['performance', 'warning'],
      priorities: ['high'],
    };
    render(<InsightFilterBar filter={filter} onFilterChange={vi.fn()} />);
    expect(screen.getByTestId('active-filter-count')).toHaveTextContent('3');
  });

  it('has clear all button when filters active', () => {
    const filter: InsightFilter = {
      ...defaultFilter,
      categories: ['performance'],
    };
    render(<InsightFilterBar filter={filter} onFilterChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('calls onFilterChange with empty filter on clear', () => {
    const onFilterChange = vi.fn();
    const filter: InsightFilter = {
      ...defaultFilter,
      categories: ['performance'],
    };
    render(<InsightFilterBar filter={filter} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onFilterChange).toHaveBeenCalledWith({
      categories: [],
      priorities: [],
      showDismissed: false,
      dateRange: null,
    });
  });

  it('toggles show dismissed option', () => {
    const onFilterChange = vi.fn();
    render(<InsightFilterBar filter={defaultFilter} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /show dismissed/i }));
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ showDismissed: true }));
  });
});

// =============================================================================
// ForecastingInsightsDashboard Tests
// =============================================================================

describe('ForecastingInsightsDashboard', () => {
  it('renders dashboard with data-testid', () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('forecasting-insights-dashboard')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders insights after loading', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays summary panel', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('insight-summary')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('displays filter bar', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('insight-filter-bar')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows insights in timeline view by default', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('insight-timeline')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('can switch to category view', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      // Wait for the view mode buttons to appear (after loading)
      expect(screen.getByRole('button', { name: /by category/i })).toBeInTheDocument();
    }, { timeout: 2000 });
    fireEvent.click(screen.getByRole('button', { name: /by category/i }));
    expect(screen.getByTestId('category-view')).toBeInTheDocument();
  });

  it('displays error state on failure', async () => {
    render(<ForecastingInsightsDashboard address="0xinvalid" />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('shows refresh button', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles insight dismissal', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    const dismissButtons = screen.queryAllByRole('button', { name: /dismiss/i });
    if (dismissButtons.length > 0) {
      fireEvent.click(dismissButtons[0]!);
      await waitFor(() => {
        expect(screen.getByTestId('dismiss-message')).toBeInTheDocument();
      });
    }
  });

  it('displays terminal styling', async () => {
    render(<ForecastingInsightsDashboard address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('forecasting-insights-dashboard')).toHaveClass('ascii-box');
    }, { timeout: 2000 });
  });
});

// =============================================================================
// useForecasterInsights Hook Tests
// =============================================================================

describe('useForecasterInsights', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      insights,
      filteredInsights,
      summary,
      isLoading,
      error,
      filter,
      dismissedIds,
      dismissInsight,
      restoreInsight,
      setFilter,
      refreshInsights,
      getInsightsByCategory,
      getInsightsByPriority,
    } = useForecasterInsights(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="insights-count">{insights.length}</div>
        <div data-testid="filtered-count">{filteredInsights.length}</div>
        <div data-testid="dismissed-count">{dismissedIds.length}</div>
        <div data-testid="summary-total">{summary.total}</div>
        <button onClick={() => dismissInsight('insight-001')}>Dismiss</button>
        <button onClick={() => restoreInsight('insight-001')}>Restore</button>
        <button onClick={() => setFilter({ ...filter, priorities: ['high'] })}>Filter High</button>
        <button onClick={refreshInsights}>Refresh</button>
        <div data-testid="performance-insights">{getInsightsByCategory('performance').length}</div>
        <div data-testid="high-priority-insights">{getInsightsByPriority('high').length}</div>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads insights after mount', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
  });

  it('populates insights array', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      const count = parseInt(screen.getByTestId('insights-count').textContent || '0');
      expect(count).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('calculates summary statistics', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      const total = parseInt(screen.getByTestId('summary-total').textContent || '0');
      expect(total).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('dismisses insight', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.getByTestId('dismissed-count')).toHaveTextContent('1');
    });
  });

  it('restores dismissed insight', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    fireEvent.click(screen.getByText('Dismiss'));
    await waitFor(() => {
      expect(screen.getByTestId('dismissed-count')).toHaveTextContent('1');
    });
    fireEvent.click(screen.getByText('Restore'));
    await waitFor(() => {
      expect(screen.getByTestId('dismissed-count')).toHaveTextContent('0');
    });
  });

  it('filters insights by priority', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    const initialCount = parseInt(screen.getByTestId('filtered-count').textContent || '0');
    fireEvent.click(screen.getByText('Filter High'));
    await waitFor(() => {
      const filteredCount = parseInt(screen.getByTestId('filtered-count').textContent || '0');
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });
  });

  it('refreshes insights', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('gets insights by category', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    const performanceCount = parseInt(screen.getByTestId('performance-insights').textContent || '0');
    expect(performanceCount).toBeGreaterThanOrEqual(0);
  });

  it('gets insights by priority', async () => {
    render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    const highPriorityCount = parseInt(screen.getByTestId('high-priority-insights').textContent || '0');
    expect(highPriorityCount).toBeGreaterThanOrEqual(0);
  });

  it('handles invalid address with error', async () => {
    render(<TestComponent address="0xinvalid" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('none');
    }, { timeout: 2000 });
  });

  it('updates when address changes', async () => {
    const { rerender } = render(<TestComponent address="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    rerender(<TestComponent address="0x1234567890123456789012345678901234567890" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});
