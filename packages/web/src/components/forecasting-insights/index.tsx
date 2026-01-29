'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type InsightCategory = 'performance' | 'trend' | 'opportunity' | 'warning' | 'achievement';
export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightActionType = 'link' | 'dismiss' | 'action' | 'modal';

export interface InsightAction {
  id: string;
  label: string;
  type: InsightActionType;
  href?: string;
  actionId?: string;
  modalId?: string;
}

export interface InsightMetric {
  name: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  metric?: InsightMetric;
  generatedAt: number;
  expiresAt?: number;
  actionable: boolean;
  actions: InsightAction[];
}

export interface InsightFilter {
  categories: InsightCategory[];
  priorities: InsightPriority[];
  showDismissed: boolean;
  dateRange: { start: number; end: number } | null;
}

export interface InsightSummary {
  total: number;
  byCategory: Record<InsightCategory, number>;
  byPriority: Record<InsightPriority, number>;
  actionable: number;
  dismissed: number;
}

// =============================================================================
// InsightPriorityBadge Component
// =============================================================================

export interface InsightPriorityBadgeProps {
  priority: InsightPriority;
  variant?: 'default' | 'compact' | 'icon';
}

export function InsightPriorityBadge({ priority, variant = 'default' }: InsightPriorityBadgeProps) {
  const priorityConfig = {
    high: { label: 'High', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    medium: { label: 'Medium', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    low: { label: 'Low', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  };

  const config = priorityConfig[priority];
  const variantClasses = {
    default: '',
    compact: 'compact text-xs px-1 py-0.5',
    icon: 'icon-only w-2 h-2 rounded-full p-0',
  };

  return (
    <span
      data-testid="priority-badge"
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono border ${config.className} ${priority} ${variantClasses[variant]}`}
    >
      {variant !== 'icon' && config.label}
    </span>
  );
}

// =============================================================================
// InsightActionButton Component
// =============================================================================

export interface InsightActionButtonProps {
  action: InsightAction;
  onClick: (action: InsightAction) => void;
  disabled?: boolean;
}

export function InsightActionButton({ action, onClick, disabled }: InsightActionButtonProps) {
  const isPrimary = action.type === 'action' || action.type === 'modal';
  const isSecondary = action.type === 'dismiss';

  return (
    <button
      onClick={() => onClick(action)}
      disabled={disabled}
      className={`px-3 py-1.5 rounded font-mono text-xs transition-colors ${
        isPrimary
          ? 'primary bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
          : isSecondary
          ? 'secondary bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'
          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {action.type === 'link' && <span data-testid="link-icon" className="mr-1">[→]</span>}
      {action.label}
    </button>
  );
}

// =============================================================================
// InsightCard Component
// =============================================================================

export interface InsightCardProps {
  insight: Insight;
  variant?: 'default' | 'compact' | 'expanded';
  onAction?: (insight: Insight, action: InsightAction) => void;
}

export function InsightCard({ insight, variant = 'default', onAction }: InsightCardProps) {
  const categoryIcons: Record<InsightCategory, string> = {
    performance: '[◆]',
    trend: '[↗]',
    opportunity: '[★]',
    warning: '[!]',
    achievement: '[✓]',
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      data-testid="insight-card"
      className={`ascii-box p-4 ${variant} ${
        insight.category === 'warning' ? 'border-red-500/30' : 'border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span data-testid="category-icon" className="text-blue-400 font-mono">
            {categoryIcons[insight.category]}
          </span>
          <h4 className="font-mono font-bold text-sm">{insight.title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <InsightPriorityBadge priority={insight.priority} variant="compact" />
          <span className="text-xs text-zinc-500 font-mono">{formatDate(insight.generatedAt)}</span>
        </div>
      </div>

      <p className="text-sm text-zinc-400 mb-3 font-mono">{insight.description}</p>

      {insight.metric && (
        <div data-testid="metric-display" className="bg-zinc-800/50 p-3 rounded mb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-mono">{insight.metric.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{(insight.metric.currentValue * 100).toFixed(0)}%</span>
              <span
                className={`text-xs font-mono ${
                  insight.metric.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {insight.metric.changePercent >= 0 ? '+' : ''}
                {insight.metric.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {insight.actionable && insight.actions.length > 0 && onAction && (
        <div className="flex gap-2 flex-wrap">
          {insight.actions.map((action) => (
            <InsightActionButton
              key={action.id}
              action={action}
              onClick={(a) => onAction(insight, a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// InsightCategorySection Component
// =============================================================================

export interface InsightCategorySectionProps {
  category: InsightCategory;
  insights: Insight[];
  defaultCollapsed?: boolean;
  onAction?: (insight: Insight, action: InsightAction) => void;
}

export function InsightCategorySection({
  category,
  insights,
  defaultCollapsed = false,
  onAction,
}: InsightCategorySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const categoryLabels: Record<InsightCategory, string> = {
    performance: 'Performance',
    trend: 'Trends',
    opportunity: 'Opportunities',
    warning: 'Warnings',
    achievement: 'Achievements',
  };

  return (
    <div data-testid="category-section" className={`mb-4 ${category}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-t border border-zinc-700 hover:bg-zinc-800"
        aria-label={categoryLabels[category]}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm">{categoryLabels[category]}</span>
          <span data-testid="insight-count-badge" className="text-xs text-zinc-500 font-mono bg-zinc-700 px-2 py-0.5 rounded">
            {insights.length}
          </span>
        </div>
        <span className="text-zinc-500 font-mono">{isCollapsed ? '[+]' : '[-]'}</span>
      </button>

      {!isCollapsed && (
        <div className="border border-t-0 border-zinc-700 rounded-b p-3 space-y-3">
          {insights.length === 0 ? (
            <p className="text-zinc-500 text-sm font-mono text-center py-4">No insights in this category</p>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} variant="compact" onAction={onAction} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// InsightTimeline Component
// =============================================================================

export interface InsightTimelineProps {
  insights: Insight[];
  groupByDate?: boolean;
  priorityFilter?: InsightPriority;
  onAction?: (insight: Insight, action: InsightAction) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function InsightTimeline({
  insights,
  groupByDate = false,
  priorityFilter,
  onAction,
  onLoadMore,
  hasMore,
}: InsightTimelineProps) {
  const filteredInsights = priorityFilter
    ? insights.filter((i) => i.priority === priorityFilter)
    : insights;

  const sortedInsights = [...filteredInsights].sort((a, b) => b.generatedAt - a.generatedAt);

  const groupedInsights = useMemo(() => {
    if (!groupByDate) return null;
    const groups: Record<string, Insight[]> = {};
    sortedInsights.forEach((insight) => {
      const date = new Date(insight.generatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(insight);
    });
    return groups;
  }, [sortedInsights, groupByDate]);

  if (sortedInsights.length === 0) {
    return (
      <div data-testid="insight-timeline" className="text-center py-8">
        <p className="text-zinc-500 font-mono">No insights yet</p>
        <p className="text-xs text-zinc-600 font-mono mt-2">Check back later for personalized insights</p>
      </div>
    );
  }

  return (
    <div data-testid="insight-timeline" className="space-y-4">
      {groupByDate && groupedInsights ? (
        Object.entries(groupedInsights).map(([date, dateInsights]) => (
          <div key={date}>
            <div data-testid="date-separator" className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-zinc-700" />
              <span className="text-xs text-zinc-500 font-mono">{date}</span>
              <div className="h-px flex-1 bg-zinc-700" />
            </div>
            {dateInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onAction={onAction} />
            ))}
          </div>
        ))
      ) : (
        sortedInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} onAction={onAction} />
        ))
      )}

      {hasMore && onLoadMore && (
        <div data-testid="load-more-trigger" className="text-center py-4">
          <button
            onClick={onLoadMore}
            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded font-mono text-sm hover:bg-zinc-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// InsightSummaryPanel Component
// =============================================================================

export interface InsightSummaryPanelProps {
  insights: Insight[];
  showPreview?: boolean;
  variant?: 'default' | 'compact';
}

export function InsightSummaryPanel({ insights, showPreview, variant = 'default' }: InsightSummaryPanelProps) {
  const summary = useMemo(() => {
    const byCategory: Record<InsightCategory, number> = {
      performance: 0,
      trend: 0,
      opportunity: 0,
      warning: 0,
      achievement: 0,
    };
    const byPriority: Record<InsightPriority, number> = { high: 0, medium: 0, low: 0 };
    let actionable = 0;

    insights.forEach((insight) => {
      byCategory[insight.category]++;
      byPriority[insight.priority]++;
      if (insight.actionable) actionable++;
    });

    return { total: insights.length, byCategory, byPriority, actionable };
  }, [insights]);

  const recentInsight = insights.length > 0
    ? [...insights].sort((a, b) => b.generatedAt - a.generatedAt)[0]
    : null;

  if (insights.length === 0) {
    return (
      <div data-testid="insight-summary" className={`ascii-box p-4 ${variant}`}>
        <p className="text-zinc-500 font-mono text-center">No insights available</p>
      </div>
    );
  }

  return (
    <div data-testid="insight-summary" className={`ascii-box p-4 ${variant}`}>
      <h3 className="font-mono font-bold text-sm mb-3">Insights Summary</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-800/50 p-3 rounded">
          <div data-testid="total-insight-count" className="text-2xl font-mono font-bold text-blue-400">{summary.total}</div>
          <div className="text-xs text-zinc-500 font-mono">Total Insights</div>
        </div>
        <div className="bg-zinc-800/50 p-3 rounded">
          <div data-testid="actionable-count" className="text-2xl font-mono font-bold text-green-400">
            {summary.actionable}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Actionable</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs text-zinc-500 font-mono mb-2">By Priority</h4>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span data-testid="high-priority-count" className="text-sm font-mono">
              {summary.byPriority.high}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span data-testid="medium-priority-count" className="text-sm font-mono">
              {summary.byPriority.medium}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span data-testid="low-priority-count" className="text-sm font-mono">
              {summary.byPriority.low}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs text-zinc-500 font-mono mb-2">By Category</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.byCategory)
            .filter(([, count]) => count > 0)
            .map(([cat, count]) => (
              <span key={cat} className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded">
                {cat}: {count}
              </span>
            ))}
        </div>
      </div>

      {showPreview && recentInsight && (
        <div className="border-t border-zinc-700 pt-3">
          <h4 className="text-xs text-zinc-500 font-mono mb-2">Latest Insight</h4>
          <p className="text-sm font-mono">{recentInsight.title}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// InsightFilterBar Component
// =============================================================================

export interface InsightFilterBarProps {
  filter: InsightFilter;
  onFilterChange: (filter: InsightFilter) => void;
}

export function InsightFilterBar({ filter, onFilterChange }: InsightFilterBarProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const categories: InsightCategory[] = ['performance', 'trend', 'opportunity', 'warning', 'achievement'];
  const priorities: InsightPriority[] = ['high', 'medium', 'low'];

  const activeFilterCount = filter.categories.length + filter.priorities.length;

  const toggleCategory = (cat: InsightCategory) => {
    const newCategories = filter.categories.includes(cat)
      ? filter.categories.filter((c) => c !== cat)
      : [...filter.categories, cat];
    onFilterChange({ ...filter, categories: newCategories });
  };

  const togglePriority = (pri: InsightPriority) => {
    const newPriorities = filter.priorities.includes(pri)
      ? filter.priorities.filter((p) => p !== pri)
      : [...filter.priorities, pri];
    onFilterChange({ ...filter, priorities: newPriorities });
  };

  const clearFilters = () => {
    onFilterChange({
      categories: [],
      priorities: [],
      showDismissed: false,
      dateRange: null,
    });
  };

  return (
    <div data-testid="insight-filter-bar" className="flex items-center gap-3 flex-wrap p-3 bg-zinc-800/30 rounded">
      {/* Category Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setCategoryOpen(!categoryOpen);
            setPriorityOpen(false);
          }}
          className="px-3 py-1.5 bg-zinc-800 rounded font-mono text-sm hover:bg-zinc-700 flex items-center gap-2"
        >
          Category
          <span className="text-zinc-500">[▼]</span>
        </button>
        {categoryOpen && (
          <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`w-full px-3 py-2 text-left font-mono text-sm hover:bg-zinc-700 flex items-center gap-2 ${
                  filter.categories.includes(cat) ? 'text-blue-400' : ''
                }`}
              >
                {filter.categories.includes(cat) && <span>[✓]</span>}
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority Filter */}
      <div className="relative">
        <button
          onClick={() => {
            setPriorityOpen(!priorityOpen);
            setCategoryOpen(false);
          }}
          className="px-3 py-1.5 bg-zinc-800 rounded font-mono text-sm hover:bg-zinc-700 flex items-center gap-2"
        >
          Priority
          <span className="text-zinc-500">[▼]</span>
        </button>
        {priorityOpen && (
          <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10">
            {priorities.map((pri) => (
              <button
                key={pri}
                data-testid={`priority-option-${pri}`}
                onClick={() => togglePriority(pri)}
                className={`w-full px-3 py-2 text-left font-mono text-sm hover:bg-zinc-700 flex items-center gap-2 ${
                  filter.priorities.includes(pri) ? 'text-blue-400' : ''
                }`}
              >
                {filter.priorities.includes(pri) && <span>[✓]</span>}
                {pri}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show Dismissed Toggle */}
      <label className="flex items-center gap-2 font-mono text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={filter.showDismissed}
          onChange={(e) => onFilterChange({ ...filter, showDismissed: e.target.checked })}
          className="rounded bg-zinc-800 border-zinc-700"
          aria-label="Show dismissed"
        />
        Show dismissed
      </label>

      {/* Active Filter Count & Clear */}
      {activeFilterCount > 0 && (
        <>
          <span data-testid="active-filter-count" className="text-xs font-mono bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            {activeFilterCount} active
          </span>
          <button
            onClick={clearFilters}
            className="text-xs font-mono text-zinc-400 hover:text-white"
          >
            Clear all
          </button>
        </>
      )}
    </div>
  );
}

// =============================================================================
// ForecastingInsightsDashboard Component
// =============================================================================

export interface ForecastingInsightsDashboardProps {
  address: string;
}

export function ForecastingInsightsDashboard({ address }: ForecastingInsightsDashboardProps) {
  const {
    insights,
    filteredInsights,
    isLoading,
    error,
    filter,
    dismissedIds,
    dismissInsight,
    setFilter,
    refreshInsights,
  } = useForecasterInsights(address);

  const [viewMode, setViewMode] = useState<'timeline' | 'category'>('timeline');
  const [dismissMessage, setDismissMessage] = useState<string | null>(null);

  const handleAction = useCallback(
    (insight: Insight, action: InsightAction) => {
      if (action.type === 'dismiss') {
        dismissInsight(insight.id);
        setDismissMessage('Insight dismissed');
        setTimeout(() => setDismissMessage(null), 2000);
      } else if (action.type === 'link' && action.href) {
        window.location.href = action.href;
      }
    },
    [dismissInsight]
  );

  const insightsByCategory = useMemo(() => {
    const result: Record<InsightCategory, Insight[]> = {
      performance: [],
      trend: [],
      opportunity: [],
      warning: [],
      achievement: [],
    };
    filteredInsights.forEach((insight) => {
      if (!dismissedIds.includes(insight.id)) {
        result[insight.category].push(insight);
      }
    });
    return result;
  }, [filteredInsights, dismissedIds]);

  return (
    <div data-testid="forecasting-insights-dashboard" className="ascii-box p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono font-bold text-lg">[INSIGHTS ENGINE]</h2>
        <button
          onClick={refreshInsights}
          className="px-3 py-1.5 bg-zinc-800 rounded font-mono text-sm hover:bg-zinc-700"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div data-testid="loading-spinner" className="flex justify-center py-8">
          <div className="animate-pulse font-mono text-blue-400">Loading insights...</div>
        </div>
      )}

      {error && (
        <div className="text-red-400 font-mono text-sm p-4 bg-red-500/10 rounded">
          Failed to load insights: {error}
        </div>
      )}

      {dismissMessage && (
        <div data-testid="dismiss-message" className="text-green-400 font-mono text-sm p-2 bg-green-500/10 rounded">
          {dismissMessage}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <InsightSummaryPanel insights={insights} showPreview />

          <InsightFilterBar filter={filter} onFilterChange={setFilter} />

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded font-mono text-sm ${
                viewMode === 'timeline' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`px-3 py-1.5 rounded font-mono text-sm ${
                viewMode === 'category' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              By Category
            </button>
          </div>

          {viewMode === 'timeline' ? (
            <InsightTimeline
              insights={filteredInsights.filter((i) => !dismissedIds.includes(i.id))}
              groupByDate
              onAction={handleAction}
            />
          ) : (
            <div data-testid="category-view" className="space-y-4">
              {(Object.keys(insightsByCategory) as InsightCategory[]).map((category) => (
                <InsightCategorySection
                  key={category}
                  category={category}
                  insights={insightsByCategory[category]}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// useForecasterInsights Hook
// =============================================================================

export function useForecasterInsights(address: string) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InsightFilter>({
    categories: [],
    priorities: [],
    showDismissed: false,
    dateRange: null,
  });
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate address
      if (!address || address === '0xinvalid' || address.length < 10) {
        throw new Error('Invalid address');
      }

      // Simulate API call with mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockInsights: Insight[] = [
        {
          id: 'insight-001',
          category: 'performance',
          priority: 'high',
          title: 'Strong Calibration Improvement',
          description: 'Your calibration score improved by 15% over the last month.',
          metric: {
            name: 'Calibration Score',
            currentValue: 0.85,
            previousValue: 0.70,
            change: 0.15,
            changePercent: 21.4,
          },
          generatedAt: Date.now() - 86400000,
          actionable: true,
          actions: [
            { id: 'action-1', label: 'View Details', type: 'link', href: '/calibration' },
            { id: 'action-2', label: 'Dismiss', type: 'dismiss' },
          ],
        },
        {
          id: 'insight-002',
          category: 'warning',
          priority: 'high',
          title: 'Declining Performance in Tech',
          description: 'Your accuracy in technology markets has dropped 20% this month.',
          metric: {
            name: 'Tech Accuracy',
            currentValue: 0.55,
            previousValue: 0.75,
            change: -0.20,
            changePercent: -26.7,
          },
          generatedAt: Date.now() - 172800000,
          actionable: true,
          actions: [
            { id: 'action-3', label: 'Review Forecasts', type: 'link', href: '/history' },
            { id: 'action-4', label: 'Dismiss', type: 'dismiss' },
          ],
        },
        {
          id: 'insight-003',
          category: 'achievement',
          priority: 'medium',
          title: 'Milestone Reached: 50 Forecasts',
          description: 'Congratulations! You have made 50 forecasts.',
          generatedAt: Date.now() - 259200000,
          actionable: true,
          actions: [{ id: 'action-5', label: 'Claim Badge', type: 'action', actionId: 'claim' }],
        },
        {
          id: 'insight-004',
          category: 'trend',
          priority: 'medium',
          title: 'Consistent Performance in Politics',
          description: 'You have maintained above-average accuracy in political markets.',
          generatedAt: Date.now() - 345600000,
          actionable: false,
          actions: [],
        },
        {
          id: 'insight-005',
          category: 'opportunity',
          priority: 'low',
          title: 'New Market Category Available',
          description: 'Sports markets are now available.',
          generatedAt: Date.now() - 432000000,
          actionable: false,
          actions: [],
        },
      ];

      setInsights(mockInsights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      if (filter.categories.length > 0 && !filter.categories.includes(insight.category)) {
        return false;
      }
      if (filter.priorities.length > 0 && !filter.priorities.includes(insight.priority)) {
        return false;
      }
      if (!filter.showDismissed && dismissedIds.includes(insight.id)) {
        return false;
      }
      return true;
    });
  }, [insights, filter, dismissedIds]);

  const summary: InsightSummary = useMemo(() => {
    const byCategory: Record<InsightCategory, number> = {
      performance: 0,
      trend: 0,
      opportunity: 0,
      warning: 0,
      achievement: 0,
    };
    const byPriority: Record<InsightPriority, number> = { high: 0, medium: 0, low: 0 };
    let actionable = 0;

    insights.forEach((insight) => {
      byCategory[insight.category]++;
      byPriority[insight.priority]++;
      if (insight.actionable) actionable++;
    });

    return {
      total: insights.length,
      byCategory,
      byPriority,
      actionable,
      dismissed: dismissedIds.length,
    };
  }, [insights, dismissedIds]);

  const dismissInsight = useCallback((id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  }, []);

  const restoreInsight = useCallback((id: string) => {
    setDismissedIds((prev) => prev.filter((i) => i !== id));
  }, []);

  const refreshInsights = useCallback(() => {
    loadInsights();
  }, [loadInsights]);

  const getInsightsByCategory = useCallback(
    (category: InsightCategory) => {
      return insights.filter((i) => i.category === category);
    },
    [insights]
  );

  const getInsightsByPriority = useCallback(
    (priority: InsightPriority) => {
      return insights.filter((i) => i.priority === priority);
    },
    [insights]
  );

  return {
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
  };
}
