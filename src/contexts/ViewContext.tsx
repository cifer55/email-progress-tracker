/**
 * ViewContext
 * Provides global state management for view settings (zoom, pan, time unit)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type TimeUnit = 'day' | 'week' | 'month' | 'quarter';

export interface ViewSettings {
  timeUnit: TimeUnit;
  zoomLevel: number; // 1.0 = 100%
  panOffset: number; // Horizontal scroll offset in pixels
  visibleDateRange: {
    start: Date;
    end: Date;
  } | null;
}

interface ViewContextValue {
  viewSettings: ViewSettings;
  
  // Time unit operations (Requirements: 5.1)
  setTimeUnit: (unit: TimeUnit) => void;
  
  // Zoom operations (Requirements: 5.2, 5.3)
  zoomIn: () => void;
  zoomOut: () => void;
  setZoomLevel: (level: number) => void;
  
  // Pan operations (Requirements: 5.4)
  pan: (offset: number) => void;
  setPanOffset: (offset: number) => void;
  
  // Visible date range
  setVisibleDateRange: (start: Date, end: Date) => void;
  
  // Reset view (Requirements: 5.5)
  resetView: () => void;
}

const ViewContext = createContext<ViewContextValue | undefined>(undefined);

interface ViewProviderProps {
  children: ReactNode;
}

// Constants for zoom behavior
const MIN_ZOOM = 0.25; // 25%
const MAX_ZOOM = 4.0;  // 400%
const ZOOM_STEP = 0.25; // 25% increment/decrement

/**
 * Creates default view settings
 */
function createDefaultViewSettings(): ViewSettings {
  return {
    timeUnit: 'month',
    zoomLevel: 1.0,
    panOffset: 0,
    visibleDateRange: null,
  };
}

export function ViewProvider({ children }: ViewProviderProps) {
  const [viewSettings, setViewSettings] = useState<ViewSettings>(createDefaultViewSettings());

  // Set time unit (Requirements: 5.1)
  const setTimeUnit = useCallback((unit: TimeUnit): void => {
    setViewSettings((prev) => ({
      ...prev,
      timeUnit: unit,
    }));
  }, []);

  // Zoom in (Requirements: 5.2)
  const zoomIn = useCallback((): void => {
    setViewSettings((prev) => ({
      ...prev,
      zoomLevel: Math.min(prev.zoomLevel + ZOOM_STEP, MAX_ZOOM),
    }));
  }, []);

  // Zoom out (Requirements: 5.3)
  const zoomOut = useCallback((): void => {
    setViewSettings((prev) => ({
      ...prev,
      zoomLevel: Math.max(prev.zoomLevel - ZOOM_STEP, MIN_ZOOM),
    }));
  }, []);

  // Set zoom level directly
  const setZoomLevel = useCallback((level: number): void => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(level, MAX_ZOOM));
    setViewSettings((prev) => ({
      ...prev,
      zoomLevel: clampedLevel,
    }));
  }, []);

  // Pan by relative offset (Requirements: 5.4)
  const pan = useCallback((offset: number): void => {
    setViewSettings((prev) => ({
      ...prev,
      panOffset: prev.panOffset + offset,
    }));
  }, []);

  // Set pan offset directly
  const setPanOffset = useCallback((offset: number): void => {
    setViewSettings((prev) => ({
      ...prev,
      panOffset: offset,
    }));
  }, []);

  // Set visible date range
  const setVisibleDateRange = useCallback((start: Date, end: Date): void => {
    setViewSettings((prev) => ({
      ...prev,
      visibleDateRange: { start, end },
    }));
  }, []);

  // Reset view to defaults (Requirements: 5.5)
  const resetView = useCallback((): void => {
    setViewSettings(createDefaultViewSettings());
  }, []);

  const value: ViewContextValue = {
    viewSettings,
    setTimeUnit,
    zoomIn,
    zoomOut,
    setZoomLevel,
    pan,
    setPanOffset,
    setVisibleDateRange,
    resetView,
  };

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

/**
 * Hook to access view context
 * Throws error if used outside of ViewProvider
 */
export function useView(): ViewContextValue {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
}
