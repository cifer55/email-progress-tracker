import { Pool } from 'pg';
import { NotificationRecord, NotificationType } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class NotificationRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new notification
   */
  async create(
    featureId: string,
    type: NotificationType,
    message: string
  ): Promise<NotificationRecord> {
    const id = uuidv4();
    const query = `
      INSERT INTO notifications (id, feature_id, type, message, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await this.pool.query(query, [id, featureId, type, message, false]);
    return this.mapToNotificationRecord(result.rows[0]);
  }

  /**
   * Get all notifications for a feature
   */
  async getByFeatureId(featureId: string): Promise<NotificationRecord[]> {
    const query = `
      SELECT * FROM notifications
      WHERE feature_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [featureId]);
    return result.rows.map(this.mapToNotificationRecord);
  }

  /**
   * Get all unread notifications
   */
  async getUnread(limit: number = 50): Promise<NotificationRecord[]> {
    const query = `
      SELECT * FROM notifications
      WHERE is_read = false
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await this.pool.query(query, [limit]);
    return result.rows.map(this.mapToNotificationRecord);
  }

  /**
   * Get all notifications with pagination
   */
  async getAll(
    limit: number = 50,
    offset: number = 0
  ): Promise<{ notifications: NotificationRecord[]; total: number }> {
    const countQuery = 'SELECT COUNT(*) FROM notifications';
    const countResult = await this.pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM notifications
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);
    const notifications = result.rows.map(this.mapToNotificationRecord);

    return { notifications, total };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
    `;

    await this.pool.query(query, [id]);
  }

  /**
   * Mark all notifications for a feature as read
   */
  async markAllAsReadForFeature(featureId: string): Promise<void> {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE feature_id = $1 AND is_read = false
    `;

    await this.pool.query(query, [featureId]);
  }

  /**
   * Delete a notification
   */
  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  /**
   * Delete old notifications (older than specified days)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const query = `
      DELETE FROM notifications
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'
      RETURNING id
    `;

    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Check if a notification already exists for a feature and type
   */
  async exists(featureId: string, type: NotificationType): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM notifications
        WHERE feature_id = $1 AND type = $2 AND is_read = false
      ) as exists
    `;

    const result = await this.pool.query(query, [featureId, type]);
    return result.rows[0].exists;
  }

  /**
   * Map database row to NotificationRecord
   */
  private mapToNotificationRecord(row: any): NotificationRecord {
    return {
      id: row.id,
      feature_id: row.feature_id,
      type: row.type,
      message: row.message,
      is_read: row.is_read,
      created_at: row.created_at,
    };
  }
}
