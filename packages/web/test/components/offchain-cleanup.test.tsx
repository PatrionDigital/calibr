/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  OffchainDataItem,
  OffchainDataType,
  CleanupStatus,
} from '../../src/components/offchain-cleanup';
import {
  OffchainDataCard,
  OffchainDataStatus,
  OffchainDataTypeIcon,
  CleanupProgressBar,
  OffchainDataList,
  CleanupSummary,
  CleanupConfirmDialog,
  CleanupWarningBanner,
  OffchainCleanupPanel,
  useOffchainCleanup,
} from '../../src/components/offchain-cleanup';

// =============================================================================
// Test Data
// =============================================================================

const mockDataItems: OffchainDataItem[] = [
  {
    id: 'data-1',
    type: 'ipfs',
    label: 'Forecast Data CID',
    cid: 'QmX9abc123def456',
    size: 1024,
    createdAt: '2024-06-15T10:00:00Z',
    status: 'pending',
    error: null,
  },
  {
    id: 'data-2',
    type: 'supabase',
    label: 'User Preferences',
    table: 'user_settings',
    recordId: 'usr_123',
    createdAt: '2024-07-20T14:30:00Z',
    status: 'deleted',
    error: null,
  },
  {
    id: 'data-3',
    type: 'redis',
    label: 'Session Cache',
    key: 'session:usr_123',
    createdAt: '2024-08-01T09:00:00Z',
    status: 'deleting',
    error: null,
  },
  {
    id: 'data-4',
    type: 'blob',
    label: 'Avatar Image',
    url: 'https://blob.storage/avatars/usr_123.png',
    createdAt: '2024-05-01T09:00:00Z',
    status: 'failed',
    error: 'Storage service unavailable',
  },
];

// =============================================================================
// OffchainDataStatus Tests
// =============================================================================

describe('OffchainDataStatus', () => {
  it('renders status badge', () => {
    render(<OffchainDataStatus status="pending" />);
    expect(screen.getByTestId('offchain-data-status')).toBeInTheDocument();
  });

  it('shows pending status', () => {
    render(<OffchainDataStatus status="pending" />);
    const status = screen.getByTestId('offchain-data-status');
    expect(status).toHaveTextContent(/pending/i);
  });

  it('shows deleting status', () => {
    render(<OffchainDataStatus status="deleting" />);
    const status = screen.getByTestId('offchain-data-status');
    expect(status).toHaveTextContent(/deleting/i);
  });

  it('shows deleted status', () => {
    render(<OffchainDataStatus status="deleted" />);
    const status = screen.getByTestId('offchain-data-status');
    expect(status).toHaveTextContent(/deleted/i);
  });

  it('shows failed status', () => {
    render(<OffchainDataStatus status="failed" />);
    const status = screen.getByTestId('offchain-data-status');
    expect(status).toHaveTextContent(/failed/i);
  });

  it('has appropriate styling for status', () => {
    render(<OffchainDataStatus status="deleted" />);
    const status = screen.getByTestId('offchain-data-status');
    expect(status.className).toMatch(/green|success/i);
  });
});

// =============================================================================
// OffchainDataTypeIcon Tests
// =============================================================================

describe('OffchainDataTypeIcon', () => {
  it('renders icon', () => {
    render(<OffchainDataTypeIcon type="ipfs" />);
    expect(screen.getByTestId('offchain-type-icon')).toBeInTheDocument();
  });

  it('shows IPFS icon', () => {
    render(<OffchainDataTypeIcon type="ipfs" />);
    const icon = screen.getByTestId('offchain-type-icon');
    expect(icon).toHaveTextContent(/ipfs/i);
  });

  it('shows Supabase icon', () => {
    render(<OffchainDataTypeIcon type="supabase" />);
    const icon = screen.getByTestId('offchain-type-icon');
    expect(icon).toHaveTextContent(/supabase|db/i);
  });

  it('shows Redis icon', () => {
    render(<OffchainDataTypeIcon type="redis" />);
    const icon = screen.getByTestId('offchain-type-icon');
    expect(icon).toHaveTextContent(/redis|cache/i);
  });

  it('shows Blob icon', () => {
    render(<OffchainDataTypeIcon type="blob" />);
    const icon = screen.getByTestId('offchain-type-icon');
    expect(icon).toHaveTextContent(/blob|file/i);
  });
});

// =============================================================================
// OffchainDataCard Tests
// =============================================================================

