import Bull, { Queue, Job } from 'bull';
import logger from '../config/logger';

interface EmailJobData {
  emailId: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
}

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Create email processing queue
export const emailQueue: Queue<EmailJobData> = new Bull('email-processing', redisConfig);

// Queue event handlers
emailQueue.on('completed', (job: Job<EmailJobData>) => {
  logger.info(`Email processing completed for job ${job.id}`, {
    emailId: job.data.emailId,
    from: job.data.from,
  });
});

emailQueue.on('failed', (job: Job<EmailJobData>, err: Error) => {
  logger.error(`Email processing failed for job ${job.id}`, {
    emailId: job.data.emailId,
    error: err.message,
  });
});

emailQueue.on('stalled', (job: Job<EmailJobData>) => {
  logger.warn(`Email processing stalled for job ${job.id}`, {
    emailId: job.data.emailId,
  });
});

// Add email to processing queue
export async function addEmailToQueue(emailData: EmailJobData): Promise<Job<EmailJobData>> {
  return emailQueue.add(emailData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

// Get queue statistics
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Clean old jobs
export async function cleanOldJobs() {
  await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
  await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days
  logger.info('Cleaned old jobs from queue');
}

export default emailQueue;
