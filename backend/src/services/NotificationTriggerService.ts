import { NotificationService } from './NotificationService';
import { FeatureProgressRepository } from '../repositories/FeatureProgressRepository';
import { UpdateRepository } from '../repositories/UpdateRepository';
import { ProgressStatus } from '../models/types';
import logger from '../config/logger';

/**
 * Service that monitors for conditions that should trigger notifications
 */
export class NotificationTriggerService {
  constructor(
    private notificationService: NotificationService,
    private featureProgressRepo: FeatureProgressRepository,
    private updateRepo: UpdateRepository
  ) {}

  /**
   * Handle status change and trigger notification if needed
   */
  async handleStatusChange(
    featureId: string,
    oldStatus: ProgressStatus,
    newStatus: ProgressStatus
  ): Promise<void> {
    try {
      // Always create a status change notification
      await this.notificationService.notifyStatusChange(featureId, oldStatus, newStatus);

      // If status changed to blocked, create a blocked notification
      if (newStatus === 'blocked') {
        await this.notificationService.notifyBlocked(featureId);
      }

      logger.info(`Notification triggered for status change: ${featureId} ${oldStatus} -> ${newStatus}`);
    } catch (error) {
      logger.error('Failed to handle status change notification:', error);
      // Don't throw - notification failure shouldn't break the update
    }
  }

  /**
   * Check for delayed features and trigger notifications
   * This should be called periodically (e.g., daily cron job)
   */
  async checkForDelayedFeatures(): Promise<void> {
    try {
      logger.info('Checking for delayed features...');

      // Get all features that are not complete
      const inProgressFeatures = await this.featureProgressRepo.findByStatus('in-progress');
      const notStartedFeatures = await this.featureProgressRepo.findByStatus('not-started');
      const allActiveFeatures = [...inProgressFeatures, ...notStartedFeatures];

      const currentDate = new Date();
      let delayedCount = 0;

      for (const feature of allActiveFeatures) {
        // Check if feature has an expected end date
        // Note: This would require integrating with the frontend feature data
        // For now, we'll check if the feature has updates indicating a deadline
        
        const updates = await this.updateRepo.findByFeature(feature.feature_id, { limit: 10 });
        
        // Look for date mentions in updates that might indicate a deadline
        for (const update of updates) {
          // Simple heuristic: look for "deadline", "due", "expected" in summary
          const summary = update.summary.toLowerCase();
          if (summary.includes('deadline') || summary.includes('due') || summary.includes('expected')) {
            // Extract date if possible (this is a simplified version)
            // In production, you'd want more sophisticated date extraction
            const dateMatch = summary.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              const expectedDate = new Date(dateMatch[0]);
              if (expectedDate < currentDate && feature.current_status !== 'complete') {
                await this.notificationService.notifyDelayed(
                  feature.feature_id,
                  expectedDate,
                  currentDate
                );
                delayedCount++;
                break; // Only notify once per feature
              }
            }
          }
        }
      }

      logger.info(`Delayed feature check complete. Found ${delayedCount} delayed features.`);
    } catch (error) {
      logger.error('Failed to check for delayed features:', error);
    }
  }

  /**
   * Trigger notification when manual review is needed
   */
  async triggerManualReviewNotification(featureId: string, reason: string): Promise<void> {
    try {
      await this.notificationService.notifyManualReview(featureId, reason);
      logger.info(`Manual review notification triggered for feature ${featureId}`);
    } catch (error) {
      logger.error('Failed to trigger manual review notification:', error);
    }
  }

  /**
   * Start periodic checks for delayed features
   * This would typically be called when the application starts
   */
  startPeriodicChecks(intervalHours: number = 24): NodeJS.Timeout {
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run immediately on start
    this.checkForDelayedFeatures();

    // Then run periodically
    const interval = setInterval(() => {
      this.checkForDelayedFeatures();
    }, intervalMs);

    logger.info(`Started periodic delayed feature checks (every ${intervalHours} hours)`);

    return interval;
  }
}
