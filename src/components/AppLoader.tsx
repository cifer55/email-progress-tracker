/**
 * AppLoader Component
 * Handles loading roadmap data and displaying appropriate notifications
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

import { useState, useEffect, ReactNode } from 'react';
import { StorageService } from '../services';
import { Roadmap } from '../models';
import { useNotification } from '../contexts/NotificationContext';

interface AppLoaderProps {
  children: (roadmap: Roadmap) => ReactNode;
}

export function AppLoader({ children }: AppLoaderProps) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showWarning, showError } = useNotification();

  useEffect(() => {
    const loadRoadmap = async () => {
      const storageService = new StorageService();
      
      try {
        // Load with validation
        const loadResult = await storageService.loadWithValidation();
        
        console.log('AppLoader: loadResult', {
          hasRoadmap: !!loadResult.roadmap,
          isValid: loadResult.validation.valid,
          errors: loadResult.validation.errors,
          hasBackup: loadResult.hasBackup,
          themeCount: loadResult.roadmap?.themes.length,
          featureCount: loadResult.roadmap?.themes.flatMap(t => t.products.flatMap(p => p.features)).length
        });
        
        if (loadResult.roadmap) {
          // Successfully loaded valid data
          console.log('AppLoader: Loading existing roadmap with', loadResult.roadmap.themes.length, 'themes');
          setRoadmap(loadResult.roadmap);
          
          // Show warnings if any
          if (loadResult.validation.warnings.length > 0) {
            const warningMessages = loadResult.validation.warnings
              .map(w => w.message)
              .join('\n');
            showWarning(`Roadmap loaded with warnings:\n${warningMessages}`);
          }
        } else if (!loadResult.validation.valid) {
          // Data is invalid or corrupted
          const errorMessages = loadResult.validation.errors
            .map(e => e.message)
            .join('\n');
          
          // Check if it's a version mismatch
          const isVersionMismatch = loadResult.validation.errors.some(
            e => e.type === 'VERSION_MISMATCH'
          );
          
          if (isVersionMismatch) {
            // Version mismatch - start with sample data
            console.log('AppLoader: Version mismatch detected, loading sample data');
            showWarning('App was updated. Loading fresh sample data.');
            setRoadmap(storageService.createSampleRoadmap());
          } else if (loadResult.hasBackup) {
            // Try to load from backup
            try {
              const backupRoadmap = await storageService.loadFromBackup();
              if (backupRoadmap) {
                setRoadmap(backupRoadmap);
                showWarning('Primary data was corrupted. Loaded from backup.');
              } else {
                // Backup also failed, create empty roadmap
                showError(`Failed to load roadmap:\n${errorMessages}\n\nBackup also unavailable. Starting with empty roadmap.`);
                setRoadmap(storageService.createEmptyRoadmap());
              }
            } catch (backupError) {
              // Backup load failed, create empty roadmap
              showError(`Failed to load roadmap:\n${errorMessages}\n\nBackup load failed. Starting with empty roadmap.`);
              setRoadmap(storageService.createEmptyRoadmap());
            }
          } else {
            // No backup available, create empty roadmap
            showError(`Failed to load roadmap:\n${errorMessages}\n\nNo backup available. Starting with empty roadmap.`);
            setRoadmap(storageService.createEmptyRoadmap());
          }
        } else {
          // No data in storage, start with sample roadmap
          console.log('AppLoader: No data in storage, creating sample roadmap');
          const sampleRoadmap = storageService.createSampleRoadmap();
          console.log('AppLoader: Sample roadmap created with', sampleRoadmap.themes.length, 'themes and', 
            sampleRoadmap.themes.flatMap(t => t.products.flatMap(p => p.features)).length, 'features');
          setRoadmap(sampleRoadmap);
        }
      } catch (error) {
        // Unexpected error during load
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        showError(`Failed to load roadmap: ${errorMessage}\n\nStarting with empty roadmap.`);
        setRoadmap(storageService.createEmptyRoadmap());
      } finally {
        setIsLoading(false);
      }
    };

    loadRoadmap();
  }, [showWarning, showError]);

  // Show loading state
  if (isLoading || !roadmap) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div>Loading roadmap...</div>
      </div>
    );
  }

  return <>{children(roadmap)}</>;
}
