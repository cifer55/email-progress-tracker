/**
 * RoadmapManager Service
 * Manages CRUD operations for roadmap items (themes, products, features)
 */

import {
  Roadmap,
  Theme,
  Product,
  Feature,
  ProductData,
  FeatureData,
  generateId,
} from '../models';

export class RoadmapManager {
  private roadmap: Roadmap;

  constructor(roadmap?: Roadmap) {
    this.roadmap = roadmap || {
      id: generateId(),
      name: 'My Roadmap',
      themes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get the current roadmap
   */
  getRoadmap(): Roadmap {
    return this.roadmap;
  }

  /**
   * Get a theme by ID
   */
  getTheme(id: string): Theme | null {
    return this.roadmap.themes.find((theme) => theme.id === id) || null;
  }

  /**
   * Get a product by ID
   */
  getProduct(id: string): Product | null {
    for (const theme of this.roadmap.themes) {
      const product = theme.products.find((p) => p.id === id);
      if (product) return product;
    }
    return null;
  }

  /**
   * Get a feature by ID
   */
  getFeature(id: string): Feature | null {
    for (const theme of this.roadmap.themes) {
      for (const product of theme.products) {
        const feature = product.features.find((f) => f.id === id);
        if (feature) return feature;
      }
    }
    return null;
  }

  // ============================================
  // Theme CRUD Operations
  // ============================================

  /**
   * Create a new theme
   * Requirements: 1.1
   */
  createTheme(name: string, description?: string): Theme {
    const theme: Theme = {
      id: generateId(),
      name,
      description,
      products: [],
      collapsed: false,
    };

    this.roadmap.themes.push(theme);
    this.roadmap.updatedAt = new Date();

    return theme;
  }

  /**
   * Update an existing theme
   * Requirements: 1.4
   */
  updateTheme(id: string, updates: Partial<Theme>): Theme {
    const theme = this.getTheme(id);
    if (!theme) {
      throw new Error(`Theme with id ${id} not found`);
    }

    // Apply updates (excluding id and products to maintain integrity)
    if (updates.name !== undefined) theme.name = updates.name;
    if (updates.description !== undefined) theme.description = updates.description;
    if (updates.startDate !== undefined) theme.startDate = updates.startDate;
    if (updates.endDate !== undefined) theme.endDate = updates.endDate;
    if (updates.collapsed !== undefined) theme.collapsed = updates.collapsed;

    this.roadmap.updatedAt = new Date();

    return theme;
  }

  /**
   * Delete a theme and all its products and features (cascading delete)
   * Requirements: 1.5
   */
  deleteTheme(id: string): void {
    const index = this.roadmap.themes.findIndex((theme) => theme.id === id);
    if (index === -1) {
      throw new Error(`Theme with id ${id} not found`);
    }

    // Remove the theme (this automatically removes all products and features)
    this.roadmap.themes.splice(index, 1);
    this.roadmap.updatedAt = new Date();
  }

  // ============================================
  // Product CRUD Operations
  // ============================================

  /**
   * Create a new product within a theme
   * Requirements: 1.2
   */
  createProduct(themeId: string, data: ProductData): Product {
    const theme = this.getTheme(themeId);
    if (!theme) {
      throw new Error(`Theme with id ${themeId} not found`);
    }

    const product: Product = {
      id: generateId(),
      themeId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      features: [],
      collapsed: false,
    };

    theme.products.push(product);
    this.roadmap.updatedAt = new Date();

    return product;
  }

  /**
   * Update an existing product
   * Requirements: 1.4
   */
  updateProduct(id: string, updates: Partial<Product>): Product {
    const product = this.getProduct(id);
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }

    // Apply updates (excluding id, themeId, and features to maintain integrity)
    if (updates.name !== undefined) product.name = updates.name;
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.startDate !== undefined) product.startDate = updates.startDate;
    if (updates.endDate !== undefined) product.endDate = updates.endDate;
    if (updates.collapsed !== undefined) product.collapsed = updates.collapsed;

    this.roadmap.updatedAt = new Date();

    return product;
  }

  /**
   * Delete a product and all its features (cascading delete)
   * Requirements: 1.5
   */
  deleteProduct(id: string): void {
    for (const theme of this.roadmap.themes) {
      const index = theme.products.findIndex((product) => product.id === id);
      if (index !== -1) {
        // Remove the product (this automatically removes all features)
        theme.products.splice(index, 1);
        this.roadmap.updatedAt = new Date();
        return;
      }
    }

    throw new Error(`Product with id ${id} not found`);
  }

  // ============================================
  // Feature CRUD Operations
  // ============================================

  /**
   * Create a new feature within a product
   * Requirements: 1.3
   */
  createFeature(productId: string, data: FeatureData): Feature {
    const product = this.getProduct(productId);
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }

    const feature: Feature = {
      id: generateId(),
      productId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      progress: data.progress,
    };

    product.features.push(feature);
    this.roadmap.updatedAt = new Date();

    return feature;
  }

  /**
   * Update an existing feature
   * Requirements: 1.4
   */
  updateFeature(id: string, updates: Partial<Feature>): Feature {
    const feature = this.getFeature(id);
    if (!feature) {
      throw new Error(`Feature with id ${id} not found`);
    }

    // Apply updates (excluding id and productId to maintain integrity)
    if (updates.name !== undefined) feature.name = updates.name;
    if (updates.description !== undefined) feature.description = updates.description;
    if (updates.startDate !== undefined) feature.startDate = updates.startDate;
    if (updates.endDate !== undefined) feature.endDate = updates.endDate;
    if (updates.progress !== undefined) feature.progress = updates.progress;

    this.roadmap.updatedAt = new Date();

    return feature;
  }

  /**
   * Delete a feature
   * Requirements: 1.5
   */
  deleteFeature(id: string): void {
    for (const theme of this.roadmap.themes) {
      for (const product of theme.products) {
        const index = product.features.findIndex((feature) => feature.id === id);
        if (index !== -1) {
          product.features.splice(index, 1);
          this.roadmap.updatedAt = new Date();
          return;
        }
      }
    }

    throw new Error(`Feature with id ${id} not found`);
  }

  /**
   * Move a feature to a different product
   * Requirements: 1.4
   */
  moveFeature(featureId: string, newProductId: string): Feature {
    // Find the feature
    const feature = this.getFeature(featureId);
    if (!feature) {
      throw new Error(`Feature with id ${featureId} not found`);
    }

    // Check if already in the target product
    if (feature.productId === newProductId) {
      return feature;
    }

    // Find the new product
    const newProduct = this.getProduct(newProductId);
    if (!newProduct) {
      throw new Error(`Product with id ${newProductId} not found`);
    }

    // Remove from old product
    for (const theme of this.roadmap.themes) {
      for (const product of theme.products) {
        const index = product.features.findIndex((f) => f.id === featureId);
        if (index !== -1) {
          product.features.splice(index, 1);
          break;
        }
      }
    }

    // Update feature's productId
    feature.productId = newProductId;

    // Add to new product
    newProduct.features.push(feature);

    this.roadmap.updatedAt = new Date();

    return feature;
  }
}
