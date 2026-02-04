/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type {
  AchievementNotification,
} from '../../src/components/achievement-notifications';
import {
  NotificationToast,
  NotificationStack,
  NotificationHistory,
  NotificationBell,
  NotificationPreferences,
  NotificationCenter,
  useAchievementNotifications,
} from '../../src/components/achievement-notifications';

// =============================================================================
// Test Data
// =============================================================================

const mockNotifications: AchievementNotification[] = [
  {
    id: 'notif-1',
    achievementId: 'streak-7',
    achievementName: '7 Day Streak',
    achievementIcon: '🔥',
    type: 'unlock',
    message: 'You earned the 7 Day Streak badge!',
    timestamp: '2025-01-10T12:00:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    achievementId: 'forecasts-10',
    achievementName: 'Getting Started',
    achievementIcon: '📊',
    type: 'unlock',
    message: 'You earned the Getting Started badge!',
    timestamp: '2025-01-08T10:00:00Z',
    read: true,
  },
  {
    id: 'notif-3',
    achievementId: 'accuracy-80',
    achievementName: 'Sharp Shooter',
    achievementIcon: '🎯',
    type: 'progress',
    message: '90% progress towards Sharp Shooter',
    timestamp: '2025-01-12T09:00:00Z',
    read: false,
  },
  {
    id: 'notif-4',
    achievementId: 'streak-30',
    achievementName: '30 Day Streak',
    achievementIcon: '🔥',
    type: 'milestone',
    message: 'Halfway to 30 Day Streak!',
    timestamp: '2025-01-11T08:00:00Z',
    read: true,
  },
];

// =============================================================================
// NotificationToast Tests
// =============================================================================

describe('NotificationToast', () => {
  it('renders toast', () => {
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={() => {}} />
    );
    expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
  });

  it('shows achievement name', () => {
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={() => {}} />
    );
    expect(screen.getByText('7 Day Streak')).toBeInTheDocument();
  });

  it('shows message', () => {
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={() => {}} />
    );
    expect(screen.getByText(/earned/i)).toBeInTheDocument();
  });

  it('shows icon', () => {
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={() => {}} />
    );
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('calls onDismiss when clicked', () => {
    const onDismiss = vi.fn();
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={onDismiss} />
    );
    fireEvent.click(screen.getByTestId('dismiss-toast'));
    expect(onDismiss).toHaveBeenCalledWith('notif-1');
  });

  it('shows unlock type styling', () => {
    render(
      <NotificationToast notification={mockNotifications[0]!} onDismiss={() => {}} />
    );
    const toast = screen.getByTestId('notification-toast');
    expect(toast.className).toContain('unlock');
  });

  it('shows progress type styling', () => {
    render(
      <NotificationToast notification={mockNotifications[2]!} onDismiss={() => {}} />
    );
    const toast = screen.getByTestId('notification-toast');
    expect(toast.className).toContain('progress');
  });
});

// =============================================================================
// NotificationStack Tests
// =============================================================================

describe('NotificationStack', () => {
  it('renders stack', () => {
    render(
      <NotificationStack notifications={mockNotifications} onDismiss={() => {}} />
    );
    expect(screen.getByTestId('notification-stack')).toBeInTheDocument();
  });

  it('shows all notifications', () => {
    render(
      <NotificationStack notifications={mockNotifications} onDismiss={() => {}} />
    );
    const toasts = screen.getAllByTestId('notification-toast');
    expect(toasts.length).toBe(4);
  });

  it('limits displayed notifications', () => {
    render(
      <NotificationStack notifications={mockNotifications} onDismiss={() => {}} maxVisible={2} />
    );
    const toasts = screen.getAllByTestId('notification-toast');
    expect(toasts.length).toBe(2);
  });

  it('shows empty state', () => {
    render(
      <NotificationStack notifications={[]} onDismiss={() => {}} />
    );
    expect(screen.queryByTestId('notification-toast')).not.toBeInTheDocument();
  });

  it('calls onDismiss with notification id', () => {
    const onDismiss = vi.fn();
    render(
      <NotificationStack notifications={mockNotifications} onDismiss={onDismiss} />
    );
    const buttons = screen.getAllByTestId('dismiss-toast');
    fireEvent.click(buttons[0]!);
    expect(onDismiss).toHaveBeenCalledWith('notif-1');
  });
});

