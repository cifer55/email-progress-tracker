import Imap from 'node-imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import { Pool } from 'pg';
import logger from '../config/logger';
import { addEmailToQueue } from '../queues/emailQueue';
import { decrypt } from '../utils/encryption';

export interface EmailPollerConfig {
  provider: string;
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}

export interface RawEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  receivedAt: Date;
}

export class EmailPollerService {
  private pool: Pool;
  private config?: EmailPollerConfig;
  private imap: typeof Imap.prototype | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(pool: Pool, config?: EmailPollerConfig) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Load configuration from database
   * Decrypts the password before use
   */
  private async loadConfig(): Promise<EmailPollerConfig> {
    if (this.config) {
      return this.config;
    }

    const result = await this.pool.query(
      'SELECT provider, host, port, username, encrypted_password, use_tls FROM email_config WHERE id = 1'
    );

    if (result.rows.length === 0) {
      throw new Error('Email configuration not found');
    }

    const row = result.rows[0];

    // Decrypt the password
    const password = decrypt(row.encrypted_password);

    return {
      provider: row.provider,
      host: row.host,
      port: row.port,
      username: row.username,
      password,
      useTLS: row.use_tls,
    };
  }

  /**
   * Test email connection
   * Used by the test endpoint to verify credentials
   */
  async testConnection(): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const config = await this.loadConfig();

        const testImap = new Imap({
          user: config.username,
          password: config.password,
          host: config.host,
          port: config.port,
          tls: config.useTLS,
          tlsOptions: { rejectUnauthorized: false },
          connTimeout: 10000,
          authTimeout: 10000,
        });

        testImap.once('ready', () => {
          testImap.end();
          resolve(true);
        });

        testImap.once('error', (err: Error) => {
          logger.error('IMAP connection test failed', err);
          resolve(false);
        });

        testImap.connect();
      } catch (error) {
        logger.error('Error testing connection', error);
        resolve(false);
      }
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Email poller is already running');
      return;
    }

    const config = await this.loadConfig();

    logger.info('Starting email poller', {
      host: config.host,
      username: config.username,
    });

    this.isRunning = true;
    await this.poll();

    // Get polling interval from config (default 5 minutes)
    const pollingInterval = 300000; // 5 minutes

    // Set up recurring polling
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('Error in polling interval', error);
      });
    }, pollingInterval);
  }

  async stop(): Promise<void> {
    logger.info('Stopping email poller');
    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
  }

  async checkForNewEmails(): Promise<RawEmail[]> {
    return new Promise(async (resolve, reject) => {
      const emails: RawEmail[] = [];

      try {
        const config = await this.loadConfig();

        this.imap = new Imap({
          user: config.username,
          password: config.password,
          host: config.host,
          port: config.port,
          tls: config.useTLS,
          tlsOptions: { rejectUnauthorized: false },
        });
      } catch (error) {
        reject(error);
        return;
      }

      this.imap.once('ready', () => {
        this.imap!.openBox('INBOX', false, (err: Error, _box: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Search for unseen emails
          this.imap!.search(['UNSEEN'], (err: Error, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            if (results.length === 0) {
              logger.info('No new emails found');
              this.imap!.end();
              resolve(emails);
              return;
            }

            logger.info(`Found ${results.length} new emails`);

            const fetch = this.imap!.fetch(results, { bodies: '', markSeen: true });

            fetch.on('message', (msg: any, seqno: number) => {
              msg.on('body', (stream: any) => {
                simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
                  if (err) {
                    logger.error('Error parsing email', err);
                    return;
                  }

                  // Helper to extract text from AddressObject
                  const getAddressText = (addr: AddressObject | AddressObject[] | undefined): string => {
                    if (!addr) return '';
                    if (Array.isArray(addr)) {
                      return addr.map(a => a.text).join(', ');
                    }
                    return addr.text;
                  };

                  const email: RawEmail = {
                    id: parsed.messageId || `${Date.now()}-${seqno}`,
                    from: getAddressText(parsed.from),
                    to: getAddressText(parsed.to),
                    subject: parsed.subject || '',
                    body: parsed.text || '',
                    htmlBody: parsed.html || undefined,
                    receivedAt: parsed.date || new Date(),
                  };

                  emails.push(email);
                });
              });
            });

            fetch.once('error', (err: Error) => {
              logger.error('Fetch error', err);
              reject(err);
            });

            fetch.once('end', () => {
              logger.info(`Fetched ${emails.length} emails`);
              this.imap!.end();
              resolve(emails);
            });
          });
        });
      });

      this.imap.once('error', (err: Error) => {
        logger.error('IMAP connection error', err);
        reject(err);
      });

      this.imap.connect();
    });
  }

  async markAsProcessed(emailId: string): Promise<void> {
    logger.info(`Marking email as processed: ${emailId}`);
    // Email is already marked as seen during fetch
  }

  private async poll(): Promise<void> {
    try {
      logger.info('Polling for new emails');
      const emails = await this.checkForNewEmails();

      for (const email of emails) {
        await addEmailToQueue({
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          body: email.body,
          htmlBody: email.htmlBody,
          receivedAt: email.receivedAt,
        });
      }

      logger.info(`Added ${emails.length} emails to processing queue`);
    } catch (error) {
      logger.error('Error polling emails', error);
    }
  }
}
