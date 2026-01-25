'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ReputationPlatform =
  | 'CALIBR'
  | 'POLYMARKET'
  | 'LIMITLESS'
  | 'GITCOIN_PASSPORT'
  | 'COINBASE_VERIFICATION'
  | 'OPTIMISM_COLLECTIVE';

export interface ReputationSource {
  platform: ReputationPlatform;
  score: number;
  lastUpdated: Date;
  verified: boolean;
  profileUrl?: string;
}

export interface ReputationCardProps {
  reputations: ReputationSource[];
  onConnect?: (platform: ReputationPlatform) => void;
  onRefresh?: (platform: ReputationPlatform) => void;
  isLoading?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const PLATFORM_CONFIG: Record<ReputationPlatform, {
  name: string;
  icon: string;
  color: string;
  description: string;
  weight: string;
}> = {
  CALIBR: {
    name: 'Calibr.xyz',
    icon: '📊',
    color: 'text-[hsl(var(--primary))]',
    description: 'Native forecasting score',
    weight: '40%',
  },
  POLYMARKET: {
    name: 'Polymarket',
    icon: '🔮',
    color: 'text-purple-400',
    description: 'Trading performance on Polymarket',
    weight: '20%',
  },
  LIMITLESS: {
    name: 'Limitless',
    icon: '♾️',
    color: 'text-blue-400',
    description: 'Performance on Limitless Exchange',
    weight: '15%',
  },
  GITCOIN_PASSPORT: {
    name: 'Gitcoin Passport',
    icon: '🛂',
    color: 'text-green-400',
    description: 'Identity verification score',
    weight: '10%',
  },
  COINBASE_VERIFICATION: {
    name: 'Coinbase',
    icon: '🔵',
    color: 'text-blue-500',
    description: 'Coinbase verified identity',
    weight: '10%',
  },
  OPTIMISM_COLLECTIVE: {
    name: 'Optimism',
    icon: '🔴',
    color: 'text-red-400',
    description: 'Optimism Collective participation',
    weight: '5%',
  },
};

const ALL_PLATFORMS: ReputationPlatform[] = [
  'CALIBR',
  'POLYMARKET',
  'LIMITLESS',
  'GITCOIN_PASSPORT',
  'COINBASE_VERIFICATION',
  'OPTIMISM_COLLECTIVE',
];

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(date).toLocaleDateString();
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[hsl(var(--success))]';
  if (score >= 60) return 'text-[hsl(var(--primary))]';
  if (score >= 40) return 'text-[hsl(var(--warning))]';
  return 'text-[hsl(var(--muted-foreground))]';
}

// =============================================================================
// Components
// =============================================================================

function ReputationRow({
  source,
  onRefresh,
  isLoading,
}: {
  source: ReputationSource;
  onRefresh?: (platform: ReputationPlatform) => void;
  isLoading?: boolean;
}) {
  const config = PLATFORM_CONFIG[source.platform];

  return (
    <div className="flex items-center gap-3 p-3 border-b border-[hsl(var(--border))] last:border-b-0">
      {/* Platform Icon */}
      <span className="text-xl">{config.icon}</span>

      {/* Platform Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${config.color}`}>{config.name}</span>
          {source.verified && (
            <span className="text-[hsl(var(--success))] text-xs">✓</span>
          )}
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            ({config.weight})
          </span>
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          Updated {formatDate(source.lastUpdated)}
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className={`font-mono text-lg ${getScoreColor(source.score)}`}>
          {source.score}
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">/ 100</div>
      </div>

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={() => onRefresh(source.platform)}
          disabled={isLoading}
          className="p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] disabled:opacity-50"
          title="Refresh score"
        >
          ↻
        </button>
      )}
    </div>
  );
}

function ConnectPlatformRow({
  platform,
  onConnect,
  isLoading,
}: {
  platform: ReputationPlatform;
  onConnect?: (platform: ReputationPlatform) => void;
  isLoading?: boolean;
}) {
  const config = PLATFORM_CONFIG[platform];

  return (
    <div className="flex items-center gap-3 p-3 border-b border-[hsl(var(--border))] last:border-b-0 opacity-60 hover:opacity-100 transition-opacity">
      {/* Platform Icon */}
      <span className="text-xl">{config.icon}</span>

      {/* Platform Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{config.name}</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            ({config.weight})
          </span>
        </div>
        <div className="text-xs text-[hsl(var(--muted-foreground))]">
          {config.description}
        </div>
      </div>

      {/* Connect Button */}
      {onConnect && (
        <button
          onClick={() => onConnect(platform)}
          disabled={isLoading}
          className="px-3 py-1 text-xs font-mono border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors disabled:opacity-50"
        >
          CONNECT
        </button>
      )}
    </div>
  );
}

