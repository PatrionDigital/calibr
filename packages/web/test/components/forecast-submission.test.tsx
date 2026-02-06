/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  ForecastFormData,
  Market,
  PrivacyLevel,
} from '../../src/components/forecast-submission';
import {
  ProbabilityInput,
  ProbabilitySlider,
  ConfidenceSelector,
  ReasoningTextarea,
  MarketSelector,
  ForecastPrivacySelector,
  ForecastFormSummary,
  ForecastSubmitButton,
  ForecastSubmissionForm,
  ForecastSuccessMessage,
  ForecastSubmissionPanel,
  useForecastSubmission,
} from '../../src/components/forecast-submission';

// =============================================================================
// Test Data
// =============================================================================

const mockMarkets: Market[] = [
  {
    id: 'market-1',
    question: 'Will BTC reach $100k by end of 2025?',
    platform: 'polymarket',
    endDate: '2025-12-31',
  },
  {
    id: 'market-2',
    question: 'Will ETH 2.0 merge happen by Q2 2025?',
    platform: 'limitless',
    endDate: '2025-06-30',
  },
];

const mockFormData: ForecastFormData = {
  marketId: 'market-1',
  probability: 65,
  confidence: 80,
  reasoning: 'Based on historical trends and current market conditions.',
  privacy: 'public',
};

// =============================================================================
// ProbabilityInput Tests
// =============================================================================

