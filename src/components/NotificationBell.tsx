import React, { useState, useEffect, useRef } from 'react';
import { NotificationService, Notification } from '../services/NotificationService';
import './NotificationBell.css';

interface NotificationBellProps {
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationService = new NotificationService();

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const unread = await notificationService.getUnreadNotifications(10);
      setNotifications(unread);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await notificationService.markAsRead(notification.id);
      setNotifications(notifications.filter((n) => n.id !== notification.id));
      
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      
      // Mark all as read
      await Promise.all(
        notifications.map((n) => notificationService.markAsRead(n.id))
      );
      
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'blocked':
        return '🚫';
      case 'delayed':
        return '⏰';
      case 'status_change':
        return '🔄';
      case 'manual_review':
        return '👀';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'blocked':
        return '#d32f2f';
      case 'delayed':
        return '#f57c00';
      case 'status_change':
        return '#1976d2';
      case 'manual_review':
        return '#7b1fa2';
      default:
        return '#666';
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.length;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={handleBellClick}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell-dropdown">
          <div className="notification-bell-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-bell-mark-all"
                onClick={handleMarkAllRead}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-bell-list">
            {notifications.length === 0 ? (
              <div className="notification-bell-empty">
                <span className="notification-bell-empty-icon">✓</span>
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="notification-bell-item"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="notification-bell-item-icon"
                    style={{ color: getNotificationColor(notification.type) }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-bell-item-content">
                    <div className="notification-bell-item-message">
                      {notification.message}
                    </div>
                    <div className="notification-bell-item-meta">
                      <span className="notification-bell-item-feature">
                        {notification.feature_id}
                      </span>
                      <span className="notification-bell-item-time">
                        {formatTimestamp(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
