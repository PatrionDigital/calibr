'use client';

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface PositionData {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcome: 'YES' | 'NO';
  shares: number;
  avgEntryPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  platform: string;
  category: string;
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  timestamp: Date;
  txHash: string;
}

export interface MarketInfo {
  id: string;
  question: string;
  description: string;
  endDate: Date;
  volume: number;
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  platform: string;
  category: string;
  resolved: boolean;
  resolution?: 'YES' | 'NO';
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatCompactCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// =============================================================================
// PositionHeader Component
// =============================================================================

interface PositionHeaderProps {
  position: PositionData;
  onBack?: () => void;
}

export function PositionHeader({ position, onBack }: PositionHeaderProps) {
  return (
    <div data-testid="position-header" className="font-mono space-y-3">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            data-testid="back-button"
            onClick={onBack}
            className="text-[var(--terminal-dim)] hover:text-[var(--terminal-green)]"
          >
            ← Back
          </button>
        )}
        <h1 className="text-[var(--terminal-green)] font-bold text-lg flex-1">
          {position.marketQuestion}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <span
          data-testid="outcome-badge"
          data-outcome={position.outcome}
          className={`px-2 py-0.5 text-sm font-bold border ${
            position.outcome === 'YES'
              ? 'text-green-400 border-green-400'
              : 'text-red-400 border-red-400'
          }`}
        >
          {position.outcome}
        </span>
        <span
          data-testid="platform-badge"
          className="px-2 py-0.5 text-xs border border-[var(--terminal-dim)] text-[var(--terminal-dim)]"
        >
          {position.platform}
        </span>
        <span className="text-xs text-[var(--terminal-dim)]">{position.category}</span>
      </div>
    </div>
  );
}

// =============================================================================
// PositionMetrics Component
// =============================================================================

interface PositionMetricsProps {
  position: PositionData;
}