describe('OffchainDataCard', () => {
  it('renders card', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    expect(screen.getByTestId('offchain-data-card')).toBeInTheDocument();
  });

  it('shows data label', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    expect(screen.getByText('Forecast Data CID')).toBeInTheDocument();
  });

  it('shows data type', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    const card = screen.getByTestId('offchain-data-card');
    expect(card).toHaveTextContent(/ipfs/i);
  });

  it('shows CID for IPFS items', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    const card = screen.getByTestId('offchain-data-card');
    expect(card).toHaveTextContent(/QmX9abc/);
  });

  it('shows table for Supabase items', () => {
    render(<OffchainDataCard item={mockDataItems[1]!} />);
    const card = screen.getByTestId('offchain-data-card');
    expect(card).toHaveTextContent(/user_settings/);
  });

  it('shows key for Redis items', () => {
    render(<OffchainDataCard item={mockDataItems[2]!} />);
    const card = screen.getByTestId('offchain-data-card');
    expect(card).toHaveTextContent(/session:usr_123/);
  });

  it('shows URL for Blob items', () => {
    render(<OffchainDataCard item={mockDataItems[3]!} />);
    const card = screen.getByTestId('offchain-data-card');
    expect(card).toHaveTextContent(/avatar/i);
  });

  it('shows status badge', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    expect(screen.getByTestId('offchain-data-status')).toBeInTheDocument();
  });

  it('shows error for failed items', () => {
    render(<OffchainDataCard item={mockDataItems[3]!} />);
    expect(screen.getByText(/storage service unavailable/i)).toBeInTheDocument();
  });

  it('shows created date', () => {
    render(<OffchainDataCard item={mockDataItems[0]!} />);
    expect(screen.getAllByText(/jun/i).length).toBeGreaterThan(0);
  });
});

// =============================================================================
// CleanupProgressBar Tests
// =============================================================================

describe('CleanupProgressBar', () => {
  it('renders progress bar', () => {
    render(<CleanupProgressBar deleted={2} total={4} />);
    expect(screen.getByTestId('cleanup-progress-bar')).toBeInTheDocument();
  });

  it('shows counts', () => {
    render(<CleanupProgressBar deleted={2} total={4} />);
    const bar = screen.getByTestId('cleanup-progress-bar');
    expect(bar).toHaveTextContent('2');
    expect(bar).toHaveTextContent('4');
  });

  it('shows percentage', () => {
    render(<CleanupProgressBar deleted={2} total={4} />);
    const bar = screen.getByTestId('cleanup-progress-bar');
    expect(bar).toHaveTextContent('50%');
  });

  it('shows progress fill', () => {
    render(<CleanupProgressBar deleted={2} total={4} />);
    expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
  });
});

// =============================================================================
// OffchainDataList Tests
// =============================================================================

describe('OffchainDataList', () => {
  it('renders list', () => {
    render(<OffchainDataList items={mockDataItems} />);
    expect(screen.getByTestId('offchain-data-list')).toBeInTheDocument();
  });

  it('shows all items', () => {
    render(<OffchainDataList items={mockDataItems} />);
    const cards = screen.getAllByTestId('offchain-data-card');
    expect(cards.length).toBe(4);
  });

  it('shows empty state when no items', () => {
    render(<OffchainDataList items={[]} />);
    expect(screen.getByText(/no off-chain data/i)).toBeInTheDocument();
  });
});

// =============================================================================
// CleanupSummary Tests
// =============================================================================

describe('CleanupSummary', () => {
  it('renders summary', () => {
    render(<CleanupSummary items={mockDataItems} />);
    expect(screen.getByTestId('cleanup-summary')).toBeInTheDocument();
  });

  it('shows total count', () => {
    render(<CleanupSummary items={mockDataItems} />);
    const summary = screen.getByTestId('cleanup-summary');
    expect(summary).toHaveTextContent('4');
  });

  it('shows pending count', () => {
    render(<CleanupSummary items={mockDataItems} />);
    const summary = screen.getByTestId('cleanup-summary');
    expect(summary).toHaveTextContent(/1.*pending/i);
  });

  it('shows deleted count', () => {
    render(<CleanupSummary items={mockDataItems} />);
    const summary = screen.getByTestId('cleanup-summary');
    expect(summary).toHaveTextContent(/1.*deleted/i);
  });

  it('shows failed count', () => {
    render(<CleanupSummary items={mockDataItems} />);
    const summary = screen.getByTestId('cleanup-summary');
    expect(summary).toHaveTextContent(/1.*failed/i);
  });
});

// =============================================================================
// CleanupConfirmDialog Tests
// =============================================================================

