import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioSummary, type PortfolioSummaryProps } from './portfolio-summary';

// Mock NumberFlow
vi.mock('@number-flow/react', () => ({
  default: ({ value, format }: { value: number; format?: Intl.NumberFormatOptions }) => {
    const formatter = new Intl.NumberFormat('en-US', format);
    return <span data-testid="number-flow">{formatter.format(value)}</span>;
  },
}));

describe('PortfolioSummary', () => {
  const defaultProps: PortfolioSummaryProps = {
    totalValue: 12450.0,
    totalPnl: 1230.0,
    totalPnlPercent: 10.9,
    chainBalances: [
      { chain: 'BASE', balances: [{ token: 'USDC', amount: 2100 }, { token: 'CALIBR', amount: 1200000 }] },
      { chain: 'POLYGON', balances: [{ token: 'USDC', amount: 8350 }] },
    ],
    pendingBridges: [{ amount: 2000, status: 'bridging' }],
    periodPnl: {
      '24h': 45.2,
      '7d': 312.0,
      '30d': 1230.0,
    },
  };

  describe('rendering', () => {
    it('renders portfolio summary box', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
    });

    it('displays the title', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText(/PORTFOLIO SUMMARY/)).toBeInTheDocument();
    });

    it('displays total value', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText('TOTAL VALUE')).toBeInTheDocument();
    });

    it('uses NumberFlow for animated value', () => {
      render(<PortfolioSummary {...defaultProps} />);
      const numberFlows = screen.getAllByTestId('number-flow');
      expect(numberFlows.length).toBeGreaterThan(0);
    });
  });

  describe('P&L display', () => {
    it('shows positive P&L in green', () => {
      render(<PortfolioSummary {...defaultProps} />);
      const pnlElement = screen.getByTestId('total-pnl');
      expect(pnlElement).toHaveClass('text-[hsl(var(--success))]');
    });

    it('shows negative P&L in red', () => {
      render(<PortfolioSummary {...defaultProps} totalPnl={-500} totalPnlPercent={-4.2} />);
      const pnlElement = screen.getByTestId('total-pnl');
      expect(pnlElement).toHaveClass('text-[hsl(var(--destructive))]');
    });

    it('displays percentage change', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText(/\+10\.9%/)).toBeInTheDocument();
    });

    it('shows up arrow for positive', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('shows down arrow for negative', () => {
      render(<PortfolioSummary {...defaultProps} totalPnl={-500} totalPnlPercent={-4.2} />);
      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  describe('chain balances', () => {
    it('displays chain balance cards', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText('BASE')).toBeInTheDocument();
      expect(screen.getByText('POLYGON')).toBeInTheDocument();
    });

    it('displays token balances', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getAllByText(/USDC/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/CALIBR/).length).toBeGreaterThan(0);
    });

    it('shows pending bridges section', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText(/bridging/i)).toBeInTheDocument();
    });

    it('hides pending section when no bridges', () => {
      render(<PortfolioSummary {...defaultProps} pendingBridges={[]} />);
      expect(screen.queryByText('PENDING')).not.toBeInTheDocument();
    });
  });

  describe('period P&L', () => {
    it('displays time period options', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText('24H:')).toBeInTheDocument();
      expect(screen.getByText('7D:')).toBeInTheDocument();
      expect(screen.getByText('30D:')).toBeInTheDocument();
    });

    it('displays P&L values for each period', () => {
      render(<PortfolioSummary {...defaultProps} />);
      expect(screen.getByText(/\+\$45\.20/)).toBeInTheDocument();
      expect(screen.getByText(/\+\$312\.00/)).toBeInTheDocument();
      expect(screen.getByText(/\+\$1,230\.00/)).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('uses terminal aesthetic', () => {
      render(<PortfolioSummary {...defaultProps} />);
      const container = screen.getByTestId('portfolio-summary');
      expect(container).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<PortfolioSummary {...defaultProps} className="custom-class" />);
      const container = screen.getByTestId('portfolio-summary');
      expect(container).toHaveClass('custom-class');
    });
  });
});
