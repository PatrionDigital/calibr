'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { CelebrationOrchestrator } from '@/components/celebrations';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

export type CeremonyPhase = 'idle' | 'intro' | 'reveal' | 'benefits' | 'stats' | 'complete';

export interface PromotionStats {
  totalForecasts: number;
  brierScore: number;
  calibrationScore: number;
  streakDays: number;
}

export interface PromotionData {
  previousTier: SuperforecasterTier;
  newTier: SuperforecasterTier;
  promotedAt: Date;
  stats: PromotionStats;
}

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<SuperforecasterTier, {
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  benefits: string[];
}> = {
  APPRENTICE: {
    emoji: '🌱',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/50',
    benefits: ['Basic forecasting tools', 'Public leaderboard access'],
  },
  JOURNEYMAN: {
    emoji: '🎯',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/50',
    benefits: ['Portfolio Kelly optimizer', 'Forecast journaling', 'Calibration analytics'],
  },
  EXPERT: {
    emoji: '🔮',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/50',
    benefits: ['Advanced analytics', 'Cross-platform insights', 'Private attestations'],
  },
  MASTER: {
    emoji: '🧠',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/50',
    benefits: ['Superforecaster badge', 'Priority support', 'Beta feature access'],
  },
  GRANDMASTER: {
    emoji: '👁️',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-300/10',
    borderColor: 'border-cyan-300/50',
    benefits: ['Legend status', 'Governance rights', 'Mentor privileges', 'Exclusive events'],
  },
};

const HIGH_TIERS: SuperforecasterTier[] = ['EXPERT', 'MASTER', 'GRANDMASTER'];

// =============================================================================
// TierComparisonDisplay Component
// =============================================================================

interface TierComparisonDisplayProps {
  previousTier: SuperforecasterTier;
  newTier: SuperforecasterTier;
}

