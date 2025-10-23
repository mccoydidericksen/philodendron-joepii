'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUnreadNotificationCount } from '@/app/actions/notifications';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  async function fetchUnreadCount() {
    setIsLoading(true);
    const result = await getUnreadNotificationCount();
    if (result.success && result.data !== undefined) {
      setUnreadCount(result.data);
    }
    setIsLoading(false);
  }

  function handleBellClick() {
    setIsOpen(!isOpen);
  }

  function handleClose() {
    setIsOpen(false);
    // Refresh unread count when dropdown closes
    fetchUnreadCount();
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-sage/50 transition-colors"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        {/* Bell Icon */}
        <svg
          className="w-6 h-6 text-moss-dark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-terracotta rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && <NotificationDropdown onClose={handleClose} />}
    </div>
  );
}
