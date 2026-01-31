/**
 * ValidationService: Handles validation of dates, hierarchy, and data formats
 */

import { Roadmap, RoadmapItem } from '../models';

/**
 * Validation error types
 */
export enum ValidationErrorType {
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  END_BEFORE_START = 'END_BEFORE_START',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'
}

/**
 * Validation error
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  field?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  message: string;
  field?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * ValidationService class
 */
export class ValidationService {
  /**
   * Validates that end date is not before start date
   * Requirements: 9.1
   */
  validateDates(startDate: Date, endDate: Date): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if end date is before start date
    if (endDate < startDate) {
      errors.push({
        type: ValidationErrorType.END_BEFORE_START,
        message: 'End date cannot be before start date',
        field: 'endDate'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }



  /**
   * Parses date string in supported formats
   * Supports: YYYY-MM-DD and MM/DD/YYYY
   * Requirements: 9.4, 9.5
   */
  parseDate(dateString: string): Date | null {
    // Trim whitespace
    const trimmed = dateString.trim();

    // Try YYYY-MM-DD format
    const iso8601Regex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const iso8601Match = trimmed.match(iso8601Regex);
    
    if (iso8601Match) {
      const year = parseInt(iso8601Match[1], 10);
      const month = parseInt(iso8601Match[2], 10);
      const day = parseInt(iso8601Match[3], 10);
      
      // Validate ranges
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      
      const date = new Date(year, month - 1, day);
      
      // Check if date is valid (handles invalid dates like Feb 31)
      if (date.getFullYear() !== year || 
          date.getMonth() !== month - 1 || 
          date.getDate() !== day) {
        return null;
      }
      
      return date;
    }

    // Try MM/DD/YYYY format
    const usFormatRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const usFormatMatch = trimmed.match(usFormatRegex);
    
    if (usFormatMatch) {
      const month = parseInt(usFormatMatch[1], 10);
      const day = parseInt(usFormatMatch[2], 10);
      const year = parseInt(usFormatMatch[3], 10);
      
      // Validate ranges
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }
      
      const date = new Date(year, month - 1, day);
      
      // Check if date is valid (handles invalid dates like Feb 31)
      if (date.getFullYear() !== year || 
          date.getMonth() !== month - 1 || 
          date.getDate() !== day) {
        return null;
      }
      
      return date;
    }

    // No format matched
    return null;
  }

  /**
   * Validates date format and returns validation result
   * Requirements: 9.4, 9.5
   */
  validateDateFormat(dateString: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const parsedDate = this.parseDate(dateString);

    if (parsedDate === null) {
      errors.push({
        type: ValidationErrorType.INVALID_DATE_FORMAT,
        message: 'Invalid date format. Please use YYYY-MM-DD or MM/DD/YYYY format',
        field: 'date'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates complete roadmap data structure and integrity
   * Requirements: 6.4, 6.5
   */
  validateRoadmap(roadmap: Roadmap): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate roadmap has required fields
    if (!roadmap.id || !roadmap.name || !roadmap.themes || !roadmap.createdAt || !roadmap.updatedAt) {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED_FIELD,
        message: 'Roadmap is missing required fields',
      });
      return { valid: false, errors, warnings };
    }

    // Validate each theme
    for (const theme of roadmap.themes) {
      // Check required fields
      if (!theme.id || !theme.name || !theme.products) {
        errors.push({
          type: ValidationErrorType.MISSING_REQUIRED_FIELD,
          message: `Theme ${theme.id || 'unknown'} is missing required fields`,
        });
        continue;
      }

      // Validate theme dates if present
      if (theme.startDate && theme.endDate) {
        const dateValidation = this.validateDates(theme.startDate, theme.endDate);
        errors.push(...dateValidation.errors);
        warnings.push(...dateValidation.warnings);
      }

      // Validate each product
      for (const product of theme.products) {
        // Check required fields
        if (!product.id || !product.name || !product.startDate || !product.endDate || !product.features) {
          errors.push({
            type: ValidationErrorType.MISSING_REQUIRED_FIELD,
            message: `Product ${product.id || 'unknown'} is missing required fields`,
          });
          continue;
        }

        // Validate product dates
        const productDateValidation = this.validateDates(product.startDate, product.endDate);
        errors.push(...productDateValidation.errors);
        warnings.push(...productDateValidation.warnings);

        // Validate each feature
        for (const feature of product.features) {
          // Check required fields
          if (!feature.id || !feature.name || !feature.startDate || !feature.endDate) {
            errors.push({
              type: ValidationErrorType.MISSING_REQUIRED_FIELD,
              message: `Feature ${feature.id || 'unknown'} is missing required fields`,
            });
            continue;
          }

          // Validate feature dates
          const featureDateValidation = this.validateDates(feature.startDate, feature.endDate);
          errors.push(...featureDateValidation.errors);
          warnings.push(...featureDateValidation.warnings);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
