/**
 * EmailConfigService Tests
 * Unit tests for the EmailConfigService frontend service
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailConfigService, EmailConfig, EmailConfigUpdate, TestConnectionResponse } from './EmailConfigService';

// Mock fetch globally
global.fetch = vi.fn();

describe('EmailConfigService', () => {
  let service: EmailConfigService;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new EmailConfigService('http://test-api.com');
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should use default base URL if not provided', () => {
      const defaultService = new EmailConfigService();
      expect(defaultService).toBeDefined();
    });

    it('should use provided base URL', () => {
      const customService = new EmailConfigService('http://custom.com');
      expect(customService).toBeDefined();
    });
  });

  describe('setAuthToken', () => {
    it('should set authentication token', () => {
      service.setAuthToken('test-token');
      // Token is private, but we can verify it's used in requests
      expect(service).toBeDefined();
    });
  });

  describe('getEmailConfig', () => {
    it('should fetch email configuration successfully', async () => {
      const mockConfig: EmailConfig = {
        id: 'config-1',
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        ssl: true,
        pollInterval: 300000,
        enabled: true,
        lastPollTime: new Date('2024-01-15T10:00:00Z'),
        lastPollStatus: 'success',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockConfig,
          lastPollTime: mockConfig.lastPollTime?.toISOString(),
        }),
      } as Response);

      const result = await service.getEmailConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/config/email',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.provider).toBe('gmail');
      expect(result.lastPollTime).toBeInstanceOf(Date);
    });

    it('should include auth token in headers when set', async () => {
      service.setAuthToken('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'config-1',
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          ssl: true,
          pollInterval: 300000,
          enabled: true,
        }),
      } as Response);

      await service.getEmailConfig();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle configuration not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(service.getEmailConfig()).rejects.toThrow(
        'Failed to get email config: Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getEmailConfig()).rejects.toThrow('Network error');
    });

    it('should handle config without lastPollTime', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'config-1',
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          ssl: true,
          pollInterval: 300000,
          enabled: true,
        }),
      } as Response);

      const result = await service.getEmailConfig();

      expect(result.lastPollTime).toBeUndefined();
    });
  });

  describe('updateEmailConfig', () => {
    it('should update email configuration successfully', async () => {
      const configUpdate: EmailConfigUpdate = {
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        username: 'test@outlook.com',
        password: 'new-password',
        ssl: true,
        pollInterval: 600000,
        enabled: true,
      };

      const mockResponse: EmailConfig = {
        id: 'config-1',
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        username: 'test@outlook.com',
        ssl: true,
        pollInterval: 600000,
        enabled: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.updateEmailConfig(configUpdate);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/config/email',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(configUpdate),
        })
      );
      expect(result.provider).toBe('outlook');
      expect(result.username).toBe('test@outlook.com');
    });

    it('should update partial configuration', async () => {
      const configUpdate: EmailConfigUpdate = {
        pollInterval: 900000,
        enabled: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'config-1',
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          ssl: true,
          pollInterval: 900000,
          enabled: false,
        }),
      } as Response);

      const result = await service.updateEmailConfig(configUpdate);

      expect(result.pollInterval).toBe(900000);
      expect(result.enabled).toBe(false);
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        service.updateEmailConfig({ port: -1 })
      ).rejects.toThrow('Failed to update email config: Bad Request');
    });

    it('should convert lastPollTime to Date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'config-1',
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          ssl: true,
          pollInterval: 300000,
          enabled: true,
          lastPollTime: '2024-01-15T10:00:00Z',
        }),
      } as Response);

      const result = await service.updateEmailConfig({ enabled: true });

      expect(result.lastPollTime).toBeInstanceOf(Date);
    });
  });

  describe('testEmailConnection', () => {
    it('should test connection successfully', async () => {
      const testConfig: EmailConfigUpdate = {
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        username: 'test@gmail.com',
        password: 'test-password',
        ssl: true,
      };

      const mockResponse: TestConnectionResponse = {
        success: true,
        message: 'Connection successful',
        details: {
          connected: true,
          authenticated: true,
          mailboxCount: 5,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.testEmailConnection(testConfig);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/config/email/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testConfig),
        })
      );
      expect(result.success).toBe(true);
      expect(result.details?.mailboxCount).toBe(5);
    });

    it('should test connection without config (uses saved config)', async () => {
      const mockResponse: TestConnectionResponse = {
        success: true,
        message: 'Connection successful',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.testEmailConnection();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({}),
        })
      );
      expect(result.success).toBe(true);
    });

    it('should handle connection failure', async () => {
      const mockResponse: TestConnectionResponse = {
        success: false,
        message: 'Authentication failed',
        details: {
          connected: true,
          authenticated: false,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.testEmailConnection({
        username: 'test@gmail.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.testEmailConnection()).rejects.toThrow(
        'Failed to test email connection: Internal Server Error'
      );
    });
  });

  describe('getProviderDefaults', () => {
    it('should return Gmail defaults', () => {
      const defaults = service.getProviderDefaults('gmail');

      expect(defaults).toEqual({
        provider: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        ssl: true,
        pollInterval: 300000,
      });
    });

    it('should return Outlook defaults', () => {
      const defaults = service.getProviderDefaults('outlook');

      expect(defaults).toEqual({
        provider: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        ssl: true,
        pollInterval: 300000,
      });
    });

    it('should return IMAP defaults', () => {
      const defaults = service.getProviderDefaults('imap');

      expect(defaults).toEqual({
        provider: 'imap',
        port: 993,
        ssl: true,
        pollInterval: 300000,
      });
    });

    it('should return POP3 defaults', () => {
      const defaults = service.getProviderDefaults('pop3');

      expect(defaults).toEqual({
        provider: 'pop3',
        port: 995,
        ssl: true,
        pollInterval: 300000,
      });
    });

    it('should return empty object for unknown provider', () => {
      const defaults = service.getProviderDefaults('unknown' as any);

      expect(defaults).toEqual({});
    });
  });
});
