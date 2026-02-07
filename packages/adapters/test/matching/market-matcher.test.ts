/**
 * Tests for Market Matching Service
 */

import { describe, it, expect } from 'vitest';
import {
  MarketMatcher,
  groupByPlatform,
  findBestPrice,
  calculateAggregateLiquidity,
  type MatchConfig,
} from '../../src/matching/market-matcher';
import type { PlatformMarket, Platform } from '../../src/types';

// =============================================================================
// Test Helpers
// =============================================================================

function createMockMarket(overrides: Partial<PlatformMarket> = {}): PlatformMarket {
  return {
    id: 'test-market-1',
    externalId: 'ext-1',
    platform: 'POLYMARKET' as Platform,
    question: 'Will Bitcoin reach $100k by end of 2024?',
    description: 'Test market description',
    category: 'CRYPTO',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-01'),
    closesAt: new Date('2024-12-31'),
    outcomes: [
      { id: 'yes', name: 'Yes', price: 0.5 },
      { id: 'no', name: 'No', price: 0.5 },
    ],
    volume: 10000,
    liquidity: 5000,
    yesPrice: 0.5,
    noPrice: 0.5,
    ...overrides,
  };
}

// =============================================================================
// MarketMatcher Tests
// =============================================================================

describe('MarketMatcher', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const matcher = new MarketMatcher();
      expect(matcher).toBeInstanceOf(MarketMatcher);
    });

    it('should accept custom config', () => {
      const config: Partial<MatchConfig> = {
        minSimilarity: 0.8,
        questionWeight: 0.7,
      };
      const matcher = new MarketMatcher(config);
      expect(matcher).toBeInstanceOf(MarketMatcher);
    });
  });

  describe('findMatches', () => {
    it('should find matching markets across platforms', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.5 });

      const sourceMarkets = [
        createMockMarket({
          id: 'poly-1',
          platform: 'POLYMARKET',
          question: 'Will Bitcoin reach $100k by 2024?',
          closesAt: new Date('2024-12-31'),
        }),
      ];

      const targetMarkets = [
        createMockMarket({
          id: 'limit-1',
          platform: 'LIMITLESS',
          question: 'Bitcoin to hit $100k before 2025?',
          closesAt: new Date('2024-12-31'),
        }),
      ];

      const result = matcher.findMatches(sourceMarkets, targetMarkets);

      expect(result.matched.length).toBe(1);
      expect(result.unmatched.length).toBe(0);
      expect(result.matched[0].source.platform).toBe('POLYMARKET');
      expect(result.matched[0].match.platform).toBe('LIMITLESS');
    });

    it('should not match markets from same platform', () => {
      const matcher = new MarketMatcher();

      const sourceMarkets = [
        createMockMarket({ id: 'poly-1', platform: 'POLYMARKET' }),
      ];

      const targetMarkets = [
        createMockMarket({ id: 'poly-2', platform: 'POLYMARKET' }),
      ];

      const result = matcher.findMatches(sourceMarkets, targetMarkets);

      expect(result.matched.length).toBe(0);
      expect(result.unmatched.length).toBe(1);
    });

    it('should return unmatched for low similarity', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.9 });

      const sourceMarkets = [
        createMockMarket({
          id: 'poly-1',
          platform: 'POLYMARKET',
          question: 'Will it rain tomorrow?',
        }),
      ];

      const targetMarkets = [
        createMockMarket({
          id: 'limit-1',
          platform: 'LIMITLESS',
          question: 'Will Bitcoin crash?',
        }),
      ];

      const result = matcher.findMatches(sourceMarkets, targetMarkets);

      expect(result.matched.length).toBe(0);
      expect(result.unmatched.length).toBe(1);
    });

    it('should select best match when multiple candidates exist', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.3 });

      const sourceMarkets = [
        createMockMarket({
          id: 'poly-1',
          platform: 'POLYMARKET',
          question: 'Will Bitcoin reach $100k by end of year?',
          category: 'CRYPTO',
          closesAt: new Date('2024-12-31'),
        }),
      ];

      const targetMarkets = [
        createMockMarket({
          id: 'limit-1',
          platform: 'LIMITLESS',
          question: 'Bitcoin price prediction: $100k?',
          category: 'CRYPTO',
          closesAt: new Date('2024-12-31'),
        }),
        createMockMarket({
          id: 'limit-2',
          platform: 'LIMITLESS',
          question: 'Weather tomorrow?',
          category: 'OTHER',
          closesAt: new Date('2024-06-01'),
        }),
      ];

      const result = matcher.findMatches(sourceMarkets, targetMarkets);

      expect(result.matched.length).toBe(1);
      expect(result.matched[0].match.id).toBe('limit-1');
    });

    it('should not reuse matched targets', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.3 });

      const sourceMarkets = [
        createMockMarket({
          id: 'poly-1',
          platform: 'POLYMARKET',
          question: 'Bitcoin to $100k?',
        }),
        createMockMarket({
          id: 'poly-2',
          platform: 'POLYMARKET',
          question: 'Bitcoin hits $100k?',
        }),
      ];

      const targetMarkets = [
        createMockMarket({
          id: 'limit-1',
          platform: 'LIMITLESS',
          question: 'Bitcoin reaches $100k?',
        }),
      ];

      const result = matcher.findMatches(sourceMarkets, targetMarkets);

      expect(result.matched.length).toBe(1);
      expect(result.unmatched.length).toBe(1);
    });

    it('should handle empty source markets', () => {
      const matcher = new MarketMatcher();
      const result = matcher.findMatches([], [createMockMarket()]);

      expect(result.matched.length).toBe(0);
      expect(result.unmatched.length).toBe(0);
    });

    it('should handle empty target markets', () => {
      const matcher = new MarketMatcher();
      const result = matcher.findMatches([createMockMarket()], []);

      expect(result.matched.length).toBe(0);
      expect(result.unmatched.length).toBe(1);
    });
  });

  describe('findMatchesForMarket', () => {
    it('should find matches for a single market', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.4 });

      const market = createMockMarket({
        id: 'source-1',
        platform: 'POLYMARKET',
        question: 'Will Ethereum reach $5k?',
        category: 'CRYPTO',
      });

      const candidates = [
        createMockMarket({
          id: 'candidate-1',
          platform: 'LIMITLESS',
          question: 'Ethereum to hit $5000?',
          category: 'CRYPTO',
        }),
        createMockMarket({
          id: 'candidate-2',
          platform: 'LIMITLESS',
          question: 'ETH price above $5k?',
          category: 'CRYPTO',
        }),
      ];

      const matches = matcher.findMatchesForMarket(market, candidates);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].source.id).toBe('source-1');
    });

    it('should limit results to specified count', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.2 });

      const market = createMockMarket({
        id: 'source-1',
        question: 'Bitcoin prediction',
        category: 'CRYPTO',
      });

      const candidates = Array.from({ length: 10 }, (_, i) =>
        createMockMarket({
          id: `candidate-${i}`,
          platform: 'LIMITLESS',
          question: `Bitcoin market ${i}`,
          category: 'CRYPTO',
        })
      );

      const matches = matcher.findMatchesForMarket(market, candidates, 3);

      expect(matches.length).toBeLessThanOrEqual(3);
    });

    it('should sort matches by similarity descending', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.2 });

      const market = createMockMarket({
        id: 'source-1',
        question: 'Will Bitcoin reach $100k by December 2024?',
        category: 'CRYPTO',
        closesAt: new Date('2024-12-31'),
      });

      const candidates = [
        createMockMarket({
          id: 'candidate-1',
          platform: 'LIMITLESS',
          question: 'Random market about something else',
          category: 'POLITICS',
        }),
        createMockMarket({
          id: 'candidate-2',
          platform: 'LIMITLESS',
          question: 'Bitcoin to $100k in December 2024?',
          category: 'CRYPTO',
          closesAt: new Date('2024-12-31'),
        }),
      ];

      const matches = matcher.findMatchesForMarket(market, candidates);

      if (matches.length > 1) {
        expect(matches[0].similarity).toBeGreaterThanOrEqual(matches[1].similarity);
      }
    });

    it('should not match market with itself', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.5 });

      const market = createMockMarket({
        id: 'source-1',
        platform: 'POLYMARKET',
        question: 'Test market',
      });

      const candidates = [
        market, // Same market
        createMockMarket({
          id: 'other-1',
          platform: 'LIMITLESS',
          question: 'Test market',
        }),
      ];

      const matches = matcher.findMatchesForMarket(market, candidates);

      expect(matches.every((m) => m.match.id !== 'source-1')).toBe(true);
    });
  });

  describe('findArbitrageOpportunities', () => {
    it('should find arbitrage when spread exceeds threshold', () => {
      const matcher = new MarketMatcher();

      const matches = [
        {
          source: createMockMarket({
            id: 'poly-1',
            platform: 'POLYMARKET',
            yesPrice: 0.45,
          }),
          match: createMockMarket({
            id: 'limit-1',
            platform: 'LIMITLESS',
            yesPrice: 0.55,
          }),
          similarity: 0.9,
          scores: { question: 0.9, category: 1, closeDate: 1 },
        },
      ];

      const opportunities = matcher.findArbitrageOpportunities(matches, 0.05);

      expect(opportunities.length).toBe(1);
      expect(opportunities[0].spread).toBeCloseTo(0.1, 2);
      expect(opportunities[0].potentialProfit).toBeCloseTo(10, 1);
    });

    it('should not include opportunities below min spread', () => {
      const matcher = new MarketMatcher();

      const matches = [
        {
          source: createMockMarket({
            id: 'poly-1',
            yesPrice: 0.50,
          }),
          match: createMockMarket({
            id: 'limit-1',
            yesPrice: 0.51,
          }),
          similarity: 0.9,
          scores: { question: 0.9, category: 1, closeDate: 1 },
        },
      ];

      const opportunities = matcher.findArbitrageOpportunities(matches, 0.05);

      expect(opportunities.length).toBe(0);
    });

    it('should skip markets without prices', () => {
      const matcher = new MarketMatcher();

      const matches = [
        {
          source: createMockMarket({
            id: 'poly-1',
            yesPrice: undefined,
          }),
          match: createMockMarket({
            id: 'limit-1',
            yesPrice: 0.55,
          }),
          similarity: 0.9,
          scores: { question: 0.9, category: 1, closeDate: 1 },
        },
      ];

      const opportunities = matcher.findArbitrageOpportunities(matches);

      expect(opportunities.length).toBe(0);
    });

    it('should sort opportunities by potential profit', () => {
      const matcher = new MarketMatcher();

      const matches = [
        {
          source: createMockMarket({ yesPrice: 0.40 }),
          match: createMockMarket({ yesPrice: 0.50 }),
          similarity: 0.9,
          scores: { question: 0.9, category: 1, closeDate: 1 },
        },
        {
          source: createMockMarket({ yesPrice: 0.30 }),
          match: createMockMarket({ yesPrice: 0.60 }),
          similarity: 0.9,
          scores: { question: 0.9, category: 1, closeDate: 1 },
        },
      ];

      const opportunities = matcher.findArbitrageOpportunities(matches, 0.05);

      expect(opportunities.length).toBe(2);
      expect(opportunities[0].potentialProfit).toBeGreaterThan(opportunities[1].potentialProfit);
    });

    it('should include match confidence in opportunity', () => {
      const matcher = new MarketMatcher();

      const matches = [
        {
          source: createMockMarket({ yesPrice: 0.40 }),
          match: createMockMarket({ yesPrice: 0.55 }),
          similarity: 0.85,
          scores: { question: 0.9, category: 1, closeDate: 0.5 },
        },
      ];

      const opportunities = matcher.findArbitrageOpportunities(matches, 0.05);

      expect(opportunities[0].matchConfidence).toBe(0.85);
    });
  });

  describe('clusterMarkets', () => {
    it('should group similar markets into clusters', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.4 });

      const markets = [
        createMockMarket({
          id: 'btc-1',
          question: 'Bitcoin to $100k?',
          category: 'CRYPTO',
        }),
        createMockMarket({
          id: 'btc-2',
          question: 'Will Bitcoin hit $100k?',
          category: 'CRYPTO',
        }),
        createMockMarket({
          id: 'eth-1',
          question: 'Ethereum to $5k?',
          category: 'CRYPTO',
        }),
      ];

      const clusters = matcher.clusterMarkets(markets, 2);

      expect(clusters.size).toBeGreaterThanOrEqual(1);
    });

    it('should respect minimum cluster size', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.9 });

      const markets = [
        createMockMarket({ id: '1', question: 'Unique market A' }),
        createMockMarket({ id: '2', question: 'Unique market B' }),
        createMockMarket({ id: '3', question: 'Unique market C' }),
      ];

      const clusters = matcher.clusterMarkets(markets, 2);

      // With high similarity threshold, no clusters should form
      for (const [, cluster] of clusters) {
        expect(cluster.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should not assign market to multiple clusters', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.3 });

      const markets = [
        createMockMarket({ id: '1', question: 'Bitcoin prediction' }),
        createMockMarket({ id: '2', question: 'Bitcoin forecast' }),
        createMockMarket({ id: '3', question: 'BTC prediction' }),
      ];

      const clusters = matcher.clusterMarkets(markets, 2);

      const allMarketIds = new Set<string>();
      for (const [, cluster] of clusters) {
        for (const market of cluster) {
          expect(allMarketIds.has(market.id)).toBe(false);
          allMarketIds.add(market.id);
        }
      }
    });

    it('should handle empty market list', () => {
      const matcher = new MarketMatcher();
      const clusters = matcher.clusterMarkets([]);

      expect(clusters.size).toBe(0);
    });
  });

  describe('similarity calculations', () => {
    it('should give high score for identical questions', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.1 });

      const market1 = createMockMarket({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Will Bitcoin reach $100k by 2024?',
      });

      const market2 = createMockMarket({
        id: '2',
        platform: 'LIMITLESS',
        question: 'Will Bitcoin reach $100k by 2024?',
      });

      const matches = matcher.findMatchesForMarket(market1, [market2]);

      expect(matches.length).toBe(1);
      expect(matches[0].scores.question).toBeGreaterThan(0.8);
    });

    it('should boost score for matching categories', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.1 });

      const market = createMockMarket({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Market question',
        category: 'CRYPTO',
      });

      const sameCategory = createMockMarket({
        id: '2',
        platform: 'LIMITLESS',
        question: 'Market question',
        category: 'CRYPTO',
      });

      const differentCategory = createMockMarket({
        id: '3',
        platform: 'LIMITLESS',
        question: 'Market question',
        category: 'POLITICS',
      });

      const matches = matcher.findMatchesForMarket(market, [sameCategory, differentCategory]);

      const sameCatMatch = matches.find((m) => m.match.id === '2');
      const diffCatMatch = matches.find((m) => m.match.id === '3');

      expect(sameCatMatch?.scores.category).toBe(1);
      expect(diffCatMatch?.scores.category).toBe(0);
    });

    it('should boost score for close closing dates', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.1 });

      const market = createMockMarket({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Test market',
        closesAt: new Date('2024-12-31'),
      });

      const sameDate = createMockMarket({
        id: '2',
        platform: 'LIMITLESS',
        question: 'Test market',
        closesAt: new Date('2024-12-31'),
      });

      const farDate = createMockMarket({
        id: '3',
        platform: 'LIMITLESS',
        question: 'Test market',
        closesAt: new Date('2025-06-30'),
      });

      const matches = matcher.findMatchesForMarket(market, [sameDate, farDate]);

      const sameDateMatch = matches.find((m) => m.match.id === '2');
      const farDateMatch = matches.find((m) => m.match.id === '3');

      expect(sameDateMatch?.scores.closeDate).toBe(1);
      expect(farDateMatch?.scores.closeDate).toBe(0);
    });

    it('should handle missing closing dates', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.1 });

      const market = createMockMarket({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Test market',
        closesAt: undefined,
      });

      const candidate = createMockMarket({
        id: '2',
        platform: 'LIMITLESS',
        question: 'Test market',
        closesAt: new Date('2024-12-31'),
      });

      const matches = matcher.findMatchesForMarket(market, [candidate]);

      expect(matches.length).toBe(1);
      expect(matches[0].scores.closeDate).toBe(0.5); // Neutral
    });

    it('should handle missing categories', () => {
      const matcher = new MarketMatcher({ minSimilarity: 0.1 });

      const market = createMockMarket({
        id: '1',
        platform: 'POLYMARKET',
        question: 'Test market',
        category: undefined,
      });

      const candidate = createMockMarket({
        id: '2',
        platform: 'LIMITLESS',
        question: 'Test market',
        category: 'CRYPTO',
      });

      const matches = matcher.findMatchesForMarket(market, [candidate]);

      expect(matches.length).toBe(1);
      expect(matches[0].scores.category).toBe(0.5); // Neutral
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('groupByPlatform', () => {
  it('should group markets by platform', () => {
    const markets = [
      createMockMarket({ id: '1', platform: 'POLYMARKET' }),
      createMockMarket({ id: '2', platform: 'POLYMARKET' }),
      createMockMarket({ id: '3', platform: 'LIMITLESS' }),
    ];

    const groups = groupByPlatform(markets);

    expect(groups.get('POLYMARKET')?.length).toBe(2);
    expect(groups.get('LIMITLESS')?.length).toBe(1);
  });

  it('should handle empty array', () => {
    const groups = groupByPlatform([]);
    expect(groups.size).toBe(0);
  });

  it('should handle single platform', () => {
    const markets = [
      createMockMarket({ id: '1', platform: 'POLYMARKET' }),
      createMockMarket({ id: '2', platform: 'POLYMARKET' }),
    ];

    const groups = groupByPlatform(markets);

    expect(groups.size).toBe(1);
    expect(groups.get('POLYMARKET')?.length).toBe(2);
  });
});

describe('findBestPrice', () => {
  it('should find lowest YES price', () => {
    const markets = [
      createMockMarket({ id: '1', yesPrice: 0.55 }),
      createMockMarket({ id: '2', yesPrice: 0.45 }),
      createMockMarket({ id: '3', yesPrice: 0.50 }),
    ];

    const result = findBestPrice(markets, 'yes');

    expect(result?.market.id).toBe('2');
    expect(result?.price).toBe(0.45);
  });

  it('should find lowest NO price', () => {
    const markets = [
      createMockMarket({ id: '1', noPrice: 0.55 }),
      createMockMarket({ id: '2', noPrice: 0.40 }),
      createMockMarket({ id: '3', noPrice: 0.50 }),
    ];

    const result = findBestPrice(markets, 'no');

    expect(result?.market.id).toBe('2');
    expect(result?.price).toBe(0.40);
  });

  it('should return null for empty array', () => {
    const result = findBestPrice([], 'yes');
    expect(result).toBeNull();
  });

  it('should skip markets without price', () => {
    const markets = [
      createMockMarket({ id: '1', yesPrice: undefined }),
      createMockMarket({ id: '2', yesPrice: 0.50 }),
    ];

    const result = findBestPrice(markets, 'yes');

    expect(result?.market.id).toBe('2');
  });

  it('should return null if all markets lack price', () => {
    const markets = [
      createMockMarket({ id: '1', yesPrice: undefined }),
      createMockMarket({ id: '2', yesPrice: undefined }),
    ];

    const result = findBestPrice(markets, 'yes');

    expect(result).toBeNull();
  });
});

describe('calculateAggregateLiquidity', () => {
  it('should sum liquidity across markets', () => {
    const markets = [
      createMockMarket({ id: '1', liquidity: 1000 }),
      createMockMarket({ id: '2', liquidity: 2000 }),
      createMockMarket({ id: '3', liquidity: 3000 }),
    ];

    const total = calculateAggregateLiquidity(markets);

    expect(total).toBe(6000);
  });

  it('should handle markets without liquidity', () => {
    const markets = [
      createMockMarket({ id: '1', liquidity: 1000 }),
      createMockMarket({ id: '2', liquidity: undefined }),
    ];

    const total = calculateAggregateLiquidity(markets);

    expect(total).toBe(1000);
  });

  it('should return 0 for empty array', () => {
    const total = calculateAggregateLiquidity([]);
    expect(total).toBe(0);
  });

  it('should handle all markets without liquidity', () => {
    const markets = [
      createMockMarket({ id: '1', liquidity: undefined }),
      createMockMarket({ id: '2', liquidity: undefined }),
    ];

    const total = calculateAggregateLiquidity(markets);

    expect(total).toBe(0);
  });
});
