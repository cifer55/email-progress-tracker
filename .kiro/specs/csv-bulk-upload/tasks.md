# Implementation Plan: CSV Bulk Upload for Features

## Overview

This implementation plan adds CSV bulk upload functionality to the roadmap visualizer. The approach follows: service layer (parsing, validation, import) → UI components (dialog, file upload) → integration with existing components. Each task builds on previous work, ensuring the system remains functional at each checkpoint.

## Tasks

- [x] 1. Implement CSVParserService
  - [x] 1.1 Create CSVParserService class with parseCSV method
    - Implement CSV file reading using FileReader API
    - Parse CSV format handling quotes, commas, and line breaks
    - Extract and validate header row
    - Parse data rows into ParsedCSVRow objects
    - Skip empty rows
    - Handle UTF-8 encoding
    - _Requirements: 1.2, 2.1, 2.2, 2.4, 2.5_
  
  - [x] 1.2 Implement CSV template generation
    - Create generateTemplate method
    - Return CSV string with proper headers
    - Include example rows for guidance
    - _Requirements: 2.5_
  
  - [ ]* 1.3 Write property test for CSV parsing
    - **Property 1: CSV Parsing Preserves Data**
    - **Validates: Requirements 1.2, 2.2**
  
  - [ ]* 1.4 Write property test for empty row handling
    - **Property 2: Empty Rows Are Ignored**
    - **Validates: Requirements 2.4**
  
  - [ ]* 1.5 Write unit tests for CSV parsing edge cases
    - Test quotes in values
    - Test commas in values
    - Test line breaks in values
    - Test various encodings

- [x] 2. Implement CSVValidationService
  - [x] 2.1 Create CSVValidationService class with validation methods
    - Implement validateCSVData method
    - Implement validateRow method for individual rows
    - Implement validateDate for date format checking
    - Implement validateDateRange for date logic
    - Collect all validation errors with row numbers
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [ ]* 2.2 Write property test for validation error detection
    - **Property 3: Validation Detects All Errors**
    - **Validates: Requirements 3.7, 3.8**
  
  - [ ]* 2.3 Write property test for date validation
    - **Property 4: Date Validation Rejects Invalid Dates**
    - **Validates: Requirements 3.4, 3.5**
  
  - [ ]* 2.4 Write property test for date range validation
    - **Property 5: Date Range Validation**
    - **Validates: Requirements 3.6**
  
  - [ ]* 2.5 Write unit tests for validation edge cases
    - Test empty strings
    - Test whitespace-only strings
    - Test various invalid date formats
    - Test boundary date ranges

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement CSVImportService
  - [x] 4.1 Create CSVImportService class with import methods
    - Implement analyzeImport method to preview what will be created
    - Implement executeImport method to perform the import
    - Find or create themes by name
    - Find or create products by name within themes
    - Calculate product date ranges from features
    - Create features with proper parent associations
    - Report progress during import
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2_
  
  - [x] 4.2 Implement error handling and rollback
    - Handle import failures gracefully
    - Roll back partial changes on error
    - Return detailed error information
    - _Requirements: 6.5_
  
  - [ ]* 4.3 Write property test for theme creation idempotence
    - **Property 6: Theme Creation Idempotence**
    - **Validates: Requirements 4.1, 4.5**
  
  - [ ]* 4.4 Write property test for product creation idempotence
    - **Property 7: Product Creation Idempotence**
    - **Validates: Requirements 4.2, 4.5**
  
  - [ ]* 4.5 Write property test for product date range calculation
    - **Property 8: Product Date Range Calculation**
    - **Validates: Requirements 4.3, 4.4**
  
  - [ ]* 4.6 Write property test for feature creation
    - **Property 9: Import Creates All Features**
    - **Validates: Requirements 5.5**
  
  - [ ]* 4.7 Write property test for import summary accuracy
    - **Property 10: Import Summary Accuracy**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
  
  - [ ]* 4.8 Write unit tests for import service
    - Test with existing themes and products
    - Test with all new themes and products
    - Test with mixed existing and new items
    - Test error handling and rollback

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement CSVImportDialog component
  - [x] 6.1 Create CSVImportDialog component structure
    - Create component with props interface
    - Set up state management for dialog steps
    - Implement dialog layout with steps
    - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.2 Implement file upload area
    - Create file input with drag-and-drop support
    - Handle file selection events
    - Display selected file name
    - Validate file type and size
    - _Requirements: 1.1, 1.2, 6.1_
  
  - [x] 6.3 Implement CSV template download
    - Add "Download Template" button
    - Generate and download CSV template
    - _Requirements: 2.5_
  
  - [x] 6.4 Implement CSV preview table
    - Display parsed CSV data in a table
    - Show first 10 rows with scroll for more
    - Highlight validation errors in table
    - _Requirements: 1.3_
  
  - [x] 6.5 Implement validation error display
    - Show validation errors with row numbers
    - Group errors by type
    - Provide clear error messages
    - Allow user to cancel and fix CSV
    - _Requirements: 6.3, 6.4_
  
  - [x] 6.6 Implement import summary display
    - Show counts of features, themes, products to create
    - Show counts of existing items that will be updated
    - Display confirmation button
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.7 Implement progress indicator
    - Show progress bar during import
    - Update progress as features are created
    - Display current count of imported features
    - _Requirements: 7.1, 7.2_
  
  - [x] 6.8 Implement import completion
    - Close dialog automatically on success
    - Display success toast with count
    - Refresh Gantt chart to show new features
    - _Requirements: 5.6, 7.3, 7.4_
  
  - [ ]* 6.9 Write unit tests for CSVImportDialog
    - Test file upload handling
    - Test validation error display
    - Test import summary display
    - Test progress updates
    - Test error handling

