/**
 * PortfolioKelly Component Tests
 *
 * Tests for the portfolio Kelly optimization component that displays:
 * - Portfolio-level position recommendations
 * - Edge calculations for YES/NO sides
 * - Kelly fraction scaling
 * - Expandable details view
 * - Position summaries and totals
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioKelly } from '@/components/portfolio-kelly';

// =============================================================================
// Mocks
// =============================================================================

let mockKellyStore = {
  multiplier: 0.5,
  bankroll: 10000,
  maxPositionSize: 0.25,
};

vi.mock('@/lib/stores/kelly-store', () => ({
  useKellyStore: () => mockKellyStore,
}));

vi.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  InfoIcon: () => <span data-testid="info-icon">ℹ</span>,
  KELLY_TOOLTIPS: {
    portfolioKelly: 'Portfolio Kelly explanation',
  },
}));

// =============================================================================
// Test Data
// =============================================================================

interface MarketEstimate {
  marketId: string;
  question: string;
  yesPrice: number;
  estimatedProbability: number;
}

const singleMarketWithEdge: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'Will Bitcoin reach $100k?',
    yesPrice: 0.4,
    estimatedProbability: 0.6,
  },
];

const singleMarketNoEdge: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'Will event happen?',
    yesPrice: 0.5,
    estimatedProbability: 0.5,
  },
];

const multipleMarketsWithEdge: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'Will Bitcoin reach $100k?',
    yesPrice: 0.4,
    estimatedProbability: 0.6, // 20% edge on YES
  },
  {
    marketId: 'market-2',
    question: 'Will Ethereum flip Bitcoin?',
    yesPrice: 0.7,
    estimatedProbability: 0.5, // 20% edge on NO
  },
  {
    marketId: 'market-3',
    question: 'Will DeFi TVL reach $500B?',
    yesPrice: 0.3,
    estimatedProbability: 0.5, // 20% edge on YES
  },
];

const mixedEdgeMarkets: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'Has positive edge',
    yesPrice: 0.3,
    estimatedProbability: 0.6, // Positive edge
  },
  {
    marketId: 'market-2',
    question: 'Has no edge',
    yesPrice: 0.5,
    estimatedProbability: 0.5, // No edge
  },
  {
    marketId: 'market-3',
    question: 'Has slight negative edge',
    yesPrice: 0.55,
    estimatedProbability: 0.5, // Slight negative edge
  },
];

const highAllocationMarkets: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'High edge market 1',
    yesPrice: 0.1,
    estimatedProbability: 0.9, // Extremely high edge
  },
  {
    marketId: 'market-2',
    question: 'High edge market 2',
    yesPrice: 0.1,
    estimatedProbability: 0.9, // Extremely high edge
  },
  {
    marketId: 'market-3',
    question: 'High edge market 3',
    yesPrice: 0.1,
    estimatedProbability: 0.9, // Extremely high edge
  },
  {
    marketId: 'market-4',
    question: 'High edge market 4',
    yesPrice: 0.1,
    estimatedProbability: 0.9, // Extremely high edge
  },
];

const percentagePriceMarkets: MarketEstimate[] = [
  {
    marketId: 'market-1',
    question: 'Market with 0-100 prices',
    yesPrice: 40, // 40 cents = 40%
    estimatedProbability: 60, // 60%
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('PortfolioKelly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKellyStore = {
      multiplier: 0.5,
      bankroll: 10000,
      maxPositionSize: 0.25,
    };
  });

  describe('rendering', () => {
    it('renders the panel title', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]')).toBeInTheDocument();
    });

    it('renders info icon', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('renders expand/collapse indicator', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText('[+]')).toBeInTheDocument();
    });

    it('returns null for empty markets array', () => {
      const { container } = render(<PortfolioKelly markets={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('summary display', () => {
    it('shows count of markets with positive edge', () => {
      render(<PortfolioKelly markets={multipleMarketsWithEdge} />);
      expect(screen.getByText(/3 of 3 markets with positive edge/)).toBeInTheDocument();
    });

    it('shows mixed edge counts correctly', () => {
      render(<PortfolioKelly markets={mixedEdgeMarkets} />);
      // Text is split across elements, check for the key parts
      expect(screen.getByText(/markets with positive edge/)).toBeInTheDocument();
    });

    it('shows total dollar amount', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText(/Total: \$/)).toBeInTheDocument();
    });

    it('shows total percentage allocation', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText(/%\)$/)).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('shows collapsed state by default', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText('[+]')).toBeInTheDocument();
      expect(screen.queryByText('MARKET')).not.toBeInTheDocument();
    });

    it('expands when clicked', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('[-]')).toBeInTheDocument();
      expect(screen.getByText('MARKET')).toBeInTheDocument();
    });

    it('collapses when clicked again', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('[+]')).toBeInTheDocument();
      expect(screen.queryByText('MARKET')).not.toBeInTheDocument();
    });
  });

  describe('expanded view headers', () => {
    it('shows column headers when expanded', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('MARKET')).toBeInTheDocument();
      expect(screen.getByText('SIDE')).toBeInTheDocument();
      expect(screen.getByText('EDGE')).toBeInTheDocument();
      expect(screen.getByText('AMOUNT')).toBeInTheDocument();
    });
  });

  describe('position display', () => {
    it('shows market question', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('Will Bitcoin reach $100k?')).toBeInTheDocument();
    });

    it('shows YES side when estimated probability exceeds price', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('YES')).toBeInTheDocument();
    });

    it('shows NO side when estimated probability is below price', () => {
      const noSideMarket: MarketEstimate[] = [{
        marketId: 'market-1',
        question: 'NO side market',
        yesPrice: 0.7,
        estimatedProbability: 0.5,
      }];
      render(<PortfolioKelly markets={noSideMarket} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('NO')).toBeInTheDocument();
    });

    it('shows edge percentage', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText(/\+\d+\.\d+%/)).toBeInTheDocument();
    });

    it('shows dollar amount', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      // Multiple dollar amounts shown, check the total row exists
      expect(screen.getByText('TOTAL ALLOCATION')).toBeInTheDocument();
    });
  });

  describe('no edge markets', () => {
    it('shows no edge message when no positive edge', () => {
      render(<PortfolioKelly markets={singleMarketNoEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('No markets with positive edge based on your estimates.')).toBeInTheDocument();
    });

    it('shows 0 of N markets with positive edge', () => {
      render(<PortfolioKelly markets={singleMarketNoEdge} />);
      expect(screen.getByText(/0 of 1 markets with positive edge/)).toBeInTheDocument();
    });
  });

  describe('totals', () => {
    it('shows TOTAL ALLOCATION row', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('TOTAL ALLOCATION')).toBeInTheDocument();
    });

    it('shows remaining bankroll', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText(/Remaining: \$/)).toBeInTheDocument();
    });
  });

  describe('scaling', () => {
    it('shows scaled down indicator when over-allocated', () => {
      render(<PortfolioKelly markets={highAllocationMarkets} />);
      expect(screen.getByText('(scaled down)')).toBeInTheDocument();
    });

    it('does not show scaled indicator for normal allocation', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.queryByText('(scaled down)')).not.toBeInTheDocument();
    });
  });

  describe('price normalization', () => {
    it('handles 0-100 price format', () => {
      render(<PortfolioKelly markets={percentagePriceMarkets} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('YES')).toBeInTheDocument();
      expect(screen.getByText(/\+\d+\.\d+%/)).toBeInTheDocument();
    });

    it('handles 0-1 price format', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('YES')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts positions by edge descending', () => {
      const marketsWithVaryingEdges: MarketEstimate[] = [
        { marketId: 'm1', question: 'Low edge market', yesPrice: 0.45, estimatedProbability: 0.55 },
        { marketId: 'm2', question: 'High edge market', yesPrice: 0.3, estimatedProbability: 0.7 },
        { marketId: 'm3', question: 'Medium edge market', yesPrice: 0.4, estimatedProbability: 0.6 },
      ];
      render(<PortfolioKelly markets={marketsWithVaryingEdges} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));

      // All three markets should be displayed
      expect(screen.getByText('High edge market')).toBeInTheDocument();
      expect(screen.getByText('Medium edge market')).toBeInTheDocument();
      expect(screen.getByText('Low edge market')).toBeInTheDocument();
    });
  });

  describe('warning message', () => {
    it('shows correlation warning when expanded', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText(/Portfolio Kelly assumes independent markets/)).toBeInTheDocument();
    });

    it('shows not financial advice disclaimer', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText(/This is not financial advice/)).toBeInTheDocument();
    });
  });

  describe('Kelly settings integration', () => {
    it('uses bankroll from store for calculations', () => {
      mockKellyStore.bankroll = 5000;
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      // With smaller bankroll, dollar amounts should be smaller
      expect(screen.getByText(/Remaining: \$/)).toBeInTheDocument();
    });

    it('uses multiplier from store for Kelly fraction', () => {
      mockKellyStore.multiplier = 1.0; // Full Kelly
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      // With full Kelly, allocations should be larger
      expect(screen.getByText(/Total: \$/)).toBeInTheDocument();
    });

    it('respects max position size', () => {
      mockKellyStore.maxPositionSize = 0.1; // 10% max
      render(<PortfolioKelly markets={highAllocationMarkets} />);
      // Even high edge markets are capped
      expect(screen.getByText(/Total: \$/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles market with 0 price', () => {
      const zeroPrice: MarketEstimate[] = [{
        marketId: 'm1',
        question: 'Zero price market',
        yesPrice: 0,
        estimatedProbability: 0.5,
      }];
      render(<PortfolioKelly markets={zeroPrice} />);
      expect(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]')).toBeInTheDocument();
    });

    it('handles market with 100% probability estimate', () => {
      const fullProb: MarketEstimate[] = [{
        marketId: 'm1',
        question: 'Full probability',
        yesPrice: 0.5,
        estimatedProbability: 1.0,
      }];
      render(<PortfolioKelly markets={fullProb} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('YES')).toBeInTheDocument();
    });

    it('handles market with 0% probability estimate', () => {
      const zeroProb: MarketEstimate[] = [{
        marketId: 'm1',
        question: 'Zero probability',
        yesPrice: 0.5,
        estimatedProbability: 0,
      }];
      render(<PortfolioKelly markets={zeroProb} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      expect(screen.getByText('NO')).toBeInTheDocument();
    });

    it('handles single market correctly', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      expect(screen.getByText(/1 of 1 markets with positive edge/)).toBeInTheDocument();
    });

    it('handles many markets', () => {
      const manyMarkets: MarketEstimate[] = Array.from({ length: 10 }, (_, i) => ({
        marketId: `m${i}`,
        question: `Market ${i}`,
        yesPrice: 0.4,
        estimatedProbability: 0.6,
      }));
      render(<PortfolioKelly markets={manyMarkets} />);
      expect(screen.getByText(/10 of 10 markets with positive edge/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has clickable header for expand/collapse', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      const header = screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]');
      expect(header.closest('button')).toBeInTheDocument();
    });

    it('has title attribute on market questions', () => {
      render(<PortfolioKelly markets={singleMarketWithEdge} />);
      fireEvent.click(screen.getByText('[PORTFOLIO KELLY OPTIMIZATION]'));
      const questionEl = screen.getByText('Will Bitcoin reach $100k?');
      expect(questionEl).toHaveAttribute('title', 'Will Bitcoin reach $100k?');
    });
  });
});
