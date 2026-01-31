import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { UpdateRepository } from '../repositories/UpdateRepository';
import { FeatureProgressRepository } from '../repositories/FeatureProgressRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationService } from '../services/NotificationService';
import { NotificationTriggerService } from '../services/NotificationTriggerService';
import { ProgressStatus } from '../models/types';
import logger from '../config/logger';
import { sanitizeFeatureId, sanitizeInput, truncateString } from '../utils/sanitization';
import pool from '../config/database';

const router = Router();
const updateRepo = new UpdateRepository();
const progressRepo = new FeatureProgressRepository();
const notificationRepo = new NotificationRepository(pool);

// Initialize notification services
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
    enabled: true,
  },
};

const notificationService = new NotificationService(
  notificationRepo,
  progressRepo,
  deliveryConfig
);

const notificationTriggerService = new NotificationTriggerService(
  notificationService,
  progressRepo,
  updateRepo
);

// GET /api/progress/:featureId - Get progress for a feature
router.get('/:featureId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { featureId } = req.params;
    
    // Sanitize feature ID
    const sanitizedFeatureId = sanitizeFeatureId(featureId);
    if (!sanitizedFeatureId) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }

    const progress = await progressRepo.findByFeatureId(sanitizedFeatureId);

    if (!progress) {
      return res.status(404).json({ error: 'Feature progress not found' });
    }

    const lastUpdate = progress.last_update_id
      ? await updateRepo.findById(progress.last_update_id)
      : null;

    res.json({
      featureId: progress.feature_id,
      currentStatus: progress.current_status,
      percentComplete: progress.percent_complete,
      lastUpdate,
      updateCount: progress.update_count,
    });
  } catch (error) {
    logger.error('Failed to get feature progress', error);
    res.status(500).json({ error: 'Failed to get feature progress' });
  }
});

// GET /api/progress/:featureId/updates - Get update history
router.get('/:featureId/updates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { featureId } = req.params;
    const { startDate, endDate, limit, offset } = req.query;
    
    // Sanitize feature ID
    const sanitizedFeatureId = sanitizeFeatureId(featureId);
    if (!sanitizedFeatureId) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }

    const updates = await updateRepo.findByFeature(sanitizedFeatureId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    const total = await updateRepo.countByFeature(sanitizedFeatureId);

    res.json({
      updates,
      total,
    });
  } catch (error) {
    logger.error('Failed to get update history', error);
    res.status(500).json({ error: 'Failed to get update history' });
  }
});

// POST /api/progress/:featureId/updates - Create manual update
router.post('/:featureId/updates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { featureId } = req.params;
    const { status, percentComplete, summary, blockers, actionItems } = req.body;
    
    // Sanitize feature ID
    const sanitizedFeatureId = sanitizeFeatureId(featureId);
    if (!sanitizedFeatureId) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }
    
    // Sanitize inputs
    const sanitizedSummary = truncateString(sanitizeInput(summary || ''), 1000);
    if (!sanitizedSummary) {
      return res.status(400).json({ error: 'Summary is required' });
    }
    
    const sanitizedStatus = status ? sanitizeInput(status) as ProgressStatus : undefined;
    const sanitizedBlockers = Array.isArray(blockers) 
      ? blockers.map((b: string) => truncateString(sanitizeInput(b), 500))
      : [];
    const sanitizedActionItems = Array.isArray(actionItems)
      ? actionItems.map((a: string) => truncateString(sanitizeInput(a), 500))
      : [];

    const update = await updateRepo.create({
      feature_id: sanitizedFeatureId,
      timestamp: new Date(),
      sender: req.user!.email,
      summary: sanitizedSummary,
      status: sanitizedStatus,
      percent_complete: percentComplete,
      blockers: sanitizedBlockers,
      action_items: sanitizedActionItems,
      source: 'manual',
      created_by: req.user!.id,
    });

    // Update feature progress
    const currentProgress = await progressRepo.findByFeatureId(sanitizedFeatureId);
    const updateCount = currentProgress ? currentProgress.update_count + 1 : 1;
    const oldStatus = currentProgress?.current_status;
    const newStatus = sanitizedStatus || currentProgress?.current_status || 'not-started';

    await progressRepo.upsert({
      feature_id: sanitizedFeatureId,
      current_status: newStatus,
      percent_complete: percentComplete ?? currentProgress?.percent_complete ?? 0,
      last_update_id: update.id,
      last_update_at: update.timestamp,
      update_count: updateCount,
    });

    // Trigger notification if status changed
    if (oldStatus && sanitizedStatus && oldStatus !== newStatus) {
      await notificationTriggerService.handleStatusChange(
        sanitizedFeatureId,
        oldStatus,
        newStatus
      );
    }

    res.status(201).json(update);
  } catch (error) {
    logger.error('Failed to create update', error);
    res.status(500).json({ error: 'Failed to create update' });
  }
});

// PATCH /api/progress/:featureId/status - Update feature status
router.patch('/:featureId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { featureId } = req.params;
    const { status, reason } = req.body;
    
    // Sanitize feature ID
    const sanitizedFeatureId = sanitizeFeatureId(featureId);
    if (!sanitizedFeatureId) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }
    
    // Sanitize status
    const sanitizedStatus = sanitizeInput(status || '') as ProgressStatus;
    if (!sanitizedStatus) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Get old status for notification
    const currentProgress = await progressRepo.findByFeatureId(sanitizedFeatureId);
    const oldStatus = currentProgress?.current_status;

    await progressRepo.updateStatus(sanitizedFeatureId, sanitizedStatus);

    // Trigger notification if status changed
    if (oldStatus && oldStatus !== sanitizedStatus) {
      await notificationTriggerService.handleStatusChange(
        sanitizedFeatureId,
        oldStatus,
        sanitizedStatus
      );
    }

    // Create an update record for the status change
    if (reason) {
      const sanitizedReason = truncateString(sanitizeInput(reason), 500);
      await updateRepo.create({
        feature_id: sanitizedFeatureId,
        timestamp: new Date(),
        sender: req.user!.email,
        summary: `Status changed to ${sanitizedStatus}: ${sanitizedReason}`,
        status: sanitizedStatus,
        blockers: [],
        action_items: [],
        source: 'manual',
        created_by: req.user!.id,
      });
    }

    res.json({ success: true, status: sanitizedStatus });
  } catch (error) {
    logger.error('Failed to update status', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
