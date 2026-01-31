/**
 * Core data models for the Roadmap Visualizer
 */

/**
 * Feature: A discrete capability or enhancement within a product
 */
export interface Feature {
  id: string;
  productId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  // Progress tracking fields (Requirements: 5.1, 5.2, 5.3, 5.4)
  progress?: {
    status: string;
    percentComplete: number;
    lastUpdateTime?: Date;
    lastUpdateSummary?: string;
  };
}

/**
 * Product: A specific product or major initiative within a theme
 */
export interface Product {
  id: string;
  themeId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  features: Feature[];
  collapsed: boolean;
}

/**
 * Theme: A high-level strategic category that groups related products
 */
export interface Theme {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  products: Product[];
  collapsed: boolean;
}

/**
 * Roadmap: The complete roadmap containing all themes
 */
export interface Roadmap {
  id: string;
  name: string;
  themes: Theme[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Union type for any roadmap item
 */
export type RoadmapItem = Theme | Product | Feature;

/**
 * Data transfer objects for creating new items (without generated fields)
 */
export interface ProductData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}

export interface FeatureData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  progress?: {
    status: string;
    percentComplete: number;
    lastUpdateTime?: Date;
    lastUpdateSummary?: string;
  };
}

/**
 * ID generation utility
 * Generates a unique ID using timestamp and random string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
