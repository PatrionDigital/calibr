/**
 * Position Detail Tests
 * TDD tests for individual position detail view component
 * Task 4.1.7: Create position detail view - Individual position management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  PositionDetail,
  PositionHeader,
  PositionMetrics,
  PositionPriceChart,
  PositionTransactionHistory,
  PositionActions,
  PositionMarketInfo,
  PositionRiskIndicator,
  usePositionDetail,
} from '@/components/position-detail';
import type { PositionData, Transaction, MarketInfo } from '@/components/position-detail';

// =============================================================================
// Test Data
// =============================================================================

const mockPosition: PositionData = {
  id: 'pos-1',
  marketId: 'market-1',
  marketQuestion: 'Will Bitcoin reach $150k by end of 2026?',
  outcome: 'YES',
  shares: 1500,
  avgEntryPrice: 0.45,
  currentPrice: 0.62,
  currentValue: 930.0,
  costBasis: 675.0,
  unrealizedPnl: 255.0,
  unrealizedPnlPercent: 37.78,
  realizedPnl: 50.0,
  platform: 'LIMITLESS',
  category: 'CRYPTO',
  createdAt: new Date('2024-12-15T10:00:00Z'),
  lastUpdatedAt: new Date('2026-01-20T15:30:00Z'),
};

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'BUY',
    shares: 1000,
    price: 0.42,
    total: 420.0,
    timestamp: new Date('2024-12-15T10:00:00Z'),
    txHash: '0xabc123',
  },
  {
    id: 'tx-2',
    type: 'BUY',
    shares: 500,
    price: 0.51,
    total: 255.0,
    timestamp: new Date('2025-01-10T14:30:00Z'),
    txHash: '0xdef456',
  },
  {
    id: 'tx-3',
    type: 'SELL',
    shares: 200,
    price: 0.58,
    total: 116.0,
    timestamp: new Date('2025-02-05T09:15:00Z'),
    txHash: '0xghi789',
  },
];

const mockMarketInfo: MarketInfo = {
  id: 'market-1',
  question: 'Will Bitcoin reach $150k by end of 2026?',
  description: 'Market resolves YES if Bitcoin price exceeds $150,000 USD at any point before December 31, 2026.',
  endDate: new Date('2026-12-31T12:00:00Z'),
  volume: 2500000,
  liquidity: 150000,
  yesPrice: 0.62,
  noPrice: 0.38,
  platform: 'LIMITLESS',
  category: 'CRYPTO',
  resolved: false,
};

// =============================================================================
// PositionHeader Tests
// =============================================================================

describe('PositionHeader', () => {
  it('should render position header', () => {
    render(<PositionHeader position={mockPosition} />);
    expect(screen.getByTestId('position-header')).toBeInTheDocument();
  });

  it('should display market question', () => {
    render(<PositionHeader position={mockPosition} />);
    expect(screen.getByText('Will Bitcoin reach $150k by end of 2026?')).toBeInTheDocument();
  });

  it('should display outcome side with styling', () => {
    render(<PositionHeader position={mockPosition} />);
    const outcomeBadge = screen.getByTestId('outcome-badge');
    expect(outcomeBadge).toHaveTextContent('YES');
    expect(outcomeBadge).toHaveAttribute('data-outcome', 'YES');
  });

  it('should display platform badge', () => {
    render(<PositionHeader position={mockPosition} />);
    expect(screen.getByTestId('platform-badge')).toHaveTextContent('LIMITLESS');
  });

  it('should display category', () => {
    render(<PositionHeader position={mockPosition} />);
    expect(screen.getByText('CRYPTO')).toBeInTheDocument();
  });

  it('should show back navigation button', () => {
    render(<PositionHeader position={mockPosition} onBack={() => {}} />);
    expect(screen.getByTestId('back-button')).toBeInTheDocument();
  });

  it('should call onBack when back button clicked', () => {
    const onBack = vi.fn();
    render(<PositionHeader position={mockPosition} onBack={onBack} />);
    fireEvent.click(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalled();
  });
});

// =============================================================================
// PositionMetrics Tests
// =============================================================================

describe('PositionMetrics', () => {
  it('should render metrics container', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('position-metrics')).toBeInTheDocument();
  });

  it('should display current shares', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-shares')).toHaveTextContent('1,500');
  });

  it('should display average entry price', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-entry-price')).toHaveTextContent('$0.45');
  });

  it('should display current price', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-current-price')).toHaveTextContent('$0.62');
  });

  it('should display current value', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-value')).toHaveTextContent('$930.00');
  });

  it('should display cost basis', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-cost-basis')).toHaveTextContent('$675.00');
  });

  it('should display unrealized P&L with correct sign', () => {
    render(<PositionMetrics position={mockPosition} />);
    const pnl = screen.getByTestId('metric-unrealized-pnl');
    expect(pnl).toHaveTextContent('+$255.00');
    expect(pnl).toHaveAttribute('data-positive', 'true');
  });

  it('should display unrealized P&L percentage', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-unrealized-pnl-percent')).toHaveTextContent('+37.78%');
  });

  it('should display realized P&L', () => {
    render(<PositionMetrics position={mockPosition} />);
    expect(screen.getByTestId('metric-realized-pnl')).toHaveTextContent('+$50.00');
  });

  it('should apply red styling for negative P&L', () => {
    const negativePosition = {
      ...mockPosition,
      unrealizedPnl: -100,
      unrealizedPnlPercent: -14.81,
    };
    render(<PositionMetrics position={negativePosition} />);
    const pnl = screen.getByTestId('metric-unrealized-pnl');
    expect(pnl).toHaveAttribute('data-positive', 'false');
  });
});

// =============================================================================
// PositionPriceChart Tests
// =============================================================================

describe('PositionPriceChart', () => {
  it('should render chart container', () => {
    render(<PositionPriceChart marketId={mockPosition.marketId} />);
    expect(screen.getByTestId('position-price-chart')).toBeInTheDocument();
  });

  it('should display chart title', () => {
    render(<PositionPriceChart marketId={mockPosition.marketId} />);
    expect(screen.getByText('Price History')).toBeInTheDocument();
  });

  it('should show entry price line indicator', () => {
    render(
      <PositionPriceChart
        marketId={mockPosition.marketId}
        entryPrice={mockPosition.avgEntryPrice}
      />
    );
    expect(screen.getByTestId('entry-price-line')).toBeInTheDocument();
  });

  it('should display timeframe selector', () => {
    render(<PositionPriceChart marketId={mockPosition.marketId} />);
    expect(screen.getByTestId('timeframe-selector')).toBeInTheDocument();
  });

  it('should have 1D, 1W, 1M, ALL timeframe options', () => {
    render(<PositionPriceChart marketId={mockPosition.marketId} />);
    expect(screen.getByText('1D')).toBeInTheDocument();
    expect(screen.getByText('1W')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('ALL')).toBeInTheDocument();
  });

  it('should call onTimeframeChange when timeframe selected', () => {
    const onTimeframeChange = vi.fn();
    render(
      <PositionPriceChart
        marketId={mockPosition.marketId}
        onTimeframeChange={onTimeframeChange}
      />
    );
    fireEvent.click(screen.getByText('1W'));
    expect(onTimeframeChange).toHaveBeenCalledWith('1W');
  });
});

// =============================================================================
// PositionTransactionHistory Tests
// =============================================================================

describe('PositionTransactionHistory', () => {
  it('should render transaction history container', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
  });

  it('should display section title', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('should display all transactions', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    const items = screen.getAllByTestId('transaction-item');
    expect(items).toHaveLength(3);
  });

  it('should display transaction type with styling', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    const buyBadges = screen.getAllByText('BUY');
    const sellBadges = screen.getAllByText('SELL');
    expect(buyBadges.length).toBe(2);
    expect(sellBadges.length).toBe(1);
  });

  it('should display transaction shares', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText('1,000 shares')).toBeInTheDocument();
    expect(screen.getByText('500 shares')).toBeInTheDocument();
  });

  it('should display transaction price', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText('@$0.42')).toBeInTheDocument();
  });

  it('should display transaction total', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText('$420.00')).toBeInTheDocument();
  });

  it('should display transaction date', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    expect(screen.getByText('Dec 15, 2024')).toBeInTheDocument();
  });

  it('should show empty state when no transactions', () => {
    render(<PositionTransactionHistory transactions={[]} />);
    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  });

  it('should link to transaction explorer', () => {
    render(<PositionTransactionHistory transactions={mockTransactions} />);
    const links = screen.getAllByTestId('tx-link');
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('0xabc123'));
  });
});

// =============================================================================
// PositionActions Tests
// =============================================================================

describe('PositionActions', () => {
  it('should render actions container', () => {
    render(<PositionActions position={mockPosition} />);
    expect(screen.getByTestId('position-actions')).toBeInTheDocument();
  });

  it('should display add to position button', () => {
    render(<PositionActions position={mockPosition} />);
    expect(screen.getByTestId('action-add')).toBeInTheDocument();
    expect(screen.getByText('Add to Position')).toBeInTheDocument();
  });

  it('should display close position button', () => {
    render(<PositionActions position={mockPosition} />);
    expect(screen.getByTestId('action-close')).toBeInTheDocument();
    expect(screen.getByText('Close Position')).toBeInTheDocument();
  });

  it('should display sell partial button', () => {
    render(<PositionActions position={mockPosition} />);
    expect(screen.getByTestId('action-sell-partial')).toBeInTheDocument();
    expect(screen.getByText('Sell Partial')).toBeInTheDocument();
  });

  it('should call onAdd when add button clicked', () => {
    const onAdd = vi.fn();
    render(<PositionActions position={mockPosition} onAdd={onAdd} />);
    fireEvent.click(screen.getByTestId('action-add'));
    expect(onAdd).toHaveBeenCalledWith(mockPosition);
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<PositionActions position={mockPosition} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('action-close'));
    expect(onClose).toHaveBeenCalledWith(mockPosition);
  });

  it('should call onSellPartial when sell partial clicked', () => {
    const onSellPartial = vi.fn();
    render(<PositionActions position={mockPosition} onSellPartial={onSellPartial} />);
    fireEvent.click(screen.getByTestId('action-sell-partial'));
    expect(onSellPartial).toHaveBeenCalledWith(mockPosition);
  });

  it('should disable actions when loading', () => {
    render(<PositionActions position={mockPosition} loading />);
    expect(screen.getByTestId('action-add')).toBeDisabled();
    expect(screen.getByTestId('action-close')).toBeDisabled();
    expect(screen.getByTestId('action-sell-partial')).toBeDisabled();
  });
});

// =============================================================================
// PositionMarketInfo Tests
// =============================================================================

describe('PositionMarketInfo', () => {
  it('should render market info container', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('position-market-info')).toBeInTheDocument();
  });

  it('should display section title', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByText('Market Info')).toBeInTheDocument();
  });

  it('should display market description', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByText(/Market resolves YES/)).toBeInTheDocument();
  });

  it('should display end date', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('market-end-date')).toHaveTextContent('Dec 31, 2026');
  });

  it('should display current YES/NO prices', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('market-yes-price')).toHaveTextContent('62%');
    expect(screen.getByTestId('market-no-price')).toHaveTextContent('38%');
  });

  it('should display volume', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('market-volume')).toHaveTextContent('$2.5M');
  });

  it('should display liquidity', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('market-liquidity')).toHaveTextContent('$150K');
  });

  it('should show resolved badge when market resolved', () => {
    const resolvedMarket = { ...mockMarketInfo, resolved: true, resolution: 'YES' as const };
    render(<PositionMarketInfo market={resolvedMarket} />);
    expect(screen.getByTestId('resolved-badge')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED: YES')).toBeInTheDocument();
  });

  it('should link to market page', () => {
    render(<PositionMarketInfo market={mockMarketInfo} />);
    expect(screen.getByTestId('view-market-link')).toHaveAttribute('href', expect.stringContaining('market-1'));
  });
});

// =============================================================================
// PositionRiskIndicator Tests
// =============================================================================

describe('PositionRiskIndicator', () => {
  it('should render risk indicator', () => {
    render(<PositionRiskIndicator position={mockPosition} />);
    expect(screen.getByTestId('risk-indicator')).toBeInTheDocument();
  });

  it('should display risk level', () => {
    render(<PositionRiskIndicator position={mockPosition} />);
    expect(screen.getByTestId('risk-level')).toBeInTheDocument();
  });

  it('should show portfolio weight', () => {
    render(<PositionRiskIndicator position={mockPosition} totalPortfolioValue={10000} />);
    expect(screen.getByTestId('portfolio-weight')).toHaveTextContent('9.3%');
  });

  it('should show warning for high concentration', () => {
    render(<PositionRiskIndicator position={mockPosition} totalPortfolioValue={1000} />);
    expect(screen.getByTestId('concentration-warning')).toBeInTheDocument();
  });

  it('should display max potential loss', () => {
    render(<PositionRiskIndicator position={mockPosition} />);
    expect(screen.getByTestId('max-loss')).toHaveTextContent('$930.00');
  });

  it('should display max potential gain', () => {
    render(<PositionRiskIndicator position={mockPosition} />);
    const maxGain = (1500 * 1) - mockPosition.currentValue;
    expect(screen.getByTestId('max-gain')).toBeInTheDocument();
  });
});

// =============================================================================
// PositionDetail Tests
// =============================================================================

describe('PositionDetail', () => {
  it('should render position detail page', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-detail')).toBeInTheDocument();
  });

  it('should display position header', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-header')).toBeInTheDocument();
  });

  it('should display position metrics', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-metrics')).toBeInTheDocument();
  });

  it('should display price chart', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-price-chart')).toBeInTheDocument();
  });

  it('should display transaction history', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
  });

  it('should display actions', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-actions')).toBeInTheDocument();
  });

  it('should display market info', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('position-market-info')).toBeInTheDocument();
  });

  it('should display risk indicator', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
      />
    );
    expect(screen.getByTestId('risk-indicator')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
        loading
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should call onBack when back is triggered', () => {
    const onBack = vi.fn();
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={onBack}
      />
    );
    fireEvent.click(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalled();
  });

  it('should call onClose when close position triggered', () => {
    const onClose = vi.fn();
    render(
      <PositionDetail
        position={mockPosition}
        transactions={mockTransactions}
        market={mockMarketInfo}
        onBack={() => {}}
        onClosePosition={onClose}
      />
    );
    fireEvent.click(screen.getByTestId('action-close'));
    expect(onClose).toHaveBeenCalledWith(mockPosition);
  });
});

// =============================================================================
// usePositionDetail Hook Tests
// =============================================================================

describe('usePositionDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent({ positionId }: { positionId: string }) {
    const { position, transactions, market, loading, error, refresh } = usePositionDetail(positionId);

    return (
      <div>
        <div data-testid="loading">{loading ? 'true' : 'false'}</div>
        <div data-testid="error">{error || 'none'}</div>
        <div data-testid="position-id">{position?.id || 'none'}</div>
        <div data-testid="tx-count">{transactions?.length ?? 0}</div>
        <div data-testid="market-id">{market?.id || 'none'}</div>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  it('should start in loading state', () => {
    render(<TestComponent positionId="pos-1" />);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('should load position data', async () => {
    render(<TestComponent positionId="pos-1" />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('position-id')).toHaveTextContent('pos-1');
  });

  it('should load transactions', async () => {
    render(<TestComponent positionId="pos-1" />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(Number(screen.getByTestId('tx-count').textContent)).toBeGreaterThan(0);
  });

  it('should load market info', async () => {
    render(<TestComponent positionId="pos-1" />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('market-id')).not.toHaveTextContent('none');
  });

  it('should handle error state', async () => {
    render(<TestComponent positionId="invalid-id" />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  });

  it('should refresh data when refresh called', async () => {
    render(<TestComponent positionId="pos-1" />);

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('Refresh'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
});
