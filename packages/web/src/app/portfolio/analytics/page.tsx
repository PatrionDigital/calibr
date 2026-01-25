'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, type PortfolioSummary, type PortfolioPosition, type Forecast } from '@/lib/api';
import { PortfolioKelly } from '@/components/portfolio-kelly';

interface AnalyticsData {
  portfolio: PortfolioSummary;
  metrics: PerformanceMetrics;
}

interface PerformanceMetrics {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  bestPosition: PortfolioPosition | null;
  worstPosition: PortfolioPosition | null;
}

export default function PortfolioAnalyticsPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  const fetchData = useCallback(async (wallet: string) => {
    try {
      setIsLoading(true);
      const [portfolioData, forecastsData] = await Promise.all([
        api.getPortfolioSummary({ wallet }),
        api.getForecasts({ limit: 50, includePrivate: true }).catch(() => ({ forecasts: [] })),
      ]);
      setPortfolio(portfolioData);
      setForecasts(forecastsData.forecasts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedWallet = localStorage.getItem('calibr_wallet');
    if (savedWallet) {
      setConnectedWallet(savedWallet);
      fetchData(savedWallet);
    } else {
      setIsLoading(false);
    }
  }, [fetchData]);

  // Transform forecasts to market estimates for Portfolio Kelly
  const marketEstimates = useMemo(() => {
    return forecasts
      .filter(f => f.unifiedMarket.isActive && f.unifiedMarket.bestYesPrice !== null)
      .map(f => ({
        marketId: f.unifiedMarket.id,
        question: f.unifiedMarket.question,
        yesPrice: f.unifiedMarket.bestYesPrice || 0.5,
        estimatedProbability: f.probability,
      }));
  }, [forecasts]);

  const metrics = useMemo((): PerformanceMetrics | null => {
    if (!portfolio || portfolio.positions.length === 0) return null;

    const positions = portfolio.positions;
    const winners = positions.filter(p => p.unrealizedPnl > 0);
    const losers = positions.filter(p => p.unrealizedPnl < 0);

    const winRate = positions.length > 0 ? (winners.length / positions.length) * 100 : 0;
    const avgWin = winners.length > 0 ? winners.reduce((sum, p) => sum + p.unrealizedPnl, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((sum, p) => sum + p.unrealizedPnl, 0) / losers.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winners.length) / (avgLoss * losers.length) : avgWin > 0 ? Infinity : 0;

    // Calculate max drawdown (simplified - based on current positions)
    const sortedByPnlPct = [...positions].sort((a, b) => a.unrealizedPnlPct - b.unrealizedPnlPct);
    const maxDrawdown = sortedByPnlPct.length > 0 ? Math.min(0, sortedByPnlPct[0].unrealizedPnlPct) : 0;

    // Simplified Sharpe ratio (excess return / volatility)
    const avgReturn = positions.reduce((sum, p) => sum + p.unrealizedPnlPct, 0) / positions.length;
    const variance = positions.reduce((sum, p) => sum + Math.pow(p.unrealizedPnlPct - avgReturn, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const sortedByPnl = [...positions].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
    const bestPosition = sortedByPnl[0] || null;
    const worstPosition = sortedByPnl[sortedByPnl.length - 1] || null;

    return {
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      bestPosition,
      worstPosition,
    };
  }, [portfolio]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="ascii-box p-8 text-center">
            <div className="terminal-glow cursor-blink">LOADING ANALYTICS</div>
          </div>
        </div>
      </div>
    );
  }

  if (!connectedWallet) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="ascii-box p-8 text-center">
            <h2 className="text-lg font-bold mb-4">[WALLET REQUIRED]</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Connect your wallet to view portfolio analytics.
            </p>
            <Link
              href="/portfolio"
              className="text-[hsl(var(--primary))] hover:underline"
            >
              GO TO PORTFOLIO
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="ascii-box p-6 border-[hsl(var(--error))]">
            <h2 className="text-lg font-bold text-[hsl(var(--error))] mb-2">[ERROR]</h2>
            <p className="text-[hsl(var(--muted-foreground))]">{error || 'Failed to load portfolio'}</p>
          </div>
        </div>
      </div>
    );
  }

  const platformEntries = Object.entries(portfolio.byPlatform);
  const totalPlatformValue = platformEntries.reduce((sum, [, data]) => sum + data.value, 0);
  const outcomeData = [
    { label: 'YES', value: portfolio.byOutcome.YES, color: 'hsl(var(--bullish))' },
    { label: 'NO', value: portfolio.byOutcome.NO, color: 'hsl(var(--bearish))' },
    { label: 'OTHER', value: portfolio.byOutcome.OTHER, color: 'hsl(var(--primary))' },
  ].filter(d => d.value > 0);
  const totalOutcomeValue = outcomeData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/portfolio"
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] text-sm"
            >
              &larr; PORTFOLIO
            </Link>
          </div>
          <h1 className="text-2xl font-bold terminal-glow mb-2">
            PORTFOLIO ANALYTICS
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Performance metrics and allocation breakdown
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="TOTAL VALUE"
            value={`$${portfolio.totalValue.toFixed(2)}`}
          />
          <SummaryCard
            label="TOTAL POSITIONS"
            value={String(portfolio.positionCount)}
          />
          <SummaryCard
            label="UNREALIZED P&L"
            value={`${portfolio.unrealizedPnl >= 0 ? '+' : ''}$${portfolio.unrealizedPnl.toFixed(2)}`}
            variant={portfolio.unrealizedPnl >= 0 ? 'bullish' : 'bearish'}
          />
          <SummaryCard
            label="RETURN"
            value={`${portfolio.unrealizedPnlPct >= 0 ? '+' : ''}${portfolio.unrealizedPnlPct.toFixed(1)}%`}
            variant={portfolio.unrealizedPnlPct >= 0 ? 'bullish' : 'bearish'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Platform Allocation */}
          <div className="ascii-box p-6">
            <h3 className="text-sm font-bold mb-4">[PLATFORM ALLOCATION]</h3>
            {platformEntries.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <PieChart
                    data={platformEntries.map(([platform, data], i) => ({
                      label: platform,
                      value: data.value,
                      color: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
                    }))}
                    size={180}
                  />
                </div>
                <div className="space-y-2">
                  {platformEntries.map(([platform, data], i) => (
                    <div key={platform} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3"
                          style={{ backgroundColor: PLATFORM_COLORS[i % PLATFORM_COLORS.length] }}
                        />
                        <span>{platform}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono">${data.value.toFixed(2)}</span>
                        <span className="text-[hsl(var(--muted-foreground))] w-12 text-right">
                          {((data.value / totalPlatformValue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
                No platform data available
              </div>
            )}
          </div>

          {/* Outcome Allocation */}
          <div className="ascii-box p-6">
            <h3 className="text-sm font-bold mb-4">[OUTCOME ALLOCATION]</h3>
            {outcomeData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <PieChart data={outcomeData} size={180} />
                </div>
                <div className="space-y-2">
                  {outcomeData.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono">${item.value.toFixed(2)}</span>
                        <span className="text-[hsl(var(--muted-foreground))] w-12 text-right">
                          {((item.value / totalOutcomeValue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
                No outcome data available
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <div className="ascii-box p-6 mb-6">
            <h3 className="text-sm font-bold mb-4">[PERFORMANCE METRICS]</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricItem
                label="WIN RATE"
                value={`${metrics.winRate.toFixed(1)}%`}
                description="Positions with positive P&L"
              />
              <MetricItem
                label="AVG WIN"
                value={`$${metrics.avgWin.toFixed(2)}`}
                description="Average profit on winning positions"
                variant="bullish"
              />
              <MetricItem
                label="AVG LOSS"
                value={`$${metrics.avgLoss.toFixed(2)}`}
                description="Average loss on losing positions"
                variant="bearish"
              />
              <MetricItem
                label="PROFIT FACTOR"
                value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
                description="Gross profit / gross loss"
              />
              <MetricItem
                label="MAX DRAWDOWN"
                value={`${metrics.maxDrawdown.toFixed(1)}%`}
                description="Largest peak-to-trough decline"
                variant="bearish"
              />
              <MetricItem
                label="SHARPE RATIO"
                value={metrics.sharpeRatio.toFixed(2)}
                description="Risk-adjusted return metric"
              />
              <MetricItem
                label="BEST POSITION"
                value={metrics.bestPosition ? `+$${metrics.bestPosition.unrealizedPnl.toFixed(2)}` : 'N/A'}
                description={metrics.bestPosition?.marketQuestion?.slice(0, 30) || 'No positions'}
                variant="bullish"
              />
              <MetricItem
                label="WORST POSITION"
                value={metrics.worstPosition ? `$${metrics.worstPosition.unrealizedPnl.toFixed(2)}` : 'N/A'}
                description={metrics.worstPosition?.marketQuestion?.slice(0, 30) || 'No positions'}
                variant="bearish"
              />
            </div>
          </div>
        )}

        {/* Portfolio Kelly Optimization */}
        {marketEstimates.length > 0 && (
          <div className="mb-6">
            <PortfolioKelly markets={marketEstimates} />
          </div>
        )}

        {/* Position P&L Distribution */}
        <div className="ascii-box p-6 mb-6">
          <h3 className="text-sm font-bold mb-4">[P&L DISTRIBUTION]</h3>
          {portfolio.positions.length > 0 ? (
            <div className="space-y-3">
              {[...portfolio.positions]
                .sort((a, b) => b.unrealizedPnl - a.unrealizedPnl)
                .map((pos) => (
                  <PnLBar key={pos.id} position={pos} maxPnl={Math.max(...portfolio.positions.map(p => Math.abs(p.unrealizedPnl)))} />
                ))}
            </div>
          ) : (
            <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
              No positions to display
            </div>
          )}
        </div>

        {/* Position Size Distribution */}
        <div className="ascii-box p-6">
          <h3 className="text-sm font-bold mb-4">[POSITION SIZE DISTRIBUTION]</h3>
          {portfolio.positions.length > 0 ? (
            <div className="space-y-3">
              {[...portfolio.positions]
                .sort((a, b) => b.currentValue - a.currentValue)
                .map((pos) => (
                  <SizeBar
                    key={pos.id}
                    position={pos}
                    maxValue={Math.max(...portfolio.positions.map(p => p.currentValue))}
                    totalValue={portfolio.totalValue}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center text-[hsl(var(--muted-foreground))] py-8">
              No positions to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

const PLATFORM_COLORS = [
  '#00ff00', // Green
  '#00ccff', // Cyan
  '#ff6600', // Orange
  '#ff00ff', // Magenta
  '#ffff00', // Yellow
];

interface SummaryCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'bullish' | 'bearish';
}

function SummaryCard({ label, value, variant = 'default' }: SummaryCardProps) {
  const valueColor = {
    default: '',
    bullish: 'text-[hsl(var(--bullish))]',
    bearish: 'text-[hsl(var(--bearish))]',
  }[variant];

  return (
    <div className="ascii-box p-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${valueColor}`}>{value}</div>
    </div>
  );
}

interface MetricItemProps {
  label: string;
  value: string;
  description: string;
  variant?: 'default' | 'bullish' | 'bearish';
}

function MetricItem({ label, value, description, variant = 'default' }: MetricItemProps) {
  const valueColor = {
    default: '',
    bullish: 'text-[hsl(var(--bullish))]',
    bearish: 'text-[hsl(var(--bearish))]',
  }[variant];

  return (
    <div className="p-3 border border-[hsl(var(--border))]">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      <div className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-1">{description}</div>
    </div>
  );
}

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
}

function PieChart({ data, size = 160 }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -90; // Start from top

  const slices = data.map((item) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage,
    };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => (
        <path
          key={i}
          d={slice.pathData}
          fill={slice.color}
          stroke="hsl(var(--background))"
          strokeWidth="2"
        />
      ))}
      {/* Center hole for donut effect */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.5}
        fill="hsl(var(--background))"
      />
    </svg>
  );
}

interface PnLBarProps {
  position: PortfolioPosition;
  maxPnl: number;
}

function PnLBar({ position, maxPnl }: PnLBarProps) {
  const isPositive = position.unrealizedPnl >= 0;
  const width = maxPnl > 0 ? (Math.abs(position.unrealizedPnl) / maxPnl) * 100 : 0;
  const barColor = isPositive ? 'bg-[hsl(var(--bullish))]' : 'bg-[hsl(var(--bearish))]';

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 truncate text-xs text-[hsl(var(--muted-foreground))]">
        {position.marketQuestion}
      </div>
      <div className="flex-1 flex items-center">
        <div className="w-1/2 flex justify-end pr-1">
          {!isPositive && (
            <div
              className={`h-4 ${barColor}`}
              style={{ width: `${width}%` }}
            />
          )}
        </div>
        <div className="w-px h-6 bg-[hsl(var(--border))]" />
        <div className="w-1/2 pl-1">
          {isPositive && (
            <div
              className={`h-4 ${barColor}`}
              style={{ width: `${width}%` }}
            />
          )}
        </div>
      </div>
      <div className={`w-20 text-right text-sm font-mono ${isPositive ? 'text-[hsl(var(--bullish))]' : 'text-[hsl(var(--bearish))]'}`}>
        {isPositive ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
      </div>
    </div>
  );
}

interface SizeBarProps {
  position: PortfolioPosition;
  maxValue: number;
  totalValue: number;
}

function SizeBar({ position, maxValue, totalValue }: SizeBarProps) {
  const width = maxValue > 0 ? (position.currentValue / maxValue) * 100 : 0;
  const percentage = totalValue > 0 ? (position.currentValue / totalValue) * 100 : 0;

  const outcomeColor = position.outcome.toUpperCase() === 'YES'
    ? 'bg-[hsl(var(--bullish))]'
    : position.outcome.toUpperCase() === 'NO'
      ? 'bg-[hsl(var(--bearish))]'
      : 'bg-[hsl(var(--primary))]';

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 truncate text-xs text-[hsl(var(--muted-foreground))]">
        {position.marketQuestion}
      </div>
      <div className="flex-1">
        <div
          className={`h-4 ${outcomeColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-28 text-right text-sm">
        <span className="font-mono">${position.currentValue.toFixed(2)}</span>
        <span className="text-[hsl(var(--muted-foreground))] ml-2">({percentage.toFixed(1)}%)</span>
      </div>
    </div>
  );
}
