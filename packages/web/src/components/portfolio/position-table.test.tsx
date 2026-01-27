import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionTable, type PositionTableProps, type Position } from './position-table';

describe('PositionTable', () => {
  const mockPositions: Position[] = [
    {
      id: '1',
      marketQuestion: 'Trump wins 2028',
      outcome: 'YES',
      shares: 1000,
      currentValue: 452.0,
      pnl: 52.0,
      pnlPercent: 13.0,
      platform: 'POLYMARKET',
      category: 'POLITICS',
    },
    {
      id: '2',
      marketQuestion: 'BTC > 100k by Dec',
      outcome: 'NO',
      shares: 500,
      currentValue: 139.5,
      pnl: -10.5,
      pnlPercent: -7.0,
      platform: 'LIMITLESS',
      category: 'CRYPTO',
    },
    {
      id: '3',
      marketQuestion: 'ETH flips BTC',
      outcome: 'YES',
      shares: 2500,
      currentValue: 125.0,
      pnl: 25.0,
      pnlPercent: 25.0,
      platform: 'POLYMARKET',
      category: 'CRYPTO',
    },
  ];

  const defaultProps: PositionTableProps = {
    positions: mockPositions,
    onPositionClick: vi.fn(),
    onClosePosition: vi.fn(),
  };

  describe('rendering', () => {
    it('renders position table', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByTestId('position-table')).toBeInTheDocument();
    });

    it('displays table title', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText('POSITIONS')).toBeInTheDocument();
    });

    it('displays column headers', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText('MARKET')).toBeInTheDocument();
      expect(screen.getByText('SIDE')).toBeInTheDocument();
      expect(screen.getByText('SIZE')).toBeInTheDocument();
      expect(screen.getByText('VALUE')).toBeInTheDocument();
      expect(screen.getByText('P&L')).toBeInTheDocument();
    });

    it('displays all position rows', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText('Trump wins 2028')).toBeInTheDocument();
      expect(screen.getByText('BTC > 100k by Dec')).toBeInTheDocument();
      expect(screen.getByText('ETH flips BTC')).toBeInTheDocument();
    });

    it('displays empty state when no positions', () => {
      render(<PositionTable {...defaultProps} positions={[]} />);
      expect(screen.getByText('No positions found')).toBeInTheDocument();
    });
  });

  describe('position data display', () => {
    it('shows outcome side', () => {
      render(<PositionTable {...defaultProps} />);
      const yesCells = screen.getAllByText('YES');
      const noCells = screen.getAllByText('NO');
      expect(yesCells.length).toBeGreaterThan(0);
      expect(noCells.length).toBeGreaterThan(0);
    });

    it('shows share count', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('shows current value', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText('$452.00')).toBeInTheDocument();
    });

    it('shows P&L with correct formatting', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText(/\+\$52\.00/)).toBeInTheDocument();
      expect(screen.getByText(/-\$10\.50/)).toBeInTheDocument();
    });

    it('shows P&L percentage', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText(/\+13%/)).toBeInTheDocument();
      expect(screen.getByText(/-7%/)).toBeInTheDocument();
    });

    it('displays platform badge', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getAllByText('POLYMARKET').length).toBeGreaterThan(0);
      expect(screen.getByText('LIMITLESS')).toBeInTheDocument();
    });
  });

  describe('P&L styling', () => {
    it('applies green color for positive P&L', () => {
      render(<PositionTable {...defaultProps} />);
      const pnlCells = screen.getAllByTestId('pnl-cell');
      const positiveCell = pnlCells.find(cell => cell.textContent?.includes('+$52.00'));
      expect(positiveCell).toHaveClass('text-[hsl(var(--success))]');
    });

    it('applies red color for negative P&L', () => {
      render(<PositionTable {...defaultProps} />);
      const pnlCells = screen.getAllByTestId('pnl-cell');
      const negativeCell = pnlCells.find(cell => cell.textContent?.includes('-$10.50'));
      expect(negativeCell).toHaveClass('text-[hsl(var(--destructive))]');
    });
  });

  describe('sorting', () => {
    it('shows sort dropdown', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText(/Sort/i)).toBeInTheDocument();
    });

    it('calls onSort when sort option selected', () => {
      const onSort = vi.fn();
      render(<PositionTable {...defaultProps} onSort={onSort} />);
      fireEvent.click(screen.getByText(/Sort/i));
      const valueOption = screen.getByText('Value');
      fireEvent.click(valueOption);
      expect(onSort).toHaveBeenCalledWith('value', 'desc');
    });
  });

  describe('filtering', () => {
    it('shows filter dropdown', () => {
      render(<PositionTable {...defaultProps} />);
      expect(screen.getByText(/Filter/i)).toBeInTheDocument();
    });

    it('filters by platform', () => {
      const onFilter = vi.fn();
      render(<PositionTable {...defaultProps} onFilter={onFilter} />);
      fireEvent.click(screen.getByText(/Filter/i));
      const polymarketOption = screen.getByText('Polymarket');
      fireEvent.click(polymarketOption);
      expect(onFilter).toHaveBeenCalledWith({ platform: 'POLYMARKET' });
    });
  });

  describe('row interaction', () => {
    it('calls onPositionClick when row clicked', () => {
      const onPositionClick = vi.fn();
      render(<PositionTable {...defaultProps} onPositionClick={onPositionClick} />);
      fireEvent.click(screen.getByText('Trump wins 2028'));
      expect(onPositionClick).toHaveBeenCalledWith(mockPositions[0]);
    });

    it('shows close button on hover', () => {
      render(<PositionTable {...defaultProps} />);
      const row = screen.getByText('Trump wins 2028').closest('tr');
      fireEvent.mouseEnter(row!);
      expect(screen.getByLabelText('Close position')).toBeInTheDocument();
    });

    it('calls onClosePosition when close button clicked', () => {
      const onClosePosition = vi.fn();
      render(<PositionTable {...defaultProps} onClosePosition={onClosePosition} />);
      const row = screen.getByText('Trump wins 2028').closest('tr');
      fireEvent.mouseEnter(row!);
      fireEvent.click(screen.getByLabelText('Close position'));
      expect(onClosePosition).toHaveBeenCalledWith(mockPositions[0]);
    });

    it('has cursor pointer on rows', () => {
      render(<PositionTable {...defaultProps} />);
      const row = screen.getByText('Trump wins 2028').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('styling', () => {
    it('uses terminal aesthetic', () => {
      render(<PositionTable {...defaultProps} />);
      const table = screen.getByTestId('position-table');
      expect(table).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<PositionTable {...defaultProps} className="custom-class" />);
      const table = screen.getByTestId('position-table');
      expect(table).toHaveClass('custom-class');
    });
  });
});
