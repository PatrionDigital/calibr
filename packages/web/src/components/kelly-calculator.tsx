'use client';

import { useState, useMemo, useEffect } from 'react';
import { useKellyStore, MULTIPLIER_PRESETS } from '@/lib/stores/kelly-store';
import { Tooltip, InfoIcon, KELLY_TOOLTIPS } from './tooltip';

interface KellyCalculatorProps {
  marketPrice: number;
  marketQuestion: string;
}

interface KellyResult {
  recommendedFraction: number;
  edge: number;
  edgePercentage: number;
  hasPositiveEdge: boolean;
  expectedValue: number;
  recommendedSide: 'YES' | 'NO' | 'NONE';
  wasCapped: boolean;
}

/**
 * Calculate Kelly Criterion for a binary market
 */
function calculateKelly(
  estimatedProbability: number,
  marketPrice: number,
  fractionMultiplier: number = 0.5,
  maxPositionSize: number = 0.25
): KellyResult {
  // Normalize market price to 0-1 if needed
  const normalizedPrice = marketPrice > 1 ? marketPrice / 100 : marketPrice;

  // Calculate edge for YES position
  const yesEdge = estimatedProbability - normalizedPrice;
  // Calculate edge for NO position
  const noPrice = 1 - normalizedPrice;
  const noEdge = (1 - estimatedProbability) - noPrice;

  // Determine which side has better edge
  let edge: number;
  let recommendedSide: 'YES' | 'NO' | 'NONE';
  let effectivePrice: number;
  let effectiveProbability: number;

  if (yesEdge > noEdge && yesEdge > 0) {
    edge = yesEdge;
    recommendedSide = 'YES';
    effectivePrice = normalizedPrice;
    effectiveProbability = estimatedProbability;
  } else if (noEdge > 0) {
    edge = noEdge;
    recommendedSide = 'NO';
    effectivePrice = noPrice;
    effectiveProbability = 1 - estimatedProbability;
  } else {
    // No positive edge on either side
    return {
      recommendedFraction: 0,
      edge: Math.max(yesEdge, noEdge),
      edgePercentage: 0,
      hasPositiveEdge: false,
      expectedValue: 0,
      recommendedSide: 'NONE',
      wasCapped: false,
    };
  }

  // Calculate raw Kelly fraction: f* = (p - price) / (1 - price)
  const rawKelly = (effectiveProbability - effectivePrice) / (1 - effectivePrice);

  // Apply fraction multiplier
  let adjustedKelly = rawKelly * fractionMultiplier;

  // Check if capped
  const wasCapped = adjustedKelly > maxPositionSize;
  if (wasCapped) {
    adjustedKelly = maxPositionSize;
  }

  // Ensure non-negative
  adjustedKelly = Math.max(0, adjustedKelly);

  // Edge as percentage of market price
  const edgePercentage = (edge / effectivePrice) * 100;

  return {
    recommendedFraction: adjustedKelly,
    edge,
    edgePercentage,
    hasPositiveEdge: true,
    expectedValue: edge,
    recommendedSide,
    wasCapped,
  };
}

