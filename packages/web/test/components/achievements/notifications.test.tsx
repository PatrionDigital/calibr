/**
 * Achievement Notifications Tests
 * Tests for notification, stack, and hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import {
  AchievementNotification,
  AchievementNotificationStack,
  useAchievementNotifications,
} from '@/components/achievements/notifications';
import type { Achievement } from '@/components/achievements/types';

// =============================================================================
// Test Fixtures
// =============================================================================

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: `achievement-${Math.random().toString(36).slice(2)}`,
  name: 'Test Achievement',
  description: 'Test description',
  category: 'STREAK',
  tier: 'BRONZE',
  unlockedAt: new Date(),
  progress: 10,
  maxProgress: 10,
  ...overrides,
});

// =============================================================================
// AchievementNotification Tests
// =============================================================================

describe('AchievementNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the notification', () => {
      render(<AchievementNotification achievement={createAchievement()} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('achievement-notification')).toBeDefined();
    });

    it('displays achievement unlocked header', () => {
      render(<AchievementNotification achievement={createAchievement()} onDismiss={vi.fn()} />);
      expect(screen.getByText('ACHIEVEMENT UNLOCKED')).toBeDefined();
    });

    it('displays achievement name', () => {
      render(<AchievementNotification achievement={createAchievement({ name: 'First Win' })} onDismiss={vi.fn()} />);
      expect(screen.getByText('First Win')).toBeDefined();
    });

    it('displays achievement description', () => {
      render(<AchievementNotification achievement={createAchievement({ description: 'You did it!' })} onDismiss={vi.fn()} />);
      expect(screen.getByText('You did it!')).toBeDefined();
    });

    it('displays tier badge', () => {
      render(<AchievementNotification achievement={createAchievement({ tier: 'GOLD' })} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('notification-tier-badge')).toBeDefined();
      expect(screen.getByText('GOLD')).toBeDefined();
    });

    it('displays category icon', () => {
      render(<AchievementNotification achievement={createAchievement({ category: 'STREAK' })} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('notification-category-icon')).toBeDefined();
      expect(screen.getByTestId('notification-category-icon').textContent).toBe('🔥');
    });

    it('displays trophy icon', () => {
      render(<AchievementNotification achievement={createAchievement()} onDismiss={vi.fn()} />);
      expect(screen.getByText('🏆')).toBeDefined();
    });

    it('renders progress bar', () => {
      render(<AchievementNotification achievement={createAchievement()} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('notification-progress-bar')).toBeDefined();
    });
  });

  describe('category icons', () => {
    it.each([
      ['STREAK', '🔥'],
      ['VOLUME', '📊'],
      ['ACCURACY', '🎯'],
      ['CALIBRATION', '⚖️'],
      ['SPECIAL', '⭐'],
    ] as const)('shows %s icon for %s category', (category, icon) => {
      render(<AchievementNotification achievement={createAchievement({ category })} onDismiss={vi.fn()} />);
      expect(screen.getByTestId('notification-category-icon').textContent).toBe(icon);
    });
  });

  describe('dismiss behavior', () => {
    it('calls onDismiss when close button clicked', () => {
      const onDismiss = vi.fn();
      render(<AchievementNotification achievement={createAchievement()} onDismiss={onDismiss} />);

      const closeButton = screen.getByTestId('notification-close-button');
      fireEvent.click(closeButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after duration', () => {
      const onDismiss = vi.fn();
      render(<AchievementNotification achievement={createAchievement()} onDismiss={onDismiss} duration={5000} />);

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('uses default duration of 5000ms', () => {
      const onDismiss = vi.fn();
      render(<AchievementNotification achievement={createAchievement()} onDismiss={onDismiss} />);

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not auto-dismiss when duration is 0', () => {
      const onDismiss = vi.fn();
      render(<AchievementNotification achievement={createAchievement()} onDismiss={onDismiss} duration={0} />);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('tier styling', () => {
    it.each([
      ['BRONZE', 'border-amber-600/50'],
      ['SILVER', 'border-gray-400/50'],
      ['GOLD', 'border-yellow-500/50'],
      ['PLATINUM', 'border-slate-300/50'],
      ['DIAMOND', 'border-cyan-400/50'],
    ] as const)('applies %s tier border color', (tier, borderClass) => {
      render(<AchievementNotification achievement={createAchievement({ tier })} onDismiss={vi.fn()} />);
      const notification = screen.getByTestId('achievement-notification');
      expect(notification.classList.contains(borderClass)).toBe(true);
    });
  });
});

// =============================================================================
// AchievementNotificationStack Tests
// =============================================================================

describe('AchievementNotificationStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders the notification stack', () => {
      render(
        <AchievementNotificationStack
          notifications={[createAchievement({ id: '1' })]}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId('notification-stack')).toBeDefined();
    });

    it('renders multiple notifications', () => {
      render(
        <AchievementNotificationStack
          notifications={[
            createAchievement({ id: '1' }),
            createAchievement({ id: '2' }),
          ]}
          onDismiss={vi.fn()}
        />
      );
      const notifications = screen.getAllByTestId('achievement-notification');
      expect(notifications).toHaveLength(2);
    });

    it('returns null when no notifications', () => {
      const { container } = render(
        <AchievementNotificationStack notifications={[]} onDismiss={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('max visible', () => {
    it('limits visible notifications to maxVisible', () => {
      render(
        <AchievementNotificationStack
          notifications={[
            createAchievement({ id: '1' }),
            createAchievement({ id: '2' }),
            createAchievement({ id: '3' }),
            createAchievement({ id: '4' }),
          ]}
          onDismiss={vi.fn()}
          maxVisible={2}
        />
      );
      const notifications = screen.getAllByTestId('achievement-notification');
      expect(notifications).toHaveLength(2);
    });

    it('defaults to 3 max visible', () => {
      render(
        <AchievementNotificationStack
          notifications={[
            createAchievement({ id: '1' }),
            createAchievement({ id: '2' }),
            createAchievement({ id: '3' }),
            createAchievement({ id: '4' }),
            createAchievement({ id: '5' }),
          ]}
          onDismiss={vi.fn()}
        />
      );
      const notifications = screen.getAllByTestId('achievement-notification');
      expect(notifications).toHaveLength(3);
    });

    it('shows overflow indicator when more than maxVisible', () => {
      render(
        <AchievementNotificationStack
          notifications={[
            createAchievement({ id: '1' }),
            createAchievement({ id: '2' }),
            createAchievement({ id: '3' }),
            createAchievement({ id: '4' }),
          ]}
          onDismiss={vi.fn()}
          maxVisible={2}
        />
      );
      expect(screen.getByTestId('notification-overflow')).toBeDefined();
      expect(screen.getByText('+2 more')).toBeDefined();
    });

    it('does not show overflow when at or below maxVisible', () => {
      render(
        <AchievementNotificationStack
          notifications={[
            createAchievement({ id: '1' }),
            createAchievement({ id: '2' }),
          ]}
          onDismiss={vi.fn()}
          maxVisible={3}
        />
      );
      expect(screen.queryByTestId('notification-overflow')).toBeNull();
    });
  });

  describe('dismiss behavior', () => {
    it('calls onDismiss with achievement id', () => {
      const onDismiss = vi.fn();
      render(
        <AchievementNotificationStack
          notifications={[createAchievement({ id: 'test-id-123' })]}
          onDismiss={onDismiss}
        />
      );

      const closeButton = screen.getByTestId('notification-close-button');
      fireEvent.click(closeButton);

      expect(onDismiss).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('duration', () => {
    it('passes duration to notifications', () => {
      const onDismiss = vi.fn();
      render(
        <AchievementNotificationStack
          notifications={[createAchievement({ id: '1' })]}
          onDismiss={onDismiss}
          duration={3000}
        />
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// useAchievementNotifications Hook Tests
// =============================================================================

describe('useAchievementNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with empty notifications', () => {
      const { result } = renderHook(() => useAchievementNotifications());
      expect(result.current.notifications).toEqual([]);
    });

    it('starts inactive', () => {
      const { result } = renderHook(() => useAchievementNotifications());
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('notify', () => {
    it('adds achievement to notifications', () => {
      const { result } = renderHook(() => useAchievementNotifications());
      const achievement = createAchievement({ id: 'test-1' });

      act(() => {
        result.current.notify(achievement);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]!.id).toBe('test-1');
    });

    it('sets isActive to true', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement());
      });

      expect(result.current.isActive).toBe(true);
    });

    it('does not add duplicate achievements', () => {
      const { result } = renderHook(() => useAchievementNotifications());
      const achievement = createAchievement({ id: 'test-1' });

      act(() => {
        result.current.notify(achievement);
        result.current.notify(achievement);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('adds multiple different achievements', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
        result.current.notify(createAchievement({ id: '2' }));
      });

      expect(result.current.notifications).toHaveLength(2);
    });
  });

  describe('dismiss', () => {
    it('removes achievement by id', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
        result.current.notify(createAchievement({ id: '2' }));
      });

      act(() => {
        result.current.dismiss('1');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]!.id).toBe('2');
    });

    it('sets isActive to false when all dismissed', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
      });

      act(() => {
        result.current.dismiss('1');
      });

      expect(result.current.isActive).toBe(false);
    });

    it('keeps isActive true when notifications remain', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
        result.current.notify(createAchievement({ id: '2' }));
      });

      act(() => {
        result.current.dismiss('1');
      });

      expect(result.current.isActive).toBe(true);
    });
  });

  describe('dismissAll', () => {
    it('removes all notifications', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
        result.current.notify(createAchievement({ id: '2' }));
      });

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.notifications).toEqual([]);
    });

    it('sets isActive to false', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
      });

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('auto-dismiss', () => {
    it('auto-dismisses after specified duration', () => {
      const { result } = renderHook(() => useAchievementNotifications(3000));

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('uses default duration of 5000ms', () => {
      const { result } = renderHook(() => useAchievementNotifications());

      act(() => {
        result.current.notify(createAchievement({ id: '1' }));
      });

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.notifications).toHaveLength(0);
    });
  });
});
