'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface RetroFundingRound {
  id: string;
  roundNumber: number;
  name: string;
  participatedAs: 'voter' | 'badgeholder' | 'recipient';
  votingPower: number;
  projectsVoted: number;
  fundingAllocated: number;
  completedAt: number;
}

export interface OptimismProfile {
  address: string;
  ensName?: string;
  isCitizen: boolean;
  citizenSince?: number;
  badgeholderRounds: number[];
  retroFundingParticipation: RetroFundingRound[];
  totalVotingPower: number;
  reputationScore: number;
  attestations: string[];
}

export interface CitizenStatus {
  isCitizen: boolean;
  since?: number;
  votingPower: number;
  badgeholderStatus: boolean;
  attestationUid?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type BadgeType = 'citizen' | 'badgeholder' | 'voter' | 'recipient';

// =============================================================================
// Constants
// =============================================================================

const BADGE_STYLES: Record<BadgeType, { icon: string; label: string }> = {
  citizen: { icon: '🏛️', label: 'Citizen' },
  badgeholder: { icon: '🎖️', label: 'Badgeholder' },
  voter: { icon: '🗳️', label: 'Voter' },
  recipient: { icon: '🏆', label: 'Recipient' },
};

const PARTICIPATION_STYLES: Record<string, { border: string; icon: string }> = {
  voter: { border: 'border-blue-400/30', icon: '🗳️' },
  badgeholder: { border: 'border-red-400/30', icon: '🎖️' },
  recipient: { border: 'border-green-400/30', icon: '🏆' },
};

// =============================================================================
// Utility Functions
// =============================================================================

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

// =============================================================================
// OptimismBadge Component
// =============================================================================

interface OptimismBadgeProps {
  type: BadgeType;
  verified?: boolean;
  roundNumber?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function OptimismBadge({ type, verified, roundNumber, size = 'md' }: OptimismBadgeProps) {
  const badge = BADGE_STYLES[type];
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      data-testid="optimism-badge"
      role="status"
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold rounded bg-red-400/10 text-red-400',
        sizeClasses[size]
      )}
    >
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
      {roundNumber && <span className="text-[hsl(var(--muted-foreground))]">#{roundNumber}</span>}
      {verified && (
        <span data-testid="verified-icon" className="text-green-400">
          ✓
        </span>
      )}
    </span>
  );
}

// =============================================================================
// RetroFundingCard Component
// =============================================================================

interface RetroFundingCardProps {
  round: RetroFundingRound;
}

