'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// =============================================================================
// Types
// =============================================================================

export type SuperforecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';

type CelebrationPhase = 'idle' | 'flash' | 'confetti' | 'fireworks' | 'emojis' | 'complete';

// =============================================================================
// Constants
// =============================================================================

const TIER_CONFIG: Record<SuperforecasterTier, {
  emoji: string;
  colors: string[];
  intensity: 'low' | 'medium' | 'high' | 'max';
  hasFireworks: boolean;
  hasRisingEmojis: boolean;
}> = {
  APPRENTICE: {
    emoji: '🌱',
    colors: ['#22c55e', '#4ade80', '#86efac'],
    intensity: 'low',
    hasFireworks: false,
    hasRisingEmojis: false,
  },
  JOURNEYMAN: {
    emoji: '🎯',
    colors: ['#3b82f6', '#60a5fa', '#93c5fd'],
    intensity: 'medium',
    hasFireworks: false,
    hasRisingEmojis: false,
  },
  EXPERT: {
    emoji: '🔮',
    colors: ['#a855f7', '#c084fc', '#d8b4fe'],
    intensity: 'medium',
    hasFireworks: true,
    hasRisingEmojis: false,
  },
  MASTER: {
    emoji: '🧠',
    colors: ['#eab308', '#facc15', '#fde047'],
    intensity: 'high',
    hasFireworks: true,
    hasRisingEmojis: true,
  },
  GRANDMASTER: {
    emoji: '👁️',
    colors: ['#06b6d4', '#22d3ee', '#67e8f9', '#fbbf24', '#f472b6'],
    intensity: 'max',
    hasFireworks: true,
    hasRisingEmojis: true,
  },
};

const FIREWORK_CHARS = ['✦', '✧', '★', '☆', '◆', '◇', '●', '○', '✶', '✴', '✵'];
const CONFETTI_CHARS = ['*', '+', '·', '░', '▒', '▓', '█', '■', '□', '▪', '▫'];

// =============================================================================
// ScreenFlash Component
// =============================================================================

interface ScreenFlashProps {
  active: boolean;
  tier?: SuperforecasterTier;
  duration?: number;
  onComplete?: () => void;
}

export function ScreenFlash({
  active,
  tier = 'JOURNEYMAN',
  duration = 300,
  onComplete,
}: ScreenFlashProps) {
  useEffect(() => {
    if (active && onComplete) {
      const timeout = setTimeout(onComplete, duration);
      return () => clearTimeout(timeout);
    }
  }, [active, duration, onComplete]);

  if (!active) return null;

  const tierConfig = TIER_CONFIG[tier];
  const flashColor = tierConfig.colors[0];

  return (
    <motion.div
      data-testid="screen-flash"
      data-tier={tier}
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 0 }}
      transition={{ duration: duration / 1000, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ backgroundColor: flashColor }}
    />
  );
}

// =============================================================================
// AsciiFireworks Component
// =============================================================================

interface FireworkBurst {
  id: number;
  x: number;
  y: number;
  particles: Array<{
    id: number;
    char: string;
    angle: number;
    distance: number;
    color: string;
  }>;
}

interface AsciiFireworksProps {
  active: boolean;
  burstCount?: number;
  duration?: number;
  onComplete?: () => void;
}

