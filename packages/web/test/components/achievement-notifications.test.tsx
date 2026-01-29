/**
 * Achievement Notifications Tests
 * TDD tests for achievement notification system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AchievementNotification,
  AchievementNotificationStack,
  useAchievementNotifications,
} from '@/components/achievements/notifications';
import type { Achievement } from '@/components/achievements';

// =============================================================================
// Test Data
// =============================================================================

const mockAchievement: Achievement = {
  id: 'STREAK_7',
  name: 'Week Warrior',
  description: 'Made forecasts for 7 consecutive days',
  category: 'STREAK',
  tier: 'BRONZE',
  unlockedAt: new Date('2024-01-15'),
  progress: 7,
  maxProgress: 7,
};

const mockGoldAchievement: Achievement = {
  id: 'FORECASTS_100',
  name: 'Century Forecaster',
  description: 'Make 100 forecasts',
  category: 'VOLUME',
  tier: 'GOLD',
  unlockedAt: new Date('2024-01-20'),
  progress: 100,
  maxProgress: 100,
};

const mockDiamondAchievement: Achievement = {
  id: 'BRIER_ELITE',
  name: 'Elite Forecaster',
  description: 'Achieve a Brier score below 0.10',
  category: 'ACCURACY',
  tier: 'DIAMOND',
  unlockedAt: new Date('2024-01-25'),
  progress: 1,
  maxProgress: 1,
};

// =============================================================================
// AchievementNotification Component Tests
// =============================================================================

describe('AchievementNotification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render notification with achievement name', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
  });

  it('should render notification with achievement description', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText('Made forecasts for 7 consecutive days')).toBeInTheDocument();
  });

  it('should show "ACHIEVEMENT UNLOCKED" header', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByText(/ACHIEVEMENT UNLOCKED/i)).toBeInTheDocument();
  });

  it('should display category icon', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByTestId('notification-category-icon')).toHaveTextContent('🔥');
  });

  it('should display tier badge', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByTestId('notification-tier-badge')).toHaveTextContent('BRONZE');
  });

  it('should apply tier-specific styling for GOLD', () => {
    render(
      <AchievementNotification
        achievement={mockGoldAchievement}
        onDismiss={() => {}}
      />
    );
    const badge = screen.getByTestId('notification-tier-badge');
    expect(badge).toHaveTextContent('GOLD');
  });

  it('should apply tier-specific styling for DIAMOND', () => {
    render(
      <AchievementNotification
        achievement={mockDiamondAchievement}
        onDismiss={() => {}}
      />
    );
    const badge = screen.getByTestId('notification-tier-badge');
    expect(badge).toHaveTextContent('DIAMOND');
  });

  it('should call onDismiss when close button clicked', () => {
    const onDismiss = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={onDismiss}
      />
    );
    const closeButton = screen.getByTestId('notification-close-button');
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should auto-dismiss after specified duration', () => {
    const onDismiss = vi.fn();
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={onDismiss}
        duration={3000}
      />
    );
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should show progress bar that decreases over time', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
        duration={5000}
      />
    );
    expect(screen.getByTestId('notification-progress-bar')).toBeInTheDocument();
  });

  it('should have data-testid for notification container', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByTestId('achievement-notification')).toBeInTheDocument();
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

  it('should render no notifications when queue is empty', () => {
    render(<AchievementNotificationStack notifications={[]} onDismiss={() => {}} />);
    expect(screen.queryByTestId('achievement-notification')).not.toBeInTheDocument();
  });

  it('should render single notification', () => {
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement]}
        onDismiss={() => {}}
      />
    );
    expect(screen.getByTestId('achievement-notification')).toBeInTheDocument();
  });

  it('should render multiple notifications stacked', () => {
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement, mockGoldAchievement]}
        onDismiss={() => {}}
      />
    );
    const notifications = screen.getAllByTestId('achievement-notification');
    expect(notifications).toHaveLength(2);
  });

  it('should limit visible notifications to maxVisible', () => {
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement, mockGoldAchievement, mockDiamondAchievement]}
        onDismiss={() => {}}
        maxVisible={2}
      />
    );
    const notifications = screen.getAllByTestId('achievement-notification');
    expect(notifications).toHaveLength(2);
  });

  it('should show overflow indicator when more notifications than maxVisible', () => {
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement, mockGoldAchievement, mockDiamondAchievement]}
        onDismiss={() => {}}
        maxVisible={2}
      />
    );
    expect(screen.getByTestId('notification-overflow')).toBeInTheDocument();
    expect(screen.getByTestId('notification-overflow')).toHaveTextContent('+1');
  });

  it('should call onDismiss with achievement id when notification dismissed', () => {
    const onDismiss = vi.fn();
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement]}
        onDismiss={onDismiss}
      />
    );
    const closeButton = screen.getByTestId('notification-close-button');
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledWith('STREAK_7');
  });

  it('should have fixed position in bottom-right corner', () => {
    render(
      <AchievementNotificationStack
        notifications={[mockAchievement]}
        onDismiss={() => {}}
      />
    );
    const stack = screen.getByTestId('notification-stack');
    expect(stack).toHaveClass('fixed');
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

  function TestComponent() {
    const { notifications, notify, dismiss, dismissAll, isActive } = useAchievementNotifications();

    return (
      <div>
        <div data-testid="notification-count">{notifications.length}</div>
        <div data-testid="is-active">{isActive ? 'true' : 'false'}</div>
        <button onClick={() => notify(mockAchievement)}>Notify</button>
        <button onClick={() => notify(mockGoldAchievement)}>Notify Gold</button>
        <button onClick={() => dismiss(mockAchievement.id)}>Dismiss</button>
        <button onClick={() => dismissAll()}>Dismiss All</button>
        <AchievementNotificationStack notifications={notifications} onDismiss={dismiss} />
      </div>
    );
  }

  it('should start with empty notifications', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('should add notification when notify called', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('should set isActive to true when notifications exist', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    expect(screen.getByTestId('is-active')).toHaveTextContent('true');
  });

  it('should add multiple notifications to queue', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    fireEvent.click(screen.getByText('Notify Gold'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
  });

  it('should remove notification when dismiss called', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('should remove all notifications when dismissAll called', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    fireEvent.click(screen.getByText('Notify Gold'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('Dismiss All'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('should not add duplicate notifications', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    fireEvent.click(screen.getByText('Notify'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('should auto-dismiss notifications after timeout', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Notify'));
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });
});
