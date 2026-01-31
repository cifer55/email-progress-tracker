import { NotificationRepository } from '../repositories/NotificationRepository';
import { FeatureProgressRepository } from '../repositories/FeatureProgressRepository';
import { NotificationRecord, NotificationType, ProgressStatus } from '../models/types';
import { logger } from '../config/logger';

export interface NotificationDeliveryConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  inApp: {
    enabled: boolean;
  };
}

export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository,
    private featureProgressRepo: FeatureProgressRepository,
    private deliveryConfig: NotificationDeliveryConfig
  ) {}

  /**
   * Create a notification for a blocked feature
   */
  async notifyBlocked(featureId: string, reason?: string): Promise<NotificationRecord> {
    // Check if notification already exists
    const exists = await this.notificationRepo.exists(featureId, 'blocked');
    if (exists) {
      logger.info(`Blocked notification already exists for feature ${featureId}`);
      return (await this.notificationRepo.getByFeatureId(featureId))[0];
    }

    const message = reason
      ? `Feature is blocked: ${reason}`
      : 'Feature status changed to Blocked';

    const notification = await this.notificationRepo.create(featureId, 'blocked', message);

    // Deliver notification
    await this.deliverNotification(notification);

    logger.info(`Created blocked notification for feature ${featureId}`);
    return notification;
  }

  /**
   * Create a notification for a delayed feature
   */
  async notifyDelayed(featureId: string, expectedDate: Date, currentDate: Date): Promise<NotificationRecord> {
    // Check if notification already exists
    const exists = await this.notificationRepo.exists(featureId, 'delayed');
    if (exists) {
      logger.info(`Delayed notification already exists for feature ${featureId}`);
      return (await this.notificationRepo.getByFeatureId(featureId))[0];
    }

    const daysDiff = Math.ceil((currentDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    const message = `Feature is delayed by ${daysDiff} day(s). Expected completion: ${expectedDate.toLocaleDateString()}`;

    const notification = await this.notificationRepo.create(featureId, 'delayed', message);

    // Deliver notification
    await this.deliverNotification(notification);

    logger.info(`Created delayed notification for feature ${featureId}`);
    return notification;
  }

  /**
   * Create a notification for a status change
   */
  async notifyStatusChange(
    featureId: string,
    oldStatus: ProgressStatus,
    newStatus: ProgressStatus
  ): Promise<NotificationRecord> {
    const message = `Feature status changed from ${oldStatus} to ${newStatus}`;

    const notification = await this.notificationRepo.create(featureId, 'status_change', message);

    // Deliver notification
    await this.deliverNotification(notification);

    logger.info(`Created status change notification for feature ${featureId}`);
    return notification;
  }

  /**
   * Create a notification for manual review needed
   */
  async notifyManualReview(featureId: string, reason: string): Promise<NotificationRecord> {
    const message = `Manual review needed: ${reason}`;

    const notification = await this.notificationRepo.create(featureId, 'manual_review', message);

    // Deliver notification
    await this.deliverNotification(notification);

    logger.info(`Created manual review notification for feature ${featureId}`);
    return notification;
  }

  /**
   * Check for delayed features and create notifications
   */
  async checkForDelayedFeatures(): Promise<NotificationRecord[]> {
    // This would need to integrate with the feature repository to check end dates
    // For now, this is a placeholder that would be called by a scheduled job
    logger.info('Checking for delayed features...');
    
    // TODO: Implement feature end date checking
    // 1. Get all features with end dates in the past
    // 2. Check if they are marked as complete
    // 3. Create delayed notifications for incomplete features
    
    return [];
  }

  /**
   * Get all unread notifications
   */
  async getUnreadNotifications(limit: number = 50): Promise<NotificationRecord[]> {
    return this.notificationRepo.getUnread(limit);
  }

  /**
   * Get notifications for a specific feature
   */
  async getFeatureNotifications(featureId: string): Promise<NotificationRecord[]> {
    return this.notificationRepo.getByFeatureId(featureId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepo.markAsRead(notificationId);
    logger.info(`Marked notification ${notificationId} as read`);
  }

  /**
   * Mark all notifications for a feature as read
   */
  async markAllAsReadForFeature(featureId: string): Promise<void> {
    await this.notificationRepo.markAllAsReadForFeature(featureId);
    logger.info(`Marked all notifications as read for feature ${featureId}`);
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationRepo.delete(notificationId);
    logger.info(`Deleted notification ${notificationId}`);
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(days: number = 30): Promise<number> {
    const deletedCount = await this.notificationRepo.deleteOlderThan(days);
    logger.info(`Deleted ${deletedCount} notifications older than ${days} days`);
    return deletedCount;
  }

  /**
   * Deliver notification through configured channels
   */
  private async deliverNotification(notification: NotificationRecord): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    // In-app notification (always enabled, stored in database)
    if (this.deliveryConfig.inApp.enabled) {
      // Notification is already stored in database
      logger.debug(`In-app notification created: ${notification.id}`);
    }

    // Email notification
    if (this.deliveryConfig.email?.enabled && this.deliveryConfig.email.recipients.length > 0) {
      deliveryPromises.push(this.sendEmailNotification(notification));
    }

    // Wait for all delivery methods to complete
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationRecord): Promise<void> {
    if (!this.deliveryConfig.email?.smtpConfig) {
      logger.warn('Email notification requested but SMTP config not provided');
      return;
    }

    try {
      // Import nodemailer dynamically to avoid requiring it if not used
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport(this.deliveryConfig.email.smtpConfig);

      const mailOptions = {
        from: this.deliveryConfig.email.smtpConfig.auth.user,
        to: this.deliveryConfig.email.recipients.join(', '),
        subject: `[Roadmap Alert] ${notification.type.toUpperCase()}: Feature ${notification.feature_id}`,
        text: notification.message,
        html: `
          <h2>Roadmap Notification</h2>
          <p><strong>Type:</strong> ${notification.type}</p>
          <p><strong>Feature:</strong> ${notification.feature_id}</p>
          <p><strong>Message:</strong> ${notification.message}</p>
          <p><strong>Time:</strong> ${notification.created_at.toLocaleString()}</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Email notification sent for ${notification.id}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      // Don't throw - notification is still stored in database
    }
  }
}
