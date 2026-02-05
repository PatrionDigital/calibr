'use client';

import { useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface RetroFundingRound {
  id: string;
  name: string;
  roundNumber: number;
  receivedOp: number;
  projectName: string;
  category: string;
  votedAt: string;
}

export interface OptimismProfile {
  address: string;
  citizenStatus: 'citizen' | 'delegate' | 'contributor' | 'none';
  totalOpReceived: number;
  roundsParticipated: number;
  rounds: RetroFundingRound[];
  attestationCount: number;
  delegateStatus: 'active' | 'inactive' | 'none';
  votingPower: number;
  connectedAt: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// =============================================================================
// OpBadge Component
// =============================================================================

interface OpBadgeProps {
  status: 'citizen' | 'delegate' | 'contributor' | 'none';
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  citizen: { label: 'OP Citizen', color: 'text-red-400' },
  delegate: { label: 'OP Delegate', color: 'text-blue-400' },
  contributor: { label: 'OP Contributor', color: 'text-green-400' },
  none: { label: 'Not Connected', color: 'text-[var(--terminal-dim)]' },
};

export function OpBadge({ status }: OpBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.none!;

  return (
    <span
      data-testid="op-badge"
      className={`inline-flex items-center gap-1 font-mono text-sm px-2 py-0.5 border border-current ${config.color}`}
    >
      <span className="text-xs">◆</span>
      <span>{config.label}</span>
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
  const date = new Date(round.votedAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      data-testid="retro-funding-card"
      className="border border-[var(--terminal-dim)] font-mono p-3"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-[var(--terminal-green)] font-bold text-sm">{round.name}</div>
        <div className="text-[var(--terminal-dim)] text-xs">{date}</div>
      </div>
      <div className="text-sm text-[var(--terminal-green)] mb-1">{round.projectName}</div>
      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--terminal-dim)] capitalize">{round.category.replace('-', ' ')}</span>
        <span className="text-red-400 font-bold">{formatNumber(round.receivedOp)} OP</span>
      </div>
    </div>
  );
}

// =============================================================================
// RetroFundingRoundList Component
// =============================================================================

interface RetroFundingRoundListProps {
  rounds: RetroFundingRound[];
}

export function RetroFundingRoundList({ rounds }: RetroFundingRoundListProps) {
  const totalOp = rounds.reduce((sum, r) => sum + r.receivedOp, 0);

  return (
    <div data-testid="retro-funding-list" className="font-mono">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[var(--terminal-green)] font-bold text-sm">RetroPGF Rounds</div>
        <div className="text-red-400 text-xs font-bold">{formatNumber(totalOp)} OP total</div>
      </div>
      {rounds.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No retro funding rounds
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => (
            <RetroFundingCard key={round.id} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// OptimismConnectionStatus Component
// =============================================================================

interface OptimismConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  error?: string;
}

const CONNECTION_LABELS: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Not Connected',
  syncing: 'Syncing...',
  error: 'Error',
};

export function OptimismConnectionStatus({ status, error }: OptimismConnectionStatusProps) {
  return (
    <div
      data-testid="op-connection-status"
      className="flex items-center gap-2 font-mono text-sm"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'connected'
            ? 'bg-green-400'
            : status === 'syncing'
              ? 'bg-yellow-400 animate-pulse'
              : status === 'error'
                ? 'bg-red-400'
                : 'bg-[var(--terminal-dim)]'
        }`}
      />
      <span className="text-[var(--terminal-green)]">{CONNECTION_LABELS[status]}</span>
      {status === 'error' && error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
    </div>
  );
}

// =============================================================================
// OptimismReputationScore Component
// =============================================================================

interface OptimismReputationScoreProps {
  profile: OptimismProfile;
}

export function OptimismReputationScore({ profile }: OptimismReputationScoreProps) {
  return (
    <div data-testid="op-reputation-score" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-3">Reputation Score</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-red-400 font-bold text-lg">{formatNumber(profile.totalOpReceived)}</div>
          <div className="text-[var(--terminal-dim)] text-xs">OP Received</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-[var(--terminal-green)] font-bold text-lg">{profile.roundsParticipated}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Rounds</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-[var(--terminal-green)] font-bold text-lg">{profile.attestationCount}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Attestations</div>
        </div>
        <div className="border border-[var(--terminal-dim)] p-2 text-center">
          <div className="text-blue-400 font-bold text-lg">{formatNumber(profile.votingPower)}</div>
          <div className="text-[var(--terminal-dim)] text-xs">Voting Power</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OptimismContributionSummary Component
// =============================================================================

interface OptimismContributionSummaryProps {
  profile: OptimismProfile;
}

export function OptimismContributionSummary({ profile }: OptimismContributionSummaryProps) {
  const connectedDate = new Date(profile.connectedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div data-testid="op-contribution-summary" className="font-mono">
      <div className="text-[var(--terminal-green)] font-bold text-sm mb-2">Contribution Summary</div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[var(--terminal-dim)] text-sm">Status</span>
          <OpBadge status={profile.citizenStatus} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--terminal-dim)] text-sm">Delegate</span>
          <span className="text-[var(--terminal-green)] text-sm capitalize">{profile.delegateStatus}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--terminal-dim)] text-sm">Connected</span>
          <span className="text-[var(--terminal-dim)] text-sm">{connectedDate}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// OptimismProfileLink Component
// =============================================================================

interface OptimismProfileLinkProps {
  address: string;
}

export function OptimismProfileLink({ address }: OptimismProfileLinkProps) {
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      data-testid="op-profile-link"
      className="flex items-center gap-2 font-mono text-sm border border-[var(--terminal-dim)] px-3 py-2"
    >
      <span className="text-red-400">◆</span>
      <span className="text-[var(--terminal-green)]">Optimism</span>
      <span className="text-[var(--terminal-dim)]">{truncated}</span>
    </div>
  );
}

// =============================================================================
// OptimismIntegrationHub Component
// =============================================================================

interface OptimismIntegrationHubProps {
  profile: OptimismProfile | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  loading?: boolean;
  onConnect?: () => void;
}

export function OptimismIntegrationHub({
  profile,
  status,
  loading = false,
  onConnect,
}: OptimismIntegrationHubProps) {
  if (loading) {
    return (
      <div data-testid="op-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading Optimism data...</div>
        </div>
      </div>
    );
  }

  if (!profile && status === 'disconnected') {
    return (
      <div data-testid="op-integration-hub" className="max-w-2xl mx-auto p-4 font-mono">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold mb-4">Optimism Collective</h2>
        <OptimismConnectionStatus status={status} />
        <div data-testid="connect-prompt" className="text-center py-8 space-y-4">
          <div className="text-[var(--terminal-dim)] text-sm">
            Connect your Optimism identity to import RetroPGF reputation
          </div>
          <button
            data-testid="connect-button"
            onClick={onConnect}
            className="border border-red-400 text-red-400 px-4 py-2 font-mono text-sm hover:bg-red-400 hover:text-black transition-colors"
          >
            Connect Optimism
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="op-integration-hub" className="max-w-2xl mx-auto p-4 font-mono space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-[var(--terminal-green)] text-lg font-bold">Optimism Collective</h2>
        <OptimismConnectionStatus status={status} />
      </div>

      {profile && (
        <>
          <OptimismReputationScore profile={profile} />
          <OptimismContributionSummary profile={profile} />
          <RetroFundingRoundList rounds={profile.rounds} />
          <OptimismProfileLink address={profile.address} />
        </>
      )}
    </div>
  );
}

// =============================================================================
// useOptimismReputation Hook
// =============================================================================

interface UseOptimismReputationReturn {
  isConnected: boolean;
  totalOp: number;
  roundCount: number;
  citizenStatus: string;
  reputationTier: string;
}

export function useOptimismReputation(
  profile: OptimismProfile | null
): UseOptimismReputationReturn {
  const isConnected = profile !== null;

  const totalOp = useMemo(() => profile?.totalOpReceived ?? 0, [profile]);

  const roundCount = useMemo(() => profile?.roundsParticipated ?? 0, [profile]);

  const citizenStatus = useMemo(() => profile?.citizenStatus ?? 'none', [profile]);

  const reputationTier = useMemo(() => {
    if (!profile) return 'none';
    const op = profile.totalOpReceived;
    if (op >= 100000) return 'platinum';
    if (op >= 50000) return 'gold';
    if (op >= 10000) return 'silver';
    return 'bronze';
  }, [profile]);

  return {
    isConnected,
    totalOp,
    roundCount,
    citizenStatus,
    reputationTier,
  };
}
