'use client';

import { useMemo, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export type RevocationStatus = 'pending' | 'revoking' | 'revoked' | 'failed';

export interface AttestationToRevoke {
  id: string;
  uid: string;
  schemaId: string;
  type: string;
  label: string;
  createdAt: string;
  status: RevocationStatus;
  txHash: string | null;
  error: string | null;
}

// =============================================================================
// AttestationRevocationStatus Component
// =============================================================================

interface AttestationRevocationStatusProps {
  status: RevocationStatus;
}

const STATUS_CONFIG: Record<RevocationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-yellow-400' },
  revoking: { label: 'Revoking...', className: 'text-blue-400 animate-pulse' },
  revoked: { label: 'Revoked', className: 'text-green-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function AttestationRevocationStatus({ status }: AttestationRevocationStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="attestation-revocation-status"
      className={`font-mono text-xs px-2 py-0.5 border border-current ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// AttestationRevocationCard Component
// =============================================================================

interface AttestationRevocationCardProps {
  attestation: AttestationToRevoke;
}

export function AttestationRevocationCard({ attestation }: AttestationRevocationCardProps) {
  const date = new Date(attestation.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const truncatedUid = `${attestation.uid.slice(0, 8)}...${attestation.uid.slice(-4)}`;
  const truncatedTxHash = attestation.txHash
    ? `${attestation.txHash.slice(0, 8)}...`
    : null;

  return (
    <div
      data-testid="attestation-revocation-card"
      className="border border-[var(--terminal-dim)] font-mono p-3 space-y-2"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[var(--terminal-green)] font-bold text-sm">{attestation.label}</div>
          <div className="text-[var(--terminal-dim)] text-xs capitalize">{attestation.type}</div>
        </div>
        <AttestationRevocationStatus status={attestation.status} />
      </div>

      <div className="text-[var(--terminal-dim)] text-xs">
        UID: {truncatedUid}
      </div>

      {truncatedTxHash && (
        <div className="text-green-400 text-xs">
          TX: {truncatedTxHash}
        </div>
      )}

      {attestation.error && (
        <div className="text-red-400 text-xs border border-red-400 p-2">
          Error: {attestation.error}
        </div>
      )}

      <div className="text-[var(--terminal-dim)] text-xs">Created: {date}</div>
    </div>
  );
}

// =============================================================================
// AttestationRevocationProgress Component
// =============================================================================

interface AttestationRevocationProgressProps {
  revoked: number;
  total: number;
}

export function AttestationRevocationProgress({ revoked, total }: AttestationRevocationProgressProps) {
  const percentage = total > 0 ? Math.round((revoked / total) * 100) : 0;

  return (
    <div data-testid="attestation-revocation-progress" className="font-mono">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[var(--terminal-dim)] text-xs">Revocation Progress</span>
        <span className="text-[var(--terminal-green)] text-xs">
          {revoked} / {total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 border border-[var(--terminal-dim)] overflow-hidden">
        <div
          data-testid="progress-fill"
          className="h-full bg-[var(--terminal-green)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// AttestationTypeFilter Component
// =============================================================================

interface AttestationTypeFilterProps {
  types: string[];
  selected: string;
  onSelect: (type: string) => void;
}

export function AttestationTypeFilter({ types, selected, onSelect }: AttestationTypeFilterProps) {
  return (
    <div data-testid="attestation-type-filter" className="flex gap-2 flex-wrap font-mono">
      <button
        onClick={() => onSelect('all')}
        className={`text-xs px-2 py-1 border ${
          selected === 'all'
            ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] active'
            : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)]'
        }`}
      >
        All
      </button>
      {types.map((type) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={`text-xs px-2 py-1 border capitalize ${
            selected === type
              ? 'border-[var(--terminal-green)] text-[var(--terminal-green)] active selected'
              : 'border-[var(--terminal-dim)] text-[var(--terminal-dim)]'
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// AttestationRevocationList Component
// =============================================================================

interface AttestationRevocationListProps {
  attestations: AttestationToRevoke[];
}

export function AttestationRevocationList({ attestations }: AttestationRevocationListProps) {
  if (attestations.length === 0) {
    return (
      <div className="text-center py-8 font-mono text-[var(--terminal-dim)]">
        No attestations to revoke
      </div>
    );
  }

  return (
    <div data-testid="attestation-revocation-list" className="space-y-3">
      {attestations.map((att) => (
        <AttestationRevocationCard key={att.id} attestation={att} />
      ))}
    </div>
  );
}

// =============================================================================
// RevocationSummary Component
// =============================================================================

interface RevocationSummaryProps {
  attestations: AttestationToRevoke[];
}

export function RevocationSummary({ attestations }: RevocationSummaryProps) {
  const counts = useMemo(() => {
    const result = { pending: 0, revoking: 0, revoked: 0, failed: 0 };
    attestations.forEach((att) => {
      result[att.status]++;
    });
    return result;
  }, [attestations]);

  return (
    <div data-testid="revocation-summary" className="font-mono">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-green)] font-bold">{attestations.length}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Total</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-yellow-400 font-bold">{counts.pending}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Pending</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-green-400 font-bold">{counts.revoked}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Revoked</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-red-400 font-bold">{counts.failed}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Failed</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RevocationConfirmDialog Component
// =============================================================================

interface RevocationConfirmDialogProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RevocationConfirmDialog({
  open,
  count,
  onConfirm,
  onCancel,
}: RevocationConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      data-testid="revocation-confirm-dialog"
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center font-mono p-4"
    >
      <div className="border border-red-400 bg-black max-w-md w-full p-4 space-y-4">
        <div className="text-red-400 font-bold text-lg">Confirm Revocation</div>
        <div className="text-[var(--terminal-dim)] text-sm">
          You are about to revoke <span className="text-[var(--terminal-green)] font-bold">{count}</span> attestations.
        </div>
        <div className="text-red-400 text-xs border border-red-400 p-2">
          ⚠ This action cannot be undone. Once revoked, these on-chain attestations will be permanently invalidated.
        </div>
        <div className="flex gap-2">
          <button
            data-testid="cancel-revocation-button"
            onClick={onCancel}
            className="flex-1 border border-[var(--terminal-dim)] text-[var(--terminal-dim)] py-2 text-sm hover:border-[var(--terminal-green)] hover:text-[var(--terminal-green)]"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-revocation-button"
            onClick={onConfirm}
            className="flex-1 border border-red-400 text-red-400 py-2 text-sm hover:bg-red-400 hover:text-black"
          >
            Revoke All
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AttestationRevocationPanel Component
// =============================================================================

interface AttestationRevocationPanelProps {
  attestations: AttestationToRevoke[];
  loading?: boolean;
  onRevokeAll?: () => void;
}

export function AttestationRevocationPanel({
  attestations,
  loading = false,
  onRevokeAll = () => {},
}: AttestationRevocationPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { revokedCount, isProcessing } = useAttestationRevocation(attestations);
  const pendingToRevoke = attestations.filter((a) => a.status === 'pending').length;

  if (loading) {
    return (
      <div data-testid="attestation-revocation-panel" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading attestations...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="attestation-revocation-panel" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <h2 className="text-[var(--terminal-green)] text-lg font-bold">Attestation Revocation</h2>

      <RevocationSummary attestations={attestations} />

      <AttestationRevocationProgress revoked={revokedCount} total={attestations.length} />

      {pendingToRevoke > 0 && (
        <button
          data-testid="revoke-all-button"
          onClick={() => setShowConfirm(true)}
          disabled={isProcessing}
          className={`w-full py-2 border text-sm ${
            isProcessing
              ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
              : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-black'
          }`}
        >
          {isProcessing ? 'Processing...' : `Revoke All (${pendingToRevoke})`}
        </button>
      )}

      <AttestationRevocationList attestations={attestations} />

      <RevocationConfirmDialog
        open={showConfirm}
        count={pendingToRevoke}
        onConfirm={() => {
          setShowConfirm(false);
          onRevokeAll();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// =============================================================================
// useAttestationRevocation Hook
// =============================================================================

interface UseAttestationRevocationReturn {
  pendingCount: number;
  revokingCount: number;
  revokedCount: number;
  failedCount: number;
  attestationTypes: string[];
  isProcessing: boolean;
  overallProgress: number;
}

export function useAttestationRevocation(
  attestations: AttestationToRevoke[]
): UseAttestationRevocationReturn {
  const pendingCount = useMemo(
    () => attestations.filter((a) => a.status === 'pending').length,
    [attestations]
  );

  const revokingCount = useMemo(
    () => attestations.filter((a) => a.status === 'revoking').length,
    [attestations]
  );

  const revokedCount = useMemo(
    () => attestations.filter((a) => a.status === 'revoked').length,
    [attestations]
  );

  const failedCount = useMemo(
    () => attestations.filter((a) => a.status === 'failed').length,
    [attestations]
  );

  const attestationTypes = useMemo(
    () => [...new Set(attestations.map((a) => a.type))],
    [attestations]
  );

  const isProcessing = useMemo(
    () => revokingCount > 0,
    [revokingCount]
  );

  const overallProgress = useMemo(() => {
    if (attestations.length === 0) return 0;
    return Math.round((revokedCount / attestations.length) * 100);
  }, [attestations.length, revokedCount]);

  return {
    pendingCount,
    revokingCount,
    revokedCount,
    failedCount,
    attestationTypes,
    isProcessing,
    overallProgress,
  };
}
