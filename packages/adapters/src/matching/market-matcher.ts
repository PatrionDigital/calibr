/**
 * Market Matching Service
 * Matches similar markets across different prediction platforms
 */

import type { PlatformMarket, Platform, MarketCategory } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface MatchConfig {
  /** Minimum similarity score (0-1) to consider a match */
  minSimilarity: number;
  /** Weight for question text similarity */
  questionWeight: number;
  /** Weight for category match */
  categoryWeight: number;
  /** Weight for closing date proximity */
  closeDateWeight: number;
  /** Maximum days difference for close date matching */
  maxCloseDateDiffDays: number;
}

export interface MarketMatch {
  /** The source market */
  source: PlatformMarket;
  /** The matched market from another platform */
  match: PlatformMarket;
  /** Overall similarity score (0-1) */
  similarity: number;
  /** Breakdown of similarity scores */
  scores: {
    question: number;
    category: number;
    closeDate: number;
  };
}

export interface MatchResult {
  /** Markets that have matches on other platforms */
  matched: MarketMatch[];
  /** Markets without matches */
  unmatched: PlatformMarket[];
}

export interface ArbitrageOpportunity {
  /** Markets involved */
  markets: PlatformMarket[];
  /** Price spread between platforms */
  spread: number;
  /** Potential profit (assumes $100 position) */
  potentialProfit: number;
  /** Confidence in the match */
  matchConfidence: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: MatchConfig = {
  minSimilarity: 0.7,
  questionWeight: 0.6,
  categoryWeight: 0.2,
  closeDateWeight: 0.2,
  maxCloseDateDiffDays: 7,
};

// =============================================================================
// Market Matcher Service
// =============================================================================

export class MarketMatcher {
  private config: MatchConfig;

  constructor(config: Partial<MatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Find matching markets between two sets
   */
  findMatches(
    sourceMarkets: PlatformMarket[],
    targetMarkets: PlatformMarket[]
  ): MatchResult {
    const matched: MarketMatch[] = [];
    const unmatched: PlatformMarket[] = [];
    const usedTargetIds = new Set<string>();

    for (const source of sourceMarkets) {
      let bestMatch: MarketMatch | null = null;

      for (const target of targetMarkets) {
        // Skip if already matched or same platform
        if (usedTargetIds.has(target.id) || source.platform === target.platform) {
          continue;
        }

        const scores = this.calculateSimilarity(source, target);
        const similarity = this.computeWeightedScore(scores);

        if (similarity >= this.config.minSimilarity) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = {
              source,
              match: target,
              similarity,
              scores,
            };
          }
        }
      }

      if (bestMatch) {
        matched.push(bestMatch);
        usedTargetIds.add(bestMatch.match.id);
      } else {
        unmatched.push(source);
      }
    }

    return { matched, unmatched };
  }

  /**
   * Find all matches for a single market
   */
  findMatchesForMarket(
    market: PlatformMarket,
    candidates: PlatformMarket[],
    limit = 5
  ): MarketMatch[] {
    const matches: MarketMatch[] = [];

    for (const candidate of candidates) {
      if (market.platform === candidate.platform && market.id === candidate.id) {
        continue;
      }

      const scores = this.calculateSimilarity(market, candidate);
      const similarity = this.computeWeightedScore(scores);

      if (similarity >= this.config.minSimilarity) {
        matches.push({
          source: market,
          match: candidate,
          similarity,
          scores,
        });
      }
    }

    // Sort by similarity descending and return top matches
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find arbitrage opportunities between matched markets
   */
  findArbitrageOpportunities(
    matches: MarketMatch[],
    minSpread = 0.02
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const match of matches) {
      const { source, match: target, similarity } = match;

      // Need prices on both markets
      if (source.yesPrice === undefined || target.yesPrice === undefined) {
        continue;
      }

      const spread = Math.abs(source.yesPrice - target.yesPrice);

      if (spread >= minSpread) {
        // Potential profit calculation (simplified)
        // If you buy YES on lower price and sell on higher, profit = spread * position
        const potentialProfit = spread * 100; // Assuming $100 position

        opportunities.push({
          markets: [source, target],
          spread,
          potentialProfit,
          matchConfidence: similarity,
        });
      }
    }

    // Sort by potential profit descending
    return opportunities.sort((a, b) => b.potentialProfit - a.potentialProfit);
  }