export function TierComparisonDisplay({
  previousTier,
  newTier,
}: TierComparisonDisplayProps) {
  const prevConfig = TIER_CONFIG[previousTier];
  const newConfig = TIER_CONFIG[newTier];

  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {/* Previous Tier */}
      <div
        data-testid="previous-tier-container"
        className="text-center opacity-50"
      >
        <motion.div
          data-testid="previous-tier-emoji"
          initial={{ scale: 1 }}
          animate={{ scale: 0.9 }}
          className="text-4xl mb-2"
        >
          {prevConfig.emoji}
        </motion.div>
        <div
          data-testid="previous-tier"
          className="text-sm font-mono text-[hsl(var(--muted-foreground))]"
        >
          {previousTier}
        </div>
      </div>

      {/* Arrow */}
      <motion.div
        data-testid="tier-arrow"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl text-[hsl(var(--primary))]"
      >
        →
      </motion.div>

      {/* New Tier */}
      <div className="text-center">
        <motion.div
          data-testid="new-tier-emoji"
          initial={{ scale: 0 }}
          animate={{ scale: 1.2 }}
          transition={{ type: 'spring', delay: 0.5 }}
          className="text-5xl mb-2"
        >
          {newConfig.emoji}
        </motion.div>
        <div
          data-testid="new-tier"
          data-tier={newTier}
          className={cn('text-lg font-bold font-mono', newConfig.color)}
        >
          {newTier}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TierBadgeDisplay Component
// =============================================================================

interface TierBadgeDisplayProps {
  tier: SuperforecasterTier;
  animated?: boolean;
  showGlow?: boolean;
}

export function TierBadgeDisplay({
  tier,
  animated = false,
  showGlow = false,
}: TierBadgeDisplayProps) {
  const config = TIER_CONFIG[tier];

  return (
    <motion.div
      data-testid="tier-badge"
      data-tier={tier}
      data-animated={animated ? 'true' : 'false'}
      initial={animated ? { scale: 0, rotate: -180 } : undefined}
      animate={animated ? { scale: 1, rotate: 0 } : undefined}
      transition={animated ? { type: 'spring', duration: 0.8 } : undefined}
      className={cn(
        'relative inline-flex flex-col items-center justify-center',
        'w-32 h-32 rounded-full border-4',
        config.bgColor,
        config.borderColor
      )}
    >
      {showGlow && (
        <div
          data-testid="tier-badge-glow"
          className={cn(
            'absolute inset-0 rounded-full blur-xl opacity-50',
            config.bgColor
          )}
        />
      )}
      <span data-testid="tier-badge-emoji" className="text-5xl relative z-10">
        {config.emoji}
      </span>
      <span
        data-testid="tier-badge-name"
        className={cn('text-xs font-mono font-bold mt-1 relative z-10', config.color)}
      >
        {tier}
      </span>
    </motion.div>
  );
}

// =============================================================================
// BenefitsReveal Component
// =============================================================================

interface BenefitsRevealProps {
  tier: SuperforecasterTier;
  animated?: boolean;
  staggerDelay?: number;
  onRevealComplete?: () => void;
}

export function BenefitsReveal({
  tier,
  animated = true,
  staggerDelay = 400,
  onRevealComplete,
}: BenefitsRevealProps) {
  const [visibleCount, setVisibleCount] = useState(animated ? 0 : Infinity);
  const benefits = TIER_CONFIG[tier].benefits;

  useEffect(() => {
    if (!animated) {
      setVisibleCount(benefits.length);
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    benefits.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleCount(index + 1);
        if (index === benefits.length - 1) {
          onRevealComplete?.();
        }
      }, staggerDelay * (index + 1));
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [animated, benefits, staggerDelay, onRevealComplete]);

  return (
    <div data-testid="benefits-reveal" className="ascii-box p-4">
      <h3 className="text-sm font-bold text-[hsl(var(--primary))] mb-3">
        [NEW BENEFITS]
      </h3>
      <ul className="space-y-2">
        <AnimatePresence>
          {benefits.slice(0, visibleCount).map((benefit, index) => (
            <motion.li
              key={benefit}
              data-testid="benefit-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center gap-2 text-sm"
            >
              <span
                data-testid="benefit-checkmark"
                className="text-[hsl(var(--success))]"
              >
                ✓
              </span>
              <span>{benefit}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

// =============================================================================
// PromotionStats Component
// =============================================================================

interface PromotionStatsProps {
  stats: PromotionStats;
}

export function PromotionStats({ stats }: PromotionStatsProps) {
  const isExceptionalBrier = stats.brierScore < 0.15;
  const isExceptionalCalibration = stats.calibrationScore > 0.9;

  return (
    <div data-testid="promotion-stats" className="ascii-box p-4">
      <h3 className="text-sm font-bold text-[hsl(var(--muted-foreground))] mb-3">
        [YOUR STATS]
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div
            data-testid="stat-forecasts"
            className="text-2xl font-bold text-[hsl(var(--primary))]"
          >
            {stats.totalForecasts}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Forecasts</div>
        </div>
        <div className="text-center">
          <div
            data-testid="stat-brier"
            data-exceptional={isExceptionalBrier ? 'true' : 'false'}
            className={cn(
              'text-2xl font-bold',
              isExceptionalBrier ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--foreground))]'
            )}
          >
            {stats.brierScore.toFixed(2)}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Brier Score</div>
        </div>
        <div className="text-center">
          <div
            data-testid="stat-calibration"
            data-exceptional={isExceptionalCalibration ? 'true' : 'false'}
            className={cn(
              'text-2xl font-bold',
              isExceptionalCalibration ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--foreground))]'
            )}
          >
            {Math.round(stats.calibrationScore * 100)}%
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Calibration</div>
        </div>
        <div className="text-center">
          <div
            data-testid="stat-streak"
            className="text-2xl font-bold text-[hsl(var(--warning))]"
          >
            {stats.streakDays}
          </div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Day Streak</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CeremonyActions Component
// =============================================================================

interface CeremonyActionsProps {
  onClose: () => void;
  onShare?: () => void;
  onViewProfile?: () => void;
}

export function CeremonyActions({
  onClose,
  onShare,
  onViewProfile,
}: CeremonyActionsProps) {
  return (
    <div data-testid="ceremony-actions" className="flex flex-col gap-3">
      <div className="flex gap-3">
        <button
          data-testid="action-share"
          onClick={onShare}
          className={cn(
            'flex-1 px-4 py-2 font-mono text-sm',
            'border border-[hsl(var(--border))]',
            'hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]',
            'transition-colors'
          )}
        >
          [ SHARE ]
        </button>
        <button
          data-testid="action-profile"
          onClick={onViewProfile}
          className={cn(
            'flex-1 px-4 py-2 font-mono text-sm',
            'border border-[hsl(var(--border))]',
            'hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]',
            'transition-colors'
          )}
        >
          [ PROFILE ]
        </button>
      </div>
      <button
        data-testid="action-close"
        onClick={onClose}
        className={cn(
          'w-full px-6 py-3 font-mono font-bold',
          'border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]',
          'hover:bg-[hsl(var(--primary)/0.1)]',
          'transition-colors'
        )}
      >
        [ CONTINUE ]
      </button>
    </div>
  );
}

// =============================================================================
// PromotionCeremony Component
// =============================================================================

interface PromotionCeremonyProps {
  isOpen: boolean;
  data: PromotionData;
  onClose: () => void;
  onShare?: () => void;
  onViewProfile?: () => void;
}

export function PromotionCeremony({
  isOpen,
  data,
  onClose,
  onShare,
  onViewProfile,
}: PromotionCeremonyProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const isHighTier = HIGH_TIERS.includes(data.newTier);

  useEffect(() => {
    if (isOpen && isHighTier) {
      setShowCelebration(true);
    }
  }, [isOpen, isHighTier]);

  if (!isOpen) return null;

  return (
    <>
      {/* Celebration Animations */}
      {isHighTier && (
        <CelebrationOrchestrator
          active={showCelebration}
          tier={data.newTier}
          onComplete={() => setShowCelebration(false)}
        />
      )}

      {/* Ceremony Modal */}
      <div
        data-testid="promotion-ceremony"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          data-testid="ceremony-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className={cn(
            'relative ascii-box bg-[hsl(var(--background))] p-6 max-w-lg w-full',
            'border-2',
            TIER_CONFIG[data.newTier].borderColor
          )}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-xs text-[hsl(var(--muted-foreground))] font-mono mb-1">
              ╔═══════════════════════════════════════════╗
            </div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold terminal-glow"
            >
              TIER PROMOTION
            </motion.h2>
            <div className="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-1">
              ╚═══════════════════════════════════════════╝
            </div>
          </div>

          {/* Tier Badge */}
          <div className="flex justify-center mb-6">
            <TierBadgeDisplay
              tier={data.newTier}
              animated
              showGlow={isHighTier}
            />
          </div>

          {/* Tier Comparison */}
          <TierComparisonDisplay
            previousTier={data.previousTier}
            newTier={data.newTier}
          />

          {/* Congratulations */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-[hsl(var(--success))] mb-6"
          >
            Congratulations! Your forecasting excellence has been recognized.
          </motion.p>

          {/* Benefits */}
          <div className="mb-6">
            <BenefitsReveal tier={data.newTier} staggerDelay={300} />
          </div>

          {/* Stats */}
          <div className="mb-6">
            <PromotionStats stats={data.stats} />
          </div>

          {/* Actions */}
          <CeremonyActions
            onClose={onClose}
            onShare={onShare}
            onViewProfile={onViewProfile}
          />
        </motion.div>
      </div>
    </>
  );
}

// =============================================================================
// usePromotionCeremony Hook
// =============================================================================

export function usePromotionCeremony() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<PromotionData | null>(null);
  const [currentPhase, setCurrentPhase] = useState<CeremonyPhase>('idle');

  const open = useCallback((promotionData: PromotionData) => {
    setData(promotionData);
    setIsOpen(true);
    setCurrentPhase('intro');

    // Progress through phases
    setTimeout(() => setCurrentPhase('reveal'), 1000);
    setTimeout(() => setCurrentPhase('benefits'), 2500);
    setTimeout(() => setCurrentPhase('stats'), 4000);
    setTimeout(() => setCurrentPhase('complete'), 5500);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentPhase('idle');
    setData(null);
  }, []);

  return {
    isOpen,
    data,
    currentPhase,
    open,
    close,
  };
}
