'use client';

import { useState, useMemo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface AchievementNotification {
  id: string;
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  type: 'unlock' | 'progress' | 'milestone';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationPreferencesConfig {
  unlocks: boolean;
  progress: boolean;
  milestones: boolean;
}

// =============================================================================
// NotificationToast Component
// =============================================================================

interface NotificationToastProps {
  notification: AchievementNotification;
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  return (
    <div
      data-testid="notification-toast"
      className={`${notification.type} border-2 bg-black font-mono p-3 flex items-center gap-3 ${
        notification.type === 'unlock'
          ? 'border-[var(--terminal-green)]'
          : notification.type === 'progress'
            ? 'border-blue-400'
            : 'border-yellow-400'
      }`}
    >
      <span className="text-2xl">{notification.achievementIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[var(--terminal-green)] font-bold text-sm">
          {notification.achievementName}
        </div>
        <div className="text-[var(--terminal-dim)] text-xs">{notification.message}</div>
      </div>
      <button
        data-testid="dismiss-toast"
        onClick={() => onDismiss(notification.id)}
        className="text-[var(--terminal-dim)] hover:text-[var(--terminal-green)] text-sm"
      >
        x
      </button>
    </div>
  );
}

// =============================================================================
// NotificationStack Component
// =============================================================================

interface NotificationStackProps {
  notifications: AchievementNotification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export function NotificationStack({ notifications, onDismiss, maxVisible }: NotificationStackProps) {
  const displayed = maxVisible ? notifications.slice(0, maxVisible) : notifications;

  return (
    <div data-testid="notification-stack" className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {displayed.map((notif) => (
        <NotificationToast key={notif.id} notification={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// =============================================================================
// NotificationHistory Component
// =============================================================================

interface NotificationHistoryProps {
  notifications: AchievementNotification[];
  onMarkRead?: (id: string) => void;
}

export function NotificationHistory({ notifications, onMarkRead }: NotificationHistoryProps) {
  return (
    <div data-testid="notification-history" className="font-mono">
      {notifications.length === 0 ? (
        <div className="text-[var(--terminal-dim)] text-sm text-center py-4">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => {
            const ts = new Date(notif.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={notif.id}
                data-testid="history-item"
                onClick={() => onMarkRead?.(notif.id)}
                className={`flex items-center gap-3 p-2 border transition-colors ${
                  notif.read
                    ? 'border-[var(--terminal-dim)]'
                    : 'unread border-[var(--terminal-green)]'
                } ${onMarkRead ? 'cursor-pointer hover:bg-[var(--terminal-green)] hover:bg-opacity-10' : ''}`}
              >
                <span className="text-sm">{notif.achievementIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[var(--terminal-green)] text-sm">
                    {notif.achievementName}
                  </div>
                  <div className="text-[var(--terminal-dim)] text-xs">{notif.message}</div>
                </div>
                <div className="text-right">
                  <div className="text-[var(--terminal-dim)] text-xs">{ts}</div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-[var(--terminal-green)] rounded-full ml-auto mt-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NotificationBell Component
// =============================================================================

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  return (
    <button
      data-testid="notification-bell"
      onClick={onClick}
      className={`relative font-mono text-[var(--terminal-green)] p-2 border border-[var(--terminal-green)] hover:bg-[var(--terminal-green)] hover:bg-opacity-20 transition-colors ${
        unreadCount > 0 ? 'has-unread' : ''
      }`}
    >
      <span className="text-lg">&#x1F514;</span>
      {unreadCount > 0 && (
        <span
          data-testid="unread-badge"
          className="absolute -top-1 -right-1 bg-[var(--terminal-green)] text-black text-xs font-bold w-5 h-5 flex items-center justify-center"
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// NotificationPreferences Component
// =============================================================================

interface NotificationPreferencesProps {
  preferences: NotificationPreferencesConfig;
  onChange: (prefs: NotificationPreferencesConfig) => void;
}

export function NotificationPreferences({ preferences, onChange }: NotificationPreferencesProps) {
  const toggles: { key: keyof NotificationPreferencesConfig; label: string }[] = [
    { key: 'unlocks', label: 'Achievement Unlocks' },
    { key: 'progress', label: 'Progress Updates' },
    { key: 'milestones', label: 'Milestone Alerts' },
  ];

  return (
    <div data-testid="notification-preferences" className="font-mono space-y-3">
      <h3 className="text-[var(--terminal-green)] font-bold">Notification Settings</h3>
      {toggles.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <span className="text-[var(--terminal-green)] text-sm">{label}</span>
          <button
            data-testid={`toggle-${key}`}
            onClick={() => onChange({ ...preferences, [key]: !preferences[key] })}
            className={`w-12 h-6 border flex items-center px-0.5 transition-colors ${
              preferences[key]
                ? 'on border-[var(--terminal-green)] bg-[var(--terminal-green)] bg-opacity-20'
                : 'off border-[var(--terminal-dim)]'
            }`}
          >
            <div
              className={`w-5 h-5 transition-all ${
                preferences[key]
                  ? 'ml-auto bg-[var(--terminal-green)]'
                  : 'bg-[var(--terminal-dim)]'
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// NotificationCenter Component
// =============================================================================

interface NotificationCenterProps {
  notifications: AchievementNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  loading?: boolean;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  loading = false,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div data-testid="notification-center" className="font-mono p-4">
        <div data-testid="loading-indicator" className="text-center py-8">
          <div className="animate-pulse text-[var(--terminal-green)]">Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="notification-center" className="font-mono p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[var(--terminal-green)] font-bold text-lg">Notifications</h2>
          <span className="text-[var(--terminal-dim)] text-sm">{unreadCount} unread</span>
        </div>
        <button
          data-testid="mark-all-read"
          onClick={onMarkAllRead}
          className="border border-[var(--terminal-green)] text-[var(--terminal-green)] px-3 py-1 text-sm hover:bg-[var(--terminal-green)] hover:text-black transition-colors"
        >
          Mark All Read
        </button>
      </div>

      <NotificationHistory notifications={notifications} onMarkRead={onMarkRead} />
    </div>
  );
}

// =============================================================================
// useAchievementNotifications Hook
// =============================================================================

interface UseAchievementNotificationsReturn {
  notifications: AchievementNotification[];
  unreadCount: number;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (notification: AchievementNotification) => void;
}

export function useAchievementNotifications(
  initial: AchievementNotification[]
): UseAchievementNotificationsReturn {
  const [notifications, setNotifications] = useState<AchievementNotification[]>(initial);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((notification: AchievementNotification) => {
    setNotifications((prev) => [notification, ...prev]);
  }, []);

  return {
    notifications,
    unreadCount,
    dismiss,
    markRead,
    markAllRead,
    addNotification,
  };
}
