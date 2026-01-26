'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface FeeBreakdownProps {
  calibrAmount: number;
  usdcEstimate: number;
  outcomePrice?: number;
  gasSponsored?: boolean;
  gasEstimate?: number;
  compact?: boolean;
}

export interface Fees {
  swapFee: number;
  bridgeFee: number;
  tradingFee: number;
  totalFees: number;
  netAmount: number;
}

// =============================================================================
// Constants
// =============================================================================

const SWAP_FEE_PERCENT = 0.003; // 0.3%
const BRIDGE_FEE_USD = 0.10;
const TRADING_FEE_PERCENT = 0.001; // 0.1%

// =============================================================================
// Fee Calculation
// =============================================================================

export function calculateFees(calibrAmount: number, usdcEstimate: number): Fees {
  const swapFee = usdcEstimate * SWAP_FEE_PERCENT;
  const bridgeFee = usdcEstimate > 0 ? BRIDGE_FEE_USD : BRIDGE_FEE_USD;
  const afterSwapAndBridge = usdcEstimate - swapFee - bridgeFee;
  const tradingFee = Math.max(0, afterSwapAndBridge) * TRADING_FEE_PERCENT;
  const totalFees = swapFee + bridgeFee + tradingFee;
  const netAmount = usdcEstimate - totalFees;

  return {
    swapFee,
    bridgeFee,
    tradingFee,
    totalFees,
    netAmount,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

// =============================================================================
// Component
// =============================================================================

export function FeeBreakdown({
  calibrAmount,
  usdcEstimate,
  outcomePrice,
  gasSponsored = true,
  gasEstimate = 0,
  compact = false,
}: FeeBreakdownProps) {
  const fees = useMemo(
    () => calculateFees(calibrAmount, usdcEstimate),
    [calibrAmount, usdcEstimate]
  );

  const expectedShares = useMemo(() => {
    if (!outcomePrice || outcomePrice === 0) return null;
    return fees.netAmount / outcomePrice;
  }, [fees.netAmount, outcomePrice]);

  // Compact mode: only show total and net
  if (compact) {
    return (
      <div
        data-testid="fee-breakdown"
        className="border border-[hsl(var(--border))] p-2 space-y-1"
      >
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Total fees:</span>
          <span
            data-testid="total-fees-value"
            className="text-[hsl(var(--warning))]"
          >
            {formatUsd(fees.totalFees)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Net to trade:</span>
          <span
            data-testid="net-amount-value"
            className="font-bold text-[hsl(var(--primary))]"
          >
            {formatUsd(fees.netAmount)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="fee-breakdown"
      className="border border-[hsl(var(--border))] p-3 space-y-2"
    >
      {/* Header */}
      <div className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
        FEE BREAKDOWN
      </div>

      {/* Swap Fee */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Swap fee (0.3%):</span>
        <span data-testid="swap-fee-value">{formatUsd(fees.swapFee)}</span>
      </div>

      {/* Bridge Fee */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Bridge fee:</span>
        <span data-testid="bridge-fee-value">{formatUsd(fees.bridgeFee)}</span>
      </div>

      {/* Trading Fee */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Trading fee (0.1%):</span>
        <span data-testid="trading-fee-value">{formatUsd(fees.tradingFee)}</span>
      </div>

      {/* Gas */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Gas:</span>
        <span data-testid="gas-value" className="text-[hsl(var(--success))]">
          {gasSponsored ? 'SPONSORED' : formatUsd(gasEstimate)}
        </span>
      </div>

      {/* Separator */}
      <div className="border-t border-[hsl(var(--border))] pt-2" />

      {/* Total Fees */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Total fees:</span>
        <span
          data-testid="total-fees-value"
          className="text-[hsl(var(--warning))]"
        >
          {formatUsd(fees.totalFees)}
        </span>
      </div>

      {/* Net Amount */}
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">Net to trade:</span>
        <span
          data-testid="net-amount-value"
          className="font-bold text-[hsl(var(--primary))]"
        >
          {formatUsd(fees.netAmount)}
        </span>
      </div>

      {/* Expected Shares */}
      {expectedShares !== null && (
        <div className="flex justify-between text-xs pt-1 border-t border-[hsl(var(--border))]">
          <span className="text-[hsl(var(--muted-foreground))]">Expected shares:</span>
          <span
            data-testid="expected-shares-value"
            className="font-bold text-[hsl(var(--primary))]"
          >
            ~{expectedShares.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
