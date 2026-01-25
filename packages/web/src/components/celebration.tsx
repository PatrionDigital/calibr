'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// =============================================================================
// Types
// =============================================================================

type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';
type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface ConfettiProps {
  active: boolean;
  particleCount?: number;
  duration?: number;
  onComplete?: () => void;
}

interface TierPromotionModalProps {
  isOpen: boolean;
  previousTier: SuperforecasterTier;
  newTier: SuperforecasterTier;
  onClose: () => void;
}

interface AchievementToastProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    tier: AchievementTier;
  };
  isVisible: boolean;
  onDismiss: () => void;
  duration?: number;
}

// =============================================================================
// Constants
// =============================================================================

const ASCII_PARTICLES = ['*', '+', '·', '░', '▒', '▓', '█', '■', '□', '▪', '▫'];

const TIER_CONFIG: Record<SuperforecasterTier, { emoji: string; color: string; benefits: string[] }> = {
  APPRENTICE: {
    emoji: '🌱',
    color: 'text-green-400',
    benefits: ['Basic forecasting tools', 'Public leaderboard access'],
  },
  JOURNEYMAN: {
    emoji: '🎯',
    color: 'text-blue-400',
    benefits: ['Portfolio Kelly optimizer', 'Forecast journaling', 'Calibration analytics'],
  },
  EXPERT: {
    emoji: '🔮',
    color: 'text-purple-400',
    benefits: ['Advanced analytics', 'Cross-platform insights', 'Private attestations'],
  },
  MASTER: {
    emoji: '🧠',
    color: 'text-yellow-400',
    benefits: ['Superforecaster badge', 'Priority support', 'Beta feature access'],
  },
  GRANDMASTER: {
    emoji: '👁️',
    color: 'text-cyan-300',
    benefits: ['Legend status', 'Governance rights', 'Mentor privileges'],
  },
};

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  STREAK: '🔥',
  VOLUME: '📊',
  ACCURACY: '🎯',
  CALIBRATION: '⚖️',
  SPECIAL: '⭐',
};

const TIER_BADGES: Record<AchievementTier, { badge: string; color: string }> = {
  BRONZE: { badge: '[B]', color: 'text-amber-600' },
  SILVER: { badge: '[S]', color: 'text-gray-300' },
  GOLD: { badge: '[G]', color: 'text-yellow-400' },
  PLATINUM: { badge: '[P]', color: 'text-blue-200' },
  DIAMOND: { badge: '[D]', color: 'text-cyan-300' },
};

// =============================================================================
// Confetti Component
// =============================================================================

interface Particle {
  id: number;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  color: string;
}

