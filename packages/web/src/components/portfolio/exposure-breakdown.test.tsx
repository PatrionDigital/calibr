import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExposureBreakdown, type ExposureBreakdownProps, type ExposureItem } from './exposure-breakdown';

describe('ExposureBreakdown', () => {
  const mockByCategory: ExposureItem[] = [
    { name: 'POLITICS', value: 5600, percent: 45 },
    { name: 'CRYPTO', value: 2750, percent: 22 },
    { name: 'SPORTS', value: 2250, percent: 18 },
    { name: 'OTHER', value: 1850, percent: 15 },
  ];

  const mockByPlatform: ExposureItem[] = [
    { name: 'POLYMARKET', value: 8000, percent: 64 },
    { name: 'LIMITLESS', value: 4450, percent: 36 },
  ];

  const defaultProps: ExposureBreakdownProps = {
    byCategory: mockByCategory,
    byPlatform: mockByPlatform,
    groupBy: 'category',
  };

  describe('rendering', () => {
    it('renders exposure breakdown', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      expect(screen.getByTestId('exposure-breakdown')).toBeInTheDocument();
    });

    it('displays title with grouping type', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="category" />);
      expect(screen.getByText(/EXPOSURE BY CATEGORY/)).toBeInTheDocument();
    });

    it('displays platform title when grouped by platform', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="platform" />);
      expect(screen.getByText(/EXPOSURE BY PLATFORM/)).toBeInTheDocument();
    });
  });

  describe('category grouping', () => {
    it('displays all categories', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="category" />);
      expect(screen.getByText('POLITICS')).toBeInTheDocument();
      expect(screen.getByText('CRYPTO')).toBeInTheDocument();
      expect(screen.getByText('SPORTS')).toBeInTheDocument();
      expect(screen.getByText('OTHER')).toBeInTheDocument();
    });

    it('displays percentages', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="category" />);
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('22%')).toBeInTheDocument();
      expect(screen.getByText('18%')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('displays dollar amounts', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="category" />);
      expect(screen.getByText(/\$5,600/)).toBeInTheDocument();
      expect(screen.getByText(/\$2,750/)).toBeInTheDocument();
    });
  });

  describe('platform grouping', () => {
    it('displays all platforms', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="platform" />);
      expect(screen.getByText('POLYMARKET')).toBeInTheDocument();
      expect(screen.getByText('LIMITLESS')).toBeInTheDocument();
    });

    it('displays correct percentages for platforms', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="platform" />);
      expect(screen.getByText('64%')).toBeInTheDocument();
      expect(screen.getByText('36%')).toBeInTheDocument();
    });
  });

  describe('progress bars', () => {
    it('renders ASCII block progress bars', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      const bars = screen.getAllByTestId('progress-bar');
      expect(bars.length).toBe(4);
    });

    it('has correct width percentage for bars', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      const bars = screen.getAllByTestId('progress-bar');
      expect(bars[0]).toHaveStyle({ width: '45%' });
    });

    it('displays filled and empty blocks', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      // Should contain block characters
      const breakdown = screen.getByTestId('exposure-breakdown');
      expect(breakdown.textContent).toMatch(/[█░]/);
    });
  });

  describe('toggle', () => {
    it('has toggle buttons for category/platform', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Category/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Platform/i })).toBeInTheDocument();
    });

    it('calls onGroupByChange when toggle clicked', () => {
      const onGroupByChange = vi.fn();
      render(<ExposureBreakdown {...defaultProps} onGroupByChange={onGroupByChange} />);
      fireEvent.click(screen.getByRole('button', { name: /Platform/i }));
      expect(onGroupByChange).toHaveBeenCalledWith('platform');
    });

    it('highlights active toggle option', () => {
      render(<ExposureBreakdown {...defaultProps} groupBy="category" />);
      const categoryBtn = screen.getByRole('button', { name: /Category/i });
      expect(categoryBtn).toHaveClass('bg-[hsl(var(--primary))]');
    });
  });

  describe('click to filter', () => {
    it('calls onItemClick when row clicked', () => {
      const onItemClick = vi.fn();
      render(<ExposureBreakdown {...defaultProps} onItemClick={onItemClick} />);
      fireEvent.click(screen.getByText('POLITICS'));
      expect(onItemClick).toHaveBeenCalledWith('POLITICS', 'category');
    });

    it('has cursor pointer on rows', () => {
      render(<ExposureBreakdown {...defaultProps} onItemClick={() => {}} />);
      const row = screen.getByText('POLITICS').closest('[data-exposure-row]');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('empty state', () => {
    it('shows empty state when no data', () => {
      render(<ExposureBreakdown {...defaultProps} byCategory={[]} byPlatform={[]} />);
      expect(screen.getByText('No exposure data')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('uses terminal aesthetic', () => {
      render(<ExposureBreakdown {...defaultProps} />);
      const breakdown = screen.getByTestId('exposure-breakdown');
      expect(breakdown).toHaveClass('border');
    });

    it('applies custom className', () => {
      render(<ExposureBreakdown {...defaultProps} className="custom-class" />);
      const breakdown = screen.getByTestId('exposure-breakdown');
      expect(breakdown).toHaveClass('custom-class');
    });
  });
});
