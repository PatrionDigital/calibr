/**
 * Position History Tracker
 * Tracks position changes over time for historical analysis
 */

import type { TradingPlatform } from '../trading/types';
import type { AggregatedPosition, PortfolioSummary } from './aggregator';
import type { PnLHistoryEntry } from './pnl-calculator';

// =============================================================================
// Types
// =============================================================================

export interface PositionSnapshot {
  /** Unique snapshot ID */
  id: string;
  /** Timestamp of the snapshot */
  timestamp: Date;
  /** Position data at this time */
  position: AggregatedPosition;
  /** Previous snapshot ID (for linking) */
  previousSnapshotId?: string;
}

export interface PositionChange {
  /** Change ID */
  id: string;
  /** Position ID */
  positionId: string;
  /** Timestamp of the change */
  timestamp: Date;
  /** Type of change */
  changeType: 'OPEN' | 'INCREASE' | 'DECREASE' | 'CLOSE' | 'PRICE_UPDATE';
  /** Size before change */
  previousSize: number;
  /** Size after change */
  newSize: number;
  /** Size delta */
  sizeDelta: number;
  /** Price at change */
  price: number;
  /** Cost of the change (for trades) */
  cost?: number;
  /** Related trade/order ID */
  relatedOrderId?: string;
  /** Transaction hash if on-chain */
  transactionHash?: string;
}

export interface PortfolioSnapshot {
  /** Snapshot ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Total portfolio value */
  totalValue: number;
  /** Total unrealized P&L */
  unrealizedPnl: number;
  /** Total realized P&L */
  realizedPnl: number;
  /** Number of positions */
  positionCount: number;
  /** Market count */
  marketCount: number;
  /** Individual position snapshots */
  positions: PositionSnapshot[];
}

export interface HistoryQuery {
  /** Start date (inclusive) */
  startDate?: Date;
  /** End date (inclusive) */
  endDate?: Date;
  /** Position ID filter */
  positionId?: string;
  /** Market ID filter */
  marketId?: string;
  /** Platform filter */
  platform?: TradingPlatform;
  /** Change type filter */
  changeTypes?: PositionChange['changeType'][];
  /** Maximum results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface HistoryStats {
  /** Total snapshots stored */
  totalSnapshots: number;
  /** Total changes recorded */
  totalChanges: number;
  /** Date range covered */
  dateRange: { start: Date; end: Date } | null;
  /** Unique positions tracked */
  uniquePositions: number;
  /** Unique markets tracked */
  uniqueMarkets: number;
}

// =============================================================================
// History Tracker
// =============================================================================

export class PositionHistoryTracker {
  private portfolioSnapshots: PortfolioSnapshot[] = [];
  private positionChanges: PositionChange[] = [];
  private lastPositionState: Map<string, AggregatedPosition> = new Map();

