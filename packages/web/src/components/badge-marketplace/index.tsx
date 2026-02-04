'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ShareableBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'accuracy' | 'volume' | 'tier' | 'special';
  tier: string;
  earnedAt: string;
  tokenId: number;
  contractAddress: string;
  chainId: number;
  imageUrl: string;
}

export interface BadgeShareTarget {
  id: string;
  name: string;
  icon: string;
}

// =============================================================================
// Chain Names
// =============================================================================

const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  84532: 'Base Sepolia',
  1: 'Ethereum',
  137: 'Polygon',
};

// =============================================================================
// BadgeShareCard Component
// =============================================================================

interface BadgeShareCardProps {
  badge: ShareableBadge;
  onShare?: (badgeId: string) => void;
}

export function BadgeShareCard({ badge, onShare }: BadgeShareCardProps) {
  const chainName = CHAIN_NAMES[badge.chainId] ?? `Chain ${badge.chainId}`;
  const formattedDate = new Date(badge.earnedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div data-testid="badge-share-card" className="border border-[var(--terminal-green)] font-mono p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{badge.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--terminal-green)] font-bold">{badge.name}</h3>
          <p className="text-[var(--terminal-dim)] text-xs">{badge.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-[var(--terminal-dim)]">Token #{badge.tokenId}</span>
        <span className="text-[var(--terminal-dim)]">{chainName}</span>
        <span className="text-[var(--terminal-dim)]">{formattedDate}</span>
      </div>
      {onShare && (
        <button
          data-testid="share-button"
          onClick={() => onShare(badge.id)}
          className="w-full border border-[var(--terminal-green)] text-[var(--terminal-green)] py-1 text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Share Badge
        </button>
      )}
    </div>
  );
}

// =============================================================================
// PlatformShareButton Component
// =============================================================================

interface PlatformShareButtonProps {
  target: BadgeShareTarget;
  onClick: (targetId: string) => void;
}

export function PlatformShareButton({ target, onClick }: PlatformShareButtonProps) {
  return (
    <button
      data-testid="platform-share-button"
      onClick={() => onClick(target.id)}
      className="flex items-center gap-2 border border-[var(--terminal-green)] text-[var(--terminal-green)] px-3 py-2 font-mono text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors w-full"
    >
      <span>{target.icon}</span>
      <span>{target.name}</span>
    </button>
  );
}

// =============================================================================
// BadgeEmbedCode Component
// =============================================================================

interface BadgeEmbedCodeProps {
  badge: ShareableBadge;
  onCopy?: () => void;
}

export function BadgeEmbedCode({ badge, onCopy }: BadgeEmbedCodeProps) {
  const embedSnippet = `<a href="https://calibr.xyz/badge/${badge.contractAddress}/${badge.tokenId}"><img src="${badge.imageUrl}" alt="${badge.name} - Calibr Badge" width="200" /></a>`;

  return (
    <div data-testid="embed-code" className="font-mono">
      <div className="text-[var(--terminal-dim)] text-xs mb-1">Embed Code</div>
      <div className="border border-[var(--terminal-dim)] bg-black p-2 text-xs text-[var(--terminal-green)] break-all">
        {embedSnippet}
      </div>
      <button
        data-testid="copy-embed"
        onClick={onCopy}
        className="mt-1 border border-[var(--terminal-green)] text-[var(--terminal-green)] px-2 py-0.5 text-xs hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
      >
        Copy
      </button>
    </div>
  );
}

// =============================================================================
// SharedBadgePreview Component
// =============================================================================

interface SharedBadgePreviewProps {
  badge: ShareableBadge;
}

export function SharedBadgePreview({ badge }: SharedBadgePreviewProps) {
  return (
    <div
      data-testid="shared-badge-preview"
      className="border-2 border-[var(--terminal-green)] bg-black font-mono p-4 text-center max-w-xs"
    >
      <div className="text-4xl mb-2">{badge.icon}</div>
      <div className="text-[var(--terminal-green)] font-bold text-lg">{badge.name}</div>
      <div className="text-[var(--terminal-green)] text-sm mb-2">{badge.tier}</div>
      <div className="text-[var(--terminal-dim)] text-xs">{badge.description}</div>
      <div className="mt-3 text-[var(--terminal-dim)] text-xs border-t border-[var(--terminal-dim)] pt-2">
        calibr.xyz
      </div>
    </div>
  );
}

// =============================================================================
// BadgeShareModal Component
// =============================================================================

interface BadgeShareModalProps {
  badge: ShareableBadge;
  targets: BadgeShareTarget[];
  onClose: () => void;
  onShare?: (badgeId: string, targetId: string) => void;
}

export function BadgeShareModal({ badge, targets, onClose, onShare }: BadgeShareModalProps) {
  return (
    <div
      data-testid="badge-share-modal"
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 font-mono"
      onClick={onClose}
    >
      <div
        className="border-2 border-[var(--terminal-green)] bg-black p-6 max-w-md w-full mx-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="text-[var(--terminal-green)] font-bold text-lg">Share Badge</h2>
          <button
            data-testid="close-share-modal"
            onClick={onClose}
            className="text-[var(--terminal-green)] hover:text-white text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{badge.icon}</span>
          <div>
            <div className="text-[var(--terminal-green)] font-bold">{badge.name}</div>
            <div className="text-[var(--terminal-dim)] text-xs">{badge.description}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[var(--terminal-dim)] text-xs">Share to</div>
          {targets.map((target) => (
            <PlatformShareButton
              key={target.id}
              target={target}
              onClick={(targetId) => onShare?.(badge.id, targetId)}
            />
          ))}
        </div>

        <BadgeEmbedCode badge={badge} />
      </div>
    </div>
  );
}

// =============================================================================
// BadgeMarketplaceGrid Component
// =============================================================================

interface BadgeMarketplaceGridProps {
  badges: ShareableBadge[];
  onShare?: (badgeId: string) => void;
}

export function BadgeMarketplaceGrid({ badges, onShare }: BadgeMarketplaceGridProps) {
  return (
    <div data-testid="badge-marketplace-grid" className="font-mono">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[var(--terminal-green)] font-bold">Your Badges</h3>
        <span className="text-[var(--terminal-dim)] text-sm">{badges.length} badges</span>
      </div>
      {badges.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-6">
          No badges to share
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {badges.map((badge) => (
            <BadgeShareCard key={badge.id} badge={badge} onShare={onShare} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BadgeMarketplacePage Component
// =============================================================================

interface BadgeMarketplacePageProps {
  badges: ShareableBadge[];
  targets: BadgeShareTarget[];
  loading?: boolean;
}

export function BadgeMarketplacePage({ badges, targets, loading = false }: BadgeMarketplacePageProps) {
  const [selectedBadge, setSelectedBadge] = useState<ShareableBadge | null>(null);

  if (loading) {
    return (
      <div data-testid="badge-marketplace-page" className="max-w-4xl mx-auto p-4 font-mono">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading marketplace...</div>
        </div>
      </div>
    );
  }

  const handleShare = (badgeId: string) => {
    const badge = badges.find((b) => b.id === badgeId);
    if (badge) setSelectedBadge(badge);
  };

  return (
    <div data-testid="badge-marketplace-page" className="max-w-4xl mx-auto p-4 font-mono space-y-6">
      <h1 className="text-[var(--terminal-green)] text-2xl">Badge Marketplace</h1>

      {badges.length > 0 && (
        <SharedBadgePreview badge={badges[0]!} />
      )}

      <BadgeMarketplaceGrid badges={badges} onShare={handleShare} />

      {selectedBadge && (
        <BadgeShareModal
          badge={selectedBadge}
          targets={targets}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// useBadgeSharing Hook
// =============================================================================

interface UseBadgeSharingReturn {
  selectedBadge: ShareableBadge | null;
  selectBadge: (badgeId: string) => void;
  clearSelection: () => void;
  shareUrl: string | null;
  embedCode: string | null;
  badgesByCategory: Record<string, ShareableBadge[]>;
}

export function useBadgeSharing(badges: ShareableBadge[]): UseBadgeSharingReturn {
  const [selectedBadge, setSelectedBadge] = useState<ShareableBadge | null>(null);

  const selectBadge = useCallback(
    (badgeId: string) => {
      const badge = badges.find((b) => b.id === badgeId);
      if (badge) setSelectedBadge(badge);
    },
    [badges]
  );

  const clearSelection = useCallback(() => {
    setSelectedBadge(null);
  }, []);

  const shareUrl = useMemo(() => {
    if (!selectedBadge) return null;
    return `https://calibr.xyz/badge/${selectedBadge.contractAddress}/${selectedBadge.tokenId}`;
  }, [selectedBadge]);

  const embedCode = useMemo(() => {
    if (!selectedBadge) return null;
    return `<a href="https://calibr.xyz/badge/${selectedBadge.contractAddress}/${selectedBadge.tokenId}"><img src="${selectedBadge.imageUrl}" alt="${selectedBadge.name}" width="200" /></a>`;
  }, [selectedBadge]);

  const badgesByCategory = useMemo(() => {
    const map: Record<string, ShareableBadge[]> = {};
    for (const badge of badges) {
      if (!map[badge.category]) map[badge.category] = [];
      map[badge.category]!.push(badge);
    }
    return map;
  }, [badges]);

  return {
    selectedBadge,
    selectBadge,
    clearSelection,
    shareUrl,
    embedCode,
    badgesByCategory,
  };
}
