# Design Document: Roadmap Visualizer

## Overview

The Roadmap Visualizer is a web-based application that enables product managers to create, manage, and visualize product roadmaps using interactive Gantt charts. The system uses a hierarchical data model (themes → products → features) and provides rich visualization capabilities with filtering, zooming, and export functionality.

The application follows a client-side architecture with local storage persistence, making it lightweight and fast while maintaining data privacy. The design emphasizes simplicity, performance, and an intuitive user experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Toolbar    │  │  Gantt Chart │  │  Side Panel  │  │
│  │  Component   │  │   Component  │  │  Component   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Logic Layer                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Roadmap    │  │  Filtering   │  │   Export     │  │
│  │   Manager    │  │   Engine     │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Roadmap    │  │  Validation  │  │   Storage    │  │
│  │   Model      │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: React with TypeScript for type safety and component-based architecture
- **State Management**: React Context API for global state (roadmap data, filters, view settings)
- **Visualization**: Canvas API for high-performance Gantt chart rendering
- **Storage**: Browser LocalStorage API for data persistence
- **Styling**: CSS Modules for component-scoped styling
- **Build Tool**: Vite for fast development and optimized production builds

### Design Patterns

- **Component Pattern**: UI broken into reusable, composable components
- **Observer Pattern**: Components subscribe to state changes and re-render automatically
- **Repository Pattern**: Storage service abstracts data persistence details
- **Strategy Pattern**: Different export formats implemented as strategies

## Components and Interfaces

### Data Model

```typescript
interface Theme {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  products: Product[];
  collapsed: boolean;
}

interface Product {
  id: string;
  themeId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  features: Feature[];
  collapsed: boolean;
}

interface Feature {
  id: string;
  productId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}

interface Roadmap {
  id: string;
  name: string;
  themes: Theme[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Core Interfaces

```typescript
interface RoadmapManager {
  // CRUD operations
  createTheme(name: string, description?: string): Theme;
  createProduct(themeId: string, data: ProductData): Product;
  createFeature(productId: string, data: FeatureData): Feature;
  
  updateTheme(id: string, updates: Partial<Theme>): Theme;
  updateProduct(id: string, updates: Partial<Product>): Product;
  updateFeature(id: string, updates: Partial<Feature>): Feature;
  
  deleteTheme(id: string): void;
  deleteProduct(id: string): void;
  deleteFeature(id: string): void;
  
  // Retrieval
  getRoadmap(): Roadmap;
  getTheme(id: string): Theme | null;
  getProduct(id: string): Product | null;
  getFeature(id: string): Feature | null;
}

interface FilterEngine {
  applyFilters(roadmap: Roadmap, filters: FilterCriteria): Roadmap;
  filterByThemes(roadmap: Roadmap, themeIds: string[]): Roadmap;
  filterByProducts(roadmap: Roadmap, productIds: string[]): Roadmap;
  filterByDateRange(roadmap: Roadmap, startDate: Date, endDate: Date): Roadmap;
}

interface ValidationService {
  validateDates(startDate: Date, endDate: Date): ValidationResult;
  validateHierarchy(item: RoadmapItem, parent?: RoadmapItem): ValidationResult;
  validateRoadmap(roadmap: Roadmap): ValidationResult;
}

interface StorageService {
  save(roadmap: Roadmap): Promise<void>;
  load(): Promise<Roadmap | null>;
  clear(): Promise<void>;
}

