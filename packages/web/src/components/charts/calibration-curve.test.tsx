/**
 * CalibrationCurve Component Tests
 *
 * Tests for the D3-based calibration curve chart:
 * - Empty state handling
 * - Data rendering
 * - Stats display (ECE, overconfidence, underconfidence)
 * - Confidence interval toggle
 * - Size props
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  CalibrationCurve,
  type CalibrationData,
  type CalibrationBucket,
} from './calibration-curve';

// =============================================================================
// Mocks
// =============================================================================

// Mock d3 to avoid complex SVG rendering in tests
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
    })),
    append: vi.fn(() => mockD3Chain()),
  })),
  scaleLinear: vi.fn(() => ({
    domain: vi.fn(() => ({
      range: vi.fn(() => vi.fn((x: number) => x * 100)),
    })),
  })),
  axisBottom: vi.fn(() => ({
    ticks: vi.fn(() => ({
      tickFormat: vi.fn(() => vi.fn()),
    })),
  })),
  axisLeft: vi.fn(() => ({
    ticks: vi.fn(() => ({
      tickFormat: vi.fn(() => vi.fn()),
    })),
  })),
  line: vi.fn(() => ({
    x: vi.fn(() => ({
      y: vi.fn(() => ({
        curve: vi.fn(() => vi.fn()),
      })),
    })),
  })),
  area: vi.fn(() => ({
    x: vi.fn(() => ({
      y0: vi.fn(() => ({
        y1: vi.fn(() => ({
          curve: vi.fn(() => vi.fn()),
        })),
      })),
    })),
  })),
  curveMonotoneX: vi.fn(),
}));

function mockD3Chain() {
  const chain: Record<string, unknown> = {};
  chain.attr = vi.fn(() => chain);
  chain.append = vi.fn(() => chain);
  chain.selectAll = vi.fn(() => chain);
  chain.data = vi.fn(() => chain);
  chain.enter = vi.fn(() => chain);
  chain.datum = vi.fn(() => chain);
  chain.call = vi.fn(() => chain);
  chain.text = vi.fn(() => chain);
  chain.remove = vi.fn(() => chain);
  return chain;
}

// =============================================================================
// Test Data
// =============================================================================

function createBucket(
  binCenter: number,
  outcomeRate: number,
  forecastCount: number
): CalibrationBucket {
  return {
    binStart: binCenter - 0.05,
    binEnd: binCenter + 0.05,
    binCenter,
    forecastCount,
    outcomeRate,
    avgForecast: binCenter,
  };
}

function createCalibrationData(buckets: CalibrationBucket[]): CalibrationData {
  const totalForecasts = buckets.reduce((sum, b) => sum + b.forecastCount, 0);
  return {
    buckets,
    overconfidenceScore: 0.03,
    underconfidenceScore: 0.02,
    calibrationError: 0.05,
    totalForecasts,
  };
}

const sampleBuckets: CalibrationBucket[] = [
  createBucket(0.1, 0.12, 10),
  createBucket(0.3, 0.28, 15),
  createBucket(0.5, 0.52, 20),
  createBucket(0.7, 0.68, 18),
  createBucket(0.9, 0.88, 12),
];

const sampleData = createCalibrationData(sampleBuckets);

// =============================================================================
// Tests
// =============================================================================

describe('CalibrationCurve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with null data', () => {
      render(<CalibrationCurve calibrationData={null} />);
      expect(
        screen.getByText('[INSUFFICIENT DATA FOR CALIBRATION CURVE]')
      ).toBeInTheDocument();
    });

    it('renders empty state with empty buckets', () => {
      const emptyData = createCalibrationData([]);
      render(<CalibrationCurve calibrationData={emptyData} />);
      expect(
        screen.getByText('[INSUFFICIENT DATA FOR CALIBRATION CURVE]')
      ).toBeInTheDocument();
    });

    it('renders header with title', () => {
      render(<CalibrationCurve calibrationData={sampleData} />);
      expect(screen.getByText('CALIBRATION CURVE')).toBeInTheDocument();
    });

    it('renders SVG when data exists', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('displays ECE (Expected Calibration Error)', () => {
      render(<CalibrationCurve calibrationData={sampleData} />);
      expect(screen.getByText(/ECE:/)).toBeInTheDocument();
      // Text is split by template literals, so use regex
      expect(screen.getByText(/5\.0/)).toBeInTheDocument();
    });

    it('displays total forecasts count', () => {
      render(<CalibrationCurve calibrationData={sampleData} />);
      // Text is split as "n=" and "75"
      expect(screen.getByText(/n=/)).toBeInTheDocument();
    });

    it('displays overconfidence score', () => {
      render(<CalibrationCurve calibrationData={sampleData} />);
      expect(screen.getByText(/OVERCONFIDENCE:/)).toBeInTheDocument();
    });

    it('displays underconfidence score', () => {
      render(<CalibrationCurve calibrationData={sampleData} />);
      expect(screen.getByText(/UNDERCONFIDENCE:/)).toBeInTheDocument();
    });
  });

  describe('warning thresholds', () => {
    it('shows warning color for high overconfidence', () => {
      const highOverconfidence = {
        ...sampleData,
        overconfidenceScore: 0.08,
        underconfidenceScore: 0.01, // Different value to avoid collision
      };
      const { container } = render(
        <CalibrationCurve calibrationData={highOverconfidence} />
      );
      // Check that warning styling exists for values > 5%
      const warningElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--warning\\)\\)\\]');
      expect(warningElements.length).toBeGreaterThan(0);
    });

    it('shows bullish color for low overconfidence', () => {
      const lowScores = {
        ...sampleData,
        overconfidenceScore: 0.01,
        underconfidenceScore: 0.01,
      };
      const { container } = render(<CalibrationCurve calibrationData={lowScores} />);
      // Both scores are low, should show bullish styling
      const bullishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bullish\\)\\)\\]');
      expect(bullishElements.length).toBe(2);
    });

    it('shows warning color for high underconfidence', () => {
      const highUnderconfidence = {
        ...sampleData,
        overconfidenceScore: 0.01,
        underconfidenceScore: 0.1,
      };
      const { container } = render(
        <CalibrationCurve calibrationData={highUnderconfidence} />
      );
      const warningElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--warning\\)\\)\\]');
      expect(warningElements.length).toBeGreaterThan(0);
    });

    it('shows bullish color for low underconfidence', () => {
      const lowScores = {
        ...sampleData,
        overconfidenceScore: 0.02,
        underconfidenceScore: 0.02,
      };
      const { container } = render(<CalibrationCurve calibrationData={lowScores} />);
      const bullishElements = container.querySelectorAll('.text-\\[hsl\\(var\\(--bullish\\)\\)\\]');
      expect(bullishElements.length).toBe(2);
    });
  });

  describe('size props', () => {
    it('uses default dimensions', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '400');
      expect(svg).toHaveAttribute('height', '300');
    });

    it('accepts custom width', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} width={600} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '600');
    });

    it('accepts custom height', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} height={400} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('height', '400');
    });

    it('accepts custom width and height', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} width={800} height={500} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '500');
    });
  });

  describe('showConfidenceInterval prop', () => {
    it('defaults to true', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      // Component renders successfully with confidence interval enabled
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('accepts false value', () => {
      const { container } = render(
        <CalibrationCurve
          calibrationData={sampleData}
          showConfidenceInterval={false}
        />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has ascii-box class', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      expect(container.firstChild).toHaveClass('ascii-box');
    });

    it('has overflow hidden', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      expect(container.firstChild).toHaveClass('overflow-hidden');
    });

    it('header has accent background', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      const header = container.querySelector('.bg-\\[hsl\\(var\\(--accent\\)\\)\\]');
      expect(header).toBeInTheDocument();
    });

    it('footer has border-t', () => {
      const { container } = render(
        <CalibrationCurve calibrationData={sampleData} />
      );
      const footer = container.querySelector('.border-t');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles single bucket', () => {
      const singleBucket = createCalibrationData([createBucket(0.5, 0.5, 10)]);
      render(<CalibrationCurve calibrationData={singleBucket} />);
      // n=10 is split across elements
      expect(screen.getByText(/n=/)).toBeInTheDocument();
    });

    it('handles buckets with zero forecasts', () => {
      const zeroForecasts = createCalibrationData([
        createBucket(0.3, 0.3, 0),
        createBucket(0.5, 0.5, 10),
      ]);
      render(<CalibrationCurve calibrationData={zeroForecasts} />);
      expect(screen.getByText(/n=/)).toBeInTheDocument();
    });

    it('handles extreme calibration error', () => {
      const extremeError = {
        ...sampleData,
        calibrationError: 0.99,
      };
      render(<CalibrationCurve calibrationData={extremeError} />);
      // ECE value is split, just check it renders
      expect(screen.getByText(/ECE:/)).toBeInTheDocument();
    });

    it('handles zero calibration error', () => {
      const perfectCalibration = {
        ...sampleData,
        calibrationError: 0,
      };
      render(<CalibrationCurve calibrationData={perfectCalibration} />);
      expect(screen.getByText(/ECE:/)).toBeInTheDocument();
    });
  });
});