  /**
   * Group markets by similarity clusters
   */
  clusterMarkets(
    markets: PlatformMarket[],
    minClusterSize = 2
  ): Map<string, PlatformMarket[]> {
    const clusters = new Map<string, PlatformMarket[]>();
    const assigned = new Set<string>();

    for (const market of markets) {
      if (assigned.has(market.id)) continue;

      const cluster: PlatformMarket[] = [market];
      assigned.add(market.id);

      // Find all similar markets
      for (const candidate of markets) {
        if (candidate.id === market.id || assigned.has(candidate.id)) continue;

        const scores = this.calculateSimilarity(market, candidate);
        const similarity = this.computeWeightedScore(scores);

        if (similarity >= this.config.minSimilarity) {
          cluster.push(candidate);
          assigned.add(candidate.id);
        }
      }

      // Only add clusters that meet minimum size
      if (cluster.length >= minClusterSize) {
        // Use the first market's question as cluster key
        const clusterKey = this.normalizeText(market.question).slice(0, 50);
        clusters.set(clusterKey, cluster);
      }
    }

    return clusters;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Calculate similarity scores between two markets
   */
  private calculateSimilarity(
    a: PlatformMarket,
    b: PlatformMarket
  ): { question: number; category: number; closeDate: number } {
    return {
      question: this.textSimilarity(a.question, b.question),
      category: this.categorySimilarity(a.category, b.category),
      closeDate: this.closeDateSimilarity(a.closesAt, b.closesAt),
    };
  }

  /**
   * Compute weighted score from individual scores
   */
  private computeWeightedScore(scores: {
    question: number;
    category: number;
    closeDate: number;
  }): number {
    return (
      scores.question * this.config.questionWeight +
      scores.category * this.config.categoryWeight +
      scores.closeDate * this.config.closeDateWeight
    );
  }

  /**
   * Calculate text similarity using Jaccard index on word sets
   */
  private textSimilarity(a: string, b: string): number {
    const wordsA = this.extractKeywords(a);
    const wordsB = this.extractKeywords(b);

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate category similarity
   */
  private categorySimilarity(
    a: MarketCategory | undefined,
    b: MarketCategory | undefined
  ): number {
    if (!a || !b) return 0.5; // Neutral if category unknown
    return a === b ? 1 : 0;
  }

  /**
   * Calculate closing date similarity
   */
  private closeDateSimilarity(a: Date | undefined, b: Date | undefined): number {
    if (!a || !b) return 0.5; // Neutral if dates unknown

    const diffMs = Math.abs(a.getTime() - b.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return 1;
    if (diffDays >= this.config.maxCloseDateDiffDays) return 0;

    return 1 - diffDays / this.config.maxCloseDateDiffDays;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): Set<string> {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter((w) => w.length > 2);
    return new Set(words.filter((w) => !STOP_WORDS.has(w)));
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// =============================================================================
// Stop Words
// =============================================================================

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom',
  'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'any', 'only', 'own',
  'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
]);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Group markets by platform
 */
export function groupByPlatform(
  markets: PlatformMarket[]
): Map<Platform, PlatformMarket[]> {
  const groups = new Map<Platform, PlatformMarket[]>();

  for (const market of markets) {
    const existing = groups.get(market.platform) || [];
    existing.push(market);
    groups.set(market.platform, existing);
  }

  return groups;
}

/**
 * Find the best price across platforms
 */
export function findBestPrice(
  markets: PlatformMarket[],
  side: 'yes' | 'no'
): { market: PlatformMarket; price: number } | null {
  let best: { market: PlatformMarket; price: number } | null = null;

  for (const market of markets) {
    const price = side === 'yes' ? market.yesPrice : market.noPrice;
    if (price === undefined) continue;

    // For YES, we want lowest price (cheapest to buy)
    // For NO, we also want lowest price
    if (!best || price < best.price) {
      best = { market, price };
    }
  }

  return best;
}

/**
 * Calculate aggregate liquidity across matched markets
 */
export function calculateAggregateLiquidity(markets: PlatformMarket[]): number {
  return markets.reduce((total, market) => total + (market.liquidity || 0), 0);
}
