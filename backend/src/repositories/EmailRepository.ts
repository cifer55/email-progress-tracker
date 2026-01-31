import pool from '../config/database';
import logger from '../config/logger';
import { EmailRecord, EmailStatus } from '../models/types';

export class EmailRepository {
  async create(email: Omit<EmailRecord, 'id' | 'created_at' | 'updated_at'>): Promise<EmailRecord> {
    const query = `
      INSERT INTO emails (from_address, subject, body, html_body, received_at, processed_at, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      email.from_address,
      email.subject,
      email.body,
      email.html_body,
      email.received_at,
      email.processed_at,
      email.status,
      email.error_message,
    ];

    try {
      const result = await pool.query(query, values);
      logger.info(`Email created: ${result.rows[0].id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create email', error);
      throw error;
    }
  }

  async findById(id: string): Promise<EmailRecord | null> {
    const query = 'SELECT * FROM emails WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Failed to find email ${id}`, error);
      throw error;
    }
  }

  async findUnmatched(limit = 50, offset = 0): Promise<EmailRecord[]> {
    const query = `
      SELECT * FROM emails
      WHERE status = 'unmatched'
      ORDER BY received_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find unmatched emails', error);
      throw error;
    }
  }

  async findByFeature(featureId: string): Promise<EmailRecord[]> {
    const query = `
      SELECT DISTINCT e.*
      FROM emails e
      INNER JOIN updates u ON e.id = u.email_id
      WHERE u.feature_id = $1
      ORDER BY e.received_at DESC
    `;

    try {
      const result = await pool.query(query, [featureId]);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to find emails for feature ${featureId}`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: EmailStatus, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE emails
      SET status = $1, error_message = $2, processed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    try {
      await pool.query(query, [status, errorMessage, id]);
      logger.info(`Email ${id} status updated to ${status}`);
    } catch (error) {
      logger.error(`Failed to update email ${id} status`, error);
      throw error;
    }
  }

  async markAsProcessed(id: string): Promise<void> {
    await this.updateStatus(id, 'processed');
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM emails WHERE id = $1';

    try {
      await pool.query(query, [id]);
      logger.info(`Email ${id} deleted`);
    } catch (error) {
      logger.error(`Failed to delete email ${id}`, error);
      throw error;
    }
  }

  async findRecent(limit = 100): Promise<EmailRecord[]> {
    const query = `
      SELECT * FROM emails
      ORDER BY received_at DESC
      LIMIT $1
    `;

    try {
      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find recent emails', error);
      throw error;
    }
  }
}
