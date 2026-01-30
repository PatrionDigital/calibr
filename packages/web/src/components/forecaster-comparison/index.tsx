'use client';

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface CategoryStats {
  forecasts: number;
  accuracy: number;
}

export interface ForecasterProfile {
  address: string;
  ensName?: string;
  displayName: string;
  totalScore: number;
  percentile: number;
  level: string;
  totalForecasts: number;
  accuracy: number;
  calibration: number;
  brierScore: number;
  avgConfidence: number;
  streakDays: number;
  badges: string[];
  categories: Record<string, CategoryStats>;
}

export interface ComparisonMetric {
  name: string;
  key: string;
  valueA: number;
  valueB: number;
  diff: number;
  diffPercent: number;
  winner: 'A' | 'B' | null;
  format: 'number' | 'percent' | 'decimal';
  lowerIsBetter?: boolean;
}

export interface ComparisonResult {
  forecasterA: ForecasterProfile;
  forecasterB: ForecasterProfile;
  metrics: ComparisonMetric[];
  overallWinner: 'A' | 'B' | null;
  winsByA: number;
  winsByB: number;
  ties: number;
  generatedAt: number;
}

// =============================================================================
// ForecasterComparisonCard Component
// =============================================================================

export interface ForecasterComparisonCardProps {
  forecasterA: ForecasterProfile;
  forecasterB: ForecasterProfile;
  winner?: 'A' | 'B' | null;
  variant?: 'default' | 'compact';
}