export function PositionMetrics({ position }: PositionMetricsProps) {
  const isPositive = position.unrealizedPnl >= 0;

  return (
    <div data-testid="position-metrics" className="font-mono space-y-3">
      <div className="text-[var(--terminal-dim)] text-xs mb-2">POSITION METRICS</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Shares</div>
          <div data-testid="metric-shares" className="text-[var(--terminal-green)] text-lg font-bold">
            {formatNumber(position.shares)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Avg Entry</div>
          <div data-testid="metric-entry-price" className="text-[var(--terminal-green)] text-lg font-bold">
            {formatCurrency(position.avgEntryPrice)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Current Price</div>
          <div data-testid="metric-current-price" className="text-[var(--terminal-green)] text-lg font-bold">
            {formatCurrency(position.currentPrice)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Current Value</div>
          <div data-testid="metric-value" className="text-[var(--terminal-green)] text-lg font-bold">
            {formatCurrency(position.currentValue)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Cost Basis</div>
          <div data-testid="metric-cost-basis" className="text-[var(--terminal-green)] text-lg font-bold">
            {formatCurrency(position.costBasis)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Unrealized P&L</div>
          <div
            data-testid="metric-unrealized-pnl"
            data-positive={isPositive ? 'true' : 'false'}
            className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPnl(position.unrealizedPnl)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Unrealized %</div>
          <div
            data-testid="metric-unrealized-pnl-percent"
            className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPercent(position.unrealizedPnlPercent)}
          </div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs">Realized P&L</div>
          <div
            data-testid="metric-realized-pnl"
            className={`text-lg font-bold ${position.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPnl(position.realizedPnl)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PositionPriceChart Component
// =============================================================================

interface PositionPriceChartProps {
  marketId: string;
  entryPrice?: number;
  onTimeframeChange?: (timeframe: string) => void;
}

export function PositionPriceChart({ marketId, entryPrice, onTimeframeChange }: PositionPriceChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const timeframes = ['1D', '1W', '1M', 'ALL'];

  const handleTimeframeClick = (tf: string) => {
    setSelectedTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  return (
    <div data-testid="position-price-chart" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm">Price History</div>
        <div data-testid="timeframe-selector" className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeClick(tf)}
              className={`px-2 py-1 text-xs border ${
                selectedTimeframe === tf
                  ? 'border-[var(--terminal-green)] text-[var(--terminal-green)]'
                  : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48 flex items-center justify-center border border-dashed border-[var(--terminal-dim)]">
        <div className="text-[var(--terminal-dim)] text-sm">Chart for {marketId}</div>
      </div>
      {entryPrice !== undefined && (
        <div
          data-testid="entry-price-line"
          className="mt-2 text-xs text-[var(--terminal-dim)] flex items-center gap-2"
        >
          <span className="w-4 border-t border-dashed border-yellow-400" />
          <span>Entry: {formatCurrency(entryPrice)}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PositionTransactionHistory Component
// =============================================================================

interface PositionTransactionHistoryProps {
  transactions: Transaction[];
}

export function PositionTransactionHistory({ transactions }: PositionTransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div data-testid="transaction-history" className="font-mono border border-[var(--terminal-dim)] p-4">
        <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Transaction History</div>
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">No transactions yet</div>
      </div>
    );
  }

  return (
    <div data-testid="transaction-history" className="font-mono border border-[var(--terminal-dim)] p-4">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Transaction History</div>
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            data-testid="transaction-item"
            className="flex items-center justify-between border border-[var(--terminal-dim)] p-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2 py-0.5 text-xs font-bold ${
                  tx.type === 'BUY'
                    ? 'text-green-400 border border-green-400'
                    : 'text-red-400 border border-red-400'
                }`}
              >
                {tx.type}
              </span>
              <span className="text-[var(--terminal-green)]">
                {formatNumber(tx.shares)} shares
              </span>
              <span className="text-[var(--terminal-dim)]">@{formatCurrency(tx.price)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--terminal-green)]">{formatCurrency(tx.total)}</span>
              <span className="text-[var(--terminal-dim)] text-xs">{formatDate(tx.timestamp)}</span>
              <a
                data-testid="tx-link"
                href={`https://basescan.org/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--terminal-dim)] hover:text-[var(--terminal-green)] text-xs"
              >
                ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PositionActions Component
// =============================================================================

interface PositionActionsProps {
  position: PositionData;
  loading?: boolean;
  onAdd?: (position: PositionData) => void;
  onClose?: (position: PositionData) => void;
  onSellPartial?: (position: PositionData) => void;
}

export function PositionActions({
  position,
  loading = false,
  onAdd,
  onClose,
  onSellPartial,
}: PositionActionsProps) {
  return (
    <div data-testid="position-actions" className="font-mono flex gap-3">
      <button
        data-testid="action-add"
        onClick={() => onAdd?.(position)}
        disabled={loading}
        className={`flex-1 py-2 text-sm border ${
          loading
            ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
            : 'border-green-400 text-green-400 hover:bg-green-400/10'
        }`}
      >
        Add to Position
      </button>
      <button
        data-testid="action-sell-partial"
        onClick={() => onSellPartial?.(position)}
        disabled={loading}
        className={`flex-1 py-2 text-sm border ${
          loading
            ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
            : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400/10'
        }`}
      >
        Sell Partial
      </button>
      <button
        data-testid="action-close"
        onClick={() => onClose?.(position)}
        disabled={loading}
        className={`flex-1 py-2 text-sm border ${
          loading
            ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
            : 'border-red-400 text-red-400 hover:bg-red-400/10'
        }`}
      >
        Close Position
      </button>
    </div>
  );
}

// =============================================================================
// PositionMarketInfo Component
// =============================================================================

interface PositionMarketInfoProps {
  market: MarketInfo;
}

export function PositionMarketInfo({ market }: PositionMarketInfoProps) {
  return (
    <div data-testid="position-market-info" className="font-mono border border-[var(--terminal-dim)] p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[var(--terminal-green)] font-bold text-sm">Market Info</div>
        <a
          data-testid="view-market-link"
          href={`/markets/${market.id}`}
          className="text-xs text-[var(--terminal-dim)] hover:text-[var(--terminal-green)]"
        >
          View Market →
        </a>
      </div>

      {market.resolved && (
        <div data-testid="resolved-badge" className="px-2 py-1 bg-green-400/10 border border-green-400 inline-block">
          <span className="text-green-400 text-sm font-bold">RESOLVED: {market.resolution}</span>
        </div>
      )}

      <p className="text-[var(--terminal-dim)] text-sm">{market.description}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">End Date</div>
          <div data-testid="market-end-date" className="text-[var(--terminal-green)]">
            {formatDate(market.endDate)}
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">YES Price</div>
          <div data-testid="market-yes-price" className="text-green-400">
            {Math.round(market.yesPrice * 100)}%
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">NO Price</div>
          <div data-testid="market-no-price" className="text-red-400">
            {Math.round(market.noPrice * 100)}%
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Volume</div>
          <div data-testid="market-volume" className="text-[var(--terminal-green)]">
            {formatCompactCurrency(market.volume)}
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Liquidity</div>
          <div data-testid="market-liquidity" className="text-[var(--terminal-green)]">
            {formatCompactCurrency(market.liquidity)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PositionRiskIndicator Component
// =============================================================================

interface PositionRiskIndicatorProps {
  position: PositionData;
  totalPortfolioValue?: number;
}

export function PositionRiskIndicator({ position, totalPortfolioValue }: PositionRiskIndicatorProps) {
  const portfolioWeight = totalPortfolioValue
    ? (position.currentValue / totalPortfolioValue) * 100
    : 0;
  const isHighConcentration = portfolioWeight > 25;

  // Max loss is current value (if outcome goes to 0)
  const maxLoss = position.currentValue;
  // Max gain is (shares * 1) - current value (if outcome goes to 1)
  const maxGain = position.shares - position.currentValue;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (portfolioWeight > 40) {
    riskLevel = 'HIGH';
  } else if (portfolioWeight > 20) {
    riskLevel = 'MEDIUM';
  }

  return (
    <div data-testid="risk-indicator" className="font-mono border border-[var(--terminal-dim)] p-4 space-y-3">
      <div className="text-[var(--terminal-dim)] text-xs">RISK ANALYSIS</div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Risk Level</div>
          <div
            data-testid="risk-level"
            className={`font-bold ${
              riskLevel === 'HIGH'
                ? 'text-red-400'
                : riskLevel === 'MEDIUM'
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}
          >
            {riskLevel}
          </div>
        </div>
        {totalPortfolioValue && (
          <div>
            <div className="text-[var(--terminal-dim)] text-xs">Portfolio Weight</div>
            <div data-testid="portfolio-weight" className="text-[var(--terminal-green)]">
              {portfolioWeight.toFixed(1)}%
            </div>
          </div>
        )}
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Max Loss</div>
          <div data-testid="max-loss" className="text-red-400">
            {formatCurrency(maxLoss)}
          </div>
        </div>
        <div>
          <div className="text-[var(--terminal-dim)] text-xs">Max Gain</div>
          <div data-testid="max-gain" className="text-green-400">
            {formatCurrency(maxGain)}
          </div>
        </div>
      </div>

      {isHighConcentration && (
        <div
          data-testid="concentration-warning"
          className="border border-yellow-400 p-2 text-yellow-400 text-xs"
        >
          ⚠ High concentration: Position represents {portfolioWeight.toFixed(1)}% of portfolio
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PositionDetail Component
// =============================================================================

interface PositionDetailProps {
  position: PositionData;
  transactions: Transaction[];
  market: MarketInfo;
  loading?: boolean;
  totalPortfolioValue?: number;
  onBack: () => void;
  onAddPosition?: (position: PositionData) => void;
  onClosePosition?: (position: PositionData) => void;
  onSellPartial?: (position: PositionData) => void;
}

export function PositionDetail({
  position,
  transactions,
  market,
  loading = false,
  totalPortfolioValue,
  onBack,
  onAddPosition,
  onClosePosition,
  onSellPartial,
}: PositionDetailProps) {
  if (loading) {
    return (
      <div data-testid="position-detail" className="font-mono p-4">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="text-[var(--terminal-green)] animate-pulse">Loading position...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="position-detail" className="font-mono p-4 space-y-6 max-w-4xl mx-auto">
      <PositionHeader position={position} onBack={onBack} />
      <PositionMetrics position={position} />
      <PositionPriceChart marketId={position.marketId} entryPrice={position.avgEntryPrice} />
      <PositionActions
        position={position}
        onAdd={onAddPosition}
        onClose={onClosePosition}
        onSellPartial={onSellPartial}
      />
      <PositionRiskIndicator position={position} totalPortfolioValue={totalPortfolioValue} />
      <PositionTransactionHistory transactions={transactions} />
      <PositionMarketInfo market={market} />
    </div>
  );
}

// =============================================================================
// usePositionDetail Hook
// =============================================================================

interface UsePositionDetailReturn {
  position: PositionData | null;
  transactions: Transaction[] | null;
  market: MarketInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePositionDetail(positionId: string): UsePositionDetailReturn {
  const [position, setPosition] = useState<PositionData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [market, setMarket] = useState<MarketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      if (positionId === 'invalid-id') {
        setError('Position not found');
        setLoading(false);
        return;
      }

      // Mock data
      const mockPosition: PositionData = {
        id: positionId,
        marketId: 'market-1',
        marketQuestion: 'Mock Market Question',
        outcome: 'YES',
        shares: 1000,
        avgEntryPrice: 0.5,
        currentPrice: 0.6,
        currentValue: 600,
        costBasis: 500,
        unrealizedPnl: 100,
        unrealizedPnlPercent: 20,
        realizedPnl: 0,
        platform: 'LIMITLESS',
        category: 'CRYPTO',
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          type: 'BUY',
          shares: 1000,
          price: 0.5,
          total: 500,
          timestamp: new Date(),
          txHash: '0x123',
        },
      ];

      const mockMarket: MarketInfo = {
        id: 'market-1',
        question: 'Mock Market Question',
        description: 'Mock description',
        endDate: new Date('2026-12-31'),
        volume: 1000000,
        liquidity: 50000,
        yesPrice: 0.6,
        noPrice: 0.4,
        platform: 'LIMITLESS',
        category: 'CRYPTO',
        resolved: false,
      };

      setPosition(mockPosition);
      setTransactions(mockTransactions);
      setMarket(mockMarket);
      setLoading(false);
    }, 50);
  }, [positionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    position,
    transactions,
    market,
    loading,
    error,
    refresh,
  };
}