export function AsciiFireworks({
  active,
  burstCount = 3,
  duration = 2000,
  onComplete,
}: AsciiFireworksProps) {
  const [bursts, setBursts] = useState<FireworkBurst[]>([]);

  const generateBursts = useCallback(() => {
    const fireworkColors = ['#fbbf24', '#f472b6', '#22d3ee', '#a855f7'];
    return Array.from({ length: burstCount }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 40,
      particles: Array.from({ length: 12 }, (_, j) => ({
        id: j,
        char: FIREWORK_CHARS[Math.floor(Math.random() * FIREWORK_CHARS.length)] ?? '✦',
        angle: (j / 12) * 360,
        distance: 50 + Math.random() * 50,
        color: fireworkColors[Math.floor(Math.random() * fireworkColors.length)] ?? '#fbbf24',
      })),
    }));
  }, [burstCount]);

  useEffect(() => {
    if (active) {
      setBursts(generateBursts());
      const timeout = setTimeout(() => {
        setBursts([]);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timeout);
    } else {
      setBursts([]);
    }
  }, [active, duration, generateBursts, onComplete]);

  if (!active || bursts.length === 0) return null;

  return (
    <div
      data-testid="ascii-fireworks"
      className="fixed inset-0 z-[90] pointer-events-none overflow-hidden"
    >
      <AnimatePresence>
        {bursts.map((burst) => (
          <div
            key={burst.id}
            data-testid="firework-burst"
            className="absolute"
            style={{
              position: 'absolute',
              left: `${burst.x}%`,
              top: `${burst.y}%`,
            }}
          >
            {burst.particles.map((particle) => (
              <motion.span
                key={particle.id}
                data-testid="firework-particle"
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
                  y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
                  opacity: 0,
                  scale: 1,
                }}
                transition={{
                  duration: duration / 1000,
                  ease: 'easeOut',
                }}
                className="absolute font-mono text-2xl"
                style={{ color: particle.color }}
              >
                {particle.char}
              </motion.span>
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// TierConfetti Component
// =============================================================================

interface ConfettiParticle {
  id: number;
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  color: string;
}

interface TierConfettiProps {
  active: boolean;
  tier: SuperforecasterTier;
  particleCount?: number;
  duration?: number;
  includeEmoji?: boolean;
  onComplete?: () => void;
}

export function TierConfetti({
  active,
  tier,
  particleCount = 60,
  duration = 3000,
  includeEmoji = false,
  onComplete,
}: TierConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const tierConfig = TIER_CONFIG[tier];

  const generateParticles = useCallback(() => {
    const chars = includeEmoji
      ? [...CONFETTI_CHARS, tierConfig.emoji]
      : CONFETTI_CHARS;

    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      char: chars[Math.floor(Math.random() * chars.length)] ?? '*',
      x: 50 + (Math.random() - 0.5) * 30,
      y: 20,
      vx: (Math.random() - 0.5) * 20,
      vy: Math.random() * -8 - 4,
      rotation: Math.random() * 360,
      color: tierConfig.colors[Math.floor(Math.random() * tierConfig.colors.length)] ?? '#00ff00',
    }));
  }, [particleCount, includeEmoji, tierConfig]);

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

  if (!active || particles.length === 0) return null;

  return (
    <div
      data-testid="tier-confetti"
      data-tier={tier}
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            data-testid="tier-confetti-particle"
            initial={{
              x: `${particle.x}vw`,
              y: `${particle.y}vh`,
              rotate: 0,
              opacity: 1,
            }}
            animate={{
              x: `${particle.x + particle.vx * 4}vw`,
              y: `${particle.y + 80}vh`,
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
// RisingEmojis Component
// =============================================================================

interface RisingEmoji {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  scale: number;
}

interface RisingEmojisProps {
  active: boolean;
  tier: SuperforecasterTier;
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export function RisingEmojis({
  active,
  tier,
  count = 15,
  duration = 2500,
  onComplete,
}: RisingEmojisProps) {
  const [emojis, setEmojis] = useState<RisingEmoji[]>([]);
  const tierConfig = TIER_CONFIG[tier];

  const generateEmojis = useCallback(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: tierConfig.emoji,
      x: 10 + Math.random() * 80,
      delay: Math.random() * 0.5,
      scale: 0.8 + Math.random() * 0.6,
    }));
  }, [count, tierConfig.emoji]);

  useEffect(() => {
    if (active) {
      setEmojis(generateEmojis());
      const timeout = setTimeout(() => {
        setEmojis([]);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timeout);
    } else {
      setEmojis([]);
    }
  }, [active, duration, generateEmojis, onComplete]);

  if (!active || emojis.length === 0) return null;

  return (
    <div
      data-testid="rising-emojis-container"
      className="fixed inset-0 z-[70] pointer-events-none overflow-hidden"
    >
      <AnimatePresence>
        {emojis.map((item) => (
          <motion.span
            key={item.id}
            data-testid="rising-emoji"
            initial={{
              x: `${item.x}vw`,
              y: '110vh',
              scale: item.scale,
              opacity: 0.8,
            }}
            animate={{
              y: '-20vh',
              opacity: 0,
            }}
            transition={{
              duration: duration / 1000,
              delay: item.delay,
              ease: 'easeOut',
            }}
            className="absolute text-4xl"
          >
            {item.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// CelebrationOrchestrator Component
// =============================================================================

interface CelebrationOrchestratorProps {
  active: boolean;
  tier: SuperforecasterTier;
  onComplete?: () => void;
}

export function CelebrationOrchestrator({
  active,
  tier,
  onComplete,
}: CelebrationOrchestratorProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const tierConfig = TIER_CONFIG[tier];

  useEffect(() => {
    if (!active) {
      setShowFlash(false);
      setShowConfetti(false);
      setShowFireworks(false);
      setShowEmojis(false);
      return;
    }

    // Start celebration sequence
    setShowFlash(true);

    // Confetti starts after flash
    const confettiTimer = setTimeout(() => {
      setShowConfetti(true);
    }, 200);

    // Fireworks for high tiers
    const fireworksTimer = setTimeout(() => {
      if (tierConfig.hasFireworks) {
        setShowFireworks(true);
      }
    }, 400);

    // Rising emojis for MASTER and above
    const emojisTimer = setTimeout(() => {
      if (tierConfig.hasRisingEmojis) {
        setShowEmojis(true);
      }
    }, 600);

    // Complete callback
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(fireworksTimer);
      clearTimeout(emojisTimer);
      clearTimeout(completeTimer);
    };
  }, [active, tierConfig, onComplete]);

  if (!active) return null;

  return (
    <div
      data-testid="celebration-orchestrator"
      data-intensity={tierConfig.intensity}
      className="fixed inset-0 z-[60] pointer-events-none"
    >
      <ScreenFlash
        active={showFlash}
        tier={tier}
        duration={300}
        onComplete={() => setShowFlash(false)}
      />

      <TierConfetti
        active={showConfetti}
        tier={tier}
        particleCount={tierConfig.intensity === 'max' ? 100 : tierConfig.intensity === 'high' ? 80 : 60}
        includeEmoji={tierConfig.intensity === 'max'}
        duration={3500}
      />

      {tierConfig.hasFireworks && (
        <AsciiFireworks
          active={showFireworks}
          burstCount={tierConfig.intensity === 'max' ? 5 : 3}
          duration={2500}
        />
      )}

      {tierConfig.hasRisingEmojis && (
        <RisingEmojis
          active={showEmojis}
          tier={tier}
          count={tierConfig.intensity === 'max' ? 20 : 12}
          duration={3000}
        />
      )}
    </div>
  );
}

// =============================================================================
// useCelebrationSequence Hook
// =============================================================================

export function useCelebrationSequence() {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<CelebrationPhase>('idle');
  const [currentTier, setCurrentTier] = useState<SuperforecasterTier | null>(null);

  const start = useCallback((tier: SuperforecasterTier) => {
    setCurrentTier(tier);
    setIsActive(true);
    setCurrentPhase('flash');

    // Progress through phases
    setTimeout(() => setCurrentPhase('confetti'), 300);
    setTimeout(() => setCurrentPhase('fireworks'), 800);
    setTimeout(() => setCurrentPhase('emojis'), 1500);
    setTimeout(() => {
      setCurrentPhase('complete');
      setTimeout(() => {
        setIsActive(false);
        setCurrentPhase('idle');
        setCurrentTier(null);
      }, 500);
    }, 3500);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentPhase('idle');
    setCurrentTier(null);
  }, []);

  return {
    isActive,
    currentPhase,
    currentTier,
    start,
    stop,
  };
}
