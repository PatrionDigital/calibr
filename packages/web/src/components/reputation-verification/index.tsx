/**
 * Reputation Verification Components
 * Task 6.4.7: Add reputation verification
 *
 * Verify and validate imported reputation from external platforms.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unverified' | 'expired';

export interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'pending';
  timestamp: number | null;
  details: string | null;
}

export interface VerificationResult {
  platform: string;
  status: VerificationStatus;
  verifiedAt: number;
  expiresAt: number | null;
  checks: VerificationCheck[];
  confidence: number;
  verifier: string | null;
  signature: string | null;
}

export interface PlatformVerification {
  platform: string;
  name: string;
  icon: string;
  lastVerified: number | null;
  status: VerificationStatus;
  confidence: number;
  checksCompleted: number;
  totalChecks: number;
}

// =============================================================================
// VerificationBadge
// =============================================================================

interface VerificationBadgeProps {
  status: VerificationStatus;
  confidence?: number;
  compact?: boolean;
}

export function VerificationBadge({ status, confidence, compact }: VerificationBadgeProps) {
  const statusColors: Record<VerificationStatus, string> = {
    verified: 'text-green-400',
    failed: 'text-red-400',
    pending: 'text-yellow-400',
    unverified: 'text-zinc-400',
    expired: 'text-orange-400',
  };

  const statusIcons: Record<VerificationStatus, string> = {
    verified: '✓',
    failed: '✗',
    pending: '◌',
    unverified: '○',
    expired: '⚠',
  };

  return (
    <span
      data-testid="verification-badge"
      className={`inline-flex items-center gap-1 font-mono text-xs rounded ${statusColors[status]} ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      } bg-zinc-800/50`}
    >
      <span>{statusIcons[status]}</span>
      <span className="capitalize">{status}</span>
      {confidence !== undefined && status === 'verified' && (
        <span className="text-[hsl(var(--muted-foreground))] ml-1">{confidence}%</span>
      )}
    </span>
  );
}

// =============================================================================
// VerificationProgress
// =============================================================================

interface VerificationProgressProps {
  completed: number;
  total: number;
  showPercentage?: boolean;
  label?: string;
}

export function VerificationProgress({
  completed,
  total,
  showPercentage,
  label,
}: VerificationProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div data-testid="verification-progress" className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[hsl(var(--muted-foreground))]">
          {label ?? 'Progress'}
        </span>
        <span className="font-mono">
          {completed} / {total}
          {showPercentage && ` (${percentage}%)`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 bg-zinc-800 rounded overflow-hidden"
      >
        <div
          data-testid="progress-fill"
          className="h-full bg-green-400 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// VerificationCheckList
// =============================================================================

interface VerificationCheckListProps {
  checks: VerificationCheck[];
  showDescriptions?: boolean;
  showDetails?: boolean;
}

export function VerificationCheckList({
  checks,
  showDescriptions,
  showDetails,
}: VerificationCheckListProps) {
  if (checks.length === 0) {
    return (
      <div data-testid="verification-check-list" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No checks available</p>
      </div>
    );
  }

  return (
    <div data-testid="verification-check-list" className="space-y-2">
      {checks.map((check) => (
        <div
          key={check.id}
          data-testid="check-item"
          className="ascii-box p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {check.status === 'passed' && (
                <span data-testid="check-passed" className="text-green-400">✓</span>
              )}
              {check.status === 'failed' && (
                <span data-testid="check-failed" className="text-red-400">✗</span>
              )}
              {check.status === 'pending' && (
                <span data-testid="check-pending" className="text-yellow-400">◌</span>
              )}
              <span className="font-mono text-sm">{check.name}</span>
            </div>
            {check.timestamp && (
              <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                {new Date(check.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          {showDescriptions && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-6">
              {check.description}
            </p>
          )}
          {showDetails && check.details && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 ml-6 font-mono">
              {check.details}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// VerificationResultCard
// =============================================================================

interface VerificationResultCardProps {
  result: VerificationResult;
  onVerify?: (platform: string) => void;
}

export function VerificationResultCard({ result, onVerify }: VerificationResultCardProps) {
  const passedChecks = result.checks.filter((c) => c.status === 'passed').length;
  const truncatedVerifier = result.verifier
    ? `${result.verifier.slice(0, 6)}...${result.verifier.slice(-4)}`
    : null;

  return (
    <div
      data-testid="verification-result-card"
      className="ascii-box p-4 border-blue-400/30 border"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-mono font-bold capitalize">{result.platform}</h3>
          <VerificationBadge status={result.status} confidence={result.confidence} />
        </div>
        {result.status !== 'verified' && onVerify && (
          <button
            onClick={() => onVerify(result.platform)}
            className="px-3 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
          >
            Verify
          </button>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Verified At</span>
          <span data-testid="verified-at" className="font-mono">
            {new Date(result.verifiedAt).toLocaleString()}
          </span>
        </div>
        {result.expiresAt && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Expires</span>
            <span data-testid="expires-at" className="font-mono">
              {new Date(result.expiresAt).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Confidence</span>
          <span className="font-mono text-green-400">{result.confidence}%</span>
        </div>
        <div data-testid="checks-summary" className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Checks</span>
          <span className="font-mono">
            {passedChecks} / {result.checks.length} passed
          </span>
        </div>
        {truncatedVerifier && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Verifier</span>
            <span className="font-mono text-xs">{truncatedVerifier}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PlatformVerificationCard
// =============================================================================

interface PlatformVerificationCardProps {
  verification: PlatformVerification;
  onVerify: (platform: string) => void;
  isVerifying?: boolean;
}

export function PlatformVerificationCard({
  verification,
  onVerify,
  isVerifying,
}: PlatformVerificationCardProps) {
  return (
    <div
      data-testid="platform-verification-card"
      className="ascii-box p-4 border-blue-400/30 border"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{verification.icon}</span>
          <div>
            <div className="font-mono font-bold">{verification.name}</div>
            <VerificationBadge status={verification.status} compact />
          </div>
        </div>
        <button
          onClick={() => onVerify(verification.platform)}
          disabled={isVerifying}
          className="px-3 py-1 text-xs font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? '⟳ Verifying...' : '↻ Verify'}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {verification.lastVerified && (
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Last Verified</span>
            <span data-testid="last-verified" className="font-mono">
              {new Date(verification.lastVerified).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Confidence</span>
          <span className={`font-mono ${verification.confidence > 0 ? 'text-green-400' : ''}`}>
            {verification.confidence}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Checks</span>
          <span className="font-mono">
            {verification.checksCompleted} / {verification.totalChecks}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <VerificationProgress
          completed={verification.checksCompleted}
          total={verification.totalChecks}
        />
      </div>
    </div>
  );
}

// =============================================================================
// VerificationHistoryList
// =============================================================================

interface VerificationHistoryListProps {
  history: VerificationResult[];
  maxEntries?: number;
}

export function VerificationHistoryList({
  history,
  maxEntries,
}: VerificationHistoryListProps) {
  const displayedHistory = maxEntries ? history.slice(0, maxEntries) : history;

  if (displayedHistory.length === 0) {
    return (
      <div data-testid="verification-history-list" className="ascii-box p-4 text-center">
        <p className="text-[hsl(var(--muted-foreground))]">No verification history</p>
      </div>
    );
  }

  return (
    <div data-testid="verification-history-list" className="space-y-2">
      {displayedHistory.map((entry, index) => (
        <div
          key={`${entry.platform}-${entry.verifiedAt}-${index}`}
          data-testid="history-entry"
          className="ascii-box p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm capitalize">{entry.platform}</span>
              <VerificationBadge status={entry.status} compact />
            </div>
            <span
              data-testid="history-timestamp"
              className="text-xs text-[hsl(var(--muted-foreground))] font-mono"
            >
              {new Date(entry.verifiedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">
              {entry.checks.filter((c) => c.status === 'passed').length} / {entry.checks.length} checks passed
            </span>
            <span className={`font-mono ${entry.confidence > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {entry.confidence}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// VerificationDashboard
// =============================================================================

interface VerificationDashboardProps {
  platforms: PlatformVerification[];
  history: VerificationResult[];
  onVerify: (platform: string) => void;
  onVerifyAll: () => void;
  isLoading?: boolean;
  error?: string;
  verifyingPlatform?: string;
}

export function VerificationDashboard({
  platforms,
  history,
  onVerify,
  onVerifyAll,
  isLoading,
  error,
  verifyingPlatform,
}: VerificationDashboardProps) {
  const verifiedCount = platforms.filter((p) => p.status === 'verified').length;
  const totalConfidence = platforms.reduce((sum, p) => sum + p.confidence, 0);
  const avgConfidence = platforms.length > 0 ? Math.round(totalConfidence / platforms.length) : 0;

  if (isLoading) {
    return (
      <div data-testid="verification-dashboard" className="space-y-6">
        <div data-testid="loading-indicator" className="ascii-box p-6 text-center">
          <span className="animate-spin inline-block">⟳</span>
          <span className="ml-2">Loading verification data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="verification-dashboard" className="space-y-6">
        <div className="ascii-box p-6 text-center border-red-400/30 border">
          <span className="text-red-400">⚠</span>
          <span className="ml-2 text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="verification-dashboard" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4 border-blue-400/30 border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Reputation Verification</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Verify and validate your imported reputation
            </p>
          </div>
          <button
            onClick={onVerifyAll}
            className="px-4 py-2 text-sm font-mono bg-blue-400/20 text-blue-400 rounded hover:bg-blue-400/30"
          >
            ↻ Verify All
          </button>
        </div>
      </div>

      {/* Summary */}
      <div data-testid="verification-summary" className="ascii-box p-4 border-blue-400/30 border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div data-testid="verified-count" className="text-2xl font-mono font-bold text-green-400">
              {verifiedCount}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              of {platforms.length} verified
            </div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-blue-400">
              {avgConfidence}%
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              avg confidence
            </div>
          </div>
          <div>
            <div className="text-2xl font-mono font-bold">
              {history.length}
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              verifications
            </div>
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => (
          <PlatformVerificationCard
            key={platform.platform}
            verification={platform}
            onVerify={onVerify}
            isVerifying={verifyingPlatform === platform.platform}
          />
        ))}
      </div>

      {/* History */}
      <div>
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))] mb-3">
          Verification History
        </h3>
        <VerificationHistoryList history={history} maxEntries={5} />
      </div>
    </div>
  );
}

