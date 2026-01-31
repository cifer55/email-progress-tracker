import pool from '../config/database';
import logger from '../config/logger';
import { FeatureProgressRecord, ProgressStatus } from '../models/types';

export class FeatureProgressRepository {
  async create(progress: Omit<FeatureProgressRecord, 'created_at' | 'updated_at'>): Promise<FeatureProgressRecord> {
    const query = `
      INSERT INTO feature_progress (
        feature_id, current_status, percent_complete,
        last_update_id, last_update_at, update_count
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      progress.feature_id,
      progress.current_status,
      progress.percent_complete,
      progress.last_update_id,
      progress.last_update_at,
      progress.update_count,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Feature progress created for ${progress.feature_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create feature progress', error);
      throw error;
    }
  }

  async findByFeatureId(featureId: string): Promise<FeatureProgressRecord | null> {
    const query = 'SELECT * FROM feature_progress WHERE feature_id = $1';

    try {
      const result = await pool.query(query, [featureId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find progress for feature ${featureId}`, error);
      throw error;
    }
  }

  async upsert(progress: Omit<FeatureProgressRecord, 'created_at' | 'updated_at'>): Promise<FeatureProgressRecord> {
    const query = `
      INSERT INTO feature_progress (
        feature_id, current_status, percent_complete,
        last_update_id, last_update_at, update_count
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (feature_id)
      DO UPDATE SET
        current_status = EXCLUDED.current_status,
        percent_complete = EXCLUDED.percent_complete,
        last_update_id = EXCLUDED.last_update_id,
        last_update_at = EXCLUDED.last_update_at,
        update_count = EXCLUDED.update_count
      RETURNING *
    `;

    const values = [
      progress.feature_id,
      progress.current_status,
      progress.percent_complete,
      progress.last_update_id,
      progress.last_update_at,
      progress.update_count,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Feature progress upserted for ${progress.feature_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to upsert feature progress', error);
      throw error;
    }
  }

  async updateStatus(featureId: string, status: ProgressStatus): Promise<void> {
    const query = `
      UPDATE feature_progress
      SET current_status = $1
      WHERE feature_id = $2
    `;

    try {
      await pool.query(query, [status, featureId]);
      logger.info(`Feature ${featureId} status updated to ${status}`);
    } catch (error) {
      logger.error(`Failed to update status for feature ${featureId}`, error);
      throw error;
    }
  }

  async incrementUpdateCount(featureId: string): Promise<void> {
    const query = `
      UPDATE feature_progress
      SET update_count = update_count + 1
      WHERE feature_id = $1
    `;

    try {
      await pool.query(query, [featureId]);
    } catch (error) {
      logger.error(`Failed to increment update count for feature ${featureId}`, error);
      throw error;
    }
  }

  async findByStatus(status: ProgressStatus): Promise<FeatureProgressRecord[]> {
    const query = `
      SELECT * FROM feature_progress
      WHERE current_status = $1
      ORDER BY last_update_at DESC
    `;

    try {
      const result = await pool.query(query, [status]);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to find features with status ${status}`, error);
      throw error;
    }
  }

  async findAll(limit = 100, offset = 0): Promise<FeatureProgressRecord[]> {
    const query = `
      SELECT * FROM feature_progress
      ORDER BY last_update_at DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find all feature progress', error);
      throw error;
    }
  }

  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<ProgressStatus, number>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        current_status,
        COUNT(*) as count
      FROM feature_progress
      GROUP BY current_status
    `;

    try {
      const result = await pool.query(query);
      const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const byStatus: Record<string, number> = {};

      result.rows.forEach((row) => {
        byStatus[row.current_status] = parseInt(row.count);
      });

      return { total, byStatus: byStatus as Record<ProgressStatus, number> };
    } catch (error) {
      logger.error('Failed to get feature progress statistics', error);
      throw error;
    }
  }
}
