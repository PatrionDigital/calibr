'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, type PortfolioPosition, type PositionTrade, type UnifiedMarket } from '@/lib/api';

interface PositionDetailData extends PortfolioPosition {
  trades?: PositionTrade[];
  market?: UnifiedMarket;
}

export default function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [position, setPosition] = useState<PositionDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchPosition = async () => {
      try {
        setIsLoading(true);
        const data = await api.getPosition(id);
        setPosition(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch position');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosition();
  }, [id]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.deletePosition(id);
      window.location.href = '/portfolio';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete position');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="ascii-box p-8 text-center">
            <div className="terminal-glow cursor-blink">LOADING POSITION</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !position) {
    return (
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="ascii-box p-6 border-[hsl(var(--error))]">
            <h2 className="text-lg font-bold text-[hsl(var(--error))] mb-2">[ERROR]</h2>
            <p className="text-[hsl(var(--muted-foreground))]">
              {error || 'Position not found'}
            </p>
            <Link
              href="/portfolio"
              className="inline-block mt-4 text-sm text-[hsl(var(--primary))] hover:underline"
            >
              &larr; BACK TO PORTFOLIO
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pnlColor = position.unrealizedPnl >= 0
    ? 'text-[hsl(var(--bullish))]'
    : 'text-[hsl(var(--bearish))]';

  const outcomeColor = position.outcome.toUpperCase() === 'YES'
    ? 'text-[hsl(var(--bullish))]'
    : position.outcome.toUpperCase() === 'NO'
      ? 'text-[hsl(var(--bearish))]'
      : 'text-[hsl(var(--primary))]';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
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
            POSITION DETAIL
          </h1>
        </header>

        {/* Position Summary */}
        <div className="ascii-box p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">{position.marketQuestion}</h2>
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <span>{position.platformName}</span>
                {position.marketSlug && (
                  <>
                    <span>|</span>
                    <Link
                      href={`/markets/${position.marketSlug}`}
                      className="text-[hsl(var(--primary))] hover:underline"
                    >
                      VIEW MARKET
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className={`text-2xl font-bold ${outcomeColor}`}>
              {position.outcome.toUpperCase()}
            </div>
          </div>

          {/* Position Status */}
          {position.isResolved && (
            <div className="mb-4 p-3 border border-[hsl(var(--warning))] bg-[hsl(var(--warning))/0.1]">
              <span className="text-[hsl(var(--warning))] font-bold">RESOLVED:</span>
              <span className="ml-2">{position.resolution || 'Unknown'}</span>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="SHARES" value={position.shares.toFixed(2)} />
          <MetricCard
            label="AVG COST"
            value={`$${position.avgCostBasis.toFixed(4)}`}
          />
          <MetricCard
            label="CURRENT PRICE"
            value={position.currentPrice !== null ? `$${position.currentPrice.toFixed(4)}` : '--'}
          />
          <MetricCard
            label="CURRENT VALUE"
            value={`$${position.currentValue.toFixed(2)}`}
            variant="primary"
          />
        </div>

        {/* P&L Section */}
        <div className="ascii-box p-6 mb-6">
          <h3 className="text-sm font-bold mb-4">[PROFIT & LOSS]</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">TOTAL COST</div>
              <div className="text-lg font-mono">
                ${(position.shares * position.avgCostBasis).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">CURRENT VALUE</div>
              <div className="text-lg font-mono">
                ${position.currentValue.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">UNREALIZED P&L</div>
              <div className={`text-lg font-mono font-bold ${pnlColor}`}>
                {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">RETURN</div>
              <div className={`text-lg font-mono font-bold ${pnlColor}`}>
                {position.unrealizedPnlPct >= 0 ? '+' : ''}{position.unrealizedPnlPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* P&L Breakdown */}
          <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]">
            <h4 className="text-xs text-[hsl(var(--muted-foreground))] mb-3">BREAKDOWN</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Cost Basis</span>
                <span className="font-mono">{position.shares.toFixed(2)} x ${position.avgCostBasis.toFixed(4)} = ${(position.shares * position.avgCostBasis).toFixed(2)}</span>
              </div>
              {position.currentPrice !== null && (
                <div className="flex justify-between">
                  <span className="text-[hsl(var(--muted-foreground))]">Current Value</span>
                  <span className="font-mono">{position.shares.toFixed(2)} x ${position.currentPrice.toFixed(4)} = ${position.currentValue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[hsl(var(--border))]">
                <span className="text-[hsl(var(--muted-foreground))]">Price Change</span>
                <span className={`font-mono ${pnlColor}`}>
                  {position.currentPrice !== null ? (
                    <>
                      ${position.avgCostBasis.toFixed(4)} &rarr; ${position.currentPrice.toFixed(4)}
                      ({((position.currentPrice - position.avgCostBasis) / position.avgCostBasis * 100).toFixed(1)}%)
                    </>
                  ) : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Scenario Analysis */}
          <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]">
            <h4 className="text-xs text-[hsl(var(--muted-foreground))] mb-3">OUTCOME SCENARIOS</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 border border-[hsl(var(--bullish))] bg-[hsl(var(--bullish))/0.05]">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">IF {position.outcome.toUpperCase()} WINS</div>
                <div className="text-lg font-bold text-[hsl(var(--bullish))]">
                  +${(position.shares - (position.shares * position.avgCostBasis)).toFixed(2)}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Payout: ${position.shares.toFixed(2)} | ROI: {((1 / position.avgCostBasis - 1) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-3 border border-[hsl(var(--bearish))] bg-[hsl(var(--bearish))/0.05]">
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">IF {position.outcome.toUpperCase()} LOSES</div>
                <div className="text-lg font-bold text-[hsl(var(--bearish))]">
                  -${(position.shares * position.avgCostBasis).toFixed(2)}
                </div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Payout: $0.00 | ROI: -100%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade History */}
        {position.trades && position.trades.length > 0 && (
          <div className="ascii-box p-6 mb-6">
            <h3 className="text-sm font-bold mb-4">[TRADE HISTORY]</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                    <th className="pb-2 pr-4">DATE</th>
                    <th className="pb-2 pr-4">TYPE</th>
                    <th className="pb-2 pr-4 text-right">SHARES</th>
                    <th className="pb-2 pr-4 text-right">PRICE</th>
                    <th className="pb-2 pr-4 text-right">TOTAL</th>
                    <th className="pb-2 text-right">FEES</th>
                  </tr>
                </thead>
                <tbody>
                  {position.trades.map((trade) => (
                    <TradeRow key={trade.id} trade={trade} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="ascii-box p-6">
          <h3 className="text-sm font-bold mb-4">[ACTIONS]</h3>
          <div className="flex flex-wrap gap-3">
            {position.marketSlug && (
              <Link
                href={`/markets/${position.marketSlug}`}
                className="px-4 py-2 text-sm border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] transition-colors"
              >
                TRADE THIS MARKET
              </Link>
            )}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))] transition-colors"
              >
                REMOVE POSITION
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[hsl(var(--warning))]">Confirm removal?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 text-sm border border-[hsl(var(--error))] text-[hsl(var(--error))] hover:bg-[hsl(var(--error))] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'REMOVING...' : 'YES'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 text-sm border border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))] transition-colors"
                >
                  NO
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-6 text-xs text-[hsl(var(--muted-foreground))] text-center">
          Position ID: {position.id} | Last updated: {new Date(position.updatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'primary';
}

function MetricCard({ label, value, variant = 'default' }: MetricCardProps) {
  return (
    <div className="ascii-box p-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${variant === 'primary' ? 'text-[hsl(var(--primary))]' : ''}`}>
        {value}
      </div>
    </div>
  );
}

interface TradeRowProps {
  trade: PositionTrade;
}

function TradeRow({ trade }: TradeRowProps) {
  const typeColor = trade.type === 'BUY'
    ? 'text-[hsl(var(--bullish))]'
    : 'text-[hsl(var(--bearish))]';

  return (
    <tr className="border-b border-[hsl(var(--border))] last:border-0">
      <td className="py-3 pr-4 text-[hsl(var(--muted-foreground))]">
        {new Date(trade.timestamp).toLocaleDateString()}
      </td>
      <td className={`py-3 pr-4 font-bold ${typeColor}`}>
        {trade.type}
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        {trade.shares.toFixed(2)}
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        ${trade.price.toFixed(4)}
      </td>
      <td className="py-3 pr-4 text-right font-mono">
        ${trade.total.toFixed(2)}
      </td>
      <td className="py-3 text-right font-mono text-[hsl(var(--muted-foreground))]">
        ${trade.fees.toFixed(2)}
      </td>
    </tr>
  );
}
