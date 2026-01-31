import { describe, it, expect } from 'vitest';
import { CSVParserService } from './CSVParserService';

describe('CSVParserService', () => {
  const service = new CSVParserService();

  describe('parseCSV', () => {
    it('should parse a valid CSV file with data rows', async () => {
      const csvContent = `Feature Name,Product Name,Theme Name,Start Date,End Date
Login System,Authentication,Security,2024-01-01,2024-03-31
Password Reset,Authentication,Security,2024-02-01,2024-04-15`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await service.parseCSV(file);

      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        rowNumber: 1,
        featureName: 'Login System',
        productName: 'Authentication',
        themeName: 'Security',
        startDate: '2024-01-01',
        endDate: '2024-03-31'
      });
      expect(result.rows[1]).toEqual({
        rowNumber: 2,
        featureName: 'Password Reset',
        productName: 'Authentication',
        themeName: 'Security',
        startDate: '2024-02-01',
        endDate: '2024-04-15'
      });
    });

    it('should skip empty rows', async () => {
      const csvContent = `Feature Name,Product Name,Theme Name,Start Date,End Date
Login System,Authentication,Security,2024-01-01,2024-03-31

Password Reset,Authentication,Security,2024-02-01,2024-04-15`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await service.parseCSV(file);

      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle quoted values with commas', async () => {
      const csvContent = `Feature Name,Product Name,Theme Name,Start Date,End Date
"Login System, Advanced",Authentication,Security,2024-01-01,2024-03-31`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await service.parseCSV(file);

      expect(result.rows[0].featureName).toBe('Login System, Advanced');
    });

    it('should handle escaped quotes', async () => {
      const csvContent = `Feature Name,Product Name,Theme Name,Start Date,End Date
"Login ""Pro"" System",Authentication,Security,2024-01-01,2024-03-31`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await service.parseCSV(file);

      expect(result.rows[0].featureName).toBe('Login "Pro" System');
    });

    it('should throw error for empty file', async () => {
      const csvContent = '';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(service.parseCSV(file)).rejects.toThrow('CSV file is empty');
    });

    it('should throw error for missing headers', async () => {
      const csvContent = `Wrong,Headers,Here
Login System,Authentication,Security,2024-01-01,2024-03-31`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(service.parseCSV(file)).rejects.toThrow(
        'CSV file must have a header row with: Feature Name, Product Name, Theme Name, Start Date, End Date'
      );
    });

    it('should handle UTF-8 encoding', async () => {
      const csvContent = `Feature Name,Product Name,Theme Name,Start Date,End Date
Système de connexion,Authentification,Sécurité,2024-01-01,2024-03-31`;

      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      const result = await service.parseCSV(file);

      expect(result.rows[0].featureName).toBe('Système de connexion');
      expect(result.rows[0].productName).toBe('Authentification');
      expect(result.rows[0].themeName).toBe('Sécurité');
    });
  });

  describe('generateTemplate', () => {
    it('should generate a CSV template with headers and examples', () => {
      const template = service.generateTemplate();

      expect(template).toContain('Feature Name,Product Name,Theme Name,Start Date,End Date');
      expect(template).toContain('Login System,Authentication,Security,2024-01-01,2024-03-31');
      expect(template).toContain('Password Reset,Authentication,Security,2024-02-01,2024-04-15');
      expect(template).toContain('User Profile,User Management,Core Features,2024-03-01,2024-05-31');
    });

    it('should generate valid CSV format', () => {
      const template = service.generateTemplate();
      const lines = template.split('\n').filter(line => line.trim() !== '');

      expect(lines.length).toBeGreaterThanOrEqual(4); // Header + 3 examples
      expect(lines[0].split(',').length).toBe(5); // 5 columns
    });
  });
});
