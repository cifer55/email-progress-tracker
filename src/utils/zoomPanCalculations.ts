/**
 * Zoom and pan calculation utilities for Gantt chart navigation
 */

import { TimeUnit } from './timelineCalculations';

export interface ViewTransform {
  zoomLevel: number;
  panOffset: number;
  visibleStartDate: Date;
  visibleEndDate: Date;
}

/**
 * Zoom level constraints
 */
export const MIN_ZOOM_LEVEL = 0.1;
export const MAX_ZOOM_LEVEL = 10.0;
export const ZOOM_STEP = 0.2;

/**
 * Calculate the appropriate time unit based on zoom level
 * Higher zoom = finer granularity
 * 
 * @param zoomLevel - Current zoom level (1.0 = 100%)
 * @returns Appropriate time unit for the zoom level
 */
export function getTimeUnitForZoom(zoomLevel: number): TimeUnit {
  if (zoomLevel >= 4.0) {
    return 'day';
  } else if (zoomLevel >= 2.0) {
    return 'week';
  } else if (zoomLevel >= 0.5) {
    return 'month';
  } else {
    return 'quarter';
  }
}

/**
 * Apply zoom to the current view
 * Zooming in increases the zoom level and shows finer detail
 * Zooming out decreases the zoom level and shows more overview
 * 
 * @param currentZoom - Current zoom level
 * @param zoomIn - True to zoom in, false to zoom out
 * @returns New zoom level
 */
export function applyZoom(currentZoom: number, zoomIn: boolean): number {
  const newZoom = zoomIn 
    ? currentZoom + ZOOM_STEP 
    : currentZoom - ZOOM_STEP;
  
  return Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newZoom));
}

/**
 * Calculate the visible date range after applying zoom
 * Zooming adjusts the date range while keeping the center point stable
 * 
 * @param originalStartDate - Original timeline start date
 * @param originalEndDate - Original timeline end date
 * @param zoomLevel - Current zoom level (1.0 = 100%)
 * @param centerDate - Date to keep centered (optional, defaults to midpoint)
 * @returns New visible date range
 */
export function calculateZoomedDateRange(
  originalStartDate: Date,
  originalEndDate: Date,
  zoomLevel: number,
  centerDate?: Date
): { startDate: Date; endDate: Date } {
  const msPerDay = 1000 * 60 * 60 * 24;
  
  // Calculate original range in days
  const originalRangeDays = (originalEndDate.getTime() - originalStartDate.getTime()) / msPerDay;
  
  // Calculate new range based on zoom (inverse relationship: higher zoom = smaller range)
  const newRangeDays = originalRangeDays / zoomLevel;
  
  // Determine center point
  const center = centerDate || new Date(
    (originalStartDate.getTime() + originalEndDate.getTime()) / 2
  );
  
  // Calculate new start and end dates centered on the center point
  const halfRangeMs = (newRangeDays / 2) * msPerDay;
  const startDate = new Date(center.getTime() - halfRangeMs);
  const endDate = new Date(center.getTime() + halfRangeMs);
  
  return { startDate, endDate };
}

/**
 * Apply pan offset to shift the visible date range
 * Positive offset shifts right (forward in time), negative shifts left (backward in time)
 * 
 * @param currentStartDate - Current visible start date
 * @param currentEndDate - Current visible end date
 * @param panOffsetDays - Number of days to pan (positive = right, negative = left)
 * @returns New visible date range
 */
export function applyPan(
  currentStartDate: Date,
  currentEndDate: Date,
  panOffsetDays: number
): { startDate: Date; endDate: Date } {
  const msPerDay = 1000 * 60 * 60 * 24;
  const offsetMs = panOffsetDays * msPerDay;
  
  return {
    startDate: new Date(currentStartDate.getTime() + offsetMs),
    endDate: new Date(currentEndDate.getTime() + offsetMs)
  };
}

/**
 * Calculate pan offset in days based on pixel movement
 * 
 * @param pixelOffset - Number of pixels moved
 * @param pixelsPerDay - Current pixels per day ratio
 * @returns Pan offset in days
 */
export function calculatePanOffsetFromPixels(
  pixelOffset: number,
  pixelsPerDay: number
): number {
  return pixelOffset / pixelsPerDay;
}

/**
 * Reset view to show all items with padding
 * 
 * @param items - Array of items with start and end dates
 * @param paddingDays - Number of days to add as padding
 * @returns View transform with zoom level 1.0 and dates encompassing all items
 */
export function resetView(
  items: Array<{ startDate: Date; endDate: Date }>,
  paddingDays: number = 7
): { startDate: Date; endDate: Date; zoomLevel: number } {
  if (items.length === 0) {
    // Default to current month if no items
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate, endDate, zoomLevel: 1.0 };
  }
  
  let minDate = items[0].startDate;
  let maxDate = items[0].endDate;
  
  for (const item of items) {
    if (item.startDate < minDate) {
      minDate = item.startDate;
    }
    if (item.endDate > maxDate) {
      maxDate = item.endDate;
    }
  }
  
  const msPerDay = 1000 * 60 * 60 * 24;
  const paddingMs = paddingDays * msPerDay;
  
  return {
    startDate: new Date(minDate.getTime() - paddingMs),
    endDate: new Date(maxDate.getTime() + paddingMs),
    zoomLevel: 1.0
  };
}

/**
 * Constrain pan to prevent scrolling beyond reasonable bounds
 * 
 * @param startDate - Proposed start date
 * @param endDate - Proposed end date
 * @param absoluteMinDate - Absolute minimum date allowed
 * @param absoluteMaxDate - Absolute maximum date allowed
 * @returns Constrained date range
 */
export function constrainPan(
  startDate: Date,
  endDate: Date,
  absoluteMinDate: Date,
  absoluteMaxDate: Date
): { startDate: Date; endDate: Date } {
  const rangeDuration = endDate.getTime() - startDate.getTime();
  
  let constrainedStart = startDate;
  let constrainedEnd = endDate;
  
  // If panned too far left
  if (startDate < absoluteMinDate) {
    constrainedStart = absoluteMinDate;
    constrainedEnd = new Date(constrainedStart.getTime() + rangeDuration);
  }
  
  // If panned too far right
  if (endDate > absoluteMaxDate) {
    constrainedEnd = absoluteMaxDate;
    constrainedStart = new Date(constrainedEnd.getTime() - rangeDuration);
  }
  
  return {
    startDate: constrainedStart,
    endDate: constrainedEnd
  };
}