interface ExportService {
  exportToPNG(roadmap: Roadmap, canvas: HTMLCanvasElement): Promise<Blob>;
  exportToJSON(roadmap: Roadmap): string;
}
```

### UI Components

```typescript
interface ToolbarProps {
  onCreateTheme: () => void;
  onCreateProduct: () => void;
  onCreateFeature: () => void;
  onExport: (format: 'png' | 'json') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

interface GanttChartProps {
  roadmap: Roadmap;
  viewSettings: ViewSettings;
  onItemClick: (item: RoadmapItem) => void;
  onItemDoubleClick: (item: RoadmapItem) => void;
}

interface SidePanelProps {
  selectedItem: RoadmapItem | null;
  onUpdate: (item: RoadmapItem) => void;
  onClose: () => void;
}

interface FilterPanelProps {
  themes: Theme[];
  products: Product[];
  activeFilters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
}
```

## Data Models

### Roadmap Item Hierarchy

The roadmap uses a three-level hierarchy:

1. **Theme** (Level 1): Strategic grouping, optional dates
2. **Product** (Level 2): Major initiative, required dates
3. **Feature** (Level 3): Specific capability, required dates

Each level maintains references to its children and parent, enabling efficient traversal and filtering.

### Date Handling

- All dates stored as ISO 8601 strings for serialization
- Converted to Date objects for manipulation and comparison
- Timezone-agnostic (uses local timezone)
- Validation ensures end date >= start date

### State Management

```typescript
interface AppState {
  roadmap: Roadmap;
  filters: FilterCriteria;
  viewSettings: ViewSettings;
  selectedItem: RoadmapItem | null;
  uiState: {
    loading: boolean;
    error: string | null;
    isDirty: boolean;
  };
}

interface ViewSettings {
  timeUnit: 'day' | 'week' | 'month' | 'quarter';
  zoomLevel: number; // 1.0 = 100%
  scrollPosition: number;
  visibleDateRange: {
    start: Date;
    end: Date;
  };
}

interface FilterCriteria {
  themeIds: string[];
  productIds: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}
```

## Gantt Chart Rendering

### Canvas-Based Rendering

The Gantt chart uses HTML5 Canvas for high-performance rendering:

1. **Timeline Header**: Displays date labels based on current time unit
2. **Item Rows**: Each visible item gets a row with a horizontal bar
3. **Grid Lines**: Vertical lines for time divisions, horizontal lines between items
4. **Interactive Layer**: Transparent overlay for mouse events

### Rendering Algorithm

```
For each visible roadmap item:
  1. Calculate row position (y-coordinate)
  2. Calculate bar position and width based on dates
  3. Draw bar with appropriate color and styling
  4. Draw item label
  5. Store hit region for mouse interaction

Draw timeline header:
  1. Calculate time divisions based on zoom level
  2. Draw date labels at appropriate intervals
  3. Draw vertical grid lines

Handle interactions:
  1. Map mouse coordinates to canvas coordinates
  2. Check hit regions to identify clicked item
  3. Trigger appropriate event handler
```

### Performance Optimizations

- **Virtual Scrolling**: Only render visible items
- **Debounced Rendering**: Batch updates during rapid changes (zoom, pan)
- **Cached Calculations**: Store computed positions until data changes
- **RequestAnimationFrame**: Smooth animations for zoom and pan

## Error Handling

### Validation Errors

```typescript
enum ValidationErrorType {
  INVALID_DATE_FORMAT = 'INVALID_DATE_FORMAT',
  END_BEFORE_START = 'END_BEFORE_START',
  CHILD_EXCEEDS_PARENT = 'CHILD_EXCEEDS_PARENT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_HIERARCHY = 'INVALID_HIERARCHY'
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  type: ValidationErrorType;
  message: string;
  field?: string;
}
```

### Error Recovery

- **Storage Failures**: Keep data in memory, retry save, notify user
- **Invalid Data**: Attempt to repair, fallback to empty roadmap, notify user
- **Rendering Errors**: Catch exceptions, display error message, allow retry
- **User Input Errors**: Show inline validation messages, prevent invalid submissions

### User Notifications

- **Success**: Brief toast notification (auto-dismiss)
- **Warnings**: Yellow banner with dismiss button
- **Errors**: Red banner with error details and action buttons
- **Confirmations**: Modal dialog for destructive actions (delete)

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

- **Data Model**: Test CRUD operations, hierarchy maintenance, ID generation
- **Validation**: Test date validation, hierarchy validation, format validation
- **Filtering**: Test single and combined filters, edge cases (empty results)
- **Storage**: Test save/load operations, error handling, data integrity
- **Export**: Test JSON serialization, PNG generation
- **Date Utilities**: Test parsing, formatting, comparison functions

### Property-Based Testing

Property-based tests will verify universal correctness properties using a TypeScript PBT library (fast-check). Each test will run a minimum of 100 iterations with randomly generated inputs.

Tests will be tagged with comments referencing design properties:
```typescript
// Feature: roadmap-visualizer, Property 1: CRUD operations maintain hierarchy
```

### Integration Testing

- **Component Integration**: Test interactions between UI components and state
- **End-to-End Flows**: Test complete user workflows (create → edit → export)
- **Browser Compatibility**: Test on Chrome, Firefox, Safari, Edge

### Testing Tools

- **Unit Tests**: Vitest for fast test execution
- **Property Tests**: fast-check for property-based testing
- **Component Tests**: React Testing Library for UI components
- **E2E Tests**: Playwright for browser automation

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: CRUD Operations Maintain Data Integrity

*For any* roadmap item (theme, product, or feature) with valid data, creating the item should result in the item existing in the roadmap with all specified properties correctly set and a unique ID assigned.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Updates Persist Correctly

*For any* existing roadmap item and any valid update data, updating the item should result in the changes being reflected in the roadmap and the item maintaining its ID and hierarchy relationships.

**Validates: Requirements 1.4**

### Property 3: Cascading Deletion

*For any* roadmap item with children, deleting the item should remove both the item and all its descendants from the roadmap, while leaving unrelated items unchanged.

**Validates: Requirements 1.5**

### Property 4: Hierarchy Invariant

*For any* roadmap state after any operation (create, update, delete), the hierarchy should maintain the three-level structure where themes contain products, products contain features, and all parent-child references are bidirectional and consistent.

**Validates: Requirements 2.1, 2.5**

### Property 5: Collapse State Propagation

*For any* roadmap item (theme or product) that is collapsed, all descendant items should be marked as hidden in the view state.

**Validates: Requirements 2.3, 2.4**

### Property 6: Bar Position Calculation

*For any* roadmap item with start and end dates, the calculated bar position and width should correctly correspond to the item's date range relative to the visible timeline range.

**Validates: Requirements 3.2**

### Property 7: Timeline Scaling

*For any* set of visible roadmap items, the timeline scale should be calculated such that all items fit within the visible range with appropriate padding.

**Validates: Requirements 3.3**

### Property 8: Row Assignment Prevents Overlaps

*For any* set of roadmap items that overlap in time, the row assignment algorithm should place them in different rows such that no two items in the same row have overlapping date ranges.

**Validates: Requirements 3.5**

### Property 9: Theme Filtering

*For any* roadmap and any set of theme IDs, applying a theme filter should return a roadmap containing only the specified themes and their descendant products and features.

**Validates: Requirements 4.1**

### Property 10: Product Filtering

*For any* roadmap and any set of product IDs, applying a product filter should return a roadmap containing only the specified products and their descendant features (including their parent themes for context).

**Validates: Requirements 4.2**

### Property 11: Date Range Filtering

*For any* roadmap and any date range, applying a date range filter should return only items whose date ranges overlap with the specified range (where an item overlaps if its start date is before the range end and its end date is after the range start).

**Validates: Requirements 4.3**

### Property 12: Filter Composition

*For any* roadmap and any combination of filters (theme, product, date range), the result should be equivalent to applying each filter sequentially and taking the intersection of results.

**Validates: Requirements 4.4**

### Property 13: Filter Reset Round-trip

*For any* roadmap, applying any filters and then clearing all filters should return a roadmap equivalent to the original unfiltered roadmap.

**Validates: Requirements 4.5**

### Property 14: Timeline Unit Configuration

*For any* time unit setting (day, week, month, quarter), the timeline calculation should generate appropriate time divisions and labels for that granularity level.

**Validates: Requirements 5.1**

### Property 15: Zoom Affects Granularity

*For any* timeline view, increasing the zoom level should result in finer time granularity (more divisions), and decreasing the zoom level should result in coarser time granularity (fewer divisions).

**Validates: Requirements 5.2, 5.3**

### Property 16: Pan Shifts Date Range

*For any* timeline view and any pan offset, panning should shift the visible date range by an amount proportional to the offset and current zoom level.

**Validates: Requirements 5.4**

### Property 17: View Reset Shows All Items

*For any* roadmap and any view state (zoom, pan, filters), resetting the view should result in all roadmap items being visible and the timeline scaled to show the full date range.

**Validates: Requirements 5.5**

### Property 18: Storage Round-trip Preserves Data

*For any* valid roadmap, saving to storage and then loading should return a roadmap equivalent to the original (same structure, items, dates, and properties).

**Validates: Requirements 6.1, 6.2**

### Property 19: Storage Failure Preserves Memory State

*For any* roadmap in memory, if a storage operation fails, the in-memory roadmap should remain unchanged and valid.

**Validates: Requirements 6.3**

### Property 20: Data Validation on Load

*For any* data loaded from storage, the validation service should check data integrity and return appropriate validation results indicating whether the data is valid, invalid, or requires warnings.

**Validates: Requirements 6.4, 6.5**

### Property 21: Export Includes Visible Items

*For any* roadmap with active filters, exporting should include exactly the items that are currently visible according to the filter criteria.

**Validates: Requirements 7.1, 7.4**

### Property 22: JSON Export Round-trip

*For any* valid roadmap, exporting to JSON and then parsing the JSON should return a roadmap equivalent to the original.

**Validates: Requirements 7.3, 7.5**

### Property 23: PNG Export Produces Valid Image

*For any* roadmap, exporting to PNG should produce a valid PNG blob that can be loaded as an image.

**Validates: Requirements 7.2**

### Property 24: Date Validation Rejects Invalid Ranges

*For any* start date and end date where the end date is before the start date, the validation service should reject the input and return an error.

**Validates: Requirements 9.1**

### Property 25: Hierarchy Date Validation

*For any* child item (feature or product) and its parent item (product or theme), if the child's date range extends beyond the parent's date range, the validation service should return a warning.

**Validates: Requirements 9.2, 9.3**

### Property 26: Date Format Parsing

*For any* valid date string in formats YYYY-MM-DD or MM/DD/YYYY, the date parser should successfully parse it into a valid Date object.

**Validates: Requirements 9.4**

### Property 27: Invalid Date Format Rejection

*For any* string that does not match valid date formats, the date parser should reject it and return an error.

**Validates: Requirements 9.5**
