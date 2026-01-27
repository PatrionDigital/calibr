import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ASCIITable, type Column } from './ascii-table';

describe('ASCIITable', () => {
  const columns: Column[] = [
    { key: 'market', label: 'MARKET', width: 120 },
    { key: 'yes', label: 'YES', width: 80 },
    { key: 'volume', label: 'VOLUME', width: 100 },
  ];

  const data = [
    { market: 'Trump 2028', yes: '45.2%', volume: '$1.2M' },
    { market: 'BTC > 100k', yes: '72.1%', volume: '$890K' },
  ];

  describe('rendering', () => {
    it('renders column headers', () => {
      render(<ASCIITable columns={columns} data={data} />);
      expect(screen.getByText('MARKET')).toBeInTheDocument();
      expect(screen.getByText('YES')).toBeInTheDocument();
      expect(screen.getByText('VOLUME')).toBeInTheDocument();
    });

    it('renders data rows', () => {
      render(<ASCIITable columns={columns} data={data} />);
      expect(screen.getByText('Trump 2028')).toBeInTheDocument();
      expect(screen.getByText('BTC > 100k')).toBeInTheDocument();
    });

    it('renders cell values', () => {
      render(<ASCIITable columns={columns} data={data} />);
      expect(screen.getByText('45.2%')).toBeInTheDocument();
      expect(screen.getByText('$1.2M')).toBeInTheDocument();
    });

    it('uses box drawing characters', () => {
      render(<ASCIITable columns={columns} data={data} />);
      const table = screen.getByTestId('ascii-table');
      expect(table).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(<ASCIITable columns={columns} data={[]} emptyMessage="No data available" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('shows sort indicators when sortable', () => {
      render(<ASCIITable columns={columns} data={data} sortable />);
      const marketHeader = screen.getByText('MARKET');
      expect(marketHeader.closest('th')).toBeInTheDocument();
    });

    it('calls onSort when header clicked', () => {
      const onSort = vi.fn();
      render(<ASCIITable columns={columns} data={data} sortable onSort={onSort} />);
      fireEvent.click(screen.getByText('MARKET'));
      expect(onSort).toHaveBeenCalledWith('market', 'asc');
    });

    it('toggles sort direction on subsequent clicks', () => {
      const onSort = vi.fn();
      render(<ASCIITable columns={columns} data={data} sortable onSort={onSort} sortKey="market" sortDirection="asc" />);
      fireEvent.click(screen.getByText('MARKET'));
      expect(onSort).toHaveBeenCalledWith('market', 'desc');
    });

    it('displays ascending indicator', () => {
      render(<ASCIITable columns={columns} data={data} sortable sortKey="market" sortDirection="asc" />);
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('displays descending indicator', () => {
      render(<ASCIITable columns={columns} data={data} sortable sortKey="market" sortDirection="desc" />);
      expect(screen.getByText('▼')).toBeInTheDocument();
    });
  });

  describe('row interaction', () => {
    it('calls onRowClick when row is clicked', () => {
      const onRowClick = vi.fn();
      render(<ASCIITable columns={columns} data={data} onRowClick={onRowClick} />);
      fireEvent.click(screen.getByText('Trump 2028'));
      expect(onRowClick).toHaveBeenCalledWith(data[0], 0);
    });

    it('applies hover styling when hoverable', () => {
      render(<ASCIITable columns={columns} data={data} onRowClick={() => {}} />);
      const row = screen.getByText('Trump 2028').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('custom rendering', () => {
    it('supports custom cell renderer', () => {
      const columnsWithRender: Column[] = [
        {
          key: 'market',
          label: 'MARKET',
          render: (value) => <span data-testid="custom-cell">{String(value)}</span>,
        },
      ];
      render(<ASCIITable columns={columnsWithRender} data={data} />);
      expect(screen.getAllByTestId('custom-cell')).toHaveLength(2);
    });
  });

  describe('alignment', () => {
    it('supports left alignment', () => {
      const columnsWithAlign: Column[] = [
        { key: 'market', label: 'MARKET', align: 'left' },
      ];
      render(<ASCIITable columns={columnsWithAlign} data={data} />);
      const cell = screen.getByText('Trump 2028').closest('td');
      expect(cell).toHaveClass('text-left');
    });

    it('supports right alignment', () => {
      const columnsWithAlign: Column[] = [
        { key: 'volume', label: 'VOLUME', align: 'right' },
      ];
      render(<ASCIITable columns={columnsWithAlign} data={[{ volume: '$1.2M' }]} />);
      const cell = screen.getByText('$1.2M').closest('td');
      expect(cell).toHaveClass('text-right');
    });

    it('supports center alignment', () => {
      const columnsWithAlign: Column[] = [
        { key: 'yes', label: 'YES', align: 'center' },
      ];
      render(<ASCIITable columns={columnsWithAlign} data={[{ yes: '45%' }]} />);
      const cell = screen.getByText('45%').closest('td');
      expect(cell).toHaveClass('text-center');
    });
  });
});
