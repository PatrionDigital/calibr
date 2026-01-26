'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useBalance, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { type Hex } from 'viem';
import { StepProgress, createPurchaseSteps, type ChainType } from './step-progress';
import { FeeBreakdown, calculateFees } from './fee-breakdown';
import { useBridgeStore } from '@/lib/stores/bridge-store';

// =============================================================================
// Types
// =============================================================================

export type PurchaseState =
  | 'idle'
  | 'confirming'
  | 'swapping'
  | 'bridging'
  | 'trading'
  | 'success'
  | 'error';

export interface MarketOutcome {
  label: string;
  price: number;
}

export interface MarketInfo {
  id: string;
  question: string;
  platform: string;
  currentPrice: number;
  outcomes: MarketOutcome[];
}

export interface PurchaseModalProps {
  market: MarketInfo;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

// FeeBreakdown type imported from ./fee-breakdown

interface CompletedStep {
  txHash?: string;
  chain?: ChainType;
}

// =============================================================================
// Constants
// =============================================================================

// USDC contract address on Base (will be used when swap is implemented)
const _BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Hex;
const CALIBR_TOKEN = '0x0000000000000000000000000000000000000000' as Hex; // Placeholder
void _BASE_USDC; // Reserved for swap implementation

// Mock price for CALIBR token (in USD)
const CALIBR_PRICE_USD = 0.10;

const MIN_AMOUNT = 1;

// =============================================================================
// Helper Functions
// =============================================================================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

// calculateFees imported from ./fee-breakdown

function calculateShares(netAmount: number, outcomePrice: number): number {
  if (outcomePrice === 0) return 0;
  return netAmount / outcomePrice;
}

// =============================================================================
// Main Component
// =============================================================================

export function PurchaseModal({
  market,
  isOpen,
  onClose,
  onSuccess,
}: PurchaseModalProps) {
  // Wallet hooks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Balance hooks
  const { data: calibrBalance } = useBalance({
    address,
    token: CALIBR_TOKEN !== '0x0000000000000000000000000000000000000000' ? CALIBR_TOKEN : undefined,
    chainId: base.id,
  });

  // Bridge store for cross-chain operations (reserved for production implementation)
  const {
    initiateBridge: _initiateBridge,
    activeBridges: _activeBridges,
    selectedBridgeId: _selectedBridgeId,
    refreshBridgeStatus: _refreshBridgeStatus,
  } = useBridgeStore();
  void _initiateBridge;
  void _activeBridges;
  void _selectedBridgeId;
  void _refreshBridgeStatus;

  // Local state
  const [state, setState] = useState<PurchaseState>('idle');
  const [amount, setAmount] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0); // 0 = Yes, 1 = No
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, CompletedStep>>({});
  const [currentStepId, setCurrentStepId] = useState<string>('swap');
  const [finalTxHash, setFinalTxHash] = useState<string | null>(null);

  // Derived values
  const amountNum = parseFloat(amount) || 0;
  const usdEquivalent = amountNum * CALIBR_PRICE_USD;
  const outcomePrice = market.outcomes[selectedOutcome]?.price ?? 0.5;
  const fees = useMemo(() => calculateFees(amountNum, usdEquivalent), [amountNum, usdEquivalent]);
  const expectedShares = calculateShares(fees.netAmount, outcomePrice);

  // Validation
  const hasInsufficientBalance = calibrBalance
    ? amountNum > parseFloat(calibrBalance.formatted)
    : false;
  const isBelowMinimum = amountNum > 0 && amountNum < MIN_AMOUNT;
  const canProceed = amountNum >= MIN_AMOUNT && !hasInsufficientBalance && isConnected && chainId === base.id;

