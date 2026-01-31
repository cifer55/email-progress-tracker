/**
 * Service for importing CSV data into the roadmap
 */

import { ParsedCSVData } from './CSVParserService';
import { RoadmapManager } from './RoadmapManager';
import { Roadmap, Theme, Product } from '../models';

export interface ImportSummary {
  featuresToCreate: number;
  themesToCreate: number;
  productsToCreate: number;
  existingProducts: number;
}

export interface ImportResult {
  success: boolean;
  featuresCreated: number;
  themesCreated: number;
  productsCreated: number;
  errors: string[];
}

export class CSVImportService {
  private roadmapManager: RoadmapManager;

  constructor(roadmapManager: RoadmapManager) {
    this.roadmapManager = roadmapManager;
  }

  /**
   * Analyze CSV data to determine what will be created
   * @param data The parsed CSV data
   * @param roadmap The current roadmap
   * @returns Summary of what will be imported
   */
  analyzeImport(data: ParsedCSVData, roadmap: Roadmap): ImportSummary {
    const uniqueThemes = new Set<string>();
    const uniqueProducts = new Map<string, Set<string>>(); // theme -> products
    const existingProducts = new Set<string>();

    // Collect unique themes and products from CSV
    for (const row of data.rows) {
      uniqueThemes.add(row.themeName);

      if (!uniqueProducts.has(row.themeName)) {
        uniqueProducts.set(row.themeName, new Set());
      }
      uniqueProducts.get(row.themeName)!.add(row.productName);
    }

    // Count existing themes and products
    let themesToCreate = 0;
    let productsToCreate = 0;

    for (const themeName of uniqueThemes) {
      const existingTheme = this.findThemeByName(roadmap, themeName);

      if (!existingTheme) {
        themesToCreate++;
        // All products in this theme will be new
        productsToCreate += uniqueProducts.get(themeName)!.size;
      } else {
        // Check which products already exist
        const productNames = uniqueProducts.get(themeName)!;
        for (const productName of productNames) {
          const existingProduct = this.findProductByName(existingTheme, productName);
          if (existingProduct) {
            existingProducts.add(`${themeName}::${productName}`);
          } else {
            productsToCreate++;
          }
        }
      }
    }

    return {
      featuresToCreate: data.totalRows,
      themesToCreate,
      productsToCreate,
      existingProducts: existingProducts.size
    };
  }

  /**
   * Execute the import of CSV data into the roadmap
   * @param data The parsed CSV data
   * @param roadmap The current roadmap
   * @param onProgress Optional callback for progress updates
   * @returns Result of the import operation
   */
  async executeImport(
    data: ParsedCSVData,
    roadmap: Roadmap,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      featuresCreated: 0,
      themesCreated: 0,
      productsCreated: 0,
      errors: []
    };

    try {
      const themeCache = new Map<string, Theme>();
      const productCache = new Map<string, Product>();

      // Process each row
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];

        try {
          // Find or create theme
          let theme = themeCache.get(row.themeName);
          if (!theme) {
            theme = this.findThemeByName(roadmap, row.themeName);
            if (!theme) {
              theme = this.roadmapManager.createTheme(row.themeName);
              result.themesCreated++;
            }
            themeCache.set(row.themeName, theme);
          }

          // Find or create product
          const productKey = `${row.themeName}::${row.productName}`;
          let product = productCache.get(productKey);
          if (!product) {
            product = this.findProductByName(theme, row.productName);
            if (!product) {
              // Create product with temporary dates (will be updated later)
              product = this.roadmapManager.createProduct(theme.id, {
                name: row.productName,
                startDate: this.parseDate(row.startDate),
                endDate: this.parseDate(row.endDate)
              });
              result.productsCreated++;
            }
            productCache.set(productKey, product);
          }

          // Create feature
          this.roadmapManager.createFeature(product.id, {
            name: row.featureName,
            startDate: this.parseDate(row.startDate),
            endDate: this.parseDate(row.endDate)
          });
          result.featuresCreated++;

          // Update progress
          if (onProgress) {
            const progress = ((i + 1) / data.rows.length) * 100;
            onProgress(progress);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Row ${row.rowNumber}: ${errorMessage}`);
        }
      }

      // Update product date ranges based on their features
      for (const product of productCache.values()) {
        this.updateProductDateRange(product);
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Import failed: ${errorMessage}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Find a theme by name (case-sensitive)
   * @param roadmap The roadmap to search
   * @param name The theme name
   * @returns The theme or undefined if not found
   */
  private findThemeByName(roadmap: Roadmap, name: string): Theme | undefined {
    return roadmap.themes.find(theme => theme.name === name);
  }

  /**
   * Find a product by name within a theme (case-sensitive)
   * @param theme The theme to search
   * @param name The product name
   * @returns The product or undefined if not found
   */
  private findProductByName(theme: Theme, name: string): Product | undefined {
    return theme.products.find(product => product.name === name);
  }

  /**
   * Parse a date string into a Date object
   * @param dateString The date string to parse
   * @returns Date object
   */
  private parseDate(dateString: string): Date {
    const trimmed = dateString.trim();

    // Try YYYY-MM-DD format
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(trimmed)) {
      return new Date(trimmed);
    }

    // Try MM/DD/YYYY format
    const usRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (usRegex.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return new Date(year, month - 1, day);
    }

    throw new Error(`Invalid date format: ${dateString}`);
  }

  /**
   * Update product date range based on its features
   * @param product The product to update
   */
  private updateProductDateRange(product: Product): void {
    if (product.features.length === 0) {
      return;
    }

    let minDate = product.features[0].startDate;
    let maxDate = product.features[0].endDate;

    for (const feature of product.features) {
      if (feature.startDate < minDate) {
        minDate = feature.startDate;
      }
      if (feature.endDate > maxDate) {
        maxDate = feature.endDate;
      }
    }

    this.roadmapManager.updateProduct(product.id, {
      startDate: minDate,
      endDate: maxDate
    });
  }
}
