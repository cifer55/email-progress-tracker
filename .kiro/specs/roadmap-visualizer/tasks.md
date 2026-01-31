# Implementation Plan: Roadmap Visualizer

## Overview

This implementation plan breaks down the Roadmap Visualizer into discrete coding tasks. The approach follows an incremental development strategy: core data model → business logic → storage → UI components → visualization → testing. Each task builds on previous work, ensuring the system remains functional at each checkpoint.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Initialize React + TypeScript project with Vite
  - Install dependencies: fast-check for property testing, Vitest for unit testing
  - Configure TypeScript with strict mode
  - Set up basic folder structure: `/src/models`, `/src/services`, `/src/components`, `/src/utils`
  - _Requirements: All_

- [x] 2. Implement core data models and types
  - [x] 2.1 Create TypeScript interfaces for Theme, Product, Feature, and Roadmap
    - Define all data model interfaces with proper typing
    - Include ID generation utilities
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 2.2 Write property test for data model structure
    - **Property 4: Hierarchy Invariant**
    - **Validates: Requirements 2.1, 2.5**

- [x] 3. Implement RoadmapManager service
  - [x] 3.1 Implement CRUD operations for themes
    - Create `createTheme`, `updateTheme`, `deleteTheme` methods
    - Ensure unique ID generation
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [x] 3.2 Implement CRUD operations for products
    - Create `createProduct`, `updateProduct`, `deleteProduct` methods
    - Maintain theme-product associations
    - _Requirements: 1.2, 1.4, 1.5_
  
  - [x] 3.3 Implement CRUD operations for features
    - Create `createFeature`, `updateFeature`, `deleteFeature` methods
    - Maintain product-feature associations
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 3.4 Write property tests for CRUD operations
    - **Property 1: CRUD Operations Maintain Data Integrity**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [x] 3.5 Write property test for updates
    - **Property 2: Updates Persist Correctly**
    - **Validates: Requirements 1.4**
  
  - [x] 3.6 Write property test for cascading deletion
    - **Property 3: Cascading Deletion**
    - **Validates: Requirements 1.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ValidationService
  - [x] 5.1 Implement date validation
    - Create `validateDates` method to check start date <= end date
    - Return appropriate error messages
    - _Requirements: 9.1_
  
  - [x] 5.2 Implement hierarchy date validation
    - Create `validateHierarchy` method to check child dates within parent dates
    - Return warnings for date range violations
    - _Requirements: 9.2, 9.3_
  
  - [x] 5.3 Implement date parsing and format validation
    - Support YYYY-MM-DD and MM/DD/YYYY formats
    - Reject invalid formats with clear errors
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 5.4 Write property test for date validation
    - **Property 24: Date Validation Rejects Invalid Ranges**
    - **Validates: Requirements 9.1**
  
  - [ ]* 5.5 Write property test for hierarchy date validation
    - **Property 25: Hierarchy Date Validation**
    - **Validates: Requirements 9.2, 9.3**
  
  - [ ]* 5.6 Write property test for date format parsing
    - **Property 26: Date Format Parsing**
    - **Validates: Requirements 9.4**
  
  - [ ]* 5.7 Write property test for invalid date rejection
    - **Property 27: Invalid Date Format Rejection**
    - **Validates: Requirements 9.5**

