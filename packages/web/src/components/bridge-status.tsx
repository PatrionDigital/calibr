'use client';

import { useEffect, useCallback, useState } from 'react';
import { useBridgeStore, type BridgePhase } from '@/lib/stores/bridge-store';

// =============================================================================
// Types
// =============================================================================

interface BridgeStatusProps {
  trackingId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

interface StepInfo {
  phase: BridgePhase;
  label: string;
  shortLabel: string;
  description: string;
}

// =============================================================================
// Constants
// =============================================================================

const BRIDGE_STEPS: StepInfo[] = [
  {
    phase: 'initiated',
    label: 'INITIATED',
    shortLabel: '1',
    description: 'Transaction submitted to Base',
  },
  {
    phase: 'pending_attestation',
    label: 'PENDING',
    shortLabel: '2',
    description: 'Waiting for Circle attestation (~15 min)',
  },
  {
    phase: 'attested',
    label: 'ATTESTED',
    shortLabel: '3',
    description: 'Ready to claim on Polygon',
  },
  {
    phase: 'claiming',
    label: 'CLAIMING',
    shortLabel: '4',
    description: 'Minting USDC on destination',
  },
  {
    phase: 'completed',
    label: 'COMPLETED',
    shortLabel: '5',
    description: 'USDC has arrived!',
  },
];

const PHASE_TO_STEP_INDEX: Record<BridgePhase, number> = {
  pending_initiation: -1,
  initiated: 0,
  pending_attestation: 1,
  attested: 2,
  claiming: 3,
  completed: 4,
  failed: -1,
  abandoned: -1,
};

// =============================================================================
// Component
// =============================================================================

export function BridgeStatusDisplay({
  trackingId,
  onComplete,
  onError,
  compact = false,
}: BridgeStatusProps) {
  const {
    activeBridges,
    refreshBridgeStatus,
    checkAttestation,
    abandonBridge,
  } = useBridgeStore();

  const [isPolling, setIsPolling] = useState(false);
  const [attestation, setAttestation] = useState<string | null>(null);

  const bridge = activeBridges[trackingId];

  // Calculate progress
  const currentStepIndex = bridge ? PHASE_TO_STEP_INDEX[bridge.phase] : -1;
  const progressPercent = bridge
    ? Math.max(0, Math.min(100, ((currentStepIndex + 1) / BRIDGE_STEPS.length) * 100))
    : 0;

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    if (!bridge || ['completed', 'failed', 'abandoned'].includes(bridge.phase)) {
      return;
    }

    setIsPolling(true);

    try {
      // If we're waiting for attestation and have a message hash, check Circle API
      if (bridge.phase === 'pending_attestation' && bridge.messageHash) {
        const result = await checkAttestation(trackingId, bridge.messageHash);
        if (result.ready && result.attestation) {
          setAttestation(result.attestation);
        }
      }

      // Refresh general status
      const status = await refreshBridgeStatus(trackingId);

      if (status?.phase === 'completed') {
        onComplete?.();
      } else if (status?.phase === 'failed' && status.error) {
        onError?.(status.error);
      }
    } finally {
      setIsPolling(false);
    }
  }, [bridge, trackingId, checkAttestation, refreshBridgeStatus, onComplete, onError]);

  // Set up polling interval
  useEffect(() => {
    if (!bridge || ['completed', 'failed', 'abandoned'].includes(bridge.phase)) {
      return;
    }

    // Poll faster during claiming phase
    const interval = bridge.phase === 'claiming' ? 2000 : 10000;

    const timer = setInterval(pollStatus, interval);
    pollStatus(); // Initial poll

    return () => clearInterval(timer);
  }, [bridge?.phase, pollStatus]);

  // Handle abandon
  const handleAbandon = async () => {
    if (window.confirm('Are you sure you want to abandon this bridge? Your funds may be stuck.')) {
      await abandonBridge(trackingId);
    }
  };

  if (!bridge) {
    return (
      <div className="ascii-box p-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Bridge not found: {trackingId}
        </p>
      </div>
    );
  }

  const isTerminal = ['completed', 'failed', 'abandoned'].includes(bridge.phase);
  const isFailed = bridge.phase === 'failed';
  const isAbandoned = bridge.phase === 'abandoned';

  return (
    <div className="ascii-box p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[hsl(var(--primary))]">
          [BRIDGE STATUS]
        </h3>
        {isPolling && (
          <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">
            polling...
          </span>
        )}
      </div>

      {/* Amount and Route */}
      <div className="border border-[hsl(var(--border))] p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Amount:</span>
          <span className="font-bold">${bridge.amountUsd} USDC</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Route:</span>
          <span>{bridge.sourceChain} → {bridge.destinationChain}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))]">Tracking:</span>
          <span className="font-mono text-[10px]">{trackingId.slice(0, 12)}...</span>
        </div>
      </div>

      {/* Progress Bar */}
      {!compact && (
        <div className="space-y-2">
          <div className="h-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
            <div
              className={`h-full transition-all duration-500 ${
                isFailed || isAbandoned
                  ? 'bg-[hsl(var(--destructive))]'
                  : 'bg-[hsl(var(--primary))]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
            <span>{progressPercent.toFixed(0)}%</span>
            <span>{BRIDGE_STEPS[currentStepIndex]?.description || bridge.phase}</span>
          </div>
        </div>
      )}

      {/* Step Indicators */}
      <div className={`grid gap-1 ${compact ? 'grid-cols-5' : 'grid-cols-1'}`}>
        {BRIDGE_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex || bridge.phase === 'completed';

          return (
            <div
              key={step.phase}
              className={`flex items-center gap-2 p-2 border transition-colors ${
                isActive
                  ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10'
                  : isCompleted
                    ? 'border-[hsl(var(--success))] text-[hsl(var(--success))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              <span
                className={`w-5 h-5 flex items-center justify-center text-xs font-bold border ${
                  isActive
                    ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                    : isCompleted
                      ? 'border-[hsl(var(--success))] bg-[hsl(var(--success))] text-black'
                      : 'border-[hsl(var(--border))]'
                }`}
              >
                {isCompleted && !isActive ? '✓' : step.shortLabel}
              </span>
              {!compact && (
                <div className="flex-1">
                  <div className="text-xs font-bold">{step.label}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {step.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transaction Links */}
      {(bridge.sourceTxHash || bridge.destTxHash) && (
        <div className="border border-[hsl(var(--border))] p-3 space-y-2">
          <div className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
            TRANSACTIONS
          </div>
          {bridge.sourceTxHash && (
            <div className="flex justify-between items-center text-xs">
              <span>Source (Base):</span>
              <a
                href={`https://basescan.org/tx/${bridge.sourceTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] hover:underline font-mono"
              >
                {bridge.sourceTxHash.slice(0, 10)}...
              </a>
            </div>
          )}
          {bridge.destTxHash && (
            <div className="flex justify-between items-center text-xs">
              <span>Destination (Polygon):</span>
              <a
                href={`https://polygonscan.com/tx/${bridge.destTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(var(--primary))] hover:underline font-mono"
              >
                {bridge.destTxHash.slice(0, 10)}...
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {bridge.error && (
        <div className="border border-[hsl(var(--destructive))] p-3 text-xs text-[hsl(var(--destructive))]">
          ERROR: {bridge.error}
        </div>
      )}

      {/* Status Message */}
      {isFailed && (
        <div className="border border-[hsl(var(--destructive))] p-3 text-xs text-[hsl(var(--destructive))]">
          Bridge failed. Your funds may be retrievable - contact support.
        </div>
      )}

      {isAbandoned && (
        <div className="border border-[hsl(var(--warning))] p-3 text-xs text-[hsl(var(--warning))]">
          Bridge abandoned. If you sent funds, they may be claimable later.
        </div>
      )}

      {bridge.phase === 'completed' && (
        <div className="border border-[hsl(var(--success))] p-3 text-xs text-[hsl(var(--success))]">
          Bridge complete! Your USDC is now on {bridge.destinationChain}.
        </div>
      )}

      {/* Action Buttons */}
      {!isTerminal && (
        <div className="flex gap-2">
          {bridge.phase === 'attested' && attestation && (
            <button
              className="flex-1 py-2 text-xs font-bold border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-black transition-colors"
              onClick={() => {
                // This would trigger the claim transaction
                // For now, we'll just refresh
                pollStatus();
              }}
            >
              CLAIM NOW
            </button>
          )}

          <button
            className="flex-1 py-2 text-xs font-bold border border-[hsl(var(--muted-foreground))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] transition-colors"
            onClick={handleAbandon}
          >
            ABANDON
          </button>

          <button
            className="flex-1 py-2 text-xs font-bold border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] transition-colors"
            onClick={pollStatus}
            disabled={isPolling}
          >
            {isPolling ? '...' : 'REFRESH'}
          </button>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
        <span>Started: {new Date(bridge.createdAt).toLocaleTimeString()}</span>
        <span>Updated: {new Date(bridge.updatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Compact Status Badge
// =============================================================================

interface BridgeStatusBadgeProps {
  trackingId: string;
  onClick?: () => void;
}

export function BridgeStatusBadge({ trackingId, onClick }: BridgeStatusBadgeProps) {
  const { activeBridges } = useBridgeStore();
  const bridge = activeBridges[trackingId];

  if (!bridge) return null;

  const currentStepIndex = PHASE_TO_STEP_INDEX[bridge.phase];
  const progressPercent = Math.max(0, Math.min(100, ((currentStepIndex + 1) / BRIDGE_STEPS.length) * 100));

  const statusColor =
    bridge.phase === 'completed'
      ? 'hsl(var(--success))'
      : bridge.phase === 'failed' || bridge.phase === 'abandoned'
        ? 'hsl(var(--destructive))'
        : 'hsl(var(--primary))';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: statusColor }}
      />
      <span className="text-xs font-mono">
        Bridge: {progressPercent.toFixed(0)}%
      </span>
    </button>
  );
}
