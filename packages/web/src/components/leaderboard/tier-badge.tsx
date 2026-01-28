'use client';

import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

interface TierBadgeProps {
  tier: SuperforecasterTier;
  compact?: boolean;
  showEmoji?: boolean;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<SuperforecasterTier, {
  emoji: string;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  APPRENTICE: {
    emoji: '🌱',
    label: 'APPRENTICE',
    shortLabel: 'A',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/30',
  },
  JOURNEYMAN: {
    emoji: '🎯',
    label: 'JOURNEYMAN',
    shortLabel: 'J',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
  },
  EXPERT: {
    emoji: '🔮',
    label: 'EXPERT',
    shortLabel: 'E',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
  },
  MASTER: {
    emoji: '🧠',
    label: 'MASTER',
    shortLabel: 'M',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
  },
  GRANDMASTER: {
    emoji: '👁️',
    label: 'GRANDMASTER',
    shortLabel: 'GM',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-300/10',
    borderColor: 'border-cyan-300/30',
  },
};

// =============================================================================
// Component
// =============================================================================

export function TierBadge({
  tier,
  compact = false,
  showEmoji = false,
  className,
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <span
      data-testid="tier-badge"
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs border rounded px-1.5 py-0.5',
        config.color,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {showEmoji && <span>{config.emoji}</span>}
      <span>{compact ? config.shortLabel : config.label}</span>
    </span>
  );
}

export { TIER_CONFIG };
export type { SuperforecasterTier, TierBadgeProps };
