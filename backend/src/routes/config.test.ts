/**
 * Configuration API Tests
 * Tests for email configuration endpoints
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import request from 'supertest';
import express, { Express } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import { EmailPollerService } from '../services/EmailPollerService';
import * as encryption from '../utils/encryption';

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../middleware/validate', () => ({
  validateRequest: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../services/EmailPollerService');
jest.mock('../utils/encryption');

// Import router factory AFTER setting up mocks
import { createConfigRouter } from './config';

describe('Configuration API', () => {
  let app: Express;
  let mockPool: jest.Mocked<Pool>;
  let mockAuthenticate: jest.MockedFunction<typeof authenticateToken>;
  let mockEncrypt: jest.MockedFunction<typeof encryption.encrypt>;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    mockAuthenticate = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
    mockAuthenticate.mockImplementation((req, _res, next) => {
      (req as any).user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      };
      next();
      return undefined;
    });

    // Mock encryption functions
    mockEncrypt = encryption.encrypt as jest.MockedFunction<typeof encryption.encrypt>;
    mockEncrypt.mockReturnValue('encrypted-password');

    // Mock database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as any;

    // Mount router
    const configRouter = createConfigRouter(mockPool);
    app.use('/api/config', configRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/config/email', () => {
    it('should return email configuration without password', async () => {
      const mockConfig = {
        id: 1,
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        use_tls: true,
        polling_interval: 300000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockConfig] });

      const response = await request(app).get('/api/config/email');

      expect(response.status).toBe(200);
      // Use toMatchObject to handle date serialization
      expect(response.body).toMatchObject({
        id: 1,
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        use_tls: true,
        polling_interval: 300000,
      });
      expect(response.body).not.toHaveProperty('encrypted_password');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, provider, host, port, username')
      );
    });

    it('should return 404 if configuration not found', async () => {
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      const response = await request(app).get('/api/config/email');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Email configuration not found' });
    });

    it('should handle database errors', async () => {
      mockPool.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/config/email');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch email configuration' });
    });
  });

  describe('PUT /api/config/email', () => {
    it('should create/update email configuration', async () => {
      const mockConfig = {
        id: 1,
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        use_tls: true,
        polling_interval: 300000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockConfig] });

      const response = await request(app)
        .put('/api/config/email')
        .send({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
          use_tls: true,
          polling_interval: 300000,
        });

      expect(response.status).toBe(200);
      // Use toMatchObject to handle date serialization
      expect(response.body).toMatchObject({
        id: 1,
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        use_tls: true,
        polling_interval: 300000,
      });
      expect(mockEncrypt).toHaveBeenCalledWith('my-password');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO email_config'),
        expect.arrayContaining(['gmail', 'imap.gmail.com', 993, 'test@gmail.com', 'encrypted-password'])
      );
    });

    it('should use default values for optional fields', async () => {
      const mockConfig = {
        id: 1,
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        username: 'test@outlook.com',
        use_tls: true,
        polling_interval: 300000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockConfig] });

      const response = await request(app)
        .put('/api/config/email')
        .send({
          provider: 'outlook',
          host: 'outlook.office365.com',
          port: 993,
          username: 'test@outlook.com',
          password: 'my-password',
        });

      expect(response.status).toBe(200);
      // Use toMatchObject to handle date serialization
      expect(response.body).toMatchObject({
        id: 1,
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        username: 'test@outlook.com',
        use_tls: true,
        polling_interval: 300000,
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([true, 300000]) // Default use_tls and polling_interval
      );
    });

    it('should sanitize inputs', async () => {
      const mockConfig = {
        id: 1,
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        use_tls: true,
        polling_interval: 300000,
      };

      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockConfig] });

      const response = await request(app)
        .put('/api/config/email')
        .send({
          provider: '<script>gmail</script>',
          host: 'imap.gmail.com',
          port: 993,
          username: 'TEST@GMAIL.COM',
          password: 'my-password',
        });

      expect(response.status).toBe(200);
      // Verify sanitization happened (script tags removed, email lowercased)
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.not.stringContaining('<script>'),
          expect.any(String),
          expect.any(Number),
          'test@gmail.com', // Email should be lowercased
        ])
      );
    });

    it('should return 400 for invalid inputs', async () => {
      const response = await request(app)
        .put('/api/config/email')
        .send({
          provider: '',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid input parameters' });
    });

    it('should handle database errors', async () => {
      mockPool.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/config/email')
        .send({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update email configuration' });
    });
  });

  describe('POST /api/config/email/test', () => {
    it('should test email connection successfully', async () => {
      const mockPoller = {
        testConnection: jest.fn().mockResolvedValue(true),
      };

      (EmailPollerService as jest.MockedClass<typeof EmailPollerService>).mockImplementation(
        () => mockPoller as any
      );

      const response = await request(app)
        .post('/api/config/email/test')
        .send({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
          use_tls: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Connection successful',
      });
      expect(mockPoller.testConnection).toHaveBeenCalled();
    });

    it('should return 400 if connection fails', async () => {
      const mockPoller = {
        testConnection: jest.fn().mockResolvedValue(false),
      };

      (EmailPollerService as jest.MockedClass<typeof EmailPollerService>).mockImplementation(
        () => mockPoller as any
      );

      const response = await request(app)
        .post('/api/config/email/test')
        .send({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Connection failed',
      });
    });

    it('should return 400 for invalid inputs', async () => {
      const response = await request(app)
        .post('/api/config/email/test')
        .send({
          provider: '',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid input parameters',
      });
    });

    it('should handle connection errors', async () => {
      const mockPoller = {
        testConnection: jest.fn().mockRejectedValue(new Error('Connection timeout')),
      };

      (EmailPollerService as jest.MockedClass<typeof EmailPollerService>).mockImplementation(
        () => mockPoller as any
      );

      const response = await request(app)
        .post('/api/config/email/test')
        .send({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'my-password',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Connection timeout',
      });
    });
  });

  describe('GET /api/config/email/providers', () => {
    it('should return list of supported providers', async () => {
      const response = await request(app).get('/api/config/email/providers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Gmail',
            provider: 'gmail',
            host: 'imap.gmail.com',
            port: 993,
          }),
          expect.objectContaining({
            name: 'Outlook',
            provider: 'outlook',
            host: 'outlook.office365.com',
            port: 993,
          }),
          expect.objectContaining({
            name: 'IMAP',
            provider: 'imap',
          }),
          expect.objectContaining({
            name: 'POP3',
            provider: 'pop3',
          }),
        ])
      );
    });
  });
});