- [x] 7. Add CSV import styles
  - [x] 7.1 Create CSVImportDialog.css
    - Style dialog layout and steps
    - Style file upload area with drag-and-drop visual feedback
    - Style preview table
    - Style validation error display
    - Style import summary
    - Style progress indicator
    - Ensure responsive design for mobile
    - _Requirements: All_

- [x] 8. Integrate CSV import with Toolbar
  - [x] 8.1 Add "Import CSV" button to Toolbar
    - Add button next to "Create" button
    - Add upload icon
    - Add tooltip
    - Wire up click handler to open dialog
    - _Requirements: 1.1_
  
  - [x] 8.2 Connect CSVImportDialog to App state
    - Add state for showing/hiding import dialog
    - Pass roadmap context to import service
    - Handle import completion callback
    - Display success/error notifications
    - _Requirements: 5.6, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add error handling for edge cases
  - [x] 10.1 Handle file reading errors
    - Catch and display file access errors
    - Handle file size limit (5MB)
    - Handle encoding errors
    - _Requirements: 6.1_
  
  - [x] 10.2 Handle parsing errors
    - Catch and display CSV format errors
    - Handle missing headers
    - Handle empty files
    - _Requirements: 1.4, 6.2_
  
  - [x] 10.3 Handle import errors
    - Catch and display import errors
    - Implement rollback on failure
    - Display storage errors
    - _Requirements: 6.5_

- [x] 11. Integration testing
  - [ ]* 11.1 Write integration tests for complete import flow
    - Test upload → parse → validate → preview → import
    - Test with various CSV files
    - Test error scenarios
    - Test with large CSV files (100+ rows)
  
  - [x] 11.2 Test with existing roadmap data
    - Test import with existing themes
    - Test import with existing products
    - Test import with mixed existing and new items
    - Verify no duplicate creation
  
  - [x] 11.3 Performance testing
    - Test with large CSV files (500+ rows)
    - Verify progress updates work correctly
    - Verify UI remains responsive during import
    - _Requirements: 7.1, 7.2_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Documentation and polish
  - [x] 13.1 Add user documentation
    - Document CSV format requirements
    - Provide example CSV files
    - Document error messages and solutions
  
  - [x] 13.2 Add inline help
    - Add tooltips to import dialog
    - Add help text for CSV format
    - Add examples in template
  
  - [x] 13.3 Cross-browser testing
    - Test file upload on Chrome, Firefox, Safari, Edge
    - Test drag-and-drop on all browsers
    - Test on mobile devices
    - Fix any browser-specific issues

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: services → UI components → integration
- CSV parsing uses standard browser APIs (FileReader, Blob)
- Import service integrates with existing RoadmapManager
- All new features maintain compatibility with existing functionality