export function Confetti({
  active,
  particleCount = 50,
  duration = 3000,
  onComplete,
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const colors = useMemo(() => [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    '#00ff00',
    '#00ffff',
    '#ff00ff',
  ], []);

  const generateParticles = useCallback(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      char: ASCII_PARTICLES[Math.floor(Math.random() * ASCII_PARTICLES.length)] || '*',
      x: 50 + (Math.random() - 0.5) * 20,
      y: 30,
      vx: (Math.random() - 0.5) * 15,
      vy: Math.random() * -10 - 5,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)] || '#00ff00',
    }));
  }, [particleCount, colors]);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles());

      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timeout);
    } else {
      setParticles([]);
    }
  }, [active, duration, generateParticles, onComplete]);

  if (!active || particles.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            data-testid="confetti-particle"
            initial={{
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.x + particle.vx * 5}vw`,
              y: `${particle.y + 70}vh`,
              rotate: particle.rotation * 3,
              opacity: 0,
            }}
            transition={{
              duration: duration / 1000,
              ease: 'easeOut',
            }}
            className="absolute font-mono text-xl"
            style={{ color: particle.color }}
          >
            {particle.char}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Tier Promotion Modal
// =============================================================================

export function TierPromotionModal({
  isOpen,
  previousTier,
  newTier,
  onClose,
}: TierPromotionModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
    }
  }, [isOpen]);

  const handleConfettiComplete = useCallback(() => {
    // Keep confetti visible, just stop animating
  }, []);

  if (!isOpen) {
    return null;
  }

  const newTierConfig = TIER_CONFIG[newTier];

  return (
    <>
      <Confetti
        active={showConfetti}
        particleCount={80}
        duration={4000}
        onComplete={handleConfettiComplete}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative ascii-box bg-[hsl(var(--background))] p-6 max-w-md w-full"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
              ╔════════════════════════════════════╗
            </div>
            <h2 className="text-xl font-bold terminal-glow">
              TIER PROMOTION
            </h2>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              ╚════════════════════════════════════╝
            </div>
          </div>

          {/* Tier Transition */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="text-center opacity-60">
              <div className="text-3xl mb-1">{TIER_CONFIG[previousTier].emoji}</div>
              <div className="text-sm">{previousTier}</div>
            </div>

            <div className="text-2xl text-[hsl(var(--primary))]">→</div>

            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="text-5xl mb-1"
              >
                {newTierConfig.emoji}
              </motion.div>
              <div className={`text-lg font-bold ${newTierConfig.color}`}>
                {newTier}
              </div>
            </div>
          </div>

          {/* Congratulations Message */}
          <div className="text-center mb-6">
            <p className="text-[hsl(var(--success))]">
              Congratulations! Your forecasting skills have earned you a promotion.
            </p>
          </div>

          {/* Benefits */}
          <div className="ascii-box p-4 mb-6">
            <h3 className="text-sm font-bold text-[hsl(var(--primary))] mb-2">
              [NEW BENEFITS]
            </h3>
            <ul className="space-y-1 text-sm">
              {newTierConfig.benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-[hsl(var(--success))]">+</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Close Button */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 font-mono border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] transition-colors"
            >
              [ OK ]
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// =============================================================================
// Achievement Toast
// =============================================================================

export function AchievementToast({
  achievement,
  isVisible,
  onDismiss,
  duration = 5000,
}: AchievementToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timeout = setTimeout(onDismiss, duration);
      return () => clearTimeout(timeout);
    }
  }, [isVisible, duration, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const tierConfig = TIER_BADGES[achievement.tier];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="ascii-box bg-[hsl(var(--background))] p-4 min-w-[300px] max-w-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[hsl(var(--success))] font-bold">
              ACHIEVEMENT UNLOCKED
            </div>
            <button
              onClick={onDismiss}
              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">{CATEGORY_ICONS[achievement.category]}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs ${tierConfig.color}`}>
                  {tierConfig.badge}
                </span>
                <span className="font-bold">{achievement.name}</span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {achievement.description}
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className="mt-3 h-0.5 bg-[hsl(var(--primary))] origin-left"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Celebration Provider Hook
// =============================================================================

interface CelebrationState {
  confetti: boolean;
  tierPromotion: {
    isOpen: boolean;
    previousTier: SuperforecasterTier;
    newTier: SuperforecasterTier;
  } | null;
  achievementToast: {
    achievement: AchievementToastProps['achievement'];
    isVisible: boolean;
  } | null;
}

export function useCelebration() {
  const [state, setState] = useState<CelebrationState>({
    confetti: false,
    tierPromotion: null,
    achievementToast: null,
  });

  const triggerConfetti = useCallback((duration = 3000) => {
    setState(prev => ({ ...prev, confetti: true }));
    setTimeout(() => {
      setState(prev => ({ ...prev, confetti: false }));
    }, duration);
  }, []);

  const showTierPromotion = useCallback((previousTier: SuperforecasterTier, newTier: SuperforecasterTier) => {
    setState(prev => ({
      ...prev,
      tierPromotion: { isOpen: true, previousTier, newTier },
    }));
  }, []);

  const hideTierPromotion = useCallback(() => {
    setState(prev => ({
      ...prev,
      tierPromotion: null,
    }));
  }, []);

  const showAchievementToast = useCallback((achievement: AchievementToastProps['achievement']) => {
    setState(prev => ({
      ...prev,
      achievementToast: { achievement, isVisible: true },
    }));
  }, []);

  const hideAchievementToast = useCallback(() => {
    setState(prev => ({
      ...prev,
      achievementToast: null,
    }));
  }, []);

  return {
    state,
    triggerConfetti,
    showTierPromotion,
    hideTierPromotion,
    showAchievementToast,
    hideAchievementToast,
  };
}

// =============================================================================
// Celebration Container
// =============================================================================

export function CelebrationContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    state,
    hideTierPromotion,
    hideAchievementToast,
  } = useCelebration();

  return (
    <>
      {children}

      <Confetti active={state.confetti} />

      {state.tierPromotion && (
        <TierPromotionModal
          isOpen={state.tierPromotion.isOpen}
          previousTier={state.tierPromotion.previousTier}
          newTier={state.tierPromotion.newTier}
          onClose={hideTierPromotion}
        />
      )}

      {state.achievementToast && (
        <AchievementToast
          achievement={state.achievementToast.achievement}
          isVisible={state.achievementToast.isVisible}
          onDismiss={hideAchievementToast}
        />
      )}
    </>
  );
}
