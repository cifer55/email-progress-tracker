import pool from '../config/database';
import logger from '../config/logger';
import { UpdateRecord } from '../models/types';

export class UpdateRepository {
  async create(
    update: Omit<UpdateRecord, 'id' | 'created_at' | 'updated_at'>
  ): Promise<UpdateRecord> {
    const query = `
      INSERT INTO updates (
        feature_id, email_id, timestamp, sender, summary,
        status, percent_complete, blockers, action_items, source, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      update.feature_id,
      update.email_id,
      update.timestamp,
      update.sender,
      update.summary,
      update.status,
      update.percent_complete,
      update.blockers,
      update.action_items,
      update.source,
      update.created_by,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Update created for feature ${update.feature_id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create update', error);
      throw error;
    }
  }

  async findById(id: string): Promise<UpdateRecord | null> {
    const query = 'SELECT * FROM updates WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find update ${id}`, error);
      throw error;
    }
  }

  async findByFeature(
    featureId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<UpdateRecord[]> {
    let query = 'SELECT * FROM updates WHERE feature_id = $1';
    const values: any[] = [featureId];
    let paramIndex = 2;

    if (options?.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(options.endDate);
      paramIndex++;
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(options.limit);
      paramIndex++;
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(options.offset);
    }

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to find updates for feature ${featureId}`, error);
      throw error;
    }
  }

  async getLatestForFeature(featureId: string): Promise<UpdateRecord | null> {
    const query = `
      SELECT * FROM updates
      WHERE feature_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [featureId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to get latest update for feature ${featureId}`, error);
      throw error;
    }
  }

  async countByFeature(featureId: string): Promise<number> {
    const query = 'SELECT COUNT(*) FROM updates WHERE feature_id = $1';

    try {
      const result = await pool.query(query, [featureId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Failed to count updates for feature ${featureId}`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM updates WHERE id = $1';

    try {
      await pool.query(query, [id]);
      logger.info(`Update ${id} deleted`);
    } catch (error) {
      logger.error(`Failed to delete update ${id}`, error);
      throw error;
    }
  }

  async update(
    id: string,
    updates: Partial<Pick<UpdateRecord, 'summary' | 'status' | 'percent_complete' | 'blockers' | 'action_items'>>
  ): Promise<UpdateRecord> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.summary !== undefined) {
      fields.push(`summary = $${paramIndex}`);
      values.push(updates.summary);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.percent_complete !== undefined) {
      fields.push(`percent_complete = $${paramIndex}`);
      values.push(updates.percent_complete);
      paramIndex++;
    }

    if (updates.blockers !== undefined) {
      fields.push(`blockers = $${paramIndex}`);
      values.push(updates.blockers);
      paramIndex++;
    }

    if (updates.action_items !== undefined) {
      fields.push(`action_items = $${paramIndex}`);
      values.push(updates.action_items);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE updates
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      logger.info(`Update ${id} modified`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to update ${id}`, error);
      throw error;
    }
  }
}
