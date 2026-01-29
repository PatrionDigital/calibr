'use client';

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface EASPlatform {
  id: string;
  name: string;
  chain: string;
  chainId: number;
  easAddress: string;
  explorerUrl: string;
  icon: string;
  supported: boolean;
}

export interface AttestationData {
  uid: string;
  schema: string;
  schemaName: string;
  attester: string;
  recipient: string;
  timestamp: number;
  data: {
    achievementId: string;
    achievementName: string;
    tier: string;
    score: number;
  };
  revocable: boolean;
  revoked: boolean;
}

export interface ExportRecord {
  id: string;
  attestationUid: string;
  targetPlatform: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  newUid?: string;
  error?: string;
  exportedAt: number;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  APPRENTICE: { border: 'border-gray-400/30', text: 'text-gray-400', bg: 'bg-gray-400/10' },
  JOURNEYMAN: { border: 'border-blue-400/30', text: 'text-blue-400', bg: 'bg-blue-400/10' },
  EXPERT: { border: 'border-green-400/30', text: 'text-green-400', bg: 'bg-green-400/10' },
  MASTER: { border: 'border-purple-400/30', text: 'text-purple-400', bg: 'bg-purple-400/10' },
  GRANDMASTER: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

// =============================================================================
// Utility Functions
// =============================================================================

function truncateUid(uid: string, length = 10): string {
  if (uid.length <= length * 2 + 3) return uid;
  return `${uid.slice(0, length)}...${uid.slice(-length)}`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

// =============================================================================
// AttestationExport Component
// =============================================================================

interface AttestationExportProps {
  attestation: AttestationData;
  platforms: EASPlatform[];
  onExport?: (uid: string, platformId: string) => void;
  isExporting?: boolean;
  exportedTo?: string[];
}

export function AttestationExport({
  attestation,
  platforms,
  onExport,
  isExporting,
  exportedTo = [],
}: AttestationExportProps) {
  const [showSelector, setShowSelector] = useState(false);
  const supportedPlatforms = platforms.filter((p) => p.supported);
  const availablePlatforms = supportedPlatforms.filter((p) => !exportedTo.includes(p.id));
  const allExported = availablePlatforms.length === 0;

  const handlePlatformSelect = (platformId: string) => {
    if (onExport) {
      onExport(attestation.uid, platformId);
    }
    setShowSelector(false);
  };

  return (
    <div data-testid="attestation-export" className="ascii-box p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono font-bold">{attestation.data.achievementName}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            {truncateUid(attestation.uid)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span data-testid="export-platform-count" className="text-xs text-[hsl(var(--muted-foreground))]">
            {supportedPlatforms.length} platforms
          </span>
          {isExporting ? (
            <div data-testid="export-loading" className="animate-spin">⏳</div>
          ) : (
            <button
              onClick={() => setShowSelector(!showSelector)}
              disabled={allExported}
              aria-label="Export attestation"
              className={cn(
                'px-3 py-1 font-mono text-sm rounded',
                allExported
                  ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed'
                  : 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30'
              )}
            >
              Export
            </button>
          )}
        </div>
      </div>

      {showSelector && (
        <PlatformSelector
          platforms={platforms}
          onSelect={handlePlatformSelect}
          exportedTo={exportedTo}
        />
      )}
    </div>
  );
}

// =============================================================================
// PlatformSelector Component
// =============================================================================

interface PlatformSelectorProps {
  platforms: EASPlatform[];
  onSelect: (platformId: string) => void;
  exportedTo?: string[];
  showChainId?: boolean;
  selectedPlatform?: string;
}

export function PlatformSelector({
  platforms,
  onSelect,
  exportedTo = [],
  showChainId,
  selectedPlatform,
}: PlatformSelectorProps) {
  const handleClick = (platform: EASPlatform) => {
    if (platform.supported && !exportedTo.includes(platform.id)) {
      onSelect(platform.id);
    }
  };

  return (
    <div data-testid="platform-selector" className="grid grid-cols-2 gap-2 mt-3">
      {platforms.map((platform) => {
        const isExported = exportedTo.includes(platform.id);
        const isSelected = selectedPlatform === platform.id;

        return (
          <button
            key={platform.id}
            data-testid={`platform-${platform.id}`}
            onClick={() => handleClick(platform)}
            aria-label={`${platform.name} platform`}
            aria-disabled={!platform.supported || isExported}
            className={cn(
              'ascii-box p-3 text-left transition-all',
              platform.supported && !isExported
                ? 'hover:bg-[hsl(var(--accent))] cursor-pointer'
                : 'opacity-50 cursor-not-allowed',
              isSelected && 'border-blue-400'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{platform.icon}</span>
              <div>
                <div className="font-mono font-bold text-sm">{platform.name}</div>
                {showChainId && (
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    Chain ID: {platform.chainId}
                  </div>
                )}
              </div>
            </div>
            {isExported && (
              <div
                data-testid={`platform-${platform.id}-exported`}
                className="text-xs text-green-400 mt-1"
              >
                ✓ Exported
              </div>
            )}
            {!platform.supported && (
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Coming soon
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// AttestationPreview Component
// =============================================================================

interface AttestationPreviewProps {
  attestation: AttestationData;
}

export function AttestationPreview({ attestation }: AttestationPreviewProps) {
  const tier = attestation.data.tier;
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.APPRENTICE!;

  const handleCopy = () => {
    navigator.clipboard.writeText(attestation.uid);
  };

  return (
    <div data-testid="attestation-preview" className={cn('ascii-box p-4', colors.border, 'border')}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono font-bold">{attestation.schemaName}</span>
        {attestation.revoked && (
          <span data-testid="revoked-warning" className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
            REVOKED
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">UID</span>
          <div className="flex items-center gap-2">
            <span data-testid="attestation-uid" className="font-mono">
              {truncateUid(attestation.uid)}
            </span>
            <button
              onClick={handleCopy}
              aria-label="Copy UID"
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white"
            >
              📋
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Achievement</span>
          <span className="font-mono">{attestation.data.achievementId}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Tier</span>
          <span className={cn('font-mono', colors.text)}>{tier}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Revocable</span>
          <span className="font-mono">{attestation.revocable ? 'Yes' : 'Non-revocable'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--muted-foreground))]">Timestamp</span>
          <span data-testid="attestation-timestamp" className="font-mono text-xs">
            {formatTimestamp(attestation.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ShareStatus Component
// =============================================================================

interface ShareStatusProps {
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
  explorerUrl?: string;
  onRetry?: () => void;
}

export function ShareStatus({ status, txHash, error, explorerUrl, onRetry }: ShareStatusProps) {
  const statusColor = STATUS_COLORS[status];

  return (
    <div
      data-testid="share-status"
      role="status"
      className={cn('flex items-center gap-2', statusColor)}
    >
      {status === 'pending' && (
        <span data-testid="status-spinner" className="animate-spin">
          ⏳
        </span>
      )}
      {status === 'completed' && <span>✓</span>}
      {status === 'failed' && <span>✗</span>}

      <span className="capitalize">{status}</span>

      {status === 'completed' && txHash && explorerUrl && (
        <a
          href={`${explorerUrl}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline hover:no-underline"
        >
          View tx
        </a>
      )}

      {status === 'failed' && error && (
        <span className="text-xs text-[hsl(var(--muted-foreground))]">{error}</span>
      )}

      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          aria-label="Retry export"
          className="text-xs px-2 py-0.5 bg-red-400/20 rounded hover:bg-red-400/30"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// =============================================================================
// VerificationLink Component
// =============================================================================

interface VerificationLinkProps {
  uid: string;
  platform: EASPlatform;
}

export function VerificationLink({ uid, platform }: VerificationLinkProps) {
  const url = `${platform.explorerUrl}/attestation/view/${uid}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div data-testid="verification-link" className="flex items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-400 hover:underline flex items-center gap-1"
      >
        <span>{platform.icon}</span>
        <span>Verify on {platform.name}</span>
        <span className="text-xs">↗</span>
      </a>
      <button
        onClick={handleCopy}
        aria-label="Copy verification link"
        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white"
      >
        📋
      </button>
    </div>
  );
}

// =============================================================================
// AttestationBadge Component
// =============================================================================

interface AttestationBadgeProps {
  attestation: AttestationData;
  verified?: boolean;
  exportCount?: number;
  onClick?: () => void;
  compact?: boolean;
}

export function AttestationBadge({
  attestation,
  verified,
  exportCount,
  onClick,
  compact,
}: AttestationBadgeProps) {
  const tier = attestation.data.tier;
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.APPRENTICE!;

  return (
    <div
      data-testid="attestation-badge"
      onClick={onClick}
      className={cn(
        'ascii-box',
        colors.border,
        'border cursor-pointer hover:bg-[hsl(var(--accent))]',
        compact ? 'p-2' : 'p-4'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{attestation.data.achievementName}</span>
          {verified && (
            <span data-testid="verified-icon" className="text-green-400">
              ✓
            </span>
          )}
        </div>
        {exportCount !== undefined && exportCount > 0 && (
          <span className="text-xs bg-blue-400/20 text-blue-400 px-2 py-0.5 rounded">
            {exportCount}
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ExportHistory Component
// =============================================================================

interface ExportHistoryProps {
  records: ExportRecord[];
  platforms: EASPlatform[];
  filterStatus?: 'pending' | 'completed' | 'failed';
}

export function ExportHistory({ records, platforms, filterStatus }: ExportHistoryProps) {
  const filteredRecords = filterStatus
    ? records.filter((r) => r.status === filterStatus)
    : records;

  const getPlatformName = (id: string) => platforms.find((p) => p.id === id)?.name || id;

  return (
    <div data-testid="export-history" className="space-y-4">
      <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
        Export History
      </h3>

      {filteredRecords.length === 0 ? (
        <div className="ascii-box p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No exports yet
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              data-testid={`export-record-${record.id}`}
              className="ascii-box p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-mono text-sm">{getPlatformName(record.targetPlatform)}</div>
                <div
                  data-testid={`export-timestamp-${record.id}`}
                  className="text-xs text-[hsl(var(--muted-foreground))]"
                >
                  {formatTimestamp(record.exportedAt)}
                </div>
              </div>
              <ShareStatus
                status={record.status}
                txHash={record.txHash}
                error={record.error}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CrossPlatformHub Component
// =============================================================================

interface CrossPlatformHubProps {
  attestations: AttestationData[];
  platforms: EASPlatform[];
  exportHistory: ExportRecord[];
  onExport?: (uid: string, platformId: string) => void;
}

export function CrossPlatformHub({
  attestations,
  platforms,
  exportHistory,
  onExport,
}: CrossPlatformHubProps) {
  const supportedPlatforms = platforms.filter((p) => p.supported);
  const completedExports = exportHistory.filter((e) => e.status === 'completed').length;

  const getExportedPlatforms = (uid: string) =>
    exportHistory
      .filter((e) => e.attestationUid === uid && e.status === 'completed')
      .map((e) => e.targetPlatform);

  return (
    <div data-testid="cross-platform-hub" className="space-y-6">
      {/* Header */}
      <div className="ascii-box p-4">
        <h2 className="text-lg font-mono font-bold mb-2">Cross-Platform Attestations</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Share your achievements across EAS-enabled chains
        </p>
      </div>

      {/* Stats */}
      <div data-testid="export-stats" className="grid grid-cols-3 gap-4">
        <div className="ascii-box p-4 text-center">
          <div data-testid="attestation-count" className="text-2xl font-mono font-bold">
            {attestations.length}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Attestations</div>
        </div>
        <div className="ascii-box p-4 text-center">
          <div data-testid="platform-count" className="text-2xl font-mono font-bold">
            {supportedPlatforms.length}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Platforms</div>
        </div>
        <div className="ascii-box p-4 text-center">
          <div className="text-2xl font-mono font-bold text-green-400">{completedExports}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Exported</div>
        </div>
      </div>

      {/* Attestations */}
      {attestations.length === 0 ? (
        <div className="ascii-box p-6 text-center text-[hsl(var(--muted-foreground))]">
          No attestations to export
        </div>
      ) : (
        <div className="space-y-3">
          {attestations.map((attestation) => (
            <AttestationExport
              key={attestation.uid}
              attestation={attestation}
              platforms={platforms}
              onExport={onExport}
              exportedTo={getExportedPlatforms(attestation.uid)}
            />
          ))}
        </div>
      )}

      {/* Export History */}
      <ExportHistory records={exportHistory} platforms={platforms} />
    </div>
  );
}

// =============================================================================
// useAttestationExport Hook
// =============================================================================

export function useAttestationExport(
  attestations: AttestationData[],
  platforms: EASPlatform[]
) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedMap, setExportedMap] = useState<Record<string, string[]>>({});

  const supportedPlatforms = useMemo(
    () => platforms.filter((p) => p.supported),
    [platforms]
  );

  const getExportedPlatforms = useCallback(
    (uid: string) => exportedMap[uid] || [],
    [exportedMap]
  );

  const exportAttestation = useCallback(
    async (uid: string, platformId: string) => {
      setIsExporting(true);
      try {
        // In production, this would call the actual export API
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setExportedMap((prev) => ({
          ...prev,
          [uid]: [...(prev[uid] || []), platformId],
        }));
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportAttestation,
    isExporting,
    getExportedPlatforms,
    supportedPlatforms,
  };
}
