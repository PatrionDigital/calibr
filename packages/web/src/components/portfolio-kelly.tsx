'use client';

import { useState, useMemo } from 'react';
import { useKellyStore } from '@/lib/stores/kelly-store';
import { Tooltip, InfoIcon, KELLY_TOOLTIPS } from './tooltip';

interface MarketEstimate {
  marketId: string;
  question: string;
  yesPrice: number;
  estimatedProbability: number;
}

interface PortfolioKellyProps {
  /** Markets with user's probability estimates */
  markets: MarketEstimate[];
}

interface PositionRecommendation {
  marketId: string;
  question: string;
  side: 'YES' | 'NO' | 'NONE';
  edge: number;
  rawKellyFraction: number;
  adjustedFraction: number;
  dollarAmount: number;
}

/**
 * Calculate Kelly for a single market
 */
function calculateSingleKelly(
  estimatedProbability: number,
  marketPrice: number,
  fractionMultiplier: number,
  maxPositionSize: number
): { side: 'YES' | 'NO' | 'NONE'; edge: number; rawKelly: number; adjustedKelly: number } {
  const yesEdge = estimatedProbability - marketPrice;
  const noPrice = 1 - marketPrice;
  const noEdge = (1 - estimatedProbability) - noPrice;

  let edge: number;
  let side: 'YES' | 'NO' | 'NONE';
  let effectivePrice: number;
  let effectiveProbability: number;

  if (yesEdge > noEdge && yesEdge > 0) {
    edge = yesEdge;
    side = 'YES';
    effectivePrice = marketPrice;
    effectiveProbability = estimatedProbability;
  } else if (noEdge > 0) {
    edge = noEdge;
    side = 'NO';
    effectivePrice = noPrice;
    effectiveProbability = 1 - estimatedProbability;
  } else {
    return { side: 'NONE', edge: Math.max(yesEdge, noEdge), rawKelly: 0, adjustedKelly: 0 };
  }

  const rawKelly = (effectiveProbability - effectivePrice) / (1 - effectivePrice);
  let adjustedKelly = rawKelly * fractionMultiplier;
  if (adjustedKelly > maxPositionSize) {
    adjustedKelly = maxPositionSize;
  }
  adjustedKelly = Math.max(0, adjustedKelly);

  return { side, edge, rawKelly, adjustedKelly };
}