export function RetroFundingCard({ round }: RetroFundingCardProps) {
  const style = PARTICIPATION_STYLES[round.participatedAs] ?? PARTICIPATION_STYLES.voter!;

  return (
    <div
      data-testid="retro-funding-card"
      className={cn('ascii-box p-4', style.border, 'border')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span data-testid="participation-icon" className="text-lg">
            {style.icon}
          </span>
          <span className="font-mono font-bold">{round.name}</span>
        </div>
        <OptimismBadge type={round.participatedAs} size="sm" />
      </div>

      <div className="space-y-2 text-sm">
        {round.participatedAs !== 'recipient' && round.votingPower > 0 && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Voting Power</span>
            <span className="font-mono">{formatNumber(round.votingPower)}</span>
          </div>
        )}

        {round.participatedAs !== 'recipient' && round.projectsVoted > 0 && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Projects Voted</span>
            <span data-testid="projects-voted" className="font-mono">
              {round.projectsVoted}
            </span>
          </div>
        )}

        {round.participatedAs === 'recipient' && round.fundingAllocated > 0 && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Funding Received</span>
            <span className="font-mono text-green-400">${formatNumber(round.fundingAllocated)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Completed</span>
          <span data-testid="completion-date" className="font-mono text-xs">
            {formatDate(round.completedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OptimismReputationScore Component
// =============================================================================

interface OptimismReputationScoreProps {
  score: number;
  maxScore?: number;
  votingPower?: number;
}

export function OptimismReputationScore({ score, maxScore = 100, votingPower }: OptimismReputationScoreProps) {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div data-testid="optimism-reputation-score" className="ascii-box p-4">
      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">Optimism Reputation</div>
      <div className="flex items-baseline gap-2">
        <span data-testid="score-value" className={cn('text-3xl font-mono font-bold', getScoreColor())}>
          {score}
        </span>
        <span className="text-sm text-[hsl(var(--muted-foreground))]">/ {maxScore}</span>
      </div>
      {votingPower !== undefined && (
        <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Voting Power: <span className="font-mono text-red-400">{formatNumber(votingPower)}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// OptimismConnectionStatus Component
// =============================================================================

interface OptimismConnectionStatusProps {
  status: ConnectionStatus;
  error?: string;
  lastSynced?: number;
  onConnect?: () => void;
}

export function OptimismConnectionStatus({
  status,
  error,
  lastSynced,
  onConnect,
}: OptimismConnectionStatusProps) {
  const statusConfig: Record<ConnectionStatus, { text: string; color: string }> = {
    connected: { text: 'Connected', color: 'text-green-400' },
    disconnected: { text: 'Not Connected', color: 'text-[hsl(var(--muted-foreground))]' },
    connecting: { text: 'Connecting...', color: 'text-yellow-400' },
    error: { text: 'Error', color: 'text-red-400' },
  };

  const config = statusConfig[status];

  return (
    <div data-testid="connection-status" role="status" className="ascii-box p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'connecting' && (
            <span data-testid="connecting-spinner" className="animate-spin">
              ⏳
            </span>
          )}
          {status === 'connected' && <span className="text-green-400">●</span>}
          {status === 'disconnected' && <span className="text-[hsl(var(--muted-foreground))]">○</span>}
          {status === 'error' && <span className="text-red-400">✗</span>}
          <span className={config.color}>{config.text}</span>
        </div>

        {status === 'disconnected' && onConnect && (
          <button
            onClick={onConnect}
            aria-label="Connect to Optimism"
            className="px-3 py-1 text-xs font-mono bg-red-400/20 text-red-400 rounded hover:bg-red-400/30"
          >
            Connect
          </button>
        )}
      </div>

      {status === 'error' && error && (
        <div className="mt-2 text-xs text-red-400">{error}</div>
      )}

      {status === 'connected' && lastSynced && (
        <div data-testid="last-synced" className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
          Last synced: {formatDate(lastSynced)}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RetroFundingHistory Component
// =============================================================================

interface RetroFundingHistoryProps {
  rounds: RetroFundingRound[];
}

export function RetroFundingHistory({ rounds }: RetroFundingHistoryProps) {
  const totalVotingPower = rounds.reduce((sum, r) => sum + r.votingPower, 0);
  const totalFunding = rounds.reduce((sum, r) => sum + r.fundingAllocated, 0);

  return (
    <div data-testid="retro-funding-history" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          RetroPGF History
        </h3>
        <span data-testid="round-count" className="text-xs text-[hsl(var(--muted-foreground))]">
          {rounds.length} rounds
        </span>
      </div>

      {rounds.length === 0 ? (
        <div className="ascii-box p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No participation history
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="ascii-box p-3 text-center">
              <div data-testid="total-voting-power" className="text-lg font-mono font-bold text-red-400">
                {formatNumber(totalVotingPower)}
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Total Voting Power</div>
            </div>
            <div className="ascii-box p-3 text-center">
              <div data-testid="total-funding" className="text-lg font-mono font-bold text-green-400">
                ${formatNumber(totalFunding)}
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Funding Received</div>
            </div>
          </div>

          <div className="space-y-3">
            {rounds.map((round) => (
              <RetroFundingCard key={round.id} round={round} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// OptimismProfileLink Component
// =============================================================================

interface OptimismProfileLinkProps {
  address: string;
  ensName?: string;
  isCitizen?: boolean;
}

export function OptimismProfileLink({ address, ensName, isCitizen }: OptimismProfileLinkProps) {
  const displayName = ensName || truncateAddress(address);
  const profileUrl = `https://app.optimism.io/retropgf/3/ballot/${address}`;

  return (
    <div data-testid="optimism-profile-link" className="flex items-center gap-2">
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-red-400 hover:underline flex items-center gap-1"
      >
        <span>🔴</span>
        <span>{displayName}</span>
        <span className="text-xs">↗</span>
      </a>
      {isCitizen && (
        <span data-testid="citizen-indicator" className="text-xs bg-red-400/20 text-red-400 px-1.5 py-0.5 rounded">
          🏛️
        </span>
      )}
    </div>
  );
}

// =============================================================================
// CitizenBadge Component
// =============================================================================

interface CitizenBadgeProps {
  status: CitizenStatus;
}

export function CitizenBadge({ status }: CitizenBadgeProps) {
  if (!status.isCitizen) {
    return null;
  }

  const verificationUrl = status.attestationUid
    ? `https://optimism.easscan.org/attestation/view/${status.attestationUid}`
    : '#';

  return (
    <div data-testid="citizen-badge" className="ascii-box p-4 border-red-400/30 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          <span className="font-mono font-bold text-red-400">Optimism Citizen</span>
        </div>
        {status.badgeholderStatus && (
          <span data-testid="badgeholder-indicator" className="text-xs bg-red-400/20 text-red-400 px-2 py-0.5 rounded">
            🎖️ Badgeholder
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {status.since && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Citizen Since</span>
            <span data-testid="citizen-since" className="font-mono">
              {formatDate(status.since)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Voting Power</span>
          <span className="font-mono text-red-400">{formatNumber(status.votingPower)}</span>
        </div>
      </div>

      <div className="mt-3">
        <a
          href={verificationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[hsl(var(--muted-foreground))] hover:text-red-400"
        >
          Verify on EAS ↗
        </a>
      </div>
    </div>
  );
}

// =============================================================================
// OptimismIntegrationHub Component
// =============================================================================

interface OptimismIntegrationHubProps {
  profile: OptimismProfile | null;
  connectionStatus?: ConnectionStatus;
  onConnect?: () => void;
  onRefresh?: () => void;
}

export function OptimismIntegrationHub({
  profile,
  connectionStatus = 'disconnected',
  onConnect,
  onRefresh,
}: OptimismIntegrationHubProps) {
  if (!profile) {
    return (
      <div data-testid="optimism-integration-hub" className="ascii-box p-6 text-center">
        <span className="text-4xl mb-4 block">🔴</span>
        <h2 className="text-lg font-mono font-bold mb-2">Optimism Collective</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Connect your Optimism profile to import your RetroPGF reputation
        </p>
        {onConnect && (
          <button
            onClick={onConnect}
            className="px-4 py-2 font-mono text-sm bg-red-400/20 text-red-400 rounded hover:bg-red-400/30"
          >
            Connect Optimism
          </button>
        )}
      </div>
    );
  }

  const citizenStatus: CitizenStatus = {
    isCitizen: profile.isCitizen,
    since: profile.citizenSince,
    votingPower: profile.totalVotingPower,
    badgeholderStatus: profile.badgeholderRounds.length > 0,
  };

  return (
    <div data-testid="optimism-integration-hub" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-red-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Optimism Collective</h2>
            <OptimismProfileLink
              address={profile.address}
              ensName={profile.ensName}
              isCitizen={profile.isCitizen}
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh Optimism data"
              className="px-3 py-1 text-xs font-mono bg-red-400/20 text-red-400 rounded hover:bg-red-400/30"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <OptimismConnectionStatus status={connectionStatus} onConnect={onConnect} />

      {/* Reputation Score */}
      <OptimismReputationScore
        score={profile.reputationScore}
        votingPower={profile.totalVotingPower}
      />

      {/* Citizen Badge */}
      {profile.isCitizen && <CitizenBadge status={citizenStatus} />}

      {/* Badgeholder Rounds */}
      {profile.badgeholderRounds.length > 0 && (
        <div className="ascii-box p-4">
          <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
            Badgeholder Rounds
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.badgeholderRounds.map((round) => (
              <OptimismBadge key={round} type="badgeholder" roundNumber={round} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* RetroPGF History */}
      <RetroFundingHistory rounds={profile.retroFundingParticipation} />
    </div>
  );
}

// =============================================================================
// useOptimismReputation Hook
// =============================================================================

export function useOptimismReputation(address: string) {
  const [profile, setProfile] = useState<OptimismProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const totalVotingPower = useMemo(
    () => profile?.totalVotingPower ?? 0,
    [profile]
  );

  const isCitizen = useMemo(
    () => profile?.isCitizen ?? false,
    [profile]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      // In production, this would fetch from Optimism API
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Mock profile data - in production this would come from the API
      setProfile({
        address,
        isCitizen: false,
        badgeholderRounds: [],
        retroFundingParticipation: [],
        totalVotingPower: 0,
        reputationScore: 0,
        attestations: [],
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
    totalVotingPower,
    isCitizen,
    refresh,
  };
}
