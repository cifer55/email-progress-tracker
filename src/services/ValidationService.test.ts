/**
 * Unit tests for ValidationService
 */

import { describe, it, expect } from 'vitest';
import { ValidationService, ValidationErrorType } from './ValidationService';

describe('ValidationService', () => {
  const service = new ValidationService();

  describe('validateDates', () => {
    it('should accept valid date range where end date is after start date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const result = service.validateDates(startDate, endDate);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should accept valid date range where end date equals start date', () => {
      const startDate = new Date('2024-06-15');
      const endDate = new Date('2024-06-15');
      
      const result = service.validateDates(startDate, endDate);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject date range where end date is before start date', () => {
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');
      
      const result = service.validateDates(startDate, endDate);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ValidationErrorType.END_BEFORE_START);
      expect(result.errors[0].message).toContain('End date cannot be before start date');
      expect(result.errors[0].field).toBe('endDate');
    });
  });

  describe('parseDate', () => {
    it('should parse valid YYYY-MM-DD format', () => {
      const date = service.parseDate('2024-06-15');
      
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(5); // 0-indexed
      expect(date?.getDate()).toBe(15);
    });

    it('should parse valid MM/DD/YYYY format', () => {
      const date = service.parseDate('06/15/2024');
      
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(5); // 0-indexed
      expect(date?.getDate()).toBe(15);
    });

    it('should parse single-digit month and day in MM/DD/YYYY format', () => {
      const date = service.parseDate('6/5/2024');
      
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(5); // 0-indexed
      expect(date?.getDate()).toBe(5);
    });

    it('should handle dates with leading/trailing whitespace', () => {
      const date = service.parseDate('  2024-06-15  ');
      
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2024);
    });

    it('should reject invalid format', () => {
      expect(service.parseDate('15-06-2024')).toBeNull();
      expect(service.parseDate('2024/06/15')).toBeNull();
      expect(service.parseDate('June 15, 2024')).toBeNull();
      expect(service.parseDate('not a date')).toBeNull();
      expect(service.parseDate('')).toBeNull();
    });

    it('should reject invalid month values', () => {
      expect(service.parseDate('2024-13-01')).toBeNull();
      expect(service.parseDate('2024-00-01')).toBeNull();
      expect(service.parseDate('13/01/2024')).toBeNull();
    });

    it('should reject invalid day values', () => {
      expect(service.parseDate('2024-01-32')).toBeNull();
      expect(service.parseDate('2024-01-00')).toBeNull();
      expect(service.parseDate('32/01/2024')).toBeNull();
    });

    it('should reject invalid dates like February 31', () => {
      expect(service.parseDate('2024-02-31')).toBeNull();
      expect(service.parseDate('02/31/2024')).toBeNull();
    });

    it('should handle leap year dates correctly', () => {
      const leapDate = service.parseDate('2024-02-29');
      expect(leapDate).not.toBeNull();
      
      const nonLeapDate = service.parseDate('2023-02-29');
      expect(nonLeapDate).toBeNull();
    });
  });

  describe('validateDateFormat', () => {
    it('should accept valid YYYY-MM-DD format', () => {
      const result = service.validateDateFormat('2024-06-15');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid MM/DD/YYYY format', () => {
      const result = service.validateDateFormat('06/15/2024');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid format', () => {
      const result = service.validateDateFormat('15-06-2024');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ValidationErrorType.INVALID_DATE_FORMAT);
      expect(result.errors[0].message).toContain('Invalid date format');
      expect(result.errors[0].field).toBe('date');
    });

    it('should reject empty string', () => {
      const result = service.validateDateFormat('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should reject invalid dates', () => {
      const result = service.validateDateFormat('2024-02-31');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
