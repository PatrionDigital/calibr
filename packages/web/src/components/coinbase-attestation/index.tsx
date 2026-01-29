/**
 * Coinbase Attestation Support Components
 * Task 6.4.2: Add Coinbase Attestation support
 *
 * Integrates with Coinbase's on-chain attestations on Base for identity verification.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type VerificationLevel = 'unverified' | 'pending' | 'verified' | 'coinbase_one';
export type AttestationStatus = 'active' | 'expired' | 'revoked';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface CoinbaseAttestation {
  id: string;
  type: 'verified_account' | 'verified_country' | 'one_verification' | string;
  name: string;
  issuedAt: number;
  expiresAt: number;
  attestationUid: string;
  status: AttestationStatus;
  metadata?: Record<string, string>;
}

export interface CoinbaseProfile {
  address: string;
  verificationLevel: VerificationLevel;
  attestations: CoinbaseAttestation[];
  verifiedSince: number;
  totalAttestations: number;
  isConnected: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const LEVEL_COLORS: Record<VerificationLevel, { border: string; text: string; bg: string }> = {
  unverified: { border: 'border-zinc-400/30', text: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  pending: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  verified: { border: 'border-blue-400/30', text: 'text-blue-400', bg: 'bg-blue-400/10' },
  coinbase_one: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
};

const STATUS_COLORS: Record<AttestationStatus, string> = {
  active: 'text-green-400',
  expired: 'text-zinc-400',
  revoked: 'text-red-400',
};

const ATTESTATION_ICONS: Record<string, string> = {
  verified_account: '✓',
  verified_country: '🌍',
  one_verification: '⭐',
};

const LEVEL_DESCRIPTIONS: Record<VerificationLevel, string> = {
  unverified: 'No verification attestations',
  pending: 'Verification in progress',
  verified: 'Coinbase verified account',
  coinbase_one: 'Coinbase One premium member',
};

// =============================================================================
// CoinbaseVerificationBadge
// =============================================================================

interface CoinbaseVerificationBadgeProps {
  level: VerificationLevel;
  compact?: boolean;
}

export function CoinbaseVerificationBadge({ level, compact }: CoinbaseVerificationBadgeProps) {
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.unverified!;

  const levelLabel = level === 'coinbase_one' ? 'Coinbase One' : level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <span
      data-testid="coinbase-verification-badge"
      role="status"
      className={`inline-flex items-center gap-1 font-mono font-bold rounded ${colors.bg} ${colors.text} text-xs ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
    >
      <span data-testid="coinbase-icon">🔵</span>
      <span>{levelLabel}</span>
    </span>
  );
}

// =============================================================================
// CoinbaseAttestationCard
// =============================================================================

interface CoinbaseAttestationCardProps {
  attestation: CoinbaseAttestation;
}

export function CoinbaseAttestationCard({ attestation }: CoinbaseAttestationCardProps) {
  const icon = ATTESTATION_ICONS[attestation.type] ?? '📜';
  const statusColor = STATUS_COLORS[attestation.status];

  return (
    <div
      data-testid="coinbase-attestation-card"
      className="ascii-box p-4 border-blue-400/30 border"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" data-testid="attestation-icon">{icon}</span>
          <span className="font-mono font-bold">{attestation.name}</span>
        </div>
        <span className={`text-xs font-mono ${statusColor}`}>
          {attestation.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Type</span>
          <span className="font-mono" data-testid="attestation-type">{attestation.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Issued</span>
          <span className="font-mono" data-testid="issued-date">
            {new Date(attestation.issuedAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Expires</span>
          <span className="font-mono" data-testid="expiry-date">
            {new Date(attestation.expiresAt).toLocaleDateString()}
          </span>
        </div>
        {attestation.metadata && Object.entries(attestation.metadata).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))] capitalize">{key}</span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <a
          href={`https://base.easscan.org/attestation/view/${attestation.attestationUid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-blue-400"
        >
          Verify on EAS ↗
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// CoinbaseVerificationLevel
// =============================================================================

interface CoinbaseVerificationLevelProps {
  level: VerificationLevel;
  attestationCount?: number;
  showProgress?: boolean;
}

export function CoinbaseVerificationLevel({
  level,
  attestationCount,
  showProgress,
}: CoinbaseVerificationLevelProps) {
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.unverified!;
  const description = LEVEL_DESCRIPTIONS[level];

  const levelLabel = level === 'coinbase_one' ? 'Coinbase One' : level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <div
      data-testid="coinbase-verification-level"
      className={`ascii-box p-4 ${colors.border} border`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`font-mono font-bold ${colors.text}`}>{levelLabel}</span>
        {attestationCount !== undefined && (
          <span
            data-testid="attestation-count"
            className="text-xs text-[hsl(var(--muted-foreground))]"
          >
            {attestationCount} attestations
          </span>
        )}
      </div>

      <p data-testid="level-description" className="text-sm text-[hsl(var(--muted-foreground))]">
        {description}
      </p>

      {showProgress && (
        <div data-testid="level-progress" className="mt-3">
          <div className="h-1 bg-zinc-800 rounded">
            <div
              className={`h-full rounded ${colors.bg.replace('/10', '')}`}
              style={{
                width: level === 'coinbase_one' ? '100%' :
                       level === 'verified' ? '75%' :
                       level === 'pending' ? '50%' : '25%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CoinbaseConnectionStatus
// =============================================================================

interface CoinbaseConnectionStatusProps {
  status: ConnectionStatus;
  error?: string;
  lastSynced?: number;
  onConnect?: () => void;
}

export function CoinbaseConnectionStatus({
  status,
  error,
  lastSynced,
  onConnect,
}: CoinbaseConnectionStatusProps) {
  return (
    <div
      data-testid="coinbase-connection-status"
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
            className="px-3 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
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
// CoinbaseAttestationList
// =============================================================================

interface CoinbaseAttestationListProps {
  attestations: CoinbaseAttestation[];
  filter?: 'all' | 'active' | 'expired';
  sortBy?: 'date' | 'type';
}

export function CoinbaseAttestationList({
  attestations,
  filter = 'all',
  sortBy = 'date',
}: CoinbaseAttestationListProps) {
  const filteredAttestations = useMemo(() => {
    let result = [...attestations];

    if (filter !== 'all') {
      result = result.filter((a) =>
        filter === 'active' ? a.status === 'active' : a.status !== 'active'
      );
    }

    if (sortBy === 'date') {
      result.sort((a, b) => b.issuedAt - a.issuedAt);
    } else {
      result.sort((a, b) => a.type.localeCompare(b.type));
    }

    return result;
  }, [attestations, filter, sortBy]);

  return (
    <div data-testid="coinbase-attestation-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          Attestations
        </h3>
        <span
          data-testid="list-count"
          className="text-xs text-[hsl(var(--muted-foreground))]"
        >
          {filteredAttestations.length}
        </span>
      </div>

      {filteredAttestations.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
          No attestations found
        </p>
      ) : (
        <div className="space-y-3">
          {filteredAttestations.map((attestation) => (
            <CoinbaseAttestationCard key={attestation.id} attestation={attestation} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CoinbaseProfileLink
// =============================================================================

interface CoinbaseProfileLinkProps {
  address: string;
  showFull?: boolean;
  isVerified?: boolean;
}

export function CoinbaseProfileLink({ address, showFull, isVerified }: CoinbaseProfileLinkProps) {
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div data-testid="coinbase-profile-link" className="flex items-center gap-2">
      <a
        href={`https://base.easscan.org/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-mono text-[hsl(var(--muted-foreground))] hover:text-blue-400"
      >
        {showFull ? address : truncatedAddress}
      </a>
      {isVerified && (
        <span data-testid="verified-indicator" className="text-blue-400">✓</span>
      )}
    </div>
  );
}

// =============================================================================
// CoinbaseIntegrationHub
// =============================================================================

interface CoinbaseIntegrationHubProps {
  profile: CoinbaseProfile | null;
  connectionStatus?: ConnectionStatus;
  onRefresh?: () => void;
  onConnect?: () => void;
}

export function CoinbaseIntegrationHub({
  profile,
  connectionStatus = 'connected',
  onRefresh,
  onConnect,
}: CoinbaseIntegrationHubProps) {
  if (!profile) {
    return (
      <div data-testid="coinbase-integration-hub" className="ascii-box p-6 text-center">
        <span className="text-4xl mb-4 block">🔵</span>
        <p className="text-[hsl(var(--muted-foreground))]">
          Connect your Coinbase account to view attestations
        </p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="mt-4 px-4 py-2 font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
          >
            Connect Coinbase
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="coinbase-integration-hub" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Coinbase Attestations</h2>
            <CoinbaseProfileLink
              address={profile.address}
              isVerified={profile.verificationLevel === 'verified' || profile.verificationLevel === 'coinbase_one'}
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
            >
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Verification Level */}
      <CoinbaseVerificationLevel
        level={profile.verificationLevel}
        attestationCount={profile.totalAttestations}
        showProgress
      />

      {/* Connection Status */}
      <CoinbaseConnectionStatus
        status={connectionStatus}
        onConnect={onConnect}
      />

      {/* Verified Since */}
      <div className="ascii-box p-3">
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Verified Since</span>
          <span data-testid="verified-since" className="font-mono">
            {new Date(profile.verifiedSince).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Attestation List */}
      <CoinbaseAttestationList attestations={profile.attestations} />
    </div>
  );
}

// =============================================================================
// useCoinbaseAttestation Hook
// =============================================================================

export function useCoinbaseAttestation(address: string) {
  const [profile, setProfile] = useState<CoinbaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const attestations = useMemo(
    () => profile?.attestations ?? [],
    [profile]
  );

  const verificationLevel = useMemo(
    () => profile?.verificationLevel ?? 'unverified',
    [profile]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      // In production, this would fetch from Coinbase/Base attestation API
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Mock profile data - in production this would come from the API
      setProfile({
        address,
        verificationLevel: 'unverified',
        attestations: [],
        verifiedSince: Date.now(),
        totalAttestations: 0,
        isConnected: true,
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
    attestations,
    verificationLevel,
    refresh,
  };
}
