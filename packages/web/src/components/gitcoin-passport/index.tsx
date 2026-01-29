/**
 * Gitcoin Passport Integration Components
 * Task 6.4.3: Gitcoin Passport integration
 *
 * Integrates with Gitcoin Passport for decentralized identity verification.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type StampProvider = 'Twitter' | 'GitHub' | 'Google' | 'ENS' | 'GitPOAP' | 'Discord' | 'Lens' | 'Snapshot' | string;
export type StampCategory = 'social' | 'developer' | 'web3' | 'government' | 'defi' | string;
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface PassportStamp {
  id: string;
  provider: StampProvider;
  category: StampCategory;
  hash: string;
  issuedAt: number;
  expiresAt: number;
  weight: number;
  verified: boolean;
}

export interface PassportProfile {
  address: string;
  score: number;
  threshold: number;
  stamps: PassportStamp[];
  lastUpdated: number;
  isHuman: boolean;
  expiresAt: number;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  social: { border: 'border-blue-400/30', text: 'text-blue-400', bg: 'bg-blue-400/10' },
  developer: { border: 'border-purple-400/30', text: 'text-purple-400', bg: 'bg-purple-400/10' },
  web3: { border: 'border-green-400/30', text: 'text-green-400', bg: 'bg-green-400/10' },
  government: { border: 'border-red-400/30', text: 'text-red-400', bg: 'bg-red-400/10' },
  defi: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
};

const PROVIDER_ICONS: Record<string, string> = {
  Twitter: '🐦',
  GitHub: '🐙',
  Google: '🔍',
  ENS: '📛',
  GitPOAP: '🏆',
  Discord: '💬',
  Lens: '🌿',
  Snapshot: '📸',
};

// =============================================================================
// PassportBadge
// =============================================================================

interface PassportBadgeProps {
  isHuman: boolean;
  score: number;
  compact?: boolean;
}

export function PassportBadge({ isHuman, score, compact }: PassportBadgeProps) {
  return (
    <span
      data-testid="passport-badge"
      role="status"
      className={`inline-flex items-center gap-1 font-mono font-bold rounded ${
        isHuman ? 'bg-green-400/10 text-green-400' : 'bg-zinc-400/10 text-zinc-400'
      } text-xs ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
    >
      <span data-testid="passport-icon">🛂</span>
      <span>{isHuman ? 'Verified' : 'Unverified'}</span>
      <span data-testid="passport-score-value" className="ml-1">{score}</span>
    </span>
  );
}

// =============================================================================
// PassportStampCard
// =============================================================================

interface PassportStampCardProps {
  stamp: PassportStamp;
}

export function PassportStampCard({ stamp }: PassportStampCardProps) {
  const icon = PROVIDER_ICONS[stamp.provider] ?? '📜';
  const colors = CATEGORY_COLORS[stamp.category] ?? CATEGORY_COLORS.social!;
  const isExpired = stamp.expiresAt < Date.now();

  return (
    <div
      data-testid="passport-stamp-card"
      className={`ascii-box p-4 ${colors.border} border`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" data-testid="provider-icon">{icon}</span>
          <span className="font-mono font-bold">{stamp.provider}</span>
        </div>
        <span
          data-testid="stamp-verified"
          className={`text-xs font-mono ${
            isExpired ? 'text-red-400' : stamp.verified ? 'text-green-400' : 'text-zinc-400'
          }`}
        >
          {isExpired ? 'expired' : stamp.verified ? '✓' : '○'}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Category</span>
          <span className={`font-mono capitalize ${colors.text}`} data-testid="stamp-category">
            {stamp.category}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Weight</span>
          <span className="font-mono" data-testid="stamp-weight">{stamp.weight}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Issued</span>
          <span className="font-mono" data-testid="stamp-issued">
            {new Date(stamp.issuedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Expires</span>
          <span className="font-mono" data-testid="stamp-expiry">
            {new Date(stamp.expiresAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PassportScore
// =============================================================================

interface PassportScoreProps {
  score: number;
  threshold: number;
  showProgress?: boolean;
  stampCount?: number;
}

export function PassportScore({ score, threshold, showProgress, stampCount }: PassportScoreProps) {
  const isPassing = score >= threshold;

  return (
    <div
      data-testid="passport-score"
      className={`ascii-box p-4 ${isPassing ? 'border-green-400/30' : 'border-yellow-400/30'} border`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-[hsl(var(--muted-foreground))]">Humanity Score</div>
        {stampCount !== undefined && (
          <span data-testid="stamp-count" className="text-xs text-[hsl(var(--muted-foreground))]">
            {stampCount} stamps
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          data-testid="score-current"
          className={`text-3xl font-mono font-bold ${isPassing ? 'text-green-400' : 'text-yellow-400'}`}
        >
          {score}
        </span>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">
          / <span data-testid="score-threshold">{threshold}</span>
        </span>
      </div>

      <div
        data-testid="threshold-status"
        className={`mt-2 text-xs ${isPassing ? 'text-green-400' : 'text-yellow-400'}`}
      >
        {isPassing ? '✓ Passing threshold' : '⚠ Below threshold'}
      </div>

      {showProgress && (
        <div data-testid="score-progress" className="mt-3">
          <div className="h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full rounded ${isPassing ? 'bg-green-400' : 'bg-yellow-400'}`}
              style={{ width: `${Math.min((score / threshold) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PassportConnectionStatus
// =============================================================================

interface PassportConnectionStatusProps {
  status: ConnectionStatus;
  error?: string;
  lastSynced?: number;
  onConnect?: () => void;
}

export function PassportConnectionStatus({
  status,
  error,
  lastSynced,
  onConnect,
}: PassportConnectionStatusProps) {
  return (
    <div
      data-testid="passport-connection-status"
      role="status"
      className="ascii-box p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'connected' ? 'bg-green-400' :
              status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              status === 'error' ? 'bg-red-400' : 'bg-zinc-400'
            }`}
          />
          <span className="text-sm font-mono capitalize">{status}</span>
          {status === 'connecting' && (
            <span data-testid="connecting-spinner" className="animate-spin">⟳</span>
          )}
        </div>

        {status === 'disconnected' && onConnect && (
          <button
            onClick={onConnect}
            className="px-3 py-1 text-xs font-mono bg-green-400/20 text-green-400 rounded hover:bg-green-400/30"
          >
            Connect
          </button>
        )}
      </div>

      {status === 'error' && error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {status === 'connected' && lastSynced && (
        <p data-testid="last-synced" className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Last synced: {new Date(lastSynced).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// PassportStampList
// =============================================================================

interface PassportStampListProps {
  stamps: PassportStamp[];
  filterCategory?: StampCategory;
  sortBy?: 'date' | 'weight';
  showTotalWeight?: boolean;
}

export function PassportStampList({
  stamps,
  filterCategory,
  sortBy = 'date',
  showTotalWeight,
}: PassportStampListProps) {
  const filteredStamps = useMemo(() => {
    let result = [...stamps];

    if (filterCategory) {
      result = result.filter((s) => s.category === filterCategory);
    }

    if (sortBy === 'weight') {
      result.sort((a, b) => b.weight - a.weight);
    } else {
      result.sort((a, b) => b.issuedAt - a.issuedAt);
    }

    return result;
  }, [stamps, filterCategory, sortBy]);

  const totalWeight = useMemo(
    () => filteredStamps.reduce((sum, s) => sum + s.weight, 0),
    [filteredStamps]
  );

  return (
    <div data-testid="passport-stamp-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          Stamps
        </h3>
        <div className="flex items-center gap-3">
          {showTotalWeight && (
            <span data-testid="total-weight" className="text-xs text-[hsl(var(--muted-foreground))]">
              Weight: {totalWeight.toFixed(1)}
            </span>
          )}
          <span data-testid="list-count" className="text-xs text-[hsl(var(--muted-foreground))]">
            {filteredStamps.length}
          </span>
        </div>
      </div>

      {filteredStamps.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
          No stamps found
        </p>
      ) : (
        <div className="space-y-3">
          {filteredStamps.map((stamp) => (
            <PassportStampCard key={stamp.id} stamp={stamp} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PassportStampGrid
// =============================================================================

interface PassportStampGridProps {
  stamps: PassportStamp[];
  showCategoryWeights?: boolean;
}

export function PassportStampGrid({ stamps, showCategoryWeights }: PassportStampGridProps) {
  const groupedStamps = useMemo(() => {
    const groups: Record<string, PassportStamp[]> = {};
    stamps.forEach((stamp) => {
      if (!groups[stamp.category]) {
        groups[stamp.category] = [];
      }
      groups[stamp.category]!.push(stamp);
    });
    return groups;
  }, [stamps]);

  const categoryWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    Object.entries(groupedStamps).forEach(([category, categoryStamps]) => {
      weights[category] = categoryStamps.reduce((sum, s) => sum + s.weight, 0);
    });
    return weights;
  }, [groupedStamps]);

  return (
    <div data-testid="passport-stamp-grid" className="space-y-6">
      {Object.entries(groupedStamps).map(([category, categoryStamps]) => {
        const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.social!;
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-mono font-bold capitalize ${colors.text}`}>
                {category}
              </h4>
              <div className="flex items-center gap-3">
                {showCategoryWeights && (
                  <span data-testid="category-weight" className="text-xs text-[hsl(var(--muted-foreground))]">
                    {categoryWeights[category]?.toFixed(1)}
                  </span>
                )}
                <span data-testid="category-count" className="text-xs text-[hsl(var(--muted-foreground))]">
                  {categoryStamps.length}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categoryStamps.map((stamp) => (
                <PassportStampCard key={stamp.id} stamp={stamp} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// PassportProfileLink
// =============================================================================

interface PassportProfileLinkProps {
  address: string;
  showFull?: boolean;
  isHuman?: boolean;
}

export function PassportProfileLink({ address, showFull, isHuman }: PassportProfileLinkProps) {
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div data-testid="passport-profile-link" className="flex items-center gap-2">
      <a
        href={`https://passport.gitcoin.co/#/dashboard/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-mono text-[hsl(var(--muted-foreground))] hover:text-green-400"
      >
        {showFull ? address : truncatedAddress}
      </a>
      {isHuman && (
        <span data-testid="human-indicator" className="text-green-400">✓</span>
      )}
    </div>
  );
}

// =============================================================================
// PassportIntegrationHub
// =============================================================================

interface PassportIntegrationHubProps {
  profile: PassportProfile | null;
  connectionStatus?: ConnectionStatus;
  onRefresh?: () => void;
  onConnect?: () => void;
}

export function PassportIntegrationHub({
  profile,
  connectionStatus = 'connected',
  onRefresh,
  onConnect,
}: PassportIntegrationHubProps) {
  if (!profile) {
    return (
      <div data-testid="passport-integration-hub" className="ascii-box p-6 text-center">
        <span className="text-4xl mb-4 block">🛂</span>
        <p className="text-[hsl(var(--muted-foreground))]">
          Connect your Gitcoin Passport to verify your identity
        </p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="mt-4 px-4 py-2 font-mono bg-green-400/20 text-green-400 rounded hover:bg-green-400/30"
          >
            Connect Passport
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="passport-integration-hub" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-green-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Gitcoin Passport</h2>
            <PassportProfileLink address={profile.address} isHuman={profile.isHuman} />
          </div>
          <div className="flex items-center gap-3">
            <PassportBadge isHuman={profile.isHuman} score={profile.score} compact />
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1 text-xs font-mono bg-green-400/20 text-green-400 rounded hover:bg-green-400/30"
              >
                ↻ Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Score */}
      <PassportScore
        score={profile.score}
        threshold={profile.threshold}
        stampCount={profile.stamps.length}
        showProgress
      />

      {/* Connection Status */}
      <PassportConnectionStatus
        status={connectionStatus}
        onConnect={onConnect}
      />

      {/* Last Updated */}
      <div className="ascii-box p-3">
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Last Updated</span>
          <span data-testid="last-updated" className="font-mono">
            {new Date(profile.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Stamp List */}
      <PassportStampList stamps={profile.stamps} showTotalWeight />
    </div>
  );
}

// =============================================================================
// useGitcoinPassport Hook
// =============================================================================

export function useGitcoinPassport(address: string) {
  const [profile, setProfile] = useState<PassportProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const stamps = useMemo(() => profile?.stamps ?? [], [profile]);
  const score = useMemo(() => profile?.score ?? 0, [profile]);
  const isHuman = useMemo(() => profile?.isHuman ?? false, [profile]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      // In production, this would fetch from Gitcoin Passport API
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Mock profile data - in production this would come from the API
      setProfile({
        address,
        score: 0,
        threshold: 20,
        stamps: [],
        lastUpdated: Date.now(),
        isHuman: false,
        expiresAt: Date.now() + 86400000 * 365,
      });
      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      setConnectionStatus('error');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [address, refresh]);

  return {
    profile,
    isLoading,
    error,
    connectionStatus,
    stamps,
    score,
    isHuman,
    refresh,
  };
}
