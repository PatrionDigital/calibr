'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type DeletionQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DeletionQueueItem {
  id: string;
  type: string;
  label: string;
  itemCount: number;
  status: DeletionQueueStatus;
  progress: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
}

// =============================================================================
// QueueItemStatus Component
// =============================================================================

interface QueueItemStatusProps {
  status: DeletionQueueStatus;
}

const STATUS_CONFIG: Record<DeletionQueueStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-yellow-400' },
  processing: { label: 'Processing', className: 'text-blue-400 animate-pulse' },
  completed: { label: 'Completed', className: 'text-green-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function QueueItemStatus({ status }: QueueItemStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="queue-item-status"
      className={`font-mono text-xs px-2 py-0.5 border border-current ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// QueueProgressBar Component
// =============================================================================

interface QueueProgressBarProps {
  progress: number;
}

export function QueueProgressBar({ progress }: QueueProgressBarProps) {
  return (
    <div data-testid="queue-progress-bar" className="font-mono">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[var(--terminal-dim)] text-xs">Progress</span>
        <span className="text-[var(--terminal-green)] text-xs">{progress}%</span>
      </div>
      <div className="h-2 border border-[var(--terminal-dim)] overflow-hidden">
        <div
          data-testid="progress-fill"
          className="h-full bg-[var(--terminal-green)]"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// QueueRetryButton Component
// =============================================================================

interface QueueRetryButtonProps {
  onRetry: () => void;
  retryCount: number;
  maxRetries?: number;
}

export function QueueRetryButton({ onRetry, retryCount, maxRetries = 3 }: QueueRetryButtonProps) {
  const disabled = retryCount >= maxRetries;

  return (
    <button
      data-testid="queue-retry-button"
      onClick={onRetry}
      disabled={disabled}
      className={`font-mono text-xs px-2 py-1 border ${
        disabled
          ? 'border-[var(--terminal-dim)] text-[var(--terminal-dim)] cursor-not-allowed'
          : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black'
      }`}
    >
      Retry ({retryCount}/{maxRetries})
    </button>
  );
}

// =============================================================================
// QueueItemActions Component
// =============================================================================

interface QueueItemActionsProps {
  item: DeletionQueueItem;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export function QueueItemActions({ item, onRetry, onCancel }: QueueItemActionsProps) {
  return (
    <div data-testid="queue-item-actions" className="flex gap-2">
      {item.status === 'failed' && (
        <QueueRetryButton
          onRetry={() => onRetry(item.id)}
          retryCount={item.retryCount}
        />
      )}
      {item.status === 'pending' && (
        <button
          data-testid="cancel-button"
          onClick={() => onCancel(item.id)}
          className="font-mono text-xs px-2 py-1 border border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

// =============================================================================
// QueueItemCard Component
// =============================================================================

interface QueueItemCardProps {
  item: DeletionQueueItem;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function QueueItemCard({ item, onRetry, onCancel }: QueueItemCardProps) {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="queue-item-card"
      className="border border-[var(--terminal-dim)] font-mono p-3 space-y-2"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[var(--terminal-green)] font-bold text-sm">{item.label}</div>
          <div className="text-[var(--terminal-dim)] text-xs">{item.itemCount} items</div>
        </div>
        <QueueItemStatus status={item.status} />
      </div>

      {item.status === 'processing' && <QueueProgressBar progress={item.progress} />}

      {item.error && (
        <div className="text-red-400 text-xs border border-red-400 p-2">
          Error: {item.error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-[var(--terminal-dim)] text-xs">{date}</span>
        {onRetry && onCancel && (
          <QueueItemActions item={item} onRetry={onRetry} onCancel={onCancel} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// QueueEmptyState Component
// =============================================================================

export function QueueEmptyState() {
  return (
    <div
      data-testid="queue-empty-state"
      className="text-center py-8 font-mono text-[var(--terminal-dim)]"
    >
      <div className="text-2xl mb-2">○</div>
      <div className="text-sm">No deletion requests in queue</div>
    </div>
  );
}

// =============================================================================
// QueueList Component
// =============================================================================

interface QueueListProps {
  items: DeletionQueueItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

export function QueueList({ items, onRetry, onCancel }: QueueListProps) {
  if (items.length === 0) {
    return <QueueEmptyState />;
  }

  return (
    <div data-testid="queue-list" className="space-y-3">
      {items.map((item) => (
        <QueueItemCard
          key={item.id}
          item={item}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

// =============================================================================
// QueueSummary Component
// =============================================================================

interface QueueSummaryProps {
  items: DeletionQueueItem[];
}

export function QueueSummary({ items }: QueueSummaryProps) {
  const counts = useMemo(() => {
    const result = { pending: 0, processing: 0, completed: 0, failed: 0 };
    items.forEach((item) => {
      result[item.status]++;
    });
    return result;
  }, [items]);

  return (
    <div data-testid="queue-summary" className="font-mono">
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
          <div className="text-green-400 font-bold">{counts.completed}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Completed</div>
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
// DeletionQueuePanel Component
// =============================================================================

interface DeletionQueuePanelProps {
  items: DeletionQueueItem[];
  loading?: boolean;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function DeletionQueuePanel({
  items,
  loading = false,
  onRetry = () => {},
  onCancel = () => {},
}: DeletionQueuePanelProps) {
  if (loading) {
    return (
      <div data-testid="deletion-queue-panel" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading deletion queue...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="deletion-queue-panel" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <h2 className="text-[var(--terminal-green)] text-lg font-bold">Deletion Queue</h2>
      <QueueSummary items={items} />
      <QueueList items={items} onRetry={onRetry} onCancel={onCancel} />
    </div>
  );
}

// =============================================================================
// useDeletionQueue Hook
// =============================================================================

interface UseDeletionQueueReturn {
  queueItems: DeletionQueueItem[];
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  hasActiveItems: boolean;
  overallProgress: number;
}

export function useDeletionQueue(items: DeletionQueueItem[]): UseDeletionQueueReturn {
  const queueItems = items;

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === 'pending').length,
    [items]
  );

  const processingCount = useMemo(
    () => items.filter((i) => i.status === 'processing').length,
    [items]
  );

  const completedCount = useMemo(
    () => items.filter((i) => i.status === 'completed').length,
    [items]
  );

  const failedCount = useMemo(
    () => items.filter((i) => i.status === 'failed').length,
    [items]
  );

  const hasActiveItems = useMemo(
    () => pendingCount > 0 || processingCount > 0,
    [pendingCount, processingCount]
  );

  const overallProgress = useMemo(() => {
    if (items.length === 0) return 0;
    const totalProgress = items.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / items.length);
  }, [items]);

  return {
    queueItems,
    pendingCount,
    processingCount,
    completedCount,
    failedCount,
    hasActiveItems,
    overallProgress,
  };
}
