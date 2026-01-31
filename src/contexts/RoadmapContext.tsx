/**
 * RoadmapContext
 * Provides global state management for roadmap data and operations
 * Requirements: All
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Roadmap, Theme, Product, Feature, ProductData, FeatureData, generateId } from '../models';
import { RoadmapManager, StorageService } from '../services';
import { useNotification } from './NotificationContext';

interface RoadmapContextValue {
  roadmap: Roadmap;
  
  // Theme operations
  createTheme: (name: string, description?: string) => Theme;
  updateTheme: (id: string, updates: Partial<Theme>) => Theme | null;
  deleteTheme: (id: string) => void;
  getTheme: (id: string) => Theme | null;
  
  // Product operations
  createProduct: (themeId: string, data: ProductData) => Product | null;
  updateProduct: (id: string, updates: Partial<Product>) => Product | null;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | null;
  
  // Feature operations
  createFeature: (productId: string, data: FeatureData) => Feature | null;
  updateFeature: (id: string, updates: Partial<Feature>) => Feature | null;
  deleteFeature: (id: string) => void;
  getFeature: (id: string) => Feature | null;
  moveFeature: (featureId: string, newProductId: string) => Feature | null;
  
  // Roadmap operations
  setRoadmap: (roadmap: Roadmap) => void;
  getRoadmap: () => Roadmap;
}

const RoadmapContext = createContext<RoadmapContextValue | undefined>(undefined);

interface RoadmapProviderProps {
  children: ReactNode;
  initialRoadmap?: Roadmap;
}

/**
 * Creates an empty roadmap with default values
 */
function createEmptyRoadmap(): Roadmap {
  return {
    id: generateId(),
    name: 'My Roadmap',
    themes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function RoadmapProvider({ children, initialRoadmap }: RoadmapProviderProps) {
  const [roadmap, setRoadmapState] = useState<Roadmap>(
    initialRoadmap || createEmptyRoadmap()
  );
  const [manager, setManager] = useState(() => new RoadmapManager(roadmap));
  const [storageService] = useState(() => new StorageService());
  const notification = useNotification();

  // Update manager's roadmap when state changes
  const updateRoadmap = useCallback((newRoadmap: Roadmap) => {
    setManager(new RoadmapManager(newRoadmap));
    setRoadmapState(newRoadmap);
  }, []);

  // Auto-save to storage whenever roadmap changes (Requirements: 6.1)
  useEffect(() => {
    const saveToStorage = async () => {
      try {
        await storageService.save(roadmap);
      } catch (error) {
        // Show error notification to user
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        notification.showError(`Failed to save roadmap: ${errorMessage}`);
      }
    };

    // Save to storage
    saveToStorage();
  }, [roadmap, storageService, notification]);

  // Theme operations
  const createTheme = useCallback((name: string, description?: string): Theme => {
    const theme = manager.createTheme(name, description);
    updateRoadmap(manager.getRoadmap());
    return theme;
  }, [manager, updateRoadmap]);

  const updateTheme = useCallback((id: string, updates: Partial<Theme>): Theme | null => {
    const theme = manager.updateTheme(id, updates);
    if (theme) {
      updateRoadmap(manager.getRoadmap());
    }
    return theme;
  }, [manager, updateRoadmap]);

  const deleteTheme = useCallback((id: string): void => {
    manager.deleteTheme(id);
    updateRoadmap(manager.getRoadmap());
  }, [manager, updateRoadmap]);

  const getTheme = useCallback((id: string): Theme | null => {
    return manager.getTheme(id);
  }, [manager]);

  // Product operations
  const createProduct = useCallback((themeId: string, data: ProductData): Product | null => {
    const product = manager.createProduct(themeId, data);
    if (product) {
      updateRoadmap(manager.getRoadmap());
    }
    return product;
  }, [manager, updateRoadmap]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>): Product | null => {
    const product = manager.updateProduct(id, updates);
    if (product) {
      updateRoadmap(manager.getRoadmap());
    }
    return product;
  }, [manager, updateRoadmap]);

  const deleteProduct = useCallback((id: string): void => {
    manager.deleteProduct(id);
    updateRoadmap(manager.getRoadmap());
  }, [manager, updateRoadmap]);

  const getProduct = useCallback((id: string): Product | null => {
    return manager.getProduct(id);
  }, [manager]);

  // Feature operations
  const createFeature = useCallback((productId: string, data: FeatureData): Feature | null => {
    const feature = manager.createFeature(productId, data);
    if (feature) {
      updateRoadmap(manager.getRoadmap());
    }
    return feature;
  }, [manager, updateRoadmap]);

  const updateFeature = useCallback((id: string, updates: Partial<Feature>): Feature | null => {
    const feature = manager.updateFeature(id, updates);
    if (feature) {
      updateRoadmap(manager.getRoadmap());
    }
    return feature;
  }, [manager, updateRoadmap]);

  const deleteFeature = useCallback((id: string): void => {
    manager.deleteFeature(id);
    updateRoadmap(manager.getRoadmap());
  }, [manager, updateRoadmap]);

  const getFeature = useCallback((id: string): Feature | null => {
    return manager.getFeature(id);
  }, [manager]);

  const moveFeature = useCallback((featureId: string, newProductId: string): Feature | null => {
    const feature = manager.moveFeature(featureId, newProductId);
    if (feature) {
      updateRoadmap(manager.getRoadmap());
    }
    return feature;
  }, [manager, updateRoadmap]);

  // Roadmap operations
  const setRoadmap = useCallback((newRoadmap: Roadmap): void => {
    updateRoadmap(newRoadmap);
  }, [updateRoadmap]);

  const getRoadmap = useCallback((): Roadmap => {
    return manager.getRoadmap();
  }, [manager]);

  const value: RoadmapContextValue = {
    roadmap,
    createTheme,
    updateTheme,
    deleteTheme,
    getTheme,
    createProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    createFeature,
    updateFeature,
    deleteFeature,
    getFeature,
    moveFeature,
    setRoadmap,
    getRoadmap,
  };

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}

/**
 * Hook to access roadmap context
 * Throws error if used outside of RoadmapProvider
 */
export function useRoadmap(): RoadmapContextValue {
  const context = useContext(RoadmapContext);
  if (context === undefined) {
    throw new Error('useRoadmap must be used within a RoadmapProvider');
  }
  return context;
}
