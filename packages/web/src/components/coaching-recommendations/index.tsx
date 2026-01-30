'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type CoachingPriority = 'high' | 'medium' | 'low';
export type ImpactLevel = 'significant' | 'moderate' | 'minor';
export type TrendDirection = 'improving' | 'declining' | 'stable';

export interface ActionableStep {
  id: string;
  description: string;
  completed: boolean;
  category: string;
}

export interface CoachingRecommendation {
  id: string;
  title: string;
  description: string;
  priority: CoachingPriority;
  area: string;
  areaLabel: string;
  impact: ImpactLevel;
  impactScore: number;
  steps: ActionableStep[];
  metrics: {
    current: number;
    target: number;
    improvement: number;
  };
  relatedInsights: string[];
  createdAt: number;
}

export interface ImprovementArea {
  key: string;
  label: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  trend: TrendDirection;
  priority: CoachingPriority;
}

// =============================================================================
// CoachingPriorityIndicator Component
// =============================================================================

export interface CoachingPriorityIndicatorProps {
  priority: CoachingPriority;
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}

export function CoachingPriorityIndicator({
  priority,
  showLabel = false,
  variant = 'default',
}: CoachingPriorityIndicatorProps) {
  const colorClass =
    priority === 'high'
      ? 'text-red-400'
      : priority === 'medium'
      ? 'text-yellow-400'
      : 'text-green-400';

  const icon =
    priority === 'high' ? '[!!]' : priority === 'medium' ? '[!]' : '[~]';

  return (
    <div
      data-testid="priority-indicator"
      className={`inline-flex items-center gap-1 font-mono ${colorClass} ${variant}`}
    >
      <span data-testid="priority-icon">{icon}</span>
      {showLabel && <span className="text-sm uppercase">{priority}</span>}
    </div>
  );
}

// =============================================================================
// RecommendationCard Component
// =============================================================================

export interface RecommendationCardProps {
  recommendation: CoachingRecommendation;
  showImpact?: boolean;
  showMetrics?: boolean;
  expandable?: boolean;
  onStepToggle?: (stepId: string) => void;
}

