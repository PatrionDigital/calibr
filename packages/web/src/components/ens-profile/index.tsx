/**
 * ENS Profile Integration Components
 * Task 6.4.4: ENS profile integration
 *
 * Integrates with Ethereum Name Service for human-readable identity.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface ENSRecord {
  key: string;
  value: string;
  verified: boolean;
}

export interface ENSProfile {
  address: string;
  name: string;
  avatar?: string;
  records: ENSRecord[];
  resolvedAt: number;
  expiresAt: number;
  isValid: boolean;
  registeredAt: number;
  owner: string;
}

// =============================================================================
// Constants
// =============================================================================

const RECORD_ICONS: Record<string, string> = {
  email: '📧',
  url: '🔗',
  'com.twitter': '🐦',
  'com.github': '🐙',
  'com.discord': '💬',
  description: '📝',
  avatar: '🖼️',
  'org.telegram': '✈️',
};

const SOCIAL_KEYS = ['com.twitter', 'com.github', 'com.discord', 'org.telegram'];

// =============================================================================
// ENSAvatar
// =============================================================================

interface ENSAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ENSAvatar({ src, name, size = 'md' }: ENSAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      data-testid="ens-avatar"
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-blue-400/20 flex items-center justify-center`}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} avatar`}
          className="w-full h-full object-cover"
        />
      ) : (
        <span data-testid="avatar-fallback" className="text-blue-400 font-mono font-bold">
          {initial}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// ENSNameBadge
// =============================================================================

interface ENSNameBadgeProps {
  name: string;
  isValid?: boolean;
  compact?: boolean;
}

export function ENSNameBadge({ name, isValid, compact }: ENSNameBadgeProps) {
  return (
    <span
      data-testid="ens-name-badge"
      role="status"
      className={`inline-flex items-center gap-1 font-mono font-bold rounded bg-blue-400/10 text-blue-400 text-xs ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      }`}
    >
      <span data-testid="ens-icon">📛</span>
      <span>{name}</span>
      {isValid && (
        <span data-testid="verified-indicator" className="text-green-400">✓</span>
      )}
    </span>
  );
}

// =============================================================================
// ENSProfileCard
// =============================================================================

interface ENSProfileCardProps {
  profile: ENSProfile;
  showSocials?: boolean;
}

export function ENSProfileCard({ profile, showSocials }: ENSProfileCardProps) {
  const isExpired = profile.expiresAt < Date.now();
  const description = profile.records.find((r) => r.key === 'description')?.value;
  const socialRecords = profile.records.filter((r) => SOCIAL_KEYS.includes(r.key));
  const truncatedAddress = `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`;

  return (
    <div
      data-testid="ens-profile-card"
      className="ascii-box p-4 border-blue-400/30 border"
    >
      <div className="flex items-start gap-4 mb-4">
        <ENSAvatar src={profile.avatar} name={profile.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-lg">{profile.name}</span>
            {profile.isValid && (
              <span data-testid="verified-indicator" className="text-green-400">✓</span>
            )}
            {isExpired && (
              <span className="text-xs text-red-400">expired</span>
            )}
          </div>
          <span
            data-testid="profile-address"
            className="text-sm text-[hsl(var(--muted-foreground))] font-mono"
          >
            {truncatedAddress}
          </span>
        </div>
      </div>

      {description && (
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {description}
        </p>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Registered</span>
          <span className="font-mono" data-testid="registered-date">
            {new Date(profile.registeredAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Expires</span>
          <span className={`font-mono ${isExpired ? 'text-red-400' : ''}`} data-testid="expiry-date">
            {new Date(profile.expiresAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {showSocials && socialRecords.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {socialRecords.map((record) => (
              <span
                key={record.key}
                className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded"
              >
                {RECORD_ICONS[record.key] ?? '🔗'} {record.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ENSConnectionStatus
// =============================================================================

interface ENSConnectionStatusProps {
  status: ConnectionStatus;
  error?: string;
  lastResolved?: number;
  onConnect?: () => void;
}

export function ENSConnectionStatus({
  status,
  error,
  lastResolved,
  onConnect,
}: ENSConnectionStatusProps) {
  return (
    <div
      data-testid="ens-connection-status"
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

      {status === 'connected' && lastResolved && (
        <p data-testid="last-resolved" className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Last resolved: {new Date(lastResolved).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// ENSRecordList
// =============================================================================

interface ENSRecordListProps {
  records: ENSRecord[];
  filterCategory?: 'social' | 'all';
}

export function ENSRecordList({ records, filterCategory }: ENSRecordListProps) {
  const filteredRecords = useMemo(() => {
    if (filterCategory === 'social') {
      return records.filter((r) => SOCIAL_KEYS.includes(r.key));
    }
    return records;
  }, [records, filterCategory]);

  return (
    <div data-testid="ens-record-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          Records
        </h3>
        <span data-testid="record-count" className="text-xs text-[hsl(var(--muted-foreground))]">
          {filteredRecords.length}
        </span>
      </div>

      {filteredRecords.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
          No records found
        </p>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <div
              key={record.key}
              className="ascii-box p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span data-testid="record-icon">{RECORD_ICONS[record.key] ?? '📄'}</span>
                <span className="font-mono text-sm">{record.key}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[hsl(var(--muted-foreground))] truncate max-w-[200px]">
                  {record.value}
                </span>
                {record.verified && (
                  <span data-testid="record-verified" className="text-green-400 text-xs">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ENSProfileLink
// =============================================================================

interface ENSProfileLinkProps {
  name: string;
  avatar?: string;
  isValid?: boolean;
}

export function ENSProfileLink({ name, avatar, isValid }: ENSProfileLinkProps) {
  return (
    <div data-testid="ens-profile-link" className="flex items-center gap-2">
      {avatar && <ENSAvatar src={avatar} name={name} size="sm" />}
      <a
        href={`https://app.ens.domains/${name}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-mono text-[hsl(var(--muted-foreground))] hover:text-blue-400"
      >
        {name}
      </a>
      {isValid && (
        <span data-testid="link-verified" className="text-green-400">✓</span>
      )}
    </div>
  );
}

// =============================================================================
// ENSIntegrationHub
// =============================================================================

interface ENSIntegrationHubProps {
  profile: ENSProfile | null;
  connectionStatus?: ConnectionStatus;
  onRefresh?: () => void;
  onConnect?: () => void;
}

export function ENSIntegrationHub({
  profile,
  connectionStatus = 'connected',
  onRefresh,
  onConnect,
}: ENSIntegrationHubProps) {
  if (!profile) {
    return (
      <div data-testid="ens-integration-hub" className="ascii-box p-6 text-center">
        <span className="text-4xl mb-4 block">📛</span>
        <p className="text-[hsl(var(--muted-foreground))]">
          No ENS name found for this address
        </p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="mt-4 px-4 py-2 font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
          >
            Register ENS Name
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="ens-integration-hub" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">ENS Profile</h2>
            <ENSProfileLink name={profile.name} avatar={profile.avatar} isValid={profile.isValid} />
          </div>
          <div className="flex items-center gap-3">
            <ENSNameBadge name={profile.name} isValid={profile.isValid} compact />
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
      </div>

      {/* Profile Card */}
      <ENSProfileCard profile={profile} showSocials />

      {/* Connection Status */}
      <ENSConnectionStatus
        status={connectionStatus}
        onConnect={onConnect}
      />

      {/* Resolved Time */}
      <div className="ascii-box p-3">
        <div className="flex justify-between text-sm">
          <span className="text-[hsl(var(--muted-foreground))]">Last Resolved</span>
          <span data-testid="resolved-time" className="font-mono">
            {new Date(profile.resolvedAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Record List */}
      <ENSRecordList records={profile.records} />
    </div>
  );
}

