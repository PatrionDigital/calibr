/**
 * Achievement Types
 * Type definitions for achievement components
 */

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
export type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  unlockedAt: Date | null;
  progress: number;
  maxProgress: number;
}
