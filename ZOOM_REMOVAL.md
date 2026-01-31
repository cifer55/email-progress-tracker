# Date Range Filter Removal and Timeline Drag Implementation

## Summary
Removed the date range filter from the FilterPanel and implemented horizontal drag/pan functionality for the timeline in the GanttChart component. Added quarter labels and week numbers to the timeline header for better time visualization. Added a current date indicator line.

## Changes Made

### 1. FilterContext.tsx
- Removed `setDateRangeFilter` and `clearDateRangeFilter` from FilterContextValue interface
- Removed date range from `createEmptyFilters()` function
- Removed date range check from `hasActiveFilters()` function
- Removed date range filter methods from context value export

### 2. FilterPanel.tsx
- Removed date range props from FilterPanelProps interface
- Removed entire "Date Range Filter" section from JSX
- Removed `formatDateForInput` helper function
- Removed unused `useState` import (changed to React import)

### 3. App.tsx
- Removed `setDateRangeFilter` from useFilters destructuring
- Removed `activeDateRange` and `onDateRangeFilterChange` props from FilterPanel component

### 4. GanttChart.tsx - Horizontal Drag Implementation
Added horizontal pan/drag functionality:
- Added `panOffset` state to track horizontal pan position
- Added `isDragging`, `dragStartX`, `dragStartPanOffset` states for drag tracking
- Updated `drawTimelineHeader()` to apply pan offset to date labels and grid lines
- Updated `drawGridLines()` to apply pan offset to vertical grid lines
- Updated `drawItemBar()` to apply pan offset to bar positions
- Added `handleMouseDown()` to start dragging when clicking in header or empty space
- Added `handleMouseUp()` to stop dragging
- Added `handleMouseLeave()` to stop dragging when mouse leaves canvas
- Updated `handleMouseMove()` to handle dragging and update pan offset
- Updated `handleClick()` to account for pan offset and prevent clicks during drag
- Updated `handleDoubleClick()` to account for pan offset
- Added grab/grabbing cursor styles for better UX
- Canvas event handlers now include: onMouseDown, onMouseUp, onMouseLeave

### 5. GanttChart.tsx - Quarter Labels and Week Numbers in Header
Enhanced timeline header with three-row layout:
- Increased `HEADER_HEIGHT` from 60px to 110px to accommodate three rows
- Added `QUARTER_ROW_HEIGHT` (30px), `MONTH_ROW_HEIGHT` (30px), and `WEEK_ROW_HEIGHT` (50px) constants
- Added `getISOWeekNumber()` helper function to calculate ISO week numbers
- Added `getWeekStart()` helper function to get Monday of each week
- Completely rewrote `drawTimelineHeader()` function:
  - **Top row**: Quarter labels (Q1, Q2, Q3, Q4) in bold 13px font
  - **Middle row**: Month labels (Jan 2024, Feb 2024, etc.) in regular 12px font
  - **Bottom row**: Week numbers (W1, W2, W3, etc.) in 11px font, each in a separate bordered cell
  - Draws separator lines between all three rows
  - Draws thicker vertical lines at quarter boundaries (2px)
  - Draws regular vertical lines at month boundaries (1px)
  - **Each week is a separate cell**: Draws complete rectangle borders around each week cell
  - **Always visible week numbers**: Week numbers are always displayed regardless of cell width
  - **Text clipping**: Clips week number text to cell boundaries to prevent overlap between adjacent cells
  - Centers quarter labels across their respective months
  - Centers week numbers within their respective cells
  - Generates week cells dynamically with start/end positions based on 7-day spans
  - Uses ISO week numbering standard (week 1 = first week with Thursday)
  - Applies pan offset to all elements for smooth dragging

### 6. GanttChart.tsx - Current Date Indicator
Added visual indicator for current date:
- Added `drawCurrentDateLine()` function to draw a vertical line at today's date
- Line is drawn as a dotted red line (Amazon Red: #B12704)
- Line width is 2px for visibility
- Dotted pattern uses 5px dashes with 5px gaps
- Line spans from top of canvas to bottom
- Only drawn if current date falls within the timeline range
- Respects pan offset for synchronized scrolling
- Line is drawn after grid lines but before product labels and bars

## User Experience
- Users can now drag the timeline horizontally by clicking and dragging in the header area or on empty space
- Cursor changes to "grab" in header area and "grabbing" while dragging
- All bar positions, grid lines, and date labels move together smoothly
- Click and double-click still work on bars (accounting for pan offset)
- No date range filter cluttering the left panel
- Timeline header now shows three levels of time hierarchy:
  - **Quarters** (Q1, Q2, Q3, Q4) for high-level planning
  - **Months** (Jan, Feb, Mar, etc.) for medium-term planning
  - **Week numbers** (1, 2, 3, etc.) for detailed sprint planning - each week is a separate bordered cell
- Quarter boundaries are visually distinct with thicker lines
- Week cells provide clear visual separation with complete borders around each 7-day period
- **Current date indicator**: A dotted red vertical line marks today's date on the timeline for easy reference

## Testing
All 167 tests pass successfully.

## Technical Notes
- Pan offset is applied consistently across all rendering functions
- Drag detection prevents accidental clicks during pan operations
- Off-screen divisions are skipped for performance optimization
- Smooth rendering maintained with requestAnimationFrame
- Quarter grouping algorithm efficiently calculates quarter boundaries from month divisions
- Week number calculation uses ISO 8601 standard (week starts Monday, week 1 has first Thursday)
- Three-row header layout provides hierarchical time context (quarters → months → weeks)
- Week generation is dynamic and adapts to the timeline date range
- Each week is rendered as a separate cell with complete border (rectangle) for clear visual separation
- Week cells span exactly 7 days and are calculated based on pixel-per-day scale
- Week numbers are always displayed, regardless of zoom level or cell width
- Text is clipped to cell boundaries using canvas clipping regions to prevent overlap
- Current date line is drawn as a 2px dotted red line spanning the full canvas height
- Current date line only appears when today's date is within the visible timeline range
- All elements (grid lines, week cells, current date line) respect pan offset for synchronized scrolling
