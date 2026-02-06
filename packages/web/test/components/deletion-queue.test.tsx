/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  DeletionQueueItem,
  DeletionQueueStatus,
} from '../../src/components/deletion-queue';
import {
  QueueItemCard,
  QueueItemStatus,
  QueueProgressBar,
  QueueRetryButton,
  QueueItemActions,
  QueueList,
  QueueSummary,
  QueueEmptyState,
  DeletionQueuePanel,
  useDeletionQueue,
} from '../../src/components/deletion-queue';

// =============================================================================
// Test Data
// =============================================================================

const mockQueueItems: DeletionQueueItem[] = [
  {
    id: 'del-1',
    type: 'forecasts',
    label: 'Delete Forecasts',
    itemCount: 42,
    status: 'completed',
    progress: 100,
    createdAt: '2025-01-15T10:00:00Z',
    completedAt: '2025-01-15T10:05:00Z',
    error: null,
    retryCount: 0,
  },
  {
    id: 'del-2',
    type: 'positions',
    label: 'Delete Positions',
    itemCount: 15,
    status: 'processing',
    progress: 60,
    createdAt: '2025-01-15T10:10:00Z',
    completedAt: null,
    error: null,
    retryCount: 0,
  },
  {
    id: 'del-3',
    type: 'attestations',
    label: 'Revoke Attestations',
    itemCount: 8,
    status: 'pending',
    progress: 0,
    createdAt: '2025-01-15T10:15:00Z',
    completedAt: null,
    error: null,
    retryCount: 0,
  },
  {
    id: 'del-4',
    type: 'off-chain',
    label: 'Delete Off-chain Data',
    itemCount: 25,
    status: 'failed',
    progress: 45,
    createdAt: '2025-01-15T09:00:00Z',
    completedAt: null,
    error: 'IPFS gateway timeout',
    retryCount: 2,
  },
];

// =============================================================================
// QueueItemCard Tests
// =============================================================================

