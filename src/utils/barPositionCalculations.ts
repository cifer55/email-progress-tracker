/**
 * Bar position calculation utilities for Gantt chart rendering
 */

export interface BarPosition {
  x: number;
  width: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return Math.ceil((endMs - startMs) / msPerDay);
}

/**
 * Calculate the x-position and width of a bar based on its dates
 * 
 * @param itemStartDate - Start date of the item
 * @param itemEndDate - End date of the item
 * @param timelineStartDate - Start date of the visible timeline
 * @param timelineEndDate - End date of the visible timeline
 * @param pixelsPerDay - Number of pixels per day
 * @param padding - Left padding in pixels
 * @returns BarPosition object with x and width
 */
export function calculateBarPosition(
  itemStartDate: Date,
  itemEndDate: Date,
  timelineStartDate: Date,
  timelineEndDate: Date,
  pixelsPerDay: number,
  padding: number = 50
): BarPosition {
  // Clamp item dates to visible timeline range
  const visibleStartDate = itemStartDate < timelineStartDate ? timelineStartDate : itemStartDate;
  const visibleEndDate = itemEndDate > timelineEndDate ? timelineEndDate : itemEndDate;
  
  // Calculate days from timeline start to item start
  const daysFromTimelineStart = daysBetween(timelineStartDate, visibleStartDate);
  
  // Calculate item duration in days
  const itemDurationDays = daysBetween(visibleStartDate, visibleEndDate);
  
  // Calculate x position and width
  const x = padding + (daysFromTimelineStart * pixelsPerDay);
  const width = Math.max(itemDurationDays * pixelsPerDay, 2); // Minimum width of 2px
  
  return {
    x,
    width,
    startDate: itemStartDate,
    endDate: itemEndDate
  };
}

/**
 * Calculate bar positions for multiple items
 * 
 * @param items - Array of items with start and end dates
 * @param timelineStartDate - Start date of the visible timeline
 * @param timelineEndDate - End date of the visible timeline
 * @param pixelsPerDay - Number of pixels per day
 * @param padding - Left padding in pixels
 * @returns Array of BarPosition objects
 */
export function calculateBarPositions(
  items: Array<{ startDate: Date; endDate: Date }>,
  timelineStartDate: Date,
  timelineEndDate: Date,
  pixelsPerDay: number,
  padding: number = 50
): BarPosition[] {
  return items.map(item => 
    calculateBarPosition(
      item.startDate,
      item.endDate,
      timelineStartDate,
      timelineEndDate,
      pixelsPerDay,
      padding
    )
  );
}

/**
 * Check if an item is visible within the timeline range
 * An item is visible if its date range overlaps with the timeline range
 */
export function isItemVisible(
  itemStartDate: Date,
  itemEndDate: Date,
  timelineStartDate: Date,
  timelineEndDate: Date
): boolean {
  return itemStartDate <= timelineEndDate && itemEndDate >= timelineStartDate;
}
