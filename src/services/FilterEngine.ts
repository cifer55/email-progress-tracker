/**
 * FilterEngine Service
 * Provides filtering capabilities for roadmap data
 */

import { Roadmap, Theme, Product } from '../models';

/**
 * Filter criteria for roadmap filtering
 */
export interface FilterCriteria {
  themeIds?: string[];
  productIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class FilterEngine {
  /**
   * Filter roadmap by selected themes
   * Returns a roadmap containing only the specified themes and their descendants
   * Requirements: 4.1
   */
  filterByThemes(roadmap: Roadmap, themeIds: string[]): Roadmap {
    // If no theme IDs provided, return empty roadmap
    if (!themeIds || themeIds.length === 0) {
      return {
        ...roadmap,
        themes: [],
      };
    }

    // Filter themes to only include those in the themeIds array
    const filteredThemes = roadmap.themes.filter((theme) =>
      themeIds.includes(theme.id)
    );

    return {
      ...roadmap,
      themes: filteredThemes,
    };
  }

  /**
   * Filter roadmap by selected products
   * Returns a roadmap containing only the specified products and their features
   * (including their parent themes for context)
   * Requirements: 4.2
   */
  filterByProducts(roadmap: Roadmap, productIds: string[]): Roadmap {
    // If no product IDs provided, return empty roadmap
    if (!productIds || productIds.length === 0) {
      return {
        ...roadmap,
        themes: [],
      };
    }

    // Filter themes and products
    const filteredThemes: Theme[] = [];

    for (const theme of roadmap.themes) {
      // Find products in this theme that match the filter
      const matchingProducts = theme.products.filter((product) =>
        productIds.includes(product.id)
      );

      // If this theme has matching products, include it with only those products
      if (matchingProducts.length > 0) {
        filteredThemes.push({
          ...theme,
          products: matchingProducts,
        });
      }
    }

    return {
      ...roadmap,
      themes: filteredThemes,
    };
  }

  /**
   * Filter roadmap by date range
   * Returns items that overlap with the specified date range
   * An item overlaps if its start date is before the range end and its end date is after the range start
   * Requirements: 4.3
   */
  filterByDateRange(roadmap: Roadmap, startDate: Date, endDate: Date): Roadmap {
    const filteredThemes: Theme[] = [];

    for (const theme of roadmap.themes) {
      const filteredProducts: Product[] = [];

      for (const product of theme.products) {
        // Check if product overlaps with date range
        if (this.dateRangesOverlap(product.startDate, product.endDate, startDate, endDate)) {
          // Filter features within this product
          const filteredFeatures = product.features.filter((feature) =>
            this.dateRangesOverlap(feature.startDate, feature.endDate, startDate, endDate)
          );

          filteredProducts.push({
            ...product,
            features: filteredFeatures,
          });
        }
      }

      // Include theme if it has matching products or if theme itself has dates that overlap
      if (filteredProducts.length > 0) {
        filteredThemes.push({
          ...theme,
          products: filteredProducts,
        });
      } else if (theme.startDate && theme.endDate) {
        // Check if theme itself overlaps (even if no products match)
        if (this.dateRangesOverlap(theme.startDate, theme.endDate, startDate, endDate)) {
          filteredThemes.push({
            ...theme,
            products: [],
          });
        }
      }
    }

    return {
      ...roadmap,
      themes: filteredThemes,
    };
  }

  /**
   * Apply composite filters to a roadmap
   * Combines all filter types and returns items that match all active filters
   * Requirements: 4.4
   */
  applyFilters(roadmap: Roadmap, filters: FilterCriteria): Roadmap {
    let result = roadmap;

    // Apply theme filter if specified
    if (filters.themeIds && filters.themeIds.length > 0) {
      result = this.filterByThemes(result, filters.themeIds);
    }

    // Apply product filter if specified
    if (filters.productIds && filters.productIds.length > 0) {
      result = this.filterByProducts(result, filters.productIds);
    }

    // Apply date range filter if specified
    if (filters.dateRange) {
      result = this.filterByDateRange(
        result,
        filters.dateRange.start,
        filters.dateRange.end
      );
    }

    return result;
  }

  /**
   * Helper method to check if two date ranges overlap
   * Ranges overlap if: startDate1 < endDate2 AND endDate1 > startDate2
   */
  private dateRangesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }
}
