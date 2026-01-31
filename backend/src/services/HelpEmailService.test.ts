/**
 * HelpEmailService Tests
 * Tests for automatic help email responses
 */

import { HelpEmailService, EmailConfig } from './HelpEmailService';
import * as fc from 'fast-check';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

describe('HelpEmailService', () => {
  let service: HelpEmailService;
  let mockConfig: EmailConfig;

  beforeEach(() => {
    mockConfig = {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'test-password',
      },
    };
    service = new HelpEmailService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const service = new HelpEmailService(mockConfig);
      expect(service).toBeDefined();
    });

    it('should initialize without config', () => {
      const service = new HelpEmailService();
      expect(service).toBeDefined();
    });
  });

  describe('isHelpRequest', () => {
    it('should detect "help" keyword', () => {
      expect(service.isHelpRequest('Need help with email format')).toBe(true);
      expect(service.isHelpRequest('Help me understand')).toBe(true);
      expect(service.isHelpRequest('Can you help?')).toBe(true);
    });

    it('should detect "template" keyword', () => {
      expect(service.isHelpRequest('Email template request')).toBe(true);
      expect(service.isHelpRequest('Need template')).toBe(true);
      expect(service.isHelpRequest('Template please')).toBe(true);
    });

    it('should detect "guide" keyword', () => {
      expect(service.isHelpRequest('Need a guide')).toBe(true);
      expect(service.isHelpRequest('Guide for email format')).toBe(true);
      expect(service.isHelpRequest('User guide')).toBe(true);
    });

    it('should detect "how to" keyword', () => {
      expect(service.isHelpRequest('How to format emails')).toBe(true);
      expect(service.isHelpRequest('How to send updates')).toBe(true);
    });

    it('should detect "instructions" keyword', () => {
      expect(service.isHelpRequest('Need instructions')).toBe(true);
      expect(service.isHelpRequest('Instructions please')).toBe(true);
    });

    it('should detect "format" keyword', () => {
      expect(service.isHelpRequest('Email format question')).toBe(true);
      expect(service.isHelpRequest('What format should I use?')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(service.isHelpRequest('HELP')).toBe(true);
      expect(service.isHelpRequest('Help')).toBe(true);
      expect(service.isHelpRequest('help')).toBe(true);
      expect(service.isHelpRequest('HeLp')).toBe(true);
    });

    it('should match whole words only', () => {
      expect(service.isHelpRequest('helpful')).toBe(false);
      expect(service.isHelpRequest('template')).toBe(true);
      expect(service.isHelpRequest('templates')).toBe(false);
    });

    it('should not detect non-help requests', () => {
      expect(service.isHelpRequest('Progress update')).toBe(false);
      expect(service.isHelpRequest('Feature complete')).toBe(false);
      expect(service.isHelpRequest('Status: In Progress')).toBe(false);
    });

    it('should handle empty subject', () => {
      expect(service.isHelpRequest('')).toBe(false);
    });
  });

  describe('sendHelpEmail', () => {
    it('should send help email successfully', async () => {
      const result = await service.sendHelpEmail('user@example.com', 'Need help');

      expect(result).toBe(true);
    });

    it('should handle send failure', async () => {
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail: jest.fn().mockRejectedValue(new Error('Send failed')),
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      const result = await service.sendHelpEmail('user@example.com', 'Need help');

      expect(result).toBe(false);
    });

    it('should return false when transporter not initialized', async () => {
      const service = new HelpEmailService(); // No config
      const result = await service.sendHelpEmail('user@example.com', 'Need help');

      expect(result).toBe(false);
    });

    it('should include original subject in reply', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Original Subject');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Original Subject'),
        })
      );
    });

    it('should send from configured user', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Need help');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: mockConfig.auth.user,
        })
      );
    });

    it('should send to correct recipient', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('recipient@example.com', 'Need help');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
        })
      );
    });
  });

  describe('processEmail', () => {
    it('should send help email for help requests', async () => {
      const email = {
        from: 'user@example.com',
        subject: 'Need help with format',
      };

      const result = await service.processEmail(email);

      expect(result).toBe(true);
    });

    it('should not send help email for non-help requests', async () => {
      const email = {
        from: 'user@example.com',
        subject: 'Progress update',
      };

      const result = await service.processEmail(email);

      expect(result).toBe(false);
    });

    it('should handle various help keywords', async () => {
      const helpSubjects = [
        'help',
        'template',
        'guide',
        'how to',
        'instructions',
        'format',
      ];

      for (const subject of helpSubjects) {
        const email = {
          from: 'user@example.com',
          subject: `Need ${subject}`,
        };

        const result = await service.processEmail(email);
        expect(result).toBe(true);
      }
    });
  });

  describe('testConnection', () => {
    it('should verify connection successfully', async () => {
      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when transporter not initialized', async () => {
      const service = new HelpEmailService(); // No config
      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('should handle verification failure', async () => {
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail: jest.fn(),
        verify: jest.fn().mockRejectedValue(new Error('Connection failed')),
      });

      const service = new HelpEmailService(mockConfig);
      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('generateHelpContent (via sendHelpEmail)', () => {
    it('should include email template section', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('EMAIL TEMPLATE');
      expect(emailContent).toContain('Feature:');
      expect(emailContent).toContain('Status:');
      expect(emailContent).toContain('Progress:');
    });

    it('should include feature identification methods', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('FEATURE IDENTIFICATION');
      expect(emailContent).toContain('Feature ID');
      expect(emailContent).toContain('Feature Name');
    });

    it('should include status keywords', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('STATUS KEYWORDS');
      expect(emailContent).toContain('Complete');
      expect(emailContent).toContain('In Progress');
      expect(emailContent).toContain('Blocked');
    });

    it('should include example email', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('EXAMPLE EMAIL');
    });

    it('should include tips section', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('TIPS FOR SUCCESS');
      expect(emailContent).toContain('DO:');
      expect(emailContent).toContain("DON'T:");
    });

    it('should include troubleshooting section', async () => {
      const nodemailer = require('nodemailer');
      const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
      nodemailer.createTransport.mockReturnValueOnce({
        sendMail,
        verify: jest.fn().mockResolvedValue(true),
      });

      const service = new HelpEmailService(mockConfig);
      await service.sendHelpEmail('user@example.com', 'Help');

      const emailContent = sendMail.mock.calls[0][0].text;
      expect(emailContent).toContain('TROUBLESHOOTING');
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property: isHelpRequest is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (subject) => {
          const result1 = service.isHelpRequest(subject);
          const result2 = service.isHelpRequest(subject);

          expect(result1).toBe(result2);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: isHelpRequest returns boolean', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (subject) => {
          const result = service.isHelpRequest(subject);

          expect(typeof result).toBe('boolean');
        }),
        { numRuns: 100 }
      );
    });

    it('Property: processEmail returns boolean', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            from: fc.emailAddress(),
            subject: fc.string(),
          }),
          async (email) => {
            const result = await service.processEmail(email);

            expect(typeof result).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: sendHelpEmail returns boolean', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string(),
          async (toAddress, subject) => {
            const result = await service.sendHelpEmail(toAddress, subject);

            expect(typeof result).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: help keywords are case insensitive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('help', 'template', 'guide', 'format', 'instructions'),
          fc.constantFrom('lower', 'upper', 'mixed'),
          async (keyword, caseType) => {
            let subject: string;
            if (caseType === 'lower') {
              subject = keyword.toLowerCase();
            } else if (caseType === 'upper') {
              subject = keyword.toUpperCase();
            } else {
              subject = keyword.charAt(0).toUpperCase() + keyword.slice(1);
            }

            const result = service.isHelpRequest(subject);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
