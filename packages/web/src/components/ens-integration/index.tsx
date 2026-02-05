'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface EnsRecord {
  key: string;
  value: string;
  verified: boolean;
}

export interface EnsProfile {
  address: string;
  ensName: string;
  avatar: string | null;
  records: EnsRecord[];
  resolvedAt: string;
  expiresAt: string;
  registeredAt: string;
  ownerAddress: string;
  isPrimary: boolean;
}

// =============================================================================
// EnsAvatar Component
// =============================================================================

interface EnsAvatarProps {
  src: string | null;
  name: string;
}

export function EnsAvatar({ src, name }: EnsAvatarProps) {
  const fallback = name.charAt(0).toUpperCase();

  return (
    <div
      data-testid="ens-avatar"
      className="w-10 h-10 border border-[var(--terminal-dim)] flex items-center justify-center font-mono overflow-hidden"
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[var(--terminal-green)] font-bold">{fallback}</span>
      )}
    </div>
  );
}

// =============================================================================
// EnsNameBadge Component
// =============================================================================

interface EnsNameBadgeProps {
  name: string;
  isPrimary: boolean;
}

export function EnsNameBadge({ name, isPrimary }: EnsNameBadgeProps) {
  return (
    <span
      data-testid="ens-name-badge"
      className="inline-flex items-center gap-1 font-mono text-sm px-2 py-0.5 border border-[var(--terminal-dim)]"
    >
      <span className="text-blue-400">{name}</span>
      {isPrimary && (
        <span className="text-[var(--terminal-green)] text-xs">Primary</span>
      )}
    </span>
  );
}

// =============================================================================
// EnsRecordCard Component
// =============================================================================

interface EnsRecordCardProps {
  record: EnsRecord;
}