describe('QueueItemCard', () => {
  it('renders card', () => {
    render(<QueueItemCard item={mockQueueItems[0]!} />);
    expect(screen.getByTestId('queue-item-card')).toBeInTheDocument();
  });

  it('shows item label', () => {
    render(<QueueItemCard item={mockQueueItems[0]!} />);
    expect(screen.getByText('Delete Forecasts')).toBeInTheDocument();
  });

  it('shows item count', () => {
    render(<QueueItemCard item={mockQueueItems[0]!} />);
    const card = screen.getByTestId('queue-item-card');
    expect(card).toHaveTextContent('42');
  });

  it('shows created date', () => {
    render(<QueueItemCard item={mockQueueItems[0]!} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('shows completed status', () => {
    render(<QueueItemCard item={mockQueueItems[0]!} />);
    const card = screen.getByTestId('queue-item-card');
    expect(card).toHaveTextContent(/completed/i);
  });

  it('shows processing status', () => {
    render(<QueueItemCard item={mockQueueItems[1]!} />);
    const card = screen.getByTestId('queue-item-card');
    expect(card).toHaveTextContent(/processing/i);
  });

  it('shows error message for failed items', () => {
    render(<QueueItemCard item={mockQueueItems[3]!} />);
    expect(screen.getByText(/ipfs gateway timeout/i)).toBeInTheDocument();
  });
});

// =============================================================================
// QueueItemStatus Tests
// =============================================================================

describe('QueueItemStatus', () => {
  it('renders status badge', () => {
    render(<QueueItemStatus status="completed" />);
    expect(screen.getByTestId('queue-item-status')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<QueueItemStatus status="pending" />);
    const status = screen.getByTestId('queue-item-status');
    expect(status).toHaveTextContent(/pending/i);
  });

  it('shows processing status', () => {
    render(<QueueItemStatus status="processing" />);
    const status = screen.getByTestId('queue-item-status');
    expect(status).toHaveTextContent(/processing/i);
  });

  it('shows completed status', () => {
    render(<QueueItemStatus status="completed" />);
    const status = screen.getByTestId('queue-item-status');
    expect(status).toHaveTextContent(/completed/i);
  });

  it('shows failed status', () => {
    render(<QueueItemStatus status="failed" />);
    const status = screen.getByTestId('queue-item-status');
    expect(status).toHaveTextContent(/failed/i);
  });

  it('has appropriate styling for status', () => {
    render(<QueueItemStatus status="failed" />);
    const status = screen.getByTestId('queue-item-status');
    expect(status.className).toMatch(/red|error|failed/i);
  });
});

// =============================================================================
// QueueProgressBar Tests
// =============================================================================

describe('QueueProgressBar', () => {
  it('renders progress bar', () => {
    render(<QueueProgressBar progress={60} />);
    expect(screen.getByTestId('queue-progress-bar')).toBeInTheDocument();
  });

  it('shows progress percentage', () => {
    render(<QueueProgressBar progress={60} />);
    const bar = screen.getByTestId('queue-progress-bar');
    expect(bar).toHaveTextContent('60%');
  });

  it('shows 0% progress', () => {
    render(<QueueProgressBar progress={0} />);
    const bar = screen.getByTestId('queue-progress-bar');
    expect(bar).toHaveTextContent('0%');
  });

  it('shows 100% progress', () => {
    render(<QueueProgressBar progress={100} />);
    const bar = screen.getByTestId('queue-progress-bar');
    expect(bar).toHaveTextContent('100%');
  });

  it('has visual progress indicator', () => {
    render(<QueueProgressBar progress={60} />);
    expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
  });
});

// =============================================================================
// QueueRetryButton Tests
// =============================================================================

describe('QueueRetryButton', () => {
  it('renders retry button', () => {
    render(<QueueRetryButton onRetry={() => {}} retryCount={1} />);
    expect(screen.getByTestId('queue-retry-button')).toBeInTheDocument();
  });

  it('shows retry count', () => {
    render(<QueueRetryButton onRetry={() => {}} retryCount={2} />);
    const button = screen.getByTestId('queue-retry-button');
    expect(button).toHaveTextContent(/2/);
  });

  it('calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<QueueRetryButton onRetry={onRetry} retryCount={1} />);
    fireEvent.click(screen.getByTestId('queue-retry-button'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('disables after max retries', () => {
    render(<QueueRetryButton onRetry={() => {}} retryCount={3} maxRetries={3} />);
    const button = screen.getByTestId('queue-retry-button');
    expect(button).toBeDisabled();
  });
});

// =============================================================================
// QueueItemActions Tests
// =============================================================================

describe('QueueItemActions', () => {
  it('renders actions', () => {
    render(<QueueItemActions item={mockQueueItems[3]!} onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('queue-item-actions')).toBeInTheDocument();
  });

  it('shows retry for failed items', () => {
    render(<QueueItemActions item={mockQueueItems[3]!} onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('queue-retry-button')).toBeInTheDocument();
  });

  it('shows cancel for pending items', () => {
    render(<QueueItemActions item={mockQueueItems[2]!} onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<QueueItemActions item={mockQueueItems[2]!} onRetry={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalledWith('del-3');
  });

  it('hides actions for completed items', () => {
    render(<QueueItemActions item={mockQueueItems[0]!} onRetry={() => {}} onCancel={() => {}} />);
    const actions = screen.getByTestId('queue-item-actions');
    expect(actions.children.length).toBe(0);
  });
});

// =============================================================================
// QueueList Tests
// =============================================================================

describe('QueueList', () => {
  it('renders list', () => {
    render(<QueueList items={mockQueueItems} onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('queue-list')).toBeInTheDocument();
  });

  it('shows all items', () => {
    render(<QueueList items={mockQueueItems} onRetry={() => {}} onCancel={() => {}} />);
    const cards = screen.getAllByTestId('queue-item-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state when no items', () => {
    render(<QueueList items={[]} onRetry={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('queue-empty-state')).toBeInTheDocument();
  });
});

// =============================================================================
// QueueSummary Tests
// =============================================================================

describe('QueueSummary', () => {
  it('renders summary', () => {
    render(<QueueSummary items={mockQueueItems} />);
    expect(screen.getByTestId('queue-summary')).toBeInTheDocument();
  });

  it('shows total count', () => {
    render(<QueueSummary items={mockQueueItems} />);
    const summary = screen.getByTestId('queue-summary');
    expect(summary).toHaveTextContent('4');
  });

  it('shows completed count', () => {
    render(<QueueSummary items={mockQueueItems} />);
    const summary = screen.getByTestId('queue-summary');
    expect(summary).toHaveTextContent(/1.*completed/i);
  });

  it('shows pending count', () => {
    render(<QueueSummary items={mockQueueItems} />);
    const summary = screen.getByTestId('queue-summary');
    expect(summary).toHaveTextContent(/pending/i);
  });

  it('shows failed count', () => {
    render(<QueueSummary items={mockQueueItems} />);
    const summary = screen.getByTestId('queue-summary');
    expect(summary).toHaveTextContent(/1.*failed/i);
  });
});

// =============================================================================
// QueueEmptyState Tests
// =============================================================================

describe('QueueEmptyState', () => {
  it('renders empty state', () => {
    render(<QueueEmptyState />);
    expect(screen.getByTestId('queue-empty-state')).toBeInTheDocument();
  });

  it('shows empty message', () => {
    render(<QueueEmptyState />);
    expect(screen.getByText(/no deletion requests|queue is empty/i)).toBeInTheDocument();
  });
});

// =============================================================================
// DeletionQueuePanel Tests
// =============================================================================

describe('DeletionQueuePanel', () => {
  it('renders panel', () => {
    render(<DeletionQueuePanel items={mockQueueItems} />);
    expect(screen.getByTestId('deletion-queue-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<DeletionQueuePanel items={mockQueueItems} />);
    expect(screen.getAllByText(/deletion|queue/i).length).toBeGreaterThan(0);
  });

  it('shows summary', () => {
    render(<DeletionQueuePanel items={mockQueueItems} />);
    expect(screen.getByTestId('queue-summary')).toBeInTheDocument();
  });

  it('shows queue list', () => {
    render(<DeletionQueuePanel items={mockQueueItems} />);
    expect(screen.getByTestId('queue-list')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DeletionQueuePanel items={[]} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = vi.fn();
    render(<DeletionQueuePanel items={mockQueueItems} onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('queue-retry-button'));
    expect(onRetry).toHaveBeenCalledWith('del-4');
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<DeletionQueuePanel items={mockQueueItems} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-button'));
    expect(onCancel).toHaveBeenCalled();
  });
});

// =============================================================================
// useDeletionQueue Hook Tests
// =============================================================================

describe('useDeletionQueue', () => {
  function TestComponent({ items }: { items: DeletionQueueItem[] }) {
    const {
      queueItems,
      pendingCount,
      processingCount,
      completedCount,
      failedCount,
      hasActiveItems,
      overallProgress,
    } = useDeletionQueue(items);

    return (
      <div>
        <span data-testid="total-count">{queueItems.length}</span>
        <span data-testid="pending-count">{pendingCount}</span>
        <span data-testid="processing-count">{processingCount}</span>
        <span data-testid="completed-count">{completedCount}</span>
        <span data-testid="failed-count">{failedCount}</span>
        <span data-testid="has-active">{hasActiveItems ? 'yes' : 'no'}</span>
        <span data-testid="overall-progress">{overallProgress}</span>
      </div>
    );
  }

  it('counts total items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('total-count')).toHaveTextContent('4');
  });

  it('counts pending items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
  });

  it('counts processing items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('processing-count')).toHaveTextContent('1');
  });

  it('counts completed items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('completed-count')).toHaveTextContent('1');
  });

  it('counts failed items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('failed-count')).toHaveTextContent('1');
  });

  it('detects active items', () => {
    render(<TestComponent items={mockQueueItems} />);
    expect(screen.getByTestId('has-active')).toHaveTextContent('yes');
  });

  it('calculates overall progress', () => {
    render(<TestComponent items={mockQueueItems} />);
    const progress = parseInt(screen.getByTestId('overall-progress').textContent!);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('handles empty queue', () => {
    render(<TestComponent items={[]} />);
    expect(screen.getByTestId('total-count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-active')).toHaveTextContent('no');
  });
});
