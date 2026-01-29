/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { SyncStatus, SyncPlatform, SyncResult, SyncSchedule } from '../../src/components/reputation-sync';
import {
  ReputationSyncBadge,
  ReputationSyncProgress,
  ReputationSyncHistory,
  ReputationSyncScheduler,
  ReputationSyncDashboard,
  PlatformSyncCard,
  SyncErrorAlert,
  useReputationSync,
} from '../../src/components/reputation-sync';

// =============================================================================
// Test Data
// =============================================================================

const mockSyncResult: SyncResult = {
  platform: 'optimism',
  success: true,
  syncedAt: new Date('2024-01-15T10:30:00').getTime(),
  itemsSynced: 42,
  duration: 1500,
  error: null,
};

const mockFailedSyncResult: SyncResult = {
  platform: 'gitcoin',
  success: false,
  syncedAt: new Date('2024-01-15T09:00:00').getTime(),
  itemsSynced: 0,
  duration: 500,
  error: 'Rate limit exceeded',
};

const mockSyncSchedule: SyncSchedule = {
  platform: 'optimism',
  enabled: true,
  interval: 3600000, // 1 hour
  lastSync: new Date('2024-01-15T10:30:00').getTime(),
  nextSync: new Date('2024-01-15T11:30:00').getTime(),
};

const mockSyncHistory: SyncResult[] = [
  mockSyncResult,
  {
    platform: 'coinbase',
    success: true,
    syncedAt: new Date('2024-01-15T09:30:00').getTime(),
    itemsSynced: 5,
    duration: 800,
    error: null,
  },
  mockFailedSyncResult,
  {
    platform: 'ens',
    success: true,
    syncedAt: new Date('2024-01-15T08:00:00').getTime(),
    itemsSynced: 12,
    duration: 1200,
    error: null,
  },
];

const mockSchedules: SyncSchedule[] = [
  mockSyncSchedule,
  {
    platform: 'coinbase',
    enabled: true,
    interval: 86400000, // 24 hours
    lastSync: new Date('2024-01-15T09:30:00').getTime(),
    nextSync: new Date('2024-01-16T09:30:00').getTime(),
  },
  {
    platform: 'gitcoin',
    enabled: false,
    interval: 3600000,
    lastSync: new Date('2024-01-15T09:00:00').getTime(),
    nextSync: null,
  },
  {
    platform: 'ens',
    enabled: true,
    interval: 86400000,
    lastSync: new Date('2024-01-15T08:00:00').getTime(),
    nextSync: new Date('2024-01-16T08:00:00').getTime(),
  },
];

// =============================================================================
// ReputationSyncBadge Tests
// =============================================================================

