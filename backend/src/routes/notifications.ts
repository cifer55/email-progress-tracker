import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { FeatureProgressRepository } from '../repositories/FeatureProgressRepository';
import { Pool } from 'pg';
import { logger } from '../config/logger';

export function createNotificationRouter(pool: Pool): Router {
  const router = Router();
  const notificationRepo = new NotificationRepository(pool);
  const featureProgressRepo = new FeatureProgressRepository(pool);

  // Default notification delivery config (can be overridden via environment variables)
  const deliveryConfig = {
    email: {
      enabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
      recipients: process.env.NOTIFICATION_EMAIL_RECIPIENTS?.split(',') || [],
      smtpConfig: process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || '',
            },
          }
        : undefined,
    },
    inApp: {
      enabled: true, // Always enabled
    },
  };

  const notificationService = new NotificationService(
    notificationRepo,
    featureProgressRepo,
    deliveryConfig
  );

  /**
   * GET /api/notifications
   * Get all notifications with pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await notificationRepo.getAll(limit, offset);

      res.json(result);
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  /**
   * GET /api/notifications/unread
   * Get all unread notifications
   */
  router.get('/unread', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notificationService.getUnreadNotifications(limit);

      res.json({ notifications, count: notifications.length });
    } catch (error) {
      logger.error('Error fetching unread notifications:', error);
      res.status(500).json({ error: 'Failed to fetch unread notifications' });
    }
  });

  /**
   * GET /api/notifications/feature/:featureId
   * Get all notifications for a specific feature
   */
  router.get('/feature/:featureId', async (req: Request, res: Response) => {
    try {
      const { featureId } = req.params;
      const notifications = await notificationService.getFeatureNotifications(featureId);

      res.json({ notifications, count: notifications.length });
    } catch (error) {
      logger.error('Error fetching feature notifications:', error);
      res.status(500).json({ error: 'Failed to fetch feature notifications' });
    }
  });

  /**
   * PATCH /api/notifications/:id/read
   * Mark a notification as read
   */
  router.patch('/:id/read', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await notificationService.markAsRead(id);

      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  /**
   * PATCH /api/notifications/feature/:featureId/read-all
   * Mark all notifications for a feature as read
   */
  router.patch('/feature/:featureId/read-all', async (req: Request, res: Response) => {
    try {
      const { featureId } = req.params;
      await notificationService.markAllAsReadForFeature(featureId);

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await notificationService.deleteNotification(id);

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  /**
   * POST /api/notifications/cleanup
   * Clean up old notifications
   */
  router.post('/cleanup', async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.body.days) || 30;
      const deletedCount = await notificationService.cleanupOldNotifications(days);

      res.json({
        success: true,
        message: `Deleted ${deletedCount} old notifications`,
        deletedCount,
      });
    } catch (error) {
      logger.error('Error cleaning up notifications:', error);
      res.status(500).json({ error: 'Failed to clean up notifications' });
    }
  });

  return router;
}
