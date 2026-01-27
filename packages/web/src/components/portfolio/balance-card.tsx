'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TokenBalance {
  token: string;
  amount: number;
  symbol: string;
}

export interface BalanceCardProps {
  chain: 'BASE' | 'POLYGON' | string;
  address: string;
  balances: TokenBalance[];
  isConnected: boolean;
  onCopy?: (address: string) => void;
  className?: string;
}

const EXPLORER_URLS: Record<string, string> = {
  BASE: 'https://basescan.org/address/',
  POLYGON: 'https://polygonscan.com/address/',
};

function formatBalance(amount: number, token: string): string {
  if (token === 'ETH' || amount < 1) {
    return amount.toFixed(4);
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function BalanceCard({
  chain,
  address,
  balances,
  isConnected,
  onCopy,
  className,
}: BalanceCardProps) {
  const explorerUrl = EXPLORER_URLS[chain] || EXPLORER_URLS.BASE;

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(address);
    }
    onCopy?.(address);
  };

  return (
    <div
      data-testid="balance-card"
      data-chain={chain}
      className={cn(
        'border border-[hsl(var(--primary))] bg-[hsl(var(--background))] p-4 font-mono',
        className
      )}
    >
      {/* Header */}
      <div className="text-sm font-bold text-[hsl(var(--primary))] mb-2">
        ┌─[ {chain} ]
      </div>

      {/* Connection Status */}
      <div
        data-testid="connection-status"
        className={cn(
          'text-xs mb-3 flex items-center gap-1',
          isConnected ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--muted-foreground))]'
        )}
      >
        <span>{isConnected ? '◉' : '○'}</span>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Balances */}
      <div className="space-y-1 mb-4">
        {balances.length === 0 ? (
          <div className="text-xs text-[hsl(var(--muted-foreground))]">No balances</div>
        ) : (
          balances.map((bal) => (
            <div
              key={bal.token}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[hsl(var(--muted-foreground))]">{bal.symbol}</span>
              <span className="text-[hsl(var(--foreground))] tabular-nums">
                {formatBalance(bal.amount, bal.token)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Address */}
      <div className="flex items-center justify-between text-xs border-t border-[hsl(var(--border))] pt-2">
        <span className="text-[hsl(var(--muted-foreground))] font-mono">
          {truncateAddress(address)}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            aria-label="Copy address"
            className="text-[hsl(var(--primary))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            [Copy]
          </button>
          <a
            href={`${explorerUrl}${address}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on explorer"
            className="text-[hsl(var(--primary))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            [↗]
          </a>
        </div>
      </div>
    </div>
  );
}
