'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/actions/notifications';
import { Button } from './ui/button';
import type { Notification } from '@/lib/db/types';

interface NotificationDropdownProps {
  onClose: () => void;
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    task_due: '⏰',
    task_overdue: '🚨',
    task_completed: '✅',
    task_created: '📝',
    plant_needs_attention: '🌱',
  };
  return icons[type] || '📬';
}

function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-dropdown') && !target.closest('button[aria-label*="Notifications"]')) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  async function fetchNotifications() {
    setIsLoading(true);
    const result = await getUserNotifications(false); // Get all notifications
    if (result.success && result.data) {
      setNotifications(result.data);
    }
    setIsLoading(false);
  }

  async function handleMarkAsRead(notificationId: string) {
    const result = await markNotificationAsRead(notificationId);
    if (result.success) {
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n)
      );
      router.refresh();
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAllRead(true);
    const result = await markAllNotificationsAsRead();
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date() }))
      );
      router.refresh();
    }
    setIsMarkingAllRead(false);
  }

  async function handleDelete(notificationId: string) {
    const result = await deleteNotification(notificationId);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      router.refresh();
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-dropdown absolute right-0 top-12 w-96 max-h-[600px] bg-card-bg border-2 border-sage rounded-lg shadow-xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-card-bg border-b-2 border-sage p-4 flex items-center justify-between">
        <h3 className="font-semibold text-moss-dark">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="text-xs text-moss hover:text-moss-dark transition-colors"
          >
            {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-soil">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-soil">No notifications yet</p>
            <p className="text-xs text-soil mt-1">
              You'll receive notifications when tasks are due
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-sage">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 transition-colors ${
                  !notification.read ? 'bg-sage/20' : 'hover:bg-sage/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-moss-dark text-sm">
                      {notification.title}
                    </p>
                    <p className="text-xs text-soil mt-1">
                      {notification.message}
                    </p>
                    {notification.task && (
                      <Link
                        href={`/plants/${notification.task.plant.id}`}
                        className="text-xs text-moss hover:text-moss-dark mt-1 inline-block"
                        onClick={onClose}
                      >
                        View {notification.task.plant.name} →
                      </Link>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-soil">
                        {getRelativeTimeString(notification.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-moss hover:text-moss-dark"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="sticky bottom-0 bg-card-bg border-t-2 border-sage p-3 text-center">
          <button
            onClick={onClose}
            className="text-sm text-moss hover:text-moss-dark transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
