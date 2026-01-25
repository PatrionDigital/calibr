/**
 * Achievement System
 * Definitions, unlock logic, and tracking for forecaster achievements
 */

import type { Achievement, AchievementCategory, AchievementTier, LeaderboardEntry } from './types';

// =============================================================================
// Achievement Definitions
// =============================================================================

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  maxProgress: number;
  checkCriteria: (entry: LeaderboardEntry) => number; // Returns current progress
  icon?: string;
}

// Streak Achievements
const STREAK_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'STREAK_7',
    name: 'Week Warrior',
    description: 'Made forecasts for 7 consecutive days',
    category: 'STREAK',
    tier: 'BRONZE',
    maxProgress: 7,
    checkCriteria: (entry) => Math.min(entry.streakDays, 7),
  },
  {
    id: 'STREAK_30',
    name: 'Monthly Maven',
    description: 'Made forecasts for 30 consecutive days',
    category: 'STREAK',
    tier: 'SILVER',
    maxProgress: 30,
    checkCriteria: (entry) => Math.min(entry.streakDays, 30),
  },
  {
    id: 'STREAK_90',
    name: 'Quarterly Quest',
    description: 'Made forecasts for 90 consecutive days',
    category: 'STREAK',
    tier: 'GOLD',
    maxProgress: 90,
    checkCriteria: (entry) => Math.min(entry.streakDays, 90),
  },
  {
    id: 'STREAK_365',
    name: 'Year of Foresight',
    description: 'Made forecasts for 365 consecutive days',
    category: 'STREAK',
    tier: 'DIAMOND',
    maxProgress: 365,
    checkCriteria: (entry) => Math.min(entry.streakDays, 365),
  },
];

// Volume Achievements
const VOLUME_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'FORECASTS_10',
    name: 'First Steps',
    description: 'Make 10 forecasts',
    category: 'VOLUME',
    tier: 'BRONZE',
    maxProgress: 10,
    checkCriteria: (entry) => Math.min(entry.totalForecasts, 10),
  },
  {
    id: 'FORECASTS_50',
    name: 'Getting Serious',
    description: 'Make 50 forecasts',
    category: 'VOLUME',
    tier: 'SILVER',
    maxProgress: 50,
    checkCriteria: (entry) => Math.min(entry.totalForecasts, 50),
  },
  {
    id: 'FORECASTS_100',
    name: 'Century Forecaster',
    description: 'Make 100 forecasts',
    category: 'VOLUME',
    tier: 'GOLD',
    maxProgress: 100,
    checkCriteria: (entry) => Math.min(entry.totalForecasts, 100),
  },
  {
    id: 'FORECASTS_500',
    name: 'Prolific Predictor',
    description: 'Make 500 forecasts',
    category: 'VOLUME',
    tier: 'PLATINUM',
    maxProgress: 500,
    checkCriteria: (entry) => Math.min(entry.totalForecasts, 500),
  },
  {
    id: 'FORECASTS_1000',
    name: 'Forecasting Legend',
    description: 'Make 1000 forecasts',
    category: 'VOLUME',
    tier: 'DIAMOND',
    maxProgress: 1000,
    checkCriteria: (entry) => Math.min(entry.totalForecasts, 1000),
  },
];

