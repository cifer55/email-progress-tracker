import dotenv from 'dotenv';
import app from './app';
import logger from './config/logger';
import pool from './config/database';
import redisClient from './config/redis';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Initialize connections
async function startServer() {
  try {
    // Test database connection
    const dbClient = await pool.connect();
    logger.info('Database connected successfully');
    dbClient.release();

    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

// Start the server
startServer();
