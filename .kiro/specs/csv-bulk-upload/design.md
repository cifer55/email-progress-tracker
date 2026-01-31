# Design Document: CSV Bulk Upload for Features

## Overview

The CSV bulk upload feature allows users to import multiple features at once from a CSV file. The system will parse the CSV, validate the data, automatically create missing themes and products, and import all features into the roadmap. This feature integrates with the existing Toolbar component and uses the RoadmapManager service for data manipulation.

## Architecture

### Component Structure

```
Toolbar (existing)
  └─ Import CSV Button (new)
      └─ CSVImportDialog (new)
          ├─ File Upload Area
          ├─ CSV Preview Table
          ├─ Validation Error Display
          └─ Import Confirmation

Services:
  ├─ CSVParserService (new)
  ├─ CSVValidationService (new)
  └─ CSVImportService (new)
```

### Data Flow

1. User clicks "Import CSV" button in Toolbar
2. CSVImportDialog opens with file picker
3. User selects CSV file
4. CSVParserService reads and parses the file
5. CSVValidationService validates all rows
6. If valid: Display preview and confirmation
7. If invalid: Display errors and allow retry
8. On confirmation: CSVImportService creates themes, products, and features
9. Dialog closes and Gantt chart refreshes

## Components and Interfaces

### CSVImportDialog Component

**Props:**
```typescript
interface CSVImportDialogProps {
  onClose: () => void;
  onImportComplete: (count: number) => void;
}
```

**State:**
```typescript
interface CSVImportState {
  file: File | null;
  parsedData: ParsedCSVData | null;
  validationErrors: ValidationError[];
  isValidating: boolean;
  isImporting: boolean;
  importProgress: number;
  step: 'upload' | 'preview' | 'importing' | 'complete';
}
```

**Responsibilities:**
- Display file upload area with drag-and-drop support
- Show CSV data preview in a table
- Display validation errors with row numbers
- Show import summary (features, themes, products to create)
- Display progress bar during import
- Handle user confirmation and cancellation

### CSVParserService

**Interface:**
```typescript
interface ParsedCSVRow {
  rowNumber: number;
  featureName: string;
  productName: string;
  themeName: string;
  startDate: string;
  endDate: string;
}

interface ParsedCSVData {
  rows: ParsedCSVRow[];
  totalRows: number;
}

class CSVParserService {
  parseCSV(file: File): Promise<ParsedCSVData>;
  generateTemplate(): string;
}
```

**Responsibilities:**
- Read CSV file contents
- Parse CSV format (handle quotes, commas, line breaks)
- Extract header row and validate column names
- Parse data rows into structured objects
- Skip empty rows
- Handle UTF-8 encoding
- Generate downloadable CSV template

### CSVValidationService

**Interface:**
```typescript
interface ValidationError {
  rowNumber: number;
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

class CSVValidationService {
  validateCSVData(data: ParsedCSVData): ValidationResult;
  validateRow(row: ParsedCSVRow): ValidationError[];
  validateDate(dateString: string): boolean;
  validateDateRange(startDate: string, endDate: string): boolean;
}
```

**Responsibilities:**
- Validate required fields are not empty
- Validate date formats (YYYY-MM-DD or MM/DD/YYYY)
- Validate date ranges (end date after start date)
- Collect all validation errors with row numbers
- Return comprehensive validation results

### CSVImportService

**Interface:**
```typescript
interface ImportSummary {
  featuresToCreate: number;
  themesToCreate: number;
  productsToCreate: number;
  existingProducts: number;
}

interface ImportResult {
  success: boolean;
  featuresCreated: number;
  themesCreated: number;
  productsCreated: number;
  errors: string[];
}

class CSVImportService {
  constructor(roadmapManager: RoadmapManager);
  
  analyzeImport(data: ParsedCSVData, roadmap: Roadmap): ImportSummary;
  executeImport(
    data: ParsedCSVData,
    roadmap: Roadmap,
    onProgress?: (progress: number) => void
  ): Promise<ImportResult>;
}
```

