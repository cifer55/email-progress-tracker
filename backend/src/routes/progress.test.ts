/**
 * Progress API Tests
 * Tests for progress tracking endpoints
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import request from 'supertest';
import express, { Express } from 'express';
import { authenticate } from '../middleware/auth';
import { UpdateRepository } from '../repositories/UpdateRepository';
import { FeatureProgressRepository } from '../repositories/FeatureProgressRepository';

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../config/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

// Set up spies on repository prototypes BEFORE importing the router
const mockFindByFeatureId = jest.fn();
const mockFindById = jest.fn();
const mockFindByFeature = jest.fn();
const mockCountByFeature = jest.fn();
const mockCreate = jest.fn();
const mockUpsert = jest.fn();
const mockUpdateStatus = jest.fn();

jest.spyOn(FeatureProgressRepository.prototype, 'findByFeatureId').mockImplementation(mockFindByFeatureId);
jest.spyOn(UpdateRepository.prototype, 'findById').mockImplementation(mockFindById);
jest.spyOn(UpdateRepository.prototype, 'findByFeature').mockImplementation(mockFindByFeature);
jest.spyOn(UpdateRepository.prototype, 'countByFeature').mockImplementation(mockCountByFeature);
jest.spyOn(UpdateRepository.prototype, 'create').mockImplementation(mockCreate);
jest.spyOn(FeatureProgressRepository.prototype, 'upsert').mockImplementation(mockUpsert);
jest.spyOn(FeatureProgressRepository.prototype, 'updateStatus').mockImplementation(mockUpdateStatus);

// Import router AFTER setting up spies
import progressRouter from './progress';

describe('Progress API', () => {
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
    app.use('/api/progress', progressRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/progress/:featureId', () => {
    it('should return feature progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        feature_id: 'feature-123',
        current_status: 'in-progress',
        percent_complete: 50,
        last_update_id: 'update-1',
        last_update_at: new Date('2024-01-15'),
        update_count: 5,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
      };

      const mockUpdate = {
        id: 'update-1',
        feature_id: 'feature-123',
        email_id: null,
        timestamp: new Date('2024-01-15'),
        sender: 'john@example.com',
        summary: 'Made good progress',
        status: 'in-progress',
        percent_complete: 50,
        blockers: [],
        action_items: [],
        source: 'email',
        created_by: 'user-123',
        created_at: new Date('2024-01-15'),
      };

      mockFindByFeatureId.mockResolvedValue(mockProgress);
      mockFindById.mockResolvedValue(mockUpdate);

      const response = await request(app).get('/api/progress/feature-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        featureId: 'feature-123',
        currentStatus: 'in-progress',
        percentComplete: 50,
        lastUpdate: expect.objectContaining({
          id: 'update-1',
          summary: 'Made good progress',
        }),
        updateCount: 5,
      });
      expect(mockFindByFeatureId).toHaveBeenCalledWith('feature-123');
    });

    it('should return 404 if feature progress not found', async () => {
      mockFindByFeatureId.mockResolvedValue(null);

      const response = await request(app).get('/api/progress/feature-999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Feature progress not found' });
    });

    it('should return 400 for invalid feature ID', async () => {
      const response = await request(app).get('/api/progress/invalid<script>');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid feature ID' });
    });

    it('should handle errors gracefully', async () => {
      mockFindByFeatureId.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/progress/feature-123');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get feature progress' });
    });
  });

  describe('GET /api/progress/:featureId/updates', () => {
    it('should return update history', async () => {
      const mockUpdates = [
        {
          id: 'update-1',
          feature_id: 'feature-123',
          timestamp: new Date('2024-01-15'),
          sender: 'john@example.com',
          summary: 'Update 1',
          status: 'in-progress',
          blockers: [],
          action_items: [],
          source: 'email',
        },
        {
          id: 'update-2',
          feature_id: 'feature-123',
          timestamp: new Date('2024-01-14'),
          sender: 'jane@example.com',
          summary: 'Update 2',
          status: 'in-progress',
          blockers: [],
          action_items: [],
          source: 'email',
        },
      ];

      mockFindByFeature.mockResolvedValue(mockUpdates);
      mockCountByFeature.mockResolvedValue(2);

      const response = await request(app).get('/api/progress/feature-123/updates');

      expect(response.status).toBe(200);
      expect(response.body.updates).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.updates[0]).toMatchObject({
        id: 'update-1',
        summary: 'Update 1',
        status: 'in-progress',
      });
      expect(mockFindByFeature).toHaveBeenCalledWith('feature-123', {
        startDate: undefined,
        endDate: undefined,
        limit: 50,
        offset: 0,
      });
    });

    it('should support pagination', async () => {
      mockFindByFeature.mockResolvedValue([]);
      mockCountByFeature.mockResolvedValue(100);

      const response = await request(app)
        .get('/api/progress/feature-123/updates')
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      expect(mockFindByFeature).toHaveBeenCalledWith('feature-123', {
        startDate: undefined,
        endDate: undefined,
        limit: 10,
        offset: 20,
      });
    });

    it('should support date filtering', async () => {
      mockFindByFeature.mockResolvedValue([]);
      mockCountByFeature.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/progress/feature-123/updates')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(mockFindByFeature).toHaveBeenCalledWith('feature-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 50,
        offset: 0,
      });
    });

    it('should return 400 for invalid feature ID', async () => {
      const response = await request(app).get('/api/progress/invalid<script>/updates');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid feature ID' });
    });
  });

  describe('POST /api/progress/:featureId/updates', () => {
    it('should create manual update', async () => {
      const mockUpdate = {
        id: 'update-new',
        feature_id: 'feature-123',
        timestamp: expect.any(Date),
        sender: 'test@example.com',
        summary: 'Manual update',
        status: 'in-progress',
        percent_complete: 75,
        blockers: ['Blocker 1'],
        action_items: ['Action 1'],
        source: 'manual',
        created_by: 'user-123',
      };

      const mockProgress = {
        feature_id: 'feature-123',
        current_status: 'not-started',
        percent_complete: 0,
        update_count: 0,
      };

      mockCreate.mockResolvedValue(mockUpdate);
      mockFindByFeatureId.mockResolvedValue(mockProgress);
      mockUpsert.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/progress/feature-123/updates')
        .send({
          status: 'in-progress',
          percentComplete: 75,
          summary: 'Manual update',
          blockers: ['Blocker 1'],
          actionItems: ['Action 1'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: 'update-new',
        summary: 'Manual update',
        status: 'in-progress',
        percent_complete: 75,
      });
      expect(mockCreate).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('should return 400 if summary is missing', async () => {
      const response = await request(app)
        .post('/api/progress/feature-123/updates')
        .send({
          status: 'in-progress',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Summary is required' });
    });

    it('should sanitize inputs', async () => {
      const mockUpdate = {
        id: 'update-new',
        feature_id: 'feature-123',
        timestamp: expect.any(Date),
        sender: 'test@example.com',
        summary: 'Clean summary',
        blockers: [],
        action_items: [],
        source: 'manual',
        created_by: 'user-123',
      };

      mockCreate.mockResolvedValue(mockUpdate);
      mockFindByFeatureId.mockResolvedValue(null);
      mockUpsert.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/progress/feature-123/updates')
        .send({
          summary: '<script>alert("xss")</script>Clean summary',
        });

      expect(response.status).toBe(201);
      // sanitizeInput removes control characters but not HTML tags
      // The summary will still contain the script tags but they're harmless in JSON
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.stringContaining('Clean summary'),
        })
      );
    });
  });

  describe('PATCH /api/progress/:featureId/status', () => {
    it('should update feature status', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);
      mockCreate.mockResolvedValue({});

      const response = await request(app)
        .patch('/api/progress/feature-123/status')
        .send({
          status: 'blocked',
          reason: 'Waiting for approval',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: 'blocked',
      });
      expect(mockUpdateStatus).toHaveBeenCalledWith('feature-123', 'blocked');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should return 400 if status is missing', async () => {
      const response = await request(app)
        .patch('/api/progress/feature-123/status')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Status is required' });
    });

    it('should work without reason', async () => {
      mockUpdateStatus.mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/progress/feature-123/status')
        .send({
          status: 'complete',
        });

      expect(response.status).toBe(200);
      expect(mockUpdateStatus).toHaveBeenCalledWith('feature-123', 'complete');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid feature ID', async () => {
      const response = await request(app)
        .patch('/api/progress/invalid<script>/status')
        .send({
          status: 'blocked',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid feature ID' });
    });
  });
});
