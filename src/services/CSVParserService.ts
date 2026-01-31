/**
 * Service for parsing CSV files containing feature data
 */

export interface ParsedCSVRow {
  rowNumber: number;
  featureName: string;
  productName: string;
  themeName: string;
  startDate: string;
  endDate: string;
}

export interface ParsedCSVData {
  rows: ParsedCSVRow[];
  totalRows: number;
}

export class CSVParserService {
  private static readonly REQUIRED_HEADERS = [
    'Feature Name',
    'Product Name',
    'Theme Name',
    'Start Date',
    'End Date'
  ];

  /**
   * Parse a CSV file and extract feature data
   * @param file The CSV file to parse
   * @returns Promise resolving to parsed CSV data
   */
  async parseCSV(file: File): Promise<ParsedCSVData> {
    const content = await this.readFile(file);
    const lines = this.splitIntoLines(content);

    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      throw new Error('CSV file is empty');
    }

    // Parse header row
    const headerRow = this.parseCSVLine(lines[0]);
    this.validateHeaders(headerRow);

    // Parse data rows
    const rows: ParsedCSVRow[] = [];
    let rowNumber = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty rows
      if (line === '') {
        continue;
      }

      const fields = this.parseCSVLine(line);
      
      // Skip rows that are completely empty (all fields empty)
      if (fields.every(field => field.trim() === '')) {
        continue;
      }

      rows.push({
        rowNumber,
        featureName: fields[0]?.trim() || '',
        productName: fields[1]?.trim() || '',
        themeName: fields[2]?.trim() || '',
        startDate: fields[3]?.trim() || '',
        endDate: fields[4]?.trim() || ''
      });

      rowNumber++;
    }

    return {
      rows,
      totalRows: rows.length
    };
  }

  /**
   * Generate a CSV template with proper headers and example rows
   * @returns CSV template string
   */
  generateTemplate(): string {
    const headers = CSVParserService.REQUIRED_HEADERS.join(',');
    const example1 = 'Login System,Authentication,Security,2024-01-01,2024-03-31';
    const example2 = 'Password Reset,Authentication,Security,2024-02-01,2024-04-15';
    const example3 = 'User Profile,User Management,Core Features,2024-03-01,2024-05-31';

    return `${headers}\n${example1}\n${example2}\n${example3}\n`;
  }

  /**
   * Read file contents as text using FileReader API
   * @param file The file to read
   * @returns Promise resolving to file content
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      // Read as UTF-8 text
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Split content into lines, handling different line endings
   * @param content The content to split
   * @returns Array of lines
   */
  private splitIntoLines(content: string): string[] {
    // Handle different line endings: \r\n (Windows), \n (Unix), \r (old Mac)
    return content.split(/\r\n|\n|\r/);
  }

  /**
   * Parse a single CSV line, handling quotes, commas, and line breaks
   * @param line The line to parse
   * @returns Array of field values
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote (two consecutive quotes)
          currentField += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // Field separator (comma outside quotes)
        fields.push(currentField);
        currentField = '';
      } else {
        // Regular character
        currentField += char;
      }
    }

    // Add the last field
    fields.push(currentField);

    return fields;
  }

  /**
   * Validate that the header row contains all required columns
   * @param headers The parsed header row
   * @throws Error if headers are invalid
   */
  private validateHeaders(headers: string[]): void {
    const normalizedHeaders = headers.map(h => h.trim());

    for (const required of CSVParserService.REQUIRED_HEADERS) {
      if (!normalizedHeaders.includes(required)) {
        throw new Error(
          `CSV file must have a header row with: ${CSVParserService.REQUIRED_HEADERS.join(', ')}`
        );
      }
    }
  }
}
