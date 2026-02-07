/**
 * CelebrationProvider Component Tests
 *
 * Tests for the celebration provider and hook:
 * - Children rendering
 * - TierPromotionModal conditional display
 * - AchievementToast conditional display
 * - useCelebrationCheck hook behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import { CelebrationProvider, useCelebrationCheck } from '@/components/celebration-provider';

// =============================================================================
// Mocks
// =============================================================================

// Mock celebration store
const mockDismissTierPromotion = vi.fn();
const mockDismissAchievement = vi.fn();
const mockCheckTierChange = vi.fn();
const mockCheckAchievements = vi.fn();

let mockCelebrationState = {
  showTierPromotion: false,
  tierChange: null as { previousTier: string; newTier: string } | null,
  currentAchievement: null as { id: string; name: string; description: string } | null,
  dismissTierPromotion: mockDismissTierPromotion,
  dismissAchievement: mockDismissAchievement,
  checkTierChange: mockCheckTierChange,
  checkAchievements: mockCheckAchievements,
  isChecking: false,
};

vi.mock('@/lib/stores/celebration-store', () => ({
  useCelebrationStore: () => mockCelebrationState,
}));

// Capture modal/toast props
let capturedModalProps: {
  isOpen?: boolean;
  previousTier?: string;
  newTier?: string;
  onClose?: () => void;
} = {};
let capturedToastProps: {
  achievement?: unknown;
  isVisible?: boolean;
  onDismiss?: () => void;
  duration?: number;
} = {};

vi.mock('@/components/celebration', () => ({
  TierPromotionModal: ({
    isOpen,
    previousTier,
    newTier,
    onClose,
  }: {
    isOpen: boolean;
    previousTier: string;
    newTier: string;
    onClose: () => void;
  }) => {
    capturedModalProps = { isOpen, previousTier, newTier, onClose };
    return <div data-testid="tier-promotion-modal">Tier Promotion: {previousTier} → {newTier}</div>;
  },
  AchievementToast: ({
    achievement,
    isVisible,
    onDismiss,
    duration,
  }: {
    achievement: unknown;
    isVisible: boolean;
    onDismiss: () => void;
    duration: number;
  }) => {
    capturedToastProps = { achievement, isVisible, onDismiss, duration };
    return <div data-testid="achievement-toast">Achievement Toast</div>;
  },
}));

// =============================================================================
// Test Helpers
// =============================================================================

function resetMocks() {
  mockCelebrationState = {
    showTierPromotion: false,
    tierChange: null,
    currentAchievement: null,
    dismissTierPromotion: mockDismissTierPromotion,
    dismissAchievement: mockDismissAchievement,
    checkTierChange: mockCheckTierChange,
    checkAchievements: mockCheckAchievements,
    isChecking: false,
  };
  capturedModalProps = {};
  capturedToastProps = {};
  vi.clearAllMocks();
}

// =============================================================================
// Provider Tests
// =============================================================================

describe('CelebrationProvider', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <CelebrationProvider>
          <div data-testid="child-content">Test Content</div>
        </CelebrationProvider>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <CelebrationProvider>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </CelebrationProvider>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('TierPromotionModal', () => {
    it('does not render when showTierPromotion is false', () => {
      mockCelebrationState.showTierPromotion = false;
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.queryByTestId('tier-promotion-modal')).not.toBeInTheDocument();
    });

    it('does not render when tierChange is null', () => {
      mockCelebrationState.showTierPromotion = true;
      mockCelebrationState.tierChange = null;
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.queryByTestId('tier-promotion-modal')).not.toBeInTheDocument();
    });

    it('renders when showTierPromotion is true and tierChange exists', () => {
      mockCelebrationState.showTierPromotion = true;
      mockCelebrationState.tierChange = { previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.getByTestId('tier-promotion-modal')).toBeInTheDocument();
    });

    it('passes correct props to TierPromotionModal', () => {
      mockCelebrationState.showTierPromotion = true;
      mockCelebrationState.tierChange = { previousTier: 'EXPERT', newTier: 'MASTER' };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(capturedModalProps.isOpen).toBe(true);
      expect(capturedModalProps.previousTier).toBe('EXPERT');
      expect(capturedModalProps.newTier).toBe('MASTER');
    });

    it('passes dismissTierPromotion as onClose', () => {
      mockCelebrationState.showTierPromotion = true;
      mockCelebrationState.tierChange = { previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(capturedModalProps.onClose).toBe(mockDismissTierPromotion);
    });
  });

  describe('AchievementToast', () => {
    it('does not render when currentAchievement is null', () => {
      mockCelebrationState.currentAchievement = null;
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.queryByTestId('achievement-toast')).not.toBeInTheDocument();
    });

    it('renders when currentAchievement exists', () => {
      mockCelebrationState.currentAchievement = {
        id: 'first-forecast',
        name: 'First Forecast',
        description: 'Made your first forecast',
      };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.getByTestId('achievement-toast')).toBeInTheDocument();
    });

    it('passes correct props to AchievementToast', () => {
      const achievement = {
        id: 'calibrated',
        name: 'Well Calibrated',
        description: 'Achieved good calibration',
      };
      mockCelebrationState.currentAchievement = achievement;
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(capturedToastProps.achievement).toEqual(achievement);
      expect(capturedToastProps.isVisible).toBe(true);
      expect(capturedToastProps.duration).toBe(5000);
    });

    it('passes dismissAchievement as onDismiss', () => {
      mockCelebrationState.currentAchievement = {
        id: 'first-forecast',
        name: 'First Forecast',
        description: 'Made your first forecast',
      };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(capturedToastProps.onDismiss).toBe(mockDismissAchievement);
    });
  });

  describe('combined state', () => {
    it('renders both modal and toast when both conditions are met', () => {
      mockCelebrationState.showTierPromotion = true;
      mockCelebrationState.tierChange = { previousTier: 'JOURNEYMAN', newTier: 'EXPERT' };
      mockCelebrationState.currentAchievement = {
        id: 'tier-up',
        name: 'Tier Up',
        description: 'Promoted to new tier',
      };
      render(
        <CelebrationProvider>
          <div>Content</div>
        </CelebrationProvider>
      );
      expect(screen.getByTestId('tier-promotion-modal')).toBeInTheDocument();
      expect(screen.getByTestId('achievement-toast')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// Hook Tests
// =============================================================================

describe('useCelebrationCheck', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns check function and isChecking state', () => {
    const { result } = renderHook(() => useCelebrationCheck());
    expect(typeof result.current.check).toBe('function');
    expect(result.current.isChecking).toBe(false);
  });

  it('returns isChecking from store', () => {
    mockCelebrationState.isChecking = true;
    const { result } = renderHook(() => useCelebrationCheck());
    expect(result.current.isChecking).toBe(true);
  });

  it('check function calls checkTierChange with userId', async () => {
    mockCheckTierChange.mockResolvedValue(null);
    mockCheckAchievements.mockResolvedValue([]);

    const { result } = renderHook(() => useCelebrationCheck());

    await act(async () => {
      await result.current.check('user-123');
    });

    expect(mockCheckTierChange).toHaveBeenCalledWith('user-123');
  });

  it('check function calls checkAchievements with userId', async () => {
    mockCheckTierChange.mockResolvedValue(null);
    mockCheckAchievements.mockResolvedValue([]);

    const { result } = renderHook(() => useCelebrationCheck());

    await act(async () => {
      await result.current.check('user-456');
    });

    expect(mockCheckAchievements).toHaveBeenCalledWith('user-456');
  });

  it('check function returns tierChange and achievements', async () => {
    const tierChange = { previousTier: 'APPRENTICE', newTier: 'JOURNEYMAN' };
    const achievements = [{ id: 'first', name: 'First' }];
    mockCheckTierChange.mockResolvedValue(tierChange);
    mockCheckAchievements.mockResolvedValue(achievements);

    const { result } = renderHook(() => useCelebrationCheck());

    let checkResult: unknown;
    await act(async () => {
      checkResult = await result.current.check('user-789');
    });

    expect(checkResult).toEqual({ tierChange, achievements });
  });

  it('check function does nothing with empty userId', async () => {
    const { result } = renderHook(() => useCelebrationCheck());

    await act(async () => {
      await result.current.check('');
    });

    expect(mockCheckTierChange).not.toHaveBeenCalled();
    expect(mockCheckAchievements).not.toHaveBeenCalled();
  });

  it('check function calls tier check before achievement check', async () => {
    const callOrder: string[] = [];
    mockCheckTierChange.mockImplementation(async () => {
      callOrder.push('tier');
      return null;
    });
    mockCheckAchievements.mockImplementation(async () => {
      callOrder.push('achievements');
      return [];
    });

    const { result } = renderHook(() => useCelebrationCheck());

    await act(async () => {
      await result.current.check('user-order');
    });

    expect(callOrder).toEqual(['tier', 'achievements']);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('handles empty children', () => {
    render(
      <CelebrationProvider>
        <></>
      </CelebrationProvider>
    );
    expect(screen.queryByTestId('tier-promotion-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('achievement-toast')).not.toBeInTheDocument();
  });

  it('handles null children', () => {
    render(
      <CelebrationProvider>
        {null}
      </CelebrationProvider>
    );
    // Should not throw
    expect(true).toBe(true);
  });

  it('handles text node children', () => {
    render(
      <CelebrationProvider>
        Plain text content
      </CelebrationProvider>
    );
    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });
});
