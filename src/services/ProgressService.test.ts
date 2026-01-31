/**
 * ProgressService Tests
 * Unit tests for the ProgressService frontend service
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressService, FeatureProgress, Update, UpdateHistoryResponse } from './ProgressService';

// Mock fetch globally
global.fetch = vi.fn();

describe('ProgressService', () => {
  let service: ProgressService;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ProgressService('http://test-api.com');
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should use default base URL if not provided', () => {
      const defaultService = new ProgressService();
      expect(defaultService).toBeDefined();
    });

    it('should use provided base URL', () => {
      const customService = new ProgressService('http://custom.com');
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

  describe('getFeatureProgress', () => {
    it('should fetch feature progress successfully', async () => {
      const mockProgress: FeatureProgress = {
        featureId: 'feature-1',
        currentStatus: 'in-progress',
        percentComplete: 50,
        lastUpdate: {
          id: 'update-1',
          featureId: 'feature-1',
          timestamp: new Date('2024-01-15'),
          sender: 'test@example.com',
          summary: 'Progress update',
          status: 'in-progress',
          percentComplete: 50,
          blockers: [],
          actionItems: [],
          sentiment: 'positive',
          urgency: 'normal',
          source: 'email',
          emailId: 'email-1',
          createdBy: null,
        },
        updateCount: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockProgress,
          lastUpdate: {
            ...mockProgress.lastUpdate,
            timestamp: '2024-01-15T00:00:00.000Z',
          },
        }),
      } as Response);

      const result = await service.getFeatureProgress('feature-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/progress/feature-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.featureId).toBe('feature-1');
      expect(result.lastUpdate?.timestamp).toBeInstanceOf(Date);
    });

    it('should include auth token in headers when set', async () => {
      service.setAuthToken('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          featureId: 'feature-1',
          currentStatus: 'in-progress',
          percentComplete: 50,
          lastUpdate: null,
          updateCount: 0,
        }),
      } as Response);

      await service.getFeatureProgress('feature-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should handle feature not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      await expect(service.getFeatureProgress('nonexistent')).rejects.toThrow(
        'Failed to get feature progress: Not Found'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getFeatureProgress('feature-1')).rejects.toThrow('Network error');
    });
  });

  describe('getUpdateHistory', () => {
    it('should fetch update history without filters', async () => {
      const mockResponse: UpdateHistoryResponse = {
        updates: [
          {
            id: 'update-1',
            featureId: 'feature-1',
            timestamp: new Date('2024-01-15'),
            sender: 'test@example.com',
            summary: 'Update 1',
            status: 'in-progress',
            percentComplete: 50,
            blockers: [],
            actionItems: [],
            sentiment: 'positive',
            urgency: 'normal',
            source: 'email',
            emailId: 'email-1',
            createdBy: null,
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          updates: mockResponse.updates.map((u) => ({
            ...u,
            timestamp: u.timestamp.toISOString(),
          })),
          total: mockResponse.total,
        }),
      } as Response);

      const result = await service.getUpdateHistory('feature-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/progress/feature-1/updates',
        expect.any(Object)
      );
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0].timestamp).toBeInstanceOf(Date);
    });

    it('should include date filters in query params', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updates: [], total: 0 }),
      } as Response);

      await service.getUpdateHistory('feature-1', { startDate, endDate });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2024-01-31'),
        expect.any(Object)
      );
    });

    it('should include pagination params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updates: [], total: 0 }),
      } as Response);

      await service.getUpdateHistory('feature-1', { limit: 10, offset: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });

    it('should handle empty update history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updates: [], total: 0 }),
      } as Response);

      const result = await service.getUpdateHistory('feature-1');

      expect(result.updates).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.getUpdateHistory('feature-1')).rejects.toThrow(
        'Failed to get update history: Internal Server Error'
      );
    });
  });

  describe('createManualUpdate', () => {
    it('should create manual update successfully', async () => {
      const updateRequest = {
        summary: 'Manual update',
        status: 'in-progress',
        percentComplete: 75,
        blockers: ['Blocker 1'],
        actionItems: ['Action 1'],
      };

      const mockUpdate: Update = {
        id: 'update-1',
        featureId: 'feature-1',
        timestamp: new Date('2024-01-15'),
        sender: 'user@example.com',
        summary: updateRequest.summary,
        status: updateRequest.status,
        percentComplete: updateRequest.percentComplete,
        blockers: updateRequest.blockers,
        actionItems: updateRequest.actionItems,
        sentiment: null,
        urgency: null,
        source: 'manual',
        emailId: null,
        createdBy: 'user-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockUpdate,
          timestamp: mockUpdate.timestamp.toISOString(),
        }),
      } as Response);

      const result = await service.createManualUpdate('feature-1', updateRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/progress/feature-1/updates',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updateRequest),
        })
      );
      expect(result.summary).toBe(updateRequest.summary);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should create minimal update', async () => {
      const updateRequest = {
        summary: 'Minimal update',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'update-1',
          featureId: 'feature-1',
          timestamp: '2024-01-15T00:00:00.000Z',
          sender: 'user@example.com',
          summary: updateRequest.summary,
          status: 'in-progress',
          percentComplete: null,
          blockers: [],
          actionItems: [],
          sentiment: null,
          urgency: null,
          source: 'manual',
          emailId: null,
          createdBy: 'user-123',
        }),
      } as Response);

      const result = await service.createManualUpdate('feature-1', updateRequest);

      expect(result.summary).toBe(updateRequest.summary);
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        service.createManualUpdate('feature-1', { summary: '' })
      ).rejects.toThrow('Failed to create manual update: Bad Request');
    });
  });

  describe('updateFeatureStatus', () => {
    it('should update feature status successfully', async () => {
      const statusUpdate = {
        status: 'blocked',
        reason: 'Waiting for dependencies',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          status: 'blocked',
        }),
      } as Response);

      const result = await service.updateFeatureStatus('feature-1', statusUpdate);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/progress/feature-1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(statusUpdate),
        })
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe('blocked');
    });

    it('should update status without reason', async () => {
      const statusUpdate = {
        status: 'complete',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          status: 'complete',
        }),
      } as Response);

      const result = await service.updateFeatureStatus('feature-1', statusUpdate);

      expect(result.success).toBe(true);
    });

    it('should handle invalid status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response);

      await expect(
        service.updateFeatureStatus('feature-1', { status: 'invalid' })
      ).rejects.toThrow('Failed to update feature status: Bad Request');
    });
  });

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await service.checkHealth();

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/health');
      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await service.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.checkHealth();

      expect(result).toBe(false);
    });
  });
});
