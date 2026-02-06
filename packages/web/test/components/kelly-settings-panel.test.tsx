/**
 * KellySettingsPanel Component Tests
 *
 * Tests for the Kelly Criterion settings panel that displays:
 * - Kelly fraction presets (Full, 3/4, Half, 1/4, 1/10)
 * - Bankroll input
 * - Max position size slider
 * - Auto-expand calculator toggle
 * - Reset to defaults
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KellySettingsPanel } from '@/components/kelly-settings-panel';

// =============================================================================
// Mocks
// =============================================================================

type KellyMultiplierPreset = 'FULL' | 'THREE_QUARTER' | 'HALF' | 'QUARTER' | 'CONSERVATIVE';

// Mock kelly store values
let mockStoreValues: {
  multiplier: number;
  multiplierPreset: KellyMultiplierPreset;
  bankroll: number;
  maxPositionSize: number;
  autoExpandCalculator: boolean;
  setMultiplierPreset: ReturnType<typeof vi.fn>;
  setBankroll: ReturnType<typeof vi.fn>;
  setMaxPositionSize: ReturnType<typeof vi.fn>;
  setAutoExpandCalculator: ReturnType<typeof vi.fn>;
  resetToDefaults: ReturnType<typeof vi.fn>;
} = {
  multiplier: 0.5,
  multiplierPreset: 'HALF',
  bankroll: 1000,
  maxPositionSize: 0.25,
  autoExpandCalculator: false,
  setMultiplierPreset: vi.fn(),
  setBankroll: vi.fn(),
  setMaxPositionSize: vi.fn(),
  setAutoExpandCalculator: vi.fn(),
  resetToDefaults: vi.fn(),
};

vi.mock('@/lib/stores/kelly-store', () => ({
  useKellyStore: () => mockStoreValues,
  MULTIPLIER_PRESETS: {
    FULL: { value: 1.0, label: 'Full Kelly', description: 'Maximum growth, high volatility' },
    THREE_QUARTER: { value: 0.75, label: '3/4 Kelly', description: 'Aggressive but safer' },
    HALF: { value: 0.5, label: 'Half Kelly', description: 'Recommended for most users' },
    QUARTER: { value: 0.25, label: '1/4 Kelly', description: 'Conservative approach' },
    CONSERVATIVE: { value: 0.1, label: '1/10 Kelly', description: 'Very conservative' },
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('KellySettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreValues = {
      multiplier: 0.5,
      multiplierPreset: 'HALF',
      bankroll: 1000,
      maxPositionSize: 0.25,
      autoExpandCalculator: false,
      setMultiplierPreset: vi.fn(),
      setBankroll: vi.fn(),
      setMaxPositionSize: vi.fn(),
      setAutoExpandCalculator: vi.fn(),
      resetToDefaults: vi.fn(),
    };
  });

  describe('rendering', () => {
    it('renders the panel title', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('[KELLY SETTINGS]')).toBeInTheDocument();
    });

    it('renders the reset button', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('[RESET]')).toBeInTheDocument();
    });

    it('renders Kelly fraction label', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('KELLY FRACTION')).toBeInTheDocument();
    });

    it('renders info section', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('KELLY CRITERION:')).toBeInTheDocument();
      expect(screen.getByText(/Optimal position/)).toBeInTheDocument();
      expect(screen.getByText(/Half Kelly is recommended/)).toBeInTheDocument();
    });
  });

  describe('kelly fraction presets', () => {
    it('renders all preset buttons', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('Full Kelly')).toBeInTheDocument();
      expect(screen.getByText('3/4 Kelly')).toBeInTheDocument();
      expect(screen.getByText('Half Kelly')).toBeInTheDocument();
      expect(screen.getByText('1/4 Kelly')).toBeInTheDocument();
      expect(screen.getByText('1/10 Kelly')).toBeInTheDocument();
    });

    it('renders preset percentages', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('(100%)')).toBeInTheDocument();
      expect(screen.getByText('(75%)')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
      expect(screen.getByText('(25%)')).toBeInTheDocument();
      expect(screen.getByText('(10%)')).toBeInTheDocument();
    });

    it('renders preset descriptions in normal mode', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('Maximum growth, high volatility')).toBeInTheDocument();
      expect(screen.getByText('Aggressive but safer')).toBeInTheDocument();
      expect(screen.getByText('Recommended for most users')).toBeInTheDocument();
      expect(screen.getByText('Conservative approach')).toBeInTheDocument();
      expect(screen.getByText('Very conservative')).toBeInTheDocument();
    });

    it('hides descriptions in compact mode', () => {
      render(<KellySettingsPanel compact />);
      expect(screen.queryByText('Maximum growth, high volatility')).not.toBeInTheDocument();
      expect(screen.queryByText('Recommended for most users')).not.toBeInTheDocument();
    });

    it('displays current multiplier percentage', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('Current: 50% of optimal Kelly')).toBeInTheDocument();
    });

    it('calls setMultiplierPreset when Full Kelly clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('Full Kelly'));
      expect(mockStoreValues.setMultiplierPreset).toHaveBeenCalledWith('FULL');
    });

    it('calls setMultiplierPreset when 3/4 Kelly clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('3/4 Kelly'));
      expect(mockStoreValues.setMultiplierPreset).toHaveBeenCalledWith('THREE_QUARTER');
    });

    it('calls setMultiplierPreset when Half Kelly clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('Half Kelly'));
      expect(mockStoreValues.setMultiplierPreset).toHaveBeenCalledWith('HALF');
    });

    it('calls setMultiplierPreset when 1/4 Kelly clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('1/4 Kelly'));
      expect(mockStoreValues.setMultiplierPreset).toHaveBeenCalledWith('QUARTER');
    });

    it('calls setMultiplierPreset when 1/10 Kelly clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('1/10 Kelly'));
      expect(mockStoreValues.setMultiplierPreset).toHaveBeenCalledWith('CONSERVATIVE');
    });

    it('highlights the selected preset', () => {
      render(<KellySettingsPanel />);
      const halfKellyButton = screen.getByText('Half Kelly').closest('button');
      expect(halfKellyButton).toHaveClass('border-[hsl(var(--primary))]');
    });
  });

  describe('bankroll input', () => {
    it('renders bankroll input by default', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('DEFAULT BANKROLL ($)')).toBeInTheDocument();
    });

    it('shows bankroll input field with current value', () => {
      render(<KellySettingsPanel />);
      const input = screen.getByDisplayValue('1000');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
    });

    it('calls setBankroll when value changes', () => {
      render(<KellySettingsPanel />);
      const input = screen.getByDisplayValue('1000');
      fireEvent.change(input, { target: { value: '5000' } });
      expect(mockStoreValues.setBankroll).toHaveBeenCalledWith(5000);
    });

    it('handles empty bankroll input', () => {
      render(<KellySettingsPanel />);
      const input = screen.getByDisplayValue('1000');
      fireEvent.change(input, { target: { value: '' } });
      expect(mockStoreValues.setBankroll).toHaveBeenCalledWith(0);
    });

    it('hides bankroll input when showBankroll is false', () => {
      render(<KellySettingsPanel showBankroll={false} />);
      expect(screen.queryByText('DEFAULT BANKROLL ($)')).not.toBeInTheDocument();
    });
  });

  describe('max position size', () => {
    it('renders max position size label', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('MAX POSITION SIZE (% OF BANKROLL)')).toBeInTheDocument();
    });

    it('renders slider with current value', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveValue('25');
    });

    it('displays current max position percentage', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('displays calculated max position amount', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Individual positions capped at \$250/)).toBeInTheDocument();
    });

    it('calls setMaxPositionSize when slider changes', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '50' } });
      expect(mockStoreValues.setMaxPositionSize).toHaveBeenCalledWith(0.5);
    });

    it('updates display with different store values', () => {
      mockStoreValues.bankroll = 10000;
      mockStoreValues.maxPositionSize = 0.1;
      render(<KellySettingsPanel />);
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText(/Individual positions capped at \$1,000/)).toBeInTheDocument();
    });
  });

  describe('auto-expand calculator', () => {
    it('renders auto-expand checkbox', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByLabelText('Auto-expand calculator in market view')).toBeInTheDocument();
    });

    it('checkbox is unchecked by default', () => {
      render(<KellySettingsPanel />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('checkbox reflects store state when true', () => {
      mockStoreValues.autoExpandCalculator = true;
      render(<KellySettingsPanel />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls setAutoExpandCalculator when clicked', () => {
      render(<KellySettingsPanel />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(mockStoreValues.setAutoExpandCalculator).toHaveBeenCalledWith(true);
    });
  });

  describe('reset functionality', () => {
    it('calls resetToDefaults when reset button clicked', () => {
      render(<KellySettingsPanel />);
      fireEvent.click(screen.getByText('[RESET]'));
      expect(mockStoreValues.resetToDefaults).toHaveBeenCalled();
    });
  });

  describe('display with different multipliers', () => {
    it('displays full kelly multiplier', () => {
      mockStoreValues.multiplier = 1.0;
      mockStoreValues.multiplierPreset = 'FULL';
      render(<KellySettingsPanel />);
      expect(screen.getByText('Current: 100% of optimal Kelly')).toBeInTheDocument();
    });

    it('displays quarter kelly multiplier', () => {
      mockStoreValues.multiplier = 0.25;
      mockStoreValues.multiplierPreset = 'QUARTER';
      render(<KellySettingsPanel />);
      expect(screen.getByText('Current: 25% of optimal Kelly')).toBeInTheDocument();
    });

    it('displays conservative kelly multiplier', () => {
      mockStoreValues.multiplier = 0.1;
      mockStoreValues.multiplierPreset = 'CONSERVATIVE';
      render(<KellySettingsPanel />);
      expect(screen.getByText('Current: 10% of optimal Kelly')).toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('still renders all preset buttons in compact mode', () => {
      render(<KellySettingsPanel compact />);
      expect(screen.getByText('Full Kelly')).toBeInTheDocument();
      expect(screen.getByText('Half Kelly')).toBeInTheDocument();
      expect(screen.getByText('1/10 Kelly')).toBeInTheDocument();
    });

    it('still renders bankroll in compact mode by default', () => {
      render(<KellySettingsPanel compact />);
      expect(screen.getByText('DEFAULT BANKROLL ($)')).toBeInTheDocument();
    });

    it('can hide bankroll in compact mode', () => {
      render(<KellySettingsPanel compact showBankroll={false} />);
      expect(screen.queryByText('DEFAULT BANKROLL ($)')).not.toBeInTheDocument();
    });
  });

  describe('slider constraints', () => {
    it('slider has correct min value', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('min', '5');
    });

    it('slider has correct max value', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('max', '50');
    });

    it('slider has correct step value', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('step', '5');
    });
  });

  describe('bankroll input constraints', () => {
    it('bankroll input has correct min value', () => {
      render(<KellySettingsPanel />);
      const input = screen.getByDisplayValue('1000');
      expect(input).toHaveAttribute('min', '1');
    });

    it('bankroll input has correct step value', () => {
      render(<KellySettingsPanel />);
      const input = screen.getByDisplayValue('1000');
      expect(input).toHaveAttribute('step', '100');
    });
  });

  describe('large bankroll display', () => {
    it('formats large bankroll with commas', () => {
      mockStoreValues.bankroll = 100000;
      mockStoreValues.maxPositionSize = 0.25;
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Individual positions capped at \$25,000/)).toBeInTheDocument();
    });

    it('handles very large bankrolls', () => {
      mockStoreValues.bankroll = 1000000;
      mockStoreValues.maxPositionSize = 0.1;
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Individual positions capped at \$100,000/)).toBeInTheDocument();
    });
  });
});
