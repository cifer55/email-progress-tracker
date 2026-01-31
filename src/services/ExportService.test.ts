/**
 * Unit tests for ExportService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExportService } from './ExportService';
import { Roadmap } from '../models';

describe('ExportService', () => {
  let exportService: ExportService;
  let mockRoadmap: Roadmap;

  beforeEach(() => {
    exportService = new ExportService();

    // Create a comprehensive mock roadmap
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

  describe('exportToJSON', () => {
    it('should export roadmap to valid JSON string', () => {
      const json = exportService.exportToJSON(mockRoadmap);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      // Should be parseable
      const parsed = JSON.parse(json);
      expect(parsed).toBeDefined();
    });

    it('should preserve all roadmap data', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('roadmap-1');
      expect(parsed.name).toBe('Test Roadmap');
      expect(parsed.themes).toHaveLength(1);
      expect(parsed.themes[0].id).toBe('theme-1');
      expect(parsed.themes[0].name).toBe('Theme 1');
      expect(parsed.themes[0].products).toHaveLength(1);
      expect(parsed.themes[0].products[0].features).toHaveLength(1);
    });

    it('should convert dates to ISO strings', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      expect(typeof parsed.createdAt).toBe('string');
      expect(typeof parsed.updatedAt).toBe('string');
      expect(typeof parsed.themes[0].startDate).toBe('string');
      expect(typeof parsed.themes[0].products[0].startDate).toBe('string');
      expect(typeof parsed.themes[0].products[0].features[0].startDate).toBe('string');
    });

    it('should preserve date values in ISO format', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(parsed.themes[0].startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(parsed.themes[0].products[0].startDate).toBe('2024-02-01T00:00:00.000Z');
    });

    it('should handle themes without dates', () => {
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

      const json = exportService.exportToJSON(roadmapWithoutThemeDates);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].startDate).toBeUndefined();
      expect(parsed.themes[0].endDate).toBeUndefined();
    });

    it('should handle empty roadmap', () => {
      const emptyRoadmap: Roadmap = {
        id: 'empty-1',
        name: 'Empty Roadmap',
        themes: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const json = exportService.exportToJSON(emptyRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('empty-1');
      expect(parsed.themes).toEqual([]);
    });

    it('should preserve collapsed state', () => {
      const collapsedRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            collapsed: true,
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                collapsed: true,
              },
            ],
          },
        ],
      };

      const json = exportService.exportToJSON(collapsedRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].collapsed).toBe(true);
      expect(parsed.themes[0].products[0].collapsed).toBe(true);
    });

    it('should preserve optional descriptions', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].description).toBe('Test theme');
      expect(parsed.themes[0].products[0].description).toBe('Test product');
      expect(parsed.themes[0].products[0].features[0].description).toBe('Test feature');
    });

    it('should handle missing optional descriptions', () => {
      const roadmapWithoutDescriptions: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            description: undefined,
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                description: undefined,
                features: [
                  {
                    ...mockRoadmap.themes[0].products[0].features[0],
                    description: undefined,
                  },
                ],
              },
            ],
          },
        ],
      };

      const json = exportService.exportToJSON(roadmapWithoutDescriptions);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].description).toBeUndefined();
      expect(parsed.themes[0].products[0].description).toBeUndefined();
      expect(parsed.themes[0].products[0].features[0].description).toBeUndefined();
    });

    it('should format JSON with indentation', () => {
      const json = exportService.exportToJSON(mockRoadmap);

      // Check that JSON is pretty-printed (contains newlines and indentation)
      expect(json).toContain('\n');
      expect(json).toContain('  '); // 2-space indentation
    });

    it('should handle multiple themes, products, and features', () => {
      const complexRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          mockRoadmap.themes[0],
          {
            id: 'theme-2',
            name: 'Theme 2',
            collapsed: false,
            products: [
              {
                id: 'product-2',
                themeId: 'theme-2',
                name: 'Product 2',
                startDate: new Date('2024-07-01'),
                endDate: new Date('2024-12-31'),
                collapsed: false,
                features: [
                  {
                    id: 'feature-2',
                    productId: 'product-2',
                    name: 'Feature 2',
                    startDate: new Date('2024-08-01'),
                    endDate: new Date('2024-10-31'),
                  },
                  {
                    id: 'feature-3',
                    productId: 'product-2',
                    name: 'Feature 3',
                    startDate: new Date('2024-09-01'),
                    endDate: new Date('2024-11-30'),
                  },
                ],
              },
            ],
          },
        ],
      };

      const json = exportService.exportToJSON(complexRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes).toHaveLength(2);
      expect(parsed.themes[1].products[0].features).toHaveLength(2);
    });
  });

  describe('exportToPNG', () => {
    it('should call toBlob on canvas with correct parameters', async () => {
      // Create a mock canvas with toBlob method
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;

      // Mock toBlob to return a valid blob
      const mockBlob = new Blob(['mock png data'], { type: 'image/png' });
      canvas.toBlob = (callback: BlobCallback) => {
        callback(mockBlob);
      };

      const blob = await exportService.exportToPNG(canvas);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('should reject when toBlob returns null', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      // Mock toBlob to return null (failure case)
      canvas.toBlob = (callback: BlobCallback) => {
        callback(null);
      };

      await expect(exportService.exportToPNG(canvas)).rejects.toThrow(
        'Failed to generate PNG blob from canvas'
      );
    });

    it('should handle canvas export for different sizes', async () => {
      const sizes = [
        { width: 100, height: 100 },
        { width: 1920, height: 1080 },
        { width: 500, height: 300 },
      ];

      for (const size of sizes) {
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;

        const mockBlob = new Blob(['mock png data'], { type: 'image/png' });
        canvas.toBlob = (callback: BlobCallback) => {
          callback(mockBlob);
        };

        const blob = await exportService.exportToPNG(canvas);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
      }
    });

    it('should return PNG blob type', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;

      const mockBlob = new Blob(['mock png data'], { type: 'image/png' });
      canvas.toBlob = (callback: BlobCallback) => {
        callback(mockBlob);
      };

      const blob = await exportService.exportToPNG(canvas);

      expect(blob.type).toBe('image/png');
    });
  });

  describe('filtered export', () => {
    it('should export filtered roadmap with only visible items', () => {
      // Create a filtered roadmap (simulating what FilterEngine would return)
      const filteredRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [mockRoadmap.themes[0]], // Only one theme visible
      };

      const json = exportService.exportToJSON(filteredRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes).toHaveLength(1);
      expect(parsed.themes[0].id).toBe('theme-1');
    });

    it('should export roadmap with filtered products', () => {
      // Simulate product filtering
      const filteredRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            products: [], // No products visible
          },
        ],
      };

      const json = exportService.exportToJSON(filteredRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].products).toEqual([]);
    });

    it('should export roadmap with date range filtered items', () => {
      // Simulate date range filtering
      const filteredRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [
          {
            ...mockRoadmap.themes[0],
            products: [
              {
                ...mockRoadmap.themes[0].products[0],
                features: [], // Features filtered out by date range
              },
            ],
          },
        ],
      };

      const json = exportService.exportToJSON(filteredRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes[0].products[0].features).toEqual([]);
    });

    it('should export empty roadmap when all items filtered', () => {
      const emptyFilteredRoadmap: Roadmap = {
        ...mockRoadmap,
        themes: [],
      };

      const json = exportService.exportToJSON(emptyFilteredRoadmap);
      const parsed = JSON.parse(json);

      expect(parsed.themes).toEqual([]);
    });
  });

  describe('round-trip', () => {
    it('should preserve data through JSON export and parse', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      // Verify structure is preserved
      expect(parsed.id).toBe(mockRoadmap.id);
      expect(parsed.name).toBe(mockRoadmap.name);
      expect(parsed.themes[0].id).toBe(mockRoadmap.themes[0].id);
      expect(parsed.themes[0].products[0].id).toBe(mockRoadmap.themes[0].products[0].id);
      expect(parsed.themes[0].products[0].features[0].id).toBe(
        mockRoadmap.themes[0].products[0].features[0].id
      );
    });

    it('should allow reconstruction of Date objects from exported JSON', () => {
      const json = exportService.exportToJSON(mockRoadmap);
      const parsed = JSON.parse(json);

      // Dates should be ISO strings that can be converted back
      const reconstructedDate = new Date(parsed.createdAt);
      expect(reconstructedDate.getTime()).toBe(mockRoadmap.createdAt.getTime());

      const reconstructedThemeDate = new Date(parsed.themes[0].startDate);
      expect(reconstructedThemeDate.getTime()).toBe(mockRoadmap.themes[0].startDate!.getTime());
    });
  });
});
