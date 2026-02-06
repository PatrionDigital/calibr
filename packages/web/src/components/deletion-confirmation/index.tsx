'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type DeletionCategory = 'forecasts' | 'positions' | 'attestations' | 'offchain';
export type DeletionStatus = 'completed' | 'partial' | 'failed';

export interface DeletionResult {
  id: string;
  category: DeletionCategory;
  label: string;
  itemsDeleted: number;
  itemsFailed: number;
  completedAt: string | null;
  status: DeletionStatus;
  error: string | null;
}

export interface DeletionSummary {
  requestId: string;
  requestedAt: string;
  completedAt: string | null;
  totalItemsDeleted: number;
  totalItemsFailed: number;
  status: DeletionStatus;
  results: DeletionResult[];
}

// =============================================================================
// DeletionCategoryIcon Component
// =============================================================================

interface DeletionCategoryIconProps {
  category: DeletionCategory;
}

const CATEGORY_CONFIG: Record<DeletionCategory, { label: string; icon: string }> = {
  forecasts: { label: 'Forecasts', icon: '[FORECAST]' },
  positions: { label: 'Positions', icon: '[TRADE]' },
  attestations: { label: 'EAS Attestations', icon: '[ATTEST]' },
  offchain: { label: 'Off-chain Data', icon: '[DATA]' },
};

export function DeletionCategoryIcon({ category }: DeletionCategoryIconProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <span
      data-testid="deletion-category-icon"
      className="font-mono text-xs text-[var(--terminal-green)]"
    >
      {config.icon}
    </span>
  );
}

// =============================================================================
// DeletionCategoryStatus Component
// =============================================================================

interface DeletionCategoryStatusProps {
  status: DeletionStatus;
}

