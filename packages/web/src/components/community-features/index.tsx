'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export interface CommunityChannelData {
  id: string;
  name: string;
  description: string;
  requiredTier: SuperforecasterTier;
  memberCount: number;
  isActive: boolean;
}

export interface TierPerkData {
  id: string;
  name: string;
  description: string;
  requiredTier: SuperforecasterTier;
  icon: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_ORDER: SuperforecasterTier[] = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

const TIER_COLORS: Record<SuperforecasterTier, { border: string; text: string; bg: string }> = {
  APPRENTICE: { border: 'border-gray-400/30', text: 'text-gray-400', bg: 'bg-gray-400/10' },
  JOURNEYMAN: { border: 'border-blue-400/30', text: 'text-blue-400', bg: 'bg-blue-400/10' },
  EXPERT: { border: 'border-green-400/30', text: 'text-green-400', bg: 'bg-green-400/10' },
  MASTER: { border: 'border-purple-400/30', text: 'text-purple-400', bg: 'bg-purple-400/10' },
  GRANDMASTER: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
};

const VIP_TIERS: SuperforecasterTier[] = ['EXPERT', 'MASTER', 'GRANDMASTER'];

// =============================================================================
// Utility Functions
// =============================================================================

function meetsRequirement(userTier: SuperforecasterTier, requiredTier: SuperforecasterTier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

function getNextTier(tier: SuperforecasterTier): SuperforecasterTier | null {
  const index = TIER_ORDER.indexOf(tier);
  return index < TIER_ORDER.length - 1 ? TIER_ORDER[index + 1]! : null;
}

// =============================================================================
// CommunityChannel Component
// =============================================================================

interface CommunityChannelProps {
  channel: CommunityChannelData;
  userTier: SuperforecasterTier;
  onJoin?: (channelId: string) => void;
}

export function CommunityChannel({ channel, userTier, onJoin }: CommunityChannelProps) {
  const hasAccess = meetsRequirement(userTier, channel.requiredTier);
  const colors = TIER_COLORS[channel.requiredTier];

  const handleClick = () => {
    if (hasAccess && onJoin) {
      onJoin(channel.id);
    }
  };

  return (
    <button
      data-testid="community-channel"
      onClick={handleClick}
      aria-label={`${channel.name} channel`}
      aria-disabled={!hasAccess}
      className={cn(
        'ascii-box p-4 w-full text-left transition-all',
        colors.border,
        'border',
        hasAccess ? 'hover:bg-[hsl(var(--accent))]' : 'cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{channel.name}</span>
          {channel.isActive && (
            <span data-testid="channel-active" className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>
        <span className={cn('text-xs font-mono px-2 py-0.5 rounded', colors.bg, colors.text)}>
          {channel.requiredTier}
        </span>
      </div>

      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3">{channel.description}</p>

      <div className="flex items-center justify-between">
        <span data-testid="member-count" className="text-xs text-[hsl(var(--muted-foreground))]">
          {channel.memberCount.toLocaleString()} members
        </span>
        {!hasAccess && (
          <span data-testid="channel-locked" className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            🔒 Locked
          </span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// ChannelList Component
// =============================================================================

interface ChannelListProps {
  channels: CommunityChannelData[];
  userTier: SuperforecasterTier;
  filterAccessible?: boolean;
  onJoin?: (channelId: string) => void;
}

export function ChannelList({ channels, userTier, filterAccessible, onJoin }: ChannelListProps) {
  const filteredChannels = filterAccessible
    ? channels.filter((c) => meetsRequirement(userTier, c.requiredTier))
    : channels;

  const accessibleCount = channels.filter((c) => meetsRequirement(userTier, c.requiredTier)).length;

  return (
    <div data-testid="channel-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">
          Community Channels
        </h3>
        <span data-testid="accessible-count" className="text-xs text-[hsl(var(--muted-foreground))]">
          {accessibleCount} / {channels.length} accessible
        </span>
      </div>

      {filteredChannels.length === 0 ? (
        <div className="ascii-box p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No channels available
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChannels.map((channel) => (
            <CommunityChannel key={channel.id} channel={channel} userTier={userTier} onJoin={onJoin} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ChannelAccess Component
// =============================================================================

interface ChannelAccessProps {
  requiredTier: SuperforecasterTier;
  userTier: SuperforecasterTier;
  showProgress?: boolean;
}

export function ChannelAccess({ requiredTier, userTier, showProgress }: ChannelAccessProps) {
  const hasAccess = meetsRequirement(userTier, requiredTier);
  const colors = TIER_COLORS[requiredTier];

  return (
    <div data-testid="channel-access" className={cn('ascii-box p-3', colors.border, 'border')}>
      <div className="flex items-center gap-2">
        <span data-testid="tier-icon" className="text-lg">
          {hasAccess ? '✓' : '🔒'}
        </span>
        <span className={cn('text-sm', hasAccess ? 'text-green-400' : 'text-[hsl(var(--muted-foreground))]')}>
          {hasAccess ? (
            'Access Granted'
          ) : (
            <>
              Requires <span className={colors.text}>{requiredTier}</span>
            </>
          )}
        </span>
      </div>

      {showProgress && !hasAccess && (
        <div data-testid="tier-progress" className="mt-2">
          <div className="h-1 bg-[hsl(var(--muted))] rounded">
            <div
              className={cn('h-full rounded', colors.bg)}
              style={{ width: `${(TIER_ORDER.indexOf(userTier) / TIER_ORDER.indexOf(requiredTier)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TierPerk Component
// =============================================================================

interface TierPerkProps {
  perk: TierPerkData;
  userTier: SuperforecasterTier;
}

export function TierPerk({ perk, userTier }: TierPerkProps) {
  const isUnlocked = meetsRequirement(userTier, perk.requiredTier);
  const colors = TIER_COLORS[perk.requiredTier];

  return (
    <div
      data-testid="tier-perk"
      className={cn(
        'ascii-box p-4',
        colors.border,
        'border',
        !isUnlocked && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{perk.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono font-bold">{perk.name}</span>
            <span className={cn('text-xs font-mono px-2 py-0.5 rounded', colors.bg, colors.text)}>
              {perk.requiredTier}
            </span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{perk.description}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        {isUnlocked ? (
          <span data-testid="perk-unlocked" className="text-xs text-green-400 flex items-center gap-1">
            ✓ Unlocked
          </span>
        ) : (
          <span data-testid="perk-locked" className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            🔒 Locked
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// PerkList Component
// =============================================================================

interface PerkListProps {
  perks: TierPerkData[];
  userTier: SuperforecasterTier;
  filterUnlocked?: boolean;
}

export function PerkList({ perks, userTier, filterUnlocked }: PerkListProps) {
  const filteredPerks = filterUnlocked
    ? perks.filter((p) => meetsRequirement(userTier, p.requiredTier))
    : perks;

  const unlockedCount = perks.filter((p) => meetsRequirement(userTier, p.requiredTier)).length;

  return (
    <div data-testid="perk-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-bold text-[hsl(var(--muted-foreground))]">Tier Perks</h3>
        <span data-testid="unlocked-count" className="text-xs text-[hsl(var(--muted-foreground))]">
          {unlockedCount} / {perks.length} unlocked
        </span>
      </div>

      {filteredPerks.length === 0 ? (
        <div className="ascii-box p-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No perks available
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPerks.map((perk) => (
            <TierPerk key={perk.id} perk={perk} userTier={userTier} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ExclusiveContent Component
// =============================================================================

interface ExclusiveContentProps {
  title: string;
  requiredTier: SuperforecasterTier;
  userTier: SuperforecasterTier;
  children: React.ReactNode;
}

export function ExclusiveContent({ title, requiredTier, userTier, children }: ExclusiveContentProps) {
  const hasAccess = meetsRequirement(userTier, requiredTier);
  const colors = TIER_COLORS[requiredTier];

  return (
    <div
      data-testid="exclusive-content"
      className={cn('ascii-box p-4 relative', colors.border, 'border')}
    >
      <h3 className="text-sm font-mono font-bold mb-3">{title}</h3>

      {hasAccess ? (
        children
      ) : (
        <div
          data-testid="content-locked"
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--background))]/90 backdrop-blur-sm"
        >
          <span className="text-3xl mb-2">🔒</span>
          <span className="text-sm text-[hsl(var(--muted-foreground))]">
            Requires <span className={colors.text}>{requiredTier}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// VIPBadge Component
// =============================================================================

interface VIPBadgeProps {
  tier: SuperforecasterTier;
  size?: 'sm' | 'md' | 'lg';
}

export function VIPBadge({ tier, size = 'md' }: VIPBadgeProps) {
  if (!VIP_TIERS.includes(tier)) {
    return null;
  }

  const colors = TIER_COLORS[tier];
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-lg px-3 py-1.5',
  };

  return (
    <span
      data-testid="vip-badge"
      role="status"
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold rounded',
        colors.text,
        colors.bg,
        sizeClasses[size]
      )}
    >
      ⭐ VIP · {tier}
    </span>
  );
}

// =============================================================================
// CommunityGate Component
// =============================================================================

interface CommunityGateProps {
  requiredTier: SuperforecasterTier;
  userTier: SuperforecasterTier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgradeClick?: () => void;
}

export function CommunityGate({
  requiredTier,
  userTier,
  children,
  fallback,
  onUpgradeClick,
}: CommunityGateProps) {
  const hasAccess = meetsRequirement(userTier, requiredTier);
  const colors = TIER_COLORS[requiredTier];

  if (hasAccess) {
    return <div data-testid="community-gate">{children}</div>;
  }

  if (fallback) {
    return <div data-testid="community-gate">{fallback}</div>;
  }

  return (
    <div data-testid="community-gate" className="ascii-box p-6 text-center">
      <span className="text-4xl mb-3 block">🔒</span>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
        This content requires <span className={colors.text}>{requiredTier}</span> tier or higher.
      </p>
      <button
        onClick={onUpgradeClick}
        className={cn(
          'px-4 py-2 font-mono text-sm rounded',
          colors.bg,
          colors.text,
          'hover:opacity-80 transition-opacity'
        )}
      >
        Upgrade to Access
      </button>
    </div>
  );
}

// =============================================================================
// SuperforecasterHub Component
// =============================================================================

interface SuperforecasterHubProps {
  userTier: SuperforecasterTier;
  channels: CommunityChannelData[];
  perks: TierPerkData[];
  onChannelJoin?: (channelId: string) => void;
}

export function SuperforecasterHub({ userTier, channels, perks, onChannelJoin }: SuperforecasterHubProps) {
  const accessibleChannels = channels.filter((c) => meetsRequirement(userTier, c.requiredTier));
  const unlockedPerks = perks.filter((p) => meetsRequirement(userTier, p.requiredTier));
  const isVIP = VIP_TIERS.includes(userTier);
  const colors = TIER_COLORS[userTier];

  return (
    <div data-testid="superforecaster-hub" className="space-y-6">
      {/* Header */}
      <div className={cn('ascii-box p-4', colors.border, 'border')}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-mono font-bold">Superforecaster Hub</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Welcome, <span className={colors.text}>{userTier}</span>
            </p>
          </div>
          {isVIP && <VIPBadge tier={userTier} />}
        </div>
      </div>

      {/* Access Summary */}
      <div data-testid="access-summary" className="grid grid-cols-2 gap-4">
        <div className="ascii-box p-4 text-center">
          <div className="text-2xl font-mono font-bold">{accessibleChannels.length}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Channels</div>
        </div>
        <div className="ascii-box p-4 text-center">
          <div className="text-2xl font-mono font-bold">{unlockedPerks.length}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Perks</div>
        </div>
      </div>

      {/* Channels Section */}
      <ChannelList channels={channels} userTier={userTier} onJoin={onChannelJoin} />

      {/* Perks Section */}
      <PerkList perks={perks} userTier={userTier} />
    </div>
  );
}

// =============================================================================
// useCommunityAccess Hook
// =============================================================================

export function useCommunityAccess(
  userTier: SuperforecasterTier,
  channels: CommunityChannelData[],
  perks: TierPerkData[]
) {
  return useMemo(() => {
    const accessibleChannels = channels.filter((c) => meetsRequirement(userTier, c.requiredTier));
    const unlockedPerks = perks.filter((p) => meetsRequirement(userTier, p.requiredTier));
    const isVIP = VIP_TIERS.includes(userTier);
    const nextTier = getNextTier(userTier);

    const canAccessTier = (tier: SuperforecasterTier) => meetsRequirement(userTier, tier);

    return {
      accessibleChannels,
      unlockedPerks,
      isVIP,
      nextTier,
      canAccessTier,
    };
  }, [userTier, channels, perks]);
}