**Responsibilities:**
- Analyze CSV data to determine what will be created
- Find or create themes by name
- Find or create products by name within themes
- Calculate product date ranges from features
- Create features with proper parent associations
- Report progress during import
- Handle errors and rollback on failure

## Data Models

### CSV Row Format

```csv
Feature Name,Product Name,Theme Name,Start Date,End Date
Login System,Authentication,Security,2024-01-01,2024-03-31
Password Reset,Authentication,Security,2024-02-01,2024-04-15
User Profile,User Management,Core Features,2024-03-01,2024-05-31
```

### Parsed Data Structure

```typescript
interface ParsedCSVRow {
  rowNumber: number;        // 1-based row number (excluding header)
  featureName: string;      // Required, non-empty
  productName: string;      // Required, non-empty
  themeName: string;        // Required, non-empty
  startDate: string;        // Required, valid date format
  endDate: string;          // Required, valid date format
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CSV Parsing Preserves Data

*For any* valid CSV file with N data rows, parsing should produce exactly N ParsedCSVRow objects with all fields correctly extracted.

**Validates: Requirements 1.2, 2.2**

### Property 2: Empty Rows Are Ignored

*For any* CSV file containing empty rows, parsing should skip those rows and only return rows with data.

**Validates: Requirements 2.4**

### Property 3: Validation Detects All Errors

*For any* CSV data with invalid rows, validation should detect and report all errors with correct row numbers and field names.

**Validates: Requirements 3.7, 3.8**

### Property 4: Date Validation Rejects Invalid Dates

*For any* date string that is not in YYYY-MM-DD or MM/DD/YYYY format, validation should reject it with an appropriate error.

**Validates: Requirements 3.4, 3.5**

### Property 5: Date Range Validation

*For any* feature row where end date is before or equal to start date, validation should reject it with an error.

**Validates: Requirements 3.6**

### Property 6: Theme Creation Idempotence

*For any* CSV data referencing the same theme name multiple times, only one theme should be created.

**Validates: Requirements 4.1, 4.5**

### Property 7: Product Creation Idempotence

*For any* CSV data referencing the same product name within the same theme multiple times, only one product should be created.

**Validates: Requirements 4.2, 4.5**

### Property 8: Product Date Range Calculation

*For any* set of features belonging to the same product, the product's start date should equal the earliest feature start date, and the product's end date should equal the latest feature end date.

**Validates: Requirements 4.3, 4.4**

### Property 9: Import Creates All Features

*For any* valid CSV data with N rows, a successful import should create exactly N features in the roadmap.

**Validates: Requirements 5.5**

### Property 10: Import Summary Accuracy

*For any* CSV data, the import summary should accurately count the number of features, themes, and products that will be created.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

## Error Handling

### File Reading Errors

- **File not accessible**: Display "Unable to read file. Please check file permissions."
- **File too large**: Display "File is too large. Maximum size is 5MB."
- **Invalid encoding**: Display "File encoding not supported. Please use UTF-8."

### Parsing Errors

- **Invalid CSV format**: Display "Invalid CSV format. Please check for proper comma separation."
- **Missing headers**: Display "CSV file must have a header row with: Feature Name, Product Name, Theme Name, Start Date, End Date"
- **Empty file**: Display "CSV file is empty. Please add at least one feature row."

### Validation Errors

- **Empty required field**: "Row {N}: {Field} is required and cannot be empty"
- **Invalid date format**: "Row {N}: {Field} must be in YYYY-MM-DD or MM/DD/YYYY format"
- **Invalid date range**: "Row {N}: End Date must be after Start Date"

### Import Errors

- **Partial import failure**: Roll back all changes and display "Import failed: {error message}. No changes were made."
- **Storage failure**: Display "Failed to save imported features. Please try again."

## Testing Strategy

### Unit Tests

- Test CSV parsing with various valid formats
- Test CSV parsing with edge cases (quotes, commas in values, line breaks)
- Test validation with valid and invalid data
- Test date parsing for both supported formats
- Test theme/product creation logic
- Test product date range calculation
- Test error message generation

### Property-Based Tests

Each correctness property will be implemented as a property-based test using fast-check:

1. **Property 1**: Generate random valid CSV data, parse it, verify row count and field values
2. **Property 2**: Generate CSV with random empty rows, verify they are skipped
3. **Property 3**: Generate CSV with random invalid data, verify all errors are detected
4. **Property 4**: Generate random invalid date strings, verify rejection
5. **Property 5**: Generate random date ranges with end before start, verify rejection
6. **Property 6**: Generate CSV with duplicate theme names, verify single theme creation
7. **Property 7**: Generate CSV with duplicate product names in same theme, verify single product creation
8. **Property 8**: Generate random features for same product, verify product date range
9. **Property 9**: Generate random valid CSV, verify feature count after import
10. **Property 10**: Generate random valid CSV, verify import summary counts

### Integration Tests

- Test complete import flow: upload → parse → validate → preview → import
- Test import with existing themes and products
- Test import with all new themes and products
- Test import with mixed existing and new items
- Test error handling and rollback
- Test progress reporting for large imports

## UI/UX Design

### Import Button Location

Add "Import CSV" button to Toolbar next to "Create" button:
- Icon: Upload/import icon
- Label: "Import CSV"
- Tooltip: "Bulk import features from CSV file"

### Import Dialog Layout

```
┌─────────────────────────────────────────────┐
│  Import Features from CSV              [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Step 1: Upload CSV File                    │
│  ┌─────────────────────────────────────┐   │
│  │  Drag and drop CSV file here        │   │
│  │  or click to browse                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Download CSV Template]                    │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Step 2: Preview and Confirm                │
│  ┌─────────────────────────────────────┐   │
│  │ Feature Name │ Product │ Theme │... │   │
│  ├──────────────┼─────────┼───────┼────┤   │
│  │ Login System │ Auth    │ Sec   │... │   │
│  │ Password...  │ Auth    │ Sec   │... │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Summary:                                   │
│  • 15 features to import                    │
│  • 2 new themes to create                   │
│  • 5 new products to create                 │
│  • 3 existing products will receive features│
│                                             │
│  [Cancel]              [Import Features]    │
└─────────────────────────────────────────────┘
```

### Error Display

```
┌─────────────────────────────────────────────┐
│  Validation Errors                          │
├─────────────────────────────────────────────┤
│  ⚠ Found 3 errors in CSV file:              │
│                                             │
│  • Row 5: Feature Name is required          │
│  • Row 8: Start Date must be in YYYY-MM-DD │
│    or MM/DD/YYYY format                     │
│  • Row 12: End Date must be after Start    │
│    Date                                     │
│                                             │
│  Please fix these errors and try again.     │
│                                             │
│  [Close]                                    │
└─────────────────────────────────────────────┘
```

### Progress Display

```
┌─────────────────────────────────────────────┐
│  Importing Features...                      │
├─────────────────────────────────────────────┤
│                                             │
│  Creating themes and products...            │
│  ████████████████░░░░░░░░░░  60%           │
│                                             │
│  15 of 25 features imported                 │
│                                             │
└─────────────────────────────────────────────┘
```

## Performance Considerations

- Parse CSV in chunks for large files (>1000 rows)
- Use Web Workers for parsing if file is very large
- Batch feature creation in groups of 50 to avoid UI blocking
- Show progress updates every 10% or 50 features, whichever is smaller
- Limit CSV file size to 5MB to prevent memory issues
- Use virtual scrolling for preview table if more than 100 rows

## Browser Compatibility

- Use FileReader API (supported in all modern browsers)
- Use Blob API for template download (supported in all modern browsers)
- Test drag-and-drop on Chrome, Firefox, Safari, Edge
- Ensure file picker works on mobile devices
