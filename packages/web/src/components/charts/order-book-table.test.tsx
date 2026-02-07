/**
 * OrderBookTable Component Tests
 *
 * Tests for the order book display:
 * - Empty state handling
 * - Bids and asks rendering
 * - Spread calculation
 * - Cumulative totals
 * - Size formatting
 * - Depth bar visualization toggle
 * - Max rows prop
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderBookTable, type OrderBookOrder } from './order-book-table';

// =============================================================================
// Test Data
// =============================================================================

const sampleBids: OrderBookOrder[] = [
  { price: 0.55, size: 100 },
  { price: 0.54, size: 200 },
  { price: 0.53, size: 150 },
  { price: 0.52, size: 300 },
];

const sampleAsks: OrderBookOrder[] = [
  { price: 0.56, size: 120 },
  { price: 0.57, size: 180 },
  { price: 0.58, size: 250 },
  { price: 0.59, size: 100 },
];

// =============================================================================
// Tests
// =============================================================================

describe('OrderBookTable', () => {
  describe('empty state', () => {
    it('renders empty message with no bids and asks', () => {
      render(<OrderBookTable bids={[]} asks={[]} />);
      expect(screen.getByText('[NO ORDER BOOK DATA]')).toBeInTheDocument();
    });

    it('renders with only bids', () => {
      render(<OrderBookTable bids={sampleBids} asks={[]} />);
      expect(screen.queryByText('[NO ORDER BOOK DATA]')).not.toBeInTheDocument();
      expect(screen.getByText('ORDER BOOK')).toBeInTheDocument();
    });

    it('renders with only asks', () => {
      render(<OrderBookTable bids={[]} asks={sampleAsks} />);
      expect(screen.queryByText('[NO ORDER BOOK DATA]')).not.toBeInTheDocument();
      expect(screen.getByText('ORDER BOOK')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('displays ORDER BOOK title', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText('ORDER BOOK')).toBeInTheDocument();
    });

    it('displays calculated spread', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      // Spread = 0.56 - 0.55 = 0.01 = 1.0%
      expect(screen.getAllByText('1.0%').length).toBeGreaterThan(0);
    });

    it('displays custom spread prop', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} spread={0.02} />);
      // Custom spread = 2.0%
      expect(screen.getAllByText('2.0%').length).toBeGreaterThan(0);
    });

    it('does not display spread with empty bids', () => {
      render(<OrderBookTable bids={[]} asks={sampleAsks} />);
      expect(screen.queryByText('SPREAD:')).not.toBeInTheDocument();
    });
  });

  describe('column headers', () => {
    it('displays PRICE column', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText('PRICE')).toBeInTheDocument();
    });

    it('displays SIZE column', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText('SIZE')).toBeInTheDocument();
    });

    it('displays TOTAL column', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });
  });

  describe('bids display', () => {
    it('displays bid prices as percentages', () => {
      render(<OrderBookTable bids={sampleBids} asks={[]} />);
      expect(screen.getByText('55.0%')).toBeInTheDocument();
      expect(screen.getByText('54.0%')).toBeInTheDocument();
      expect(screen.getByText('53.0%')).toBeInTheDocument();
    });

    it('displays bid sizes', () => {
      render(<OrderBookTable bids={sampleBids} asks={[]} />);
      // Multiple elements may show same size, just check they exist
      expect(screen.getAllByText('100').length).toBeGreaterThan(0);
      expect(screen.getAllByText('200').length).toBeGreaterThan(0);
      expect(screen.getAllByText('150').length).toBeGreaterThan(0);
    });

    it('sorts bids descending by price', () => {
      const unsorted: OrderBookOrder[] = [
        { price: 0.52, size: 100 },
        { price: 0.55, size: 100 },
        { price: 0.53, size: 100 },
      ];
      const { container } = render(<OrderBookTable bids={unsorted} asks={[]} />);
      const bidPrices = container.querySelectorAll('.text-\\[hsl\\(var\\(--bullish\\)\\)\\]');
      const priceTexts = Array.from(bidPrices).map((el) => el.textContent);
      expect(priceTexts).toEqual(['55.0%', '53.0%', '52.0%']);
    });

    it('calculates cumulative totals', () => {
      render(<OrderBookTable bids={sampleBids} asks={[]} />);
      // Cumulative totals exist in the DOM
      expect(screen.getAllByText('300').length).toBeGreaterThan(0);
      expect(screen.getAllByText('450').length).toBeGreaterThan(0);
    });

    it('applies bullish color to bid prices', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={[]} />);
      const bullishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bullish\\)\\)\\]');
      expect(bullishElements.length).toBe(sampleBids.length);
    });
  });

  describe('asks display', () => {
    it('displays ask prices as percentages', () => {
      render(<OrderBookTable bids={[]} asks={sampleAsks} />);
      expect(screen.getByText('56.0%')).toBeInTheDocument();
      expect(screen.getByText('57.0%')).toBeInTheDocument();
      expect(screen.getByText('58.0%')).toBeInTheDocument();
    });

    it('displays ask sizes', () => {
      render(<OrderBookTable bids={[]} asks={sampleAsks} />);
      expect(screen.getAllByText('120').length).toBeGreaterThan(0);
      expect(screen.getAllByText('180').length).toBeGreaterThan(0);
      expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    });

    it('sorts asks ascending by price', () => {
      const unsorted: OrderBookOrder[] = [
        { price: 0.58, size: 100 },
        { price: 0.56, size: 100 },
        { price: 0.57, size: 100 },
      ];
      // Asks are displayed reversed (lowest near spread)
      // So the order in the DOM is: 58%, 57%, 56%
      const { container } = render(<OrderBookTable bids={[]} asks={unsorted} />);
      const askPrices = container.querySelectorAll('.text-\\[hsl\\(var\\(--bearish\\)\\)\\]');
      const priceTexts = Array.from(askPrices).map((el) => el.textContent);
      expect(priceTexts).toEqual(['58.0%', '57.0%', '56.0%']);
    });

    it('applies bearish color to ask prices', () => {
      const { container } = render(<OrderBookTable bids={[]} asks={sampleAsks} />);
      const bearishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bearish\\)\\)\\]');
      expect(bearishElements.length).toBe(sampleAsks.length);
    });
  });

  describe('spread indicator', () => {
    it('displays spread separator', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      // The separator uses box-drawing characters
      expect(screen.getAllByText('───').length).toBeGreaterThan(0);
    });

    it('displays spread value in separator', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      // Spread section shows the value (multiple instances: header and separator)
      expect(screen.getAllByText('1.0%').length).toBeGreaterThan(0);
    });
  });

  describe('footer', () => {
    it('displays bid count', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText(/BIDS: 4/)).toBeInTheDocument();
    });

    it('displays ask count', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(screen.getByText(/ASKS: 4/)).toBeInTheDocument();
    });

    it('displays total volume', () => {
      render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      // Total volume: 750 (bids) + 650 (asks) = 1400 = 1.4K
      expect(screen.getByText('VOL: 1.4K')).toBeInTheDocument();
    });
  });

  describe('size formatting', () => {
    it('formats sizes under 1000 as integers', () => {
      const small: OrderBookOrder[] = [{ price: 0.5, size: 500 }];
      render(<OrderBookTable bids={small} asks={[]} />);
      // Size and total show 500
      expect(screen.getAllByText('500').length).toBeGreaterThan(0);
    });

    it('formats sizes over 1000 with K suffix', () => {
      const large: OrderBookOrder[] = [{ price: 0.5, size: 2500 }];
      render(<OrderBookTable bids={large} asks={[]} />);
      // Size and total show 2.5K
      expect(screen.getAllByText('2.5K').length).toBeGreaterThan(0);
    });
  });

  describe('maxRows prop', () => {
    it('defaults to 10 rows', () => {
      const manyBids: OrderBookOrder[] = Array.from({ length: 15 }, (_, i) => ({
        price: 0.5 - i * 0.01,
        size: 100,
      }));
      render(<OrderBookTable bids={manyBids} asks={[]} />);
      // Should only show 10 bids - footer text contains the count
      expect(screen.getByText(/BIDS: 10/)).toBeInTheDocument();
    });

    it('respects custom maxRows', () => {
      const manyBids: OrderBookOrder[] = Array.from({ length: 15 }, (_, i) => ({
        price: 0.5 - i * 0.01,
        size: 100,
      }));
      render(<OrderBookTable bids={manyBids} asks={[]} maxRows={5} />);
      expect(screen.getByText(/BIDS: 5/)).toBeInTheDocument();
    });
  });

  describe('showDepthBar prop', () => {
    it('defaults to true', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      // Should have depth bar elements (absolute positioned divs with opacity)
      const depthBars = container.querySelectorAll('.pointer-events-none');
      expect(depthBars.length).toBeGreaterThan(0);
    });

    it('hides depth bars when false', () => {
      const { container } = render(
        <OrderBookTable bids={sampleBids} asks={sampleAsks} showDepthBar={false} />
      );
      // Should not have depth bar elements
      const depthBars = container.querySelectorAll('.pointer-events-none');
      expect(depthBars.length).toBe(0);
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(container.firstChild).toHaveClass('ascii-box');
    });

    it('has font-mono class', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(container.firstChild).toHaveClass('font-mono');
    });

    it('has text-xs class', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      expect(container.firstChild).toHaveClass('text-xs');
    });

    it('has grid layout for rows', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      const gridElements = container.querySelectorAll('.grid-cols-3');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('rows have hover effect', () => {
      const { container } = render(<OrderBookTable bids={sampleBids} asks={sampleAsks} />);
      const hoverElements = container.querySelectorAll('.hover\\:bg-\\[hsl\\(var\\(--accent\\)\\)\\]');
      expect(hoverElements.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles single bid', () => {
      const single: OrderBookOrder[] = [{ price: 0.5, size: 100 }];
      render(<OrderBookTable bids={single} asks={[]} />);
      expect(screen.getByText(/BIDS: 1/)).toBeInTheDocument();
    });

    it('handles single ask', () => {
      const single: OrderBookOrder[] = [{ price: 0.5, size: 100 }];
      render(<OrderBookTable bids={[]} asks={single} />);
      expect(screen.getByText(/ASKS: 1/)).toBeInTheDocument();
    });

    it('handles zero size orders', () => {
      const zero: OrderBookOrder[] = [{ price: 0.5, size: 0 }];
      render(<OrderBookTable bids={zero} asks={[]} />);
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    it('handles very small prices', () => {
      const small: OrderBookOrder[] = [{ price: 0.001, size: 100 }];
      render(<OrderBookTable bids={small} asks={[]} />);
      expect(screen.getByText('0.1%')).toBeInTheDocument();
    });

    it('handles very high prices', () => {
      const high: OrderBookOrder[] = [{ price: 0.999, size: 100 }];
      render(<OrderBookTable bids={high} asks={[]} />);
      expect(screen.getByText('99.9%')).toBeInTheDocument();
    });
  });
});
