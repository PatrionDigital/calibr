/**
 * Reputation Sync System Components
 * Task 6.4.5: Create reputation syncing system
 *
 * Regular updates from external reputation platforms.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'pending' | 'idle';
export type SyncPlatform = 'optimism' | 'coinbase' | 'gitcoin' | 'ens';

export interface SyncResult {
  platform: SyncPlatform;
  success: boolean;
  syncedAt: number;
  itemsSynced: number;
  duration: number;
  error: string | null;
}

export interface SyncSchedule {
  platform: SyncPlatform;
  enabled: boolean;
  interval: number;
  lastSync: number;
  nextSync: number | null;
}

export interface SyncProgress {
  current: number;
  total: number;
}

// =============================================================================
// Constants
// =============================================================================

const PLATFORM_ICONS: Record<SyncPlatform, string> = {
  optimism: '🔴',
  coinbase: '🔵',
  gitcoin: '🟢',
  ens: '📛',
};

const PLATFORM_NAMES: Record<SyncPlatform, string> = {
  optimism: 'Optimism Collective',
  coinbase: 'Coinbase',
  gitcoin: 'Gitcoin Passport',
  ens: 'ENS',
};

const INTERVAL_OPTIONS = [
  { value: 3600000, label: '1 hour' },
  { value: 21600000, label: '6 hours' },
  { value: 43200000, label: '12 hours' },
  { value: 86400000, label: '24 hours' },
  { value: 604800000, label: '7 days' },
];

// =============================================================================
// ReputationSyncBadge
// =============================================================================

interface ReputationSyncBadgeProps {
  status: SyncStatus;
  lastSynced?: number;
  compact?: boolean;
}

export function ReputationSyncBadge({ status, lastSynced, compact }: ReputationSyncBadgeProps) {
  const statusColors: Record<SyncStatus, string> = {
    synced: 'text-green-400',
    syncing: 'text-yellow-400',
    error: 'text-red-400',
    pending: 'text-blue-400',
    idle: 'text-zinc-400',
  };

  const statusIcons: Record<SyncStatus, string> = {
    synced: '✓',
    syncing: '⟳',
    error: '✗',
    pending: '◌',
    idle: '○',
  };

  return (
    <span
      data-testid="sync-badge"
      className={`inline-flex items-center gap-1 font-mono text-xs rounded ${statusColors[status]} ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      } bg-zinc-800/50`}
    >
      {status === 'syncing' ? (
        <span data-testid="sync-spinner" className="animate-spin">
          {statusIcons[status]}
        </span>
      ) : (
        <span>{statusIcons[status]}</span>
      )}
      <span className="capitalize">{status}</span>
      {lastSynced && (
        <span data-testid="last-synced" className="text-[hsl(var(--muted-foreground))] ml-1">
          {new Date(lastSynced).toLocaleTimeString()}
        </span>
      )}
    </span>
  );
}

// =============================================================================
// ReputationSyncProgress
// =============================================================================

interface ReputationSyncProgressProps {
  current: number;
  total?: number;
  platform?: SyncPlatform;
  showCount?: boolean;
  indeterminate?: boolean;
}

export function ReputationSyncProgress({
  current,
  total = 0,
  platform,
  showCount,
  indeterminate,
}: ReputationSyncProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div data-testid="sync-progress" className="space-y-1">
      {platform && (
        <div className="flex justify-between text-xs">
          <span className="text-[hsl(var(--muted-foreground))] capitalize">{platform}</span>
          <span className="font-mono">{percentage}%</span>
        </div>
      )}
      {!platform && (
        <div className="text-right text-xs font-mono">{percentage}%</div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 bg-zinc-800 rounded overflow-hidden"
      >
        {indeterminate ? (
          <div
            data-testid="indeterminate-progress"
            className="h-full w-1/3 bg-blue-400 animate-pulse"
          />
        ) : (
          <div
            data-testid="progress-fill"
            className="h-full bg-blue-400 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {showCount && (
        <div className="text-xs text-[hsl(var(--muted-foreground))] text-center font-mono">
          {current} / {total}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ReputationSyncHistory
// =============================================================================

interface ReputationSyncHistoryProps {
  history: SyncResult[];
  maxEntries?: number;
  filterPlatform?: SyncPlatform;
}

export function ReputationSyncHistory({
  history,
  maxEntries,
  filterPlatform,
}: ReputationSyncHistoryProps) {
  const filteredHistory = useMemo(() => {
    let result = history;
    if (filterPlatform) {
      result = result.filter((h) => h.platform === filterPlatform);
    }
    if (maxEntries) {
      result = result.slice(0, maxEntries);
    }
    return result;
  }, [history, maxEntries, filterPlatform]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (filteredHistory.length === 0) {
    return (
      <div data-testid="sync-history" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No sync history</p>
      </div>
    );
  }

  return (
    <div data-testid="sync-history" className="space-y-2">
      {filteredHistory.map((entry, index) => (
        <div
          key={`${entry.platform}-${entry.syncedAt}-${index}`}
          data-testid="history-entry"
          className="ascii-box p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>{PLATFORM_ICONS[entry.platform]}</span>
              <span className="font-mono text-sm capitalize">{entry.platform}</span>
              {entry.success ? (
                <span data-testid="success-indicator" className="text-green-400 text-xs">
                  ✓
                </span>
              ) : (
                <span data-testid="failure-indicator" className="text-red-400 text-xs">
                  ✗
                </span>
              )}
            </div>
            <span
              data-testid="sync-timestamp"
              className="text-xs text-[hsl(var(--muted-foreground))] font-mono"
            >
              {new Date(entry.syncedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">
              {entry.success ? `${entry.itemsSynced} items` : entry.error}
            </span>
            <span className="font-mono text-[hsl(var(--muted-foreground))]">
              {formatDuration(entry.duration)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// ReputationSyncScheduler
// =============================================================================

interface ReputationSyncSchedulerProps {
  schedules: SyncSchedule[];
  onUpdate: (platform: SyncPlatform, updates: Partial<SyncSchedule>) => void;
  isLoading?: boolean;
}

export function ReputationSyncScheduler({
  schedules,
  onUpdate,
  isLoading,
}: ReputationSyncSchedulerProps) {
  const formatInterval = (ms: number) => {
    const option = INTERVAL_OPTIONS.find((o) => o.value === ms);
    return option?.label ?? `${ms / 3600000} hours`;
  };

  return (
    <div data-testid="sync-scheduler" className="space-y-3">
      <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
        Sync Schedules
      </h3>
      {schedules.map((schedule) => (
        <div
          key={schedule.platform}
          data-testid="schedule-item"
          className="ascii-box p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span>{PLATFORM_ICONS[schedule.platform]}</span>
            <div>
              <div className="font-mono text-sm capitalize">{schedule.platform}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                {formatInterval(schedule.interval)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {schedule.enabled && schedule.nextSync && (
              <span
                data-testid="next-sync"
                className="text-xs text-[hsl(var(--muted-foreground))] font-mono"
              >
                Next: {new Date(schedule.nextSync).toLocaleTimeString()}
              </span>
            )}
            <select
              data-testid="interval-select"
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
              value={schedule.interval}
              onChange={(e) =>
                onUpdate(schedule.platform, { interval: Number(e.target.value) })
              }
              disabled={isLoading}
            >
              {INTERVAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              role="switch"
              aria-checked={schedule.enabled}
              data-testid="enabled-indicator"
              onClick={() => onUpdate(schedule.platform, { enabled: !schedule.enabled })}
              disabled={isLoading}
              className={`w-10 h-5 rounded-full transition-colors ${
                schedule.enabled ? 'bg-green-400/30' : 'bg-zinc-700'
              } relative`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                  schedule.enabled ? 'left-5 bg-green-400' : 'left-0.5 bg-zinc-400'
                }`}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// PlatformSyncCard
// =============================================================================

interface PlatformSyncCardProps {
  platform: SyncPlatform;
  status: SyncStatus;
  lastSync: number;
  onSync: (platform: SyncPlatform) => void;
  progress?: SyncProgress;
  error?: string;
  itemCount?: number;
}

export function PlatformSyncCard({
  platform,
  status,
  lastSync,
  onSync,
  progress,
  error,
  itemCount,
}: PlatformSyncCardProps) {
  return (
    <div
      data-testid="platform-sync-card"
      className="ascii-box p-4 border-blue-400/30 border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span data-testid="platform-icon" className="text-xl">
            {PLATFORM_ICONS[platform]}
          </span>
          <div>
            <div className="font-mono font-bold">{PLATFORM_NAMES[platform]}</div>
            <div
              data-testid="last-sync-time"
              className="text-xs text-[hsl(var(--muted-foreground))]"
            >
              Last sync: {new Date(lastSync).toLocaleString()}
            </div>
          </div>
        </div>
        <ReputationSyncBadge status={status} compact />
      </div>

      {status === 'syncing' && progress && (
        <div className="mb-3">
          <ReputationSyncProgress current={progress.current} total={progress.total} />
        </div>
      )}

      {status === 'error' && error && (
        <div className="mb-3 p-2 bg-red-400/10 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        {itemCount !== undefined && (
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            <span className="font-mono font-bold text-foreground">{itemCount}</span> items
          </span>
        )}
        <button
          onClick={() => onSync(platform)}
          disabled={status === 'syncing'}
          className="px-3 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          {status === 'syncing' ? '⟳ Syncing...' : '↻ Sync'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SyncErrorAlert
// =============================================================================

interface SyncErrorAlertProps {
  platform: SyncPlatform;
  error: string;
  timestamp?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function SyncErrorAlert({
  platform,
  error,
  timestamp,
  onRetry,
  onDismiss,
}: SyncErrorAlertProps) {
  return (
    <div
      data-testid="sync-error-alert"
      className="ascii-box p-3 border-red-400/30 border bg-red-400/5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="text-red-400">⚠</span>
          <div>
            <div className="font-mono text-sm">
              <span className="capitalize">{platform}</span> sync failed
            </div>
            <p className="text-xs text-red-400 mt-1">{error}</p>
            {timestamp && (
              <span
                data-testid="error-timestamp"
                className="text-xs text-[hsl(var(--muted-foreground))] mt-1 block"
              >
                {new Date(timestamp).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-2 py-1 text-xs font-mono bg-red-400/20 text-red-400 rounded hover:bg-red-400/30"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-2 py-1 text-xs font-mono bg-zinc-700 text-zinc-400 rounded hover:bg-zinc-600"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ReputationSyncDashboard
// =============================================================================

interface ReputationSyncDashboardProps {
  platforms: SyncPlatform[];
  history: SyncResult[];
  schedules: SyncSchedule[];
  onSync: (platform: SyncPlatform | 'all') => void;
  onScheduleUpdate: (platform: SyncPlatform, updates: Partial<SyncSchedule>) => void;
  isLoading?: boolean;
  platformStatuses?: Record<SyncPlatform, SyncStatus>;
  platformProgress?: Record<SyncPlatform, SyncProgress>;
  platformErrors?: Record<SyncPlatform, string>;
  platformItemCounts?: Record<SyncPlatform, number>;
}

export function ReputationSyncDashboard({
  platforms,
  history,
  schedules,
  onSync,
  onScheduleUpdate,
  isLoading,
  platformStatuses = {} as Record<SyncPlatform, SyncStatus>,
  platformProgress = {} as Record<SyncPlatform, SyncProgress>,
  platformErrors = {} as Record<SyncPlatform, string>,
  platformItemCounts = {} as Record<SyncPlatform, number>,
}: ReputationSyncDashboardProps) {
  const totalSynced = useMemo(() => {
    return history
      .filter((h) => h.success)
      .reduce((sum, h) => sum + h.itemsSynced, 0);
  }, [history]);

  const lastSyncByPlatform = useMemo(() => {
    const result: Record<SyncPlatform, SyncResult | undefined> = {
      optimism: undefined,
      coinbase: undefined,
      gitcoin: undefined,
      ens: undefined,
    };
    for (const entry of history) {
      if (!result[entry.platform] || entry.syncedAt > result[entry.platform]!.syncedAt) {
        result[entry.platform] = entry;
      }
    }
    return result;
  }, [history]);

  const failedSyncs = useMemo(() => {
    return history.filter((h) => !h.success).slice(0, 1);
  }, [history]);

  const overallStatus = useMemo((): SyncStatus => {
    const statuses = Object.values(platformStatuses);
    if (statuses.some((s) => s === 'syncing')) return 'syncing';
    if (statuses.some((s) => s === 'error')) return 'error';
    if (statuses.every((s) => s === 'synced')) return 'synced';
    return 'idle';
  }, [platformStatuses]);

  if (isLoading) {
    return (
      <div data-testid="sync-dashboard" className="space-y-6">
        <div data-testid="loading-indicator" className="ascii-box p-6 text-center">
          <span className="animate-spin inline-block">⟳</span>
          <span className="ml-2">Loading sync data...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="sync-dashboard" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Reputation Sync</h2>
            <div className="flex items-center gap-4 mt-1">
              <div data-testid="overall-status">
                <ReputationSyncBadge status={overallStatus} />
              </div>
              <div data-testid="sync-summary" className="text-xs text-[hsl(var(--muted-foreground))]">
                {history.length > 0 && (
                  <>Last sync: {new Date(history[0]!.syncedAt).toLocaleString()}</>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div data-testid="total-synced" className="text-right">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Total Synced</div>
              <div className="font-mono font-bold">{totalSynced}</div>
            </div>
            <button
              onClick={() => onSync('all')}
              className="px-4 py-2 text-sm font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
            >
              ↻ Sync All
            </button>
          </div>
        </div>
      </div>

      {/* Error Alerts */}
      {failedSyncs.map((sync) => (
        <SyncErrorAlert
          key={`${sync.platform}-${sync.syncedAt}`}
          platform={sync.platform}
          error={sync.error ?? 'Unknown error'}
          timestamp={sync.syncedAt}
          onRetry={() => onSync(sync.platform)}
        />
      ))}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const lastSync = lastSyncByPlatform[platform];
          return (
            <PlatformSyncCard
              key={platform}
              platform={platform}
              status={platformStatuses[platform] ?? 'idle'}
              lastSync={lastSync?.syncedAt ?? Date.now()}
              onSync={onSync}
              progress={platformProgress[platform]}
              error={platformErrors[platform]}
              itemCount={platformItemCounts[platform]}
            />
          );
        })}
      </div>

      {/* Scheduler */}
      <ReputationSyncScheduler
        schedules={schedules}
        onUpdate={onScheduleUpdate}
        isLoading={isLoading}
      />

      {/* History */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Sync History
        </h3>
        <ReputationSyncHistory history={history} maxEntries={10} />
      </div>
    </div>
  );
}

