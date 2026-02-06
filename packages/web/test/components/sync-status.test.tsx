/**
 * SyncStatusPanel Component Tests
 *
 * Tests for the sync status panel that displays:
 * - Scheduler status (running/stopped)
 * - Market and price sync status
 * - Polymarket health
 * - Sync timing info
 * - Market stats
 * - Action buttons (start/stop, sync markets, sync prices)
 * - Recent errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusPanel } from '@/components/sync-status';
import type { SyncStatus } from '@/lib/api';

// =============================================================================
// Mocks
// =============================================================================

const mockApi = {
  startSync: vi.fn(),
  stopSync: vi.fn(),
  triggerMarketSync: vi.fn(),
  triggerPriceSync: vi.fn(),
};

vi.mock('@/lib/api', () => ({
  api: {
    startSync: () => mockApi.startSync(),
    stopSync: () => mockApi.stopSync(),
    triggerMarketSync: () => mockApi.triggerMarketSync(),
    triggerPriceSync: () => mockApi.triggerPriceSync(),
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const baseStatus: SyncStatus = {
  scheduler: {
    isRunning: true,
    marketSyncRunning: false,
    priceSyncRunning: false,
    lastMarketSync: '2024-01-15T10:30:00Z',
    lastPriceSync: '2024-01-15T10:35:00Z',
    marketSyncCount: 150,
    priceSyncCount: 3000,
    errors: [],
  },
  health: {
    scheduler: true,
    polymarket: {
      healthy: true,
      details: {
        polymarketApi: true,
        database: true,
      },
    },
    stats: {
      totalMarkets: 500,
      activeMarkets: 350,
      lastSync: '2024-01-15T10:35:00Z',
      recentErrors: 0,
    },
  },
};

const stoppedStatus: SyncStatus = {
  ...baseStatus,
  scheduler: {
    ...baseStatus.scheduler,
    isRunning: false,
  },
};

const syncingStatus: SyncStatus = {
  ...baseStatus,
  scheduler: {
    ...baseStatus.scheduler,
    marketSyncRunning: true,
    priceSyncRunning: true,
  },
};

const unhealthyStatus: SyncStatus = {
  ...baseStatus,
  health: {
    ...baseStatus.health,
    polymarket: {
      healthy: false,
      details: {
        polymarketApi: false,
        database: true,
      },
    },
  },
};

const statusWithErrors: SyncStatus = {
  ...baseStatus,
  scheduler: {
    ...baseStatus.scheduler,
    errors: [
      { timestamp: '2024-01-15T10:30:00Z', type: 'MarketSync', message: 'API rate limited' },
      { timestamp: '2024-01-15T10:25:00Z', type: 'PriceSync', message: 'Connection failed' },
    ],
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('SyncStatusPanel', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.startSync.mockResolvedValue(undefined);
    mockApi.stopSync.mockResolvedValue(undefined);
    mockApi.triggerMarketSync.mockResolvedValue(undefined);
    mockApi.triggerPriceSync.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders the panel title', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[SYNC STATUS]')).toBeInTheDocument();
    });

    it('renders the refresh button', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('REFRESH')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} isLoading />);
      expect(screen.getByText('LOADING...')).toBeInTheDocument();
    });

    it('shows loading message when status is null', () => {
      render(<SyncStatusPanel status={null} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('Loading status...')).toBeInTheDocument();
    });
  });

  describe('scheduler status', () => {
    it('shows RUNNING when scheduler is running', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[RUNNING]')).toBeInTheDocument();
    });

    it('shows STOPPED when scheduler is not running', () => {
      render(<SyncStatusPanel status={stoppedStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[STOPPED]')).toBeInTheDocument();
    });

    it('displays SCHEDULER label', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('SCHEDULER')).toBeInTheDocument();
    });
  });

  describe('market sync status', () => {
    it('shows IDLE when market sync is not running', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getAllByText('[IDLE]')).toHaveLength(2); // market and price sync
    });

    it('shows SYNCING when market sync is running', () => {
      render(<SyncStatusPanel status={syncingStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getAllByText('[SYNCING...]')).toHaveLength(2);
    });

    it('displays MARKET SYNC label', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('MARKET SYNC')).toBeInTheDocument();
    });
  });

  describe('price sync status', () => {
    it('displays PRICE SYNC label', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('PRICE SYNC')).toBeInTheDocument();
    });
  });

  describe('polymarket health', () => {
    it('shows HEALTHY when polymarket is healthy', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[HEALTHY]')).toBeInTheDocument();
    });

    it('shows ERROR when polymarket is unhealthy', () => {
      render(<SyncStatusPanel status={unhealthyStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[ERROR]')).toBeInTheDocument();
    });

    it('displays POLYMARKET label', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('POLYMARKET')).toBeInTheDocument();
    });
  });

  describe('timing info', () => {
    it('displays last market sync time', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Last market sync:/)).toBeInTheDocument();
    });

    it('displays last price sync time', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Last price sync:/)).toBeInTheDocument();
    });

    it('displays sync counts', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Sync count: 150 market \/ 3000 price/)).toBeInTheDocument();
    });

    it('shows Never for null timestamps', () => {
      const statusWithNullTimes: SyncStatus = {
        ...baseStatus,
        scheduler: {
          ...baseStatus.scheduler!,
          lastMarketSync: null,
          lastPriceSync: null,
        },
      };
      render(<SyncStatusPanel status={statusWithNullTimes} onRefresh={mockOnRefresh} />);
      expect(screen.getAllByText(/Never/)).toHaveLength(2);
    });
  });

  describe('stats display', () => {
    it('displays total markets', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('TOTAL MARKETS')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('displays active markets', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
    });

    it('does not display stats when not present', () => {
      const statusWithoutStats = {
        ...baseStatus,
        health: {
          ...baseStatus.health,
          stats: undefined,
        },
      } as unknown as SyncStatus;
      render(<SyncStatusPanel status={statusWithoutStats} onRefresh={mockOnRefresh} />);
      expect(screen.queryByText('TOTAL MARKETS')).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('shows STOP button when scheduler is running', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('STOP')).toBeInTheDocument();
      expect(screen.queryByText('START')).not.toBeInTheDocument();
    });

    it('shows START button when scheduler is stopped', () => {
      render(<SyncStatusPanel status={stoppedStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('START')).toBeInTheDocument();
      expect(screen.queryByText('STOP')).not.toBeInTheDocument();
    });

    it('renders SYNC MARKETS button', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('SYNC MARKETS')).toBeInTheDocument();
    });

    it('renders SYNC PRICES button', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('SYNC PRICES')).toBeInTheDocument();
    });

    it('disables SYNC MARKETS button when market sync is running', () => {
      render(<SyncStatusPanel status={syncingStatus} onRefresh={mockOnRefresh} />);
      const button = screen.getByText('SYNC MARKETS').closest('button');
      expect(button).toBeDisabled();
    });

    it('disables SYNC PRICES button when price sync is running', () => {
      render(<SyncStatusPanel status={syncingStatus} onRefresh={mockOnRefresh} />);
      const button = screen.getByText('SYNC PRICES').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('action interactions', () => {
    it('calls stopSync when STOP clicked', async () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('STOP'));
      await waitFor(() => {
        expect(mockApi.stopSync).toHaveBeenCalled();
      });
    });

    it('calls startSync when START clicked', async () => {
      render(<SyncStatusPanel status={stoppedStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('START'));
      await waitFor(() => {
        expect(mockApi.startSync).toHaveBeenCalled();
      });
    });

    it('calls triggerMarketSync when SYNC MARKETS clicked', async () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('SYNC MARKETS'));
      await waitFor(() => {
        expect(mockApi.triggerMarketSync).toHaveBeenCalled();
      });
    });

    it('calls triggerPriceSync when SYNC PRICES clicked', async () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('SYNC PRICES'));
      await waitFor(() => {
        expect(mockApi.triggerPriceSync).toHaveBeenCalled();
      });
    });

    it('calls onRefresh after successful action', async () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('STOP'));
      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });

    it('shows WAIT... during action loading', async () => {
      mockApi.stopSync.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('STOP'));
      expect(screen.getByText('WAIT...')).toBeInTheDocument();
    });
  });

  describe('refresh button', () => {
    it('calls onRefresh when clicked', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('REFRESH'));
      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('disables refresh button when loading', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} isLoading />);
      const button = screen.getByText('LOADING...').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('error display', () => {
    it('shows RECENT ERRORS section when errors exist', () => {
      render(<SyncStatusPanel status={statusWithErrors} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('RECENT ERRORS:')).toBeInTheDocument();
    });

    it('displays error messages', () => {
      render(<SyncStatusPanel status={statusWithErrors} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/API rate limited/)).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
    });

    it('displays error types', () => {
      render(<SyncStatusPanel status={statusWithErrors} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/MarketSync:/)).toBeInTheDocument();
      expect(screen.getByText(/PriceSync:/)).toBeInTheDocument();
    });

    it('does not show errors section when no errors', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      expect(screen.queryByText('RECENT ERRORS:')).not.toBeInTheDocument();
    });

    it('limits displayed errors to 5', () => {
      const manyErrors: SyncStatus = {
        ...baseStatus,
        scheduler: {
          ...baseStatus.scheduler!,
          errors: [
            { timestamp: '2024-01-15T10:30:00Z', type: 'Error1', message: 'msg1' },
            { timestamp: '2024-01-15T10:29:00Z', type: 'Error2', message: 'msg2' },
            { timestamp: '2024-01-15T10:28:00Z', type: 'Error3', message: 'msg3' },
            { timestamp: '2024-01-15T10:27:00Z', type: 'Error4', message: 'msg4' },
            { timestamp: '2024-01-15T10:26:00Z', type: 'Error5', message: 'msg5' },
            { timestamp: '2024-01-15T10:25:00Z', type: 'Error6', message: 'msg6' },
            { timestamp: '2024-01-15T10:24:00Z', type: 'Error7', message: 'msg7' },
          ],
        },
      };
      render(<SyncStatusPanel status={manyErrors} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Error1:/)).toBeInTheDocument();
      expect(screen.getByText(/Error5:/)).toBeInTheDocument();
      expect(screen.queryByText(/Error6:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Error7:/)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockApi.stopSync.mockRejectedValue(new Error('Network error'));

      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('STOP'));

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Action stop failed:', expect.any(Error));
      });

      consoleError.mockRestore();
    });

    it('clears loading state after error', async () => {
      mockApi.stopSync.mockRejectedValue(new Error('Network error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      fireEvent.click(screen.getByText('STOP'));

      await waitFor(() => {
        expect(screen.getByText('STOP')).toBeInTheDocument();
      });
    });
  });

  describe('ActionButton component', () => {
    it('applies success variant styles', () => {
      render(<SyncStatusPanel status={stoppedStatus} onRefresh={mockOnRefresh} />);
      const startButton = screen.getByText('START').closest('button');
      expect(startButton).toHaveClass('hover:border-[hsl(var(--success))]');
    });

    it('applies danger variant styles', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      const stopButton = screen.getByText('STOP').closest('button');
      expect(stopButton).toHaveClass('hover:border-[hsl(var(--error))]');
    });

    it('applies default variant styles to sync buttons', () => {
      render(<SyncStatusPanel status={baseStatus} onRefresh={mockOnRefresh} />);
      const syncButton = screen.getByText('SYNC MARKETS').closest('button');
      expect(syncButton).toHaveClass('hover:border-[hsl(var(--primary))]');
    });
  });

  describe('null safety', () => {
    it('handles missing scheduler data', () => {
      const partialStatus = {
        scheduler: undefined,
        health: baseStatus.health,
      } as unknown as SyncStatus;
      render(<SyncStatusPanel status={partialStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[STOPPED]')).toBeInTheDocument();
    });

    it('handles missing health data', () => {
      const partialStatus = {
        scheduler: baseStatus.scheduler,
        health: undefined,
      } as unknown as SyncStatus;
      render(<SyncStatusPanel status={partialStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText('[ERROR]')).toBeInTheDocument();
    });

    it('handles zero sync counts', () => {
      const zeroCountStatus: SyncStatus = {
        ...baseStatus,
        scheduler: {
          ...baseStatus.scheduler,
          marketSyncCount: 0,
          priceSyncCount: 0,
        },
      };
      render(<SyncStatusPanel status={zeroCountStatus} onRefresh={mockOnRefresh} />);
      expect(screen.getByText(/Sync count: 0 market \/ 0 price/)).toBeInTheDocument();
    });
  });
});
