/**
 * Email API Tests
 * Tests for email management endpoints
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import request from 'supertest';
import express, { Express } from 'express';
import { authenticate } from '../middleware/auth';
import { EmailRepository } from '../repositories/EmailRepository';
import { UpdateRepository } from '../repositories/UpdateRepository';

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Set up spies on repository prototypes BEFORE importing the router
const mockFindUnmatched = jest.fn();
const mockFindById = jest.fn();
const mockMarkAsProcessed = jest.fn();
const mockDelete = jest.fn();
const mockCreate = jest.fn();

jest.spyOn(EmailRepository.prototype, 'findUnmatched').mockImplementation(mockFindUnmatched);
jest.spyOn(EmailRepository.prototype, 'findById').mockImplementation(mockFindById);
jest.spyOn(EmailRepository.prototype, 'markAsProcessed').mockImplementation(mockMarkAsProcessed);
jest.spyOn(EmailRepository.prototype, 'delete').mockImplementation(mockDelete);
jest.spyOn(UpdateRepository.prototype, 'create').mockImplementation(mockCreate);

// Import router AFTER setting up spies
import emailsRouter from './emails';

describe('Email API', () => {
  let app: Express;
  let mockAuthenticate: jest.MockedFunction<typeof authenticate>;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
    mockAuthenticate.mockImplementation((req, _res, next) => {
      (req as any).user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };
      next();
      return undefined;
    });

    // Mount router
    app.use('/api/emails', emailsRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/emails/unmatched', () => {
    it('should return unmatched emails', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from_address: 'john@example.com',
          subject: 'Feature update',
          body: 'Progress on feature X',
          html_body: '<p>Progress on feature X</p>',
          received_at: new Date('2024-01-15'),
          status: 'unmatched' as const,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
        },
        {
          id: 'email-2',
          from_address: 'jane@example.com',
          subject: 'Another update',
          body: 'More progress',
          html_body: undefined,
          received_at: new Date('2024-01-14'),
          status: 'unmatched' as const,
          created_at: new Date('2024-01-14'),
          updated_at: new Date('2024-01-14'),
        },
      ];

      mockFindUnmatched.mockResolvedValue(mockEmails);

      const response = await request(app).get('/api/emails/unmatched');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        emails: expect.arrayContaining([
          expect.objectContaining({
            id: 'email-1',
            subject: 'Feature update',
          }),
          expect.objectContaining({
            id: 'email-2',
            subject: 'Another update',
          }),
        ]),
        total: 2,
      });
      expect(mockFindUnmatched).toHaveBeenCalledWith(50, 0);
    });

    it('should support pagination', async () => {
      mockFindUnmatched.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/emails/unmatched')
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      expect(mockFindUnmatched).toHaveBeenCalledWith(10, 20);
    });

    it('should sanitize email content', async () => {
      const mockEmails = [
        {
          id: 'email-1',
          from_address: 'john@example.com',
          subject: 'Test',
          body: '<script>alert("xss")</script>Safe text',
          html_body: '<script>alert("xss")</script><p>Safe HTML</p>',
          received_at: new Date('2024-01-15'),
          status: 'unmatched' as const,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
        },
      ];

      mockFindUnmatched.mockResolvedValue(mockEmails);

      const response = await request(app).get('/api/emails/unmatched');

      expect(response.status).toBe(200);
      expect(response.body.emails[0].body).not.toContain('<script>');
      expect(response.body.emails[0].html_body).not.toContain('<script>');
    });

    it('should handle errors gracefully', async () => {
      mockFindUnmatched.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/emails/unmatched');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get unmatched emails' });
    });
  });

  describe('POST /api/emails/:emailId/link', () => {
    it('should link email to feature', async () => {
      const mockEmail = {
        id: 'email-1',
        from_address: 'john@example.com',
        subject: 'Feature update',
        body: 'Progress on feature X',
        received_at: new Date('2024-01-15'),
        status: 'unmatched' as const,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15'),
      };

      mockFindById.mockResolvedValue(mockEmail);
      mockCreate.mockResolvedValue({});
      mockMarkAsProcessed.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/emails/email-1/link')
        .send({ featureId: 'feature-123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Email linked to feature',
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          feature_id: 'feature-123',
          email_id: 'email-1',
          sender: 'john@example.com',
          summary: 'Feature update',
        })
      );
      expect(mockMarkAsProcessed).toHaveBeenCalledWith('email-1');
    });

    it('should return 404 if email not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/emails/email-999/link')
        .send({ featureId: 'feature-123' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Email not found' });
    });

    it('should return 400 if feature ID is invalid', async () => {
      const response = await request(app)
        .post('/api/emails/email-1/link')
        .send({ featureId: 'invalid<script>' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Valid feature ID is required' });
    });

    it('should return 400 if feature ID is missing', async () => {
      const response = await request(app)
        .post('/api/emails/email-1/link')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Valid feature ID is required' });
    });

    it('should handle errors gracefully', async () => {
      mockFindById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/emails/email-1/link')
        .send({ featureId: 'feature-123' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to link email' });
    });
  });

  describe('GET /api/emails/:emailId', () => {
    it('should return email details', async () => {
      const mockEmail = {
        id: 'email-1',
        from_address: 'john@example.com',
        subject: 'Feature update',
        body: 'Progress on feature X',
        html_body: '<p>Progress on feature X</p>',
        received_at: new Date('2024-01-15'),
        status: 'unmatched' as const,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15'),
      };

      mockFindById.mockResolvedValue(mockEmail);

      const response = await request(app).get('/api/emails/email-1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 'email-1',
        subject: 'Feature update',
        from_address: 'john@example.com',
      });
    });

    it('should return 404 if email not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).get('/api/emails/email-999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Email not found' });
    });

    it('should sanitize email content', async () => {
      const mockEmail = {
        id: 'email-1',
        from_address: 'john@example.com',
        subject: 'Test',
        body: '<script>alert("xss")</script>Safe text',
        html_body: '<script>alert("xss")</script><p>Safe HTML</p>',
        received_at: new Date('2024-01-15'),
        status: 'unmatched' as const,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15'),
      };

      mockFindById.mockResolvedValue(mockEmail);

      const response = await request(app).get('/api/emails/email-1');

      expect(response.status).toBe(200);
      expect(response.body.body).not.toContain('<script>');
      expect(response.body.html_body).not.toContain('<script>');
    });

    it('should handle errors gracefully', async () => {
      mockFindById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/emails/email-1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get email' });
    });
  });

  describe('DELETE /api/emails/:emailId', () => {
    it('should delete email', async () => {
      const mockEmail = {
        id: 'email-1',
        from_address: 'john@example.com',
        subject: 'Feature update',
        body: 'Progress on feature X',
        received_at: new Date('2024-01-15'),
        status: 'unmatched' as const,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15'),
      };

      mockFindById.mockResolvedValue(mockEmail);
      mockDelete.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/emails/email-1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Email deleted',
      });
      expect(mockDelete).toHaveBeenCalledWith('email-1');
    });

    it('should return 404 if email not found', async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app).delete('/api/emails/email-999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Email not found' });
    });

    it('should handle errors gracefully', async () => {
      mockFindById.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/emails/email-1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete email' });
    });
  });
});
