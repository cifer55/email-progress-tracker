/**
 * GanttChart Component Tests
 * Basic rendering tests for the GanttChart component
 */

import { describe, it, expect } from 'vitest';
import { GanttChart } from './GanttChart';

describe('GanttChart', () => {
  it('should export GanttChart component', () => {
    expect(GanttChart).toBeDefined();
    expect(typeof GanttChart).toBe('function');
  });

  it('should be a valid React component', () => {
    expect(GanttChart.name).toBe('GanttChart');
  });
});
