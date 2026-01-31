import dotenv from 'dotenv';
import { runMigrations, dropAllTables } from '../database/migrations';
import pool from '../config/database';
import logger from '../config/logger';

dotenv.config();

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'up':
        await runMigrations();
        break;
      case 'down':
        await dropAllTables();
        break;
      case 'reset':
        await dropAllTables();
        await runMigrations();
        break;
      default:
        logger.error('Unknown command. Use: up, down, or reset');
        process.exit(1);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    await pool.end();
    process.exit(1);
  }
}

main();