function AggregateScore({ reputations }: { reputations: ReputationSource[] }) {
  // Calculate weighted aggregate score
  const weights: Record<ReputationPlatform, number> = {
    CALIBR: 0.40,
    POLYMARKET: 0.20,
    LIMITLESS: 0.15,
    GITCOIN_PASSPORT: 0.10,
    COINBASE_VERIFICATION: 0.10,
    OPTIMISM_COLLECTIVE: 0.05,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const rep of reputations) {
    if (rep.verified) {
      const weight = weights[rep.platform] || 0;
      weightedSum += rep.score * weight;
      totalWeight += weight;
    }
  }

  const aggregateScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const connectedCount = reputations.filter(r => r.verified).length;

  return (
    <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.3)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            AGGREGATE REPUTATION
          </div>
          <div className={`text-3xl font-bold font-mono ${getScoreColor(aggregateScore)}`}>
            {aggregateScore}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            SOURCES
          </div>
          <div className="text-lg font-mono">
            {connectedCount} / {ALL_PLATFORMS.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-[hsl(var(--accent))] overflow-hidden">
        <div
          className="h-full bg-[hsl(var(--primary))] transition-all duration-500"
          style={{ width: `${aggregateScore}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ReputationCard({
  reputations,
  onConnect,
  onRefresh,
  isLoading,
}: ReputationCardProps) {
  const [showUnconnected, setShowUnconnected] = useState(false);

  // Get connected and unconnected platforms
  const connectedPlatforms = new Set(reputations.map(r => r.platform));
  const unconnectedPlatforms = ALL_PLATFORMS.filter(p => !connectedPlatforms.has(p));

  return (
    <div className="ascii-box overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--border))]">
        <h3 className="text-sm font-bold text-[hsl(var(--primary))]">
          [CROSS-PLATFORM REPUTATION]
        </h3>
      </div>

      {/* Aggregate Score */}
      <AggregateScore reputations={reputations} />

      {/* Connected Platforms */}
      <div className="divide-y divide-[hsl(var(--border))]">
        {reputations.map(source => (
          <ReputationRow
            key={source.platform}
            source={source}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Unconnected Platforms Toggle */}
      {unconnectedPlatforms.length > 0 && (
        <>
          <button
            onClick={() => setShowUnconnected(!showUnconnected)}
            className="w-full p-3 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors border-t border-[hsl(var(--border))]"
          >
            {showUnconnected ? '▼' : '▶'} {unconnectedPlatforms.length} more platforms
          </button>

          {showUnconnected && (
            <div className="divide-y divide-[hsl(var(--border))]">
              {unconnectedPlatforms.map(platform => (
                <ConnectPlatformRow
                  key={platform}
                  platform={platform}
                  onConnect={onConnect}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// Compact Reputation Badge
// =============================================================================

export function ReputationBadge({
  reputations,
  size = 'md',
}: {
  reputations: ReputationSource[];
  size?: 'sm' | 'md' | 'lg';
}) {
  // Calculate aggregate score
  const weights: Record<ReputationPlatform, number> = {
    CALIBR: 0.40,
    POLYMARKET: 0.20,
    LIMITLESS: 0.15,
    GITCOIN_PASSPORT: 0.10,
    COINBASE_VERIFICATION: 0.10,
    OPTIMISM_COLLECTIVE: 0.05,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const rep of reputations) {
    if (rep.verified) {
      const weight = weights[rep.platform] || 0;
      weightedSum += rep.score * weight;
      totalWeight += weight;
    }
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  const connectedCount = reputations.filter(r => r.verified).length;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className={`inline-flex items-center gap-1 font-mono border border-[hsl(var(--border))] ${sizeClasses[size]}`}>
      <span className={getScoreColor(score)}>{score}</span>
      <span className="text-[hsl(var(--muted-foreground))]">REP</span>
      <span className="text-xs text-[hsl(var(--muted-foreground))]">
        ({connectedCount})
      </span>
    </div>
  );
}

// =============================================================================
// Hook for Reputation Management
// =============================================================================

export function useReputation(address?: string) {
  const [reputations, setReputations] = useState<ReputationSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchReputations = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/reputation/${address}`);
      if (!response.ok) throw new Error('Failed to fetch reputation');

      const data = await response.json();
      if (data.success) {
        setReputations(data.data.reputations);
      } else {
        throw new Error(data.error || 'Failed to fetch reputation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [address, API_BASE]);

  const refreshPlatform = useCallback(async (platform: ReputationPlatform) => {
    if (!address) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/reputation/${address}/${platform}/refresh`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to refresh reputation');

      const data = await response.json();
      if (data.success) {
        setReputations(prev =>
          prev.map(r => r.platform === platform ? data.data.reputation : r)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, [address, API_BASE]);

  const connectPlatform = useCallback(async (platform: ReputationPlatform) => {
    if (!address) return;

    // This would typically open an OAuth flow or verification modal
    // For now, we'll just log it
    console.log(`Connecting ${platform} for ${address}`);
  }, [address]);

  return {
    reputations,
    isLoading,
    error,
    fetchReputations,
    refreshPlatform,
    connectPlatform,
  };
}