// =============================================================================
// useReputationSync Hook
// =============================================================================

export function useReputationSync(address: string) {
  const [platforms] = useState<SyncPlatform[]>(['optimism', 'coinbase', 'gitcoin', 'ens']);
  const [history, setHistory] = useState<SyncResult[]>([]);
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformStatuses, setPlatformStatuses] = useState<Record<SyncPlatform, SyncStatus>>({
    optimism: 'idle',
    coinbase: 'idle',
    gitcoin: 'idle',
    ens: 'idle',
  });

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate loading data
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Initialize schedules
      setSchedules([
        {
          platform: 'optimism',
          enabled: true,
          interval: 3600000,
          lastSync: Date.now() - 1800000,
          nextSync: Date.now() + 1800000,
        },
        {
          platform: 'coinbase',
          enabled: true,
          interval: 86400000,
          lastSync: Date.now() - 43200000,
          nextSync: Date.now() + 43200000,
        },
        {
          platform: 'gitcoin',
          enabled: true,
          interval: 3600000,
          lastSync: Date.now() - 3000000,
          nextSync: Date.now() + 600000,
        },
        {
          platform: 'ens',
          enabled: true,
          interval: 86400000,
          lastSync: Date.now() - 86400000,
          nextSync: Date.now(),
        },
      ]);

      // Initialize history
      setHistory([
        {
          platform: 'optimism',
          success: true,
          syncedAt: Date.now() - 1800000,
          itemsSynced: 15,
          duration: 1200,
          error: null,
        },
        {
          platform: 'coinbase',
          success: true,
          syncedAt: Date.now() - 43200000,
          itemsSynced: 3,
          duration: 800,
          error: null,
        },
      ]);

      setPlatformStatuses({
        optimism: 'synced',
        coinbase: 'synced',
        gitcoin: 'synced',
        ens: 'synced',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [address, initialize]);

  const syncPlatform = useCallback(async (platform: SyncPlatform) => {
    setIsSyncing(true);
    setPlatformStatuses((prev) => ({ ...prev, [platform]: 'syncing' }));

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result: SyncResult = {
        platform,
        success: true,
        syncedAt: Date.now(),
        itemsSynced: Math.floor(Math.random() * 20) + 1,
        duration: Math.floor(Math.random() * 2000) + 500,
        error: null,
      };

      setHistory((prev) => [result, ...prev]);
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'synced' }));
    } catch (err) {
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const syncAll = useCallback(async () => {
    setIsSyncing(true);
    for (const platform of platforms) {
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'syncing' }));
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const results: SyncResult[] = platforms.map((platform) => ({
        platform,
        success: true,
        syncedAt: Date.now(),
        itemsSynced: Math.floor(Math.random() * 20) + 1,
        duration: Math.floor(Math.random() * 2000) + 500,
        error: null,
      }));

      setHistory((prev) => [...results, ...prev]);
      setPlatformStatuses({
        optimism: 'synced',
        coinbase: 'synced',
        gitcoin: 'synced',
        ens: 'synced',
      });
    } catch (err) {
      // Handle error
    } finally {
      setIsSyncing(false);
    }
  }, [platforms]);

  const updateSchedule = useCallback(
    (platform: SyncPlatform, updates: Partial<SyncSchedule>) => {
      setSchedules((prev) =>
        prev.map((s) => (s.platform === platform ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const getStatus = useCallback(
    (platform: SyncPlatform) => platformStatuses[platform],
    [platformStatuses]
  );

  return {
    platforms,
    history,
    schedules,
    isLoading,
    isSyncing,
    error,
    platformStatuses,
    syncPlatform,
    syncAll,
    updateSchedule,
    getStatus,
  };
}
