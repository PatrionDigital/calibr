/**
 * ForecastForm Component Tests
 *
 * Tests for the forecast submission form that handles:
 * - Probability input with validation
 * - Confidence slider
 * - Kelly Criterion recommendations
 * - Commit message/reasoning
 * - Privacy and attestation options
 * - Form submission
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForecastForm, type ForecastFormData } from '@/components/forecast-form';
import type { UnifiedMarket } from '@/lib/api';

// =============================================================================
// Mocks
// =============================================================================

// Store return values
let mockKellyStore = {
  multiplier: 0.5,
  multiplierPreset: 'HALF' as const,
  bankroll: 1000,
  maxPositionSize: 0.25,
  autoExpandCalculator: false,
  setMultiplier: vi.fn(),
  setMultiplierPreset: vi.fn(),
  setBankroll: vi.fn(),
  setMaxPositionSize: vi.fn(),
  setAutoExpandCalculator: vi.fn(),
  resetToDefaults: vi.fn(),
};

let mockPrivacyStore = {
  profileVisibility: 'PUBLIC' as const,
  showOnLeaderboard: true,
  showWalletAddress: false,
  defaultForecastPrivacy: 'PUBLIC' as const,
  shareReasoningPublicly: true,
  defaultAttestationMode: 'ON_CHAIN' as const,
  useOffchainAttestations: false,
  usePrivateDataAttestations: false,
  allowReputationExport: true,
  allowDataAggregation: true,
  setProfileVisibility: vi.fn(),
  setShowOnLeaderboard: vi.fn(),
  setShowWalletAddress: vi.fn(),
  setDefaultForecastPrivacy: vi.fn(),
  setShareReasoningPublicly: vi.fn(),
  setDefaultAttestationMode: vi.fn(),
  setUseOffchainAttestations: vi.fn(),
  setUsePrivateDataAttestations: vi.fn(),
  setAllowReputationExport: vi.fn(),
  setAllowDataAggregation: vi.fn(),
  updateSettings: vi.fn(),
  resetToDefaults: vi.fn(),
};

vi.mock('@/lib/stores/kelly-store', () => ({
  useKellyStore: () => mockKellyStore,
  MULTIPLIER_PRESETS: {
    FULL: { value: 1.0, label: 'Full Kelly', description: 'Maximum growth' },
    THREE_QUARTER: { value: 0.75, label: '3/4 Kelly', description: 'Aggressive but safer' },
    HALF: { value: 0.5, label: 'Half Kelly', description: 'Recommended' },
    QUARTER: { value: 0.25, label: '1/4 Kelly', description: 'Conservative' },
    CONSERVATIVE: { value: 0.1, label: '1/10 Kelly', description: 'Very conservative' },
  },
}));

vi.mock('@/lib/stores/privacy-store', () => ({
  usePrivacyStore: () => mockPrivacyStore,
  ATTESTATION_MODE_OPTIONS: {
    ON_CHAIN: { label: 'On-Chain', description: 'Fully transparent' },
    OFF_CHAIN: { label: 'Off-Chain', description: 'Signed but stored off-chain' },
    PRIVATE: { label: 'Private (Merkle)', description: 'Selective disclosure' },
  },
}));

// Mock Tooltip component
vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  InfoIcon: () => <span data-testid="info-icon">ℹ</span>,
}));

// =============================================================================
// Test Setup
// =============================================================================

const mockMarket: UnifiedMarket = {
  id: 'test-market-123',
  slug: 'test-market-slug',
  question: 'Will Bitcoin reach $100,000 by end of year?',
  description: 'Test market description',
  category: 'Crypto',
  bestYesPrice: 0.65,
  bestNoPrice: 0.35,
  bestYesPlatform: 'LIMITLESS',
  bestNoPlatform: 'LIMITLESS',
  totalVolume: 10000,
  totalLiquidity: 50000,
  currentSpread: 0.02,
  isActive: true,
  closesAt: new Date(Date.now() + 86400000 * 30).toISOString(),
  resolvedAt: null,
  resolution: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultProps = {
  market: mockMarket,
  onSubmit: vi.fn(),
};

function resetMocks() {
  vi.clearAllMocks();

  mockKellyStore = {
    multiplier: 0.5,
    multiplierPreset: 'HALF' as const,
    bankroll: 1000,
    maxPositionSize: 0.25,
    autoExpandCalculator: false,
    setMultiplier: vi.fn(),
    setMultiplierPreset: vi.fn(),
    setBankroll: vi.fn(),
    setMaxPositionSize: vi.fn(),
    setAutoExpandCalculator: vi.fn(),
    resetToDefaults: vi.fn(),
  };

  mockPrivacyStore = {
    profileVisibility: 'PUBLIC' as const,
    showOnLeaderboard: true,
    showWalletAddress: false,
    defaultForecastPrivacy: 'PUBLIC' as const,
    shareReasoningPublicly: true,
    defaultAttestationMode: 'ON_CHAIN' as const,
    useOffchainAttestations: false,
    usePrivateDataAttestations: false,
    allowReputationExport: true,
    allowDataAggregation: true,
    setProfileVisibility: vi.fn(),
    setShowOnLeaderboard: vi.fn(),
    setShowWalletAddress: vi.fn(),
    setDefaultForecastPrivacy: vi.fn(),
    setShareReasoningPublicly: vi.fn(),
    setDefaultAttestationMode: vi.fn(),
    setUseOffchainAttestations: vi.fn(),
    setUsePrivateDataAttestations: vi.fn(),
    setAllowReputationExport: vi.fn(),
    setAllowDataAggregation: vi.fn(),
    updateSettings: vi.fn(),
    resetToDefaults: vi.fn(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ForecastForm', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('rendering', () => {
    it('renders market info section', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('MARKET')).toBeInTheDocument();
      expect(screen.getByText(mockMarket.question)).toBeInTheDocument();
    });

    it('displays current market price', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('Current price: 65.0%')).toBeInTheDocument();
    });

    it('renders probability input', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('YOUR PROBABILITY ESTIMATE (%)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter 0.01-99.99')).toBeInTheDocument();
    });

    it('renders confidence slider', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText(/CONFIDENCE/)).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('renders reasoning textarea', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('REASONING (COMMIT MESSAGE)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Why do you believe this/)).toBeInTheDocument();
    });

    it('renders Kelly fraction selector', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('KELLY FRACTION')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders public checkbox', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByLabelText('Make this forecast public')).toBeInTheDocument();
    });

    it('renders auto-rebalance checkbox', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByLabelText('Auto-rebalance portfolio based on this forecast')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'COMMIT FORECAST' })).toBeInTheDocument();
    });

    it('renders UPDATE FORECAST button when existingProbability provided', () => {
      render(<ForecastForm {...defaultProps} existingProbability={0.7} />);
      expect(screen.getByRole('button', { name: 'UPDATE FORECAST' })).toBeInTheDocument();
    });

    it('renders cancel button when onCancel provided', () => {
      render(<ForecastForm {...defaultProps} onCancel={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel not provided', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.queryByRole('button', { name: 'CANCEL' })).not.toBeInTheDocument();
    });
  });

  describe('probability input', () => {
    it('allows entering probability', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '75' } });
      expect(input).toHaveValue(75);
    });

    it('pre-fills probability when existingProbability provided', () => {
      render(<ForecastForm {...defaultProps} existingProbability={0.7} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      expect(input).toHaveValue(70);
    });

    it('shows price change from previous when existingProbability provided', () => {
      render(<ForecastForm {...defaultProps} existingProbability={0.5} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '60' } });
      expect(screen.getByText('+10.0% from previous')).toBeInTheDocument();
    });

    it('shows negative price change', () => {
      render(<ForecastForm {...defaultProps} existingProbability={0.7} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '60' } });
      expect(screen.getByText('-10.0% from previous')).toBeInTheDocument();
    });
  });

  describe('confidence slider', () => {
    it('has default value of 50', () => {
      render(<ForecastForm {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveValue('50');
    });

    it('displays current confidence value', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('CONFIDENCE (50%)')).toBeInTheDocument();
    });

    it('allows changing confidence', () => {
      render(<ForecastForm {...defaultProps} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });
      expect(slider).toHaveValue('80');
      expect(screen.getByText('CONFIDENCE (80%)')).toBeInTheDocument();
    });
  });

  describe('Kelly recommendation', () => {
    it('shows Kelly recommendation when probability entered', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '80' } });

      expect(screen.getByText('KELLY RECOMMENDATION')).toBeInTheDocument();
    });

    it('shows YES side when user probability higher than market', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '80' } }); // Higher than 65% market

      expect(screen.getByText('YES')).toBeInTheDocument();
    });

    it('shows NO side when user probability lower than market', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '30' } }); // Lower than 65% market

      expect(screen.getByText('NO')).toBeInTheDocument();
    });

    it('shows no edge warning when probability close to market', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '65' } }); // Same as market

      expect(screen.getByText(/No edge detected/)).toBeInTheDocument();
    });

    it('displays edge percentage', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '80' } });

      expect(screen.getByText('EDGE')).toBeInTheDocument();
      // Edge is 80% - 65% = 15%
      expect(screen.getByText('+15.0%')).toBeInTheDocument();
    });

    it('displays recommended size', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '80' } });

      expect(screen.getByText('SIZE')).toBeInTheDocument();
    });

    it('does not show Kelly recommendation without probability', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.queryByText('KELLY RECOMMENDATION')).not.toBeInTheDocument();
    });

    it('does not show Kelly recommendation for invalid probability', () => {
      render(<ForecastForm {...defaultProps} />);
      const input = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(input, { target: { value: '0' } });
      expect(screen.queryByText('KELLY RECOMMENDATION')).not.toBeInTheDocument();
    });
  });

  describe('reasoning textarea', () => {
    it('allows entering reasoning', () => {
      render(<ForecastForm {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Why do you believe this/);
      fireEvent.change(textarea, { target: { value: 'Strong economic indicators' } });
      expect(textarea).toHaveValue('Strong economic indicators');
    });

    it('shows character count', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText('0/1000')).toBeInTheDocument();
    });

    it('updates character count as user types', () => {
      render(<ForecastForm {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Why do you believe this/);
      fireEvent.change(textarea, { target: { value: 'Test reasoning' } });
      expect(screen.getByText('14/1000')).toBeInTheDocument();
    });
  });

  describe('Kelly fraction selector', () => {
    it('has default value from store', () => {
      render(<ForecastForm {...defaultProps} />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('0.5');
    });

    it('allows changing Kelly fraction', () => {
      render(<ForecastForm {...defaultProps} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '0.25' } });
      expect(select).toHaveValue('0.25');
    });

    it('displays all preset options', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText(/Full Kelly/)).toBeInTheDocument();
      expect(screen.getByText(/3\/4 Kelly/)).toBeInTheDocument();
      expect(screen.getByText(/Half Kelly/)).toBeInTheDocument();
      expect(screen.getByText(/1\/4 Kelly/)).toBeInTheDocument();
      expect(screen.getByText(/1\/10 Kelly/)).toBeInTheDocument();
    });
  });

  describe('privacy options', () => {
    it('public checkbox reflects store default', () => {
      render(<ForecastForm {...defaultProps} />);
      const checkbox = screen.getByLabelText('Make this forecast public');
      expect(checkbox).toBeChecked();
    });

    it('allows toggling public checkbox', () => {
      render(<ForecastForm {...defaultProps} />);
      const checkbox = screen.getByLabelText('Make this forecast public');
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('shows advanced privacy options toggle', () => {
      render(<ForecastForm {...defaultProps} />);
      expect(screen.getByText(/Show.*advanced privacy options/)).toBeInTheDocument();
    });

    it('expands advanced privacy options on click', () => {
      render(<ForecastForm {...defaultProps} />);
      const toggle = screen.getByText(/Show.*advanced privacy options/);
      fireEvent.click(toggle);
      expect(screen.getByText('ATTESTATION MODE (override default)')).toBeInTheDocument();
    });

    it('shows all attestation mode options when expanded', () => {
      render(<ForecastForm {...defaultProps} />);
      const toggle = screen.getByText(/Show.*advanced privacy options/);
      fireEvent.click(toggle);

      expect(screen.getByText('On-Chain')).toBeInTheDocument();
      expect(screen.getByText('Off-Chain')).toBeInTheDocument();
      expect(screen.getByText('Private (Merkle)')).toBeInTheDocument();
    });

    it('allows selecting attestation mode', () => {
      render(<ForecastForm {...defaultProps} />);
      const toggle = screen.getByText(/Show.*advanced privacy options/);
      fireEvent.click(toggle);

      const offChainRadio = screen.getByRole('radio', { name: /Off-Chain/ });
      fireEvent.click(offChainRadio);
      expect(offChainRadio).toBeChecked();
    });

    it('collapses advanced options when clicked again', () => {
      render(<ForecastForm {...defaultProps} />);
      const toggle = screen.getByText(/Show.*advanced privacy options/);
      fireEvent.click(toggle);
      expect(screen.getByText('ATTESTATION MODE (override default)')).toBeInTheDocument();

      const hideToggle = screen.getByText(/Hide.*advanced privacy options/);
      fireEvent.click(hideToggle);
      expect(screen.queryByText('ATTESTATION MODE (override default)')).not.toBeInTheDocument();
    });
  });

  describe('auto-rebalance option', () => {
    it('is unchecked by default', () => {
      render(<ForecastForm {...defaultProps} />);
      const checkbox = screen.getByLabelText('Auto-rebalance portfolio based on this forecast');
      expect(checkbox).not.toBeChecked();
    });

    it('allows toggling auto-rebalance', () => {
      render(<ForecastForm {...defaultProps} />);
      const checkbox = screen.getByLabelText('Auto-rebalance portfolio based on this forecast');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with form data', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill in probability
      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '75' } });

      // Fill in reasoning
      const textarea = screen.getByPlaceholderText(/Why do you believe this/);
      fireEvent.change(textarea, { target: { value: 'Test reasoning' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          probability: 0.75,
          confidence: 0.5,
          commitMessage: 'Test reasoning',
          isPublic: true,
          kellyFraction: 0.5,
          executeRebalance: false,
          attestationMode: 'ON_CHAIN',
        });
      });
    });

    it('does not submit when probability is empty', async () => {
      const onSubmit = vi.fn();
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('does not submit when probability is 0', async () => {
      const onSubmit = vi.fn();
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('does not submit when probability is 100', async () => {
      const onSubmit = vi.fn();
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '100' } });

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    it('includes changed confidence in submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '75' } });

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '90' } });

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ confidence: 0.9 })
        );
      });
    });

    it('includes isPublic false when unchecked', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '75' } });

      const publicCheckbox = screen.getByLabelText('Make this forecast public');
      fireEvent.click(publicCheckbox);

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ isPublic: false })
        );
      });
    });

    it('includes executeRebalance true when checked', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<ForecastForm {...defaultProps} onSubmit={onSubmit} />);

      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '75' } });

      const rebalanceCheckbox = screen.getByLabelText('Auto-rebalance portfolio based on this forecast');
      fireEvent.click(rebalanceCheckbox);

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ executeRebalance: true })
        );
      });
    });
  });

  describe('loading state', () => {
    it('shows SAVING... when loading', () => {
      render(<ForecastForm {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('button', { name: 'SAVING...' })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      render(<ForecastForm {...defaultProps} isLoading={true} />);
      const submitButton = screen.getByRole('button', { name: 'SAVING...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(<ForecastForm {...defaultProps} onCancel={vi.fn()} isLoading={true} />);
      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('cancel button', () => {
    it('calls onCancel when clicked', () => {
      const onCancel = vi.fn();
      render(<ForecastForm {...defaultProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: 'CANCEL' });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('market price normalization', () => {
    it('normalizes price in 0-1 range', () => {
      const market = { ...mockMarket, bestYesPrice: 0.45 };
      render(<ForecastForm {...defaultProps} market={market} />);
      expect(screen.getByText('Current price: 45.0%')).toBeInTheDocument();
    });

    it('normalizes price in 0-100 range', () => {
      const market = { ...mockMarket, bestYesPrice: 45 };
      render(<ForecastForm {...defaultProps} market={market} />);
      expect(screen.getByText('Current price: 45.0%')).toBeInTheDocument();
    });

    it('defaults to 50% when price is null', () => {
      const market = { ...mockMarket, bestYesPrice: null as unknown as number };
      render(<ForecastForm {...defaultProps} market={market} />);
      expect(screen.getByText('Current price: 50.0%')).toBeInTheDocument();
    });
  });

  describe('submit button disabled state', () => {
    it('disables submit button when probability empty', () => {
      render(<ForecastForm {...defaultProps} />);
      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when probability entered', () => {
      render(<ForecastForm {...defaultProps} />);
      const probInput = screen.getByPlaceholderText('Enter 0.01-99.99');
      fireEvent.change(probInput, { target: { value: '75' } });

      const submitButton = screen.getByRole('button', { name: 'COMMIT FORECAST' });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
