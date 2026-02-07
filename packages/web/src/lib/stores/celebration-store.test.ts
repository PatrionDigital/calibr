/**
 * Celebration Store Tests
 *
 * Tests for celebration store:
 * - Default state
 * - Tier change checking
 * - Achievement checking
 * - Queue management
 * - Dismissal actions
 * - Reset functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useCelebrationStore,
  type TierChange,
  type UnlockedAchievement,
} from './celebration-store';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse<T>(data: T, success = true) {
  return Promise.resolve({
    ok: success,
    json: () => Promise.resolve({ success, data }),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('useCelebrationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    const { result } = renderHook(() => useCelebrationStore());
    act(() => {
      result.current.reset();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('default state', () => {
    it('has showTierPromotion as false', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.showTierPromotion).toBe(false);
    });

    it('has tierChange as null', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.tierChange).toBeNull();
    });

    it('has empty achievementQueue', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.achievementQueue).toEqual([]);
    });

    it('has currentAchievement as null', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.currentAchievement).toBeNull();
    });

    it('has isChecking as false', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.isChecking).toBe(false);
    });

    it('has lastCheckAt as null', () => {
      const { result } = renderHook(() => useCelebrationStore());
      expect(result.current.lastCheckAt).toBeNull();
    });
  });

  describe('checkTierChange', () => {
    it('sets isChecking to true during check', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCelebrationStore());

      act(() => {
        result.current.checkTierChange('user-123');
      });

      expect(result.current.isChecking).toBe(true);
    });

    it('returns null when no tier change', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          tierChanged: false,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let tierChange: TierChange | null = null;
      await act(async () => {
        tierChange = await result.current.checkTierChange('user-123');
      });

      expect(tierChange).toBeNull();
      expect(result.current.showTierPromotion).toBe(false);
      expect(result.current.isChecking).toBe(false);
    });

    it('sets tier promotion state when tier changed', async () => {
      const tierChangeData: TierChange = {
        previousTier: 'APPRENTICE',
        newTier: 'JOURNEYMAN',
        direction: 'up',
        delta: 1,
      };

      mockFetch.mockImplementation(() =>
        createMockResponse({
          tierChanged: true,
          tierChange: tierChangeData,
          celebration: { show: true, previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' },
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let tierChange: TierChange | null = null;
      await act(async () => {
        tierChange = await result.current.checkTierChange('user-123');
      });

      expect(tierChange).toEqual(tierChangeData);
      expect(result.current.showTierPromotion).toBe(true);
      expect(result.current.tierChange).toEqual(tierChangeData);
      expect(result.current.isChecking).toBe(false);
      expect(result.current.lastCheckAt).toBeTruthy();
    });

    it('does not show celebration when show is false', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          tierChanged: true,
          tierChange: {
            previousTier: 'APPRENTICE',
            newTier: 'JOURNEYMAN',
            direction: 'up',
            delta: 1,
          },
          celebration: { show: false, previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' },
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkTierChange('user-123');
      });

      expect(result.current.showTierPromotion).toBe(false);
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'API error' }),
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let tierChange: TierChange | null = null;
      await act(async () => {
        tierChange = await result.current.checkTierChange('user-123');
      });

      expect(tierChange).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const { result } = renderHook(() => useCelebrationStore());

      let tierChange: TierChange | null = null;
      await act(async () => {
        tierChange = await result.current.checkTierChange('user-123');
      });

      expect(tierChange).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('checkAchievements', () => {
    const sampleAchievement: UnlockedAchievement = {
      id: 'ach-1',
      name: 'First Forecast',
      description: 'Made your first forecast',
      category: 'VOLUME',
      tier: 'BRONZE',
    };

    it('sets isChecking to true during check', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useCelebrationStore());

      act(() => {
        result.current.checkAchievements('user-123');
      });

      expect(result.current.isChecking).toBe(true);
    });

    it('returns empty array when no new achievements', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [],
          totalUnlocked: 5,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let achievements: UnlockedAchievement[] = [];
      await act(async () => {
        achievements = await result.current.checkAchievements('user-123');
      });

      expect(achievements).toEqual([]);
      expect(result.current.achievementQueue).toEqual([]);
      expect(result.current.currentAchievement).toBeNull();
    });

    it('adds achievements to queue when unlocked', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [sampleAchievement],
          totalUnlocked: 6,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let achievements: UnlockedAchievement[] = [];
      await act(async () => {
        achievements = await result.current.checkAchievements('user-123');
      });

      expect(achievements).toEqual([sampleAchievement]);
      expect(result.current.achievementQueue).toEqual([sampleAchievement]);
      expect(result.current.currentAchievement).toEqual(sampleAchievement);
    });

    it('adds multiple achievements to queue', async () => {
      const secondAchievement: UnlockedAchievement = {
        id: 'ach-2',
        name: 'Streak Master',
        description: '7 day streak',
        category: 'STREAK',
        tier: 'SILVER',
      };

      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [sampleAchievement, secondAchievement],
          totalUnlocked: 7,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkAchievements('user-123');
      });

      expect(result.current.achievementQueue).toHaveLength(2);
      expect(result.current.currentAchievement).toEqual(sampleAchievement);
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ success: false, error: 'API error' }),
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      let achievements: UnlockedAchievement[] = [];
      await act(async () => {
        achievements = await result.current.checkAchievements('user-123');
      });

      expect(achievements).toEqual([]);
      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('dismissTierPromotion', () => {
    it('hides tier promotion', async () => {
      // First set up a tier change
      mockFetch.mockImplementation(() =>
        createMockResponse({
          tierChanged: true,
          tierChange: {
            previousTier: 'APPRENTICE',
            newTier: 'JOURNEYMAN',
            direction: 'up',
            delta: 1,
          },
          celebration: { show: true, previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' },
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkTierChange('user-123');
      });

      expect(result.current.showTierPromotion).toBe(true);

      act(() => {
        result.current.dismissTierPromotion();
      });

      expect(result.current.showTierPromotion).toBe(false);
      expect(result.current.tierChange).toBeNull();
    });
  });

  describe('dismissAchievement', () => {
    it('removes current achievement and shows next', async () => {
      const achievement1: UnlockedAchievement = {
        id: 'ach-1',
        name: 'First',
        description: 'First achievement',
        category: 'VOLUME',
        tier: 'BRONZE',
      };
      const achievement2: UnlockedAchievement = {
        id: 'ach-2',
        name: 'Second',
        description: 'Second achievement',
        category: 'STREAK',
        tier: 'SILVER',
      };

      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [achievement1, achievement2],
          totalUnlocked: 2,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkAchievements('user-123');
      });

      expect(result.current.currentAchievement).toEqual(achievement1);

      act(() => {
        result.current.dismissAchievement();
      });

      expect(result.current.currentAchievement).toEqual(achievement2);
      expect(result.current.achievementQueue).toHaveLength(1);
    });

    it('sets currentAchievement to null when queue empty', async () => {
      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [
            { id: 'ach-1', name: 'Only', description: 'Only one', category: 'VOLUME', tier: 'BRONZE' },
          ],
          totalUnlocked: 1,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkAchievements('user-123');
      });

      act(() => {
        result.current.dismissAchievement();
      });

      expect(result.current.currentAchievement).toBeNull();
      expect(result.current.achievementQueue).toEqual([]);
    });
  });

  describe('showNextAchievement', () => {
    it('advances to next achievement in queue', async () => {
      const achievement1: UnlockedAchievement = {
        id: 'ach-1',
        name: 'First',
        description: 'First',
        category: 'VOLUME',
        tier: 'BRONZE',
      };
      const achievement2: UnlockedAchievement = {
        id: 'ach-2',
        name: 'Second',
        description: 'Second',
        category: 'ACCURACY',
        tier: 'GOLD',
      };

      mockFetch.mockImplementation(() =>
        createMockResponse({
          newlyUnlocked: [achievement1, achievement2],
          totalUnlocked: 2,
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkAchievements('user-123');
      });

      act(() => {
        result.current.showNextAchievement();
      });

      expect(result.current.currentAchievement).toEqual(achievement2);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', async () => {
      // Set up some state
      mockFetch.mockImplementation(() =>
        createMockResponse({
          tierChanged: true,
          tierChange: {
            previousTier: 'APPRENTICE',
            newTier: 'JOURNEYMAN',
            direction: 'up',
            delta: 1,
          },
          celebration: { show: true, previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' },
        })
      );

      const { result } = renderHook(() => useCelebrationStore());

      await act(async () => {
        await result.current.checkTierChange('user-123');
      });

      expect(result.current.showTierPromotion).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.showTierPromotion).toBe(false);
      expect(result.current.tierChange).toBeNull();
      expect(result.current.achievementQueue).toEqual([]);
      expect(result.current.currentAchievement).toBeNull();
      expect(result.current.isChecking).toBe(false);
      expect(result.current.lastCheckAt).toBeNull();
    });
  });
});