- [x] 6. Implement StorageService
  - [x] 6.1 Implement save and load methods using LocalStorage
    - Create `save` method to serialize and store roadmap
    - Create `load` method to retrieve and deserialize roadmap
    - Handle storage errors gracefully
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 6.2 Implement data validation on load
    - Validate loaded data structure and integrity
    - Provide recovery options for corrupted data
    - _Requirements: 6.4, 6.5_
  
  - [ ]* 6.3 Write property test for storage round-trip
    - **Property 18: Storage Round-trip Preserves Data**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ]* 6.4 Write property test for storage failure handling
    - **Property 19: Storage Failure Preserves Memory State**
    - **Validates: Requirements 6.3**
  
  - [ ]* 6.5 Write property test for data validation
    - **Property 20: Data Validation on Load**
    - **Validates: Requirements 6.4, 6.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement FilterEngine service
  - [x] 8.1 Implement theme filtering
    - Create `filterByThemes` method
    - Return roadmap with only selected themes and descendants
    - _Requirements: 4.1_
  
  - [x] 8.2 Implement product filtering
    - Create `filterByProducts` method
    - Return roadmap with only selected products and their features
    - _Requirements: 4.2_
  
  - [x] 8.3 Implement date range filtering
    - Create `filterByDateRange` method
    - Return items that overlap with specified date range
    - _Requirements: 4.3_
  
  - [x] 8.4 Implement composite filter application
    - Create `applyFilters` method that combines all filter types
    - _Requirements: 4.4_
  
  - [x] 8.5 Write property test for theme filtering
    - **Property 9: Theme Filtering**
    - **Validates: Requirements 4.1**
  
  - [ ]* 8.6 Write property test for product filtering
    - **Property 10: Product Filtering**
    - **Validates: Requirements 4.2**
  
  - [ ]* 8.7 Write property test for date range filtering
    - **Property 11: Date Range Filtering**
    - **Validates: Requirements 4.3**
  
  - [ ]* 8.8 Write property test for filter composition
    - **Property 12: Filter Composition**
    - **Validates: Requirements 4.4**
  
  - [ ]* 8.9 Write property test for filter reset
    - **Property 13: Filter Reset Round-trip**
    - **Validates: Requirements 4.5**

- [x] 9. Implement ExportService
  - [x] 9.1 Implement JSON export
    - Create `exportToJSON` method to serialize roadmap
    - Ensure complete data preservation
    - _Requirements: 7.3, 7.5_
  
  - [x] 9.2 Implement PNG export
    - Create `exportToPNG` method to capture canvas as image
    - Generate valid PNG blob
    - _Requirements: 7.2_
  
  - [x] 9.3 Implement filtered export
    - Ensure exports respect current filter state
    - _Requirements: 7.1, 7.4_
  
  - [ ]* 9.4 Write property test for JSON export round-trip
    - **Property 22: JSON Export Round-trip**
    - **Validates: Requirements 7.3, 7.5**
  
  - [ ]* 9.5 Write property test for PNG export validity
    - **Property 23: PNG Export Produces Valid Image**
    - **Validates: Requirements 7.2**
  
  - [ ]* 9.6 Write property test for filtered export
    - **Property 21: Export Includes Visible Items**
    - **Validates: Requirements 7.1, 7.4**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Gantt chart rendering utilities
  - [x] 11.1 Implement timeline calculation
    - Create utilities for calculating timeline scale and divisions
    - Support different time units (day, week, month, quarter)
    - _Requirements: 5.1, 3.3_
  
  - [x] 11.2 Implement bar position calculation
    - Create utility to calculate bar x-position and width from dates
    - _Requirements: 3.2_
  
  - [x] 11.3 Implement row assignment algorithm
    - Create algorithm to assign non-overlapping rows to items
    - _Requirements: 3.5_
  
  - [x] 11.4 Implement zoom and pan calculations
    - Create utilities for zoom level and pan offset transformations
    - _Requirements: 5.2, 5.3, 5.4_
  
  - [ ]* 11.5 Write property test for bar position calculation
    - **Property 6: Bar Position Calculation**
    - **Validates: Requirements 3.2**
  
  - [ ]* 11.6 Write property test for timeline scaling
    - **Property 7: Timeline Scaling**
    - **Validates: Requirements 3.3**
  
  - [ ]* 11.7 Write property test for row assignment
    - **Property 8: Row Assignment Prevents Overlaps**
    - **Validates: Requirements 3.5**
  
  - [ ]* 11.8 Write property test for timeline unit configuration
    - **Property 14: Timeline Unit Configuration**
    - **Validates: Requirements 5.1**
  
  - [ ]* 11.9 Write property test for zoom granularity
    - **Property 15: Zoom Affects Granularity**
    - **Validates: Requirements 5.2, 5.3**
  
  - [ ]* 11.10 Write property test for pan offset
    - **Property 16: Pan Shifts Date Range**
    - **Validates: Requirements 5.4**