export function RecommendationCard({
  recommendation,
  showImpact = false,
  showMetrics = false,
  expandable = false,
  onStepToggle,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedSteps = recommendation.steps.filter((s) => s.completed).length;
  const totalSteps = recommendation.steps.length;

  const formatMetricValue = (value: number) => {
    if (value < 1) {
      return `${Math.round(value * 100)}%`;
    }
    return value.toString();
  };

  return (
    <div data-testid="recommendation-card" className="ascii-box p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CoachingPriorityIndicator priority={recommendation.priority} />
            <span className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-0.5 rounded">
              {recommendation.areaLabel}
            </span>
          </div>
          <h3 className="font-mono font-bold text-blue-400">{recommendation.title}</h3>
        </div>
        {showImpact && (
          <div data-testid="impact-score" className="text-right">
            <div className="text-lg font-mono font-bold">{recommendation.impactScore}</div>
            <div className="text-xs text-zinc-500 font-mono">impact</div>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-400 font-mono mb-4">{recommendation.description}</p>

      {/* Metrics */}
      {showMetrics && (
        <div className="flex items-center gap-6 mb-4 text-sm font-mono">
          <div>
            <span className="text-zinc-500">Current: </span>
            <span data-testid="current-value" className="text-white">
              {formatMetricValue(recommendation.metrics.current)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Target: </span>
            <span data-testid="target-value" className="text-green-400">
              {formatMetricValue(recommendation.metrics.target)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">+{recommendation.metrics.improvement}% potential</span>
          </div>
        </div>
      )}

      {/* Steps Summary */}
      <div className="flex items-center justify-between text-sm font-mono border-t border-zinc-800 pt-3">
        <span className="text-zinc-400">
          {totalSteps} steps • <span className="text-green-400">{completedSteps} completed</span>
        </span>
        {expandable && (
          <button
            data-testid="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? '[-]' : '[+]'}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div data-testid="expanded-content" className="mt-4 border-t border-zinc-800 pt-4">
          <ActionableSteps
            steps={recommendation.steps}
            onToggle={onStepToggle || (() => {})}
            showProgress
          />
          {recommendation.relatedInsights.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs text-zinc-500 font-mono mb-2">Related Insights</h4>
              <ul className="space-y-1">
                {recommendation.relatedInsights.map((insight, i) => (
                  <li key={i} className="text-xs text-zinc-400 font-mono">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ImprovementAreaList Component
// =============================================================================

export interface ImprovementAreaListProps {
  areas: ImprovementArea[];
  showScores?: boolean;
  showGap?: boolean;
  showTrend?: boolean;
  sortBy?: 'name' | 'priority' | 'gap';
}

export function ImprovementAreaList({
  areas,
  showScores = false,
  showGap = false,
  showTrend = false,
  sortBy = 'name',
}: ImprovementAreaListProps) {
  const priorityOrder: Record<CoachingPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const sortedAreas = [...areas].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'gap':
        return b.gap - a.gap;
      default:
        return a.label.localeCompare(b.label);
    }
  });

  const formatScore = (value: number) => {
    if (value < 1) {
      return `${Math.round(value * 100)}%`;
    }
    return value.toString();
  };

  const trendColors: Record<TrendDirection, string> = {
    improving: 'text-green-400',
    declining: 'text-red-400',
    stable: 'text-yellow-400',
  };

  const trendIcons: Record<TrendDirection, string> = {
    improving: '[^]',
    declining: '[v]',
    stable: '[-]',
  };

  return (
    <div data-testid="improvement-area-list" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">[IMPROVEMENT AREAS]</h3>
      <div className="space-y-3">
        {sortedAreas.map((area) => (
          <div
            key={area.key}
            data-testid="area-item"
            className="flex items-center justify-between py-2 border-b border-zinc-800"
          >
            <div className="flex items-center gap-3">
              <CoachingPriorityIndicator priority={area.priority} variant="compact" />
              <span className="font-mono text-sm">{area.label}</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-mono">
              {showScores && (
                <>
                  <span data-testid="current-score" className="text-zinc-400">
                    {formatScore(area.currentScore)}
                  </span>
                  <span className="text-zinc-600">→</span>
                  <span data-testid="target-score" className="text-green-400">
                    {formatScore(area.targetScore)}
                  </span>
                </>
              )}
              {showGap && (
                <span data-testid="gap-indicator" className="text-yellow-400">
                  -{formatScore(area.gap)}
                </span>
              )}
              {showTrend && (
                <span
                  data-testid="trend-indicator"
                  className={trendColors[area.trend]}
                >
                  {trendIcons[area.trend]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ActionableSteps Component
// =============================================================================

export interface ActionableStepsProps {
  steps: ActionableStep[];
  onToggle: (stepId: string) => void;
  showProgress?: boolean;
  groupByCategory?: boolean;
}

export function ActionableSteps({
  steps,
  onToggle,
  showProgress = false,
  groupByCategory = false,
}: ActionableStepsProps) {
  const completedCount = steps.filter((s) => s.completed).length;

  // Group steps by category if requested
  const groupedSteps = groupByCategory
    ? steps.reduce((acc, step) => {
        if (!acc[step.category]) {
          acc[step.category] = [];
        }
        acc[step.category]!.push(step);
        return acc;
      }, {} as Record<string, ActionableStep[]>)
    : null;

  const renderStep = (step: ActionableStep) => (
    <div
      key={step.id}
      data-testid="step-item"
      className={`flex items-start gap-3 py-2 ${step.completed ? 'completed opacity-60' : ''}`}
    >
      <button
        data-testid="step-checkbox"
        onClick={() => onToggle(step.id)}
        className={`w-5 h-5 border rounded flex items-center justify-center text-xs font-mono ${
          step.completed
            ? 'bg-green-500/20 border-green-500 text-green-400'
            : 'border-zinc-600 text-zinc-600 hover:border-blue-500'
        }`}
      >
        {step.completed ? '[x]' : '[ ]'}
      </button>
      <span
        className={`text-sm font-mono ${step.completed ? 'line-through text-zinc-500' : 'text-zinc-300'}`}
      >
        {step.description}
      </span>
    </div>
  );

  return (
    <div data-testid="actionable-steps">
      {showProgress && (
        <div data-testid="completion-progress" className="text-xs text-zinc-500 font-mono mb-3">
          Progress: {completedCount}/{steps.length}
        </div>
      )}

      {groupByCategory && groupedSteps ? (
        Object.entries(groupedSteps).map(([category, categorySteps]) => (
          <div key={category} data-testid={`category-${category}`} className="mb-4">
            <h4 className="text-xs text-zinc-500 font-mono uppercase mb-2">{category}</h4>
            <div className="space-y-1">{categorySteps.map(renderStep)}</div>
          </div>
        ))
      ) : (
        <div className="space-y-1">{steps.map(renderStep)}</div>
      )}
    </div>
  );
}

// =============================================================================
// CoachingProgress Component
// =============================================================================

export interface CoachingProgressProps {
  totalRecommendations: number;
  completedRecommendations: number;
  totalSteps: number;
  completedSteps: number;
}

export function CoachingProgress({
  totalRecommendations,
  completedRecommendations,
  totalSteps,
  completedSteps,
}: CoachingProgressProps) {
  const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div data-testid="coaching-progress" className="ascii-box p-4">
      <h3 className="font-mono font-bold text-sm mb-4">[COACHING PROGRESS]</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div data-testid="recommendation-progress" className="text-2xl font-mono font-bold text-blue-400">
            {completedRecommendations}/{totalRecommendations}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Recommendations</div>
        </div>
        <div>
          <div data-testid="step-progress" className="text-2xl font-mono font-bold text-green-400">
            {completedSteps}/{totalSteps}
          </div>
          <div className="text-xs text-zinc-500 font-mono">Steps Completed</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-mono">
          <span className="text-zinc-500">Overall Progress</span>
          <span data-testid="progress-percentage" className="text-white">
            {overallProgress}%
          </span>
        </div>
        <div data-testid="progress-bar" className="h-2 bg-zinc-800 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CoachingDashboard Component
// =============================================================================

export interface CoachingDashboardProps {
  userAddress: string;
}

export function CoachingDashboard({ userAddress }: CoachingDashboardProps) {
  const {
    recommendations,
    improvementAreas,
    isLoading,
    highPriorityCount,
    completedStepsCount,
    totalStepsCount,
    toggleStep,
  } = useCoachingRecommendations(userAddress);

  const completedRecommendations = recommendations.filter((r) =>
    r.steps.every((s) => s.completed)
  ).length;

  return (
    <div data-testid="coaching-dashboard" className="ascii-box p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono font-bold text-lg">[COACHING & RECOMMENDATIONS]</h2>
        {highPriorityCount > 0 && (
          <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded">
            {highPriorityCount} high priority
          </span>
        )}
      </div>

      {isLoading && (
        <div data-testid="loading-indicator" className="flex justify-center py-8">
          <div className="animate-pulse font-mono text-blue-400">Loading recommendations...</div>
        </div>
      )}

      {!isLoading && (
        <>
          <CoachingProgress
            totalRecommendations={recommendations.length}
            completedRecommendations={completedRecommendations}
            totalSteps={totalStepsCount}
            completedSteps={completedStepsCount}
          />

          <ImprovementAreaList
            areas={improvementAreas}
            showScores
            showTrend
            sortBy="priority"
          />

          <div className="space-y-4">
            <h3 className="font-mono font-bold text-sm">[RECOMMENDATIONS]</h3>
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                showImpact
                showMetrics
                expandable
                onStepToggle={(stepId) => toggleStep(rec.id, stepId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// useCoachingRecommendations Hook
// =============================================================================

export function useCoachingRecommendations(userAddress: string) {
  const [recommendations, setRecommendations] = useState<CoachingRecommendation[]>([]);
  const [improvementAreas, setImprovementAreas] = useState<ImprovementArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!userAddress || userAddress === '0xinvalid' || userAddress.length < 10) {
        throw new Error('Invalid address');
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate mock recommendations
      const mockRecommendations: CoachingRecommendation[] = [
        {
          id: 'rec-1',
          title: 'Improve Calibration',
          description: 'Your calibration score could be improved. Focus on aligning confidence with outcomes.',
          priority: 'high',
          area: 'calibration',
          areaLabel: 'Calibration',
          impact: 'significant',
          impactScore: 8.5,
          steps: [
            { id: 's1', description: 'Review overconfident predictions', completed: true, category: 'review' },
            { id: 's2', description: 'Practice calibration exercises', completed: false, category: 'practice' },
            { id: 's3', description: 'Adjust confidence levels', completed: false, category: 'action' },
          ],
          metrics: { current: 0.72, target: 0.85, improvement: 18 },
          relatedInsights: ['Overconfidence detected'],
          createdAt: Date.now(),
        },
        {
          id: 'rec-2',
          title: 'Increase Forecast Volume',
          description: 'Making more forecasts helps improve accuracy over time.',
          priority: 'medium',
          area: 'volume',
          areaLabel: 'Volume',
          impact: 'moderate',
          impactScore: 5.2,
          steps: [
            { id: 's4', description: 'Set daily forecasting goals', completed: false, category: 'goal' },
            { id: 's5', description: 'Enable notifications', completed: true, category: 'setup' },
          ],
          metrics: { current: 3, target: 7, improvement: 133 },
          relatedInsights: [],
          createdAt: Date.now(),
        },
      ];

      const mockAreas: ImprovementArea[] = [
        { key: 'calibration', label: 'Calibration', currentScore: 0.72, targetScore: 0.85, gap: 0.13, trend: 'declining', priority: 'high' },
        { key: 'accuracy', label: 'Accuracy', currentScore: 0.68, targetScore: 0.75, gap: 0.07, trend: 'stable', priority: 'medium' },
        { key: 'volume', label: 'Volume', currentScore: 35, targetScore: 50, gap: 15, trend: 'improving', priority: 'low' },
      ];

      setRecommendations(mockRecommendations);
      setImprovementAreas(mockAreas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const toggleStep = useCallback((recommendationId: string, stepId: string) => {
    setRecommendations((prev) =>
      prev.map((rec) =>
        rec.id === recommendationId
          ? {
              ...rec,
              steps: rec.steps.map((step) =>
                step.id === stepId ? { ...step, completed: !step.completed } : step
              ),
            }
          : rec
      )
    );
  }, []);

  const highPriorityCount = useMemo(
    () => recommendations.filter((r) => r.priority === 'high').length,
    [recommendations]
  );

  const completedStepsCount = useMemo(
    () => recommendations.reduce((acc, r) => acc + r.steps.filter((s) => s.completed).length, 0),
    [recommendations]
  );

  const totalStepsCount = useMemo(
    () => recommendations.reduce((acc, r) => acc + r.steps.length, 0),
    [recommendations]
  );

  return {
    recommendations,
    improvementAreas,
    isLoading,
    error,
    highPriorityCount,
    completedStepsCount,
    totalStepsCount,
    toggleStep,
    refresh: loadRecommendations,
  };
}
