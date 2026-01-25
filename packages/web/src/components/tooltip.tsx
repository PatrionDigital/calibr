'use client';

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
}

export function Tooltip({ content, children, position = 'top', maxWidth = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let x = 0;
      let y = 0;

      switch (position) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.top - tooltipRect.height - 8;
          break;
        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.bottom + 8;
          break;
        case 'left':
          x = triggerRect.left - tooltipRect.width - 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          x = triggerRect.right + 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
      }

      // Keep within viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

      setCoords({ x, y });
    }
  }, [isVisible, position]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex items-center cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 text-xs text-[hsl(var(--foreground))] bg-[hsl(var(--background))] border border-[hsl(var(--border))] shadow-lg"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            maxWidth: `${maxWidth}px`,
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
}

interface InfoIconProps {
  className?: string;
}

export function InfoIcon({ className = '' }: InfoIconProps) {
  return (
    <svg
      className={`inline-block w-3.5 h-3.5 ml-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeWidth="2" d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

// Kelly-specific tooltips
export const KELLY_TOOLTIPS = {
  estimatedProbability: (
    <div className="space-y-2">
      <strong>Your Estimated Probability</strong>
      <p>
        What you believe the true probability is that the YES outcome will happen.
        This should be your honest assessment based on your research and analysis.
      </p>
      <p className="text-[hsl(var(--warning))]">
        Be careful: overconfidence is common. Consider using fractional Kelly.
      </p>
    </div>
  ),
  edge: (
    <div className="space-y-2">
      <strong>Edge</strong>
      <p>
        The difference between your estimated probability and the market price.
        Positive edge means you believe the market is mispriced in your favor.
      </p>
      <p>
        Edge = Your Probability - Market Price
      </p>
    </div>
  ),
  kellyFraction: (
    <div className="space-y-2">
      <strong>Kelly Fraction</strong>
      <p>
        The optimal percentage of your bankroll to bet, according to the Kelly Criterion.
        Full Kelly maximizes long-term growth but can be volatile.
      </p>
      <p>
        <strong>Common choices:</strong>
      </p>
      <ul className="list-disc list-inside">
        <li>Full Kelly (100%): Maximum growth, high variance</li>
        <li>Half Kelly (50%): Most recommended for prediction markets</li>
        <li>Quarter Kelly (25%): Conservative, lower drawdowns</li>
      </ul>
    </div>
  ),
  bankroll: (
    <div className="space-y-2">
      <strong>Bankroll</strong>
      <p>
        The total amount you've allocated for prediction market trading.
        Only include funds you can afford to lose.
      </p>
      <p className="text-[hsl(var(--warning))]">
        Never bet more than you can afford to lose.
      </p>
    </div>
  ),
  recommendedSize: (
    <div className="space-y-2">
      <strong>Recommended Bet Size</strong>
      <p>
        The dollar amount to bet based on Kelly Criterion.
        This is calculated as: Kelly Fraction × Bankroll
      </p>
    </div>
  ),
  expectedValue: (
    <div className="space-y-2">
      <strong>Expected Value (EV)</strong>
      <p>
        The average profit you expect per dollar bet, if your probability estimate is correct.
      </p>
      <p>
        EV = (Probability × Payout) - (1 - Probability)
      </p>
    </div>
  ),
  portfolioKelly: (
    <div className="space-y-2">
      <strong>Portfolio Kelly Optimization</strong>
      <p>
        When betting on multiple markets simultaneously, positions can be scaled down
        to avoid over-allocation. The total allocation is typically capped at 80%.
      </p>
      <p className="text-[hsl(var(--warning))]">
        Assumes markets are independent. Correlated outcomes require further adjustment.
      </p>
    </div>
  ),
  brierScore: (
    <div className="space-y-2">
      <strong>Brier Score</strong>
      <p>
        A scoring rule that measures the accuracy of probabilistic predictions.
        Range: 0 (perfect) to 1 (worst possible).
      </p>
      <p>
        Brier = (forecast - outcome)²
      </p>
      <p>
        A score of 0.25 is random guessing (50/50).
        Lower is better.
      </p>
    </div>
  ),
  calibration: (
    <div className="space-y-2">
      <strong>Calibration</strong>
      <p>
        How well your probability estimates match actual outcomes.
        If you predict 70% on many events, about 70% should actually happen.
      </p>
      <p>
        Perfect calibration means your confidence matches reality.
      </p>
    </div>
  ),
  sharpeRatio: (
    <div className="space-y-2">
      <strong>Sharpe Ratio</strong>
      <p>
        A measure of risk-adjusted returns. Higher is better.
        Calculated as: (Average Return) / (Standard Deviation of Returns)
      </p>
      <p>
        <strong>Interpretation:</strong>
      </p>
      <ul className="list-disc list-inside">
        <li>&lt; 1: Suboptimal</li>
        <li>1-2: Good</li>
        <li>&gt; 2: Very good</li>
        <li>&gt; 3: Excellent</li>
      </ul>
    </div>
  ),
};
