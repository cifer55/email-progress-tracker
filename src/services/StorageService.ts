/**
 * StorageService
 * Handles persistence of roadmap data to browser LocalStorage
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Roadmap } from '../models';
import { ValidationService, ValidationResult } from './ValidationService';
import { generateId } from '../models';

const STORAGE_KEY = 'roadmap-visualizer-data';
const BACKUP_STORAGE_KEY = 'roadmap-visualizer-data-backup';
const VERSION_KEY = 'roadmap-visualizer-version';
const CURRENT_VERSION = '2.1'; // Increment this when making breaking changes

/**
 * Result of loading data with validation
 */
export interface LoadResult {
  roadmap: Roadmap | null;
  validation: ValidationResult;
  hasBackup: boolean;
}

/**
 * Recovery options for corrupted data
 */
export interface RecoveryOptions {
  useBackup: boolean;
  createEmpty: boolean;
  ignoreValidation: boolean;
}

/**
 * Serializable version of Roadmap with dates as ISO strings
 */
interface SerializedRoadmap {
  id: string;
  name: string;
  themes: Array<{
    id: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    collapsed: boolean;
    products: Array<{
      id: string;
      themeId: string;
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      collapsed: boolean;
      features: Array<{
        id: string;
        productId: string;
        name: string;
        description?: string;
        startDate: string;
        endDate: string;
      }>;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

export class StorageService {
  private validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
  }

  /**
   * Save roadmap to LocalStorage
   * Requirements: 6.1, 6.3
   */
  async save(roadmap: Roadmap): Promise<void> {
    try {
      // Serialize the roadmap (convert dates to ISO strings)
      const serialized = this.serializeRoadmap(roadmap);
      
      // Convert to JSON string
      const jsonString = JSON.stringify(serialized);
      
      // Create backup of existing data before overwriting
      const existingData = localStorage.getItem(STORAGE_KEY);
      if (existingData) {
        localStorage.setItem(BACKUP_STORAGE_KEY, existingData);
      }
      
      // Save to LocalStorage
      localStorage.setItem(STORAGE_KEY, jsonString);
      
      // Save version
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch (error) {
      // Handle storage errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to save roadmap to storage: ${errorMessage}`);
    }
  }

  /**
   * Load roadmap from LocalStorage
   * Requirements: 6.2, 6.3, 6.4, 6.5
   */
  async load(): Promise<Roadmap | null> {
    try {
      // Retrieve from LocalStorage
      const jsonString = localStorage.getItem(STORAGE_KEY);
      
      // Return null if no data exists
      if (!jsonString) {
        return null;
      }

      // Parse JSON
      const serialized = JSON.parse(jsonString) as SerializedRoadmap;
      
      // Deserialize (convert ISO strings back to dates)
      const roadmap = this.deserializeRoadmap(serialized);
      
      // Validate data integrity
      const validationResult = this.validationService.validateRoadmap(roadmap);
      
      if (!validationResult.valid) {
        // Data is invalid - throw error with details
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        throw new Error(`Loaded data is invalid: ${errorMessages}`);
      }
      
      // Return the validated roadmap
      return roadmap;
    } catch (error) {
      // Handle storage errors gracefully
      if (error instanceof SyntaxError) {
        throw new Error('Failed to load roadmap: corrupted data (invalid JSON)');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load roadmap from storage: ${errorMessage}`);
    }
  }

  /**
   * Load roadmap with validation details and recovery options
   * Requirements: 6.4, 6.5
   */
  async loadWithValidation(): Promise<LoadResult> {
    try {
      const hasBackup = localStorage.getItem(BACKUP_STORAGE_KEY) !== null;
      const jsonString = localStorage.getItem(STORAGE_KEY);
      
      // Return null if no data exists
      if (!jsonString) {
        return {
          roadmap: null,
          validation: { valid: true, errors: [], warnings: [] },
          hasBackup
        };
      }

      // Parse JSON first - this must succeed before we check version
      let serialized: SerializedRoadmap;
      try {
        serialized = JSON.parse(jsonString) as SerializedRoadmap;
      } catch (parseError) {
        // JSON parsing failed - corrupted data
        return {
          roadmap: null,
          validation: {
            valid: false,
            errors: [{
              type: 'INVALID_DATA_FORMAT' as any,
              message: 'Failed to parse roadmap data: corrupted JSON'
            }],
            warnings: []
          },
          hasBackup
        };
      }
      
      // Deserialize (convert ISO strings back to dates)
      // Do this BEFORE version check so invalid structure is caught first
      let roadmap: Roadmap;
      try {
        roadmap = this.deserializeRoadmap(serialized);
      } catch (deserializeError) {
        // Deserialization failed - invalid data structure
        return {
          roadmap: null,
          validation: {
            valid: false,
            errors: [{
              type: 'INVALID_DATA_FORMAT' as any,
              message: 'Failed to deserialize roadmap data: invalid structure'
            }],
            warnings: []
          },
          hasBackup
        };
      }
      
      // Now check version compatibility (after successful deserialization)
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      // If there's no version, or version mismatch, clear it
      if (!storedVersion || storedVersion !== CURRENT_VERSION) {
        console.log(`StorageService: Version issue. Stored: ${storedVersion || 'none'}, Current: ${CURRENT_VERSION}`);
        // Clear old data and start fresh
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(BACKUP_STORAGE_KEY);
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        
        return {
          roadmap: null,
          validation: {
            valid: false,
            errors: [{
              type: 'VERSION_MISMATCH' as any,
              message: storedVersion 
                ? `Data version mismatch (stored: ${storedVersion}, current: ${CURRENT_VERSION}). Starting with fresh data.`
                : 'Old data format detected. Starting with fresh data.'
            }],
            warnings: []
          },
          hasBackup: false
        };
      }
      
      // Validate data integrity
      const validationResult = this.validationService.validateRoadmap(roadmap);
      
      // Return roadmap with validation results
      return {
        roadmap: validationResult.valid ? roadmap : null,
        validation: validationResult,
        hasBackup
      };
    } catch (error) {
      // Unexpected error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        roadmap: null,
        validation: {
          valid: false,
          errors: [{
            type: 'STORAGE_ERROR' as any,
            message: `Failed to load roadmap: ${errorMessage}`
          }],
          warnings: []
        },
        hasBackup: false
      };
    }
  }

  /**
   * Load roadmap from backup storage
   * Requirements: 6.5
   */
  async loadFromBackup(): Promise<Roadmap | null> {
    try {
      // Retrieve from backup storage
      const jsonString = localStorage.getItem(BACKUP_STORAGE_KEY);
      
      // Return null if no backup exists
      if (!jsonString) {
        return null;
      }

      // Parse JSON
      const serialized = JSON.parse(jsonString) as SerializedRoadmap;
      
      // Deserialize (convert ISO strings back to dates)
      const roadmap = this.deserializeRoadmap(serialized);
      
      // Validate data integrity
      const validationResult = this.validationService.validateRoadmap(roadmap);
      
      if (!validationResult.valid) {
        // Backup data is also invalid
        const errorMessages = validationResult.errors.map(e => e.message).join('; ');
        throw new Error(`Backup data is invalid: ${errorMessages}`);
      }
      
      // Return the validated roadmap
      return roadmap;
    } catch (error) {
      // Handle errors gracefully
      if (error instanceof SyntaxError) {
        throw new Error('Failed to load backup: corrupted data (invalid JSON)');
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load backup from storage: ${errorMessage}`);
    }
  }

  /**
   * Restore from backup by copying backup to main storage
   * Requirements: 6.5
   */
  async restoreFromBackup(): Promise<void> {
    try {
      const backupData = localStorage.getItem(BACKUP_STORAGE_KEY);
      
      if (!backupData) {
        throw new Error('No backup data available');
      }
      
      // Copy backup to main storage
      localStorage.setItem(STORAGE_KEY, backupData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to restore from backup: ${errorMessage}`);
    }
  }

  /**
   * Create an empty roadmap
   * Requirements: 6.5
   */
  createEmptyRoadmap(): Roadmap {
    return {
      id: generateId(),
      name: 'New Roadmap',
      themes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create a sample roadmap with demo data
   */
  createSampleRoadmap(): Roadmap {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 2, 28);
    const threeMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 3, 28);
    const fourMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 4, 28);
    const fiveMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 5, 28);
    const sixMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 6, 28);

    // Create theme IDs
    const theme1Id = generateId();
    const theme2Id = generateId();

    // Create product IDs
    const product1Id = generateId();
    const product2Id = generateId();
    const product3Id = generateId();
    const product4Id = generateId();

    return {
      id: generateId(),
      name: 'Sample Roadmap',
      themes: [
        {
          id: theme1Id,
          name: 'Customer Experience',
          description: 'Improve overall customer satisfaction',
          collapsed: false,
          products: [
            {
              id: product1Id,
              themeId: theme1Id,
              name: 'Mobile App',
              description: 'Native mobile application',
              startDate: oneMonthAgo,
              endDate: fourMonthsFromNow,
              collapsed: false,
              features: [
                {
                  id: generateId(),
                  productId: product1Id,
                  name: 'User Authentication',
                  description: 'Secure login and registration',
                  startDate: oneMonthAgo,
                  endDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
                },
                {
                  id: generateId(),
                  productId: product1Id,
                  name: 'Push Notifications',
                  description: 'Real-time alerts',
                  startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
                  endDate: twoMonthsFromNow,
                },
                {
                  id: generateId(),
                  productId: product1Id,
                  name: 'Offline Mode',
                  description: 'Work without internet',
                  startDate: twoMonthsFromNow,
                  endDate: fourMonthsFromNow,
                },
              ],
            },
            {
              id: product2Id,
              themeId: theme1Id,
              name: 'Web Portal',
              description: 'Customer self-service portal',
              startDate: now,
              endDate: fiveMonthsFromNow,
              collapsed: false,
              features: [
                {
                  id: generateId(),
                  productId: product2Id,
                  name: 'Dashboard',
                  description: 'Overview of account',
                  startDate: now,
                  endDate: twoMonthsFromNow,
                },
                {
                  id: generateId(),
                  productId: product2Id,
                  name: 'Settings Page',
                  description: 'Manage preferences',
                  startDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
                  endDate: threeMonthsFromNow,
                },
              ],
            },
          ],
        },
        {
          id: theme2Id,
          name: 'Platform Modernization',
          description: 'Upgrade infrastructure and tools',
          collapsed: false,
          products: [
            {
              id: product3Id,
              themeId: theme2Id,
              name: 'API Gateway',
              description: 'Centralized API management',
              startDate: oneMonthAgo,
              endDate: threeMonthsFromNow,
              collapsed: false,
              features: [
                {
                  id: generateId(),
                  productId: product3Id,
                  name: 'Rate Limiting',
                  description: 'Prevent API abuse',
                  startDate: oneMonthAgo,
                  endDate: now,
                },
                {
                  id: generateId(),
                  productId: product3Id,
                  name: 'Authentication',
                  description: 'OAuth 2.0 support',
                  startDate: now,
                  endDate: new Date(now.getFullYear(), now.getMonth() + 2, 15),
                },
              ],
            },
            {
              id: product4Id,
              themeId: theme2Id,
              name: 'Database Migration',
              description: 'Move to cloud database',
              startDate: twoMonthsFromNow,
              endDate: sixMonthsFromNow,
              collapsed: false,
              features: [
                {
                  id: generateId(),
                  productId: product4Id,
                  name: 'Schema Design',
                  description: 'Optimize data model',
                  startDate: twoMonthsFromNow,
                  endDate: threeMonthsFromNow,
                },
                {
                  id: generateId(),
                  productId: product4Id,
                  name: 'Data Migration',
                  description: 'Transfer existing data',
                  startDate: fourMonthsFromNow,
                  endDate: fiveMonthsFromNow,
                },
                {
                  id: generateId(),
                  productId: product4Id,
                  name: 'Performance Testing',
                  description: 'Validate performance',
                  startDate: fiveMonthsFromNow,
                  endDate: sixMonthsFromNow,
                },
              ],
            },
          ],
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Clear all data from LocalStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to clear storage: ${errorMessage}`);
    }
  }

  /**
   * Serialize roadmap to a JSON-compatible format
   * Converts Date objects to ISO strings
   */
  private serializeRoadmap(roadmap: Roadmap): SerializedRoadmap {
    return {
      id: roadmap.id,
      name: roadmap.name,
      themes: roadmap.themes.map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        startDate: theme.startDate?.toISOString(),
        endDate: theme.endDate?.toISOString(),
        collapsed: theme.collapsed,
        products: theme.products.map(product => ({
          id: product.id,
          themeId: product.themeId,
          name: product.name,
          description: product.description,
          startDate: product.startDate.toISOString(),
          endDate: product.endDate.toISOString(),
          collapsed: product.collapsed,
          features: product.features.map(feature => ({
            id: feature.id,
            productId: feature.productId,
            name: feature.name,
            description: feature.description,
            startDate: feature.startDate.toISOString(),
            endDate: feature.endDate.toISOString(),
          })),
        })),
      })),
      createdAt: roadmap.createdAt.toISOString(),
      updatedAt: roadmap.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize roadmap from JSON format
   * Converts ISO strings back to Date objects
   */
  private deserializeRoadmap(serialized: SerializedRoadmap): Roadmap {
    return {
      id: serialized.id,
      name: serialized.name,
      themes: serialized.themes.map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        startDate: theme.startDate ? new Date(theme.startDate) : undefined,
        endDate: theme.endDate ? new Date(theme.endDate) : undefined,
        collapsed: theme.collapsed,
        products: theme.products.map(product => ({
          id: product.id,
          themeId: product.themeId,
          name: product.name,
          description: product.description,
          startDate: new Date(product.startDate),
          endDate: new Date(product.endDate),
          collapsed: product.collapsed,
          features: product.features.map(feature => ({
            id: feature.id,
            productId: feature.productId,
            name: feature.name,
            description: feature.description,
            startDate: new Date(feature.startDate),
            endDate: new Date(feature.endDate),
          })),
        })),
      })),
      createdAt: new Date(serialized.createdAt),
      updatedAt: new Date(serialized.updatedAt),
    };
  }
}
