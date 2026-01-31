/**
 * Timeline calculation utilities for Gantt chart rendering
 */

export type TimeUnit = 'day' | 'week' | 'month' | 'quarter';

export interface TimelineDivision {
  date: Date;
  label: string;
  x: number;
}

export interface TimelineScale {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  pixelsPerDay: number;
  divisions: TimelineDivision[];
}

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startMs = start.getTime();
  const endMs = end.getTime();
  return Math.ceil((endMs - startMs) / msPerDay);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get the start of the week for a given date (Monday)
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the start of the month for a given date
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the start of the quarter for a given date
 */
export function getQuarterStart(date: Date): Date {
  const month = date.getMonth();
  const quarterMonth = Math.floor(month / 3) * 3;
  return new Date(date.getFullYear(), quarterMonth, 1);
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Format date for timeline label based on time unit
 */
export function formatDateLabel(date: Date, timeUnit: TimeUnit): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  switch (timeUnit) {
    case 'day':
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    case 'week':
      return `Week of ${monthNames[date.getMonth()]} ${date.getDate()}`;
    case 'month':
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
  }
}

/**
 * Calculate timeline scale and divisions for rendering
 * 
 * @param startDate - Start date of the timeline
 * @param endDate - End date of the timeline
 * @param timeUnit - Time unit for divisions (day, week, month, quarter)
 * @param canvasWidth - Width of the canvas in pixels
 * @param padding - Padding on each side in pixels
 * @returns TimelineScale object with divisions
 */
export function calculateTimelineScale(
  startDate: Date,
  endDate: Date,
  timeUnit: TimeUnit,
  canvasWidth: number,
  padding: number = 50
): TimelineScale {
  const totalDays = daysBetween(startDate, endDate);
  const availableWidth = canvasWidth - (padding * 2);
  const pixelsPerDay = availableWidth / totalDays;
  
  const divisions: TimelineDivision[] = [];
  let currentDate = new Date(startDate);
  
  // Align to the appropriate time unit boundary
  switch (timeUnit) {
    case 'day':
      currentDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      currentDate = getWeekStart(currentDate);
      break;
    case 'month':
      currentDate = getMonthStart(currentDate);
      break;
    case 'quarter':
      currentDate = getQuarterStart(currentDate);
      break;
  }
  
  // Generate divisions
  while (currentDate <= endDate) {
    const daysFromStart = daysBetween(startDate, currentDate);
    const x = padding + (daysFromStart * pixelsPerDay);
    
    divisions.push({
      date: new Date(currentDate),
      label: formatDateLabel(currentDate, timeUnit),
      x
    });
    
    // Move to next division
    switch (timeUnit) {
      case 'day':
        currentDate = addDays(currentDate, 1);
        break;
      case 'week':
        currentDate = addDays(currentDate, 7);
        break;
      case 'month':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'quarter':
        currentDate = addMonths(currentDate, 3);
        break;
    }
  }
  
  return {
    startDate,
    endDate,
    totalDays,
    pixelsPerDay,
    divisions
  };
}

/**
 * Calculate the date range that encompasses all items in a roadmap
 * Adds padding to the start and end dates
 */
export function calculateDateRange(
  items: Array<{ startDate: Date; endDate: Date }>,
  paddingDays: number = 7
): { startDate: Date; endDate: Date } {
  if (items.length === 0) {
    // Default to current month if no items
    const now = new Date();
    return {
      startDate: getMonthStart(now),
      endDate: addMonths(getMonthStart(now), 1)
    };
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
  
  return {
    startDate: addDays(minDate, -paddingDays),
    endDate: addDays(maxDate, paddingDays)
  };
}