- [x] 12. Implement React Context for state management
  - [x] 12.1 Create RoadmapContext
    - Define context for roadmap data and operations
    - Provide hooks for accessing and updating roadmap
    - _Requirements: All_
  
  - [x] 12.2 Create FilterContext
    - Define context for filter state
    - Provide hooks for applying and clearing filters
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 12.3 Create ViewContext
    - Define context for view settings (zoom, pan, time unit)
    - Provide hooks for view manipulation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 13. Implement core UI components
  - [x] 13.1 Create Toolbar component
    - Implement buttons for create, export, zoom, pan, reset
    - Wire up to context actions
    - _Requirements: 1.1, 1.2, 1.3, 5.2, 5.3, 5.5, 7.1_
  
  - [x] 13.2 Create FilterPanel component
    - Implement filter controls for themes, products, date range
    - Wire up to FilterContext
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 13.3 Create SidePanel component
    - Display selected item details
    - Provide edit form for updating items
    - _Requirements: 1.4, 8.1, 8.2_
  
  - [ ]* 13.4 Write unit tests for UI components
    - Test component rendering and interactions
    - Test context integration

- [x] 14. Implement GanttChart component
  - [x] 14.1 Create canvas rendering logic
    - Implement timeline header rendering
    - Implement item bar rendering with hierarchy styling
    - Implement grid lines
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 14.2 Implement mouse interaction handling
    - Handle click events to select items
    - Handle double-click events to edit items
    - Handle hover for visual feedback
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 14.3 Implement collapse/expand functionality
    - Handle theme and product collapse state
    - Update rendering based on collapse state
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 14.4 Write property test for collapse state propagation
    - **Property 5: Collapse State Propagation**
    - **Validates: Requirements 2.3, 2.4**
  
  - [ ]* 14.5 Write unit tests for canvas rendering
    - Test rendering logic with various roadmap states
    - Test interaction handling

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement responsive layout
  - [x] 16.1 Add responsive CSS and media queries
    - Implement mobile-optimized layout for screens < 768px
    - Ensure touch-friendly controls
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [x] 16.2 Implement viewport resize handling
    - Recalculate Gantt chart dimensions on resize
    - Update layout based on viewport width
    - _Requirements: 10.1, 10.4_

- [x] 17. Implement keyboard shortcuts
  - [x] 17.1 Add keyboard event handlers
    - Implement shortcuts for create (Ctrl+N), delete (Delete), navigate (arrows)
    - Wire up to appropriate actions
    - _Requirements: 8.5_

- [x] 18. Integrate storage with application lifecycle
  - [x] 18.1 Add auto-save on data changes
    - Hook storage service into roadmap context
    - Save on every create, update, delete operation
    - _Requirements: 6.1_
  
  - [x] 18.2 Add data loading on application start
    - Load roadmap from storage on mount
    - Handle load errors and corrupted data
    - _Requirements: 6.2, 6.4, 6.5_
  
  - [ ]* 18.3 Write property test for view reset
    - **Property 17: View Reset Shows All Items**
    - **Validates: Requirements 5.5**

- [x] 19. Add error handling and user notifications
  - [x] 19.1 Implement notification system
    - Create toast notifications for success messages
    - Create banner notifications for warnings and errors
    - Create modal dialogs for confirmations
    - _Requirements: 6.3, 6.5, 9.1, 9.2, 9.3, 9.5_
  
  - [x] 19.2 Add validation error display
    - Show inline validation errors in forms
    - Display warnings for hierarchy date issues
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [x] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Integration testing and polish
  - [ ]* 21.1 Write integration tests for complete workflows
    - Test create → edit → export flow
    - Test filtering and view manipulation flows
  
  - [x] 21.2 Performance optimization
    - Implement virtual scrolling if needed
    - Optimize canvas rendering with debouncing
    - _Requirements: 8.4_
  
  - [x] 21.3 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Fix any browser-specific issues

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: data layer → business logic → UI
- Storage integration happens after core functionality is working
- UI polish and responsive design come after core features are complete