const STATUS_CONFIG: Record<DeletionStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'text-green-400' },
  partial: { label: 'Partial', className: 'text-yellow-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function DeletionCategoryStatus({ status }: DeletionCategoryStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid="deletion-category-status"
      className={`font-mono text-xs px-2 py-0.5 border border-current ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// DeletionCategoryCard Component
// =============================================================================

interface DeletionCategoryCardProps {
  result: DeletionResult;
}

export function DeletionCategoryCard({ result }: DeletionCategoryCardProps) {
  const completedDate = result.completedAt
    ? new Date(result.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending';

  return (
    <div
      data-testid="deletion-category-card"
      className="border border-[var(--terminal-dim)] font-mono p-3 space-y-2"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <DeletionCategoryIcon category={result.category} />
          <div>
            <div className="text-[var(--terminal-green)] font-bold text-sm">{result.label}</div>
            <div className="text-[var(--terminal-dim)] text-xs">{result.itemsDeleted} items deleted</div>
          </div>
        </div>
        <DeletionCategoryStatus status={result.status} />
      </div>

      {result.itemsFailed > 0 && (
        <div className="text-yellow-400 text-xs">
          {result.itemsFailed} items failed to delete
        </div>
      )}

      {result.error && (
        <div className="text-red-400 text-xs border border-red-400 p-2">
          Error: {result.error}
        </div>
      )}

      <div className="text-[var(--terminal-dim)] text-xs">{completedDate}</div>
    </div>
  );
}

// =============================================================================
// DeletionResultList Component
// =============================================================================

interface DeletionResultListProps {
  results: DeletionResult[];
}

export function DeletionResultList({ results }: DeletionResultListProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 font-mono text-[var(--terminal-dim)]">
        No deletion results available
      </div>
    );
  }

  return (
    <div data-testid="deletion-result-list" className="space-y-3">
      {results.map((result) => (
        <DeletionCategoryCard key={result.id} result={result} />
      ))}
    </div>
  );
}

// =============================================================================
// DeletionSummaryStats Component
// =============================================================================

interface DeletionSummaryStatsProps {
  summary: DeletionSummary;
}

export function DeletionSummaryStats({ summary }: DeletionSummaryStatsProps) {
  return (
    <div data-testid="deletion-summary-stats" className="font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs mb-1">Request ID</div>
          <div className="text-[var(--terminal-green)] font-bold text-sm">{summary.requestId}</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3">
          <div className="text-[var(--terminal-dim)] text-xs mb-1">Status</div>
          <div className={`font-bold text-sm ${
            summary.status === 'completed' ? 'text-green-400' :
            summary.status === 'partial' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-[var(--terminal-dim)] p-3 text-center">
          <div className="text-green-400 font-bold text-2xl">{summary.totalItemsDeleted}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Items Deleted</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-3 text-center">
          <div className="text-red-400 font-bold text-2xl">{summary.totalItemsFailed}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Items Failed</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DeletionTimelineItem Component
// =============================================================================

interface DeletionTimelineItemProps {
  result: DeletionResult;
  index: number;
  total: number;
}

export function DeletionTimelineItem({ result, index, total }: DeletionTimelineItemProps) {
  const isLast = index === total - 1;
  const statusIcon = result.status === 'completed' ? '✓' : result.status === 'partial' ? '!' : '✗';

  return (
    <div data-testid="deletion-timeline-item" className="flex font-mono">
      <div className="flex flex-col items-center mr-3">
        <div className={`w-6 h-6 border flex items-center justify-center text-xs ${
          result.status === 'completed' ? 'border-green-400 text-green-400' :
          result.status === 'partial' ? 'border-yellow-400 text-yellow-400' :
          'border-red-400 text-red-400'
        }`}>
          {statusIcon}
        </div>
        {!isLast && (
          <div className="w-px h-8 bg-[var(--terminal-dim)]" />
        )}
      </div>
      <div className="flex-1 pb-4">
        <div className="text-[var(--terminal-green)] text-sm font-bold">{result.label}</div>
        <div className="text-[var(--terminal-dim)] text-xs">
          {result.itemsDeleted} deleted
          {result.itemsFailed > 0 && `, ${result.itemsFailed} failed`}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DeletionTimeline Component
// =============================================================================

interface DeletionTimelineProps {
  results: DeletionResult[];
}

export function DeletionTimeline({ results }: DeletionTimelineProps) {
  return (
    <div data-testid="deletion-timeline" className="font-mono">
      {results.map((result, index) => (
        <DeletionTimelineItem
          key={result.id}
          result={result}
          index={index}
          total={results.length}
        />
      ))}
    </div>
  );
}

// =============================================================================
// DeletionReceiptCard Component
// =============================================================================

interface DeletionReceiptCardProps {
  summary: DeletionSummary;
}

export function DeletionReceiptCard({ summary }: DeletionReceiptCardProps) {
  const requestDate = new Date(summary.requestedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const completedDate = summary.completedAt
    ? new Date(summary.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'In Progress';

  return (
    <div
      data-testid="deletion-receipt-card"
      className="border border-[var(--terminal-green)] font-mono p-4 space-y-3"
    >
      <div className="text-[var(--terminal-green)] font-bold text-lg border-b border-[var(--terminal-dim)] pb-2">
        Deletion Receipt
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div className="text-[var(--terminal-dim)]">Request ID:</div>
        <div className="text-[var(--terminal-green)]">{summary.requestId}</div>

        <div className="text-[var(--terminal-dim)]">Requested:</div>
        <div className="text-[var(--terminal-green)]">{requestDate}</div>

        <div className="text-[var(--terminal-dim)]">Completed:</div>
        <div className="text-[var(--terminal-green)]">{completedDate}</div>

        <div className="text-[var(--terminal-dim)]">Items Deleted:</div>
        <div className="text-green-400 font-bold">{summary.totalItemsDeleted}</div>

        <div className="text-[var(--terminal-dim)]">Items Failed:</div>
        <div className="text-red-400 font-bold">{summary.totalItemsFailed}</div>

        <div className="text-[var(--terminal-dim)]">Status:</div>
        <div className={`font-bold ${
          summary.status === 'completed' ? 'text-green-400' :
          summary.status === 'partial' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {summary.status.toUpperCase()}
        </div>
      </div>

      <div className="border-t border-[var(--terminal-dim)] pt-2 text-xs text-[var(--terminal-dim)]">
        This receipt confirms your data deletion request has been processed.
      </div>
    </div>
  );
}

// =============================================================================
// DownloadReceiptButton Component
// =============================================================================

interface DownloadReceiptButtonProps {
  summary: DeletionSummary;
  onDownload?: () => void;
}

export function DownloadReceiptButton({ summary, onDownload }: DownloadReceiptButtonProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior - create JSON receipt
      const receipt = {
        ...summary,
        generatedAt: new Date().toISOString(),
        type: 'GDPR_DELETION_RECEIPT',
      };
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deletion-receipt-${summary.requestId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      data-testid="download-receipt-button"
      onClick={handleDownload}
      className="w-full font-mono text-sm py-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:text-black"
    >
      Download Receipt
    </button>
  );
}

// =============================================================================
// DeletionConfirmationPanel Component
// =============================================================================

interface DeletionConfirmationPanelProps {
  summary: DeletionSummary | null;
  loading?: boolean;
  onDownload?: () => void;
}

export function DeletionConfirmationPanel({
  summary,
  loading = false,
  onDownload,
}: DeletionConfirmationPanelProps) {
  if (loading || !summary) {
    return (
      <div data-testid="deletion-confirmation-panel" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">
            Processing deletion request...
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = summary.status === 'completed';

  return (
    <div data-testid="deletion-confirmation-panel" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <div className="text-center">
        <div className={`text-4xl mb-2 ${isSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
          {isSuccess ? '✓' : '!'}
        </div>
        <h2 className={`text-lg font-bold ${isSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
          {isSuccess ? 'Deletion Complete' : 'Deletion Partially Complete'}
        </h2>
        <p className="text-[var(--terminal-dim)] text-sm mt-1">
          Your data deletion request has been processed successfully.
        </p>
      </div>

      <DeletionSummaryStats summary={summary} />

      <div>
        <h3 className="text-[var(--terminal-green)] text-sm font-bold mb-3">Deletion Progress</h3>
        <DeletionTimeline results={summary.results} />
      </div>

      <DeletionReceiptCard summary={summary} />

      <DownloadReceiptButton summary={summary} onDownload={onDownload} />

      <div className="text-center text-[var(--terminal-dim)] text-xs">
        Keep this receipt for your records. It serves as confirmation of your GDPR data deletion request.
      </div>
    </div>
  );
}

// =============================================================================
// useDeletionConfirmation Hook
// =============================================================================

interface UseDeletionConfirmationReturn {
  isComplete: boolean;
  hasErrors: boolean;
  successCount: number;
  failureCount: number;
  categoriesProcessed: number;
  overallStatus: DeletionStatus | 'pending';
  completionPercentage: number;
}

export function useDeletionConfirmation(
  summary: DeletionSummary | null
): UseDeletionConfirmationReturn {
  const isComplete = useMemo(
    () => summary?.status === 'completed' || summary?.status === 'partial',
    [summary]
  );

  const hasErrors = useMemo(
    () => (summary?.totalItemsFailed ?? 0) > 0,
    [summary]
  );

  const successCount = useMemo(
    () => summary?.totalItemsDeleted ?? 0,
    [summary]
  );

  const failureCount = useMemo(
    () => summary?.totalItemsFailed ?? 0,
    [summary]
  );

  const categoriesProcessed = useMemo(
    () => summary?.results.length ?? 0,
    [summary]
  );

  const overallStatus = useMemo(
    () => summary?.status ?? 'pending',
    [summary]
  );

  const completionPercentage = useMemo(() => {
    if (!summary) return 0;
    const total = summary.totalItemsDeleted + summary.totalItemsFailed;
    if (total === 0) return 100;
    return Math.round((summary.totalItemsDeleted / total) * 100);
  }, [summary]);

  return {
    isComplete,
    hasErrors,
    successCount,
    failureCount,
    categoriesProcessed,
    overallStatus,
    completionPercentage,
  };
}
