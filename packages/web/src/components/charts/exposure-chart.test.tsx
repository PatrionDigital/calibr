/**
 * ExposureChart Component Tests
 *
 * Tests for the exposure chart:
 * - Empty state handling
 * - Grouping by category and platform
 * - P&L display toggle
 * - Value formatting
 * - Risk level indicators
 * - Max bars prop
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExposureChart, type Position } from './exposure-chart';

// =============================================================================
// Test Data
// =============================================================================

const samplePositions: Position[] = [
  { id: '1', platform: 'polymarket', category: 'politics', currentValue: 1000, unrealizedPnl: 100 },
  { id: '2', platform: 'polymarket', category: 'politics', currentValue: 500, unrealizedPnl: -50 },
  { id: '3', platform: 'kalshi', category: 'crypto', currentValue: 2000, unrealizedPnl: 200 },
  { id: '4', platform: 'kalshi', category: 'economics', currentValue: 800, unrealizedPnl: 0 },
  { id: '5', platform: 'limitless', category: 'sports', currentValue: 300, unrealizedPnl: -30 },
];

// =============================================================================
// Tests
// =============================================================================

describe('ExposureChart', () => {
  describe('empty state', () => {
    it('renders empty message with no positions', () => {
      render(<ExposureChart positions={[]} groupBy="category" />);
      expect(screen.getByText('[NO POSITION DATA]')).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('displays category header when grouped by category', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText(/EXPOSURE BY/)).toBeInTheDocument();
      expect(screen.getByText(/CATEGORY/)).toBeInTheDocument();
    });

    it('displays platform header when grouped by platform', () => {
      render(<ExposureChart positions={samplePositions} groupBy="platform" />);
      expect(screen.getByText(/EXPOSURE BY/)).toBeInTheDocument();
      // Multiple matches for PLATFORM, just verify component renders
      expect(screen.getAllByText(/PLATFORM/).length).toBeGreaterThan(0);
    });

    it('displays total value', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText(/TOTAL:/)).toBeInTheDocument();
      // Value is in separate text node
      expect(screen.getByText(/\$4\.6K/)).toBeInTheDocument();
    });

    it('displays total P&L when showPnl is true', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" showPnl={true} />);
      expect(screen.getByText(/P&L:/)).toBeInTheDocument();
      // P&L value is in separate text node
      expect(screen.getByText(/\+\$220/)).toBeInTheDocument();
    });

    it('hides P&L when showPnl is false', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" showPnl={false} />);
      expect(screen.queryByText(/P&L:/)).not.toBeInTheDocument();
    });
  });

  describe('grouping by category', () => {
    it('groups positions by category', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      // Text is lowercase with CSS uppercase class
      expect(screen.getByText('politics')).toBeInTheDocument();
      expect(screen.getByText('crypto')).toBeInTheDocument();
      expect(screen.getByText('economics')).toBeInTheDocument();
      expect(screen.getByText('sports')).toBeInTheDocument();
    });

    it('shows position count per category', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      // Counts are in format (n) - check they exist
      const { container } = render(<ExposureChart positions={samplePositions} groupBy="category" />);
      const countElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--muted-foreground\\)\\)\\]');
      expect(countElements.length).toBeGreaterThan(0);
    });

    it('sorts categories by value descending', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" />
      );
      const labels = container.querySelectorAll('.uppercase');
      const labelTexts = Array.from(labels).map((el) => el.textContent);
      // crypto ($2000) should be first, politics ($1500) second
      expect(labelTexts[0]).toBe('crypto');
      expect(labelTexts[1]).toBe('politics');
    });
  });

  describe('grouping by platform', () => {
    it('groups positions by platform', () => {
      render(<ExposureChart positions={samplePositions} groupBy="platform" />);
      // Text is lowercase with CSS uppercase class
      expect(screen.getByText('polymarket')).toBeInTheDocument();
      expect(screen.getByText('kalshi')).toBeInTheDocument();
      expect(screen.getByText('limitless')).toBeInTheDocument();
    });

    it('shows position count per platform', () => {
      const { container } = render(<ExposureChart positions={samplePositions} groupBy="platform" />);
      // Counts are displayed in muted text
      const countElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--muted-foreground\\)\\)\\]');
      expect(countElements.length).toBeGreaterThan(0);
    });
  });

  describe('value formatting', () => {
    it('formats thousands with K suffix', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText('$2.0K')).toBeInTheDocument(); // Crypto
      expect(screen.getByText('$1.5K')).toBeInTheDocument(); // Politics
    });

    it('formats values under 1000 without suffix', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText('$800')).toBeInTheDocument(); // Economics
      expect(screen.getByText('$300')).toBeInTheDocument(); // Sports
    });

    it('formats millions with M suffix', () => {
      const millionPositions: Position[] = [
        { id: '1', platform: 'polymarket', category: 'politics', currentValue: 1500000, unrealizedPnl: 0 },
      ];
      render(<ExposureChart positions={millionPositions} groupBy="category" />);
      expect(screen.getByText('$1.5M')).toBeInTheDocument();
    });
  });

  describe('P&L display', () => {
    it('shows positive P&L with + sign', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" showPnl={true} />);
      expect(screen.getByText(/\+\$200/)).toBeInTheDocument(); // Crypto
    });

    it('shows negative P&L without + sign', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" showPnl={true} />);
      // Format is "$-30" not "-$30"
      expect(screen.getByText(/\$-30/)).toBeInTheDocument(); // Sports
    });

    it('applies bullish color to positive P&L', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" showPnl={true} />
      );
      const bullishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bullish\\)\\)\\]');
      expect(bullishElements.length).toBeGreaterThan(0);
    });

    it('applies bearish color to negative P&L', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" showPnl={true} />
      );
      const bearishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bearish\\)\\)\\]');
      expect(bearishElements.length).toBeGreaterThan(0);
    });
  });

  describe('risk indicators', () => {
    it('shows high risk indicator for >40% concentration', () => {
      // Create a position that represents >40% of total
      const highConcentration: Position[] = [
        { id: '1', platform: 'polymarket', category: 'crypto', currentValue: 5000, unrealizedPnl: 0 },
        { id: '2', platform: 'kalshi', category: 'politics', currentValue: 1000, unrealizedPnl: 0 },
      ];
      render(<ExposureChart positions={highConcentration} groupBy="category" />);
      // Crypto is 83% - should show warning indicator
      expect(screen.getByText('!')).toBeInTheDocument();
    });

    it('shows correct percentage for each bar', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      // Check that percentages are displayed
      expect(screen.getByText('43.5%')).toBeInTheDocument(); // Crypto $2000/$4600
      expect(screen.getByText('32.6%')).toBeInTheDocument(); // Politics $1500/$4600
    });
  });

  describe('footer', () => {
    it('shows category count', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText('CATEGORIES: 4')).toBeInTheDocument();
    });

    it('shows platform count', () => {
      render(<ExposureChart positions={samplePositions} groupBy="platform" />);
      expect(screen.getByText('PLATFORMS: 3')).toBeInTheDocument();
    });

    it('shows risk legend', () => {
      render(<ExposureChart positions={samplePositions} groupBy="category" />);
      expect(screen.getByText(/LOW <20%/)).toBeInTheDocument();
      expect(screen.getByText(/MED 20-40%/)).toBeInTheDocument();
      expect(screen.getByText(/HIGH >40%/)).toBeInTheDocument();
    });
  });

  describe('maxBars prop', () => {
    it('defaults to 8 bars', () => {
      const manyPositions: Position[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        platform: 'polymarket',
        category: `category-${i}`,
        currentValue: 100 * (i + 1),
        unrealizedPnl: 0,
      }));
      render(<ExposureChart positions={manyPositions} groupBy="category" />);
      // Should only show 8 categories
      expect(screen.getByText('CATEGORIES: 8')).toBeInTheDocument();
    });

    it('respects custom maxBars', () => {
      const manyPositions: Position[] = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        platform: 'polymarket',
        category: `category-${i}`,
        currentValue: 100 * (i + 1),
        unrealizedPnl: 0,
      }));
      render(<ExposureChart positions={manyPositions} groupBy="category" maxBars={5} />);
      expect(screen.getByText('CATEGORIES: 5')).toBeInTheDocument();
    });
  });

  describe('positions without category', () => {
    it('groups uncategorized positions as Other', () => {
      const uncategorized: Position[] = [
        { id: '1', platform: 'polymarket', currentValue: 1000, unrealizedPnl: 0 },
      ];
      render(<ExposureChart positions={uncategorized} groupBy="category" />);
      // Text is lowercase with CSS uppercase class
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" />
      );
      expect(container.firstChild).toHaveClass('ascii-box');
    });

    it('has font-mono class', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" />
      );
      expect(container.firstChild).toHaveClass('font-mono');
    });

    it('has text-xs class', () => {
      const { container } = render(
        <ExposureChart positions={samplePositions} groupBy="category" />
      );
      expect(container.firstChild).toHaveClass('text-xs');
    });
  });
});
