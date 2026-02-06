/**
 * MarketCard Component Tests
 *
 * Tests for the market card component that displays:
 * - Platform badges
 * - Market question and status
 * - Binary and multi-outcome prices
 * - Volume, liquidity, spread stats
 * - Category and close date
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketCard } from '@/components/market-card';
import type { UnifiedMarket } from '@/lib/api';

// =============================================================================
// Mocks
// =============================================================================

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className} data-testid="market-link">
      {children}
    </a>
  ),
}));

// =============================================================================
// Test Setup
// =============================================================================

const baseBinaryMarket: UnifiedMarket = {
  id: 'test-market-123',
  slug: 'test-market-slug',
  question: 'Will Bitcoin reach $100,000 by end of year?',
  description: 'Test market description',
  category: 'Crypto',
  bestYesPrice: 0.65,
  bestNoPrice: 0.35,
  bestYesPlatform: 'LIMITLESS',
  bestNoPlatform: 'LIMITLESS',
  totalVolume: 150000,
  totalLiquidity: 50000,
  currentSpread: 0.02,
  isActive: true,
  closesAt: '2025-12-31T23:59:59Z',
  resolvedAt: null,
  resolution: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  platformMarkets: [
    {
      id: 'pm-1',
      externalId: 'ext-1',
      url: 'https://example.com',
      yesPrice: 0.65,
      noPrice: 0.35,
      volume: 150000,
      liquidity: 50000,
      isActive: true,
      closesAt: '2025-12-31T23:59:59Z',
      resolvedAt: null,
      resolution: null,
      platformConfig: {
        name: 'Limitless',
        slug: 'LIMITLESS',
      },
    },
  ],
};

const multiOutcomeMarket: UnifiedMarket = {
  ...baseBinaryMarket,
  id: 'multi-market-123',
  slug: 'multi-market-slug',
  question: 'Who will win the 2024 election?',
  platformMarkets: [
    {
      id: 'pm-1',
      externalId: 'ext-1',
      url: 'https://example.com',
      yesPrice: null,
      noPrice: null,
      volume: 500000,
      liquidity: 100000,
      isActive: true,
      closesAt: '2024-11-05T23:59:59Z',
      resolvedAt: null,
      resolution: null,
      platformConfig: {
        name: 'Polymarket',
        slug: 'POLYMARKET',
      },
      platformData: {
        marketType: 'MULTIPLE_CHOICE',
        outcomes: [
          { index: 0, label: 'Candidate A', price: 0.45 },
          { index: 1, label: 'Candidate B', price: 0.35 },
          { index: 2, label: 'Candidate C', price: 0.15 },
          { index: 3, label: 'Other', price: 0.05 },
        ],
      },
    },
  ],
};

const resolvedMarket: UnifiedMarket = {
  ...baseBinaryMarket,
  isActive: false,
  resolvedAt: '2024-11-30T12:00:00Z',
  resolution: 'YES',
};

const closedMarket: UnifiedMarket = {
  ...baseBinaryMarket,
  isActive: false,
  resolvedAt: null,
  resolution: null,
};

// =============================================================================
// Tests
// =============================================================================

describe('MarketCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the market question', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText('Will Bitcoin reach $100,000 by end of year?')).toBeInTheDocument();
    });

    it('renders as a link when no onClick provided', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      const link = screen.getByTestId('market-link');
      expect(link).toHaveAttribute('href', '/markets/test-market-slug');
    });

    it('renders as clickable div when onClick provided', () => {
      const onClick = vi.fn();
      render(<MarketCard market={baseBinaryMarket} onClick={onClick} />);
      expect(screen.queryByTestId('market-link')).not.toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<MarketCard market={baseBinaryMarket} onClick={onClick} />);
      const card = screen.getByText('Will Bitcoin reach $100,000 by end of year?').closest('div');
      fireEvent.click(card!);
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('platform badges', () => {
    it('renders LIMITLESS badge', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/🔵/)).toBeInTheDocument();
      expect(screen.getByText(/LM/)).toBeInTheDocument();
    });

    it('renders POLYMARKET badge', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      expect(screen.getByText(/🟣/)).toBeInTheDocument();
      expect(screen.getByText(/PM/)).toBeInTheDocument();
    });

    it('renders multiple platform badges', () => {
      const market = {
        ...baseBinaryMarket,
        platformMarkets: [
          { ...baseBinaryMarket.platformMarkets![0], platformConfig: { name: 'Limitless', slug: 'LIMITLESS' } },
          { ...baseBinaryMarket.platformMarkets![0], id: 'pm-2', platformConfig: { name: 'Polymarket', slug: 'POLYMARKET' } },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText(/🔵/)).toBeInTheDocument();
      expect(screen.getByText(/🟣/)).toBeInTheDocument();
    });

    it('does not render badges for unknown platforms', () => {
      const market = {
        ...baseBinaryMarket,
        platformMarkets: [
          { ...baseBinaryMarket.platformMarkets![0], platformConfig: { name: 'Unknown', slug: 'UNKNOWN' } },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.queryByText(/🔵/)).not.toBeInTheDocument();
    });

    it('handles missing platformMarkets gracefully', () => {
      const market = { ...baseBinaryMarket, platformMarkets: undefined };
      render(<MarketCard market={market} />);
      expect(screen.getByText('Will Bitcoin reach $100,000 by end of year?')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('shows ACTIVE status for active markets', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText('[ACTIVE]')).toBeInTheDocument();
    });

    it('shows RESOLVED status with resolution', () => {
      render(<MarketCard market={resolvedMarket} />);
      expect(screen.getByText('[RESOLVED: YES]')).toBeInTheDocument();
    });

    it('shows CLOSED status for closed markets', () => {
      render(<MarketCard market={closedMarket} />);
      expect(screen.getByText('[CLOSED]')).toBeInTheDocument();
    });

    it('shows RESOLVED: UNKNOWN when resolution is null but resolvedAt exists', () => {
      const market = { ...resolvedMarket, resolution: null };
      render(<MarketCard market={market} />);
      expect(screen.getByText('[RESOLVED: UNKNOWN]')).toBeInTheDocument();
    });
  });

  describe('binary market display', () => {
    it('renders YES and NO labels', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText('YES')).toBeInTheDocument();
      expect(screen.getByText('NO')).toBeInTheDocument();
    });

    it('renders YES price correctly', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText('65.0')).toBeInTheDocument();
    });

    it('renders NO price correctly', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText('35.0')).toBeInTheDocument();
    });

    it('handles prices in 0-100 range', () => {
      const market = { ...baseBinaryMarket, bestYesPrice: 65, bestNoPrice: 35 };
      render(<MarketCard market={market} />);
      expect(screen.getByText('65.0')).toBeInTheDocument();
      expect(screen.getByText('35.0')).toBeInTheDocument();
    });

    it('handles null prices with default 50%', () => {
      const market = { ...baseBinaryMarket, bestYesPrice: null, bestNoPrice: null };
      render(<MarketCard market={market} />);
      expect(screen.getAllByText('50.0')).toHaveLength(2);
    });

    it('renders spread for binary markets', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/SPREAD:/)).toBeInTheDocument();
      expect(screen.getByText(/2\.0%/)).toBeInTheDocument();
    });
  });

  describe('multi-outcome market display', () => {
    it('renders all outcome labels', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      expect(screen.getByText('Candidate A')).toBeInTheDocument();
      expect(screen.getByText('Candidate B')).toBeInTheDocument();
      expect(screen.getByText('Candidate C')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('renders outcome prices correctly', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      expect(screen.getByText('45.0%')).toBeInTheDocument();
      expect(screen.getByText('35.0%')).toBeInTheDocument();
      expect(screen.getByText('15.0%')).toBeInTheDocument();
      expect(screen.getByText('5.0%')).toBeInTheDocument();
    });

    it('sorts outcomes by price descending', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      const outcomes = screen.getAllByText(/(Candidate|Other)/);
      expect(outcomes[0]).toHaveTextContent('Candidate A'); // 45%
      expect(outcomes[1]).toHaveTextContent('Candidate B'); // 35%
    });

    it('shows multi-outcome indicator', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      expect(screen.getByText('[MULTI-OUTCOME: 4 choices]')).toBeInTheDocument();
    });

    it('does not show spread for multi-outcome markets', () => {
      render(<MarketCard market={multiOutcomeMarket} />);
      expect(screen.queryByText(/SPREAD:/)).not.toBeInTheDocument();
    });

    it('limits displayed outcomes to 5 and shows count', () => {
      const market = {
        ...multiOutcomeMarket,
        platformMarkets: [
          {
            ...multiOutcomeMarket.platformMarkets![0],
            platformData: {
              marketType: 'MULTIPLE_CHOICE',
              outcomes: [
                { index: 0, label: 'Option 1', price: 0.25 },
                { index: 1, label: 'Option 2', price: 0.20 },
                { index: 2, label: 'Option 3', price: 0.18 },
                { index: 3, label: 'Option 4', price: 0.15 },
                { index: 4, label: 'Option 5', price: 0.12 },
                { index: 5, label: 'Option 6', price: 0.05 },
                { index: 6, label: 'Option 7', price: 0.05 },
              ],
            },
          },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText('+2 more outcomes')).toBeInTheDocument();
    });

    it('shows fallback message when no outcomes data', () => {
      const market = {
        ...multiOutcomeMarket,
        platformMarkets: [
          {
            ...multiOutcomeMarket.platformMarkets![0],
            platformData: {
              marketType: 'MULTIPLE_CHOICE',
              outcomes: [],
            },
          },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText('Multi-outcome market (click for details)')).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('renders volume', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/VOL:/)).toBeInTheDocument();
      expect(screen.getByText('$150.0K')).toBeInTheDocument();
    });

    it('renders liquidity', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/LIQ:/)).toBeInTheDocument();
      expect(screen.getByText('$50.0K')).toBeInTheDocument();
    });

    it('formats volume in millions', () => {
      const market = { ...baseBinaryMarket, totalVolume: 2500000 };
      render(<MarketCard market={market} />);
      expect(screen.getByText('$2.5M')).toBeInTheDocument();
    });

    it('formats small volume without suffix', () => {
      const market = { ...baseBinaryMarket, totalVolume: 500 };
      render(<MarketCard market={market} />);
      expect(screen.getByText('$500')).toBeInTheDocument();
    });

    it('renders category when present', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/CAT:/)).toBeInTheDocument();
      expect(screen.getByText('Crypto')).toBeInTheDocument();
    });

    it('does not render category when null', () => {
      const market = { ...baseBinaryMarket, category: null };
      render(<MarketCard market={market} />);
      expect(screen.queryByText(/CAT:/)).not.toBeInTheDocument();
    });
  });

  describe('close date display', () => {
    it('renders close date when present', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      expect(screen.getByText(/Closes:/)).toBeInTheDocument();
    });

    it('does not render close date when null', () => {
      const market = { ...baseBinaryMarket, closesAt: null };
      render(<MarketCard market={market} />);
      expect(screen.queryByText(/Closes:/)).not.toBeInTheDocument();
    });
  });

  describe('price normalization', () => {
    it('normalizes spread in percentage format', () => {
      const market = { ...baseBinaryMarket, currentSpread: 5 }; // 5%
      render(<MarketCard market={market} />);
      expect(screen.getByText(/5\.0%/)).toBeInTheDocument();
    });

    it('handles null spread', () => {
      const market = { ...baseBinaryMarket, currentSpread: null };
      render(<MarketCard market={market} />);
      expect(screen.getByText(/SPREAD:/)).toBeInTheDocument();
      expect(screen.getByText(/--%/)).toBeInTheDocument();
    });
  });

  describe('market type detection', () => {
    it('detects binary market from YES/NO outcomes', () => {
      const market = {
        ...baseBinaryMarket,
        platformMarkets: [
          {
            ...baseBinaryMarket.platformMarkets![0],
            platformData: {
              outcomes: [
                { index: 0, label: 'Yes', price: 0.65 },
                { index: 1, label: 'No', price: 0.35 },
              ],
            },
          },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText('YES')).toBeInTheDocument();
      expect(screen.getByText('NO')).toBeInTheDocument();
      expect(screen.queryByText(/MULTI-OUTCOME/)).not.toBeInTheDocument();
    });

    it('detects multi-outcome from marketType', () => {
      const market = {
        ...baseBinaryMarket,
        platformMarkets: [
          {
            ...baseBinaryMarket.platformMarkets![0],
            platformData: {
              marketType: 'MULTIPLE_CHOICE',
            },
          },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText('Multi-outcome market (click for details)')).toBeInTheDocument();
    });

    it('treats 2 non-YES/NO outcomes as multi-outcome', () => {
      const market = {
        ...baseBinaryMarket,
        platformMarkets: [
          {
            ...baseBinaryMarket.platformMarkets![0],
            platformData: {
              outcomes: [
                { index: 0, label: 'Team A', price: 0.55 },
                { index: 1, label: 'Team B', price: 0.45 },
              ],
            },
          },
        ],
      } as UnifiedMarket;
      render(<MarketCard market={market} />);
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
      expect(screen.getByText('[MULTI-OUTCOME: 2 choices]')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('link has proper href', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      const link = screen.getByTestId('market-link');
      expect(link).toHaveAttribute('href', '/markets/test-market-slug');
    });

    it('platform badge has title attribute', () => {
      render(<MarketCard market={baseBinaryMarket} />);
      const badge = screen.getByText(/🔵/).closest('span');
      expect(badge).toHaveAttribute('title', 'LIMITLESS');
    });
  });
});
