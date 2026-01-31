/**
 * FilterEngine Tests
 * Unit tests for filtering functionality
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FilterEngine } from './FilterEngine';
import { Roadmap, Theme, Product, Feature } from '../models';

describe('FilterEngine', () => {
  const filterEngine = new FilterEngine();

  // Helper to create test data
  const createTestRoadmap = (): Roadmap => {
    const feature1: Feature = {
      id: 'f1',
      productId: 'p1',
      name: 'Feature 1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-02-01'),
    };

    const feature2: Feature = {
      id: 'f2',
      productId: 'p1',
      name: 'Feature 2',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-01'),
    };

    const feature3: Feature = {
      id: 'f3',
      productId: 'p2',
      name: 'Feature 3',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-15'),
    };

    const product1: Product = {
      id: 'p1',
      themeId: 't1',
      name: 'Product 1',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-01'),
      features: [feature1, feature2],
      collapsed: false,
    };

    const product2: Product = {
      id: 'p2',
      themeId: 't1',
      name: 'Product 2',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-15'),
      features: [feature3],
      collapsed: false,
    };

    const product3: Product = {
      id: 'p3',
      themeId: 't2',
      name: 'Product 3',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-04-01'),
      features: [],
      collapsed: false,
    };

    const theme1: Theme = {
      id: 't1',
      name: 'Theme 1',
      products: [product1, product2],
      collapsed: false,
    };

    const theme2: Theme = {
      id: 't2',
      name: 'Theme 2',
      products: [product3],
      collapsed: false,
    };

    return {
      id: 'r1',
      name: 'Test Roadmap',
      themes: [theme1, theme2],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
  };

  describe('filterByThemes', () => {
    it('should return only selected themes and their descendants', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByThemes(roadmap, ['t1']);

      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(2);
    });

    it('should return multiple selected themes', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByThemes(roadmap, ['t1', 't2']);

      expect(result.themes).toHaveLength(2);
      const themeIds = result.themes.map(t => t.id);
      expect(themeIds).toContain('t1');
      expect(themeIds).toContain('t2');
    });

    it('should return empty roadmap when no theme IDs provided', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByThemes(roadmap, []);

      expect(result.themes).toHaveLength(0);
    });

    it('should return empty roadmap when theme IDs do not match', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByThemes(roadmap, ['nonexistent']);

      expect(result.themes).toHaveLength(0);
    });

    it('should include all products and features of selected themes', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByThemes(roadmap, ['t1']);

      expect(result.themes[0].products).toHaveLength(2);
      expect(result.themes[0].products[0].features).toHaveLength(2);
      expect(result.themes[0].products[1].features).toHaveLength(1);
    });
  });

  describe('filterByProducts', () => {
    it('should return only selected products and their features', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, ['p1']);

      // Should have one theme (t1) containing product p1
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(1);
      expect(result.themes[0].products[0].id).toBe('p1');
      
      // Should include all features of p1
      expect(result.themes[0].products[0].features).toHaveLength(2);
      expect(result.themes[0].products[0].features[0].id).toBe('f1');
      expect(result.themes[0].products[0].features[1].id).toBe('f2');
    });

    it('should return multiple selected products from same theme', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, ['p1', 'p2']);

      // Should have one theme with both products
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(2);
      
      const productIds = result.themes[0].products.map(p => p.id);
      expect(productIds).toContain('p1');
      expect(productIds).toContain('p2');
    });

    it('should return products from different themes', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, ['p1', 'p3']);

      // Should have two themes
      expect(result.themes).toHaveLength(2);
      
      // Theme 1 should have product p1
      const theme1 = result.themes.find(t => t.id === 't1');
      expect(theme1).toBeDefined();
      expect(theme1!.products).toHaveLength(1);
      expect(theme1!.products[0].id).toBe('p1');
      
      // Theme 2 should have product p3
      const theme2 = result.themes.find(t => t.id === 't2');
      expect(theme2).toBeDefined();
      expect(theme2!.products).toHaveLength(1);
      expect(theme2!.products[0].id).toBe('p3');
    });

    it('should return empty roadmap when no product IDs provided', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, []);

      expect(result.themes).toHaveLength(0);
    });

    it('should return empty roadmap when product IDs do not match', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, ['nonexistent']);

      expect(result.themes).toHaveLength(0);
    });

    it('should preserve parent theme context', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.filterByProducts(roadmap, ['p2']);

      // Should include theme t1 even though we're only filtering for p2
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].name).toBe('Theme 1');
    });
  });

  describe('filterByDateRange', () => {
    it('should return items that overlap with date range', () => {
      const roadmap = createTestRoadmap();
      // Filter for January 15 to February 15
      const result = filterEngine.filterByDateRange(
        roadmap,
        new Date('2024-01-15'),
        new Date('2024-02-15')
      );

      // Should include theme t1 with products p1 and p2
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      
      // Product p1 (Jan 1 - Mar 1) overlaps
      // Product p2 (Jan 15 - Feb 15) overlaps
      expect(result.themes[0].products).toHaveLength(2);
      
      const productIds = result.themes[0].products.map(p => p.id);
      expect(productIds).toContain('p1');
      expect(productIds).toContain('p2');
    });

    it('should filter features within products by date range', () => {
      const roadmap = createTestRoadmap();
      // Filter for January 1 to January 31
      const result = filterEngine.filterByDateRange(
        roadmap,
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Product p1 should be included
      const theme = result.themes.find(t => t.id === 't1');
      expect(theme).toBeDefined();
      
      const product1 = theme!.products.find(p => p.id === 'p1');
      expect(product1).toBeDefined();
      
      // Feature f1 (Jan 1 - Feb 1) overlaps, but f2 (Feb 1 - Mar 1) does not
      expect(product1!.features).toHaveLength(1);
      expect(product1!.features[0].id).toBe('f1');
    });

    it('should return empty roadmap when no items overlap', () => {
      const roadmap = createTestRoadmap();
      // Filter for a date range with no overlapping items
      const result = filterEngine.filterByDateRange(
        roadmap,
        new Date('2024-05-01'),
        new Date('2024-06-01')
      );

      expect(result.themes).toHaveLength(0);
    });

    it('should handle edge case where item starts exactly at range end', () => {
      const roadmap = createTestRoadmap();
      // Product p3 starts on March 1
      // Filter ends on March 1 - should not overlap (start < end condition)
      const result = filterEngine.filterByDateRange(
        roadmap,
        new Date('2024-02-01'),
        new Date('2024-03-01')
      );

      // Should not include product p3
      const theme2 = result.themes.find(t => t.id === 't2');
      expect(theme2).toBeUndefined();
    });

    it('should handle edge case where item ends exactly at range start', () => {
      const roadmap = createTestRoadmap();
      // Feature f1 ends on Feb 1
      // Filter starts on Feb 1 - should not overlap (end > start condition)
      const result = filterEngine.filterByDateRange(
        roadmap,
        new Date('2024-02-01'),
        new Date('2024-03-01')
      );

      const theme = result.themes.find(t => t.id === 't1');
      const product1 = theme?.products.find(p => p.id === 'p1');
      
      // Feature f1 should not be included
      const hasF1 = product1?.features.some(f => f.id === 'f1');
      expect(hasF1).toBe(false);
    });
  });

  describe('applyFilters', () => {
    it('should apply theme filter only', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: ['t1'],
      });

      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(2);
    });

    it('should apply product filter only', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        productIds: ['p1'],
      });

      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].products).toHaveLength(1);
      expect(result.themes[0].products[0].id).toBe('p1');
    });

    it('should apply date range filter only', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        dateRange: {
          start: new Date('2024-01-15'),
          end: new Date('2024-02-15'),
        },
      });

      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].products).toHaveLength(2);
    });

    it('should combine theme and product filters', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: ['t1'],
        productIds: ['p1'],
      });

      // Should have theme t1 with only product p1
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(1);
      expect(result.themes[0].products[0].id).toBe('p1');
    });

    it('should combine theme and date range filters', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: ['t1'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      });

      // Should have theme t1 with products that overlap the date range
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      
      // Both p1 and p2 overlap with Jan 1-31
      expect(result.themes[0].products).toHaveLength(2);
    });

    it('should combine product and date range filters', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        productIds: ['p1', 'p2'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      });

      // Should have products p1 and p2, filtered by date range
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].products).toHaveLength(2);
      
      // Check that features are also filtered by date
      const product1 = result.themes[0].products.find(p => p.id === 'p1');
      expect(product1).toBeDefined();
      expect(product1!.features).toHaveLength(1); // Only f1 overlaps Jan 1-31
      expect(product1!.features[0].id).toBe('f1');
    });

    it('should combine all three filter types', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: ['t1'],
        productIds: ['p1'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      });

      // Should have theme t1, product p1, filtered by date range
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].id).toBe('t1');
      expect(result.themes[0].products).toHaveLength(1);
      expect(result.themes[0].products[0].id).toBe('p1');
      
      // Only feature f1 overlaps the date range
      expect(result.themes[0].products[0].features).toHaveLength(1);
      expect(result.themes[0].products[0].features[0].id).toBe('f1');
    });

    it('should return empty roadmap when filters result in no matches', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: ['t1'],
        productIds: ['p3'], // p3 is in t2, not t1
      });

      // No products should match both filters
      expect(result.themes).toHaveLength(0);
    });

    it('should return original roadmap when no filters are specified', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {});

      // Should return the full roadmap
      expect(result.themes).toHaveLength(2);
      expect(result.themes[0].products).toHaveLength(2);
      expect(result.themes[1].products).toHaveLength(1);
    });

    it('should handle empty filter arrays as no filter', () => {
      const roadmap = createTestRoadmap();
      const result = filterEngine.applyFilters(roadmap, {
        themeIds: [],
        productIds: [],
      });

      // Empty arrays should be treated as no filter applied
      expect(result.themes).toHaveLength(2);
    });
  });

  // Feature: roadmap-visualizer, Property 9: Theme Filtering
  // Validates: Requirements 4.1
  describe('Property 9: Theme Filtering', () => {
    it('should return only specified themes and their descendants for any roadmap and theme IDs', () => {
      // Arbitraries for generating test data
      const featureArb = fc.record({
        id: fc.string({ minLength: 1 }),
        productId: fc.constant(''), // Will be set by parent
        name: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined }),
        startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      });

      const productArb = fc.record({
        id: fc.string({ minLength: 1 }),
        themeId: fc.constant(''), // Will be set by parent
        name: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined }),
        startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        features: fc.array(featureArb, { maxLength: 5 }),
        collapsed: fc.boolean(),
      }).map((product) => ({
        ...product,
        features: product.features.map((f) => ({ ...f, productId: product.id })),
      }));

      const themeArb = fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined }),
        startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
        endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
        products: fc.array(productArb, { maxLength: 5 }),
        collapsed: fc.boolean(),
      }).map((theme) => ({
        ...theme,
        products: theme.products.map((p) => ({ ...p, themeId: theme.id })),
      }));

      const roadmapArb = fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        themes: fc.array(themeArb, { minLength: 1, maxLength: 10 }),
        createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      });

      // Property test
      fc.assert(
        fc.property(
          roadmapArb,
          fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
          (roadmap: Roadmap, themeIds: string[]) => {
            const result = filterEngine.filterByThemes(roadmap, themeIds);

            // Property 1: Result should only contain themes with IDs in themeIds
            const resultThemeIds = result.themes.map((t) => t.id);
            for (const themeId of resultThemeIds) {
              expect(themeIds).toContain(themeId);
            }

            // Property 2: All themes in themeIds that exist in original roadmap should be in result
            const originalThemeIds = roadmap.themes.map((t) => t.id);
            for (const themeId of themeIds) {
              if (originalThemeIds.includes(themeId)) {
                expect(resultThemeIds).toContain(themeId);
              }
            }

            // Property 3: Each theme in result should have all its original products and features
            for (const resultTheme of result.themes) {
              const originalTheme = roadmap.themes.find((t) => t.id === resultTheme.id);
              expect(originalTheme).toBeDefined();

              // Check products are preserved
              expect(resultTheme.products.length).toBe(originalTheme!.products.length);
              
              for (let i = 0; i < resultTheme.products.length; i++) {
                const resultProduct = resultTheme.products[i];
                const originalProduct = originalTheme!.products[i];
                
                // Check product properties are preserved
                expect(resultProduct.id).toBe(originalProduct.id);
                expect(resultProduct.name).toBe(originalProduct.name);
                expect(resultProduct.themeId).toBe(originalProduct.themeId);
                
                // Check features are preserved
                expect(resultProduct.features.length).toBe(originalProduct.features.length);
                
                for (let j = 0; j < resultProduct.features.length; j++) {
                  const resultFeature = resultProduct.features[j];
                  const originalFeature = originalProduct.features[j];
                  
                  expect(resultFeature.id).toBe(originalFeature.id);
                  expect(resultFeature.name).toBe(originalFeature.name);
                  expect(resultFeature.productId).toBe(originalFeature.productId);
                }
              }
            }

            // Property 4: If themeIds is empty, result should have no themes
            if (themeIds.length === 0) {
              expect(result.themes).toHaveLength(0);
            }

            // Property 5: Result should maintain roadmap metadata
            expect(result.id).toBe(roadmap.id);
            expect(result.name).toBe(roadmap.name);
            expect(result.createdAt).toBe(roadmap.createdAt);
            expect(result.updatedAt).toBe(roadmap.updatedAt);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
