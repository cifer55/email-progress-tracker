import { Job } from 'bull';
import emailQueue from './emailQueue';
import logger from '../config/logger';
import { EmailParserService } from '../services/EmailParserService';
import { NLPProcessorService } from '../services/NLPProcessorService';
import { FeatureMatcherService } from '../services/FeatureMatcherService';
import { HelpEmailService } from '../services/HelpEmailService';

interface EmailJobData {
  emailId: string;
  from: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
}

// Initialize services
const emailParser = new EmailParserService();
const nlpProcessor = new NLPProcessorService();
const featureMatcher = new FeatureMatcherService();

// Initialize help email service (config will be loaded from environment/database)
const helpEmailConfig = process.env.SMTP_HOST ? {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
} : undefined;

const helpEmailService = new HelpEmailService(helpEmailConfig);

// Email processing worker
emailQueue.process(async (job: Job<EmailJobData>) => {
  logger.info(`Processing email job ${job.id}`, {
    emailId: job.data.emailId,
    from: job.data.from,
  });

  try {
    // Check if this is a help request
    const isHelpRequest = helpEmailService.isHelpRequest(job.data.subject);
    if (isHelpRequest) {
      logger.info(`Help request detected from ${job.data.from}`);
      await helpEmailService.sendHelpEmail(job.data.from, job.data.subject);
      
      return {
        success: true,
        emailId: job.data.emailId,
        type: 'help-request',
        helpEmailSent: true,
      };
    }

    // Step 1: Parse email content
    const parsedEmail = await emailParser.parseEmail({
      id: job.data.emailId,
      from: job.data.from,
      subject: job.data.subject,
      body: job.data.body,
      htmlBody: job.data.htmlBody,
    });

    logger.info(`Email parsed: ${parsedEmail.featureReferences.length} features found`);

    // Step 2: Extract additional insights with NLP
    const nlpResult = await nlpProcessor.processText(parsedEmail.body);
    logger.info(`NLP processing complete: sentiment=${nlpResult.sentiment}, urgency=${nlpResult.urgency}`);

    // Step 3: Match to existing features
    // Note: In a real implementation, we would fetch features from the database
    // For now, we'll just log the matches
    const mockFeatures = []; // TODO: Fetch from database
    const matches = await featureMatcher.findMatches(
      parsedEmail.featureReferences,
      mockFeatures
    );

    logger.info(`Feature matching complete: ${matches.length} matches found`);

    // Step 4: Save to database
    // TODO: Implement database operations
    // - Save email to emails table
    // - Create updates for matched features
    // - Update feature_progress table
    // - Create notifications if needed

    // Step 5: Handle unmatched emails
    if (matches.length === 0 && parsedEmail.featureReferences.length > 0) {
      logger.warn(`Email ${job.data.emailId} has no feature matches - adding to review queue`);
      // TODO: Mark email as 'unmatched' in database
    }

    logger.info(`Email processed successfully: ${job.data.emailId}`, {
      featureReferences: parsedEmail.featureReferences.length,
      matches: matches.length,
      sentiment: nlpResult.sentiment,
      urgency: nlpResult.urgency,
    });

    return {
      success: true,
      emailId: job.data.emailId,
      parsedEmail,
      nlpResult,
      matches,
    };
  } catch (error) {
    logger.error(`Failed to process email ${job.data.emailId}`, error);
    throw error;
  }
});

logger.info('Email queue worker started');

export default emailQueue;
