const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export type NotificationType = 'blocked' | 'delayed' | 'status_change' | 'manual_review';

export interface Notification {
  id: string;
  feature_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    recipients: string[];
  };
  inApp: {
    enabled: boolean;
  };
}

export class NotificationService {
  /**
   * Get all notifications with pagination
   */
  async getAllNotifications(limit: number = 50, offset: number = 0): Promise<{
    notifications: Notification[];
    total: number;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/notifications?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return {
      notifications: data.notifications.map(this.mapNotification),
      total: data.total,
    };
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(limit: number = 50): Promise<Notification[]> {
    const response = await fetch(`${API_BASE_URL}/notifications/unread?limit=${limit}`);

    if (!response.ok) {
      throw new Error('Failed to fetch unread notifications');
    }

    const data = await response.json();
    return data.notifications.map(this.mapNotification);
  }

  /**
   * Get notifications for a specific feature
   */
  async getFeatureNotifications(featureId: string): Promise<Notification[]> {
    const response = await fetch(`${API_BASE_URL}/notifications/feature/${featureId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch feature notifications');
    }

    const data = await response.json();
    return data.notifications.map(this.mapNotification);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications for a feature as read
   */
  async markAllAsReadForFeature(featureId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/notifications/feature/${featureId}/read-all`,
      {
        method: 'PATCH',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Map API response to Notification interface
   */
  private mapNotification(data: any): Notification {
    return {
      id: data.id,
      feature_id: data.feature_id,
      type: data.type,
      message: data.message,
      is_read: data.is_read,
      created_at: new Date(data.created_at),
    };
  }
}