describe('ReputationSyncBadge', () => {
  it('renders synced status correctly', () => {
    render(<ReputationSyncBadge status="synced" />);
    expect(screen.getByTestId('sync-badge')).toBeInTheDocument();
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  it('renders syncing status with spinner', () => {
    render(<ReputationSyncBadge status="syncing" />);
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    expect(screen.getByTestId('sync-spinner')).toBeInTheDocument();
  });

  it('renders error status', () => {
    render(<ReputationSyncBadge status="error" />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('renders pending status', () => {
    render(<ReputationSyncBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('renders idle status', () => {
    render(<ReputationSyncBadge status="idle" />);
    expect(screen.getByText(/idle/i)).toBeInTheDocument();
  });

  it('displays last synced time when provided', () => {
    const lastSynced = new Date('2024-01-15T10:30:00').getTime();
    render(<ReputationSyncBadge status="synced" lastSynced={lastSynced} />);
    expect(screen.getByTestId('last-synced')).toBeInTheDocument();
  });

  it('applies correct styling for each status', () => {
    const { rerender } = render(<ReputationSyncBadge status="synced" />);
    expect(screen.getByTestId('sync-badge')).toHaveClass('text-green-400');

    rerender(<ReputationSyncBadge status="error" />);
    expect(screen.getByTestId('sync-badge')).toHaveClass('text-red-400');

    rerender(<ReputationSyncBadge status="syncing" />);
    expect(screen.getByTestId('sync-badge')).toHaveClass('text-yellow-400');
  });

  it('renders compact variant', () => {
    render(<ReputationSyncBadge status="synced" compact />);
    const badge = screen.getByTestId('sync-badge');
    expect(badge).toHaveClass('px-1.5');
  });
});

// =============================================================================
// ReputationSyncProgress Tests
// =============================================================================

describe('ReputationSyncProgress', () => {
  it('renders progress bar', () => {
    render(<ReputationSyncProgress current={5} total={10} />);
    expect(screen.getByTestId('sync-progress')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct percentage', () => {
    render(<ReputationSyncProgress current={5} total={10} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays platform name when provided', () => {
    render(<ReputationSyncProgress current={5} total={10} platform="optimism" />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
  });

  it('handles zero total gracefully', () => {
    render(<ReputationSyncProgress current={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows item count when enabled', () => {
    render(<ReputationSyncProgress current={5} total={10} showCount />);
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('renders indeterminate state when total is unknown', () => {
    render(<ReputationSyncProgress current={5} indeterminate />);
    expect(screen.getByTestId('indeterminate-progress')).toBeInTheDocument();
  });

  it('applies correct width to progress bar', () => {
    render(<ReputationSyncProgress current={75} total={100} />);
    const progressBar = screen.getByTestId('progress-fill');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });
});

// =============================================================================
// ReputationSyncHistory Tests
// =============================================================================

describe('ReputationSyncHistory', () => {
  it('renders sync history list', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getByTestId('sync-history')).toBeInTheDocument();
  });

  it('displays all history entries', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(4);
  });

  it('shows platform names', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
    expect(screen.getByText(/coinbase/i)).toBeInTheDocument();
    expect(screen.getByText(/gitcoin/i)).toBeInTheDocument();
    expect(screen.getByText(/ens/i)).toBeInTheDocument();
  });

  it('displays success/failure indicators', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    const successIndicators = screen.getAllByTestId('success-indicator');
    const failureIndicators = screen.getAllByTestId('failure-indicator');
    expect(successIndicators.length).toBe(3);
    expect(failureIndicators.length).toBe(1);
  });

  it('shows items synced count', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getByText(/42 items/i)).toBeInTheDocument();
    expect(screen.getByText(/5 items/i)).toBeInTheDocument();
  });

  it('displays error message for failed syncs', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  });

  it('shows sync timestamps', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    const timestamps = screen.getAllByTestId('sync-timestamp');
    expect(timestamps.length).toBe(4);
  });

  it('displays duration for each sync', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} />);
    expect(screen.getByText(/1\.5s/i)).toBeInTheDocument();
  });

  it('renders empty state when no history', () => {
    render(<ReputationSyncHistory history={[]} />);
    expect(screen.getByText(/no sync history/i)).toBeInTheDocument();
  });

  it('limits displayed entries when maxEntries is set', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} maxEntries={2} />);
    expect(screen.getAllByTestId('history-entry').length).toBe(2);
  });

  it('filters by platform when specified', () => {
    render(<ReputationSyncHistory history={mockSyncHistory} filterPlatform="optimism" />);
    expect(screen.getAllByTestId('history-entry').length).toBe(1);
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationSyncScheduler Tests
// =============================================================================

describe('ReputationSyncScheduler', () => {
  it('renders scheduler interface', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('sync-scheduler')).toBeInTheDocument();
  });

  it('displays all platform schedules', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} />);
    expect(screen.getAllByTestId('schedule-item').length).toBe(4);
  });

  it('shows enabled/disabled status', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} />);
    const enabledIndicators = screen.getAllByTestId('enabled-indicator');
    expect(enabledIndicators.length).toBeGreaterThan(0);
  });

  it('displays sync intervals', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} />);
    expect(screen.getAllByText(/1 hour/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/24 hours/i).length).toBeGreaterThan(0);
  });

  it('shows next sync time for enabled schedules', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} />);
    const nextSyncElements = screen.getAllByTestId('next-sync');
    expect(nextSyncElements.length).toBe(3); // 3 enabled schedules
  });

  it('calls onUpdate when schedule is toggled', () => {
    const onUpdate = vi.fn();
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={onUpdate} />);
    const toggles = screen.getAllByRole('switch');
    fireEvent.click(toggles[0]!);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('calls onUpdate when interval is changed', () => {
    const onUpdate = vi.fn();
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={onUpdate} />);
    const selects = screen.getAllByTestId('interval-select');
    fireEvent.change(selects[0]!, { target: { value: '86400000' } });
    expect(onUpdate).toHaveBeenCalled();
  });

  it('disables controls when loading', () => {
    render(<ReputationSyncScheduler schedules={mockSchedules} onUpdate={vi.fn()} isLoading />);
    const toggles = screen.getAllByRole('switch');
    toggles.forEach((toggle) => {
      expect(toggle).toBeDisabled();
    });
  });
});

