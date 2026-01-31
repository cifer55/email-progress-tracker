import { useState, useEffect, useRef } from 'react';
import { RoadmapProvider, useRoadmap } from './contexts/RoadmapContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { Toolbar, SidePanel, GanttChart, CreateItemDialog, CSVImportDialog } from './components';
import type { CreateItemData, ItemType } from './components';
import { AppLoader } from './components/AppLoader';
import { ExportService } from './services/ExportService';
import type { RoadmapItem } from './components';
import './App.css';

function App() {
  return (
    <NotificationProvider>
      <AppLoader>
        {(initialRoadmap) => (
          <RoadmapProvider initialRoadmap={initialRoadmap}>
            <AppContent />
          </RoadmapProvider>
        )}
      </AppLoader>
    </NotificationProvider>
  );
}

function AppContent() {
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportService = useRef(new ExportService());
  
  const { roadmap, createTheme, createProduct, createFeature, updateTheme, updateProduct, updateFeature, deleteTheme, deleteProduct, deleteFeature } = useRoadmap();
  const { showToast, showError, showConfirm } = useNotification();

  // Keyboard shortcuts (Requirements: 8.5)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+N or Cmd+N: Create new item
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleCreate();
        return;
      }

      // Delete key: Delete selected item
      if (event.key === 'Delete' && selectedItem) {
        event.preventDefault();
        handleDeleteSelectedItem();
        return;
      }

      // Escape: Close side panel or dialog
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showCreateDialog) {
          setShowCreateDialog(false);
        } else if (selectedItem) {
          setSelectedItem(null);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem, showCreateDialog, deleteTheme, deleteProduct, deleteFeature]);

  // Delete the currently selected item with confirmation
  const handleDeleteSelectedItem = async () => {
    if (!selectedItem) return;

    // Determine item type and name
    let itemType = '';
    let itemName = selectedItem.name;
    let hasChildren = false;

    if ('products' in selectedItem) {
      itemType = 'theme';
      hasChildren = selectedItem.products.length > 0;
    } else if ('features' in selectedItem) {
      itemType = 'product';
      hasChildren = selectedItem.features.length > 0;
    } else {
      itemType = 'feature';
    }

    // Show confirmation dialog
    const message = hasChildren
      ? `Are you sure you want to delete ${itemType} "${itemName}"? This will also delete all its child items.`
      : `Are you sure you want to delete ${itemType} "${itemName}"?`;

    const confirmed = await showConfirm({
      title: `Delete ${itemType}`,
      message,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      isDestructive: true,
    });

    if (!confirmed) {
      return;
    }

    // Delete the item
    try {
      if ('products' in selectedItem) {
        deleteTheme(selectedItem.id);
      } else if ('features' in selectedItem) {
        deleteProduct(selectedItem.id);
      } else {
        deleteFeature(selectedItem.id);
      }
      
      setSelectedItem(null);
      showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} deleted successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to delete ${itemType}: ${errorMessage}`);
    }
  };

  // Create handler
  const handleCreate = () => {
    setShowCreateDialog(true);
  };

  // CSV Import handler
  const handleImportCSV = () => {
    setShowCSVImportDialog(true);
  };

  const handleImportComplete = (count: number) => {
    showToast(`Successfully imported ${count} features`);
    setShowCSVImportDialog(false);
  };

  const handleCreateConfirm = (data: CreateItemData) => {
    try {
      // Determine item type from the data
      let itemType: ItemType;
      if (!data.themeId && !data.productId) {
        itemType = 'theme';
      } else if (data.themeId && !data.productId) {
        itemType = 'product';
      } else {
        itemType = 'feature';
      }

      if (itemType === 'theme') {
        createTheme(data.name, data.description);
        showToast('Theme created successfully');
      } else if (itemType === 'product') {
        if (!data.themeId || !data.startDate || !data.endDate) {
          showError('Theme, start date, and end date are required for products');
          return;
        }
        createProduct(data.themeId, {
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        showToast('Product created successfully');
      } else if (itemType === 'feature') {
        if (!data.productId || !data.startDate || !data.endDate) {
          showError('Product, start date, and end date are required for features');
          return;
        }
        createFeature(data.productId, {
          name: data.name,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        showToast('Feature created successfully');
      }
      setShowCreateDialog(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to create item: ${errorMessage}`);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateDialog(false);
  };

  // Inline creation handlers for dialog
  const handleInlineCreateTheme = (name: string, description?: string) => {
    return createTheme(name, description);
  };

  const handleInlineCreateProduct = (themeId: string, name: string, description?: string, startDate?: Date, endDate?: Date) => {
    if (startDate && endDate) {
      createProduct(themeId, {
        name,
        description,
        startDate,
        endDate,
      });
    }
  };

  const handleExport = async (format: 'png' | 'json') => {
    try {
      if (format === 'json') {
        // Export to JSON
        const jsonData = exportService.current.exportToJSON(roadmap);
        
        // Create a blob and download
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `roadmap-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Roadmap exported to JSON successfully');
      } else if (format === 'png') {
        // Export to PNG
        if (!canvasRef.current) {
          showError('Canvas not available for export');
          return;
        }
        
        const blob = await exportService.current.exportToPNG(canvasRef.current);
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `roadmap-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Roadmap exported to PNG successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to export: ${errorMessage}`);
    }
  };

  const handleUpdateItem = (item: RoadmapItem) => {
    try {
      // Determine item type and call appropriate update method
      if ('products' in item) {
        // It's a Theme
        const result = updateTheme(item.id, item);
        if (result) {
          showToast('Theme updated successfully');
          setSelectedItem(null);
        } else {
          showError('Failed to update theme');
        }
      } else if ('features' in item) {
        // It's a Product
        const result = updateProduct(item.id, item);
        if (result) {
          showToast('Product updated successfully');
          setSelectedItem(null);
        } else {
          showError('Failed to update product');
        }
      } else {
        // It's a Feature
        const result = updateFeature(item.id, item);
        if (result) {
          showToast('Feature updated successfully');
          setSelectedItem(null);
        } else {
          showError('Failed to update feature');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError(`Failed to update item: ${errorMessage}`);
    }
  };

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  };

  const handleItemClick = (item: RoadmapItem) => {
    setSelectedItem(item);
  };

  const handleItemDoubleClick = (item: RoadmapItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="app-container">
      <Toolbar
        onCreate={handleCreate}
        onImportCSV={handleImportCSV}
        onExport={handleExport}
      />
      
      <div className="app-main">
        <div className="app-content">
          <GanttChart
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onCanvasReady={handleCanvasReady}
          />
        </div>
        
        {selectedItem && (
          <SidePanel
            selectedItem={selectedItem}
            onUpdate={handleUpdateItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>

      {showCreateDialog && (
        <CreateItemDialog
          itemType={null}
          themes={roadmap.themes}
          onConfirm={handleCreateConfirm}
          onCancel={handleCreateCancel}
          onCreateTheme={handleInlineCreateTheme}
          onCreateProduct={handleInlineCreateProduct}
        />
      )}

      {showCSVImportDialog && (
        <CSVImportDialog
          onClose={() => setShowCSVImportDialog(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}

export default App;