export function KellyCalculator({ marketPrice, marketQuestion: _marketQuestion }: KellyCalculatorProps) {
  const store = useKellyStore();
  const [estimatedProbability, setEstimatedProbability] = useState<string>('');
  const [kellyMultiplier, setKellyMultiplier] = useState<number>(store.multiplier);
  const [bankroll, setBankroll] = useState<string>(store.bankroll.toString());
  const [isExpanded, setIsExpanded] = useState(store.autoExpandCalculator);

  // Sync with store changes
  useEffect(() => {
    setKellyMultiplier(store.multiplier);
  }, [store.multiplier]);

  useEffect(() => {
    setBankroll(store.bankroll.toString());
  }, [store.bankroll]);

  const normalizedMarketPrice = marketPrice > 1 ? marketPrice / 100 : marketPrice;
  const maxPositionSize = store.maxPositionSize;

  const kellyResult = useMemo(() => {
    const prob = parseFloat(estimatedProbability) / 100;
    if (isNaN(prob) || prob <= 0 || prob >= 1) {
      return null;
    }
    return calculateKelly(prob, normalizedMarketPrice, kellyMultiplier, maxPositionSize);
  }, [estimatedProbability, normalizedMarketPrice, kellyMultiplier, maxPositionSize]);

  const dollarAmount = useMemo(() => {
    if (!kellyResult || !kellyResult.hasPositiveEdge) return 0;
    const bankrollNum = parseFloat(bankroll) || 0;
    return kellyResult.recommendedFraction * bankrollNum;
  }, [kellyResult, bankroll]);

  return (
    <div className="ascii-box p-4 mb-6 border-[hsl(var(--info))]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-sm font-bold text-[hsl(var(--info))]">
          [KELLY CRITERION CALCULATOR]
        </h3>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {isExpanded ? '[-]' : '[+]'}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Enter your estimated probability to calculate optimal position size.
          </p>

          {/* Input: Estimated Probability */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
              YOUR ESTIMATED PROBABILITY (%)
              <Tooltip content={KELLY_TOOLTIPS.estimatedProbability}>
                <InfoIcon />
              </Tooltip>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                value={estimatedProbability}
                onChange={(e) => setEstimatedProbability(e.target.value)}
                placeholder={`Market: ${(normalizedMarketPrice * 100).toFixed(1)}%`}
                className="flex-1 bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
              />
              <span className="text-sm">%</span>
            </div>
          </div>

          {/* Input: Bankroll */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
              BANKROLL ($)
              <Tooltip content={KELLY_TOOLTIPS.bankroll}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              min="1"
              value={bankroll}
              onChange={(e) => setBankroll(e.target.value)}
              className="w-full bg-transparent border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none font-mono"
            />
          </div>

          {/* Input: Kelly Multiplier */}
          <div>
            <label className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">
              KELLY FRACTION
              <Tooltip content={KELLY_TOOLTIPS.kellyFraction}>
                <InfoIcon />
              </Tooltip>
            </label>
            <select
              value={kellyMultiplier}
              onChange={(e) => setKellyMultiplier(parseFloat(e.target.value))}
              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-3 py-2 text-sm focus:border-[hsl(var(--primary))] focus:outline-none"
            >
              {Object.entries(MULTIPLIER_PRESETS).map(([key, { value, label }]) => (
                <option key={key} value={value}>
                  {label} ({(value * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>

          {/* Results */}
          {kellyResult && (
            <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
              {!kellyResult.hasPositiveEdge ? (
                <div className="text-center">
                  <div className="text-[hsl(var(--warning))] font-bold mb-2">NO EDGE</div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Your probability ({estimatedProbability}%) does not give you an edge over the market price ({(normalizedMarketPrice * 100).toFixed(1)}%).
                    <br />
                    Do not bet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Recommendation */}
                  <div className="text-center">
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
                      RECOMMENDATION
                    </div>
                    <div className={`text-2xl font-bold ${
                      kellyResult.recommendedSide === 'YES'
                        ? 'text-[hsl(var(--bullish))]'
                        : 'text-[hsl(var(--bearish))]'
                    }`}>
                      BET {kellyResult.recommendedSide}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="ascii-box p-2 text-center">
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        EDGE
                        <Tooltip content={KELLY_TOOLTIPS.edge}>
                          <InfoIcon />
                        </Tooltip>
                      </div>
                      <div className="text-lg font-bold text-[hsl(var(--primary))]">
                        +{(kellyResult.edge * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="ascii-box p-2 text-center">
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">% OF BANKROLL</div>
                      <div className="text-lg font-bold text-[hsl(var(--primary))]">
                        {(kellyResult.recommendedFraction * 100).toFixed(1)}%
                        {kellyResult.wasCapped && <span className="text-xs"> (capped)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Dollar Amount */}
                  <div className="ascii-box p-3 text-center bg-[hsl(var(--accent))]">
                    <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">
                      RECOMMENDED BET SIZE
                      <Tooltip content={KELLY_TOOLTIPS.recommendedSize}>
                        <InfoIcon />
                      </Tooltip>
                    </div>
                    <div className="text-3xl font-bold text-[hsl(var(--primary))] terminal-glow">
                      ${dollarAmount.toFixed(2)}
                    </div>
                  </div>

                  {/* Expected Value */}
                  <div className="text-center text-xs text-[hsl(var(--muted-foreground))]">
                    Expected value per dollar: +{(kellyResult.expectedValue * 100).toFixed(1)}%
                    <Tooltip content={KELLY_TOOLTIPS.expectedValue}>
                      <InfoIcon />
                    </Tooltip>
                  </div>

                  {/* Warning */}
                  <div className="text-xs text-[hsl(var(--warning))] mt-2">
                    This is not financial advice. Kelly Criterion assumes you know the true probability, which is impossible. Use fractional Kelly and proper risk management.
                  </div>
                </div>
              )}
            </div>
          )}

          {!estimatedProbability && (
            <div className="text-center text-xs text-[hsl(var(--muted-foreground))]">
              Enter your probability estimate above to see recommendations.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
