'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface OrderBookOrder {
  price: number;
  size: number;
  total?: number;
}

export interface OrderBookTableProps {
  bids: OrderBookOrder[];
  asks: OrderBookOrder[];
  spread?: number;
  maxRows?: number;
  showDepthBar?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(price: number): string {
  return (price * 100).toFixed(1);
}

function formatSize(size: number): string {
  if (size >= 1000) {
    return (size / 1000).toFixed(1) + 'K';
  }
  return size.toFixed(0);
}

// =============================================================================
// Component
// =============================================================================

export function OrderBookTable({
  bids,
  asks,
  spread,
  maxRows = 10,
  showDepthBar = true,
}: OrderBookTableProps) {
  // Calculate cumulative totals and max for depth visualization
  const processedData = useMemo(() => {
    // Sort bids descending by price, asks ascending
    const sortedBids = [...bids]
      .sort((a, b) => b.price - a.price)
      .slice(0, maxRows);
    const sortedAsks = [...asks]
      .sort((a, b) => a.price - b.price)
      .slice(0, maxRows);

    // Calculate cumulative totals
    let bidTotal = 0;
    const bidsWithTotal = sortedBids.map((order) => {
      bidTotal += order.size;
      return { ...order, total: bidTotal };
    });

    let askTotal = 0;
    const asksWithTotal = sortedAsks.map((order) => {
      askTotal += order.size;
      return { ...order, total: askTotal };
    });

    const maxTotal = Math.max(bidTotal, askTotal);

    return { bids: bidsWithTotal, asks: asksWithTotal, maxTotal };
  }, [bids, asks, maxRows]);

  const calculatedSpread = useMemo(() => {
    if (spread !== undefined) return spread;
    if (processedData.bids.length === 0 || processedData.asks.length === 0) return null;
    const bestBid = processedData.bids[0]?.price ?? 0;
    const bestAsk = processedData.asks[0]?.price ?? 0;
    return bestAsk - bestBid;
  }, [spread, processedData]);

  if (processedData.bids.length === 0 && processedData.asks.length === 0) {
    return (
      <div className="ascii-box p-4 text-center text-[hsl(var(--muted-foreground))]">
        [NO ORDER BOOK DATA]
      </div>
    );
  }

  return (
    <div className="ascii-box overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="border-b border-[hsl(var(--border))] p-2 bg-[hsl(var(--accent))]">
        <div className="flex justify-between items-center">
          <span className="text-[hsl(var(--muted-foreground))]">ORDER BOOK</span>
          {calculatedSpread !== null && (
            <span className="text-[hsl(var(--info))]">
              SPREAD: {formatPrice(calculatedSpread)}%
            </span>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 gap-2 p-2 border-b border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
        <div className="text-left">PRICE</div>
        <div className="text-right">SIZE</div>
        <div className="text-right">TOTAL</div>
      </div>

      {/* Asks (sell orders) - displayed in reverse so lowest ask is near spread */}
      <div className="border-b border-[hsl(var(--border))]">
        {[...processedData.asks].reverse().map((order, idx) => (
          <div
            key={`ask-${idx}`}
            className="grid grid-cols-3 gap-2 p-2 relative hover:bg-[hsl(var(--accent))]"
          >
            {/* Depth bar */}
            {showDepthBar && processedData.maxTotal > 0 && (
              <div
                className="absolute inset-y-0 right-0 bg-[hsl(var(--bearish))]/10 pointer-events-none"
                style={{
                  width: `${(order.total! / processedData.maxTotal) * 100}%`,
                }}
              />
            )}
            <div className="text-[hsl(var(--bearish))] relative z-10">
              {formatPrice(order.price)}%
            </div>
            <div className="text-right text-[hsl(var(--foreground))] relative z-10">
              {formatSize(order.size)}
            </div>
            <div className="text-right text-[hsl(var(--muted-foreground))] relative z-10">
              {formatSize(order.total!)}
            </div>
          </div>
        ))}
      </div>

      {/* Spread indicator */}
      {calculatedSpread !== null && (
        <div className="p-2 bg-[hsl(var(--accent))] border-b border-[hsl(var(--border))] text-center">
          <span className="text-[hsl(var(--muted-foreground))]">───</span>
          <span className="mx-2 text-[hsl(var(--info))]">
            {formatPrice(calculatedSpread)}%
          </span>
          <span className="text-[hsl(var(--muted-foreground))]">───</span>
        </div>
      )}

      {/* Bids (buy orders) */}
      <div>
        {processedData.bids.map((order, idx) => (
          <div
            key={`bid-${idx}`}
            className="grid grid-cols-3 gap-2 p-2 relative hover:bg-[hsl(var(--accent))]"
          >
            {/* Depth bar */}
            {showDepthBar && processedData.maxTotal > 0 && (
              <div
                className="absolute inset-y-0 right-0 bg-[hsl(var(--bullish))]/10 pointer-events-none"
                style={{
                  width: `${(order.total! / processedData.maxTotal) * 100}%`,
                }}
              />
            )}
            <div className="text-[hsl(var(--bullish))] relative z-10">
              {formatPrice(order.price)}%
            </div>
            <div className="text-right text-[hsl(var(--foreground))] relative z-10">
              {formatSize(order.size)}
            </div>
            <div className="text-right text-[hsl(var(--muted-foreground))] relative z-10">
              {formatSize(order.total!)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[hsl(var(--border))] p-2 text-[hsl(var(--muted-foreground))] flex justify-between">
        <span>
          BIDS: {processedData.bids.length} | ASKS: {processedData.asks.length}
        </span>
        <span>
          VOL: {formatSize(
            processedData.bids.reduce((s, o) => s + o.size, 0) +
              processedData.asks.reduce((s, o) => s + o.size, 0)
          )}
        </span>
      </div>
    </div>
  );
}
