'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';
export type ChainType = 'base' | 'polygon' | 'ethereum';

export interface PurchaseStep {
  id: string;
  label: string;
  status: StepStatus;
  description?: string;
  txHash?: string;
  chain?: ChainType;
  error?: string;
}

export interface StepProgressProps {
  steps: PurchaseStep[];
  currentStep: string;
  estimatedTimeRemaining?: string;
  compact?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const BLOCK_EXPLORERS: Record<ChainType, string> = {
  base: 'https://basescan.org/tx/',
  polygon: 'https://polygonscan.com/tx/',
  ethereum: 'https://etherscan.io/tx/',
};

// =============================================================================
// Helper Components
// =============================================================================

function BlockchainLink({ txHash, chain }: { txHash: string; chain: ChainType }) {
  const explorerUrl = BLOCK_EXPLORERS[chain] + txHash;
  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] font-mono text-[hsl(var(--primary))] hover:underline"
    >
      {shortHash}
    </a>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-[hsl(var(--primary))]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StepProgress({
  steps,
  currentStep,
  estimatedTimeRemaining,
  compact = false,
}: StepProgressProps) {
  // Calculate step classes based on status
  const getStepClasses = (step: PurchaseStep, isCurrent: boolean): string => {
    const baseClasses = 'flex items-center gap-2 p-2 border transition-all';

    if (step.status === 'error') {
      return `${baseClasses} border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10`;
    }

    if (step.status === 'completed') {
      return `${baseClasses} border-[hsl(var(--success))] text-[hsl(var(--success))]`;
    }

    if (isCurrent || step.status === 'active') {
      return `${baseClasses} border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-[0_0_10px_hsl(var(--primary))]`;
    }

    return `${baseClasses} border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]`;
  };

  // Get step indicator content (number, checkmark, or spinner)
  const getStepIndicator = (step: PurchaseStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <span
          data-testid={`step-${step.id}-checkmark`}
          className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-[hsl(var(--success))] bg-[hsl(var(--success))] text-black"
        >
          ✓
        </span>
      );
    }

    if (step.status === 'active') {
      return (
        <span
          data-testid={`step-${step.id}-spinner`}
          className="w-5 h-5 flex items-center justify-center"
        >
          <Spinner />
        </span>
      );
    }

    if (step.status === 'error') {
      return (
        <span className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]">
          !
        </span>
      );
    }

    return (
      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-[hsl(var(--border))]">
        {index + 1}
      </span>
    );
  };

  // Memoize the rendered steps
  const renderedSteps = useMemo(() => {
    return steps.map((step, index) => {
      const isCurrent = step.id === currentStep;
      const isLast = index === steps.length - 1;

      return (
        <div key={step.id} className="flex items-center">
          {/* Step Box */}
          <div
            data-testid={`step-${step.id}`}
            className={getStepClasses(step, isCurrent)}
          >
            {getStepIndicator(step, index)}

            <div className="flex flex-col">
              <span className="text-xs font-bold">{step.label}</span>

              {/* Description (only in non-compact mode) */}
              {!compact && step.description && step.status === 'active' && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {step.description}
                </span>
              )}

              {/* Transaction link */}
              {step.txHash && step.chain && (
                <BlockchainLink txHash={step.txHash} chain={step.chain} />
              )}

              {/* Error message */}
              {step.status === 'error' && step.error && (
                <span className="text-[10px] text-[hsl(var(--destructive))]">
                  {step.error}
                </span>
              )}
            </div>
          </div>

          {/* Arrow separator */}
          {!isLast && (
            <span className="mx-1 text-[hsl(var(--muted-foreground))]">→</span>
          )}
        </div>
      );
    });
  }, [steps, currentStep, compact]);

  return (
    <div className="space-y-3">
      {/* Steps Row */}
      <div
        data-testid="step-progress"
        className={`flex items-center flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}
      >
        {renderedSteps}
      </div>

      {/* Time Estimate */}
      {estimatedTimeRemaining && (
        <div className="flex items-center justify-end gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="font-bold">EST. TIME:</span>
          <span className="text-[hsl(var(--primary))]">{estimatedTimeRemaining}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Preset Step Configurations
// =============================================================================

export const PURCHASE_FLOW_STEPS: Omit<PurchaseStep, 'status'>[] = [
  { id: 'swap', label: 'SWAP', description: 'Swapping $CALIBR to USDC via Aerodrome' },
  { id: 'bridge', label: 'BRIDGE', description: 'Bridging USDC via Circle CCTP (~15 min)' },
  { id: 'deposit', label: 'DEPOSIT', description: 'Depositing USDC on Polymarket' },
  { id: 'trade', label: 'TRADE', description: 'Executing trade on Polymarket' },
];

export function createPurchaseSteps(
  currentStepId: string,
  completedSteps: Record<string, { txHash?: string; chain?: ChainType }> = {},
  errorStep?: { id: string; error: string }
): PurchaseStep[] {
  let foundCurrent = false;

  return PURCHASE_FLOW_STEPS.map((step) => {
    // Check if this step has an error
    if (errorStep?.id === step.id) {
      return { ...step, status: 'error' as StepStatus, error: errorStep.error };
    }

    // Check if completed
    const completed = completedSteps[step.id];
    if (completed) {
      return {
        ...step,
        status: 'completed' as StepStatus,
        txHash: completed.txHash,
        chain: completed.chain,
      };
    }

    // Check if current
    if (step.id === currentStepId) {
      foundCurrent = true;
      return { ...step, status: 'active' as StepStatus };
    }

    // If we've found current, remaining are pending
    if (foundCurrent) {
      return { ...step, status: 'pending' as StepStatus };
    }

    // Before current step - should be completed (but wasn't in completedSteps)
    return { ...step, status: 'pending' as StepStatus };
  });
}
