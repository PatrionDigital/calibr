'use client';

import * as React from 'react';
import NumberFlow from '@number-flow/react';
import { cn } from '@/lib/utils';

export interface ChainBalance {
  chain: string;
  balances: { token: string; amount: number }[];
}

export interface PendingBridge {
  amount: number;
  status: string;
}

export interface PortfolioSummaryProps {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  chainBalances: ChainBalance[];
  pendingBridges: PendingBridge[];
  periodPnl: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

export function PortfolioSummary({
  totalValue,
  totalPnl,
  totalPnlPercent,
  chainBalances,
  pendingBridges,
  periodPnl,
  className,
}: PortfolioSummaryProps) {
  const isPositive = totalPnl >= 0;
  const totalPending = pendingBridges.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div
      data-testid="portfolio-summary"
      className={cn(
        'border border-[hsl(var(--primary))] bg-[hsl(var(--background))] p-4 font-mono',
        className
      )}
    >
      {/* Header */}
      <div className="text-sm font-bold text-[hsl(var(--primary))] mb-4">
        ┌─[ PORTFOLIO SUMMARY ]
      </div>

      {/* Total Value */}
      <div className="mb-4">
        <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">TOTAL VALUE</div>
        <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
          <NumberFlow
            value={totalValue}
            format={{ style: 'currency', currency: 'USD' }}
          />
        </div>
        <div
          data-testid="total-pnl"
          className={cn(
            'text-sm flex items-center gap-1',
            isPositive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'
          )}
        >
          <span>{isPositive ? '▲' : '▼'}</span>
          <span>
            {isPositive ? '+' : ''}
            <NumberFlow
              value={totalPnl}
              format={{ style: 'currency', currency: 'USD' }}
            />
          </span>
          <span>({isPositive ? '+' : ''}{totalPnlPercent.toFixed(1)}%)</span>
        </div>
      </div>

      {/* Chain Balances */}
      <div className="flex flex-wrap gap-2 mb-4">
        {chainBalances.map((chain) => (
          <div
            key={chain.chain}
            className="flex-1 min-w-[120px] border border-[hsl(var(--border))] p-2"
          >
            <div className="text-xs font-bold text-[hsl(var(--primary))] mb-1">
              {chain.chain}
            </div>
            {chain.balances.map((bal) => (
              <div key={bal.token} className="text-xs text-[hsl(var(--muted-foreground))]">
                {formatNumber(bal.amount)} {bal.token}
              </div>
            ))}
          </div>
        ))}

        {pendingBridges.length > 0 && (
          <div className="flex-1 min-w-[120px] border border-[hsl(var(--warning))] border-dashed p-2">
            <div className="text-xs font-bold text-[hsl(var(--warning))] mb-1">
              PENDING
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              ${formatNumber(totalPending)}
            </div>
            <div className="text-xs text-[hsl(var(--warning))]">
              ({pendingBridges[0]?.status})
            </div>
          </div>
        )}
      </div>

      {/* Period P&L */}
      <div className="flex items-center gap-4 text-xs border-t border-[hsl(var(--border))] pt-2">
        <span className="text-[hsl(var(--muted-foreground))]">24H:</span>
        <span className={periodPnl['24h'] >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
          {periodPnl['24h'] >= 0 ? '+' : ''}{formatCurrency(periodPnl['24h'])}
        </span>
        <span className="text-[hsl(var(--border))]">│</span>
        <span className="text-[hsl(var(--muted-foreground))]">7D:</span>
        <span className={periodPnl['7d'] >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
          {periodPnl['7d'] >= 0 ? '+' : ''}{formatCurrency(periodPnl['7d'])}
        </span>
        <span className="text-[hsl(var(--border))]">│</span>
        <span className="text-[hsl(var(--muted-foreground))]">30D:</span>
        <span className={periodPnl['30d'] >= 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
          {periodPnl['30d'] >= 0 ? '+' : ''}{formatCurrency(periodPnl['30d'])}
        </span>
      </div>
    </div>
  );
}
