/**
 * Configuration API Routes
 * Handles email configuration endpoints
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { encrypt } from '../utils/encryption';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { EmailPollerService } from '../services/EmailPollerService';
import { sanitizeInput, sanitizeEmail, truncateString } from '../utils/sanitization';

export function createConfigRouter(pool: Pool): Router {
  const router = Router();

  /**
   * GET /api/config/email
   * Get email configuration (passwords are not returned)
   */
  router.get('/email', authenticateToken, async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, provider, host, port, username, use_tls, polling_interval, created_at, updated_at FROM email_config WHERE id = 1'
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Email configuration not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching email config:', error);
      res.status(500).json({ error: 'Failed to fetch email configuration' });
    }
  });

  /**
   * PUT /api/config/email
   * Update email configuration
   */
  router.put(
    '/email',
    authenticateToken,
    validateRequest({
      provider: { type: 'string', required: true },
      host: { type: 'string', required: true },
      port: { type: 'number', required: true },
      username: { type: 'string', required: true },
      password: { type: 'string', required: true },
      use_tls: { type: 'boolean', required: false },
      polling_interval: { type: 'number', required: false },
    }),
    async (req: Request, res: Response) => {
      try {
        const {
          provider,
          host,
          port,
          username,
          password,
          use_tls = true,
          polling_interval = 300000, // 5 minutes default
        } = req.body;
        
        // Sanitize inputs
        const sanitizedProvider = sanitizeInput(provider);
        const sanitizedHost = sanitizeInput(host);
        const sanitizedUsername = sanitizeEmail(username);
        const sanitizedPassword = truncateString(password, 1000); // Limit password length
        
        if (!sanitizedProvider || !sanitizedHost || !sanitizedUsername || !sanitizedPassword) {
          return res.status(400).json({ error: 'Invalid input parameters' });
        }

        // Encrypt the password before storing
        const encryptedPassword = encrypt(sanitizedPassword);

        // Upsert configuration (only one config row allowed)
        const result = await pool.query(
          `INSERT INTO email_config (id, provider, host, port, username, encrypted_password, use_tls, polling_interval)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) 
           DO UPDATE SET 
             provider = EXCLUDED.provider,
             host = EXCLUDED.host,
             port = EXCLUDED.port,
             username = EXCLUDED.username,
             encrypted_password = EXCLUDED.encrypted_password,
             use_tls = EXCLUDED.use_tls,
             polling_interval = EXCLUDED.polling_interval,
             updated_at = CURRENT_TIMESTAMP
           RETURNING id, provider, host, port, username, use_tls, polling_interval, created_at, updated_at`,
          [sanitizedProvider, sanitizedHost, port, sanitizedUsername, encryptedPassword, use_tls, polling_interval]
        );

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error updating email config:', error);
        res.status(500).json({ error: 'Failed to update email configuration' });
      }
    }
  );

  /**
   * POST /api/config/email/test
   * Test email connection
   */
  router.post(
    '/email/test',
    authenticateToken,
    validateRequest({
      provider: { type: 'string', required: true },
      host: { type: 'string', required: true },
      port: { type: 'number', required: true },
      username: { type: 'string', required: true },
      password: { type: 'string', required: true },
      use_tls: { type: 'boolean', required: false },
    }),
    async (req: Request, res: Response) => {
      try {
        const { provider, host, port, username, password, use_tls = true } = req.body;
        
        // Sanitize inputs
        const sanitizedProvider = sanitizeInput(provider);
        const sanitizedHost = sanitizeInput(host);
        const sanitizedUsername = sanitizeEmail(username);
        const sanitizedPassword = truncateString(password, 1000);
        
        if (!sanitizedProvider || !sanitizedHost || !sanitizedUsername || !sanitizedPassword) {
          return res.status(400).json({ success: false, error: 'Invalid input parameters' });
        }

        // Create a temporary email poller service to test connection
        const testConfig = {
          provider: sanitizedProvider,
          host: sanitizedHost,
          port,
          username: sanitizedUsername,
          password: sanitizedPassword,
          useTLS: use_tls,
        };

        const poller = new EmailPollerService(pool, testConfig);

        // Try to connect
        const success = await poller.testConnection();

        if (success) {
          res.json({ success: true, message: 'Connection successful' });
        } else {
          res.status(400).json({ success: false, error: 'Connection failed' });
        }
      } catch (error) {
        console.error('Error testing email connection:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Connection test failed',
        });
      }
    }
  );

  /**
   * GET /api/config/email/providers
   * Get list of supported email providers with default settings
   */
  router.get('/email/providers', authenticateToken, async (_req: Request, res: Response) => {
    const providers = [
      {
        name: 'Gmail',
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        use_tls: true,
        notes: 'Requires app-specific password if 2FA is enabled',
      },
      {
        name: 'Outlook',
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        use_tls: true,
        notes: 'Works with Microsoft 365 accounts',
      },
      {
        name: 'IMAP',
        provider: 'imap',
        host: '',
        port: 993,
        use_tls: true,
        notes: 'Generic IMAP configuration',
      },
      {
        name: 'POP3',
        provider: 'pop3',
        host: '',
        port: 995,
        use_tls: true,
        notes: 'Generic POP3 configuration (not recommended)',
      },
    ];

    res.json(providers);
  });

  return router;
}