  // Create steps for progress indicator
  const steps = useMemo(
    () => createPurchaseSteps(
      currentStepId,
      completedSteps,
      error ? { id: currentStepId, error } : undefined
    ),
    [currentStepId, completedSteps, error]
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setAmount('');
      setSelectedOutcome(0);
      setError(null);
      setCompletedSteps({});
      setCurrentStepId('swap');
      setFinalTxHash(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state === 'idle') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, state, onClose]);

  // Handle close
  const handleClose = useCallback(() => {
    if (['swapping', 'bridging', 'trading'].includes(state)) {
      // Don't allow closing during active operations
      return;
    }
    onClose();
  }, [state, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Handle review/confirm
  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setState('confirming');
  }, [canProceed]);

  // Handle back from confirming
  const handleBack = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  // Handle purchase execution
  const handleExecute = useCallback(async () => {
    if (!address || !canProceed) return;

    setError(null);
    setState('swapping');
    setCurrentStepId('swap');

    try {
      // Step 1: Swap CALIBR to USDC
      // In production, this would call the AerodromeSwapService
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated
      const swapTxHash = '0x' + Math.random().toString(16).slice(2);
      setCompletedSteps((prev) => ({
        ...prev,
        swap: { txHash: swapTxHash, chain: 'base' },
      }));

      // Step 2: Bridge USDC to Polygon
      setState('bridging');
      setCurrentStepId('bridge');

      // In production, this would use the bridge store
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Simulated
      const bridgeTxHash = '0x' + Math.random().toString(16).slice(2);
      setCompletedSteps((prev) => ({
        ...prev,
        bridge: { txHash: bridgeTxHash, chain: 'base' },
      }));

      // Step 3: Deposit on Polymarket
      setCurrentStepId('deposit');
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulated
      const depositTxHash = '0x' + Math.random().toString(16).slice(2);
      setCompletedSteps((prev) => ({
        ...prev,
        deposit: { txHash: depositTxHash, chain: 'polygon' },
      }));

      // Step 4: Execute trade
      setState('trading');
      setCurrentStepId('trade');
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulated
      const tradeTxHash = '0x' + Math.random().toString(16).slice(2);
      setCompletedSteps((prev) => ({
        ...prev,
        trade: { txHash: tradeTxHash, chain: 'polygon' },
      }));

      // Success
      setFinalTxHash(tradeTxHash);
      setState('success');
      onSuccess?.(tradeTxHash);

    } catch (err) {
      console.error('[PurchaseModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setState('error');
    }
  }, [address, canProceed, onSuccess]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null);
    handleExecute();
  }, [handleExecute]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      data-testid="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
    >
      <div className="relative max-w-lg w-full mx-4 ascii-box p-4 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Hidden state for testing */}
        <span data-testid="purchase-state" className="sr-only">{state}</span>

        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={['swapping', 'bridging', 'trading'].includes(state)}
          className="absolute top-2 right-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] disabled:opacity-50"
          aria-label="Close"
        >
          [CLOSE]
        </button>

        {/* Header */}
        <h2 id="purchase-modal-title" className="text-sm font-bold text-[hsl(var(--primary))]">
          [PURCHASE]
        </h2>

        {/* Market Info */}
        <div className="border border-[hsl(var(--border))] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[hsl(var(--muted-foreground))]">{market.platform}</span>
            <span className="text-xs font-bold text-[hsl(var(--primary))]">
              {formatPercent(market.currentPrice)}
            </span>
          </div>
          <p className="text-xs font-medium">{market.question}</p>
        </div>

        {/* Wallet Status */}
        {!isConnected && (
          <div className="border border-[hsl(var(--warning))] p-3 text-xs text-[hsl(var(--warning))]">
            Connect your wallet to continue
          </div>
        )}

        {isConnected && chainId !== base.id && (
          <div className="border border-[hsl(var(--warning))] p-3 text-xs text-[hsl(var(--warning))]">
            Switch to Base network to continue
            <button
              onClick={() => switchChain({ chainId: base.id })}
              className="ml-2 underline hover:text-[hsl(var(--primary))]"
            >
              Switch
            </button>
          </div>
        )}

        {/* Main Content - Idle/Confirming States */}
        {(state === 'idle' || state === 'confirming') && (
          <>
            {/* Amount Input */}
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
                AMOUNT ($CALIBR)
              </label>
              <div className="flex gap-2">
                <input
                  data-testid="amount-input"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  disabled={state === 'confirming'}
                  min={MIN_AMOUNT}
                  className="flex-1 bg-black border border-[hsl(var(--border))] px-3 py-2 text-sm font-mono focus:border-[hsl(var(--primary))] focus:outline-none disabled:opacity-50"
                />
              </div>
              {amountNum > 0 && (
                <div
                  data-testid="usd-equivalent"
                  className="text-xs text-[hsl(var(--muted-foreground))] mt-1"
                >
                  ≈ {formatUsd(usdEquivalent)} USD
                </div>
              )}
              {isBelowMinimum && (
                <div className="text-xs text-[hsl(var(--destructive))] mt-1">
                  Minimum amount is {MIN_AMOUNT} CALIBR
                </div>
              )}
              {hasInsufficientBalance && (
                <div className="text-xs text-[hsl(var(--destructive))] mt-1">
                  Insufficient balance
                </div>
              )}
            </div>

            {/* Outcome Selection */}
            <div>
              <label className="text-xs text-[hsl(var(--muted-foreground))] mb-1 block">
                OUTCOME
              </label>
              <div className="flex gap-2">
                {market.outcomes.map((outcome, index) => {
                  const isYes = outcome.label.toLowerCase() === 'yes';
                  const isSelected = selectedOutcome === index;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedOutcome(index)}
                      disabled={state === 'confirming'}
                      className={`flex-1 py-2 px-3 text-sm font-bold border transition-colors ${
                        isSelected
                          ? isYes
                            ? 'bg-[hsl(var(--bullish))] text-black border-[hsl(var(--bullish))]'
                            : 'bg-[hsl(var(--bearish))] text-black border-[hsl(var(--bearish))]'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]'
                      }`}
                    >
                      {outcome.label.toUpperCase()} @ {formatPercent(outcome.price)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fee Breakdown */}
            {amountNum > 0 && (
              <FeeBreakdown
                calibrAmount={amountNum}
                usdcEstimate={usdEquivalent}
                outcomePrice={outcomePrice}
              />
            )}

            {/* Step Progress Preview */}
            <div className="border border-[hsl(var(--border))] p-3">
              <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] mb-2">
                EXECUTION STEPS
              </div>
              <StepProgress steps={steps} currentStep={currentStepId} compact />
            </div>

            {/* Confirmation View */}
            {state === 'confirming' && (
              <div className="border border-[hsl(var(--primary))] p-3 space-y-2">
                <div className="text-xs font-bold text-[hsl(var(--primary))]">
                  CONFIRM PURCHASE
                </div>
                <div className="text-xs space-y-1">
                  <p>• Swap {amountNum} CALIBR → ~{formatUsd(usdEquivalent - fees.swapFee)} USDC</p>
                  <p>• Bridge USDC from Base to Polygon</p>
                  <p>• Buy {expectedShares.toFixed(2)} "{market.outcomes[selectedOutcome]?.label}" shares</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {state === 'idle' ? (
                <button
                  onClick={handleReview}
                  disabled={!canProceed}
                  className={`flex-1 py-3 text-sm font-bold border transition-colors ${
                    canProceed
                      ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                  }`}
                >
                  REVIEW ORDER
                </button>
              ) : (
                <>
                  <button
                    onClick={handleBack}
                    className="px-4 py-3 text-sm font-bold border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleExecute}
                    className="flex-1 py-3 text-sm font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
                  >
                    CONFIRM PURCHASE
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Execution States */}
        {['swapping', 'bridging', 'trading'].includes(state) && (
          <div className="space-y-4">
            <div className="text-xs text-center text-[hsl(var(--muted-foreground))]">
              {state === 'swapping' && 'Swapping $CALIBR to USDC...'}
              {state === 'bridging' && 'Bridging USDC to Polygon...'}
              {state === 'trading' && 'Executing trade on Polymarket...'}
            </div>

            <StepProgress
              steps={steps}
              currentStep={currentStepId}
              estimatedTimeRemaining={state === 'bridging' ? '~15-20 min' : '~30 sec'}
            />

            <div className="h-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
              <div
                className="h-full bg-[hsl(var(--primary))] transition-all animate-pulse"
                style={{ width: '50%' }}
              />
            </div>

            <p className="text-[10px] text-center text-[hsl(var(--muted-foreground))]">
              Do not close this window
            </p>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="space-y-4">
            <div className="border border-[hsl(var(--success))] p-3 space-y-2">
              <div className="text-xs font-bold text-[hsl(var(--success))]">
                ✓ PURCHASE COMPLETE
              </div>
              <p className="text-xs">
                Successfully purchased {expectedShares.toFixed(2)} "{market.outcomes[selectedOutcome]?.label}" shares
              </p>
              {finalTxHash && (
                <a
                  href={`https://polygonscan.com/tx/${finalTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[hsl(var(--primary))] hover:underline"
                >
                  View transaction →
                </a>
              )}
            </div>

            <StepProgress steps={steps} currentStep="trade" />

            <button
              onClick={handleClose}
              className="w-full py-3 text-sm font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
            >
              CLOSE
            </button>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="space-y-4">
            <div className="border border-[hsl(var(--destructive))] p-3 space-y-2">
              <div className="text-xs font-bold text-[hsl(var(--destructive))]">
                ✗ PURCHASE FAILED
              </div>
              <p className="text-xs text-[hsl(var(--destructive))]">
                {error || 'An unknown error occurred'}
              </p>
            </div>

            <StepProgress
              steps={steps}
              currentStep={currentStepId}
            />

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-3 text-sm font-bold border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 py-3 text-sm font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