export function EnsRecordCard({ record }: EnsRecordCardProps) {
  const label = record.key.replace('com.', '').replace('org.', '');

  return (
    <div
      data-testid="ens-record-card"
      className="border border-[var(--terminal-dim)] font-mono p-3"
    >
      <div className="flex justify-between items-start mb-1">
        <div className="text-[var(--terminal-green)] text-sm font-bold capitalize">{label}</div>
        <span
          className={`text-xs px-1 ${
            record.verified ? 'text-green-400' : 'text-[var(--terminal-dim)]'
          }`}
        >
          {record.verified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <div className="text-[var(--terminal-dim)] text-xs truncate">{record.value}</div>
    </div>
  );
}

// =============================================================================
// EnsRecordList Component
// =============================================================================

interface EnsRecordListProps {
  records: EnsRecord[];
}

export function EnsRecordList({ records }: EnsRecordListProps) {
  const verifiedCount = records.filter((r) => r.verified).length;

  return (
    <div data-testid="ens-record-list" className="font-mono">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[var(--terminal-green)] font-bold text-sm">Records</div>
        <div className="text-[var(--terminal-dim)] text-xs">{verifiedCount} verified</div>
      </div>
      {records.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No records
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <EnsRecordCard key={r.key} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EnsConnectionStatus Component
// =============================================================================

interface EnsConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  error?: string;
}

const ENS_STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Not Connected',
  syncing: 'Resolving...',
  error: 'Error',
};

export function EnsConnectionStatus({ status, error }: EnsConnectionStatusProps) {
  return (
    <div
      data-testid="ens-connection-status"
      className="flex items-center gap-2 font-mono text-sm"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'connected'
            ? 'bg-blue-400'
            : status === 'syncing'
              ? 'bg-yellow-400 animate-pulse'
              : status === 'error'
                ? 'bg-red-400'
                : 'bg-[var(--terminal-dim)]'
        }`}
      />
      <span className="text-[var(--terminal-green)]">{ENS_STATUS_LABELS[status]}</span>
      {status === 'error' && error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
}

// =============================================================================
// EnsResolutionInfo Component
// =============================================================================

interface EnsResolutionInfoProps {
  resolvedAt: string;
  expiresAt: string;
}

export function EnsResolutionInfo({ resolvedAt, expiresAt }: EnsResolutionInfoProps) {
  const resolvedDate = new Date(resolvedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div data-testid="ens-resolution-info" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Resolution</div>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[var(--terminal-dim)] text-sm">Resolved</span>
          <span className="text-[var(--terminal-dim)] text-sm">{resolvedDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--terminal-dim)] text-sm">Expires</span>
          <span className="text-[var(--terminal-dim)] text-sm">{expiryDate}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EnsProfileSummary Component
// =============================================================================

interface EnsProfileSummaryProps {
  profile: EnsProfile;
}

export function EnsProfileSummary({ profile }: EnsProfileSummaryProps) {
  const registeredDate = new Date(profile.registeredAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div data-testid="ens-profile-summary" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">ENS Profile</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-blue-400 font-bold text-sm">{profile.ensName}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Name</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-[var(--terminal-green)] font-bold text-lg">{profile.records.length}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Records</div>
        </div>
      </div>
      <div className="mt-2 text-[var(--terminal-dim)] text-xs">
        Registered: {registeredDate}
      </div>
    </div>
  );
}

// =============================================================================
// EnsProfileLink Component
// =============================================================================

interface EnsProfileLinkProps {
  ensName: string;
  address: string;
}

export function EnsProfileLink({ ensName, address }: EnsProfileLinkProps) {
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      data-testid="ens-profile-link"
      className="flex items-center gap-2 font-mono text-sm border border-[var(--terminal-dim)] px-3 py-2"
    >
      <span className="text-blue-400">◆</span>
      <span className="text-[var(--terminal-green)]">ENS</span>
      <span className="text-blue-400">{ensName}</span>
      <span className="text-[var(--terminal-dim)]">{truncated}</span>
    </div>
  );
}

// =============================================================================
// EnsIntegrationHub Component
// =============================================================================

interface EnsIntegrationHubProps {
  profile: EnsProfile | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  loading?: boolean;
  onConnect?: () => void;
}

export function EnsIntegrationHub({
  profile,
  status,
  loading = false,
  onConnect,
}: EnsIntegrationHubProps) {
  if (loading) {
    return (
      <div data-testid="ens-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Resolving ENS name...</div>
        </div>
      </div>
    );
  }

  if (!profile && status === 'disconnected') {
    return (
      <div data-testid="ens-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold mb-4">ENS Identity</h2>
        <EnsConnectionStatus status={status} />
        <div data-testid="connect-prompt" className="text-center py-8 space-y-4">
          <div className="text-[var(--terminal-dim)] text-sm">
            Connect your ENS name to import on-chain identity records
          </div>
          <button
            data-testid="connect-button"
            onClick={onConnect}
            className="border border-blue-400 text-blue-400 px-4 py-2 font-mono text-sm hover:bg-blue-400 hover:text-black transition-colors"
          >
            Connect ENS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ens-integration-hub" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold">ENS Identity</h2>
        <EnsConnectionStatus status={status} />
      </div>

      {profile && (
        <>
          <EnsProfileSummary profile={profile} />
          <EnsResolutionInfo resolvedAt={profile.resolvedAt} expiresAt={profile.expiresAt} />
          <EnsRecordList records={profile.records} />
          <EnsProfileLink ensName={profile.ensName} address={profile.address} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// useEnsIdentity Hook
// =============================================================================

interface UseEnsIdentityReturn {
  isConnected: boolean;
  ensName: string;
  recordCount: number;
  verifiedRecordCount: number;
  isPrimary: boolean;
  identityScore: number;
}

export function useEnsIdentity(
  profile: EnsProfile | null
): UseEnsIdentityReturn {
  const isConnected = profile !== null;

  const ensName = useMemo(() => profile?.ensName ?? '', [profile]);

  const recordCount = useMemo(
    () => profile?.records.length ?? 0,
    [profile]
  );

  const verifiedRecordCount = useMemo(
    () => profile?.records.filter((r) => r.verified).length ?? 0,
    [profile]
  );

  const isPrimary = useMemo(() => profile?.isPrimary ?? false, [profile]);

  const identityScore = useMemo(() => {
    if (!profile) return 0;
    let score = 20; // base score for having ENS
    if (profile.isPrimary) score += 20;
    score += profile.records.length * 5;
    score += profile.records.filter((r) => r.verified).length * 15;
    return Math.min(score, 100);
  }, [profile]);

  return {
    isConnected,
    ensName,
    recordCount,
    verifiedRecordCount,
    isPrimary,
    identityScore,
  };
}