// Accuracy Achievements
const ACCURACY_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'BRIER_GOOD',
    name: 'Accurate Observer',
    description: 'Achieve a Brier score below 0.25',
    category: 'ACCURACY',
    tier: 'BRONZE',
    maxProgress: 1,
    checkCriteria: (entry) => entry.brierScore <= 0.25 ? 1 : 0,
  },
  {
    id: 'BRIER_GREAT',
    name: 'Sharp Predictor',
    description: 'Achieve a Brier score below 0.20',
    category: 'ACCURACY',
    tier: 'SILVER',
    maxProgress: 1,
    checkCriteria: (entry) => entry.brierScore <= 0.20 ? 1 : 0,
  },
  {
    id: 'BRIER_EXCELLENT',
    name: 'Precision Master',
    description: 'Achieve a Brier score below 0.15',
    category: 'ACCURACY',
    tier: 'GOLD',
    maxProgress: 1,
    checkCriteria: (entry) => entry.brierScore <= 0.15 ? 1 : 0,
  },
  {
    id: 'BRIER_ELITE',
    name: 'Elite Forecaster',
    description: 'Achieve a Brier score below 0.10',
    category: 'ACCURACY',
    tier: 'DIAMOND',
    maxProgress: 1,
    checkCriteria: (entry) => entry.brierScore <= 0.10 ? 1 : 0,
  },
];

// Calibration Achievements
const CALIBRATION_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'CALIBRATION_GOOD',
    name: 'Calibrated Mind',
    description: 'Achieve calibration score above 0.70',
    category: 'CALIBRATION',
    tier: 'BRONZE',
    maxProgress: 1,
    checkCriteria: (entry) => entry.calibrationScore >= 0.70 ? 1 : 0,
  },
  {
    id: 'CALIBRATION_GREAT',
    name: 'Well Calibrated',
    description: 'Achieve calibration score above 0.80',
    category: 'CALIBRATION',
    tier: 'SILVER',
    maxProgress: 1,
    checkCriteria: (entry) => entry.calibrationScore >= 0.80 ? 1 : 0,
  },
  {
    id: 'CALIBRATION_EXCELLENT',
    name: 'Calibration Expert',
    description: 'Achieve calibration score above 0.90',
    category: 'CALIBRATION',
    tier: 'GOLD',
    maxProgress: 1,
    checkCriteria: (entry) => entry.calibrationScore >= 0.90 ? 1 : 0,
  },
  {
    id: 'CALIBRATION_PERFECT',
    name: 'Perfect Calibration',
    description: 'Achieve calibration score above 0.95',
    category: 'CALIBRATION',
    tier: 'DIAMOND',
    maxProgress: 1,
    checkCriteria: (entry) => entry.calibrationScore >= 0.95 ? 1 : 0,
  },
];

// Special Achievements
const SPECIAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'TIER_JOURNEYMAN',
    name: 'Rising Star',
    description: 'Reach Journeyman tier',
    category: 'SPECIAL',
    tier: 'BRONZE',
    maxProgress: 1,
    checkCriteria: (entry) => {
      const tierOrder = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];
      return tierOrder.indexOf(entry.tier) >= 1 ? 1 : 0;
    },
  },
  {
    id: 'TIER_EXPERT',
    name: 'Expert Status',
    description: 'Reach Expert tier',
    category: 'SPECIAL',
    tier: 'SILVER',
    maxProgress: 1,
    checkCriteria: (entry) => {
      const tierOrder = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];
      return tierOrder.indexOf(entry.tier) >= 2 ? 1 : 0;
    },
  },
  {
    id: 'TIER_MASTER',
    name: 'Master Forecaster',
    description: 'Reach Master tier',
    category: 'SPECIAL',
    tier: 'GOLD',
    maxProgress: 1,
    checkCriteria: (entry) => {
      const tierOrder = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];
      return tierOrder.indexOf(entry.tier) >= 3 ? 1 : 0;
    },
  },
  {
    id: 'TIER_GRANDMASTER',
    name: 'Grandmaster',
    description: 'Reach Grandmaster tier',
    category: 'SPECIAL',
    tier: 'DIAMOND',
    maxProgress: 1,
    checkCriteria: (entry) => {
      const tierOrder = ['APPRENTICE', 'JOURNEYMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];
      return tierOrder.indexOf(entry.tier) >= 4 ? 1 : 0;
    },
  },
  {
    id: 'TOP_10',
    name: 'Top 10',
    description: 'Reach top 10 on the leaderboard',
    category: 'SPECIAL',
    tier: 'PLATINUM',
    maxProgress: 1,
    checkCriteria: (entry) => entry.rank <= 10 ? 1 : 0,
  },
  {
    id: 'TOP_100',
    name: 'Top 100',
    description: 'Reach top 100 on the leaderboard',
    category: 'SPECIAL',
    tier: 'GOLD',
    maxProgress: 1,
    checkCriteria: (entry) => entry.rank <= 100 ? 1 : 0,
  },
];