describe('CleanupConfirmDialog', () => {
  it('renders dialog', () => {
    render(<CleanupConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByTestId('cleanup-confirm-dialog')).toBeInTheDocument();
  });

  it('shows item count', () => {
    render(<CleanupConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('shows warning message', () => {
    render(<CleanupConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/cannot be undone|irreversible|permanent/i)).toBeInTheDocument();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = vi.fn();
    render(<CleanupConfirmDialog open={true} count={4} onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByTestId('confirm-cleanup-button'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancelled', () => {
    const onCancel = vi.fn();
    render(<CleanupConfirmDialog open={true} count={4} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-cleanup-button'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('hides when not open', () => {
    render(<CleanupConfirmDialog open={false} count={4} onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByTestId('cleanup-confirm-dialog')).not.toBeInTheDocument();
  });
});

// =============================================================================
// CleanupWarningBanner Tests
// =============================================================================

describe('CleanupWarningBanner', () => {
  it('renders banner', () => {
    render(<CleanupWarningBanner />);
    expect(screen.getByTestId('cleanup-warning-banner')).toBeInTheDocument();
  });

  it('shows IPFS warning', () => {
    render(<CleanupWarningBanner />);
    const banner = screen.getByTestId('cleanup-warning-banner');
    expect(banner).toHaveTextContent(/ipfs|pinned|distributed/i);
  });

  it('shows permanence warning', () => {
    render(<CleanupWarningBanner />);
    const banner = screen.getByTestId('cleanup-warning-banner');
    expect(banner).toHaveTextContent(/permanent|unpin|remove/i);
  });
});

// =============================================================================
// OffchainCleanupPanel Tests
// =============================================================================

describe('OffchainCleanupPanel', () => {
  it('renders panel', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getByTestId('offchain-cleanup-panel')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getAllByText(/off-chain|cleanup/i).length).toBeGreaterThan(0);
  });

  it('shows summary', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getByTestId('cleanup-summary')).toBeInTheDocument();
  });

  it('shows data list', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getByTestId('offchain-data-list')).toBeInTheDocument();
  });

  it('shows warning banner', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getByTestId('cleanup-warning-banner')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<OffchainCleanupPanel items={[]} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows cleanup all button', () => {
    render(<OffchainCleanupPanel items={mockDataItems} />);
    expect(screen.getByTestId('cleanup-all-button')).toBeInTheDocument();
  });

  it('opens confirm dialog when cleanup clicked', () => {
    // Use items without "deleting" status so button is not disabled
    const nonProcessingItems = mockDataItems.map((i) =>
      i.status === 'deleting' ? { ...i, status: 'pending' as const } : i
    );
    render(<OffchainCleanupPanel items={nonProcessingItems} onCleanupAll={() => {}} />);
    fireEvent.click(screen.getByTestId('cleanup-all-button'));
    expect(screen.getByTestId('cleanup-confirm-dialog')).toBeInTheDocument();
  });
});

// =============================================================================
// useOffchainCleanup Hook Tests
// =============================================================================

describe('useOffchainCleanup', () => {
  function TestComponent({ items }: { items: OffchainDataItem[] }) {
    const {
      pendingCount,
      deletingCount,
      deletedCount,
      failedCount,
      dataTypes,
      isProcessing,
      overallProgress,
      totalSize,
    } = useOffchainCleanup(items);

    return (
      <div>
        <span data-testid="pending-count">{pendingCount}</span>
        <span data-testid="deleting-count">{deletingCount}</span>
        <span data-testid="deleted-count">{deletedCount}</span>
        <span data-testid="failed-count">{failedCount}</span>
        <span data-testid="type-count">{dataTypes.length}</span>
        <span data-testid="is-processing">{isProcessing ? 'yes' : 'no'}</span>
        <span data-testid="overall-progress">{overallProgress}</span>
        <span data-testid="total-size">{totalSize}</span>
      </div>
    );
  }

  it('counts pending items', () => {
    render(<TestComponent items={mockDataItems} />);
    expect(screen.getByTestId('pending-count')).toHaveTextContent('1');
  });

  it('counts deleting items', () => {
    render(<TestComponent items={mockDataItems} />);
    expect(screen.getByTestId('deleting-count')).toHaveTextContent('1');
  });

  it('counts deleted items', () => {
    render(<TestComponent items={mockDataItems} />);
    expect(screen.getByTestId('deleted-count')).toHaveTextContent('1');
  });

  it('counts failed items', () => {
    render(<TestComponent items={mockDataItems} />);
    expect(screen.getByTestId('failed-count')).toHaveTextContent('1');
  });

  it('extracts data types', () => {
    render(<TestComponent items={mockDataItems} />);
    const count = parseInt(screen.getByTestId('type-count').textContent!);
    expect(count).toBe(4); // ipfs, supabase, redis, blob
  });

  it('detects processing state', () => {
    render(<TestComponent items={mockDataItems} />);
    expect(screen.getByTestId('is-processing')).toHaveTextContent('yes');
  });

  it('calculates overall progress', () => {
    render(<TestComponent items={mockDataItems} />);
    const progress = parseInt(screen.getByTestId('overall-progress').textContent!);
    expect(progress).toBe(25); // 1 deleted out of 4
  });

  it('calculates total size', () => {
    render(<TestComponent items={mockDataItems} />);
    const size = parseInt(screen.getByTestId('total-size').textContent!);
    expect(size).toBe(1024); // Only first item has size
  });

  it('handles empty items', () => {
    render(<TestComponent items={[]} />);
    expect(screen.getByTestId('pending-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-processing')).toHaveTextContent('no');
    expect(screen.getByTestId('overall-progress')).toHaveTextContent('0');
  });
});
