import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { EmailRepository } from '../repositories/EmailRepository';
import { UpdateRepository } from '../repositories/UpdateRepository';
import logger from '../config/logger';
import { sanitizeFeatureId, sanitizeEmailContent } from '../utils/sanitization';

const router = Router();
const emailRepo = new EmailRepository();
const updateRepo = new UpdateRepository();

// GET /api/emails/unmatched - Get unmatched emails for review
router.get('/unmatched', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { limit, offset } = req.query;

    const emails = await emailRepo.findUnmatched(
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );
    
    // Sanitize email content before returning
    const sanitizedEmails = emails.map(email => ({
      ...email,
      body: sanitizeEmailContent(email.body, false),
      html_body: email.html_body ? sanitizeEmailContent(email.html_body, true) : null,
    }));

    res.json({
      emails: sanitizedEmails,
      total: sanitizedEmails.length,
    });
  } catch (error) {
    logger.error('Failed to get unmatched emails', error);
    res.status(500).json({ error: 'Failed to get unmatched emails' });
  }
});

// POST /api/emails/:emailId/link - Link email to feature
router.post('/:emailId/link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId } = req.params;
    const { featureId } = req.body;
    
    // Sanitize feature ID
    const sanitizedFeatureId = sanitizeFeatureId(featureId || '');
    if (!sanitizedFeatureId) {
      return res.status(400).json({ error: 'Valid feature ID is required' });
    }

    const email = await emailRepo.findById(emailId);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Create an update for the feature
    await updateRepo.create({
      feature_id: sanitizedFeatureId,
      email_id: emailId,
      timestamp: email.received_at,
      sender: email.from_address,
      summary: email.subject,
      blockers: [],
      action_items: [],
      source: 'email',
      created_by: req.user!.id,
    });

    // Mark email as processed
    await emailRepo.markAsProcessed(emailId);

    res.json({ success: true, message: 'Email linked to feature' });
  } catch (error) {
    logger.error('Failed to link email', error);
    res.status(500).json({ error: 'Failed to link email' });
  }
});

// GET /api/emails/:emailId - Get email details
router.get('/:emailId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId } = req.params;

    const email = await emailRepo.findById(emailId);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    
    // Sanitize email content before returning
    const sanitizedEmail = {
      ...email,
      body: sanitizeEmailContent(email.body, false),
      html_body: email.html_body ? sanitizeEmailContent(email.html_body, true) : null,
    };

    res.json(sanitizedEmail);
  } catch (error) {
    logger.error('Failed to get email', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
});

// DELETE /api/emails/:emailId - Delete email
router.delete('/:emailId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { emailId } = req.params;

    const email = await emailRepo.findById(emailId);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    await emailRepo.delete(emailId);

    res.json({ success: true, message: 'Email deleted' });
  } catch (error) {
    logger.error('Failed to delete email', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

export default router;
