import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeeBreakdown, type FeeBreakdownProps, calculateFees } from './fee-breakdown';

describe('FeeBreakdown', () => {
  const defaultProps: FeeBreakdownProps = {
    calibrAmount: 100,
    usdcEstimate: 10, // 100 CALIBR at $0.10 = $10
  };

  describe('rendering', () => {
    it('renders the fee breakdown header', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText('FEE BREAKDOWN')).toBeInTheDocument();
    });

    it('displays swap fee with percentage', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/swap fee/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.3%/i)).toBeInTheDocument();
    });

    it('displays bridge fee', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/bridge fee/i)).toBeInTheDocument();
    });

    it('displays trading fee with percentage', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/trading fee/i)).toBeInTheDocument();
      expect(screen.getByText(/0\.1%/i)).toBeInTheDocument();
    });

    it('displays total fees', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/total fees/i)).toBeInTheDocument();
    });

    it('displays net amount to trade', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/net to trade/i)).toBeInTheDocument();
    });
  });

  describe('fee calculations', () => {
    it('calculates swap fee as 0.3% of USD value', () => {
      const fees = calculateFees(100, 10);
      // 0.3% of $10 = $0.03
      expect(fees.swapFee).toBeCloseTo(0.03, 2);
    });

    it('uses fixed bridge fee of $0.10', () => {
      const fees = calculateFees(100, 10);
      expect(fees.bridgeFee).toBe(0.10);
    });

    it('calculates trading fee as 0.1% of amount after swap and bridge', () => {
      const fees = calculateFees(100, 10);
      // After swap ($0.03) and bridge ($0.10): $10 - $0.03 - $0.10 = $9.87
      // Trading fee: 0.1% of $9.87 = $0.00987
      const afterSwapAndBridge = 10 - 0.03 - 0.10;
      const expectedTradingFee = afterSwapAndBridge * 0.001;
      expect(fees.tradingFee).toBeCloseTo(expectedTradingFee, 4);
    });

    it('calculates total fees correctly', () => {
      const fees = calculateFees(100, 10);
      const expectedTotal = fees.swapFee + fees.bridgeFee + fees.tradingFee;
      expect(fees.totalFees).toBeCloseTo(expectedTotal, 4);
    });

    it('calculates net amount correctly', () => {
      const fees = calculateFees(100, 10);
      const expectedNet = 10 - fees.totalFees;
      expect(fees.netAmount).toBeCloseTo(expectedNet, 4);
    });

    it('handles zero amount gracefully', () => {
      const fees = calculateFees(0, 0);
      expect(fees.swapFee).toBe(0);
      expect(fees.bridgeFee).toBe(0.10);
      expect(fees.totalFees).toBeCloseTo(0.10, 2);
    });
  });

  describe('sponsored gas display', () => {
    it('shows gas as sponsored by default', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByText(/sponsored/i)).toBeInTheDocument();
    });

    it('shows gas amount when gasSponsored is false', () => {
      render(<FeeBreakdown {...defaultProps} gasSponsored={false} gasEstimate={0.05} />);

      expect(screen.getByText('$0.05')).toBeInTheDocument();
      expect(screen.queryByText(/sponsored/i)).not.toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('formats USD values with $ prefix and 2 decimal places', () => {
      render(<FeeBreakdown calibrAmount={1000} usdcEstimate={100} />);

      // Swap fee: 0.3% of $100 = $0.30
      expect(screen.getByTestId('swap-fee-value')).toHaveTextContent('$0.30');
    });

    it('formats bridge fee consistently', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.getByTestId('bridge-fee-value')).toHaveTextContent('$0.10');
    });
  });

  describe('terminal styling', () => {
    it('uses ASCII box styling', () => {
      render(<FeeBreakdown {...defaultProps} />);

      const container = screen.getByTestId('fee-breakdown');
      expect(container).toHaveClass('border');
    });

    it('uses terminal color for header', () => {
      render(<FeeBreakdown {...defaultProps} />);

      const header = screen.getByText('FEE BREAKDOWN');
      expect(header).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });

    it('highlights total fees with warning color', () => {
      render(<FeeBreakdown {...defaultProps} />);

      const totalValue = screen.getByTestId('total-fees-value');
      expect(totalValue).toHaveClass('text-[hsl(var(--warning))]');
    });

    it('highlights net amount with primary color', () => {
      render(<FeeBreakdown {...defaultProps} />);

      const netValue = screen.getByTestId('net-amount-value');
      expect(netValue).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('compact mode', () => {
    it('renders in compact mode when specified', () => {
      render(<FeeBreakdown {...defaultProps} compact />);

      const container = screen.getByTestId('fee-breakdown');
      expect(container).toHaveClass('p-2');
    });

    it('shows only total and net in compact mode', () => {
      render(<FeeBreakdown {...defaultProps} compact />);

      // Should show total and net
      expect(screen.getByText(/total fees/i)).toBeInTheDocument();
      expect(screen.getByText(/net to trade/i)).toBeInTheDocument();

      // Should NOT show individual fees in compact mode
      expect(screen.queryByText(/swap fee/i)).not.toBeInTheDocument();
    });
  });

  describe('expected shares display', () => {
    it('displays expected shares when outcomePrice is provided', () => {
      render(<FeeBreakdown {...defaultProps} outcomePrice={0.65} />);

      expect(screen.getByText(/expected shares/i)).toBeInTheDocument();
    });

    it('calculates shares correctly based on net amount and price', () => {
      const props = { calibrAmount: 100, usdcEstimate: 10, outcomePrice: 0.5 };
      render(<FeeBreakdown {...props} />);

      // Net amount after fees divided by price
      const fees = calculateFees(100, 10);
      const expectedShares = fees.netAmount / 0.5;
      const sharesText = screen.getByTestId('expected-shares-value');
      expect(sharesText).toHaveTextContent(`~${expectedShares.toFixed(2)}`);
    });

    it('hides shares display when outcomePrice is not provided', () => {
      render(<FeeBreakdown {...defaultProps} />);

      expect(screen.queryByText(/expected shares/i)).not.toBeInTheDocument();
    });
  });
});
