'use client';

import { useMemo, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export type CleanupStatus = 'pending' | 'deleting' | 'deleted' | 'failed';
export type OffchainDataType = 'ipfs' | 'supabase' | 'redis' | 'blob';

export interface OffchainDataItem {
  id: string;
  type: OffchainDataType;
  label: string;
  cid?: string;
  table?: string;
  recordId?: string;
  key?: string;
  url?: string;
  size?: number;
  createdAt: string;
  status: CleanupStatus;
  error: string | null;
}

// =============================================================================
// OffchainDataStatus Component
// =============================================================================

interface OffchainDataStatusProps {
  status: CleanupStatus;
}

const STATUS_CONFIG: Record<CleanupStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-yellow-400' },
  deleting: { label: 'Deleting...', className: 'text-blue-400 animate-pulse' },
  deleted: { label: 'Deleted', className: 'text-green-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function OffchainDataStatus({ status }: OffchainDataStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="offchain-data-status"
      className={`font-mono text-xs px-2 py-0.5 border border-current ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// OffchainDataTypeIcon Component
// =============================================================================

interface OffchainDataTypeIconProps {
  type: OffchainDataType;
}

const TYPE_CONFIG: Record<OffchainDataType, { label: string; icon: string }> = {
  ipfs: { label: 'IPFS', icon: '[IPFS]' },
  supabase: { label: 'Supabase DB', icon: '[DB]' },
  redis: { label: 'Redis Cache', icon: '[CACHE]' },
  blob: { label: 'Blob File', icon: '[FILE]' },
};

export function OffchainDataTypeIcon({ type }: OffchainDataTypeIconProps) {
  const config = TYPE_CONFIG[type];

  return (
    <span
      data-testid="offchain-type-icon"
      className="font-mono text-xs text-[var(--terminal-green)]"
    >
      {config.icon}
    </span>
  );
}

// =============================================================================
// OffchainDataCard Component
// =============================================================================

interface OffchainDataCardProps {
  item: OffchainDataItem;
}

export function OffchainDataCard({ item }: OffchainDataCardProps) {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getIdentifier = () => {
    switch (item.type) {
      case 'ipfs':
        return item.cid ? `CID: ${item.cid.slice(0, 12)}...` : null;
      case 'supabase':
        return item.table ? `Table: ${item.table}` : null;
      case 'redis':
        return item.key ? `Key: ${item.key}` : null;
      case 'blob':
        return item.url ? `File: ${item.url.split('/').pop()}` : null;
      default:
        return null;
    }
  };

  return (
    <div
      data-testid="offchain-data-card"
      className="border border-[var(--terminal-dim)] font-mono p-3 space-y-2"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <OffchainDataTypeIcon type={item.type} />
          <div>
            <div className="text-[var(--terminal-green)] font-bold text-sm">{item.label}</div>
            <div className="text-[var(--terminal-dim)] text-xs uppercase">{item.type}</div>
          </div>
        </div>
        <OffchainDataStatus status={item.status} />
      </div>

      {getIdentifier() && (
        <div className="text-[var(--terminal-dim)] text-xs">{getIdentifier()}</div>
      )}

      {item.size && (
        <div className="text-[var(--terminal-dim)] text-xs">
          Size: {formatBytes(item.size)}
        </div>
      )}

      {item.error && (
        <div className="text-red-400 text-xs border border-red-400 p-2">
          Error: {item.error}
        </div>
      )}

      <div className="text-[var(--terminal-dim)] text-xs">Created: {date}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// CleanupProgressBar Component
// =============================================================================

interface CleanupProgressBarProps {
  deleted: number;
  total: number;
}

export function CleanupProgressBar({ deleted, total }: CleanupProgressBarProps) {
  const percentage = total > 0 ? Math.round((deleted / total) * 100) : 0;

  return (
    <div data-testid="cleanup-progress-bar" className="font-mono">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[var(--terminal-dim)] text-xs">Cleanup Progress</span>
        <span className="text-[var(--terminal-green)] text-xs">
          {deleted} / {total} ({percentage}%)
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
// OffchainDataList Component
// =============================================================================

interface OffchainDataListProps {
  items: OffchainDataItem[];
}

export function OffchainDataList({ items }: OffchainDataListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 font-mono text-[var(--terminal-dim)]">
        No off-chain data to cleanup
      </div>
    );
  }

  return (
    <div data-testid="offchain-data-list" className="space-y-3">
      {items.map((item) => (
        <OffchainDataCard key={item.id} item={item} />
      ))}
    </div>
  );
}

// =============================================================================
// CleanupSummary Component
// =============================================================================

interface CleanupSummaryProps {
  items: OffchainDataItem[];
}

export function CleanupSummary({ items }: CleanupSummaryProps) {
  const counts = useMemo(() => {
    const result = { pending: 0, deleting: 0, deleted: 0, failed: 0 };
    items.forEach((item) => {
      result[item.status]++;
    });
    return result;
  }, [items]);

  return (
    <div data-testid="cleanup-summary" className="font-mono">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-[var(--terminal-green)] font-bold">{items.length}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Total</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-yellow-400 font-bold">{counts.pending}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Pending</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2">
          <div className="text-green-400 font-bold">{counts.deleted}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Deleted</div>
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
// CleanupConfirmDialog Component
// =============================================================================

interface CleanupConfirmDialogProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CleanupConfirmDialog({
  open,
  count,
  onConfirm,
  onCancel,
}: CleanupConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      data-testid="cleanup-confirm-dialog"
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center font-mono p-4"
    >
      <div className="border border-red-400 bg-black max-w-md w-full p-4 space-y-4">
        <div className="text-red-400 font-bold text-lg">Confirm Cleanup</div>
        <div className="text-[var(--terminal-dim)] text-sm">
          You are about to delete <span className="text-[var(--terminal-green)] font-bold">{count}</span> off-chain data items.
        </div>
        <div className="text-red-400 text-xs border border-red-400 p-2">
          Warning: This action cannot be undone. Data will be permanently removed from storage services.
        </div>
        <div className="flex gap-2">
          <button
            data-testid="cancel-cleanup-button"
            onClick={onCancel}
            className="flex-1 border border-[var(--terminal-dim)] text-[var(--terminal-dim)] py-2 text-sm hover:border-[var(--terminal-green)] hover:text-[var(--terminal-green)]"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-cleanup-button"
            onClick={onConfirm}
            className="flex-1 border border-red-400 text-red-400 py-2 text-sm hover:bg-red-400 hover:text-black"
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CleanupWarningBanner Component
// =============================================================================

export function CleanupWarningBanner() {
  return (
    <div
      data-testid="cleanup-warning-banner"
      className="font-mono border border-yellow-400 text-yellow-400 p-3 text-xs"
    >
      <div className="font-bold mb-1">IPFS Data Notice</div>
      <div className="text-[var(--terminal-dim)]">
        IPFS data is distributed across the network. While we will unpin and remove data from our nodes,
        copies may persist on other pinned nodes or gateways. This is a permanent unpin operation.
      </div>
    </div>
  );
}

// =============================================================================
// OffchainCleanupPanel Component
// =============================================================================

interface OffchainCleanupPanelProps {
  items: OffchainDataItem[];
  loading?: boolean;
  onCleanupAll?: () => void;
}

export function OffchainCleanupPanel({
  items,
  loading = false,
  onCleanupAll = () => {},
}: OffchainCleanupPanelProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { deletedCount, isProcessing } = useOffchainCleanup(items);
  const pendingToCleanup = items.filter((i) => i.status === 'pending').length;

  if (loading) {
    return (
      <div data-testid="offchain-cleanup-panel" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading off-chain data...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="offchain-cleanup-panel" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <h2 className="text-[var(--terminal-green)] text-lg font-bold">Off-Chain Data Cleanup</h2>

      <CleanupWarningBanner />

      <CleanupSummary items={items} />

      <CleanupProgressBar deleted={deletedCount} total={items.length} />

      {pendingToCleanup > 0 && (
        <button
          data-testid="cleanup-all-button"
          onClick={() => setShowConfirm(true)}
          disabled={isProcessing}
          className={`w-full py-2 border text-sm ${
            isProcessing
              ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
              : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-black'
          }`}
        >
          {isProcessing ? 'Processing...' : `Cleanup All (${pendingToCleanup})`}
        </button>
      )}

      <OffchainDataList items={items} />

      <CleanupConfirmDialog
        open={showConfirm}
        count={pendingToCleanup}
        onConfirm={() => {
          setShowConfirm(false);
          onCleanupAll();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

// =============================================================================
// useOffchainCleanup Hook
// =============================================================================

interface UseOffchainCleanupReturn {
  pendingCount: number;
  deletingCount: number;
  deletedCount: number;
  failedCount: number;
  dataTypes: OffchainDataType[];
  isProcessing: boolean;
  overallProgress: number;
  totalSize: number;
}

export function useOffchainCleanup(items: OffchainDataItem[]): UseOffchainCleanupReturn {
  const pendingCount = useMemo(
    () => items.filter((i) => i.status === 'pending').length,
    [items]
  );

  const deletingCount = useMemo(
    () => items.filter((i) => i.status === 'deleting').length,
    [items]
  );

  const deletedCount = useMemo(
    () => items.filter((i) => i.status === 'deleted').length,
    [items]
  );

  const failedCount = useMemo(
    () => items.filter((i) => i.status === 'failed').length,
    [items]
  );

  const dataTypes = useMemo(
    () => [...new Set(items.map((i) => i.type))],
    [items]
  );

  const isProcessing = useMemo(
    () => deletingCount > 0,
    [deletingCount]
  );

  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.round((deletedCount / items.length) * 100);
  }, [items.length, deletedCount]);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + (item.size || 0), 0),
    [items]
  );

  return {
    pendingCount,
    deletingCount,
    deletedCount,
    failedCount,
    dataTypes,
    isProcessing,
    overallProgress,
    totalSize,
  };
}
