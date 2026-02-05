'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface CoinbaseVerification {
  id: string;
  type: string;
  label: string;
  verifiedAt: string;
  level: number;
  active: boolean;
}

export interface CoinbaseProfile {
  address: string;
  verifications: CoinbaseVerification[];
  overallLevel: number;
  totalVerifications: number;
  activeVerifications: number;
  connectedAt: string;
  onchainId: string;
}

// =============================================================================
// VerificationBadge Component
// =============================================================================

interface VerificationBadgeProps {
  type: string;
  active: boolean;
}

export function VerificationBadge({ type, active }: VerificationBadgeProps) {
  return (
    <span
      data-testid="verification-badge"
      className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 border ${
        active
          ? 'verified border-blue-400 text-blue-400'
          : 'unverified border-[var(--terminal-dim)] text-[var(--terminal-dim)]'
      }`}
    >
      <span>{active ? '✓' : '○'}</span>
      <span className="capitalize">{type.replace('-', ' ')}</span>
    </span>
  );
}

// =============================================================================
// VerificationCard Component
// =============================================================================

interface VerificationCardProps {
  verification: CoinbaseVerification;
}

export function VerificationCard({ verification }: VerificationCardProps) {
  const date = new Date(verification.verifiedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      data-testid="verification-card"
      className="border border-[var(--terminal-dim)] font-mono p-3"
    >
      <div className="flex justify-between items-start mb-1">
        <div className="text-[var(--terminal-green)] text-sm font-bold">{verification.label}</div>
        <span
          className={`text-xs px-1 ${
            verification.active ? 'text-green-400' : 'text-[var(--terminal-dim)]'
          }`}
        >
          {verification.active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex justify-between items-center text-xs text-[var(--terminal-dim)]">
        <span>Level {verification.level}</span>
        <span>{date}</span>
      </div>
    </div>
  );
}

// =============================================================================
// VerificationList Component
// =============================================================================

interface VerificationListProps {
  verifications: CoinbaseVerification[];
}

export function VerificationList({ verifications }: VerificationListProps) {
  const activeCount = verifications.filter((v) => v.active).length;

  return (
    <div data-testid="verification-list" className="font-mono">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[var(--terminal-green)] font-bold text-sm">Verifications</div>
        <div className="text-[var(--terminal-dim)] text-xs">{activeCount} active</div>
      </div>
      {verifications.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No verifications
        </div>
      ) : (
        <div className="space-y-2">
          {verifications.map((v) => (
            <VerificationCard key={v.id} verification={v} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CoinbaseConnectionStatus Component
// =============================================================================

interface CoinbaseConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  error?: string;
}

const CB_STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Not Connected',
  syncing: 'Syncing...',
  error: 'Error',
};

export function CoinbaseConnectionStatus({ status, error }: CoinbaseConnectionStatusProps) {
  return (
    <div
      data-testid="cb-connection-status"
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
      <span className="text-[var(--terminal-green)]">{CB_STATUS_LABELS[status]}</span>
      {status === 'error' && error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
}

// =============================================================================
// CoinbaseVerificationLevel Component
// =============================================================================

interface CoinbaseVerificationLevelProps {
  level: number;
  maxLevel: number;
}

export function CoinbaseVerificationLevel({ level, maxLevel }: CoinbaseVerificationLevelProps) {
  const percentage = maxLevel > 0 ? (level / maxLevel) * 100 : 0;

  return (
    <div data-testid="cb-verification-level" className="font-mono">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[var(--terminal-green)] text-sm">Verification Level</span>
        <span className="text-blue-400 font-bold text-sm">
          {level} / {maxLevel}
        </span>
      </div>
      <div data-testid="level-progress" className="h-2 border border-[var(--terminal-dim)]">
        <div
          className="h-full bg-blue-400"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// CoinbaseProfileSummary Component
// =============================================================================

interface CoinbaseProfileSummaryProps {
  profile: CoinbaseProfile;
}

export function CoinbaseProfileSummary({ profile }: CoinbaseProfileSummaryProps) {
  return (
    <div data-testid="cb-profile-summary" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Profile Summary</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-blue-400 font-bold text-lg">{profile.overallLevel}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Overall Level</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-[var(--terminal-green)] font-bold text-lg">{profile.activeVerifications}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Active</div>
        </div>
      </div>
      <div className="mt-2 text-[var(--terminal-dim)] text-xs">
        ID: {profile.onchainId}
      </div>
    </div>
  );
}

// =============================================================================
// CoinbaseProfileLink Component
// =============================================================================

interface CoinbaseProfileLinkProps {
  address: string;
}

export function CoinbaseProfileLink({ address }: CoinbaseProfileLinkProps) {
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      data-testid="cb-profile-link"
      className="flex items-center gap-2 font-mono text-sm border border-[var(--terminal-dim)] px-3 py-2"
    >
      <span className="text-blue-400">◆</span>
      <span className="text-[var(--terminal-green)]">Coinbase</span>
      <span className="text-[var(--terminal-dim)]">{truncated}</span>
    </div>
  );
}

// =============================================================================
// CoinbaseIntegrationHub Component
// =============================================================================

interface CoinbaseIntegrationHubProps {
  profile: CoinbaseProfile | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  loading?: boolean;
  onConnect?: () => void;
}

export function CoinbaseIntegrationHub({
  profile,
  status,
  loading = false,
  onConnect,
}: CoinbaseIntegrationHubProps) {
  if (loading) {
    return (
      <div data-testid="cb-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading Coinbase data...</div>
        </div>
      </div>
    );
  }

  if (!profile && status === 'disconnected') {
    return (
      <div data-testid="cb-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold mb-4">Coinbase Verifications</h2>
        <CoinbaseConnectionStatus status={status} />
        <div data-testid="connect-prompt" className="text-center py-8 space-y-4">
          <div className="text-[var(--terminal-dim)] text-sm">
            Connect your Coinbase verification to import identity attestations
          </div>
          <button
            data-testid="connect-button"
            onClick={onConnect}
            className="border border-blue-400 text-blue-400 px-4 py-2 font-mono text-sm hover:bg-blue-400 hover:text-black transition-colors"
          >
            Connect Coinbase
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cb-integration-hub" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold">Coinbase Verifications</h2>
        <CoinbaseConnectionStatus status={status} />
      </div>

      {profile && (
        <>
          <CoinbaseProfileSummary profile={profile} />
          <CoinbaseVerificationLevel level={profile.overallLevel} maxLevel={5} />
          <VerificationList verifications={profile.verifications} />
          <CoinbaseProfileLink address={profile.address} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// useCoinbaseVerification Hook
// =============================================================================

interface UseCoinbaseVerificationReturn {
  isConnected: boolean;
  overallLevel: number;
  activeCount: number;
  verificationTypes: string[];
  trustScore: number;
}

export function useCoinbaseVerification(
  profile: CoinbaseProfile | null
): UseCoinbaseVerificationReturn {
  const isConnected = profile !== null;

  const overallLevel = useMemo(() => profile?.overallLevel ?? 0, [profile]);

  const activeCount = useMemo(
    () => profile?.verifications.filter((v) => v.active).length ?? 0,
    [profile]
  );

  const verificationTypes = useMemo(
    () => profile?.verifications.map((v) => v.type) ?? [],
    [profile]
  );

  const trustScore = useMemo(() => {
    if (!profile) return 0;
    const levelScore = profile.overallLevel * 20;
    const activeScore = activeCount * 10;
    return Math.min(levelScore + activeScore, 100);
  }, [profile, activeCount]);

  return {
    isConnected,
    overallLevel,
    activeCount,
    verificationTypes,
    trustScore,
  };
}
