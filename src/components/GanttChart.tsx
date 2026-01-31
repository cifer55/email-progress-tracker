/**
 * GanttChart Component
 * Renders an interactive Gantt chart visualization of the roadmap
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 2.3, 2.4
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Theme, Product, Feature, Roadmap } from '../models';
import { useRoadmap } from '../contexts/RoadmapContext';
import {
  calculateTimelineScale,
  calculateDateRange,
  TimelineScale,
} from '../utils/timelineCalculations';
import {
  calculateBarPosition,
  BarPosition,
} from '../utils/barPositionCalculations';
import {
  assignRowsByProduct,
  getRowForItem,
  ItemWithDates,
} from '../utils/rowAssignment';
import './GanttChart.css';

export interface GanttChartProps {
  onItemClick?: (item: Theme | Product | Feature) => void;
  onItemDoubleClick?: (item: Theme | Product | Feature) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

// Visual constants - Amazon color theme
const HEADER_HEIGHT = 110; // Increased for three-row header (quarters + months + weeks)
const QUARTER_ROW_HEIGHT = 30;
const MONTH_ROW_HEIGHT = 30;
const WEEK_ROW_HEIGHT = 50;
const ROW_HEIGHT = 40;
const ROW_PADDING = 8;
const BAR_HEIGHT = ROW_HEIGHT - (ROW_PADDING * 2);
const LEFT_PADDING = 200; // Increased for product labels
const GRID_COLOR = '#D5D9D9';
const TEXT_COLOR = '#0F1111'; // Amazon Text
const HOVER_OPACITY = 0.7;
const LABEL_WIDTH = 180; // Width for product labels

// Theme colors for color-coding features
const THEME_COLORS = [
  '#FF9900', // Amazon Orange
  '#007185', // Amazon Blue
  '#067D62', // Amazon Green
  '#C7511F', // Amazon Dark Orange
  '#146EB4', // Amazon Light Blue
  '#008296', // Amazon Teal
  '#B12704', // Amazon Red
  '#565959', // Amazon Gray
];

interface RenderableItem {
  id: string;
  type: 'feature';
  name: string;
  startDate: Date;
  endDate: Date;
  row: number;
  barPosition: BarPosition;
  item: Feature;
  productName: string;
  themeColor: string;
  progress?: {
    status: string;
    percentComplete: number;
    lastUpdateTime?: Date;
    lastUpdateSummary?: string;
  };
}

export function GanttChart({ onItemClick, onItemDoubleClick, onCanvasReady }: GanttChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [renderableItems, setRenderableItems] = useState<RenderableItem[]>([]);
  const [timelineScale, setTimelineScale] = useState<TimelineScale | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 400 });
  const [scrollOffset, setScrollOffset] = useState(0);
  const [panOffset, setPanOffset] = useState(0); // Horizontal pan offset
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPanOffset, setDragStartPanOffset] = useState(0);
  const renderTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { roadmap } = useRoadmap();
  
  // Debug logging
  useEffect(() => {
    console.log('GanttChart: Roadmap data', {
      totalThemes: roadmap.themes.length,
      totalProducts: roadmap.themes.flatMap(t => t.products).length,
      totalFeatures: roadmap.themes.flatMap(t => t.products.flatMap(p => p.features)).length,
    });
  }, [roadmap]);

  // Notify parent when canvas is ready
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  /**
   * Handle viewport resize
   * Recalculates canvas dimensions based on container size
   * Requirements: 10.1, 10.4
   */
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, 320); // Minimum width for mobile
      const height = Math.max(rect.height, 300); // Minimum height

      setCanvasSize({ width, height });
    };

    // Initial size calculation
    updateCanvasSize();

    // Add resize listener with debouncing for performance
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        updateCanvasSize();
      }, 150); // 150ms debounce to meet 200ms requirement
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  /**
   * Collect all features from the roadmap hierarchy
   * Only features are rendered as bars
   * Memoized to avoid recalculation on every render
   */
  const collectVisibleItems = useCallback((roadmap: Roadmap): ItemWithDates[] => {
    const items: ItemWithDates[] = [];

    for (const theme of roadmap.themes) {
      // Skip products if theme is collapsed
      if (theme.collapsed) {
        continue;
      }

      for (const product of theme.products) {
        // Skip features if product is collapsed
        if (product.collapsed) {
          continue;
        }

        for (const feature of product.features) {
          items.push({
            id: feature.id,
            startDate: feature.startDate,
            endDate: feature.endDate,
            type: 'feature',
            parentId: product.id,
          });
        }
      }
    }

    return items;
  }, []);

  /**
   * Calculate visible items for virtual scrolling
   * Only renders items that are currently in the viewport
   * Requirements: 8.4 (Performance optimization)
   */
  const getVisibleItemsForViewport = useCallback((
    items: RenderableItem[],
    scrollOffset: number,
    viewportHeight: number
  ): RenderableItem[] => {
    // If we have fewer than 50 items, render all (no need for virtual scrolling)
    if (items.length < 50) {
      return items;
    }

    const startRow = Math.floor(scrollOffset / ROW_HEIGHT);
    const endRow = Math.ceil((scrollOffset + viewportHeight) / ROW_HEIGHT) + 1;

    return items.filter(item => item.row >= startRow && item.row <= endRow);
  }, []);

  /**
   * Prepare items for rendering with row assignments and bar positions
   * Only features are rendered, grouped by product, color-coded by theme
   * Memoized to avoid recalculation unless dependencies change
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const visibleItems = collectVisibleItems(roadmap);
    
    if (visibleItems.length === 0) {
      setRenderableItems([]);
      setTimelineScale(null);
      return;
    }

    // Calculate date range
    const dateRange = calculateDateRange(visibleItems, 7);
    
    // Calculate timeline scale using current canvas width
    const scale = calculateTimelineScale(
      dateRange.startDate,
      dateRange.endDate,
      'month', // Default time unit
      canvasSize.width,
      LEFT_PADDING
    );
    setTimelineScale(scale);

    // Assign rows grouped by product
    const rowAssignments = assignRowsByProduct(visibleItems, roadmap);

    // Create a theme color map
    const themeColorMap = new Map<string, string>();
    roadmap.themes.forEach((theme, index) => {
      themeColorMap.set(theme.id, THEME_COLORS[index % THEME_COLORS.length]);
    });

    // Build renderable items (only features)
    const items: RenderableItem[] = [];

    for (const theme of roadmap.themes) {
      if (theme.collapsed) continue;

      const themeColor = themeColorMap.get(theme.id) || THEME_COLORS[0];

      for (const product of theme.products) {
        if (product.collapsed) continue;

        for (const feature of product.features) {
          const row = getRowForItem(feature.id, rowAssignments);
          const barPosition = calculateBarPosition(
            feature.startDate,
            feature.endDate,
            scale.startDate,
            scale.endDate,
            scale.pixelsPerDay,
            LEFT_PADDING
          );

          items.push({
            id: feature.id,
            type: 'feature',
            name: feature.name,
            startDate: feature.startDate,
            endDate: feature.endDate,
            row,
            barPosition,
            item: feature,
            productName: product.name,
            themeColor,
            progress: feature.progress,
          });
        }
      }
    }

    setRenderableItems(items);
    
    console.log('GanttChart: Renderable items prepared', {
      totalItems: items.length,
      itemsByProduct: items.reduce((acc, item) => {
        acc[item.productName] = (acc[item.productName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      rows: items.map(i => ({ name: i.name, row: i.row, product: i.productName }))
    });
  }, [roadmap, canvasSize.width, collectVisibleItems]);

  /**
   * Perform the actual canvas rendering
   * Separated from scheduling for better control
   */
  const performRender = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !timelineScale) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Update canvas dimensions
    const displayWidth = canvasSize.width;
    
    // Calculate canvas height based on number of rows
    const maxRow = renderableItems.length > 0 
      ? Math.max(...renderableItems.map(item => item.row))
      : 0;
    const contentHeight = HEADER_HEIGHT + ((maxRow + 1) * ROW_HEIGHT);
    const displayHeight = Math.max(contentHeight, canvasSize.height);
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Set display size (CSS pixels)
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    console.log('GanttChart: Canvas dimensions', {
      displayWidth,
      displayHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      dpr,
      contentHeight,
      maxRow,
      itemCount: renderableItems.length
    });

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw timeline header
    drawTimelineHeader(ctx, timelineScale, displayWidth);

    // Draw grid lines
    drawGridLines(ctx, timelineScale, displayWidth, displayHeight);

    // Draw current date line
    drawCurrentDateLine(ctx, timelineScale, displayHeight);

    // Draw product labels
    drawProductLabels(ctx);

    // Apply virtual scrolling - only render visible items
    const visibleItems = getVisibleItemsForViewport(
      renderableItems,
      scrollOffset,
      displayHeight
    );

    // Draw item bars (only visible ones)
    for (const item of visibleItems) {
      const isHovered = item.id === hoveredItemId;
      drawItemBar(ctx, item, isHovered);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderableItems, timelineScale, hoveredItemId, canvasSize, scrollOffset, panOffset]);

  /**
   * Debounced render function using requestAnimationFrame
   * Ensures smooth rendering and meets 200ms performance requirement
   * Requirements: 8.4
   */
  const scheduleRender = useCallback(() => {
    // Cancel any pending render
    if (renderTimeoutRef.current !== null) {
      clearTimeout(renderTimeoutRef.current);
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Schedule new render with debouncing (50ms for responsiveness)
    renderTimeoutRef.current = window.setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(() => {
        performRender();
      });
    }, 50);
  }, [performRender]);

  /**
   * Render the Gantt chart on canvas with debouncing
   * Requirements: 8.4 (Performance optimization)
   */
  useEffect(() => {
    scheduleRender();

    // Cleanup on unmount
    return () => {
      if (renderTimeoutRef.current !== null) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleRender]);

  /**
   * Calculate ISO week number for a date
   * ISO week 1 is the week with the first Thursday of the year
   */
  const getISOWeekNumber = useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  /**
   * Get the start of the week for a given date (Monday)
   */
  const getWeekStart = useCallback((date: Date): Date => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }, []);

  /**
   * Draw the timeline header with quarter and month labels
   * Memoized to avoid recreation on every render
   */
  const drawTimelineHeader = useCallback((
    ctx: CanvasRenderingContext2D,
    scale: TimelineScale,
    canvasWidth: number
  ) => {
    // Draw header background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasWidth, HEADER_HEIGHT);

    // Draw header border
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(canvasWidth, HEADER_HEIGHT);
    ctx.stroke();

    // Draw separator between quarter and month rows
    ctx.beginPath();
    ctx.moveTo(0, QUARTER_ROW_HEIGHT);
    ctx.lineTo(canvasWidth, QUARTER_ROW_HEIGHT);
    ctx.stroke();

    // Draw separator between month and week rows
    ctx.beginPath();
    ctx.moveTo(0, QUARTER_ROW_HEIGHT + MONTH_ROW_HEIGHT);
    ctx.lineTo(canvasWidth, QUARTER_ROW_HEIGHT + MONTH_ROW_HEIGHT);
    ctx.stroke();

    // Generate week cells first (we need them for calculating widths)
    const weekCells: Array<{ startX: number; endX: number; weekNumber: number; weekStart: Date }> = [];
    
    if (scale.startDate && scale.endDate) {
      // Start from the Monday of the week containing the start date
      let currentWeekStart = getWeekStart(scale.startDate);
      const endDate = new Date(scale.endDate);
      endDate.setDate(endDate.getDate() + 14); // Add buffer to ensure we cover all weeks

      const msPerDay = 1000 * 60 * 60 * 24;

      while (currentWeekStart <= endDate) {
        const weekNumber = getISOWeekNumber(currentWeekStart);
        
        // Calculate start x position for this week
        const daysFromStart = (currentWeekStart.getTime() - scale.startDate.getTime()) / msPerDay;
        const startX = LEFT_PADDING + (daysFromStart * scale.pixelsPerDay) + panOffset;
        
        // Calculate end x position (exactly 7 days later)
        const endX = startX + (7 * scale.pixelsPerDay);
        
        weekCells.push({
          startX,
          endX,
          weekNumber,
          weekStart: new Date(currentWeekStart)
        });
        
        // Move to next week (exactly 7 days)
        currentWeekStart = new Date(currentWeekStart);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
    }

    // Group months by quarter for quarter labels
    const quarterGroups = new Map<string, { startX: number; endX: number; label: string }>();
    
    for (const division of scale.divisions) {
      const x = division.x + panOffset;
      const date = division.date;
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `Q${quarter} ${date.getFullYear()}`;
      
      if (!quarterGroups.has(quarterKey)) {
        quarterGroups.set(quarterKey, { startX: x, endX: x, label: quarterKey });
      } else {
        const group = quarterGroups.get(quarterKey)!;
        group.endX = x;
      }
    }

    // Draw quarter labels
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [_, group] of quarterGroups) {
      // Skip quarters that are completely off-screen
      if (group.endX < LEFT_PADDING - 100 || group.startX > canvasWidth + 100) continue;
      
      const centerX = (group.startX + group.endX) / 2;
      
      // Draw vertical line at quarter boundary
      if (group.startX >= LEFT_PADDING - 50 && group.startX <= canvasWidth + 50) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(group.startX, 0);
        ctx.lineTo(group.startX, QUARTER_ROW_HEIGHT);
        ctx.stroke();
      }
      
      // Draw quarter label
      ctx.fillText(group.label, centerX, QUARTER_ROW_HEIGHT / 2);
    }

    // Draw month labels
    ctx.font = '12px sans-serif';
    
    for (const division of scale.divisions) {
      const x = division.x + panOffset;
      
      // Skip divisions that are off-screen
      if (x < LEFT_PADDING - 50 || x > canvasWidth + 50) continue;
      
      // Draw vertical line
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, QUARTER_ROW_HEIGHT);
      ctx.lineTo(x, QUARTER_ROW_HEIGHT + MONTH_ROW_HEIGHT);
      ctx.stroke();

      // Draw month label
      ctx.fillStyle = TEXT_COLOR;
      ctx.fillText(division.label, x, QUARTER_ROW_HEIGHT + (MONTH_ROW_HEIGHT / 2));
    }

    // Draw week cells with borders
    ctx.font = '11px sans-serif';
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    
    for (const cell of weekCells) {
      // Skip cells that are completely off-screen
      if (cell.endX < LEFT_PADDING - 50 || cell.startX > canvasWidth + 50) continue;
      
      const cellWidth = cell.endX - cell.startX;
      const cellY = QUARTER_ROW_HEIGHT + MONTH_ROW_HEIGHT;
      
      // Draw cell border (rectangle)
      ctx.strokeRect(cell.startX, cellY, cellWidth, WEEK_ROW_HEIGHT);
      
      // Always draw week number, clipped to cell boundaries
      const weekText = `${cell.weekNumber}`;
      ctx.fillStyle = TEXT_COLOR;
      const centerX = cell.startX + (cellWidth / 2);
      
      // Clip text to cell boundaries to prevent overlap
      ctx.save();
      ctx.beginPath();
      ctx.rect(cell.startX + 1, cellY + 1, cellWidth - 2, WEEK_ROW_HEIGHT - 2);
      ctx.clip();
      
      ctx.fillText(weekText, centerX, cellY + (WEEK_ROW_HEIGHT / 2));
      
      ctx.restore();
    }
  }, [panOffset, getISOWeekNumber, getWeekStart]);

  /**
   * Draw grid lines
   * Memoized to avoid recreation on every render
   */
  const drawGridLines = useCallback((
    ctx: CanvasRenderingContext2D,
    scale: TimelineScale,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;

    // Vertical grid lines with pan offset
    for (const division of scale.divisions) {
      const x = division.x + panOffset;
      
      // Skip divisions that are off-screen
      if (x < LEFT_PADDING - 50 || x > canvasWidth + 50) continue;
      
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }

    // Horizontal grid lines (between rows)
    for (let i = 0; i <= renderableItems.length; i++) {
      const y = HEADER_HEIGHT + (i * ROW_HEIGHT);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }
  }, [renderableItems.length, panOffset]);

  /**
   * Draw current date line as a dotted red vertical line
   * Memoized to avoid recreation on every render
   */
  const drawCurrentDateLine = useCallback((
    ctx: CanvasRenderingContext2D,
    scale: TimelineScale,
    canvasHeight: number
  ) => {
    const now = new Date();
    
    // Only draw if current date is within the timeline range
    if (now < scale.startDate || now > scale.endDate) {
      return;
    }
    
    // Calculate x position for current date
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysFromStart = (now.getTime() - scale.startDate.getTime()) / msPerDay;
    const x = LEFT_PADDING + (daysFromStart * scale.pixelsPerDay) + panOffset;
    
    // Draw dotted red line
    ctx.strokeStyle = '#B12704'; // Amazon Red
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dotted pattern: 5px dash, 5px gap
    
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
    
    // Reset line dash for other drawings
    ctx.setLineDash([]);
  }, [panOffset]);

  /**
   * Draw product labels on the left side
   * Groups features by product
   */
  /**
   * Draw product labels on the left side
   * Groups features by product
   * Product labels should always be visible, not affected by virtual scrolling
   */
  const drawProductLabels = useCallback((ctx: CanvasRenderingContext2D) => {
    // Group ALL items by product (not just visible ones)
    // This ensures product labels are always shown even when features are scrolled out of view
    const productGroups = new Map<string, { rows: number[]; name: string }>();
    
    for (const item of renderableItems) {
      if (!productGroups.has(item.productName)) {
        productGroups.set(item.productName, { rows: [], name: item.productName });
      }
      productGroups.get(item.productName)!.rows.push(item.row);
    }
    
    // Draw labels for each product group
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    
    for (const [productName, group] of productGroups) {
      const minRow = Math.min(...group.rows);
      const maxRow = Math.max(...group.rows);
      const startY = HEADER_HEIGHT + (minRow * ROW_HEIGHT);
      const height = ((maxRow - minRow + 1) * ROW_HEIGHT);
      
      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, startY, LABEL_WIDTH, height);
      
      // Draw border
      ctx.strokeRect(0, startY, LABEL_WIDTH, height);
      
      // Draw product name in dark text
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      // Clip text to label width with padding
      ctx.save();
      ctx.beginPath();
      ctx.rect(8, startY, LABEL_WIDTH - 16, height);
      ctx.clip();
      ctx.fillText(productName, 12, startY + (height / 2));
      ctx.restore();
    }
    
    console.log('GanttChart: Drew product labels', {
      productCount: productGroups.size,
      products: Array.from(productGroups.keys())
    });
  }, [renderableItems]);

  /**
   * Get status color for progress indicator
   */
  const getStatusColor = useCallback((status: string): string => {
    const statusColors: Record<string, string> = {
      'not-started': '#D5D9D9', // Gray
      'in-progress': '#007185', // Amazon Blue
      'blocked': '#B12704', // Amazon Red
      'complete': '#067D62', // Amazon Green
      'on-hold': '#565959', // Dark Gray
      'at-risk': '#C7511F', // Dark Orange
    };
    return statusColors[status] || '#D5D9D9';
  }, []);

  /**
   * Draw an item bar with appropriate styling
   * Uses theme color for color-coding, with progress indicator overlay
   * Memoized to avoid recreation on every render
   * Requirements: 7.6
   */
  const drawItemBar = useCallback((
    ctx: CanvasRenderingContext2D,
    item: RenderableItem,
    isHovered: boolean
  ) => {
    const y = HEADER_HEIGHT + (item.row * ROW_HEIGHT) + ROW_PADDING;
    const { x: originalX, width } = item.barPosition;
    const x = originalX + panOffset; // Apply pan offset

    // Use theme color as base, but adjust if there's a status
    let color = item.themeColor;
    
    // If feature has progress status, use status color
    if (item.progress?.status) {
      color = getStatusColor(item.progress.status);
    }

    // Draw bar
    ctx.fillStyle = color;
    ctx.globalAlpha = isHovered ? HOVER_OPACITY : 1.0;
    ctx.fillRect(x, y, width, BAR_HEIGHT);
    ctx.globalAlpha = 1.0;

    // Draw progress indicator overlay if percentComplete is available
    if (item.progress?.percentComplete !== undefined && item.progress.percentComplete > 0) {
      const progressWidth = (width * item.progress.percentComplete) / 100;
      
      // Draw progress overlay with slightly darker shade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x, y, progressWidth, BAR_HEIGHT);
      
      // Draw progress percentage text if bar is wide enough
      if (width > 60) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`${item.progress.percentComplete}%`, x + width - 6, y + 4);
      }
    }

    // Draw bar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, BAR_HEIGHT);

    // Draw item name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Clip text to bar width
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 4, y, width - 8, BAR_HEIGHT);
    ctx.clip();
    ctx.fillText(item.name, x + 8, y + (BAR_HEIGHT / 2));
    ctx.restore();
  }, [panOffset, getStatusColor]);

  /**
   * Format date for tooltip display
   */
  const formatTooltipDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }, []);

  /**
   * Handle mouse move for hover effects, dragging, and tooltips
   * Debounced for performance
   * Requirements: 7.6
   */
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Handle dragging
    if (isDragging) {
      const deltaX = x - dragStartX;
      setPanOffset(dragStartPanOffset + deltaX);
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Find item under cursor (accounting for pan offset)
    let foundItem: RenderableItem | null = null;

    for (const item of renderableItems) {
      const itemY = HEADER_HEIGHT + (item.row * ROW_HEIGHT) + ROW_PADDING;
      const { x: barX, width: barWidth } = item.barPosition;
      const adjustedBarX = barX + panOffset;

      if (
        x >= adjustedBarX &&
        x <= adjustedBarX + barWidth &&
        y >= itemY &&
        y <= itemY + BAR_HEIGHT
      ) {
        foundItem = item;
        break;
      }
    }

    setHoveredItemId(foundItem ? foundItem.id : null);
    
    // Update canvas title attribute for tooltip
    if (foundItem && foundItem.progress?.lastUpdateSummary) {
      const tooltipText = [
        foundItem.name,
        `Status: ${foundItem.progress.status || 'Unknown'}`,
        `Progress: ${foundItem.progress.percentComplete || 0}%`,
        foundItem.progress.lastUpdateTime 
          ? `Last Update: ${formatTooltipDate(foundItem.progress.lastUpdateTime)}`
          : '',
        foundItem.progress.lastUpdateSummary 
          ? `Summary: ${foundItem.progress.lastUpdateSummary}`
          : ''
      ].filter(Boolean).join('\n');
      
      canvas.title = tooltipText;
    } else if (foundItem) {
      canvas.title = foundItem.name;
    } else {
      canvas.title = '';
    }
    
    // Update cursor - show grab cursor in header area for panning
    if (y < HEADER_HEIGHT) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = foundItem ? 'pointer' : 'default';
    }
  }, [renderableItems, isDragging, dragStartX, dragStartPanOffset, panOffset, formatTooltipDate]);

  /**
   * Handle mouse down to start dragging
   */
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Start dragging if in header area or on empty space
    if (y < HEADER_HEIGHT || y > HEADER_HEIGHT) {
      setIsDragging(true);
      setDragStartX(x);
      setDragStartPanOffset(panOffset);
      canvas.style.cursor = 'grabbing';
    }
  }, [panOffset]);

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handle mouse leave to stop dragging
   */
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handle mouse click to select items
   */
  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Don't trigger click if we were dragging
    if (isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked item (accounting for pan offset)
    for (const item of renderableItems) {
      const itemY = HEADER_HEIGHT + (item.row * ROW_HEIGHT) + ROW_PADDING;
      const { x: barX, width: barWidth } = item.barPosition;
      const adjustedBarX = barX + panOffset;

      if (
        x >= adjustedBarX &&
        x <= adjustedBarX + barWidth &&
        y >= itemY &&
        y <= itemY + BAR_HEIGHT
      ) {
        if (onItemClick) {
          onItemClick(item.item);
        }
        break;
      }
    }
  }, [renderableItems, onItemClick, panOffset, isDragging]);

  /**
   * Handle double-click to edit items
   */
  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find double-clicked item (accounting for pan offset)
    for (const item of renderableItems) {
      const itemY = HEADER_HEIGHT + (item.row * ROW_HEIGHT) + ROW_PADDING;
      const { x: barX, width: barWidth } = item.barPosition;
      const adjustedBarX = barX + panOffset;

      if (
        x >= adjustedBarX &&
        x <= adjustedBarX + barWidth &&
        y >= itemY &&
        y <= itemY + BAR_HEIGHT
      ) {
        if (onItemDoubleClick) {
          onItemDoubleClick(item.item);
        }
        break;
      }
    }
  }, [renderableItems, onItemDoubleClick, panOffset]);

  /**
   * Handle scroll for virtual scrolling
   * Requirements: 8.4 (Performance optimization)
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollOffset(target.scrollTop);
    scheduleRender();
  }, [scheduleRender]);

  return (
    <div 
      ref={containerRef} 
      className="gantt-chart-container"
      onScroll={handleScroll}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="gantt-chart-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
      {renderableItems.length === 0 && (
        <div className="gantt-chart-empty">
          <p>No roadmap items to display</p>
          <p>Create themes, products, and features to get started</p>
        </div>
      )}
    </div>
  );
}