// =============================================================================
// useReputationVerification Hook
// =============================================================================

export function useReputationVerification(address: string) {
  const [platforms, setPlatforms] = useState<PlatformVerification[]>([]);
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setPlatforms([
        {
          platform: 'optimism',
          name: 'Optimism Collective',
          icon: '🔴',
          lastVerified: Date.now() - 86400000,
          status: 'verified',
          confidence: 95,
          checksCompleted: 4,
          totalChecks: 4,
        },
        {
          platform: 'coinbase',
          name: 'Coinbase',
          icon: '🔵',
          lastVerified: Date.now() - 172800000,
          status: 'verified',
          confidence: 100,
          checksCompleted: 3,
          totalChecks: 3,
        },
        {
          platform: 'gitcoin',
          name: 'Gitcoin Passport',
          icon: '🟢',
          lastVerified: Date.now() - 259200000,
          status: 'expired',
          confidence: 0,
          checksCompleted: 2,
          totalChecks: 4,
        },
        {
          platform: 'ens',
          name: 'ENS',
          icon: '📛',
          lastVerified: null,
          status: 'unverified',
          confidence: 0,
          checksCompleted: 0,
          totalChecks: 3,
        },
      ]);

      setHistory([
        {
          platform: 'optimism',
          status: 'verified',
          verifiedAt: Date.now() - 86400000,
          expiresAt: Date.now() + 518400000,
          checks: [],
          confidence: 95,
          verifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
          signature: '0xabc...',
        },
        {
          platform: 'coinbase',
          status: 'verified',
          verifiedAt: Date.now() - 172800000,
          expiresAt: Date.now() + 432000000,
          checks: [],
          confidence: 100,
          verifier: '0x123...',
          signature: '0xdef...',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [address, loadData]);

  const verify = useCallback(async (platform: string) => {
    setIsVerifying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPlatforms((prev) =>
        prev.map((p) =>
          p.platform === platform
            ? { ...p, status: 'verified' as const, confidence: 95, checksCompleted: p.totalChecks }
            : p
        )
      );
      setHistory((prev) => [
        {
          platform,
          status: 'verified',
          verifiedAt: Date.now(),
          expiresAt: Date.now() + 604800000,
          checks: [],
          confidence: 95,
          verifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD51',
          signature: '0xnew...',
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const verifyAll = useCallback(async () => {
    setIsVerifying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setPlatforms((prev) =>
        prev.map((p) => ({
          ...p,
          status: 'verified' as const,
          confidence: 95 + Math.floor(Math.random() * 5),
          checksCompleted: p.totalChecks,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    platforms,
    history,
    isLoading,
    isVerifying,
    error,
    verify,
    verifyAll,
  };
}
