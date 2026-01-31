/**
 * Unit tests for RoadmapManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoadmapManager } from './RoadmapManager';
import { Theme, Product, Feature } from '../models';
import * as fc from 'fast-check';

describe('RoadmapManager', () => {
  let manager: RoadmapManager;

  beforeEach(() => {
    manager = new RoadmapManager();
  });

  describe('Theme CRUD Operations', () => {
    it('should create a theme with name and description', () => {
      const theme = manager.createTheme('Strategic Theme', 'A strategic initiative');

      expect(theme.id).toBeDefined();
      expect(theme.name).toBe('Strategic Theme');
      expect(theme.description).toBe('A strategic initiative');
      expect(theme.products).toEqual([]);
      expect(theme.collapsed).toBe(false);

      const roadmap = manager.getRoadmap();
      expect(roadmap.themes).toContain(theme);
    });

    it('should create a theme without description', () => {
      const theme = manager.createTheme('Simple Theme');

      expect(theme.id).toBeDefined();
      expect(theme.name).toBe('Simple Theme');
      expect(theme.description).toBeUndefined();
    });

    it('should update a theme', () => {
      const theme = manager.createTheme('Original Name');
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const updated = manager.updateTheme(theme.id, {
        name: 'Updated Name',
        description: 'New description',
        startDate,
        endDate,
        collapsed: true,
      });

      expect(updated.id).toBe(theme.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('New description');
      expect(updated.startDate).toEqual(startDate);
      expect(updated.endDate).toEqual(endDate);
      expect(updated.collapsed).toBe(true);
    });

    it('should throw error when updating non-existent theme', () => {
      expect(() => {
        manager.updateTheme('non-existent-id', { name: 'New Name' });
      }).toThrow('Theme with id non-existent-id not found');
    });

    it('should delete a theme', () => {
      const theme = manager.createTheme('Theme to Delete');
      const roadmap = manager.getRoadmap();

      expect(roadmap.themes).toContain(theme);

      manager.deleteTheme(theme.id);

      expect(roadmap.themes).not.toContain(theme);
    });

    it('should throw error when deleting non-existent theme', () => {
      expect(() => {
        manager.deleteTheme('non-existent-id');
      }).toThrow('Theme with id non-existent-id not found');
    });

    it('should cascade delete products and features when deleting theme', () => {
      const theme = manager.createTheme('Theme');
      const product = manager.createProduct(theme.id, {
        name: 'Product',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      });
      const feature = manager.createFeature(product.id, {
        name: 'Feature',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      });

      manager.deleteTheme(theme.id);

      expect(manager.getTheme(theme.id)).toBeNull();
      expect(manager.getProduct(product.id)).toBeNull();
      expect(manager.getFeature(feature.id)).toBeNull();
    });
  });

  describe('Product CRUD Operations', () => {
    let theme: Theme;

    beforeEach(() => {
      theme = manager.createTheme('Test Theme');
    });

    it('should create a product within a theme', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-30');

      const product = manager.createProduct(theme.id, {
        name: 'New Product',
        description: 'Product description',
        startDate,
        endDate,
      });

      expect(product.id).toBeDefined();
      expect(product.themeId).toBe(theme.id);
      expect(product.name).toBe('New Product');
      expect(product.description).toBe('Product description');
      expect(product.startDate).toEqual(startDate);
      expect(product.endDate).toEqual(endDate);
      expect(product.features).toEqual([]);
      expect(product.collapsed).toBe(false);

      const updatedTheme = manager.getTheme(theme.id);
      expect(updatedTheme?.products).toContain(product);
    });

    it('should throw error when creating product in non-existent theme', () => {
      expect(() => {
        manager.createProduct('non-existent-id', {
          name: 'Product',
          startDate: new Date(),
          endDate: new Date(),
        });
      }).toThrow('Theme with id non-existent-id not found');
    });

    it('should update a product', () => {
      const product = manager.createProduct(theme.id, {
        name: 'Original Product',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      });

      const newStartDate = new Date('2024-02-01');
      const newEndDate = new Date('2024-07-31');

      const updated = manager.updateProduct(product.id, {
        name: 'Updated Product',
        description: 'New description',
        startDate: newStartDate,
        endDate: newEndDate,
        collapsed: true,
      });

      expect(updated.id).toBe(product.id);
      expect(updated.name).toBe('Updated Product');
      expect(updated.description).toBe('New description');
      expect(updated.startDate).toEqual(newStartDate);
      expect(updated.endDate).toEqual(newEndDate);
      expect(updated.collapsed).toBe(true);
    });

    it('should throw error when updating non-existent product', () => {
      expect(() => {
        manager.updateProduct('non-existent-id', { name: 'New Name' });
      }).toThrow('Product with id non-existent-id not found');
    });

    it('should delete a product', () => {
      const product = manager.createProduct(theme.id, {
        name: 'Product to Delete',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      });

      const updatedTheme = manager.getTheme(theme.id);
      expect(updatedTheme?.products).toContain(product);

      manager.deleteProduct(product.id);

      const finalTheme = manager.getTheme(theme.id);
      expect(finalTheme?.products).not.toContain(product);
    });

    it('should throw error when deleting non-existent product', () => {
      expect(() => {
        manager.deleteProduct('non-existent-id');
      }).toThrow('Product with id non-existent-id not found');
    });

    it('should cascade delete features when deleting product', () => {
      const product = manager.createProduct(theme.id, {
        name: 'Product',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
      });
      const feature = manager.createFeature(product.id, {
        name: 'Feature',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      });

      manager.deleteProduct(product.id);

      expect(manager.getProduct(product.id)).toBeNull();
      expect(manager.getFeature(feature.id)).toBeNull();
    });
  });

  describe('Feature CRUD Operations', () => {
    let theme: Theme;
    let product: Product;

    beforeEach(() => {
      theme = manager.createTheme('Test Theme');
      product = manager.createProduct(theme.id, {
        name: 'Test Product',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
    });

    it('should create a feature within a product', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const feature = manager.createFeature(product.id, {
        name: 'New Feature',
        description: 'Feature description',
        startDate,
        endDate,
      });

      expect(feature.id).toBeDefined();
      expect(feature.productId).toBe(product.id);
      expect(feature.name).toBe('New Feature');
      expect(feature.description).toBe('Feature description');
      expect(feature.startDate).toEqual(startDate);
      expect(feature.endDate).toEqual(endDate);

      const updatedProduct = manager.getProduct(product.id);
      expect(updatedProduct?.features).toContain(feature);
    });

    it('should throw error when creating feature in non-existent product', () => {
      expect(() => {
        manager.createFeature('non-existent-id', {
          name: 'Feature',
          startDate: new Date(),
          endDate: new Date(),
        });
      }).toThrow('Product with id non-existent-id not found');
    });

    it('should update a feature', () => {
      const feature = manager.createFeature(product.id, {
        name: 'Original Feature',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      });

      const newStartDate = new Date('2024-02-01');
      const newEndDate = new Date('2024-04-30');

      const updated = manager.updateFeature(feature.id, {
        name: 'Updated Feature',
        description: 'New description',
        startDate: newStartDate,
        endDate: newEndDate,
      });

      expect(updated.id).toBe(feature.id);
      expect(updated.name).toBe('Updated Feature');
      expect(updated.description).toBe('New description');
      expect(updated.startDate).toEqual(newStartDate);
      expect(updated.endDate).toEqual(newEndDate);
    });

    it('should throw error when updating non-existent feature', () => {
      expect(() => {
        manager.updateFeature('non-existent-id', { name: 'New Name' });
      }).toThrow('Feature with id non-existent-id not found');
    });

    it('should delete a feature', () => {
      const feature = manager.createFeature(product.id, {
        name: 'Feature to Delete',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      });

      const updatedProduct = manager.getProduct(product.id);
      expect(updatedProduct?.features).toContain(feature);

      manager.deleteFeature(feature.id);

      const finalProduct = manager.getProduct(product.id);
      expect(finalProduct?.features).not.toContain(feature);
    });

    it('should throw error when deleting non-existent feature', () => {
      expect(() => {
        manager.deleteFeature('non-existent-id');
      }).toThrow('Feature with id non-existent-id not found');
    });
  });

  describe('Retrieval Operations', () => {
    it('should get theme by id', () => {
      const theme = manager.createTheme('Test Theme');
      const retrieved = manager.getTheme(theme.id);

      expect(retrieved).toBe(theme);
    });

    it('should return null for non-existent theme', () => {
      const retrieved = manager.getTheme('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get product by id', () => {
      const theme = manager.createTheme('Test Theme');
      const product = manager.createProduct(theme.id, {
        name: 'Test Product',
        startDate: new Date(),
        endDate: new Date(),
      });
      const retrieved = manager.getProduct(product.id);

      expect(retrieved).toBe(product);
    });

    it('should return null for non-existent product', () => {
      const retrieved = manager.getProduct('non-existent-id');
      expect(retrieved).toBeNull();
    });

    it('should get feature by id', () => {
      const theme = manager.createTheme('Test Theme');
      const product = manager.createProduct(theme.id, {
        name: 'Test Product',
        startDate: new Date(),
        endDate: new Date(),
      });
      const feature = manager.createFeature(product.id, {
        name: 'Test Feature',
        startDate: new Date(),
        endDate: new Date(),
      });
      const retrieved = manager.getFeature(feature.id);

      expect(retrieved).toBe(feature);
    });

    it('should return null for non-existent feature', () => {
      const retrieved = manager.getFeature('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  // ============================================
  // Property-Based Tests
  // ============================================

  describe('Property-Based Tests', () => {
    // Feature: roadmap-visualizer, Property 1: CRUD Operations Maintain Data Integrity
    // Validates: Requirements 1.1, 1.2, 1.3
    it('should maintain data integrity when creating roadmap items', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary theme data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          // Generate arbitrary product data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          // Generate arbitrary feature data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          (themeData, productData, featureData) => {
            const manager = new RoadmapManager();

            // Test Theme Creation (Requirement 1.1)
            const theme = manager.createTheme(themeData.name, themeData.description);

            // Verify theme has unique ID
            expect(theme.id).toBeDefined();
            expect(typeof theme.id).toBe('string');
            expect(theme.id.length).toBeGreaterThan(0);

            // Verify all specified properties are correctly set
            expect(theme.name).toBe(themeData.name);
            expect(theme.description).toBe(themeData.description);
            expect(theme.products).toEqual([]);
            expect(theme.collapsed).toBe(false);

            // Verify theme exists in roadmap
            const roadmap = manager.getRoadmap();
            expect(roadmap.themes).toContain(theme);
            expect(manager.getTheme(theme.id)).toBe(theme);

            // Test Product Creation (Requirement 1.2)
            const product = manager.createProduct(theme.id, productData);

            // Verify product has unique ID (different from theme)
            expect(product.id).toBeDefined();
            expect(typeof product.id).toBe('string');
            expect(product.id.length).toBeGreaterThan(0);
            expect(product.id).not.toBe(theme.id);

            // Verify all specified properties are correctly set
            expect(product.themeId).toBe(theme.id);
            expect(product.name).toBe(productData.name);
            expect(product.description).toBe(productData.description);
            expect(product.startDate).toEqual(productData.startDate);
            expect(product.endDate).toEqual(productData.endDate);
            expect(product.features).toEqual([]);
            expect(product.collapsed).toBe(false);

            // Verify product exists in roadmap and is associated with theme
            const updatedTheme = manager.getTheme(theme.id);
            expect(updatedTheme?.products).toContain(product);
            expect(manager.getProduct(product.id)).toBe(product);

            // Test Feature Creation (Requirement 1.3)
            const feature = manager.createFeature(product.id, featureData);

            // Verify feature has unique ID (different from theme and product)
            expect(feature.id).toBeDefined();
            expect(typeof feature.id).toBe('string');
            expect(feature.id.length).toBeGreaterThan(0);
            expect(feature.id).not.toBe(theme.id);
            expect(feature.id).not.toBe(product.id);

            // Verify all specified properties are correctly set
            expect(feature.productId).toBe(product.id);
            expect(feature.name).toBe(featureData.name);
            expect(feature.description).toBe(featureData.description);
            expect(feature.startDate).toEqual(featureData.startDate);
            expect(feature.endDate).toEqual(featureData.endDate);

            // Verify feature exists in roadmap and is associated with product
            const updatedProduct = manager.getProduct(product.id);
            expect(updatedProduct?.features).toContain(feature);
            expect(manager.getFeature(feature.id)).toBe(feature);

            // Verify all IDs are unique
            const allIds = [theme.id, product.id, feature.id];
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);

            return true;
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    // Feature: roadmap-visualizer, Property 4: Hierarchy Invariant
    // Validates: Requirements 2.1, 2.5
    it('should maintain hierarchy invariant after any operation', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary operations to perform on the roadmap
          fc.array(
            fc.oneof(
              // Create theme operation
              fc.record({
                type: fc.constant('createTheme' as const),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
              }),
              // Create product operation (requires existing theme)
              fc.record({
                type: fc.constant('createProduct' as const),
                themeIndex: fc.nat(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
                startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              }),
              // Create feature operation (requires existing product)
              fc.record({
                type: fc.constant('createFeature' as const),
                themeIndex: fc.nat(),
                productIndex: fc.nat(),
                name: fc.string({ minLength: 1, maxLength: 50 }),
                description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
                startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              }),
              // Update theme operation
              fc.record({
                type: fc.constant('updateTheme' as const),
                themeIndex: fc.nat(),
                name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                collapsed: fc.option(fc.boolean(), { nil: undefined }),
              }),
              // Update product operation
              fc.record({
                type: fc.constant('updateProduct' as const),
                themeIndex: fc.nat(),
                productIndex: fc.nat(),
                name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                collapsed: fc.option(fc.boolean(), { nil: undefined }),
              }),
              // Update feature operation
              fc.record({
                type: fc.constant('updateFeature' as const),
                themeIndex: fc.nat(),
                productIndex: fc.nat(),
                featureIndex: fc.nat(),
                name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
              }),
              // Delete feature operation
              fc.record({
                type: fc.constant('deleteFeature' as const),
                themeIndex: fc.nat(),
                productIndex: fc.nat(),
                featureIndex: fc.nat(),
              }),
              // Delete product operation
              fc.record({
                type: fc.constant('deleteProduct' as const),
                themeIndex: fc.nat(),
                productIndex: fc.nat(),
              }),
              // Delete theme operation
              fc.record({
                type: fc.constant('deleteTheme' as const),
                themeIndex: fc.nat(),
              })
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (operations) => {
            const manager = new RoadmapManager();

            // Execute all operations
            for (const op of operations) {
              try {
                switch (op.type) {
                  case 'createTheme':
                    manager.createTheme(op.name, op.description);
                    break;

                  case 'createProduct': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      manager.createProduct(theme.id, {
                        name: op.name,
                        description: op.description,
                        startDate: op.startDate,
                        endDate: op.endDate,
                      });
                    }
                    break;
                  }

                  case 'createFeature': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      if (theme.products.length > 0) {
                        const productIndex = op.productIndex % theme.products.length;
                        const product = theme.products[productIndex];
                        manager.createFeature(product.id, {
                          name: op.name,
                          description: op.description,
                          startDate: op.startDate,
                          endDate: op.endDate,
                        });
                      }
                    }
                    break;
                  }

                  case 'updateTheme': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      const updates: Partial<Theme> = {};
                      if (op.name !== undefined) updates.name = op.name;
                      if (op.collapsed !== undefined) updates.collapsed = op.collapsed;
                      manager.updateTheme(theme.id, updates);
                    }
                    break;
                  }

                  case 'updateProduct': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      if (theme.products.length > 0) {
                        const productIndex = op.productIndex % theme.products.length;
                        const product = theme.products[productIndex];
                        const updates: Partial<Product> = {};
                        if (op.name !== undefined) updates.name = op.name;
                        if (op.collapsed !== undefined) updates.collapsed = op.collapsed;
                        manager.updateProduct(product.id, updates);
                      }
                    }
                    break;
                  }

                  case 'updateFeature': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      if (theme.products.length > 0) {
                        const productIndex = op.productIndex % theme.products.length;
                        const product = theme.products[productIndex];
                        if (product.features.length > 0) {
                          const featureIndex = op.featureIndex % product.features.length;
                          const feature = product.features[featureIndex];
                          const updates: Partial<Feature> = {};
                          if (op.name !== undefined) updates.name = op.name;
                          manager.updateFeature(feature.id, updates);
                        }
                      }
                    }
                    break;
                  }

                  case 'deleteFeature': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      if (theme.products.length > 0) {
                        const productIndex = op.productIndex % theme.products.length;
                        const product = theme.products[productIndex];
                        if (product.features.length > 0) {
                          const featureIndex = op.featureIndex % product.features.length;
                          const feature = product.features[featureIndex];
                          manager.deleteFeature(feature.id);
                        }
                      }
                    }
                    break;
                  }

                  case 'deleteProduct': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      if (theme.products.length > 0) {
                        const productIndex = op.productIndex % theme.products.length;
                        const product = theme.products[productIndex];
                        manager.deleteProduct(product.id);
                      }
                    }
                    break;
                  }

                  case 'deleteTheme': {
                    const roadmap = manager.getRoadmap();
                    if (roadmap.themes.length > 0) {
                      const themeIndex = op.themeIndex % roadmap.themes.length;
                      const theme = roadmap.themes[themeIndex];
                      manager.deleteTheme(theme.id);
                    }
                    break;
                  }
                }
              } catch (error) {
                // Operations may fail (e.g., trying to access non-existent items)
                // This is expected and should not break the test
              }
            }

            // Verify hierarchy invariant
            const roadmap = manager.getRoadmap();

            // 1. Roadmap must have themes array
            expect(Array.isArray(roadmap.themes)).toBe(true);

            // 2. Each theme must have products array and valid structure
            for (const theme of roadmap.themes) {
              expect(theme.id).toBeDefined();
              expect(typeof theme.name).toBe('string');
              expect(Array.isArray(theme.products)).toBe(true);
              expect(typeof theme.collapsed).toBe('boolean');

              // 3. Each product must have features array and reference parent theme
              for (const product of theme.products) {
                expect(product.id).toBeDefined();
                expect(typeof product.name).toBe('string');
                expect(product.themeId).toBe(theme.id); // Parent reference is correct
                expect(Array.isArray(product.features)).toBe(true);
                expect(typeof product.collapsed).toBe('boolean');
                expect(product.startDate).toBeInstanceOf(Date);
                expect(product.endDate).toBeInstanceOf(Date);

                // 4. Each feature must reference parent product
                for (const feature of product.features) {
                  expect(feature.id).toBeDefined();
                  expect(typeof feature.name).toBe('string');
                  expect(feature.productId).toBe(product.id); // Parent reference is correct
                  expect(feature.startDate).toBeInstanceOf(Date);
                  expect(feature.endDate).toBeInstanceOf(Date);
                }
              }
            }

            // 5. Verify bidirectional consistency: all products can be found via getProduct
            for (const theme of roadmap.themes) {
              for (const product of theme.products) {
                const retrievedProduct = manager.getProduct(product.id);
                expect(retrievedProduct).toBe(product);
                expect(retrievedProduct?.themeId).toBe(theme.id);
              }
            }

            // 6. Verify bidirectional consistency: all features can be found via getFeature
            for (const theme of roadmap.themes) {
              for (const product of theme.products) {
                for (const feature of product.features) {
                  const retrievedFeature = manager.getFeature(feature.id);
                  expect(retrievedFeature).toBe(feature);
                  expect(retrievedFeature?.productId).toBe(product.id);
                }
              }
            }

            // 7. Verify no orphaned products (all products belong to a theme)
            const allProductIds = new Set<string>();
            for (const theme of roadmap.themes) {
              for (const product of theme.products) {
                allProductIds.add(product.id);
              }
            }

            // 8. Verify no orphaned features (all features belong to a product)
            const allFeatureIds = new Set<string>();
            for (const theme of roadmap.themes) {
              for (const product of theme.products) {
                for (const feature of product.features) {
                  allFeatureIds.add(feature.id);
                }
              }
            }

            // The hierarchy is valid if we reach this point
            return true;
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    // Feature: roadmap-visualizer, Property 2: Updates Persist Correctly
    // Validates: Requirements 1.4
    it('should persist updates correctly for all roadmap items', () => {
      fc.assert(
        fc.property(
          // Generate initial theme data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          // Generate initial product data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          // Generate initial feature data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          // Generate update data for theme
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
            endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
            collapsed: fc.option(fc.boolean(), { nil: undefined }),
          }),
          // Generate update data for product
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
            endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
            collapsed: fc.option(fc.boolean(), { nil: undefined }),
          }),
          // Generate update data for feature
          fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
            endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
          }),
          (initialTheme, initialProduct, initialFeature, themeUpdates, productUpdates, featureUpdates) => {
            const manager = new RoadmapManager();

            // Create initial items
            const theme = manager.createTheme(initialTheme.name, initialTheme.description);
            const product = manager.createProduct(theme.id, initialProduct);
            const feature = manager.createFeature(product.id, initialFeature);

            // Store original IDs
            const originalThemeId = theme.id;
            const originalProductId = product.id;
            const originalFeatureId = feature.id;

            // Test Theme Update
            const updatedTheme = manager.updateTheme(theme.id, themeUpdates);

            // Verify ID is maintained
            expect(updatedTheme.id).toBe(originalThemeId);

            // Verify updates are reflected
            if (themeUpdates.name !== undefined) {
              expect(updatedTheme.name).toBe(themeUpdates.name);
            } else {
              expect(updatedTheme.name).toBe(initialTheme.name);
            }

            if (themeUpdates.description !== undefined) {
              expect(updatedTheme.description).toBe(themeUpdates.description);
            } else {
              expect(updatedTheme.description).toBe(initialTheme.description);
            }

            if (themeUpdates.startDate !== undefined) {
              expect(updatedTheme.startDate).toEqual(themeUpdates.startDate);
            }

            if (themeUpdates.endDate !== undefined) {
              expect(updatedTheme.endDate).toEqual(themeUpdates.endDate);
            }

            if (themeUpdates.collapsed !== undefined) {
              expect(updatedTheme.collapsed).toBe(themeUpdates.collapsed);
            } else {
              expect(updatedTheme.collapsed).toBe(false);
            }

            // Verify hierarchy relationships are maintained
            expect(updatedTheme.products).toContain(product);
            expect(manager.getTheme(originalThemeId)).toBe(updatedTheme);

            // Test Product Update
            const updatedProduct = manager.updateProduct(product.id, productUpdates);

            // Verify ID is maintained
            expect(updatedProduct.id).toBe(originalProductId);

            // Verify parent relationship is maintained
            expect(updatedProduct.themeId).toBe(originalThemeId);

            // Verify updates are reflected
            if (productUpdates.name !== undefined) {
              expect(updatedProduct.name).toBe(productUpdates.name);
            } else {
              expect(updatedProduct.name).toBe(initialProduct.name);
            }

            if (productUpdates.description !== undefined) {
              expect(updatedProduct.description).toBe(productUpdates.description);
            } else {
              expect(updatedProduct.description).toBe(initialProduct.description);
            }

            if (productUpdates.startDate !== undefined) {
              expect(updatedProduct.startDate).toEqual(productUpdates.startDate);
            } else {
              expect(updatedProduct.startDate).toEqual(initialProduct.startDate);
            }

            if (productUpdates.endDate !== undefined) {
              expect(updatedProduct.endDate).toEqual(productUpdates.endDate);
            } else {
              expect(updatedProduct.endDate).toEqual(initialProduct.endDate);
            }

            if (productUpdates.collapsed !== undefined) {
              expect(updatedProduct.collapsed).toBe(productUpdates.collapsed);
            } else {
              expect(updatedProduct.collapsed).toBe(false);
            }

            // Verify hierarchy relationships are maintained
            expect(updatedProduct.features).toContain(feature);
            expect(manager.getProduct(originalProductId)).toBe(updatedProduct);
            const themeAfterProductUpdate = manager.getTheme(originalThemeId);
            expect(themeAfterProductUpdate?.products).toContain(updatedProduct);

            // Test Feature Update
            const updatedFeature = manager.updateFeature(feature.id, featureUpdates);

            // Verify ID is maintained
            expect(updatedFeature.id).toBe(originalFeatureId);

            // Verify parent relationship is maintained
            expect(updatedFeature.productId).toBe(originalProductId);

            // Verify updates are reflected
            if (featureUpdates.name !== undefined) {
              expect(updatedFeature.name).toBe(featureUpdates.name);
            } else {
              expect(updatedFeature.name).toBe(initialFeature.name);
            }

            if (featureUpdates.description !== undefined) {
              expect(updatedFeature.description).toBe(featureUpdates.description);
            } else {
              expect(updatedFeature.description).toBe(initialFeature.description);
            }

            if (featureUpdates.startDate !== undefined) {
              expect(updatedFeature.startDate).toEqual(featureUpdates.startDate);
            } else {
              expect(updatedFeature.startDate).toEqual(initialFeature.startDate);
            }

            if (featureUpdates.endDate !== undefined) {
              expect(updatedFeature.endDate).toEqual(featureUpdates.endDate);
            } else {
              expect(updatedFeature.endDate).toEqual(initialFeature.endDate);
            }

            // Verify hierarchy relationships are maintained
            expect(manager.getFeature(originalFeatureId)).toBe(updatedFeature);
            const productAfterFeatureUpdate = manager.getProduct(originalProductId);
            expect(productAfterFeatureUpdate?.features).toContain(updatedFeature);

            // Verify the entire hierarchy is still intact
            const roadmap = manager.getRoadmap();
            const finalTheme = roadmap.themes.find(t => t.id === originalThemeId);
            expect(finalTheme).toBeDefined();
            const finalProduct = finalTheme?.products.find(p => p.id === originalProductId);
            expect(finalProduct).toBeDefined();
            const finalFeature = finalProduct?.features.find(f => f.id === originalFeatureId);
            expect(finalFeature).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    // Feature: roadmap-visualizer, Property 3: Cascading Deletion
    // Validates: Requirements 1.5
    it('should cascade delete all descendants when deleting a roadmap item', () => {
      fc.assert(
        fc.property(
          // Generate a hierarchy structure to test deletion at different levels
          fc.record({
            themes: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 50 }),
                description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
                products: fc.array(
                  fc.record({
                    name: fc.string({ minLength: 1, maxLength: 50 }),
                    description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
                    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                    endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                    features: fc.array(
                      fc.record({
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
                        startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                        endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                      }),
                      { minLength: 0, maxLength: 3 }
                    ),
                  }),
                  { minLength: 0, maxLength: 3 }
                ),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            deleteLevel: fc.constantFrom('theme', 'product', 'feature'),
            themeIndex: fc.nat(),
            productIndex: fc.nat(),
            featureIndex: fc.nat(),
          }),
          (testData) => {
            const manager = new RoadmapManager();

            // Build the hierarchy
            const createdThemes = testData.themes.map(themeData => {
              const theme = manager.createTheme(themeData.name, themeData.description);
              const createdProducts = themeData.products.map(productData => {
                const product = manager.createProduct(theme.id, {
                  name: productData.name,
                  description: productData.description,
                  startDate: productData.startDate,
                  endDate: productData.endDate,
                });
                const createdFeatures = productData.features.map(featureData => {
                  return manager.createFeature(product.id, {
                    name: featureData.name,
                    description: featureData.description,
                    startDate: featureData.startDate,
                    endDate: featureData.endDate,
                  });
                });
                return { product, features: createdFeatures };
              });
              return { theme, products: createdProducts };
            });

            // Get initial roadmap state
            const initialRoadmap = manager.getRoadmap();
            const initialThemeCount = initialRoadmap.themes.length;

            // Collect all IDs before deletion
            const allThemeIds = new Set<string>();
            const allProductIds = new Set<string>();
            const allFeatureIds = new Set<string>();

            for (const { theme, products } of createdThemes) {
              allThemeIds.add(theme.id);
              for (const { product, features } of products) {
                allProductIds.add(product.id);
                for (const feature of features) {
                  allFeatureIds.add(feature.id);
                }
              }
            }

            // Perform deletion based on deleteLevel
            let deletedThemeId: string | null = null;
            let deletedProductId: string | null = null;
            let deletedFeatureId: string | null = null;
            let expectedDeletedProductIds: Set<string> = new Set();
            let expectedDeletedFeatureIds: Set<string> = new Set();
            let unrelatedThemeIds: Set<string> = new Set();
            let unrelatedProductIds: Set<string> = new Set();
            let unrelatedFeatureIds: Set<string> = new Set();

            if (testData.deleteLevel === 'theme' && createdThemes.length > 0) {
              // Delete a theme and expect all its products and features to be deleted
              const themeIndex = testData.themeIndex % createdThemes.length;
              const { theme, products } = createdThemes[themeIndex];
              deletedThemeId = theme.id;

              // Collect IDs that should be deleted
              for (const { product, features } of products) {
                expectedDeletedProductIds.add(product.id);
                for (const feature of features) {
                  expectedDeletedFeatureIds.add(feature.id);
                }
              }

              // Collect unrelated IDs that should remain
              for (let i = 0; i < createdThemes.length; i++) {
                if (i !== themeIndex) {
                  const { theme: otherTheme, products: otherProducts } = createdThemes[i];
                  unrelatedThemeIds.add(otherTheme.id);
                  for (const { product: otherProduct, features: otherFeatures } of otherProducts) {
                    unrelatedProductIds.add(otherProduct.id);
                    for (const otherFeature of otherFeatures) {
                      unrelatedFeatureIds.add(otherFeature.id);
                    }
                  }
                }
              }

              manager.deleteTheme(theme.id);

            } else if (testData.deleteLevel === 'product' && createdThemes.length > 0) {
              // Delete a product and expect all its features to be deleted
              const themeIndex = testData.themeIndex % createdThemes.length;
              const { theme, products } = createdThemes[themeIndex];

              if (products.length > 0) {
                const productIndex = testData.productIndex % products.length;
                const { product, features } = products[productIndex];
                deletedProductId = product.id;

                // Collect IDs that should be deleted
                for (const feature of features) {
                  expectedDeletedFeatureIds.add(feature.id);
                }

                // Collect unrelated IDs that should remain
                for (const { theme: otherTheme, products: otherProducts } of createdThemes) {
                  unrelatedThemeIds.add(otherTheme.id);
                  for (const { product: otherProduct, features: otherFeatures } of otherProducts) {
                    if (otherProduct.id !== product.id) {
                      unrelatedProductIds.add(otherProduct.id);
                      for (const otherFeature of otherFeatures) {
                        unrelatedFeatureIds.add(otherFeature.id);
                      }
                    }
                  }
                }

                manager.deleteProduct(product.id);
              }

            } else if (testData.deleteLevel === 'feature' && createdThemes.length > 0) {
              // Delete a feature (no cascading expected)
              const themeIndex = testData.themeIndex % createdThemes.length;
              const { theme, products } = createdThemes[themeIndex];

              if (products.length > 0) {
                const productIndex = testData.productIndex % products.length;
                const { product, features } = products[productIndex];

                if (features.length > 0) {
                  const featureIndex = testData.featureIndex % features.length;
                  const feature = features[featureIndex];
                  deletedFeatureId = feature.id;

                  // Collect unrelated IDs that should remain
                  for (const { theme: otherTheme, products: otherProducts } of createdThemes) {
                    unrelatedThemeIds.add(otherTheme.id);
                    for (const { product: otherProduct, features: otherFeatures } of otherProducts) {
                      unrelatedProductIds.add(otherProduct.id);
                      for (const otherFeature of otherFeatures) {
                        if (otherFeature.id !== feature.id) {
                          unrelatedFeatureIds.add(otherFeature.id);
                        }
                      }
                    }
                  }

                  manager.deleteFeature(feature.id);
                }
              }
            }

            // Verify deletion results
            const finalRoadmap = manager.getRoadmap();

            // Verify deleted items are removed
            if (deletedThemeId) {
              expect(manager.getTheme(deletedThemeId)).toBeNull();
              expect(finalRoadmap.themes.find(t => t.id === deletedThemeId)).toBeUndefined();
            }

            if (deletedProductId) {
              expect(manager.getProduct(deletedProductId)).toBeNull();
            }

            if (deletedFeatureId) {
              expect(manager.getFeature(deletedFeatureId)).toBeNull();
            }

            // Verify cascaded deletions
            for (const productId of expectedDeletedProductIds) {
              expect(manager.getProduct(productId)).toBeNull();
            }

            for (const featureId of expectedDeletedFeatureIds) {
              expect(manager.getFeature(featureId)).toBeNull();
            }

            // Verify unrelated items remain
            for (const themeId of unrelatedThemeIds) {
              expect(manager.getTheme(themeId)).not.toBeNull();
            }

            for (const productId of unrelatedProductIds) {
              expect(manager.getProduct(productId)).not.toBeNull();
            }

            for (const featureId of unrelatedFeatureIds) {
              expect(manager.getFeature(featureId)).not.toBeNull();
            }

            // Verify hierarchy integrity is maintained
            for (const theme of finalRoadmap.themes) {
              for (const product of theme.products) {
                expect(product.themeId).toBe(theme.id);
                for (const feature of product.features) {
                  expect(feature.productId).toBe(product.id);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });
  });
});