// =============================================================================
// useENSProfile Hook
// =============================================================================

export function useENSProfile(addressOrName: string) {
  const [profile, setProfile] = useState<ENSProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const name = useMemo(() => profile?.name ?? null, [profile]);
  const avatar = useMemo(() => profile?.avatar ?? null, [profile]);
  const records = useMemo(() => profile?.records ?? [], [profile]);
  const isValid = useMemo(() => profile?.isValid ?? false, [profile]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      // In production, this would fetch from ENS resolver
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Mock profile data - in production this would come from the resolver
      setProfile({
        address: addressOrName.startsWith('0x') ? addressOrName : '0x0000000000000000000000000000000000000000',
        name: addressOrName.endsWith('.eth') ? addressOrName : `${addressOrName.slice(0, 8)}.eth`,
        records: [],
        resolvedAt: Date.now(),
        expiresAt: Date.now() + 86400000 * 365,
        isValid: true,
        registeredAt: Date.now() - 86400000 * 365,
        owner: addressOrName.startsWith('0x') ? addressOrName : '0x0000000000000000000000000000000000000000',
      });
      setConnectionStatus('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve');
      setConnectionStatus('error');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [addressOrName]);

  useEffect(() => {
    refresh();
  }, [addressOrName, refresh]);

  return {
    profile,
    isLoading,
    error,
    connectionStatus,
    name,
    avatar,
    records,
    isValid,
    refresh,
  };
}
