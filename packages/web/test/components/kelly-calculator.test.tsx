/**
 * Kelly Calculator Component Tests
 *
 * Tests for KellyCalculator, KellySettingsPanel, and PortfolioKelly components
 * that implement Kelly Criterion position sizing for prediction markets.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the Zustand store
const mockKellyStore = {
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

vi.mock('@/lib/stores/kelly-store', () => ({
  useKellyStore: () => mockKellyStore,
  MULTIPLIER_PRESETS: {
    FULL: { value: 1.0, label: 'Full Kelly', description: 'Maximum growth, high volatility' },
    THREE_QUARTER: { value: 0.75, label: '3/4 Kelly', description: 'Aggressive but safer' },
    HALF: { value: 0.5, label: 'Half Kelly', description: 'Recommended for most users' },
    QUARTER: { value: 0.25, label: '1/4 Kelly', description: 'Conservative approach' },
    CONSERVATIVE: { value: 0.1, label: '1/10 Kelly', description: 'Very conservative' },
  },
}));

// Mock the Tooltip component
vi.mock('./tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip">{children}</span>,
  InfoIcon: () => <span data-testid="info-icon">ℹ</span>,
  KELLY_TOOLTIPS: {
    estimatedProbability: 'Your estimated probability tooltip',
    bankroll: 'Your total bankroll tooltip',
    kellyFraction: 'Kelly fraction tooltip',
    edge: 'Edge tooltip',
    recommendedSize: 'Recommended size tooltip',
    expectedValue: 'Expected value tooltip',
    portfolioKelly: 'Portfolio Kelly tooltip',
  },
}));

// Lazy import components to ensure mocks are set up first
let KellyCalculator: typeof import('@/components/kelly-calculator').KellyCalculator;
let KellySettingsPanel: typeof import('@/components/kelly-settings-panel').KellySettingsPanel;
let PortfolioKelly: typeof import('@/components/portfolio-kelly').PortfolioKelly;

beforeEach(async () => {
  vi.resetModules();

  // Reset mock store state
  mockKellyStore.multiplier = 0.5;
  mockKellyStore.multiplierPreset = 'HALF';
  mockKellyStore.bankroll = 1000;
  mockKellyStore.maxPositionSize = 0.25;
  mockKellyStore.autoExpandCalculator = false;

  // Clear all mock function calls
  vi.clearAllMocks();

  // Re-import components after mocks are reset
  const kellyCalcModule = await import('@/components/kelly-calculator');
  const kellySettingsModule = await import('@/components/kelly-settings-panel');
  const portfolioKellyModule = await import('@/components/portfolio-kelly');

  KellyCalculator = kellyCalcModule.KellyCalculator;
  KellySettingsPanel = kellySettingsModule.KellySettingsPanel;
  PortfolioKelly = portfolioKellyModule.PortfolioKelly;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// KellyCalculator Component Tests
// ============================================================================

describe('KellyCalculator', () => {
  describe('rendering', () => {
    it('renders the calculator header', () => {
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Will it rain tomorrow?" />);
      expect(screen.getByText('[KELLY CRITERION CALCULATOR]')).toBeInTheDocument();
    });

    it('shows collapse indicator when expanded', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      expect(screen.getByText('[-]')).toBeInTheDocument();
    });

    it('shows expand indicator when collapsed', () => {
      mockKellyStore.autoExpandCalculator = false;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      expect(screen.getByText('[+]')).toBeInTheDocument();
    });

    it('expands when header is clicked', () => {
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      const header = screen.getByRole('button');
      fireEvent.click(header);
      expect(screen.getByText('YOUR ESTIMATED PROBABILITY (%)')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('shows probability input field', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      expect(screen.getByPlaceholderText('Market: 50.0%')).toBeInTheDocument();
    });

    it('shows bankroll input field', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      expect(screen.getByText('BANKROLL ($)')).toBeInTheDocument();
    });

    it('shows Kelly fraction selector', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);
      expect(screen.getByText('KELLY FRACTION')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('displays market price placeholder correctly for decimal prices', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.65} marketQuestion="Test market" />);
      expect(screen.getByPlaceholderText('Market: 65.0%')).toBeInTheDocument();
    });

    it('normalizes percentage prices over 1', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={65} marketQuestion="Test market" />);
      expect(screen.getByPlaceholderText('Market: 65.0%')).toBeInTheDocument();
    });
  });

  describe('Kelly calculation - YES side edge', () => {
    it('recommends YES when estimated probability exceeds market price', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.4} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 40.0%');
      fireEvent.change(probabilityInput, { target: { value: '60' } });

      expect(screen.getByText('BET YES')).toBeInTheDocument();
    });

    it('calculates edge correctly for YES side', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.4} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 40.0%');
      fireEvent.change(probabilityInput, { target: { value: '60' } });

      // Edge = 0.60 - 0.40 = 0.20 = 20%
      expect(screen.getByText('+20.0%')).toBeInTheDocument();
    });

    it('calculates recommended bet size for YES side', () => {
      mockKellyStore.autoExpandCalculator = true;
      mockKellyStore.bankroll = 1000;
      mockKellyStore.multiplier = 0.5;
      mockKellyStore.maxPositionSize = 0.25;

      render(<KellyCalculator marketPrice={0.4} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 40.0%');
      fireEvent.change(probabilityInput, { target: { value: '60' } });

      // Raw Kelly = (0.60 - 0.40) / (1 - 0.40) = 0.20 / 0.60 = 0.333
      // Half Kelly = 0.333 * 0.5 = 0.167 = 16.7%
      // Dollar amount = 1000 * 0.167 = $166.67
      expect(screen.getByText('$166.67')).toBeInTheDocument();
    });
  });

  describe('Kelly calculation - NO side edge', () => {
    it('recommends NO when estimated probability is below market price', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.7} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 70.0%');
      fireEvent.change(probabilityInput, { target: { value: '40' } });

      expect(screen.getByText('BET NO')).toBeInTheDocument();
    });

    it('calculates edge correctly for NO side', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.7} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 70.0%');
      fireEvent.change(probabilityInput, { target: { value: '40' } });

      // NO price = 1 - 0.70 = 0.30
      // NO probability = 1 - 0.40 = 0.60
      // Edge = 0.60 - 0.30 = 0.30 = 30%
      expect(screen.getByText('+30.0%')).toBeInTheDocument();
    });
  });

  describe('no edge scenario', () => {
    it('shows NO EDGE when probability matches market price', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 50.0%');
      fireEvent.change(probabilityInput, { target: { value: '50' } });

      expect(screen.getByText('NO EDGE')).toBeInTheDocument();
    });

    it('shows do not bet message when no edge', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 50.0%');
      fireEvent.change(probabilityInput, { target: { value: '50' } });

      expect(screen.getByText(/Do not bet/)).toBeInTheDocument();
    });
  });

  describe('position capping', () => {
    it('shows capped indicator when position exceeds max size', () => {
      mockKellyStore.autoExpandCalculator = true;
      mockKellyStore.multiplier = 1.0; // Full Kelly
      mockKellyStore.maxPositionSize = 0.25;

      render(<KellyCalculator marketPrice={0.3} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 30.0%');
      fireEvent.change(probabilityInput, { target: { value: '70' } });

      // Raw Kelly would be very high, should be capped at 25%
      expect(screen.getByText(/capped/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('shows prompt when no probability entered', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);

      expect(screen.getByText(/Enter your probability estimate/)).toBeInTheDocument();
    });

    it('handles invalid probability values gracefully', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 50.0%');
      fireEvent.change(probabilityInput, { target: { value: '0' } });

      // Should not show recommendation for invalid probability
      expect(screen.queryByText('BET YES')).not.toBeInTheDocument();
      expect(screen.queryByText('BET NO')).not.toBeInTheDocument();
    });

    it('handles probability at boundary (100%)', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.5} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 50.0%');
      fireEvent.change(probabilityInput, { target: { value: '100' } });

      // 100% is >= 1, should not calculate
      expect(screen.queryByText('BET YES')).not.toBeInTheDocument();
    });

    it('displays risk warning', () => {
      mockKellyStore.autoExpandCalculator = true;
      render(<KellyCalculator marketPrice={0.4} marketQuestion="Test market" />);

      const probabilityInput = screen.getByPlaceholderText('Market: 40.0%');
      fireEvent.change(probabilityInput, { target: { value: '60' } });

      expect(screen.getByText(/This is not financial advice/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// KellySettingsPanel Component Tests
// ============================================================================

describe('KellySettingsPanel', () => {
  describe('rendering', () => {
    it('renders the settings header', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('[KELLY SETTINGS]')).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('[RESET]')).toBeInTheDocument();
    });

    it('renders all Kelly fraction presets', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('Full Kelly')).toBeInTheDocument();
      expect(screen.getByText('3/4 Kelly')).toBeInTheDocument();
      expect(screen.getByText('Half Kelly')).toBeInTheDocument();
      expect(screen.getByText('1/4 Kelly')).toBeInTheDocument();
      expect(screen.getByText('1/10 Kelly')).toBeInTheDocument();
    });

    it('shows preset percentages', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('(100%)')).toBeInTheDocument();
      expect(screen.getByText('(75%)')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
      expect(screen.getByText('(25%)')).toBeInTheDocument();
      expect(screen.getByText('(10%)')).toBeInTheDocument();
    });
  });

  describe('bankroll input', () => {
    it('shows bankroll input by default', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('DEFAULT BANKROLL ($)')).toBeInTheDocument();
    });

    it('hides bankroll input when showBankroll is false', () => {
      render(<KellySettingsPanel showBankroll={false} />);
      expect(screen.queryByText('DEFAULT BANKROLL ($)')).not.toBeInTheDocument();
    });

    it('calls setBankroll when input changes', () => {
      render(<KellySettingsPanel />);
      // Input doesn't have accessible name, find by type
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
      const bankrollInput = inputs[0]!; // First spinbutton is bankroll
      fireEvent.change(bankrollInput, { target: { value: '5000' } });
      expect(mockKellyStore.setBankroll).toHaveBeenCalledWith(5000);
    });
  });

  describe('max position size slider', () => {
    it('renders max position size slider', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('MAX POSITION SIZE (% OF BANKROLL)')).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('displays current max position size', () => {
      mockKellyStore.maxPositionSize = 0.25;
      render(<KellySettingsPanel />);
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('calls setMaxPositionSize when slider changes', () => {
      render(<KellySettingsPanel />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '30' } });
      expect(mockKellyStore.setMaxPositionSize).toHaveBeenCalledWith(0.3);
    });

    it('displays capped dollar amount', () => {
      mockKellyStore.bankroll = 1000;
      mockKellyStore.maxPositionSize = 0.25;
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Individual positions capped at \$250/)).toBeInTheDocument();
    });
  });

  describe('auto-expand checkbox', () => {
    it('renders auto-expand checkbox', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText('Auto-expand calculator in market view')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('calls setAutoExpandCalculator when checkbox changes', () => {
      render(<KellySettingsPanel />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(mockKellyStore.setAutoExpandCalculator).toHaveBeenCalledWith(true);
    });
  });

  describe('preset selection', () => {
    it('calls setMultiplierPreset when preset button clicked', () => {
      render(<KellySettingsPanel />);
      const fullKellyButton = screen.getByText('Full Kelly').closest('button');
      fireEvent.click(fullKellyButton!);
      expect(mockKellyStore.setMultiplierPreset).toHaveBeenCalledWith('FULL');
    });

    it('highlights selected preset', () => {
      mockKellyStore.multiplierPreset = 'HALF';
      render(<KellySettingsPanel />);
      const halfKellyButton = screen.getByText('Half Kelly').closest('button');
      expect(halfKellyButton).toHaveClass('border-[hsl(var(--primary))]');
    });
  });

  describe('reset functionality', () => {
    it('calls resetToDefaults when reset button clicked', () => {
      render(<KellySettingsPanel />);
      const resetButton = screen.getByText('[RESET]');
      fireEvent.click(resetButton);
      expect(mockKellyStore.resetToDefaults).toHaveBeenCalled();
    });
  });

  describe('compact mode', () => {
    it('hides descriptions in compact mode', () => {
      render(<KellySettingsPanel compact={true} />);
      expect(screen.queryByText('Maximum growth, high volatility')).not.toBeInTheDocument();
    });

    it('shows descriptions in normal mode', () => {
      render(<KellySettingsPanel compact={false} />);
      expect(screen.getByText('Maximum growth, high volatility')).toBeInTheDocument();
    });
  });

  describe('info section', () => {
    it('displays Kelly Criterion explanation', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText(/KELLY CRITERION:/)).toBeInTheDocument();
      expect(screen.getByText(/Optimal position sizing/)).toBeInTheDocument();
    });

    it('displays Half Kelly recommendation', () => {
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Half Kelly is recommended/)).toBeInTheDocument();
    });
  });

  describe('current multiplier display', () => {
    it('displays current multiplier percentage', () => {
      mockKellyStore.multiplier = 0.5;
      render(<KellySettingsPanel />);
      expect(screen.getByText(/Current: 50% of optimal Kelly/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// PortfolioKelly Component Tests
// ============================================================================

describe('PortfolioKelly', () => {
  const mockMarkets = [
    {
      marketId: 'market-1',
      question: 'Will Bitcoin reach $100k?',
      yesPrice: 0.4,
      estimatedProbability: 0.6,
    },
    {
      marketId: 'market-2',
      question: 'Will ETH flip BTC?',
      yesPrice: 0.2,
      estimatedProbability: 0.1,
    },
    {
      marketId: 'market-3',
      question: 'Will it rain tomorrow?',
      yesPrice: 0.5,
      estimatedProbability: 0.7,
    },
  ];

  describe('rendering', () => {
    it('renders the portfolio header', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      expect(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]')).toBeInTheDocument();
    });

    it('returns null for empty markets array', () => {
      const { container } = render(<PortfolioKelly markets={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('shows expand indicator when collapsed', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      expect(screen.getByText('[+]')).toBeInTheDocument();
    });

    it('shows collapse indicator when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);
      expect(screen.getByText('[-]')).toBeInTheDocument();
    });
  });

  describe('summary display', () => {
    it('displays count of markets with positive edge', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      // All 3 markets have positive edge:
      // market-1: YES edge (est 60% > price 40%)
      // market-2: NO edge (est NO 90% > NO price 80%)
      // market-3: YES edge (est 70% > price 50%)
      expect(screen.getByText(/3 of 3 markets with positive edge/)).toBeInTheDocument();
    });

    it('displays total allocation when positive edge exists', () => {
      mockKellyStore.bankroll = 1000;
      render(<PortfolioKelly markets={mockMarkets} />);
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  describe('expanded view', () => {
    it('shows market table headers when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText('MARKET')).toBeInTheDocument();
      expect(screen.getByText('SIDE')).toBeInTheDocument();
      expect(screen.getByText('EDGE')).toBeInTheDocument();
      expect(screen.getByText('AMOUNT')).toBeInTheDocument();
    });

    it('displays market questions when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText('Will Bitcoin reach $100k?')).toBeInTheDocument();
    });

    it('shows TOTAL ALLOCATION row when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText('TOTAL ALLOCATION')).toBeInTheDocument();
    });

    it('displays remaining bankroll when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText(/Remaining:/)).toBeInTheDocument();
    });

    it('shows correlation warning when expanded', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText(/assumes independent markets/)).toBeInTheDocument();
    });
  });

  describe('edge calculations', () => {
    it('identifies markets with positive YES edge', () => {
      render(<PortfolioKelly markets={mockMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      // Market 1 has YES edge (est 60% > market 40%)
      const yesTexts = screen.getAllByText('YES');
      expect(yesTexts.length).toBeGreaterThan(0);
    });

    it('identifies markets with positive NO edge', () => {
      const marketsWithNoEdge = [
        {
          marketId: 'market-1',
          question: 'Test NO edge market',
          yesPrice: 0.7,
          estimatedProbability: 0.3,
        },
      ];

      render(<PortfolioKelly markets={marketsWithNoEdge} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText('NO')).toBeInTheDocument();
    });

    it('excludes markets without positive edge from positions', () => {
      // Market 2 has NO edge because est 10% < market 20% for YES
      // and est 90% > market 80% for NO... wait that's positive NO edge
      // Let me use a market where neither side has edge
      const noEdgeMarkets = [
        {
          marketId: 'market-1',
          question: 'No edge market',
          yesPrice: 0.5,
          estimatedProbability: 0.5,
        },
      ];

      render(<PortfolioKelly markets={noEdgeMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      expect(screen.getByText(/No markets with positive edge/)).toBeInTheDocument();
    });
  });

  describe('portfolio scaling', () => {
    it('shows scaled down indicator when total allocation exceeds 80%', () => {
      // Create markets with very high edges that would exceed 80% allocation
      const highEdgeMarkets = [
        {
          marketId: 'market-1',
          question: 'High edge 1',
          yesPrice: 0.1,
          estimatedProbability: 0.9,
        },
        {
          marketId: 'market-2',
          question: 'High edge 2',
          yesPrice: 0.1,
          estimatedProbability: 0.9,
        },
        {
          marketId: 'market-3',
          question: 'High edge 3',
          yesPrice: 0.1,
          estimatedProbability: 0.9,
        },
      ];

      mockKellyStore.multiplier = 1.0; // Full Kelly for high allocation
      mockKellyStore.maxPositionSize = 0.5; // High max to allow large positions

      render(<PortfolioKelly markets={highEdgeMarkets} />);

      expect(screen.getByText(/scaled down/)).toBeInTheDocument();
    });
  });

  describe('price normalization', () => {
    it('handles prices as percentages (>1)', () => {
      const percentageMarkets = [
        {
          marketId: 'market-1',
          question: 'Test market',
          yesPrice: 40, // 40% as integer
          estimatedProbability: 60, // 60% as integer
        },
      ];

      render(<PortfolioKelly markets={percentageMarkets} />);
      expect(screen.getByText(/1 of 1 markets with positive edge/)).toBeInTheDocument();
    });

    it('handles prices as decimals (<1)', () => {
      const decimalMarkets = [
        {
          marketId: 'market-1',
          question: 'Test market',
          yesPrice: 0.4,
          estimatedProbability: 0.6,
        },
      ];

      render(<PortfolioKelly markets={decimalMarkets} />);
      expect(screen.getByText(/1 of 1 markets with positive edge/)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts positions by edge in descending order', () => {
      const sortableMarkets = [
        {
          marketId: 'low-edge',
          question: 'Low edge market',
          yesPrice: 0.45,
          estimatedProbability: 0.55, // 10% edge
        },
        {
          marketId: 'high-edge',
          question: 'High edge market',
          yesPrice: 0.3,
          estimatedProbability: 0.7, // 40% edge
        },
      ];

      render(<PortfolioKelly markets={sortableMarkets} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      const rows = screen.getAllByText(/edge market/);
      // High edge should come first
      expect(rows[0]).toHaveTextContent('High edge market');
    });
  });

  describe('bankroll calculations', () => {
    it('calculates dollar amounts based on bankroll', () => {
      mockKellyStore.bankroll = 10000;

      const singleMarket = [
        {
          marketId: 'market-1',
          question: 'Test market',
          yesPrice: 0.4,
          estimatedProbability: 0.6,
        },
      ];

      render(<PortfolioKelly markets={singleMarket} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);

      // Should show dollar amounts - at least one amount element exists
      const dollarElements = screen.getAllByText(/\$\d+/);
      expect(dollarElements.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Kelly Components Integration', () => {
  it('KellyCalculator uses store multiplier', async () => {
    mockKellyStore.multiplier = 0.25; // Quarter Kelly
    mockKellyStore.autoExpandCalculator = true;
    mockKellyStore.bankroll = 1000;

    render(<KellyCalculator marketPrice={0.4} marketQuestion="Test market" />);

    const probabilityInput = screen.getByPlaceholderText('Market: 40.0%');
    fireEvent.change(probabilityInput, { target: { value: '60' } });

    // Quarter Kelly should produce smaller bet size than Half Kelly
    // Raw Kelly ≈ 33.3%, Quarter = 8.3%, Amount ≈ $83
    expect(screen.getByText(/\$83/)).toBeInTheDocument();
  });

  it('PortfolioKelly uses store maxPositionSize', () => {
    mockKellyStore.maxPositionSize = 0.1; // 10% max
    mockKellyStore.multiplier = 1.0; // Full Kelly
    mockKellyStore.bankroll = 1000;

    const highEdgeMarket = [
      {
        marketId: 'market-1',
        question: 'High edge market',
        yesPrice: 0.2,
        estimatedProbability: 0.8,
      },
    ];

    render(<PortfolioKelly markets={highEdgeMarket} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);

    // Full Kelly would suggest ~75%, but capped at 10% = $100
    // Multiple elements show $100 (row and total), verify at least one exists
    const dollarAmounts = screen.getAllByText('$100');
    expect(dollarAmounts.length).toBeGreaterThan(0);
  });
});