describe('ProbabilityInput', () => {
  it('renders input', () => {
    render(<ProbabilityInput value={50} onChange={() => {}} />);
    expect(screen.getByTestId('probability-input')).toBeInTheDocument();
  });

  it('shows current value', () => {
    render(<ProbabilityInput value={65} onChange={() => {}} />);
    const input = screen.getByTestId('probability-input');
    expect(input).toHaveValue(65);
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<ProbabilityInput value={50} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('probability-input'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('shows percentage symbol', () => {
    render(<ProbabilityInput value={50} onChange={() => {}} />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('clamps value to 0-100 range', () => {
    const onChange = vi.fn();
    render(<ProbabilityInput value={50} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('probability-input'), { target: { value: '150' } });
    expect(onChange).toHaveBeenCalledWith(100);
  });
});

// =============================================================================
// ProbabilitySlider Tests
// =============================================================================

describe('ProbabilitySlider', () => {
  it('renders slider', () => {
    render(<ProbabilitySlider value={50} onChange={() => {}} />);
    expect(screen.getByTestId('probability-slider')).toBeInTheDocument();
  });

  it('shows current value', () => {
    render(<ProbabilitySlider value={65} onChange={() => {}} />);
    const slider = screen.getByTestId('probability-slider');
    expect(slider).toHaveValue('65');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<ProbabilitySlider value={50} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('probability-slider'), { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('shows min and max labels', () => {
    render(<ProbabilitySlider value={50} onChange={() => {}} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

// =============================================================================
// ConfidenceSelector Tests
// =============================================================================

describe('ConfidenceSelector', () => {
  it('renders selector', () => {
    render(<ConfidenceSelector value={50} onChange={() => {}} />);
    expect(screen.getByTestId('confidence-selector')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<ConfidenceSelector value={50} onChange={() => {}} />);
    expect(screen.getByText(/confidence/i)).toBeInTheDocument();
  });

  it('shows confidence levels', () => {
    render(<ConfidenceSelector value={50} onChange={() => {}} />);
    expect(screen.getByText(/low/i)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('calls onChange when level selected', () => {
    const onChange = vi.fn();
    render(<ConfidenceSelector value={50} onChange={onChange} />);
    fireEvent.click(screen.getByText(/high/i));
    expect(onChange).toHaveBeenCalled();
  });

  it('highlights current selection', () => {
    render(<ConfidenceSelector value={90} onChange={() => {}} />);
    const highButton = screen.getByText(/high/i);
    expect(highButton.className).toMatch(/selected|active|green/i);
  });
});

// =============================================================================
// ReasoningTextarea Tests
// =============================================================================

describe('ReasoningTextarea', () => {
  it('renders textarea', () => {
    render(<ReasoningTextarea value="" onChange={() => {}} />);
    expect(screen.getByTestId('reasoning-textarea')).toBeInTheDocument();
  });

  it('shows label', () => {
    render(<ReasoningTextarea value="" onChange={() => {}} />);
    expect(screen.getByText(/reasoning/i)).toBeInTheDocument();
  });

  it('shows current value', () => {
    render(<ReasoningTextarea value="Test reasoning" onChange={() => {}} />);
    const textarea = screen.getByTestId('reasoning-textarea');
    expect(textarea).toHaveValue('Test reasoning');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<ReasoningTextarea value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId('reasoning-textarea'), { target: { value: 'New reasoning' } });
    expect(onChange).toHaveBeenCalledWith('New reasoning');
  });

  it('shows character count', () => {
    render(<ReasoningTextarea value="Hello" onChange={() => {}} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('shows placeholder', () => {
    render(<ReasoningTextarea value="" onChange={() => {}} />);
    const textarea = screen.getByTestId('reasoning-textarea') as HTMLTextAreaElement;
    expect(textarea.placeholder).toMatch(/explain|reasoning/i);
  });
});

// =============================================================================
// MarketSelector Tests
// =============================================================================

describe('MarketSelector', () => {
  it('renders selector', () => {
    render(<MarketSelector markets={mockMarkets} selected={null} onSelect={() => {}} />);
    expect(screen.getByTestId('market-selector')).toBeInTheDocument();
  });

  it('shows markets', () => {
    render(<MarketSelector markets={mockMarkets} selected={null} onSelect={() => {}} />);
    expect(screen.getByText(/BTC reach \$100k/i)).toBeInTheDocument();
  });

  it('shows placeholder when nothing selected', () => {
    render(<MarketSelector markets={mockMarkets} selected={null} onSelect={() => {}} />);
    expect(screen.getByText(/select a market/i)).toBeInTheDocument();
  });

  it('calls onSelect when market clicked', () => {
    const onSelect = vi.fn();
    render(<MarketSelector markets={mockMarkets} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/BTC reach \$100k/i));
    expect(onSelect).toHaveBeenCalledWith('market-1');
  });

  it('highlights selected market', () => {
    render(<MarketSelector markets={mockMarkets} selected="market-1" onSelect={() => {}} />);
    const marketOption = screen.getByText(/BTC reach \$100k/i).closest('[data-testid="market-option"]');
    expect(marketOption?.className).toMatch(/selected|active|green/i);
  });
});

// =============================================================================
// ForecastPrivacySelector Tests
// =============================================================================

describe('ForecastPrivacySelector', () => {
  it('renders selector', () => {
    render(<ForecastPrivacySelector selected="public" onSelect={() => {}} />);
    expect(screen.getByTestId('forecast-privacy-selector')).toBeInTheDocument();
  });

  it('shows privacy options', () => {
    render(<ForecastPrivacySelector selected="public" onSelect={() => {}} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', () => {
    const onSelect = vi.fn();
    render(<ForecastPrivacySelector selected="public" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Private'));
    expect(onSelect).toHaveBeenCalledWith('private');
  });

  it('highlights selected option', () => {
    render(<ForecastPrivacySelector selected="private" onSelect={() => {}} />);
    const privateButton = screen.getByText('Private');
    expect(privateButton.className).toMatch(/selected|active|green/i);
  });
});

// =============================================================================
// ForecastFormSummary Tests
// =============================================================================

describe('ForecastFormSummary', () => {
  it('renders summary', () => {
    render(<ForecastFormSummary formData={mockFormData} market={mockMarkets[0]!} />);
    expect(screen.getByTestId('forecast-form-summary')).toBeInTheDocument();
  });

  it('shows market question', () => {
    render(<ForecastFormSummary formData={mockFormData} market={mockMarkets[0]!} />);
    expect(screen.getByText(/BTC reach \$100k/i)).toBeInTheDocument();
  });

  it('shows probability', () => {
    render(<ForecastFormSummary formData={mockFormData} market={mockMarkets[0]!} />);
    const summary = screen.getByTestId('forecast-form-summary');
    expect(summary).toHaveTextContent(/65%/);
  });

  it('shows confidence', () => {
    render(<ForecastFormSummary formData={mockFormData} market={mockMarkets[0]!} />);
    const summary = screen.getByTestId('forecast-form-summary');
    expect(summary).toHaveTextContent(/80%/);
  });

  it('shows privacy setting', () => {
    render(<ForecastFormSummary formData={mockFormData} market={mockMarkets[0]!} />);
    const summary = screen.getByTestId('forecast-form-summary');
    expect(summary).toHaveTextContent(/public/i);
  });
});

// =============================================================================
// ForecastSubmitButton Tests
// =============================================================================

describe('ForecastSubmitButton', () => {
  it('renders button', () => {
    render(<ForecastSubmitButton onSubmit={() => {}} disabled={false} />);
    expect(screen.getByTestId('forecast-submit-button')).toBeInTheDocument();
  });

  it('shows submit text', () => {
    render(<ForecastSubmitButton onSubmit={() => {}} disabled={false} />);
    expect(screen.getByText(/submit|create/i)).toBeInTheDocument();
  });

  it('calls onSubmit when clicked', () => {
    const onSubmit = vi.fn();
    render(<ForecastSubmitButton onSubmit={onSubmit} disabled={false} />);
    fireEvent.click(screen.getByTestId('forecast-submit-button'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<ForecastSubmitButton onSubmit={() => {}} disabled={true} />);
    expect(screen.getByTestId('forecast-submit-button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<ForecastSubmitButton onSubmit={() => {}} disabled={false} loading={true} />);
    expect(screen.getByText(/submitting|loading/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ForecastSubmissionForm Tests
// =============================================================================

describe('ForecastSubmissionForm', () => {
  it('renders form', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-submission-form')).toBeInTheDocument();
  });

  it('shows market selector', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('market-selector')).toBeInTheDocument();
  });

  it('shows probability input', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('probability-input')).toBeInTheDocument();
  });

  it('shows confidence selector', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('confidence-selector')).toBeInTheDocument();
  });

  it('shows reasoning textarea', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('reasoning-textarea')).toBeInTheDocument();
  });

  it('shows privacy selector', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-privacy-selector')).toBeInTheDocument();
  });

  it('shows submit button', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-submit-button')).toBeInTheDocument();
  });

  it('disables submit when form is incomplete', () => {
    render(<ForecastSubmissionForm markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-submit-button')).toBeDisabled();
  });
});

// =============================================================================
// ForecastSuccessMessage Tests
// =============================================================================

describe('ForecastSuccessMessage', () => {
  it('renders message', () => {
    render(<ForecastSuccessMessage attestationUid="0x123abc" onClose={() => {}} />);
    expect(screen.getByTestId('forecast-success-message')).toBeInTheDocument();
  });

  it('shows success text', () => {
    render(<ForecastSuccessMessage attestationUid="0x123abc" onClose={() => {}} />);
    expect(screen.getByText('Forecast Submitted Successfully!')).toBeInTheDocument();
  });

  it('shows attestation UID', () => {
    render(<ForecastSuccessMessage attestationUid="0x123abc" onClose={() => {}} />);
    const message = screen.getByTestId('forecast-success-message');
    expect(message).toHaveTextContent(/0x123abc/);
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ForecastSuccessMessage attestationUid="0x123abc" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-success-button'));
    expect(onClose).toHaveBeenCalled();
  });
});

// =============================================================================
// ForecastSubmissionPanel Tests
// =============================================================================

describe('ForecastSubmissionPanel', () => {
  it('renders panel', () => {
    render(<ForecastSubmissionPanel markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-submission-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<ForecastSubmissionPanel markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getAllByText(/forecast|create|submit/i).length).toBeGreaterThan(0);
  });

  it('shows submission form', () => {
    render(<ForecastSubmissionPanel markets={mockMarkets} onSubmit={() => {}} />);
    expect(screen.getByTestId('forecast-submission-form')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ForecastSubmissionPanel markets={[]} loading={true} onSubmit={() => {}} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows empty state when no markets', () => {
    render(<ForecastSubmissionPanel markets={[]} onSubmit={() => {}} />);
    expect(screen.getByText(/no markets|available/i)).toBeInTheDocument();
  });
});

// =============================================================================
// useForecastSubmission Hook Tests
// =============================================================================

describe('useForecastSubmission', () => {
  function TestComponent({ initialData }: { initialData?: Partial<ForecastFormData> }) {
    const {
      formData,
      isValid,
      isComplete,
      probabilityDisplay,
      confidenceLevel,
      setMarketId,
      setProbability,
      setConfidence,
      setReasoning,
      setPrivacy,
      reset,
    } = useForecastSubmission(initialData);

    return (
      <div>
        <span data-testid="market-id">{formData.marketId || 'none'}</span>
        <span data-testid="probability">{formData.probability}</span>
        <span data-testid="confidence">{formData.confidence}</span>
        <span data-testid="reasoning">{formData.reasoning}</span>
        <span data-testid="privacy">{formData.privacy}</span>
        <span data-testid="is-valid">{isValid ? 'yes' : 'no'}</span>
        <span data-testid="is-complete">{isComplete ? 'yes' : 'no'}</span>
        <span data-testid="probability-display">{probabilityDisplay}</span>
        <span data-testid="confidence-level">{confidenceLevel}</span>
        <button data-testid="set-market" onClick={() => setMarketId('market-1')}>Set Market</button>
        <button data-testid="set-probability" onClick={() => setProbability(75)}>Set Probability</button>
        <button data-testid="set-confidence" onClick={() => setConfidence(90)}>Set Confidence</button>
        <button data-testid="set-reasoning" onClick={() => setReasoning('Test')}>Set Reasoning</button>
        <button data-testid="set-privacy" onClick={() => setPrivacy('private')}>Set Privacy</button>
        <button data-testid="reset" onClick={reset}>Reset</button>
      </div>
    );
  }

  it('initializes with defaults', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('probability')).toHaveTextContent('50');
    expect(screen.getByTestId('confidence')).toHaveTextContent('50');
    expect(screen.getByTestId('privacy')).toHaveTextContent('public');
  });

  it('initializes with provided data', () => {
    render(<TestComponent initialData={{ probability: 75, confidence: 80 }} />);
    expect(screen.getByTestId('probability')).toHaveTextContent('75');
    expect(screen.getByTestId('confidence')).toHaveTextContent('80');
  });

  it('updates market ID', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-market'));
    expect(screen.getByTestId('market-id')).toHaveTextContent('market-1');
  });

  it('updates probability', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-probability'));
    expect(screen.getByTestId('probability')).toHaveTextContent('75');
  });

  it('updates confidence', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-confidence'));
    expect(screen.getByTestId('confidence')).toHaveTextContent('90');
  });

  it('updates reasoning', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-reasoning'));
    expect(screen.getByTestId('reasoning')).toHaveTextContent('Test');
  });

  it('updates privacy', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId('set-privacy'));
    expect(screen.getByTestId('privacy')).toHaveTextContent('private');
  });

  it('validates form is complete', () => {
    render(<TestComponent initialData={mockFormData} />);
    expect(screen.getByTestId('is-complete')).toHaveTextContent('yes');
  });

  it('validates form is valid', () => {
    render(<TestComponent initialData={mockFormData} />);
    expect(screen.getByTestId('is-valid')).toHaveTextContent('yes');
  });

  it('shows probability display', () => {
    render(<TestComponent initialData={{ probability: 65 }} />);
    expect(screen.getByTestId('probability-display')).toHaveTextContent('65%');
  });

  it('shows confidence level', () => {
    render(<TestComponent initialData={{ confidence: 90 }} />);
    expect(screen.getByTestId('confidence-level')).toHaveTextContent(/high/i);
  });

  it('resets form', () => {
    render(<TestComponent initialData={mockFormData} />);
    fireEvent.click(screen.getByTestId('reset'));
    expect(screen.getByTestId('probability')).toHaveTextContent('50');
    expect(screen.getByTestId('market-id')).toHaveTextContent('none');
  });
});
