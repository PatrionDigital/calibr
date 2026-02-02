/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type {
  PredictionMetric,
  PredictionTimeframe,
  PerformancePrediction,
  PredictionConfidenceLevel,
} from '../../src/components/performance-prediction';
import {
  PredictionCard,
  PredictionChart,
  PredictionConfidenceIndicator,
  PredictionTimeframeSelector,
  PredictionMetricSelector,
  PredictionSummary,
  PredictionInsights,
  PerformancePredictionPanel,
  usePrediction,
} from '../../src/components/performance-prediction';

// =============================================================================
// Test Data
// =============================================================================

const mockPrediction: PerformancePrediction = {
  metric: 'brierScore',
  currentValue: 0.185,
  predictedValue: 0.165,
  changePercent: -10.8,
  confidence: 'high',
  timeframe: '3months',
  confidenceInterval: {
    low: 0.145,
    high: 0.185,
  },
  trend: 'improving',
  dataPoints: 45,
  historicalTrend: [0.22, 0.21, 0.20, 0.19, 0.185],
  projectedTrend: [0.185, 0.178, 0.171, 0.165],
};

const mockAccuracyPrediction: PerformancePrediction = {
  metric: 'accuracy',
  currentValue: 0.78,
  predictedValue: 0.82,
  changePercent: 5.1,
  confidence: 'medium',
  timeframe: '3months',
  confidenceInterval: {
    low: 0.79,
    high: 0.85,
  },
  trend: 'improving',
  dataPoints: 45,
  historicalTrend: [0.72, 0.74, 0.76, 0.77, 0.78],
  projectedTrend: [0.78, 0.79, 0.81, 0.82],
};

const mockCalibrationPrediction: PerformancePrediction = {
  metric: 'calibration',
  currentValue: 0.82,
  predictedValue: 0.80,
  changePercent: -2.4,
  confidence: 'low',
  timeframe: '3months',
  confidenceInterval: {
    low: 0.75,
    high: 0.86,
  },
  trend: 'declining',
  dataPoints: 45,
  historicalTrend: [0.85, 0.84, 0.83, 0.82, 0.82],
  projectedTrend: [0.82, 0.81, 0.81, 0.80],
};

const mockPredictions: PerformancePrediction[] = [
  mockPrediction,
  mockAccuracyPrediction,
  mockCalibrationPrediction,
];

// =============================================================================
// PredictionCard Tests
// =============================================================================

describe('PredictionCard', () => {
  it('renders metric name', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText(/brier score/i)).toBeInTheDocument();
  });

  it('shows current value', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText('0.185')).toBeInTheDocument();
  });

  it('displays predicted value', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText('0.165')).toBeInTheDocument();
  });

  it('shows change percentage', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText(/-10\.8%/)).toBeInTheDocument();
  });

  it('indicates improving trend', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('improving');
  });

  it('indicates declining trend', () => {
    render(<PredictionCard prediction={mockCalibrationPrediction} />);
    expect(screen.getByTestId('trend-indicator')).toHaveClass('declining');
  });

  it('shows confidence level', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
  });

  it('displays timeframe', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText(/3 months/i)).toBeInTheDocument();
  });

  it('shows confidence interval', () => {
    render(<PredictionCard prediction={mockPrediction} />);
    expect(screen.getByText(/0\.145.*0\.185/)).toBeInTheDocument();
  });
});

// =============================================================================
// PredictionChart Tests
// =============================================================================