// =============================================================================
// NotificationHistory Tests
// =============================================================================

describe('NotificationHistory', () => {
  it('renders history', () => {
    render(<NotificationHistory notifications={mockNotifications} />);
    expect(screen.getByTestId('notification-history')).toBeInTheDocument();
  });

  it('shows all notifications', () => {
    render(<NotificationHistory notifications={mockNotifications} />);
    const items = screen.getAllByTestId('history-item');
    expect(items.length).toBe(4);
  });

  it('shows notification messages', () => {
    render(<NotificationHistory notifications={mockNotifications} />);
    expect(screen.getAllByText(/7 Day Streak/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Getting Started/).length).toBeGreaterThan(0);
  });

  it('shows empty state', () => {
    render(<NotificationHistory notifications={[]} />);
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  it('marks unread notifications', () => {
    render(<NotificationHistory notifications={mockNotifications} />);
    const items = screen.getAllByTestId('history-item');
    const unread = items.filter((el) => el.classList.contains('unread'));
    expect(unread.length).toBe(2);
  });

  it('shows timestamp', () => {
    render(<NotificationHistory notifications={mockNotifications} />);
    expect(screen.getAllByText(/jan/i).length).toBeGreaterThan(0);
  });

  it('calls onMarkRead when clicked', () => {
    const onMarkRead = vi.fn();
    render(<NotificationHistory notifications={mockNotifications} onMarkRead={onMarkRead} />);
    const items = screen.getAllByTestId('history-item');
    fireEvent.click(items[0]!);
    expect(onMarkRead).toHaveBeenCalledWith('notif-1');
  });
});

// =============================================================================
// NotificationBell Tests
// =============================================================================

describe('NotificationBell', () => {
  it('renders bell', () => {
    render(<NotificationBell unreadCount={3} onClick={() => {}} />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('shows unread count', () => {
    render(<NotificationBell unreadCount={3} onClick={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('hides count when zero', () => {
    render(<NotificationBell unreadCount={0} onClick={() => {}} />);
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('calls onClick', () => {
    const onClick = vi.fn();
    render(<NotificationBell unreadCount={2} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('notification-bell'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows active state', () => {
    render(<NotificationBell unreadCount={5} onClick={() => {}} />);
    const bell = screen.getByTestId('notification-bell');
    expect(bell.className).toContain('has-unread');
  });
});

// =============================================================================
// NotificationPreferences Tests
// =============================================================================

describe('NotificationPreferences', () => {
  const defaultPrefs = {
    unlocks: true,
    progress: true,
    milestones: true,
  };

  it('renders preferences', () => {
    render(<NotificationPreferences preferences={defaultPrefs} onChange={() => {}} />);
    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
  });

  it('shows toggle for unlocks', () => {
    render(<NotificationPreferences preferences={defaultPrefs} onChange={() => {}} />);
    expect(screen.getAllByText(/unlock/i).length).toBeGreaterThan(0);
  });

  it('shows toggle for progress', () => {
    render(<NotificationPreferences preferences={defaultPrefs} onChange={() => {}} />);
    expect(screen.getAllByText(/progress/i).length).toBeGreaterThan(0);
  });

  it('shows toggle for milestones', () => {
    render(<NotificationPreferences preferences={defaultPrefs} onChange={() => {}} />);
    expect(screen.getAllByText(/milestone/i).length).toBeGreaterThan(0);
  });

  it('calls onChange when toggled', () => {
    const onChange = vi.fn();
    render(<NotificationPreferences preferences={defaultPrefs} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('toggle-unlocks'));
    expect(onChange).toHaveBeenCalledWith({ ...defaultPrefs, unlocks: false });
  });

  it('reflects disabled state', () => {
    const prefs = { unlocks: false, progress: true, milestones: true };
    render(<NotificationPreferences preferences={prefs} onChange={() => {}} />);
    const toggle = screen.getByTestId('toggle-unlocks');
    expect(toggle.className).toContain('off');
  });
});

// =============================================================================
// NotificationCenter Tests
// =============================================================================

describe('NotificationCenter', () => {
  it('renders center', () => {
    render(<NotificationCenter notifications={mockNotifications} />);
    expect(screen.getByTestId('notification-center')).toBeInTheDocument();
  });

  it('shows notification history', () => {
    render(<NotificationCenter notifications={mockNotifications} />);
    expect(screen.getByTestId('notification-history')).toBeInTheDocument();
  });

  it('shows title', () => {
    render(<NotificationCenter notifications={mockNotifications} />);
    expect(screen.getAllByText(/notification/i).length).toBeGreaterThan(0);
  });

  it('shows unread count', () => {
    render(<NotificationCenter notifications={mockNotifications} />);
    const center = screen.getByTestId('notification-center');
    expect(center).toHaveTextContent('2 unread');
  });

  it('shows mark all read button', () => {
    render(<NotificationCenter notifications={mockNotifications} />);
    expect(screen.getByTestId('mark-all-read')).toBeInTheDocument();
  });

  it('calls onMarkAllRead', () => {
    const onMarkAllRead = vi.fn();
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAllRead={onMarkAllRead}
      />
    );
    fireEvent.click(screen.getByTestId('mark-all-read'));
    expect(onMarkAllRead).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<NotificationCenter notifications={[]} loading={true} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

// =============================================================================
// useAchievementNotifications Hook Tests
// =============================================================================

describe('useAchievementNotifications', () => {
  function TestComponent({
    initial,
  }: {
    initial: AchievementNotification[];
  }) {
    const {
      notifications,
      unreadCount,
      dismiss,
      markRead,
      markAllRead,
      addNotification,
    } = useAchievementNotifications(initial);

    return (
      <div>
        <span data-testid="notif-count">{notifications.length}</span>
        <span data-testid="unread-count">{unreadCount}</span>
        <button onClick={() => dismiss('notif-1')}>Dismiss</button>
        <button onClick={() => markRead('notif-1')}>Mark Read</button>
        <button onClick={markAllRead}>Mark All Read</button>
        <button
          onClick={() =>
            addNotification({
              id: 'notif-new',
              achievementId: 'streak-100',
              achievementName: '100 Day Streak',
              achievementIcon: '💪',
              type: 'unlock',
              message: 'You earned the 100 Day Streak badge!',
              timestamp: new Date().toISOString(),
              read: false,
            })
          }
        >
          Add
        </button>
      </div>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with notifications', () => {
    render(<TestComponent initial={mockNotifications} />);
    expect(screen.getByTestId('notif-count')).toHaveTextContent('4');
  });

  it('calculates unread count', () => {
    render(<TestComponent initial={mockNotifications} />);
    expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
  });

  it('dismisses notification', () => {
    render(<TestComponent initial={mockNotifications} />);
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.getByTestId('notif-count')).toHaveTextContent('3');
  });

  it('marks notification as read', () => {
    render(<TestComponent initial={mockNotifications} />);
    fireEvent.click(screen.getByText('Mark Read'));
    expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
  });

  it('marks all as read', () => {
    render(<TestComponent initial={mockNotifications} />);
    fireEvent.click(screen.getByText('Mark All Read'));
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
  });

  it('adds notification', () => {
    render(<TestComponent initial={mockNotifications} />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('notif-count')).toHaveTextContent('5');
    expect(screen.getByTestId('unread-count')).toHaveTextContent('3');
  });
});