export function ForecasterComparisonCard({
  forecasterA,
  forecasterB,
  winner,
  variant = 'default',
}: ForecasterComparisonCardProps) {
  return (
    <div data-testid="comparison-card" className={`ascii-box p-4 ${variant}`}>
      <div className="grid grid-cols-2 gap-6">
        {/* Forecaster A */}
        <div className={`relative ${winner === 'A' ? 'border-l-2 border-green-500 pl-3' : ''}`}>
          {winner === 'A' && (
            <span data-testid="winner-badge" className="absolute -top-2 -left-2 bg-green-500 text-black text-xs px-2 py-0.5 rounded font-mono">
              Winner
            </span>
          )}
          <h3 className="font-mono font-bold text-blue-400">{forecasterA.displayName}</h3>
          {forecasterA.ensName && (
            <p className="text-xs text-zinc-500 font-mono">{forecasterA.ensName}</p>
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold">{forecasterA.totalScore}</span>
              <span className="text-xs text-zinc-500">score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono">
                Top {100 - forecasterA.percentile}%
              </span>
              <span className="bg-zinc-700 px-2 py-0.5 rounded text-xs font-mono">
                {forecasterA.level}
              </span>
            </div>
          </div>
        </div>

        {/* Forecaster B */}
        <div className={`relative ${winner === 'B' ? 'border-l-2 border-green-500 pl-3' : ''}`}>
          {winner === 'B' && (
            <span data-testid="winner-badge" className="absolute -top-2 -left-2 bg-green-500 text-black text-xs px-2 py-0.5 rounded font-mono">
              Winner
            </span>
          )}
          <h3 className="font-mono font-bold text-blue-400">{forecasterB.displayName}</h3>
          {forecasterB.ensName && (
            <p className="text-xs text-zinc-500 font-mono">{forecasterB.ensName}</p>
          )}
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-bold">{forecasterB.totalScore}</span>
              <span className="text-xs text-zinc-500">score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono">
                Top {100 - forecasterB.percentile}%
              </span>
              <span className="bg-zinc-700 px-2 py-0.5 rounded text-xs font-mono">
                {forecasterB.level}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MetricComparisonRow Component
// =============================================================================

export interface MetricComparisonRowProps {
  metric: ComparisonMetric;
  showDiff?: boolean;
  highlightWinner?: boolean;
  showBar?: boolean;
}

export function MetricComparisonRow({
  metric,
  showDiff = false,
  highlightWinner = false,
  showBar = false,
}: MetricComparisonRowProps) {
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percent':
        return `${Math.round(value * 100)}%`;
      case 'decimal':
        return value.toFixed(2);
      default:
        return value.toString();
    }
  };

  const isAWinner = metric.winner === 'A';
  const isBWinner = metric.winner === 'B';

  const maxValue = Math.max(metric.valueA, metric.valueB);
  const barWidthA = maxValue > 0 ? (metric.valueA / maxValue) * 100 : 0;
  const barWidthB = maxValue > 0 ? (metric.valueB / maxValue) * 100 : 0;

  return (
    <div data-testid="metric-row" className="py-3 border-b border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-zinc-400">{metric.name}</span>
        {showDiff && (
          <div className="flex items-center gap-2">
            <span
              data-testid="diff-value"
              className={`text-xs font-mono ${metric.diff >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {metric.diff >= 0 ? '+' : ''}{metric.format === 'percent' ? (metric.diff * 100).toFixed(0) : metric.diff}
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({metric.diffPercent >= 0 ? '+' : ''}{metric.diffPercent.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          data-testid="value-a"
          className={`font-mono text-lg ${highlightWinner && isAWinner ? 'winner text-green-400 font-bold' : ''}`}
        >
          {formatValue(metric.valueA, metric.format)}
        </div>
        <div
          data-testid="value-b"
          className={`font-mono text-lg ${highlightWinner && isBWinner ? 'winner text-green-400 font-bold' : ''}`}
        >
          {formatValue(metric.valueB, metric.format)}
        </div>
      </div>

      {showBar && (
        <div data-testid="comparison-bar" className="mt-2 grid grid-cols-2 gap-4">
          <div className="h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full ${isAWinner ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${barWidthA}%` }}
            />
          </div>
          <div className="h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full ${isBWinner ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${barWidthB}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ComparisonChart Component
// =============================================================================

export interface ComparisonChartProps {
  forecasterA: ForecasterProfile;
  forecasterB: ForecasterProfile;
  metrics: ComparisonMetric[];
  title?: string;
  chartType?: 'bar' | 'radar';
  height?: number;
}

export function ComparisonChart({
  forecasterA,
  forecasterB,
  metrics,
  title,
  chartType = 'bar',
  height = 300,
}: ComparisonChartProps) {
  return (
    <div data-testid="comparison-chart" className="ascii-box p-4" style={{ height: `${height}px` }}>
      {title && <h3 className="font-mono font-bold text-sm mb-4">{title}</h3>}

      <div data-testid="chart-legend" className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-xs font-mono">{forecasterA.displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-purple-500 rounded" />
          <span className="text-xs font-mono">{forecasterB.displayName}</span>
        </div>
      </div>

      {chartType === 'bar' ? (
        <div data-testid="bar-chart" className="space-y-3">
          {metrics.slice(0, 5).map((metric) => (
            <div key={metric.key}>
              <div className="flex justify-between text-xs font-mono text-zinc-500 mb-1">
                <span>{metric.name}</span>
              </div>
              <div className="flex gap-1">
                <div className="flex-1 h-4 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${(metric.valueA / Math.max(metric.valueA, metric.valueB)) * 100}%` }}
                  />
                </div>
                <div className="flex-1 h-4 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${(metric.valueB / Math.max(metric.valueA, metric.valueB)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div data-testid="radar-chart" className="flex items-center justify-center h-48">
          <div className="text-zinc-500 font-mono text-sm">
            [Radar Chart - {metrics.length} metrics]
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ForecasterSearchSelect Component
// =============================================================================

export interface ForecasterSearchSelectProps {
  onSelect: (forecaster: ForecasterProfile) => void;
  placeholder?: string;
  excludeAddresses?: string[];
}

export function ForecasterSearchSelect({
  onSelect,
  placeholder = 'Search forecaster...',
  excludeAddresses = [],
}: ForecasterSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ForecasterProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);

      // Simulate search
      await new Promise((resolve) => setTimeout(resolve, 300));

      const mockResults: ForecasterProfile[] = query.toLowerCase().includes('nonexistent')
        ? []
        : [
            {
              address: '0x1111111111111111111111111111111111111111',
              ensName: 'oracle.eth',
              displayName: 'Oracle Beta',
              totalScore: 1580,
              percentile: 85,
              level: 'Advanced',
              totalForecasts: 312,
              accuracy: 0.72,
              calibration: 0.78,
              brierScore: 0.22,
              avgConfidence: 0.68,
              streakDays: 28,
              badges: [],
              categories: {},
            },
            {
              address: '0x2222222222222222222222222222222222222222',
              ensName: 'gamma.eth',
              displayName: 'Gamma Forecaster',
              totalScore: 1450,
              percentile: 78,
              level: 'Intermediate',
              totalForecasts: 156,
              accuracy: 0.68,
              calibration: 0.72,
              brierScore: 0.26,
              avgConfidence: 0.65,
              streakDays: 14,
              badges: [],
              categories: {},
            },
          ].filter((f) => !excludeAddresses.includes(f.address));

      setResults(mockResults);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, excludeAddresses]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm focus:outline-none focus:border-blue-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="px-2 py-1 text-zinc-400 hover:text-white font-mono text-sm"
            aria-label="Clear"
          >
            [×]
          </button>
        )}
      </div>

      {(results.length > 0 || (hasSearched && !isSearching)) && (
        <div data-testid="search-results" className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg z-10 max-h-64 overflow-auto">
          {results.length === 0 ? (
            <div className="p-3 text-zinc-500 font-mono text-sm">No forecasters found</div>
          ) : (
            results.map((forecaster) => (
              <button
                key={forecaster.address}
                data-testid="search-result-item"
                onClick={() => {
                  onSelect(forecaster);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full p-3 text-left hover:bg-zinc-700 flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-sm">{forecaster.displayName}</div>
                  {forecaster.ensName && (
                    <div className="text-xs text-zinc-500 font-mono">{forecaster.ensName}</div>
                  )}
                </div>
                <div className="text-xs font-mono text-blue-400">
                  {forecaster.totalScore} pts
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ComparisonSummary Component
// =============================================================================

export interface ComparisonSummaryProps {
  result: ComparisonResult;
  variant?: 'default' | 'compact';
}

export function ComparisonSummary({ result, variant = 'default' }: ComparisonSummaryProps) {
  const winnerName = result.overallWinner === 'A'
    ? result.forecasterA.displayName
    : result.overallWinner === 'B'
    ? result.forecasterB.displayName
    : null;

  const winningMetrics = result.metrics
    .filter((m) => m.winner === result.overallWinner)
    .map((m) => m.name);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div data-testid="comparison-summary" className={`ascii-box p-4 ${variant}`}>
      <h3 className="font-mono font-bold text-sm mb-4">Comparison Summary</h3>

      {/* Overall Winner */}
      <div data-testid="overall-winner" className="mb-4 p-3 bg-zinc-800/50 rounded">
        {winnerName ? (
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-mono">[★]</span>
            <span className="font-mono font-bold text-green-400">{winnerName}</span>
            <span className="text-zinc-500 font-mono text-sm">wins overall</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-mono">[=]</span>
            <span className="font-mono text-yellow-400">Tie</span>
            <span className="text-zinc-500 font-mono text-sm">- evenly matched</span>
          </div>
        )}
      </div>

      {/* Win Counts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-zinc-800/30 rounded">
          <div data-testid="wins-a" className="text-xl font-mono font-bold text-blue-400">
            {result.winsByA}
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            {result.forecasterA.displayName.split(' ')[0]}
          </div>
        </div>
        <div className="text-center p-2 bg-zinc-800/30 rounded">
          <div className="text-xl font-mono font-bold text-zinc-500">{result.ties}</div>
          <div className="text-xs text-zinc-500 font-mono">Ties</div>
        </div>
        <div className="text-center p-2 bg-zinc-800/30 rounded">
          <div data-testid="wins-b" className="text-xl font-mono font-bold text-purple-400">
            {result.winsByB}
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            {result.forecasterB.displayName.split(' ')[0]}
          </div>
        </div>
      </div>

      {/* Key Advantages */}
      {winnerName && winningMetrics.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-zinc-500 font-mono mb-2">Key Advantages</h4>
          <div className="flex flex-wrap gap-2">
            {winningMetrics.slice(0, 4).map((metric) => (
              <span key={metric} className="text-xs font-mono bg-green-500/10 text-green-400 px-2 py-1 rounded">
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      <div data-testid="verdict" className="p-3 bg-zinc-800/30 rounded text-sm font-mono text-zinc-400">
        {winnerName
          ? `${winnerName} outperforms in ${result.overallWinner === 'A' ? result.winsByA : result.winsByB} out of ${result.metrics.length} metrics.`
          : 'Both forecasters are evenly matched across key metrics.'}
      </div>

      {/* Timestamp */}
      <div data-testid="comparison-timestamp" className="mt-3 text-xs text-zinc-600 font-mono">
        Compared: {formatDate(result.generatedAt)}
      </div>
    </div>
  );
}

// =============================================================================
// ComparisonDashboard Component
// =============================================================================

export interface ComparisonDashboardProps {
  userAddress: string;
}

export function ComparisonDashboard({ userAddress }: ComparisonDashboardProps) {
  const {
    userProfile,
    comparedProfile,
    comparisonResult,
    isLoading,
    selectForecaster,
    clearComparison,
  } = useForecasterComparison(userAddress);

  return (
    <div data-testid="comparison-dashboard" className="ascii-box p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono font-bold text-lg">[COMPARE FORECASTERS]</h2>
        {comparedProfile && (
          <button
            onClick={clearComparison}
            className="px-3 py-1.5 bg-zinc-800 rounded font-mono text-sm hover:bg-zinc-700"
          >
            Clear comparison
          </button>
        )}
      </div>

      {isLoading && (
        <div data-testid="loading-indicator" className="flex justify-center py-8">
          <div className="animate-pulse font-mono text-blue-400">Loading profile...</div>
        </div>
      )}

      {!isLoading && userProfile && (
        <>
          {/* User Profile */}
          <div data-testid="user-profile" className="p-4 bg-zinc-800/30 rounded">
            <h3 className="font-mono font-bold text-blue-400">{userProfile.displayName}</h3>
            <p className="text-xs text-zinc-500 font-mono">{userProfile.ensName || userProfile.address.slice(0, 10)}...</p>
            <div className="mt-2 text-lg font-mono">{userProfile.totalScore} points</div>
          </div>

          {/* Search */}
          <div>
            <label className="text-xs text-zinc-500 font-mono block mb-2">
              Compare with another forecaster:
            </label>
            <ForecasterSearchSelect
              onSelect={selectForecaster}
              excludeAddresses={[userAddress]}
              placeholder="Search by name or address..."
            />
          </div>

          {/* Comparison Results */}
          {comparedProfile && comparisonResult && (
            <>
              <ForecasterComparisonCard
                forecasterA={userProfile}
                forecasterB={comparedProfile}
                winner={comparisonResult.overallWinner}
              />

              <div className="space-y-1">
                {comparisonResult.metrics.map((metric) => (
                  <MetricComparisonRow
                    key={metric.key}
                    metric={metric}
                    showDiff
                    highlightWinner
                    showBar
                  />
                ))}
              </div>

              <ComparisonSummary result={comparisonResult} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// useForecasterComparison Hook
// =============================================================================

export function useForecasterComparison(userAddress: string) {
  const [userProfile, setUserProfile] = useState<ForecasterProfile | null>(null);
  const [comparedProfile, setComparedProfile] = useState<ForecasterProfile | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ForecasterProfile[]>([]);

  const loadUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!userAddress || userAddress === '0xinvalid' || userAddress.length < 10) {
        throw new Error('Invalid address');
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const mockProfile: ForecasterProfile = {
        address: userAddress,
        ensName: 'user.eth',
        displayName: 'Your Profile',
        totalScore: 1715,
        percentile: 92,
        level: 'Expert',
        totalForecasts: 245,
        accuracy: 0.78,
        calibration: 0.85,
        brierScore: 0.18,
        avgConfidence: 0.72,
        streakDays: 45,
        badges: ['Century Forecaster', 'Calibration Master'],
        categories: {
          politics: { forecasts: 80, accuracy: 0.82 },
          crypto: { forecasts: 65, accuracy: 0.75 },
        },
      };

      setUserProfile(mockProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    loadUserProfile();
    setComparedProfile(null);
    setComparisonResult(null);
  }, [loadUserProfile]);

  const generateComparison = useCallback(
    (profileA: ForecasterProfile, profileB: ForecasterProfile): ComparisonResult => {
      const metrics: ComparisonMetric[] = [
        {
          name: 'Total Score',
          key: 'totalScore',
          valueA: profileA.totalScore,
          valueB: profileB.totalScore,
          diff: profileA.totalScore - profileB.totalScore,
          diffPercent: ((profileA.totalScore - profileB.totalScore) / profileB.totalScore) * 100,
          winner: profileA.totalScore > profileB.totalScore ? 'A' : profileA.totalScore < profileB.totalScore ? 'B' : null,
          format: 'number',
        },
        {
          name: 'Accuracy',
          key: 'accuracy',
          valueA: profileA.accuracy,
          valueB: profileB.accuracy,
          diff: profileA.accuracy - profileB.accuracy,
          diffPercent: ((profileA.accuracy - profileB.accuracy) / profileB.accuracy) * 100,
          winner: profileA.accuracy > profileB.accuracy ? 'A' : profileA.accuracy < profileB.accuracy ? 'B' : null,
          format: 'percent',
        },
        {
          name: 'Calibration',
          key: 'calibration',
          valueA: profileA.calibration,
          valueB: profileB.calibration,
          diff: profileA.calibration - profileB.calibration,
          diffPercent: ((profileA.calibration - profileB.calibration) / profileB.calibration) * 100,
          winner: profileA.calibration > profileB.calibration ? 'A' : profileA.calibration < profileB.calibration ? 'B' : null,
          format: 'percent',
        },
        {
          name: 'Total Forecasts',
          key: 'totalForecasts',
          valueA: profileA.totalForecasts,
          valueB: profileB.totalForecasts,
          diff: profileA.totalForecasts - profileB.totalForecasts,
          diffPercent: ((profileA.totalForecasts - profileB.totalForecasts) / profileB.totalForecasts) * 100,
          winner: profileA.totalForecasts > profileB.totalForecasts ? 'A' : profileA.totalForecasts < profileB.totalForecasts ? 'B' : null,
          format: 'number',
        },
        {
          name: 'Brier Score',
          key: 'brierScore',
          valueA: profileA.brierScore,
          valueB: profileB.brierScore,
          diff: profileA.brierScore - profileB.brierScore,
          diffPercent: ((profileA.brierScore - profileB.brierScore) / profileB.brierScore) * 100,
          winner: profileA.brierScore < profileB.brierScore ? 'A' : profileA.brierScore > profileB.brierScore ? 'B' : null,
          format: 'decimal',
          lowerIsBetter: true,
        },
      ];

      const winsByA = metrics.filter((m) => m.winner === 'A').length;
      const winsByB = metrics.filter((m) => m.winner === 'B').length;
      const ties = metrics.filter((m) => m.winner === null).length;

      return {
        forecasterA: profileA,
        forecasterB: profileB,
        metrics,
        overallWinner: winsByA > winsByB ? 'A' : winsByB > winsByA ? 'B' : null,
        winsByA,
        winsByB,
        ties,
        generatedAt: Date.now(),
      };
    },
    []
  );

  const searchForecasters = useCallback(async (_query: string) => {
    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 200));
    setSearchResults([]);
  }, []);

  const selectForecaster = useCallback(
    (forecaster: ForecasterProfile) => {
      if (!userProfile) return;
      setIsComparing(true);
      setComparedProfile(forecaster);
      const result = generateComparison(userProfile, forecaster);
      setComparisonResult(result);
      setIsComparing(false);
    },
    [userProfile, generateComparison]
  );

  const clearComparison = useCallback(() => {
    setComparedProfile(null);
    setComparisonResult(null);
  }, []);

  return {
    userProfile,
    comparedProfile,
    comparisonResult,
    isLoading,
    isComparing,
    error,
    searchResults,
    searchForecasters,
    selectForecaster,
    clearComparison,
  };
}
