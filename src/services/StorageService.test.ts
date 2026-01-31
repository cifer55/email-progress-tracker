/**
 * Unit tests for StorageService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageService } from './StorageService';
import { ValidationService } from './ValidationService';
import { Roadmap } from '../models';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockRoadmap: Roadmap;

  beforeEach(() => {
    storageService = new StorageService();
    
    // Create a mock roadmap with all hierarchy levels
    mockRoadmap = {
      id: 'roadmap-1',
      name: 'Test Roadmap',
      themes: [
        {
          id: 'theme-1',
          name: 'Theme 1',
          description: 'Test theme',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          collapsed: false,
          products: [
            {
              id: 'product-1',
              themeId: 'theme-1',
              name: 'Product 1',
              description: 'Test product',
              startDate: new Date('2024-02-01'),
              endDate: new Date('2024-06-30'),
              collapsed: false,
              features: [
                {
                  id: 'feature-1',
                  productId: 'product-1',
                  name: 'Feature 1',
                  description: 'Test feature',
                  startDate: new Date('2024-03-01'),
                  endDate: new Date('2024-05-31'),
                },
              ],
            },
          ],
        },
      ],
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-15T15:30:00Z'),
    };
  });

  afterEach(() => {
    // Clean up is handled by test-setup.ts
  });

  describe('save', () => {
    it('should save roadmap to localStorage', async () => {
      await storageService.save(mockRoadmap);
      
      const stored = localStorage.getItem('roadmap-visualizer-data');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe('roadmap-1');
      expect(parsed.name).toBe('Test Roadmap');
    });

    it('should serialize dates as ISO strings', async () => {
      await storageService.save(mockRoadmap);
      
      const stored = localStorage.getItem('roadmap-visualizer-data');
      const parsed = JSON.parse(stored!);
      
      expect(typeof parsed.createdAt).toBe('string');
      expect(typeof parsed.updatedAt).toBe('string');
      expect(typeof parsed.themes[0].startDate).toBe('string');
      expect(typeof parsed.themes[0].products[0].startDate).toBe('string');
    });

    it('should handle storage errors gracefully', async () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };

      await expect(storageService.save(mockRoadmap)).rejects.toThrow(
        'Failed to save roadmap to storage'
      );

      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });

  describe('load', () => {
    it('should return null when no data exists', async () => {
      const result = await storageService.load();
      expect(result).toBeNull();
    });

    it('should load and deserialize roadmap from localStorage', async () => {
      // First save the roadmap
      await storageService.save(mockRoadmap);
      
      // Then load it
      const loaded = await storageService.load();
      
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('roadmap-1');
      expect(loaded!.name).toBe('Test Roadmap');
      expect(loaded!.themes).toHaveLength(1);
      expect(loaded!.themes[0].products).toHaveLength(1);
      expect(loaded!.themes[0].products[0].features).toHaveLength(1);
    });

    it('should deserialize ISO strings back to Date objects', async () => {
      await storageService.save(mockRoadmap);
      const loaded = await storageService.load();
      
      expect(loaded!.createdAt).toBeInstanceOf(Date);
      expect(loaded!.updatedAt).toBeInstanceOf(Date);
      expect(loaded!.themes[0].startDate).toBeInstanceOf(Date);
      expect(loaded!.themes[0].products[0].startDate).toBeInstanceOf(Date);
      expect(loaded!.themes[0].products[0].features[0].startDate).toBeInstanceOf(Date);
    });

    it('should preserve date values through save/load cycle', async () => {
      await storageService.save(mockRoadmap);
      const loaded = await storageService.load();
      
      expect(loaded!.createdAt.getTime()).toBe(mockRoadmap.createdAt.getTime());
      expect(loaded!.themes[0].startDate!.getTime()).toBe(mockRoadmap.themes[0].startDate!.getTime());
    });

    it('should throw error for corrupted JSON data', async () => {
      // Store invalid JSON
      localStorage.setItem('roadmap-visualizer-data', 'invalid json {');
      
      await expect(storageService.load()).rejects.toThrow(
        'Failed to load roadmap: corrupted data (invalid JSON)'
      );
    });

    it('should throw error for invalid roadmap structure', async () => {
      // Store data missing required fields
      const invalidData = {
        id: 'roadmap-1',
        // Missing 'name' field
        themes: [],
      };
      localStorage.setItem('roadmap-visualizer-data', JSON.stringify(invalidData));
      
      await expect(storageService.load()).rejects.toThrow(
        'Loaded data is invalid'
      );
    });

    it('should validate loaded data integrity', async () => {
      // Create roadmap with invalid dates (end before start)
      const invalidRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                startDate: new Date('2024-06-30'),
                endDate: new Date('2024-02-01'), // End before start
                features: [],
              },
            ],
          },
        ],
      };

      await storageService.save(invalidRoadmap);
      
      await expect(storageService.load()).rejects.toThrow(
        'Loaded data is invalid'
      );
    });
  });

  describe('clear', () => {
    it('should remove data from localStorage', async () => {
      await storageService.save(mockRoadmap);
      expect(localStorage.getItem('roadmap-visualizer-data')).not.toBeNull();
      
      await storageService.clear();
      expect(localStorage.getItem('roadmap-visualizer-data')).toBeNull();
    });

    it('should handle clear errors gracefully', async () => {
      // Mock localStorage.removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('Storage error');
      };

      await expect(storageService.clear()).rejects.toThrow(
        'Failed to clear storage'
      );

      // Restore original method
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('round-trip', () => {
    it('should preserve all data through save and load cycle', async () => {
      await storageService.save(mockRoadmap);
      const loaded = await storageService.load();
      
      // Verify all fields are preserved
      expect(loaded!.id).toBe(mockRoadmap.id);
      expect(loaded!.name).toBe(mockRoadmap.name);
      expect(loaded!.themes[0].id).toBe(mockRoadmap.themes[0].id);
      expect(loaded!.themes[0].name).toBe(mockRoadmap.themes[0].name);
      expect(loaded!.themes[0].description).toBe(mockRoadmap.themes[0].description);
      expect(loaded!.themes[0].collapsed).toBe(mockRoadmap.themes[0].collapsed);
      
      const loadedProduct = loaded!.themes[0].products[0];
      const originalProduct = mockRoadmap.themes[0].products[0];
      expect(loadedProduct.id).toBe(originalProduct.id);
      expect(loadedProduct.name).toBe(originalProduct.name);
      expect(loadedProduct.themeId).toBe(originalProduct.themeId);
      
      const loadedFeature = loadedProduct.features[0];
      const originalFeature = originalProduct.features[0];
      expect(loadedFeature.id).toBe(originalFeature.id);
      expect(loadedFeature.name).toBe(originalFeature.name);
      expect(loadedFeature.productId).toBe(originalFeature.productId);
    });

    it('should handle themes without dates', async () => {
      const roadmapWithoutThemeDates: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            startDate: undefined,
            endDate: undefined,
          },
        ],
      };

      await storageService.save(roadmapWithoutThemeDates);
      const loaded = await storageService.load();
      
      expect(loaded!.themes[0].startDate).toBeUndefined();
      expect(loaded!.themes[0].endDate).toBeUndefined();
    });
  });

  describe('backup and recovery', () => {
    it('should create backup when saving over existing data', async () => {
      // Save initial roadmap
      await storageService.save(mockRoadmap);
      
      // Modify and save again
      const modifiedRoadmap = {
        ...mockRoadmap,
        name: 'Modified Roadmap'
      };
      await storageService.save(modifiedRoadmap);
      
      // Check that backup exists with original data
      const backup = localStorage.getItem('roadmap-visualizer-data-backup');
      expect(backup).not.toBeNull();
      
      const parsedBackup = JSON.parse(backup!);
      expect(parsedBackup.name).toBe('Test Roadmap');
    });

    it('should load from backup when requested', async () => {
      // Save initial roadmap
      await storageService.save(mockRoadmap);
      
      // Modify and save again
      const modifiedRoadmap = {
        ...mockRoadmap,
        name: 'Modified Roadmap'
      };
      await storageService.save(modifiedRoadmap);
      
      // Load from backup
      const backupRoadmap = await storageService.loadFromBackup();
      
      expect(backupRoadmap).not.toBeNull();
      expect(backupRoadmap!.name).toBe('Test Roadmap');
    });

    it('should return null when no backup exists', async () => {
      const backupRoadmap = await storageService.loadFromBackup();
      expect(backupRoadmap).toBeNull();
    });

    it('should restore from backup', async () => {
      // Save initial roadmap
      await storageService.save(mockRoadmap);
      
      // Modify and save again
      const modifiedRoadmap = {
        ...mockRoadmap,
        name: 'Modified Roadmap'
      };
      await storageService.save(modifiedRoadmap);
      
      // Verify current data is modified
      let current = await storageService.load();
      expect(current!.name).toBe('Modified Roadmap');
      
      // Restore from backup
      await storageService.restoreFromBackup();
      
      // Verify data is restored
      current = await storageService.load();
      expect(current!.name).toBe('Test Roadmap');
    });

    it('should throw error when restoring with no backup', async () => {
      await expect(storageService.restoreFromBackup()).rejects.toThrow(
        'No backup data available'
      );
    });

    it('should validate backup data before loading', async () => {
      // Create invalid roadmap
      const invalidRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                startDate: new Date('2024-06-30'),
                endDate: new Date('2024-02-01'), // End before start
                features: [],
              },
            ],
          },
        ],
      };

      // Save valid data first, then invalid
      await storageService.save(mockRoadmap);
      await storageService.save(invalidRoadmap);
      
      // Try to load from backup (which should be valid)
      const backupRoadmap = await storageService.loadFromBackup();
      expect(backupRoadmap).not.toBeNull();
      expect(backupRoadmap!.name).toBe('Test Roadmap');
    });
  });

  describe('loadWithValidation', () => {
    it('should return validation details for valid data', async () => {
      await storageService.save(mockRoadmap);
      
      const result = await storageService.loadWithValidation();
      
      expect(result.roadmap).not.toBeNull();
      expect(result.validation.valid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);
      expect(result.hasBackup).toBe(false);
    });

    it('should return validation errors for invalid data', async () => {
      // Create invalid roadmap
      const invalidRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                startDate: new Date('2024-06-30'),
                endDate: new Date('2024-02-01'), // End before start
                features: [],
              },
            ],
          },
        ],
      };

      await storageService.save(invalidRoadmap);
      
      const result = await storageService.loadWithValidation();
      
      expect(result.roadmap).toBeNull();
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
      expect(result.validation.errors[0].message).toContain('End date cannot be before start date');
    });

    it('should indicate when backup is available', async () => {
      // Save initial data
      await storageService.save(mockRoadmap);
      
      // Save again to create backup
      await storageService.save(mockRoadmap);
      
      const result = await storageService.loadWithValidation();
      
      expect(result.hasBackup).toBe(true);
    });

    it('should handle corrupted JSON gracefully', async () => {
      localStorage.setItem('roadmap-visualizer-data', 'invalid json {');
      
      const result = await storageService.loadWithValidation();
      
      expect(result.roadmap).toBeNull();
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors[0].message).toContain('corrupted JSON');
    });

    it('should handle missing data gracefully', async () => {
      const result = await storageService.loadWithValidation();
      
      expect(result.roadmap).toBeNull();
      expect(result.validation.valid).toBe(true);
      expect(result.hasBackup).toBe(false);
    });

    it('should handle invalid data structure', async () => {
      // Store data with invalid structure
      const invalidData = {
        id: 'roadmap-1',
        // Missing required fields
      };
      localStorage.setItem('roadmap-visualizer-data', JSON.stringify(invalidData));
      
      const result = await storageService.loadWithValidation();
      
      expect(result.roadmap).toBeNull();
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors[0].message).toContain('invalid structure');
    });
  });

  describe('createEmptyRoadmap', () => {
    it('should create a valid empty roadmap', () => {
      const emptyRoadmap = storageService.createEmptyRoadmap();
      
      expect(emptyRoadmap.id).toBeDefined();
      expect(emptyRoadmap.name).toBe('New Roadmap');
      expect(emptyRoadmap.themes).toEqual([]);
      expect(emptyRoadmap.createdAt).toBeInstanceOf(Date);
      expect(emptyRoadmap.updatedAt).toBeInstanceOf(Date);
    });

    it('should create roadmap with unique ID', () => {
      const roadmap1 = storageService.createEmptyRoadmap();
      const roadmap2 = storageService.createEmptyRoadmap();
      
      // IDs should be different due to random component in generateId
      // Even if created at same millisecond, the random part makes them unique
      expect(roadmap1.id).not.toBe(roadmap2.id);
    });

    it('should create roadmap that passes validation', () => {
      const emptyRoadmap = storageService.createEmptyRoadmap();
      const validationService = new ValidationService();
      
      const result = validationService.validateRoadmap(emptyRoadmap);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
