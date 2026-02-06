'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export type PrivacyLevel = 'public' | 'authenticated' | 'private';

export interface Market {
  id: string;
  question: string;
  platform: string;
  endDate: string;
}

export interface ForecastFormData {
  marketId: string | null;
  probability: number;
  confidence: number;
  reasoning: string;
  privacy: PrivacyLevel;
}

// =============================================================================
// ProbabilityInput Component
// =============================================================================

interface ProbabilityInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function ProbabilityInput({ value, onChange }: ProbabilityInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseInt(e.target.value, 10);
    if (isNaN(rawValue)) {
      onChange(0);
      return;
    }
    // Clamp to 0-100
    const clampedValue = Math.min(100, Math.max(0, rawValue));
    onChange(clampedValue);
  };

  return (
    <div className="flex items-center gap-2 font-mono">
      <input
        data-testid="probability-input"
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={handleChange}
        className="w-20 bg-black border border-[var(--terminal-dim)] text-[var(--terminal-green)] px-2 py-1 text-center focus:outline-none focus:border-[var(--terminal-green)]"
      />
      <span className="text-[var(--terminal-green)]">%</span>
    </div>
  );
}

// =============================================================================
// ProbabilitySlider Component
// =============================================================================

interface ProbabilitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function ProbabilitySlider({ value, onChange }: ProbabilitySliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="font-mono space-y-1">
      <input
        data-testid="probability-slider"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={handleChange}
        className="w-full accent-[var(--terminal-green)]"
      />
      <div className="flex justify-between text-xs text-[var(--terminal-dim)]">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// =============================================================================
// ConfidenceSelector Component
// =============================================================================

interface ConfidenceSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const CONFIDENCE_LEVELS = [
  { label: 'Low', value: 30 },
  { label: 'Medium', value: 60 },
  { label: 'High', value: 90 },
];

export function ConfidenceSelector({ value, onChange }: ConfidenceSelectorProps) {
  const getActiveLevel = () => {
    if (value >= 70) return 'High';
    if (value >= 40) return 'Medium';
    return 'Low';
  };

  const activeLevel = getActiveLevel();

  return (
    <div data-testid="confidence-selector" className="font-mono space-y-2">
      <div className="text-[var(--terminal-dim)] text-xs">Confidence Level</div>
      <div className="flex gap-2">
        {CONFIDENCE_LEVELS.map((level) => (
          <button
            key={level.label}
            onClick={() => onChange(level.value)}
            className={`px-3 py-1 border text-sm ${
              activeLevel === level.label
                ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] bg-[var(--terminal-green)]/10 selected active'
                : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
            }`}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ReasoningTextarea Component
// =============================================================================

interface ReasoningTextareaProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReasoningTextarea({ value, onChange }: ReasoningTextareaProps) {
  return (
    <div className="font-mono space-y-2">
      <div className="text-[var(--terminal-dim)] text-xs">Reasoning</div>
      <textarea
        data-testid="reasoning-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Explain your reasoning for this forecast..."
        className="w-full h-24 bg-black border border-[var(--terminal-dim)] text-[var(--terminal-green)] p-2 text-sm focus:outline-none focus:border-[var(--terminal-green)] resize-none"
      />
      <div className="text-[var(--terminal-dim)] text-xs text-right">
        {value.length} characters
      </div>
    </div>
  );
}

// =============================================================================
// MarketSelector Component
// =============================================================================

interface MarketSelectorProps {
  markets: Market[];
  selected: string | null;
  onSelect: (marketId: string) => void;
}

export function MarketSelector({ markets, selected, onSelect }: MarketSelectorProps) {
  return (
    <div data-testid="market-selector" className="font-mono space-y-2">
      {!selected && (
        <div className="text-[var(--terminal-dim)] text-sm">Select a market</div>
      )}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {markets.map((market) => (
          <div
            key={market.id}
            data-testid="market-option"
            onClick={() => onSelect(market.id)}
            className={`p-2 border cursor-pointer ${
              selected === market.id
                ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] bg-[var(--terminal-green)]/10 selected active'
                : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
            }`}
          >
            <div className="text-sm">{market.question}</div>
            <div className="text-xs mt-1 opacity-70">
              {market.platform} • Ends {market.endDate}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ForecastPrivacySelector Component
// =============================================================================

interface ForecastPrivacySelectorProps {
  selected: PrivacyLevel;
  onSelect: (privacy: PrivacyLevel) => void;
}

const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
];

export function ForecastPrivacySelector({ selected, onSelect }: ForecastPrivacySelectorProps) {
  return (
    <div data-testid="forecast-privacy-selector" className="font-mono space-y-2">
      <div className="text-[var(--terminal-dim)] text-xs">Privacy</div>
      <div className="flex gap-2">
        {PRIVACY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-3 py-1 border text-sm ${
              selected === option.value
                ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] bg-[var(--terminal-green)]/10 selected active'
                : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] hover:border-[var(--terminal-green)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ForecastFormSummary Component
// =============================================================================

interface ForecastFormSummaryProps {
  formData: ForecastFormData;
  market: Market;
}

export function ForecastFormSummary({ formData, market }: ForecastFormSummaryProps) {
  return (
    <div
      data-testid="forecast-form-summary"
      className="border border-[var(--terminal-dim)] p-3 font-mono space-y-2"
    >
      <div className="text-[var(--terminal-green)] font-bold text-sm">Summary</div>
      <div className="text-xs space-y-1 text-[var(--terminal-dim)]">
        <div>
          <span className="opacity-70">Market: </span>
          <span className="text-[var(--terminal-green)]">{market.question}</span>
        </div>
        <div>
          <span className="opacity-70">Probability: </span>
          <span className="text-[var(--terminal-green)]">{formData.probability}%</span>
        </div>
        <div>
          <span className="opacity-70">Confidence: </span>
          <span className="text-[var(--terminal-green)]">{formData.confidence}%</span>
        </div>
        <div>
          <span className="opacity-70">Privacy: </span>
          <span className="text-[var(--terminal-green)] capitalize">{formData.privacy}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ForecastSubmitButton Component
// =============================================================================

interface ForecastSubmitButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  loading?: boolean;
}

export function ForecastSubmitButton({ onSubmit, disabled, loading = false }: ForecastSubmitButtonProps) {
  return (
    <button
      data-testid="forecast-submit-button"
      onClick={onSubmit}
      disabled={disabled || loading}
      className={`w-full py-2 font-mono text-sm border ${
        disabled || loading
          ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
          : 'border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black'
      }`}
    >
      {loading ? 'Submitting...' : 'Submit Forecast'}
    </button>
  );
}

// =============================================================================
// ForecastSubmissionForm Component
// =============================================================================

interface ForecastSubmissionFormProps {
  markets: Market[];
  onSubmit: (data: ForecastFormData) => void;
  loading?: boolean;
}

export function ForecastSubmissionForm({ markets, onSubmit, loading = false }: ForecastSubmissionFormProps) {
  const {
    formData,
    isComplete,
    setMarketId,
    setProbability,
    setConfidence,
    setReasoning,
    setPrivacy,
  } = useForecastSubmission();

  const selectedMarket = markets.find((m) => m.id === formData.marketId);

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(formData);
    }
  };

  return (
    <div data-testid="forecast-submission-form" className="space-y-4">
      <MarketSelector
        markets={markets}
        selected={formData.marketId}
        onSelect={setMarketId}
      />

      <div className="space-y-2">
        <div className="text-[var(--terminal-dim)] text-xs font-mono">Probability</div>
        <ProbabilityInput value={formData.probability} onChange={setProbability} />
        <ProbabilitySlider value={formData.probability} onChange={setProbability} />
      </div>

      <ConfidenceSelector value={formData.confidence} onChange={setConfidence} />

      <ReasoningTextarea value={formData.reasoning} onChange={setReasoning} />

      <ForecastPrivacySelector selected={formData.privacy} onSelect={setPrivacy} />

      {selectedMarket && (
        <ForecastFormSummary formData={formData} market={selectedMarket} />
      )}

      <ForecastSubmitButton
        onSubmit={handleSubmit}
        disabled={!isComplete}
        loading={loading}
      />
    </div>
  );
}

// =============================================================================
// ForecastSuccessMessage Component
// =============================================================================

interface ForecastSuccessMessageProps {
  attestationUid: string;
  onClose: () => void;
}

export function ForecastSuccessMessage({ attestationUid, onClose }: ForecastSuccessMessageProps) {
  return (
    <div
      data-testid="forecast-success-message"
      className="border border-green-400 p-4 font-mono space-y-3"
    >
      <div className="text-green-400 font-bold text-lg">Forecast Submitted Successfully!</div>
      <div className="text-[var(--terminal-dim)] text-sm">
        Your forecast has been created and attested on-chain.
      </div>
      <div className="border border-[var(--terminal-dim)] p-2">
        <div className="text-[var(--terminal-dim)] text-xs">Attestation UID</div>
        <div className="text-[var(--terminal-green)] text-sm font-bold break-all">
          {attestationUid}
        </div>
      </div>
      <button
        data-testid="close-success-button"
        onClick={onClose}
        className="w-full py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black text-sm"
      >
        Create Another Forecast
      </button>
    </div>
  );
}

// =============================================================================
// ForecastSubmissionPanel Component
// =============================================================================

interface ForecastSubmissionPanelProps {
  markets: Market[];
  onSubmit: (data: ForecastFormData) => void;
  loading?: boolean;
  success?: { attestationUid: string } | null;
  onReset?: () => void;
}

export function ForecastSubmissionPanel({
  markets,
  onSubmit,
  loading = false,
  success = null,
  onReset,
}: ForecastSubmissionPanelProps) {
  if (loading && markets.length === 0) {
    return (
      <div data-testid="forecast-submission-panel" className="max-w-xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">
            Loading markets...
          </div>
        </div>
      </div>
    );
  }

  if (!loading && markets.length === 0) {
    return (
      <div data-testid="forecast-submission-panel" className="max-w-xl mx-auto p-4 font-mono">
        <div className="text-center py-8 text-[var(--terminal-dim)]">
          No markets available
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div data-testid="forecast-submission-panel" className="max-w-xl mx-auto p-4">
        <ForecastSuccessMessage
          attestationUid={success.attestationUid}
          onClose={onReset || (() => {})}
        />
      </div>
    );
  }

  return (
    <div data-testid="forecast-submission-panel" className="max-w-xl mx-auto p-4 font-mono space-y-4">
      <div className="text-[var(--terminal-green)] font-bold text-lg border-b border-[var(--terminal-dim)] pb-2">
        Create Forecast
      </div>
      <ForecastSubmissionForm markets={markets} onSubmit={onSubmit} loading={loading} />
    </div>
  );
}

// =============================================================================
// useForecastSubmission Hook
// =============================================================================

interface UseForecastSubmissionReturn {
  formData: ForecastFormData;
  isValid: boolean;
  isComplete: boolean;
  probabilityDisplay: string;
  confidenceLevel: string;
  setMarketId: (id: string) => void;
  setProbability: (value: number) => void;
  setConfidence: (value: number) => void;
  setReasoning: (value: string) => void;
  setPrivacy: (privacy: PrivacyLevel) => void;
  reset: () => void;
}

const DEFAULT_FORM_DATA: ForecastFormData = {
  marketId: null,
  probability: 50,
  confidence: 50,
  reasoning: '',
  privacy: 'public',
};

export function useForecastSubmission(
  initialData?: Partial<ForecastFormData>
): UseForecastSubmissionReturn {
  const [formData, setFormData] = useState<ForecastFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });

  const isComplete = useMemo(() => {
    return (
      formData.marketId !== null &&
      formData.marketId !== '' &&
      formData.probability >= 0 &&
      formData.probability <= 100 &&
      formData.confidence >= 0 &&
      formData.confidence <= 100
    );
  }, [formData]);

  const isValid = useMemo(() => {
    return isComplete;
  }, [isComplete]);

  const probabilityDisplay = useMemo(() => {
    return `${formData.probability}%`;
  }, [formData.probability]);

  const confidenceLevel = useMemo(() => {
    if (formData.confidence >= 70) return 'High';
    if (formData.confidence >= 40) return 'Medium';
    return 'Low';
  }, [formData.confidence]);

  const setMarketId = useCallback((id: string) => {
    setFormData((prev) => ({ ...prev, marketId: id }));
  }, []);

  const setProbability = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, probability: value }));
  }, []);

  const setConfidence = useCallback((value: number) => {
    setFormData((prev) => ({ ...prev, confidence: value }));
  }, []);

  const setReasoning = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, reasoning: value }));
  }, []);

  const setPrivacy = useCallback((privacy: PrivacyLevel) => {
    setFormData((prev) => ({ ...prev, privacy }));
  }, []);

  const reset = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
  }, []);

  return {
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
  };
}
