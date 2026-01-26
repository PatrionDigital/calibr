/**
 * Celebration Store
 * Manages tier promotions, achievement unlocks, and celebration UI state
 */

import { create } from 'zustand';

// =============================================================================
// Types
// =============================================================================

export type ForecasterTier = 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'GRANDMASTER';
export type AchievementCategory = 'STREAK' | 'VOLUME' | 'ACCURACY' | 'CALIBRATION' | 'SPECIAL';
export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface TierChange {
  previousTier: ForecasterTier;
  newTier: ForecasterTier;
  direction: 'up' | 'down' | 'none';
  delta: number;
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
}

export interface CelebrationStore {
  // State
  showTierPromotion: boolean;
  tierChange: TierChange | null;
  achievementQueue: UnlockedAchievement[];
  currentAchievement: UnlockedAchievement | null;
  isChecking: boolean;
  lastCheckAt: string | null;

  // Actions
  checkTierChange: (userId: string) => Promise<TierChange | null>;
  checkAchievements: (userId: string) => Promise<UnlockedAchievement[]>;
  dismissTierPromotion: () => void;
  dismissAchievement: () => void;
  showNextAchievement: () => void;
  reset: () => void;
}

// =============================================================================
// API Helpers
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useCelebrationStore = create<CelebrationStore>()((set, get) => ({
  // Initial state
  showTierPromotion: false,
  tierChange: null,
  achievementQueue: [],
  currentAchievement: null,
  isChecking: false,
  lastCheckAt: null,

  // Actions
  checkTierChange: async (userId: string) => {
    set({ isChecking: true });

    try {
      const result = await apiFetch<{
        tierChanged: boolean;
        tierChange?: TierChange;
        celebration?: { show: boolean; previousTier: ForecasterTier; newTier: ForecasterTier };
      }>(`/api/leaderboard/tier/check/${userId}`, {
        method: 'POST',
      });

      if (result.tierChanged && result.tierChange && result.celebration?.show) {
        const tierChange: TierChange = {
          previousTier: result.tierChange.previousTier,
          newTier: result.tierChange.newTier,
          direction: result.tierChange.direction,
          delta: result.tierChange.delta,
        };

        set({
          showTierPromotion: true,
          tierChange,
          isChecking: false,
          lastCheckAt: new Date().toISOString(),
        });

        return tierChange;
      }

      set({
        isChecking: false,
        lastCheckAt: new Date().toISOString(),
      });

      return null;
    } catch {
      set({ isChecking: false });
      return null;
    }
  },

  checkAchievements: async (userId: string) => {
    set({ isChecking: true });

    try {
      const result = await apiFetch<{
        newlyUnlocked: UnlockedAchievement[];
        totalUnlocked: number;
      }>(`/api/leaderboard/achievements/check/${userId}`, {
        method: 'POST',
      });

      const newlyUnlocked = result.newlyUnlocked || [];

      if (newlyUnlocked.length > 0) {
        set((state) => ({
          achievementQueue: [...state.achievementQueue, ...newlyUnlocked],
          currentAchievement: state.currentAchievement || newlyUnlocked[0] || null,
          isChecking: false,
          lastCheckAt: new Date().toISOString(),
        }));
      } else {
        set({
          isChecking: false,
          lastCheckAt: new Date().toISOString(),
        });
      }

      return newlyUnlocked;
    } catch {
      set({ isChecking: false });
      return [];
    }
  },

  dismissTierPromotion: () => {
    set({ showTierPromotion: false, tierChange: null });
  },

  dismissAchievement: () => {
    const { achievementQueue } = get();
    const remaining = achievementQueue.slice(1);

    set({
      currentAchievement: remaining[0] || null,
      achievementQueue: remaining,
    });
  },

  showNextAchievement: () => {
    const { achievementQueue } = get();
    const remaining = achievementQueue.slice(1);

    set({
      currentAchievement: remaining[0] || null,
      achievementQueue: remaining,
    });
  },

  reset: () => {
    set({
      showTierPromotion: false,
      tierChange: null,
      achievementQueue: [],
      currentAchievement: null,
      isChecking: false,
      lastCheckAt: null,
    });
  },
}));
