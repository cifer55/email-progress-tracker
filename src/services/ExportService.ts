/**
 * ExportService
 * Provides export capabilities for roadmap data
 */

import { Roadmap } from '../models';

/**
 * Service for exporting roadmap data in various formats
 */
export class ExportService {
  /**
   * Export roadmap to JSON format
   * Serializes the complete roadmap data structure
   * Requirements: 7.3, 7.5
   * 
   * @param roadmap - The roadmap to export
   * @returns JSON string representation of the roadmap
   */
  exportToJSON(roadmap: Roadmap): string {
    // Create a serializable version of the roadmap
    // Convert Date objects to ISO strings for JSON serialization
    const serializable = this.makeSerializable(roadmap);
    
    // Pretty print with 2-space indentation for readability
    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Export roadmap visualization to PNG format
   * Captures the canvas element as a PNG image
   * Requirements: 7.2
   * 
   * @param canvas - The canvas element containing the Gantt chart
   * @returns Promise resolving to a PNG Blob
   */
  async exportToPNG(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate PNG blob from canvas'));
        }
      }, 'image/png');
    });
  }

  /**
   * Helper method to convert a roadmap to a serializable format
   * Converts Date objects to ISO strings
   */
  private makeSerializable(roadmap: Roadmap): any {
    return {
      id: roadmap.id,
      name: roadmap.name,
      createdAt: roadmap.createdAt.toISOString(),
      updatedAt: roadmap.updatedAt.toISOString(),
      themes: roadmap.themes.map((theme) => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        startDate: theme.startDate?.toISOString(),
        endDate: theme.endDate?.toISOString(),
        collapsed: theme.collapsed,
        products: theme.products.map((product) => ({
          id: product.id,
          themeId: product.themeId,
          name: product.name,
          description: product.description,
          startDate: product.startDate.toISOString(),
          endDate: product.endDate.toISOString(),
          collapsed: product.collapsed,
          features: product.features.map((feature) => ({
            id: feature.id,
            productId: feature.productId,
            name: feature.name,
            description: feature.description,
            startDate: feature.startDate.toISOString(),
            endDate: feature.endDate.toISOString(),
          })),
        })),
      })),
    };
  }
}
