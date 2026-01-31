/**
 * FilterContext
 * Provides global state management for filter criteria
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Roadmap } from '../models';
import { FilterEngine, FilterCriteria } from '../services';

interface FilterContextValue {
  filters: FilterCriteria;
  
  // Filter operations
  setThemeFilter: (themeIds: string[]) => void;
  setProductFilter: (productIds: string[]) => void;
  clearThemeFilter: () => void;
  clearProductFilter: () => void;
  clearAllFilters: () => void;
  
  // Apply filters to roadmap
  applyFilters: (roadmap: Roadmap) => Roadmap;
  
  // Check if filters are active
  hasActiveFilters: () => boolean;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

/**
 * Creates empty filter criteria
 */
function createEmptyFilters(): FilterCriteria {
  return {
    themeIds: [],
    productIds: [],
  };
}

export function FilterProvider({ children }: FilterProviderProps) {
  const [filters, setFilters] = useState<FilterCriteria>(createEmptyFilters());
  const [filterEngine] = useState(() => new FilterEngine());

  // Set theme filter
  const setThemeFilter = useCallback((themeIds: string[]): void => {
    setFilters((prev) => ({
      ...prev,
      themeIds: themeIds.length > 0 ? themeIds : undefined,
    }));
  }, []);

  // Set product filter
  const setProductFilter = useCallback((productIds: string[]): void => {
    setFilters((prev) => ({
      ...prev,
      productIds: productIds.length > 0 ? productIds : undefined,
    }));
  }, []);

  // Clear theme filter
  const clearThemeFilter = useCallback((): void => {
    setFilters((prev) => ({
      ...prev,
      themeIds: undefined,
    }));
  }, []);

  // Clear product filter
  const clearProductFilter = useCallback((): void => {
    setFilters((prev) => ({
      ...prev,
      productIds: undefined,
    }));
  }, []);

  // Clear all filters (Requirements: 4.5)
  const clearAllFilters = useCallback((): void => {
    setFilters(createEmptyFilters());
  }, []);

  // Apply filters to roadmap (Requirements: 4.4)
  const applyFilters = useCallback((roadmap: Roadmap): Roadmap => {
    return filterEngine.applyFilters(roadmap, filters);
  }, [filterEngine, filters]);

  // Check if any filters are active
  const hasActiveFilters = useCallback((): boolean => {
    return (
      (filters.themeIds !== undefined && filters.themeIds.length > 0) ||
      (filters.productIds !== undefined && filters.productIds.length > 0)
    );
  }, [filters]);

  const value: FilterContextValue = {
    filters,
    setThemeFilter,
    setProductFilter,
    clearThemeFilter,
    clearProductFilter,
    clearAllFilters,
    applyFilters,
    hasActiveFilters,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

/**
 * Hook to access filter context
 * Throws error if used outside of FilterProvider
 */
export function useFilters(): FilterContextValue {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