export function PortfolioKelly({ markets }: PortfolioKellyProps) {
  const { multiplier, bankroll, maxPositionSize } = useKellyStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const portfolioResult = useMemo(() => {
    const positions: PositionRecommendation[] = markets.map((market) => {
      const normalizedPrice = market.yesPrice > 1 ? market.yesPrice / 100 : market.yesPrice;
      const normalizedProb = market.estimatedProbability > 1
        ? market.estimatedProbability / 100
        : market.estimatedProbability;

      const result = calculateSingleKelly(normalizedProb, normalizedPrice, multiplier, maxPositionSize);

      return {
        marketId: market.marketId,
        question: market.question,
        side: result.side,
        edge: result.edge,
        rawKellyFraction: result.rawKelly,
        adjustedFraction: result.adjustedKelly,
        dollarAmount: result.adjustedKelly * bankroll,
      };
    });

    // Filter to positive edge positions
    const positivePositions = positions.filter(p => p.side !== 'NONE' && p.adjustedFraction > 0);

    // Calculate total allocation
    const totalAllocation = positivePositions.reduce((sum, p) => sum + p.adjustedFraction, 0);

    // Scale down if over-allocated
    const maxTotalAllocation = 0.8;
    const wasScaled = totalAllocation > maxTotalAllocation;
    const scaleFactor = wasScaled ? maxTotalAllocation / totalAllocation : 1.0;

    // Apply scaling
    const scaledPositions = positions.map(p => {
      if (p.side === 'NONE' || p.adjustedFraction <= 0) return p;
      const scaledFraction = p.adjustedFraction * scaleFactor;
      return {
        ...p,
        adjustedFraction: scaledFraction,
        dollarAmount: scaledFraction * bankroll,
      };
    });

    const finalTotalAllocation = scaledPositions
      .filter(p => p.side !== 'NONE')
      .reduce((sum, p) => sum + p.adjustedFraction, 0);

    const totalDollarAmount = scaledPositions
      .filter(p => p.side !== 'NONE')
      .reduce((sum, p) => sum + p.dollarAmount, 0);

    return {
      positions: scaledPositions,
      positiveEdgeCount: positivePositions.length,
      totalAllocation: finalTotalAllocation,
      totalDollarAmount,
      wasScaled,
      scaleFactor,
    };
  }, [markets, multiplier, bankroll, maxPositionSize]);

  if (markets.length === 0) {
    return null;
  }

  const { positions, positiveEdgeCount, totalAllocation, totalDollarAmount, wasScaled } = portfolioResult;
  const positiveEdgePositions = positions.filter(p => p.side !== 'NONE' && p.adjustedFraction > 0);

  return (
    <div className="ascii-box p-4 border-[hsl(var(--success))]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-sm font-bold text-[hsl(var(--success))]">
          [PORTFOLIO KELLY OPTIMIZATION]
          <Tooltip content={KELLY_TOOLTIPS.portfolioKelly}>
            <InfoIcon />
          </Tooltip>
        </h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {isExpanded ? '[-]' : '[+]'}
        </span>
      </button>

      {/* Summary always visible */}
      <div className="mt-2 text-sm">
        <span className="text-[hsl(var(--muted-foreground))]">
          {positiveEdgeCount} of {markets.length} markets with positive edge
        </span>
        {positiveEdgeCount > 0 && (
          <span className="ml-2 text-[hsl(var(--success))]">
            | Total: ${totalDollarAmount.toFixed(0)} ({(totalAllocation * 100).toFixed(1)}%)
          </span>
        )}
        {wasScaled && (
          <span className="ml-2 text-[hsl(var(--warning))] text-xs">
            (scaled down)
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {positiveEdgePositions.length === 0 ? (
            <div className="text-center text-[hsl(var(--muted-foreground))] text-sm py-4">
              No markets with positive edge based on your estimates.
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-xs text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))] pb-2">
                <div className="col-span-6">MARKET</div>
                <div className="col-span-2 text-center">SIDE</div>
                <div className="col-span-2 text-right">EDGE</div>
                <div className="col-span-2 text-right">AMOUNT</div>
              </div>

              {/* Positions sorted by edge */}
              {positiveEdgePositions
                .sort((a, b) => b.edge - a.edge)
                .map((position) => (
                  <div
                    key={position.marketId}
                    className="grid grid-cols-12 gap-2 text-sm items-center"
                  >
                    <div className="col-span-6 truncate" title={position.question}>
                      {position.question}
                    </div>
                    <div className={`col-span-2 text-center font-bold ${
                      position.side === 'YES'
                        ? 'text-[hsl(var(--bullish))]'
                        : 'text-[hsl(var(--bearish))]'
                    }`}>
                      {position.side}
                    </div>
                    <div className="col-span-2 text-right text-[hsl(var(--primary))]">
                      +{(position.edge * 100).toFixed(1)}%
                    </div>
                    <div className="col-span-2 text-right font-mono">
                      ${position.dollarAmount.toFixed(0)}
                    </div>
                  </div>
                ))}

              {/* Total */}
              <div className="grid grid-cols-12 gap-2 text-sm border-t border-[hsl(var(--border))] pt-2 font-bold">
                <div className="col-span-6">TOTAL ALLOCATION</div>
                <div className="col-span-2"></div>
                <div className="col-span-2 text-right text-[hsl(var(--primary))]">
                  {(totalAllocation * 100).toFixed(1)}%
                </div>
                <div className="col-span-2 text-right font-mono terminal-glow">
                  ${totalDollarAmount.toFixed(0)}
                </div>
              </div>

              {/* Remaining bankroll */}
              <div className="text-xs text-[hsl(var(--muted-foreground))] text-right">
                Remaining: ${(bankroll - totalDollarAmount).toFixed(0)} ({((1 - totalAllocation) * 100).toFixed(1)}%)
              </div>
            </>
          )}

          {/* Warning */}
          <div className="text-xs text-[hsl(var(--warning))] mt-4 pt-4 border-t border-[hsl(var(--border))]">
            Portfolio Kelly assumes independent markets. Correlated outcomes may require further adjustment.
            This is not financial advice.
          </div>
        </div>
      )}
    </div>
  );
}