  /**
   * Record a portfolio snapshot
   */
  recordSnapshot(portfolio: PortfolioSummary): PortfolioSnapshot {
    const id = this.generateId();
    const timestamp = new Date();

    // Create position snapshots
    const positions: PositionSnapshot[] = [];
    const allPositions: AggregatedPosition[] = [];

    for (const group of portfolio.byMarket) {
      for (const pos of group.positions) {
        allPositions.push(pos);
      }
    }

    for (const pos of allPositions) {
      positions.push({
        id: this.generateId(),
        timestamp,
        position: { ...pos },
        previousSnapshotId: undefined,
      });
    }

    const snapshot: PortfolioSnapshot = {
      id,
      timestamp,
      totalValue: portfolio.totalMarketValue,
      unrealizedPnl: portfolio.totalUnrealizedPnl,
      realizedPnl: portfolio.totalRealizedPnl,
      positionCount: portfolio.totalPositions,
      marketCount: portfolio.totalMarkets,
      positions,
    };

    // Detect and record changes
    for (const pos of allPositions) {
      const previous = this.lastPositionState.get(pos.id);
      if (previous) {
        const change = this.detectChange(previous, pos);
        if (change) {
          this.positionChanges.push(change);
        }
      } else {
        // New position
        this.positionChanges.push({
          id: this.generateId(),
          positionId: pos.id,
          timestamp,
          changeType: 'OPEN',
          previousSize: 0,
          newSize: pos.size,
          sizeDelta: pos.size,
          price: pos.currentPrice,
          cost: pos.costBasis,
        });
      }
      this.lastPositionState.set(pos.id, { ...pos });
    }

    // Detect closed positions
    for (const [id, prev] of this.lastPositionState) {
      const stillExists = allPositions.some(p => p.id === id);
      if (!stillExists && prev.size > 0) {
        this.positionChanges.push({
          id: this.generateId(),
          positionId: id,
          timestamp,
          changeType: 'CLOSE',
          previousSize: prev.size,
          newSize: 0,
          sizeDelta: -prev.size,
          price: prev.currentPrice,
        });
        this.lastPositionState.delete(id);
      }
    }

    this.portfolioSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Detect change between two position states
   */
  private detectChange(
    previous: AggregatedPosition,
    current: AggregatedPosition
  ): PositionChange | null {
    const sizeDelta = current.size - previous.size;
    const priceChanged = Math.abs(current.currentPrice - previous.currentPrice) > 0.0001;

    if (Math.abs(sizeDelta) < 0.0001 && !priceChanged) {
      return null; // No significant change
    }

    let changeType: PositionChange['changeType'];
    if (sizeDelta > 0.0001) {
      changeType = 'INCREASE';
    } else if (sizeDelta < -0.0001) {
      changeType = 'DECREASE';
    } else {
      changeType = 'PRICE_UPDATE';
    }

    return {
      id: this.generateId(),
      positionId: current.id,
      timestamp: new Date(),
      changeType,
      previousSize: previous.size,
      newSize: current.size,
      sizeDelta,
      price: current.currentPrice,
      cost: sizeDelta > 0 ? sizeDelta * current.averagePrice : undefined,
    };
  }

  /**
   * Get portfolio snapshots with optional filtering
   */
  getSnapshots(query?: HistoryQuery): PortfolioSnapshot[] {
    let snapshots = [...this.portfolioSnapshots];

    if (query?.startDate) {
      snapshots = snapshots.filter(s => s.timestamp >= query.startDate!);
    }

    if (query?.endDate) {
      snapshots = snapshots.filter(s => s.timestamp <= query.endDate!);
    }

    if (query?.limit) {
      const offset = query.offset || 0;
      snapshots = snapshots.slice(offset, offset + query.limit);
    }

    return snapshots;
  }

  /**
   * Get position changes with optional filtering
   */
  getChanges(query?: HistoryQuery): PositionChange[] {
    let changes = [...this.positionChanges];

    if (query?.startDate) {
      changes = changes.filter(c => c.timestamp >= query.startDate!);
    }

    if (query?.endDate) {
      changes = changes.filter(c => c.timestamp <= query.endDate!);
    }

    if (query?.positionId) {
      changes = changes.filter(c => c.positionId === query.positionId);
    }

    if (query?.changeTypes?.length) {
      changes = changes.filter(c => query.changeTypes!.includes(c.changeType));
    }

    if (query?.limit) {
      const offset = query.offset || 0;
      changes = changes.slice(offset, offset + query.limit);
    }

    return changes;
  }

  /**
   * Get P&L history entries for charting
   */
  getPnLHistory(): PnLHistoryEntry[] {
    return this.portfolioSnapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      portfolioValue: snapshot.totalValue,
      cumulativeRealizedPnl: snapshot.realizedPnl,
      unrealizedPnl: snapshot.unrealizedPnl,
      totalPnl: snapshot.unrealizedPnl + snapshot.realizedPnl,
      positionCount: snapshot.positionCount,
    }));
  }

  /**
   * Get position history for a specific position
   */
  getPositionHistory(positionId: string): PositionSnapshot[] {
    const snapshots: PositionSnapshot[] = [];

    for (const portfolio of this.portfolioSnapshots) {
      const positionSnapshot = portfolio.positions.find(
        p => p.position.id === positionId
      );
      if (positionSnapshot) {
        snapshots.push(positionSnapshot);
      }
    }

    return snapshots;
  }

  /**
   * Get aggregated position history (size/value over time)
   */
  getPositionTimeline(positionId: string): Array<{
    timestamp: Date;
    size: number;
    value: number;
    price: number;
    unrealizedPnl: number;
  }> {
    const history = this.getPositionHistory(positionId);

    return history.map(snapshot => ({
      timestamp: snapshot.timestamp,
      size: snapshot.position.size,
      value: snapshot.position.marketValue,
      price: snapshot.position.currentPrice,
      unrealizedPnl: snapshot.position.unrealizedPnl,
    }));
  }

  /**
   * Get history statistics
   */
  getStats(): HistoryStats {
    const uniquePositions = new Set<string>();
    const uniqueMarkets = new Set<string>();

    for (const snapshot of this.portfolioSnapshots) {
      for (const pos of snapshot.positions) {
        uniquePositions.add(pos.position.id);
        uniqueMarkets.add(pos.position.marketId);
      }
    }

    const dateRange = this.portfolioSnapshots.length > 0
      ? {
          start: this.portfolioSnapshots[0]!.timestamp,
          end: this.portfolioSnapshots[this.portfolioSnapshots.length - 1]!.timestamp,
        }
      : null;

    return {
      totalSnapshots: this.portfolioSnapshots.length,
      totalChanges: this.positionChanges.length,
      dateRange,
      uniquePositions: uniquePositions.size,
      uniqueMarkets: uniqueMarkets.size,
    };
  }

  /**
   * Clear all history (for testing/reset)
   */
  clear(): void {
    this.portfolioSnapshots = [];
    this.positionChanges = [];
    this.lastPositionState.clear();
  }

  /**
   * Export history for persistence
   */
  export(): {
    snapshots: PortfolioSnapshot[];
    changes: PositionChange[];
  } {
    return {
      snapshots: [...this.portfolioSnapshots],
      changes: [...this.positionChanges],
    };
  }

  /**
   * Import history from persistence
   */
  import(data: {
    snapshots: PortfolioSnapshot[];
    changes: PositionChange[];
  }): void {
    this.portfolioSnapshots = [...data.snapshots];
    this.positionChanges = [...data.changes];

    // Rebuild last position state from latest snapshot
    if (this.portfolioSnapshots.length > 0) {
      const latest = this.portfolioSnapshots[this.portfolioSnapshots.length - 1]!;
      for (const posSnapshot of latest.positions) {
        this.lastPositionState.set(posSnapshot.position.id, { ...posSnapshot.position });
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Export singleton
export const positionHistoryTracker = new PositionHistoryTracker();
