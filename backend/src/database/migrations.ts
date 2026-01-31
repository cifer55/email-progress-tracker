import fs from 'fs';
import path from 'path';
import pool from '../config/database';
import logger from '../config/logger';

export async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run migrations', error);
    throw error;
  }
}

export async function dropAllTables() {
  try {
    logger.warn('Dropping all tables...');
    
    await pool.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS email_config CASCADE;
      DROP TABLE IF EXISTS feature_progress CASCADE;
      DROP TABLE IF EXISTS updates CASCADE;
      DROP TABLE IF EXISTS emails CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
    `);
    
    logger.info('All tables dropped successfully');
  } catch (error) {
    logger.error('Failed to drop tables', error);
    throw error;
  }
}
