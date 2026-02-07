/**
 * Tooltip Component Tests
 *
 * Tests for the tooltip components:
 * - Tooltip - Main tooltip with position variants
 * - InfoIcon - Info icon SVG component
 * - KELLY_TOOLTIPS - Tooltip content constants
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, InfoIcon, KELLY_TOOLTIPS } from '@/components/tooltip';

// =============================================================================
// Mocks
// =============================================================================

// Mock getBoundingClientRect
const mockTriggerRect = {
  left: 100,
  right: 200,
  top: 50,
  bottom: 80,
  width: 100,
  height: 30,
};

const mockTooltipRect = {
  left: 0,
  right: 150,
  top: 0,
  bottom: 40,
  width: 150,
  height: 40,
};

// Store original values
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

beforeEach(() => {
  // Mock window dimensions
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });

  // Mock getBoundingClientRect
  Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
    if (this.getAttribute('data-testid') === 'tooltip-content') {
      return mockTooltipRect as DOMRect;
    }
    return mockTriggerRect as DOMRect;
  });
});

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
});

// =============================================================================
// Tooltip Tests
// =============================================================================

describe('Tooltip', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <Tooltip content="Tooltip text">
          <span>Trigger</span>
        </Tooltip>
      );
      expect(screen.getByText('Trigger')).toBeInTheDocument();
    });

    it('does not show content by default', () => {
      render(
        <Tooltip content="Hidden content">
          <span>Trigger</span>
        </Tooltip>
      );
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });
  });

  describe('visibility', () => {
    it('shows content on mouse enter', () => {
      render(
        <Tooltip content="Tooltip content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    it('hides content on mouse leave', () => {
      render(
        <Tooltip content="Tooltip content">
          <span>Trigger</span>
        </Tooltip>
      );
      const trigger = screen.getByText('Trigger').parentElement!;
      fireEvent.mouseEnter(trigger);
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
      fireEvent.mouseLeave(trigger);
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });

    it('shows content on focus', () => {
      render(
        <Tooltip content="Focus content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.focus(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Focus content')).toBeInTheDocument();
    });

    it('hides content on blur', () => {
      render(
        <Tooltip content="Blur content">
          <span>Trigger</span>
        </Tooltip>
      );
      const trigger = screen.getByText('Trigger').parentElement!;
      fireEvent.focus(trigger);
      expect(screen.getByText('Blur content')).toBeInTheDocument();
      fireEvent.blur(trigger);
      expect(screen.queryByText('Blur content')).not.toBeInTheDocument();
    });
  });

  describe('content types', () => {
    it('renders string content', () => {
      render(
        <Tooltip content="String content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('String content')).toBeInTheDocument();
    });

    it('renders React node content', () => {
      render(
        <Tooltip content={<div data-testid="custom-content">Custom</div>}>
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });
  });

  describe('position prop', () => {
    it('defaults to top position', () => {
      const { container } = render(
        <Tooltip content="Top content">
          <span>Trigger</span>
        </Tooltip>
      );
      // Verify component renders without error
      expect(container).toBeInTheDocument();
    });

    it('accepts top position', () => {
      render(
        <Tooltip content="Top" position="top">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Top')).toBeInTheDocument();
    });

    it('accepts bottom position', () => {
      render(
        <Tooltip content="Bottom" position="bottom">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Bottom')).toBeInTheDocument();
    });

    it('accepts left position', () => {
      render(
        <Tooltip content="Left" position="left">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Left')).toBeInTheDocument();
    });

    it('accepts right position', () => {
      render(
        <Tooltip content="Right" position="right">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
  });

  describe('maxWidth prop', () => {
    it('defaults to 300px max width', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveStyle({ maxWidth: '300px' });
    });

    it('accepts custom max width', () => {
      render(
        <Tooltip content="Content" maxWidth={500}>
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveStyle({ maxWidth: '500px' });
    });
  });

  describe('trigger styling', () => {
    it('has inline-flex display', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      const trigger = screen.getByText('Trigger').parentElement;
      expect(trigger).toHaveClass('inline-flex');
    });

    it('has cursor-help', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      const trigger = screen.getByText('Trigger').parentElement;
      expect(trigger).toHaveClass('cursor-help');
    });

    it('has items-center', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      const trigger = screen.getByText('Trigger').parentElement;
      expect(trigger).toHaveClass('items-center');
    });
  });

  describe('tooltip styling', () => {
    it('has fixed positioning', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveClass('fixed');
    });

    it('has high z-index', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveClass('z-50');
    });

    it('has padding', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveClass('px-3');
      expect(tooltip).toHaveClass('py-2');
    });

    it('has small text size', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveClass('text-xs');
    });

    it('has border and shadow', () => {
      render(
        <Tooltip content="Content">
          <span>Trigger</span>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
      const tooltip = screen.getByText('Content');
      expect(tooltip).toHaveClass('border');
      expect(tooltip).toHaveClass('shadow-lg');
    });
  });
});

// =============================================================================
// InfoIcon Tests
// =============================================================================

describe('InfoIcon', () => {
  it('renders an SVG', () => {
    const { container } = render(<InfoIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('has inline-block display', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('inline-block');
  });

  it('has proper size classes', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-3.5');
    expect(svg).toHaveClass('h-3.5');
  });

  it('has left margin', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('ml-1');
  });

  it('has muted foreground color', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-[hsl(var(--muted-foreground))]');
  });

  it('has hover color', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('hover:text-[hsl(var(--primary))]');
  });

  it('has color transition', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('transition-colors');
  });

  it('accepts custom className', () => {
    const { container } = render(<InfoIcon className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class');
  });

  it('renders circle element', () => {
    const { container } = render(<InfoIcon />);
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('renders path element', () => {
    const { container } = render(<InfoIcon />);
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('has proper viewBox', () => {
    const { container } = render(<InfoIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });
});

// =============================================================================
// KELLY_TOOLTIPS Tests
// =============================================================================

describe('KELLY_TOOLTIPS', () => {
  it('is an object', () => {
    expect(typeof KELLY_TOOLTIPS).toBe('object');
  });

  it('contains estimatedProbability key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('estimatedProbability');
  });

  it('contains edge key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('edge');
  });

  it('contains kellyFraction key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('kellyFraction');
  });

  it('contains bankroll key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('bankroll');
  });

  it('contains recommendedSize key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('recommendedSize');
  });

  it('contains expectedValue key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('expectedValue');
  });

  it('contains portfolioKelly key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('portfolioKelly');
  });

  it('contains brierScore key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('brierScore');
  });

  it('contains calibration key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('calibration');
  });

  it('contains sharpeRatio key', () => {
    expect(KELLY_TOOLTIPS).toHaveProperty('sharpeRatio');
  });

  it('has 10 tooltip definitions', () => {
    expect(Object.keys(KELLY_TOOLTIPS)).toHaveLength(10);
  });

  describe('tooltip content', () => {
    it('estimatedProbability renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.estimatedProbability}</div>);
      expect(screen.getByText('Your Estimated Probability')).toBeInTheDocument();
    });

    it('edge renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.edge}</div>);
      expect(screen.getByText('Edge')).toBeInTheDocument();
    });

    it('kellyFraction renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.kellyFraction}</div>);
      expect(screen.getByText('Kelly Fraction')).toBeInTheDocument();
    });

    it('bankroll renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.bankroll}</div>);
      expect(screen.getByText('Bankroll')).toBeInTheDocument();
    });

    it('brierScore renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.brierScore}</div>);
      expect(screen.getByText('Brier Score')).toBeInTheDocument();
    });

    it('calibration renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.calibration}</div>);
      expect(screen.getByText('Calibration')).toBeInTheDocument();
    });

    it('sharpeRatio renders correctly', () => {
      render(<div>{KELLY_TOOLTIPS.sharpeRatio}</div>);
      expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('handles empty string content', () => {
    render(
      <Tooltip content="">
        <span>Trigger</span>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
    // Empty content should still render the tooltip container
    expect(screen.getByText('Trigger').parentElement).toBeInTheDocument();
  });

  it('handles very long content', () => {
    const longContent = 'A'.repeat(1000);
    render(
      <Tooltip content={longContent}>
        <span>Trigger</span>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('Trigger').parentElement!);
    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('handles multiple tooltips', () => {
    render(
      <>
        <Tooltip content="First">
          <span>Trigger 1</span>
        </Tooltip>
        <Tooltip content="Second">
          <span>Trigger 2</span>
        </Tooltip>
      </>
    );
    fireEvent.mouseEnter(screen.getByText('Trigger 1').parentElement!);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
  });

  it('handles rapid hover events', () => {
    render(
      <Tooltip content="Content">
        <span>Trigger</span>
      </Tooltip>
    );
    const trigger = screen.getByText('Trigger').parentElement!;

    // Rapid hover in/out
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(trigger);

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});