describe('PredictionChart', () => {
  it('renders chart container', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('prediction-chart')).toBeInTheDocument();
  });

  it('displays historical data points', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('historical-line')).toBeInTheDocument();
  });

  it('shows projected data points', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('projected-line')).toBeInTheDocument();
  });

  it('displays confidence band', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('confidence-band')).toBeInTheDocument();
  });

  it('shows current value marker', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('current-marker')).toBeInTheDocument();
  });

  it('shows predicted value marker', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByTestId('predicted-marker')).toBeInTheDocument();
  });

  it('displays axis labels', () => {
    render(<PredictionChart prediction={mockPrediction} />);
    expect(screen.getByText(/time/i)).toBeInTheDocument();
    expect(screen.getByText(/value/i)).toBeInTheDocument();
  });

  it('shows legend', () => {
    render(<PredictionChart prediction={mockPrediction} showLegend={true} />);
    expect(screen.getByText(/historical/i)).toBeInTheDocument();
    expect(screen.getByText(/projected/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PredictionConfidenceIndicator Tests
// =============================================================================

describe('PredictionConfidenceIndicator', () => {
  it('displays high confidence indicator', () => {
    render(<PredictionConfidenceIndicator level="high" />);
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('high');
  });

  it('displays medium confidence indicator', () => {
    render(<PredictionConfidenceIndicator level="medium" />);
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('medium');
  });

  it('displays low confidence indicator', () => {
    render(<PredictionConfidenceIndicator level="low" />);
    expect(screen.getByTestId('confidence-indicator')).toHaveClass('low');
  });

  it('shows confidence label', () => {
    render(<PredictionConfidenceIndicator level="high" showLabel={true} />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('shows confidence percentage when provided', () => {
    render(<PredictionConfidenceIndicator level="high" percentage={85} />);
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('displays tooltip on hover', async () => {
    render(<PredictionConfidenceIndicator level="high" showTooltip={true} />);
    fireEvent.mouseEnter(screen.getByTestId('confidence-indicator'));
    await waitFor(() => {
      expect(screen.getByText(/prediction is highly reliable/i)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// PredictionTimeframeSelector Tests
// =============================================================================

describe('PredictionTimeframeSelector', () => {
  it('renders timeframe options', () => {
    render(<PredictionTimeframeSelector value="3months" onChange={() => {}} />);
    expect(screen.getByText(/1 month/i)).toBeInTheDocument();
    expect(screen.getByText(/3 months/i)).toBeInTheDocument();
    expect(screen.getByText(/6 months/i)).toBeInTheDocument();
  });

  it('shows selected timeframe', () => {
    render(<PredictionTimeframeSelector value="3months" onChange={() => {}} />);
    const selectedOption = screen.getByTestId('timeframe-3months');
    expect(selectedOption).toHaveClass('selected');
  });

  it('calls onChange when timeframe selected', () => {
    const onChange = vi.fn();
    render(<PredictionTimeframeSelector value="3months" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('timeframe-6months'));
    expect(onChange).toHaveBeenCalledWith('6months');
  });

  it('supports 1 year option', () => {
    render(<PredictionTimeframeSelector value="3months" onChange={() => {}} timeframes={['1month', '3months', '6months', '1year']} />);
    expect(screen.getByText(/1 year/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PredictionMetricSelector Tests
// =============================================================================

describe('PredictionMetricSelector', () => {
  it('renders metric options', () => {
    render(<PredictionMetricSelector value="brierScore" onChange={() => {}} />);
    expect(screen.getByText(/brier score/i)).toBeInTheDocument();
    expect(screen.getByText(/accuracy/i)).toBeInTheDocument();
    expect(screen.getByText(/calibration/i)).toBeInTheDocument();
  });

  it('shows selected metric', () => {
    render(<PredictionMetricSelector value="accuracy" onChange={() => {}} />);
    const selectedOption = screen.getByTestId('metric-accuracy');
    expect(selectedOption).toHaveClass('selected');
  });

  it('calls onChange when metric selected', () => {
    const onChange = vi.fn();
    render(<PredictionMetricSelector value="brierScore" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('metric-accuracy'));
    expect(onChange).toHaveBeenCalledWith('accuracy');
  });

  it('displays metric descriptions', () => {
    render(<PredictionMetricSelector value="brierScore" onChange={() => {}} showDescriptions={true} />);
    expect(screen.getByText(/measures prediction accuracy/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PredictionSummary Tests
// =============================================================================

describe('PredictionSummary', () => {
  it('renders all predictions', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getAllByTestId('prediction-summary-item').length).toBe(3);
  });

  it('shows overall outlook', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getByText(/overall outlook/i)).toBeInTheDocument();
  });

  it('displays improving metrics count', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getByText(/2.*improving/i)).toBeInTheDocument();
  });

  it('displays declining metrics count', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getByText(/1.*declining/i)).toBeInTheDocument();
  });

  it('shows average confidence level', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  it('highlights most impactful prediction', () => {
    render(<PredictionSummary predictions={mockPredictions} />);
    expect(screen.getByTestId('most-impactful')).toBeInTheDocument();
  });

  it('shows timeframe label', () => {
    render(<PredictionSummary predictions={mockPredictions} timeframe="3months" />);
    expect(screen.getByText(/3 months.*projection/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PredictionInsights Tests
// =============================================================================

describe('PredictionInsights', () => {
  it('generates insight for improving Brier score', () => {
    render(<PredictionInsights prediction={mockPrediction} />);
    expect(screen.getByText(/prediction accuracy.*improve/i)).toBeInTheDocument();
  });

  it('generates insight for improving accuracy', () => {
    render(<PredictionInsights prediction={mockAccuracyPrediction} />);
    expect(screen.getByText(/accuracy.*increase/i)).toBeInTheDocument();
  });

  it('generates insight for declining calibration', () => {
    render(<PredictionInsights prediction={mockCalibrationPrediction} />);
    expect(screen.getByText(/calibration.*decline/i)).toBeInTheDocument();
  });

  it('shows recommendation based on trend', () => {
    render(<PredictionInsights prediction={mockCalibrationPrediction} />);
    expect(screen.getByTestId('recommendation')).toBeInTheDocument();
  });

  it('displays confidence caveat for low confidence', () => {
    render(<PredictionInsights prediction={mockCalibrationPrediction} />);
    expect(screen.getByText(/low confidence/i)).toBeInTheDocument();
  });

  it('shows data sufficiency note', () => {
    render(<PredictionInsights prediction={mockPrediction} />);
    expect(screen.getByText(/45 data points/i)).toBeInTheDocument();
  });
});

// =============================================================================
// PerformancePredictionPanel Tests
// =============================================================================

describe('PerformancePredictionPanel', () => {
  it('renders prediction panel', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('prediction-panel')).toBeInTheDocument();
  });

  it('shows metric selector', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('metric-selector')).toBeInTheDocument();
  });

  it('shows timeframe selector', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('timeframe-selector')).toBeInTheDocument();
  });

  it('displays prediction card', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('prediction-card')).toBeInTheDocument();
  });

  it('displays prediction chart', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('prediction-chart')).toBeInTheDocument();
  });

  it('shows prediction insights', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    expect(screen.getByTestId('prediction-insights')).toBeInTheDocument();
  });

  it('updates when metric changes', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} />);
    fireEvent.click(screen.getByTestId('metric-accuracy'));
    expect(screen.getByText(/accuracy.*increase/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PerformancePredictionPanel predictions={[]} isLoading={true} />);
    expect(screen.getByTestId('prediction-loading')).toBeInTheDocument();
  });

  it('shows empty state when no predictions', () => {
    render(<PerformancePredictionPanel predictions={[]} />);
    expect(screen.getByText(/no predictions available/i)).toBeInTheDocument();
  });

  it('shows summary section', () => {
    render(<PerformancePredictionPanel predictions={mockPredictions} showSummary={true} />);
    expect(screen.getByTestId('prediction-summary')).toBeInTheDocument();
  });
});

// =============================================================================
// usePrediction Hook Tests
// =============================================================================

describe('usePrediction', () => {
  function TestComponent({ forecasterId }: { forecasterId: string }) {
    const {
      predictions,
      selectedMetric,
      setSelectedMetric,
      selectedTimeframe,
      setSelectedTimeframe,
      currentPrediction,
      isLoading,
      error,
      refresh,
    } = usePrediction(forecasterId);

    return (
      <div>
        <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
        <span data-testid="error">{error || 'no-error'}</span>
        <span data-testid="predictions-count">{predictions.length}</span>
        <span data-testid="selected-metric">{selectedMetric}</span>
        <span data-testid="selected-timeframe">{selectedTimeframe}</span>
        <span data-testid="current-value">{currentPrediction?.currentValue ?? 'none'}</span>
        <button onClick={() => setSelectedMetric('accuracy')}>Change Metric</button>
        <button onClick={() => setSelectedTimeframe('6months')}>Change Timeframe</button>
        <button onClick={refresh}>Refresh</button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    render(<TestComponent forecasterId="user-123" />);
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('loads predictions', async () => {
    render(<TestComponent forecasterId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    expect(screen.getByTestId('predictions-count')).not.toHaveTextContent('0');
  });

  it('initializes with default metric', () => {
    render(<TestComponent forecasterId="user-123" />);
    expect(screen.getByTestId('selected-metric')).toHaveTextContent('brierScore');
  });

  it('initializes with default timeframe', () => {
    render(<TestComponent forecasterId="user-123" />);
    expect(screen.getByTestId('selected-timeframe')).toHaveTextContent('3months');
  });

  it('allows changing metric', async () => {
    render(<TestComponent forecasterId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    fireEvent.click(screen.getByText('Change Metric'));
    expect(screen.getByTestId('selected-metric')).toHaveTextContent('accuracy');
  });

  it('allows changing timeframe', async () => {
    render(<TestComponent forecasterId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    fireEvent.click(screen.getByText('Change Timeframe'));
    expect(screen.getByTestId('selected-timeframe')).toHaveTextContent('6months');
  });

  it('handles errors', async () => {
    render(<TestComponent forecasterId="invalid" />);
    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
    });
  });

  it('can refresh predictions', async () => {
    render(<TestComponent forecasterId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });
    fireEvent.click(screen.getByText('Refresh'));
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('provides current prediction based on selected metric', async () => {
    render(<TestComponent forecasterId="user-123" />);
    await waitFor(() => {
      expect(screen.getByTestId('current-value')).not.toHaveTextContent('none');
    });
  });
});