// =============================================================================
// PlatformSyncCard Tests
// =============================================================================

describe('PlatformSyncCard', () => {
  it('renders platform card', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByTestId('platform-sync-card')).toBeInTheDocument();
  });

  it('displays platform name and icon', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText(/optimism/i)).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon')).toBeInTheDocument();
  });

  it('shows sync status badge', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
  });

  it('displays last sync time', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByTestId('last-sync-time')).toBeInTheDocument();
  });

  it('shows sync button', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
  });

  it('calls onSync when sync button is clicked', () => {
    const onSync = vi.fn();
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={onSync}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    expect(onSync).toHaveBeenCalledWith('optimism');
  });

  it('disables sync button when syncing', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="syncing"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled();
  });

  it('shows progress when syncing', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="syncing"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
        progress={{ current: 5, total: 10 }}
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays error when status is error', () => {
    render(
      <PlatformSyncCard
        platform="gitcoin"
        status="error"
        lastSync={mockFailedSyncResult.syncedAt}
        onSync={vi.fn()}
        error="Rate limit exceeded"
      />
    );
    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  });

  it('shows items count when available', () => {
    render(
      <PlatformSyncCard
        platform="optimism"
        status="synced"
        lastSync={mockSyncResult.syncedAt}
        onSync={vi.fn()}
        itemCount={42}
      />
    );
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});

// =============================================================================
// SyncErrorAlert Tests
// =============================================================================

