/**
 * Service for validating CSV data before import
 */

import { ParsedCSVData, ParsedCSVRow } from './CSVParserService';

export interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class CSVValidationService {
  /**
   * Validate all rows in parsed CSV data
   * @param data The parsed CSV data to validate
   * @returns Validation result with all errors
   */
  validateCSVData(data: ParsedCSVData): ValidationResult {
    const errors: ValidationError[] = [];

    for (const row of data.rows) {
      const rowErrors = this.validateRow(row);
      errors.push(...rowErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single CSV row
   * @param row The row to validate
   * @returns Array of validation errors for this row
   */
  validateRow(row: ParsedCSVRow): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate Feature Name is not empty
    if (!row.featureName || row.featureName.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'Feature Name',
        message: 'Feature Name is required and cannot be empty'
      });
    }

    // Validate Product Name is not empty
    if (!row.productName || row.productName.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'Product Name',
        message: 'Product Name is required and cannot be empty'
      });
    }

    // Validate Theme Name is not empty
    if (!row.themeName || row.themeName.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'Theme Name',
        message: 'Theme Name is required and cannot be empty'
      });
    }

    // Validate Start Date
    if (!row.startDate || row.startDate.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'Start Date',
        message: 'Start Date is required and cannot be empty'
      });
    } else if (!this.validateDate(row.startDate)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'Start Date',
        message: 'Start Date must be in YYYY-MM-DD or MM/DD/YYYY format'
      });
    }

    // Validate End Date
    if (!row.endDate || row.endDate.trim() === '') {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'End Date',
        message: 'End Date is required and cannot be empty'
      });
    } else if (!this.validateDate(row.endDate)) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'End Date',
        message: 'End Date must be in YYYY-MM-DD or MM/DD/YYYY format'
      });
    }

    // Validate date range (only if both dates are valid)
    if (
      row.startDate &&
      row.endDate &&
      this.validateDate(row.startDate) &&
      this.validateDate(row.endDate)
    ) {
      if (!this.validateDateRange(row.startDate, row.endDate)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'End Date',
          message: 'End Date must be after Start Date'
        });
      }
    }

    return errors;
  }

  /**
   * Validate that a date string is in a valid format
   * @param dateString The date string to validate
   * @returns True if valid, false otherwise
   */
  validateDate(dateString: string): boolean {
    const trimmed = dateString.trim();

    // Check YYYY-MM-DD format
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(trimmed)) {
      const date = new Date(trimmed);
      return !isNaN(date.getTime());
    }

    // Check MM/DD/YYYY format
    const usRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (usRegex.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      // Create date and verify it's valid
      const date = new Date(year, month - 1, day);
      return (
        !isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    }

    return false;
  }

  /**
   * Validate that end date is after start date
   * @param startDate The start date string
   * @param endDate The end date string
   * @returns True if end date is after start date, false otherwise
   */
  validateDateRange(startDate: string, endDate: string): boolean {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);

    if (!start || !end) {
      return false;
    }

    return end.getTime() > start.getTime();
  }

  /**
   * Parse a date string into a Date object
   * @param dateString The date string to parse
   * @returns Date object or null if invalid
   */
  private parseDate(dateString: string): Date | null {
    const trimmed = dateString.trim();

    // Try YYYY-MM-DD format
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoRegex.test(trimmed)) {
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try MM/DD/YYYY format
    const usRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (usRegex.test(trimmed)) {
      const parts = trimmed.split('/');
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      const date = new Date(year, month - 1, day);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }
}
