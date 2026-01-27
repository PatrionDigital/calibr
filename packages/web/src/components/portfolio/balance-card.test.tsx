import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceCard, type BalanceCardProps } from './balance-card';

describe('BalanceCard', () => {
  const defaultProps: BalanceCardProps = {
    chain: 'BASE',
    address: '0x7a3f1234567890abcdef1234567890abcdef9e2b',
    balances: [
      { token: 'CALIBR', amount: 1234567.0, symbol: '$CALIBR' },
      { token: 'USDC', amount: 2100.5, symbol: 'USDC' },
      { token: 'ETH', amount: 0.0245, symbol: 'ETH' },
    ],
    isConnected: true,
  };

  describe('rendering', () => {
    it('renders balance card', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByTestId('balance-card')).toBeInTheDocument();
    });

    it('displays chain name in title', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByText(/BASE/)).toBeInTheDocument();
    });

    it('shows chain indicator for different chains', () => {
      render(<BalanceCard {...defaultProps} chain="POLYGON" />);
      expect(screen.getByText(/POLYGON/)).toBeInTheDocument();
    });
  });

  describe('connection status', () => {
    it('shows connected indicator when connected', () => {
      render(<BalanceCard {...defaultProps} isConnected={true} />);
      expect(screen.getByText('◉')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows disconnected indicator when not connected', () => {
      render(<BalanceCard {...defaultProps} isConnected={false} />);
      expect(screen.getByText('○')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('applies correct styling for connected state', () => {
      render(<BalanceCard {...defaultProps} isConnected={true} />);
      const indicator = screen.getByTestId('connection-status');
      expect(indicator).toHaveClass('text-[hsl(var(--success))]');
    });

    it('applies correct styling for disconnected state', () => {
      render(<BalanceCard {...defaultProps} isConnected={false} />);
      const indicator = screen.getByTestId('connection-status');
      expect(indicator).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });
  });

  describe('token balances', () => {
    it('displays all token balances', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByText('$CALIBR')).toBeInTheDocument();
      expect(screen.getByText('USDC')).toBeInTheDocument();
      expect(screen.getByText('ETH')).toBeInTheDocument();
    });

    it('formats large numbers correctly', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByText('1,234,567.00')).toBeInTheDocument();
    });

    it('formats small numbers with proper decimals', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByText('0.0245')).toBeInTheDocument();
    });

    it('shows empty state when no balances', () => {
      render(<BalanceCard {...defaultProps} balances={[]} />);
      expect(screen.getByText('No balances')).toBeInTheDocument();
    });
  });

  describe('wallet address', () => {
    it('displays truncated address', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByText('0x7a3f...9e2b')).toBeInTheDocument();
    });

    it('has copy button', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByLabelText('Copy address')).toBeInTheDocument();
    });

    it('has explorer link', () => {
      render(<BalanceCard {...defaultProps} />);
      expect(screen.getByLabelText('View on explorer')).toBeInTheDocument();
    });

    it('calls onCopy when copy button clicked', () => {
      const onCopy = vi.fn();
      render(<BalanceCard {...defaultProps} onCopy={onCopy} />);
      fireEvent.click(screen.getByLabelText('Copy address'));
      expect(onCopy).toHaveBeenCalledWith(defaultProps.address);
    });

    it('links to correct explorer based on chain', () => {
      render(<BalanceCard {...defaultProps} chain="BASE" />);
      const explorerLink = screen.getByLabelText('View on explorer');
      expect(explorerLink).toHaveAttribute('href', expect.stringContaining('basescan.org'));
    });

    it('links to Polygon explorer for Polygon chain', () => {
      render(<BalanceCard {...defaultProps} chain="POLYGON" />);
      const explorerLink = screen.getByLabelText('View on explorer');
      expect(explorerLink).toHaveAttribute('href', expect.stringContaining('polygonscan.com'));
    });
  });

  describe('styling', () => {
    it('uses terminal border styling', () => {
      render(<BalanceCard {...defaultProps} />);
      const card = screen.getByTestId('balance-card');
      expect(card).toHaveClass('border');
    });

    it('applies chain-specific color accent', () => {
      render(<BalanceCard {...defaultProps} chain="BASE" />);
      const card = screen.getByTestId('balance-card');
      expect(card).toHaveAttribute('data-chain', 'BASE');
    });

    it('applies custom className', () => {
      render(<BalanceCard {...defaultProps} className="custom-class" />);
      const card = screen.getByTestId('balance-card');
      expect(card).toHaveClass('custom-class');
    });
  });
});
