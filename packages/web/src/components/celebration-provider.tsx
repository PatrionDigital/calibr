'use client';

import { useCallback } from 'react';
import { useCelebrationStore } from '@/lib/stores/celebration-store';
import {
  TierPromotionModal,
  AchievementToast,
} from './celebration';

// =============================================================================
// Types
// =============================================================================

interface CelebrationProviderProps {
  children: React.ReactNode;
}

// =============================================================================
// Provider Component
// =============================================================================

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const {
    showTierPromotion,
    tierChange,
    currentAchievement,
    dismissTierPromotion,
    dismissAchievement,
  } = useCelebrationStore();

  return (
    <>
      {children}

      {/* Tier Promotion Modal */}
      {showTierPromotion && tierChange && (
        <TierPromotionModal
          isOpen={showTierPromotion}
          previousTier={tierChange.previousTier}
          newTier={tierChange.newTier}
          onClose={dismissTierPromotion}
        />
      )}

      {/* Achievement Toast */}
      {currentAchievement && (
        <AchievementToast
          achievement={currentAchievement}
          isVisible={true}
          onDismiss={dismissAchievement}
          duration={5000}
        />
      )}
    </>
  );
}

// =============================================================================
// Hook for Triggering Checks
// =============================================================================

/**
 * Hook to check for tier changes and achievements
 * Call this after key actions like making a forecast
 */
export function useCelebrationCheck() {
  const { checkTierChange, checkAchievements, isChecking } = useCelebrationStore();

  const check = useCallback(async (userId: string) => {
    if (!userId) return;

    // Check tier change first (shows modal)
    const tierChange = await checkTierChange(userId);

    // Then check achievements (shows toasts)
    const achievements = await checkAchievements(userId);

    return { tierChange, achievements };
  }, [checkTierChange, checkAchievements]);

  return { check, isChecking };
}