describe('SyncErrorAlert', () => {
  it('renders error alert', () => {
    render(<SyncErrorAlert platform="gitcoin" error="Rate limit exceeded" />);
    expect(screen.getByTestId('sync-error-alert')).toBeInTheDocument();
  });

  it('displays platform name', () => {
    render(<SyncErrorAlert platform="gitcoin" error="Rate limit exceeded" />);
    expect(screen.getByText(/gitcoin/i)).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<SyncErrorAlert platform="gitcoin" error="Rate limit exceeded" />);
    expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
  });

  it('displays retry button when onRetry is provided', () => {
    render(
      <SyncErrorAlert
        platform="gitcoin"
        error="Rate limit exceeded"
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <SyncErrorAlert
        platform="gitcoin"
        error="Rate limit exceeded"
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('displays dismiss button when onDismiss is provided', () => {
    render(
      <SyncErrorAlert
        platform="gitcoin"
        error="Rate limit exceeded"
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <SyncErrorAlert
        platform="gitcoin"
        error="Rate limit exceeded"
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows timestamp when provided', () => {
    const timestamp = new Date('2024-01-15T09:00:00').getTime();
    render(
      <SyncErrorAlert
        platform="gitcoin"
        error="Rate limit exceeded"
        timestamp={timestamp}
      />
    );
    expect(screen.getByTestId('error-timestamp')).toBeInTheDocument();
  });
});

// =============================================================================
// ReputationSyncDashboard Tests
// =============================================================================

describe('ReputationSyncDashboard', () => {
  const defaultProps = {
    platforms: ['optimism', 'coinbase', 'gitcoin', 'ens'] as SyncPlatform[],
    history: mockSyncHistory,
    schedules: mockSchedules,
    onSync: vi.fn(),
    onScheduleUpdate: vi.fn(),
  };

  it('renders dashboard', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('sync-dashboard')).toBeInTheDocument();
  });

  it('displays all platform cards', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getAllByTestId('platform-sync-card').length).toBe(4);
  });

  it('shows sync all button', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument();
  });

  it('calls onSync for all platforms when sync all is clicked', () => {
    const onSync = vi.fn();
    render(<ReputationSyncDashboard {...defaultProps} onSync={onSync} />);
    fireEvent.click(screen.getByRole('button', { name: /sync all/i }));
    expect(onSync).toHaveBeenCalledWith('all');
  });

  it('displays sync history section', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByText(/sync history/i)).toBeInTheDocument();
  });

  it('shows overall sync status', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('overall-status')).toBeInTheDocument();
  });

  it('displays last sync summary', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('sync-summary')).toBeInTheDocument();
  });

  it('shows error alerts for failed syncs', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('sync-error-alert')).toBeInTheDocument();
  });

  it('renders scheduler section', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('sync-scheduler')).toBeInTheDocument();
  });

  it('displays total items synced', () => {
    render(<ReputationSyncDashboard {...defaultProps} />);
    expect(screen.getByTestId('total-synced')).toBeInTheDocument();
  });

  it('handles empty history gracefully', () => {
    render(<ReputationSyncDashboard {...defaultProps} history={[]} />);
    expect(screen.getByText(/no sync history/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ReputationSyncDashboard {...defaultProps} isLoading />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// useReputationSync Hook Tests
// =============================================================================

describe('useReputationSync', () => {
  function TestComponent({ address }: { address: string }) {
    const {
      platforms,
      history,
      schedules,
      isLoading,
      isSyncing,
      error,
      syncPlatform,
      syncAll,
      updateSchedule,
      getStatus,
    } = useReputationSync(address);

    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <div data-testid="is-syncing">{isSyncing.toString()}</div>
        <div data-testid="error">{error ?? 'none'}</div>
        <div data-testid="platforms-count">{platforms.length}</div>
        <div data-testid="history-count">{history.length}</div>
        <div data-testid="schedules-count">{schedules.length}</div>
        <div data-testid="optimism-status">{getStatus('optimism')}</div>
        <button onClick={() => syncPlatform('optimism')}>Sync Optimism</button>
        <button onClick={() => syncAll()}>Sync All</button>
        <button onClick={() => updateSchedule('optimism', { enabled: false })}>
          Disable Optimism
        </button>
      </div>
    );
  }

  it('initializes with loading state', () => {
    render(<TestComponent address="0x123" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('loads platforms after initialization', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });
    expect(screen.getByTestId('platforms-count')).toHaveTextContent('4');
  });

  it('provides sync history', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('history-count')).not.toHaveTextContent('0');
    }, { timeout: 2000 });
  });

  it('provides schedules', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('schedules-count')).toHaveTextContent('4');
    }, { timeout: 2000 });
  });

  it('syncs individual platform', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Sync Optimism'));
    expect(screen.getByTestId('is-syncing')).toHaveTextContent('true');

    await waitFor(() => {
      expect(screen.getByTestId('is-syncing')).toHaveTextContent('false');
    }, { timeout: 3000 });
  });

  it('syncs all platforms', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Sync All'));
    expect(screen.getByTestId('is-syncing')).toHaveTextContent('true');
  });

  it('updates schedule', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Disable Optimism'));
    // Schedule update should be reflected
    await waitFor(() => {
      expect(screen.getByTestId('schedules-count')).toHaveTextContent('4');
    });
  });

  it('returns platform status', async () => {
    render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('optimism-status')).not.toHaveTextContent('');
    }, { timeout: 2000 });
  });

  it('handles different addresses', async () => {
    const { rerender } = render(<TestComponent address="0x123" />);
    await waitFor(() => {
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    }, { timeout: 2000 });

    rerender(<TestComponent address="0x456" />);
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });
});
