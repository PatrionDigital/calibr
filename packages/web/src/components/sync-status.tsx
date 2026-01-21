'use client';

import { useState } from 'react';
import { type SyncStatus, api } from '@/lib/api';

interface SyncStatusPanelProps {
  status: SyncStatus | null;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function SyncStatusPanel({ status, onRefresh, isLoading }: SyncStatusPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: 'start' | 'stop' | 'syncMarkets' | 'syncPrices') => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'start':
          await api.startSync();
          break;
        case 'stop':
          await api.stopSync();
          break;
        case 'syncMarkets':
          await api.triggerMarketSync();
          break;
        case 'syncPrices':
          await api.triggerPriceSync();
          break;
      }
      onRefresh();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const scheduler = status?.scheduler;
  const health = status?.health;
  const stats = health?.stats;

  return (
    <div className="ascii-box p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold terminal-glow">
          [SYNC STATUS]
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs px-2 py-1 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {!status ? (
        <div className="text-[hsl(var(--muted-foreground))] text-sm">
          Loading status...
        </div>
      ) : (
        <>
          {/* Status indicators */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">SCHEDULER</div>
              <div className={scheduler?.isRunning ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--error))]'}>
                {scheduler?.isRunning ? '[RUNNING]' : '[STOPPED]'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">MARKET SYNC</div>
              <div className={scheduler?.marketSyncRunning ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'}>
                {scheduler?.marketSyncRunning ? '[SYNCING...]' : '[IDLE]'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">PRICE SYNC</div>
              <div className={scheduler?.priceSyncRunning ? 'text-[hsl(var(--warning))]' : 'text-[hsl(var(--muted-foreground))]'}>
                {scheduler?.priceSyncRunning ? '[SYNCING...]' : '[IDLE]'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mb-1">POLYMARKET</div>
              <div className={health?.polymarket?.healthy ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--error))]'}>
                {health?.polymarket?.healthy ? '[HEALTHY]' : '[ERROR]'}
              </div>
            </div>
          </div>

          {/* Timing info */}
          <div className="text-xs text-[hsl(var(--muted-foreground))] mb-4 space-y-1">
            <div>Last market sync: {formatTime(scheduler?.lastMarketSync ?? null)}</div>
            <div>Last price sync: {formatTime(scheduler?.lastPriceSync ?? null)}</div>
            <div>Sync count: {scheduler?.marketSyncCount ?? 0} market / {scheduler?.priceSyncCount ?? 0} price</div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="border-t border-[hsl(var(--border))] pt-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">TOTAL MARKETS</div>
                  <div className="text-lg font-bold">{stats.totalMarkets}</div>
                </div>
                <div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">ACTIVE</div>
                  <div className="text-lg font-bold text-[hsl(var(--bullish))]">{stats.activeMarkets}</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {scheduler?.isRunning ? (
              <ActionButton
                onClick={() => handleAction('stop')}
                loading={actionLoading === 'stop'}
                variant="danger"
              >
                STOP
              </ActionButton>
            ) : (
              <ActionButton
                onClick={() => handleAction('start')}
                loading={actionLoading === 'start'}
                variant="success"
              >
                START
              </ActionButton>
            )}
            <ActionButton
              onClick={() => handleAction('syncMarkets')}
              loading={actionLoading === 'syncMarkets'}
              disabled={scheduler?.marketSyncRunning}
            >
              SYNC MARKETS
            </ActionButton>
            <ActionButton
              onClick={() => handleAction('syncPrices')}
              loading={actionLoading === 'syncPrices'}
              disabled={scheduler?.priceSyncRunning}
            >
              SYNC PRICES
            </ActionButton>
          </div>

          {/* Recent errors */}
          {(scheduler?.errors?.length ?? 0) > 0 && (
            <div className="mt-4 border-t border-[hsl(var(--border))] pt-4">
              <div className="text-xs text-[hsl(var(--error))] mb-2">RECENT ERRORS:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {scheduler?.errors?.slice(0, 5).map((error, i) => (
                  <div key={i} className="text-xs text-[hsl(var(--muted-foreground))]">
                    [{new Date(error.timestamp).toLocaleTimeString()}] {error.type}: {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'success' | 'danger';
  children: React.ReactNode;
}

function ActionButton({ onClick, loading, disabled, variant = 'default', children }: ActionButtonProps) {
  const variantClasses = {
    default: 'hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]',
    success: 'hover:border-[hsl(var(--success))] hover:text-[hsl(var(--success))]',
    danger: 'hover:border-[hsl(var(--error))] hover:text-[hsl(var(--error))]',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`text-xs px-3 py-1.5 border border-[hsl(var(--border))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {loading ? 'WAIT...' : children}
    </button>
  );
}