// All achievements combined
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  ...STREAK_ACHIEVEMENTS,
  ...VOLUME_ACHIEVEMENTS,
  ...ACCURACY_ACHIEVEMENTS,
  ...CALIBRATION_ACHIEVEMENTS,
  ...SPECIAL_ACHIEVEMENTS,
];

// =============================================================================
// Achievement Checking
// =============================================================================

/**
 * Get an achievement definition by ID
 */
export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
}

/**
 * Get all achievement definitions
 */
export function getAllAchievementDefinitions(): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS;
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
}

/**
 * Check all achievements for a forecaster and return their current state
 */
export function checkAchievements(entry: LeaderboardEntry): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const progress = def.checkCriteria(entry);
    const isUnlocked = progress >= def.maxProgress;

    // Find existing achievement if any
    const existing = entry.achievements.find((a) => a.id === def.id);

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      tier: def.tier,
      unlockedAt: isUnlocked ? (existing?.unlockedAt || new Date()) : null,
      progress,
      maxProgress: def.maxProgress,
    };
  });
}

/**
 * Check for newly unlocked achievements
 * Returns achievements that were just unlocked (not previously unlocked)
 */
export function checkNewlyUnlocked(
  entry: LeaderboardEntry,
  previousAchievements: Achievement[]
): Achievement[] {
  const currentAchievements = checkAchievements(entry);
  const previousUnlockedIds = new Set(
    previousAchievements.filter((a) => a.unlockedAt !== null).map((a) => a.id)
  );

  return currentAchievements.filter(
    (a) => a.unlockedAt !== null && !previousUnlockedIds.has(a.id)
  );
}

/**
 * Get unlocked achievements for a forecaster
 */
export function getUnlockedAchievements(entry: LeaderboardEntry): Achievement[] {
  return checkAchievements(entry).filter((a) => a.unlockedAt !== null);
}

/**
 * Get in-progress achievements (partially completed but not unlocked)
 */
export function getInProgressAchievements(entry: LeaderboardEntry): Achievement[] {
  return checkAchievements(entry).filter(
    (a) => a.unlockedAt === null && a.progress > 0
  );
}

/**
 * Calculate achievement score (sum of tier values)
 */
export function calculateAchievementScore(achievements: Achievement[]): number {
  const TIER_VALUES: Record<AchievementTier, number> = {
    BRONZE: 10,
    SILVER: 25,
    GOLD: 50,
    PLATINUM: 100,
    DIAMOND: 200,
  };

  return achievements
    .filter((a) => a.unlockedAt !== null)
    .reduce((sum, a) => sum + TIER_VALUES[a.tier], 0);
}

// =============================================================================
// Achievement Display Helpers
// =============================================================================

export const ACHIEVEMENT_TIER_COLORS: Record<AchievementTier, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  STREAK: 'Consistency',
  VOLUME: 'Volume',
  ACCURACY: 'Accuracy',
  CALIBRATION: 'Calibration',
  SPECIAL: 'Special',
};

/**
 * Get display name for achievement tier
 */
export function getTierDisplayName(tier: AchievementTier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

/**
 * Format achievement progress as percentage
 */
export function formatAchievementProgress(achievement: Achievement): string {
  if (achievement.unlockedAt !== null) {
    return '100%';
  }
  const percentage = (achievement.progress / achievement.maxProgress) * 100;
  return `${Math.round(percentage)}%`;
}
