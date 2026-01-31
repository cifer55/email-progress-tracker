/**
 * SidePanel Component
 * Displays selected item details and provides edit form
 * Requirements: 1.4, 8.1, 8.2, 9.1, 9.2, 9.3, 9.5, 7.1, 7.2, 7.3, 7.4
 */

import React, { useState, useEffect } from 'react';
import { Theme, Product, Feature } from '../models';
import { ValidationService } from '../services/ValidationService';
import { useRoadmap } from '../contexts/RoadmapContext';
import { Icon } from './Icon';
import { ProgressIndicator } from './ProgressIndicator';
import { UpdateTimeline } from './UpdateTimeline';
import { ProgressService, Update, CreateUpdateRequest } from '../services/ProgressService';
import './SidePanel.css';

export type RoadmapItem = Theme | Product | Feature;

export interface SidePanelProps {
  selectedItem: RoadmapItem | null;
  onUpdate: (item: RoadmapItem) => void;
  onClose: () => void;
}

interface ValidationErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  hierarchy?: string;
  newTheme?: string;
  newProduct?: string;
}

export function SidePanel({ selectedItem, onUpdate, onClose }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'progress'>('details');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  // Progress tab state
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [newUpdateSummary, setNewUpdateSummary] = useState('');
  const [newUpdateStatus, setNewUpdateStatus] = useState('');
  const [newUpdatePercent, setNewUpdatePercent] = useState<number | ''>('');
  const [savingUpdate, setSavingUpdate] = useState(false);
  
  // Inline creation states
  const [showNewThemeInput, setShowNewThemeInput] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductStartDate, setNewProductStartDate] = useState('');
  const [newProductEndDate, setNewProductEndDate] = useState('');
  
  const { roadmap, getProduct, moveFeature, createTheme, createProduct } = useRoadmap();
  const validationService = new ValidationService();
  const progressService = new ProgressService();

  // Load progress updates when switching to progress tab
  useEffect(() => {
    if (activeTab === 'progress' && selectedItem && 'productId' in selectedItem) {
      loadUpdates(selectedItem.id);
    }
  }, [activeTab, selectedItem]);

  const loadUpdates = async (featureId: string) => {
    setLoadingUpdates(true);
    try {
      const response = await progressService.getUpdateHistory(featureId, { limit: 20 });
      setUpdates(response.updates);
    } catch (error) {
      console.error('Failed to load updates:', error);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!selectedItem || !('productId' in selectedItem)) return;
    if (!newUpdateSummary.trim()) return;

    setSavingUpdate(true);
    try {
      const updateRequest: CreateUpdateRequest = {
        summary: newUpdateSummary.trim(),
      };

      if (newUpdateStatus) {
        updateRequest.status = newUpdateStatus;
      }

      if (newUpdatePercent !== '') {
        updateRequest.percentComplete = Number(newUpdatePercent);
      }

      await progressService.createManualUpdate(selectedItem.id, updateRequest);
      
      // Reload updates
      await loadUpdates(selectedItem.id);
      
      // Reset form
      setShowAddUpdate(false);
      setNewUpdateSummary('');
      setNewUpdateStatus('');
      setNewUpdatePercent('');
    } catch (error) {
      console.error('Failed to add update:', error);
    } finally {
      setSavingUpdate(false);
    }
  };

  // Update form when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setName(selectedItem.name);
      
      // Handle dates based on item type
      if ('startDate' in selectedItem && selectedItem.startDate) {
        setStartDate(formatDateForInput(selectedItem.startDate));
      } else {
        setStartDate('');
      }
      
      if ('endDate' in selectedItem && selectedItem.endDate) {
        setEndDate(formatDateForInput(selectedItem.endDate));
      } else {
        setEndDate('');
      }

      // Set theme and product for features
      if ('productId' in selectedItem) {
        // It's a feature
        const product = getProduct(selectedItem.productId);
        if (product) {
          setSelectedProductId(product.id);
          setSelectedThemeId(product.themeId);
        }
      } else {
        setSelectedThemeId('');
        setSelectedProductId('');
      }
      
      // Clear validation errors when item changes
      setValidationErrors({});
      
      // Reset inline creation states
      setShowNewThemeInput(false);
      setNewThemeName('');
      setShowNewProductInput(false);
      setNewProductName('');
      setNewProductStartDate('');
      setNewProductEndDate('');
    }
  }, [selectedItem, getProduct]);

  // Validate form whenever dates change
  useEffect(() => {
    if (!selectedItem) return;

    const errors: ValidationErrors = {};

    // Validate date range if both dates are provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const dateValidation = validationService.validateDates(start, end);
      if (!dateValidation.valid) {
        errors.dateRange = dateValidation.errors[0]?.message || 'Invalid date range';
      }
    }

    setValidationErrors(errors);
  }, [startDate, endDate, selectedItem, validationService]);

  if (!selectedItem) {
    return null;
  }

  const itemType = getItemType(selectedItem);

  // Get available products for selected theme
  const availableProducts = selectedThemeId
    ? roadmap.themes.find(t => t.id === selectedThemeId)?.products || []
    : [];

  const handleCreateNewTheme = () => {
    if (!newThemeName.trim()) {
      setValidationErrors({ ...validationErrors, newTheme: 'Theme name is required' });
      return;
    }
    
    const newTheme = createTheme(newThemeName.trim());
    setSelectedThemeId(newTheme.id);
    setShowNewThemeInput(false);
    setNewThemeName('');
    const { newTheme: _, ...restErrors } = validationErrors;
    setValidationErrors(restErrors);
  };

  const handleCreateNewProduct = () => {
    if (!newProductName.trim()) {
      setValidationErrors({ ...validationErrors, newProduct: 'Product name is required' });
      return;
    }
    
    if (!newProductStartDate || !newProductEndDate) {
      setValidationErrors({ ...validationErrors, newProduct: 'Start and end dates are required' });
      return;
    }
    
    const start = new Date(newProductStartDate);
    const end = new Date(newProductEndDate);
    if (start > end) {
      setValidationErrors({ ...validationErrors, newProduct: 'End date must be after start date' });
      return;
    }
    
    if (selectedThemeId) {
      const newProduct = createProduct(selectedThemeId, {
        name: newProductName.trim(),
        startDate: start,
        endDate: end
      });
      
      if (newProduct) {
        setSelectedProductId(newProduct.id);
        setShowNewProductInput(false);
        setNewProductName('');
        setNewProductStartDate('');
        setNewProductEndDate('');
        const { newProduct: _, ...restErrors } = validationErrors;
        setValidationErrors(restErrors);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate name
    if (!name.trim()) {
      setValidationErrors({ ...validationErrors, name: 'Name is required' });
      return;
    }

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Handle feature move if product changed
    if (itemType === 'feature' && 'productId' in selectedItem) {
      const currentProductId = selectedItem.productId;
      if (selectedProductId && selectedProductId !== currentProductId) {
        // Move feature to new product
        moveFeature(selectedItem.id, selectedProductId);
      }
    }

    const updates: Partial<RoadmapItem> = {
      name,
    };

    // Add dates if applicable
    if (itemType !== 'theme' || startDate) {
      if (startDate) {
        (updates as any).startDate = new Date(startDate);
      }
      if (endDate) {
        (updates as any).endDate = new Date(endDate);
      }
    }

    onUpdate({ ...selectedItem, ...updates });
  };

  const hasRequiredDates = itemType !== 'theme';
  const isFormValid = name.trim() !== '' && 
    (!hasRequiredDates || (startDate && endDate)) &&
    (itemType !== 'feature' || (selectedThemeId && selectedProductId)) &&
    Object.keys(validationErrors).length === 0;

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>Edit {itemType}</h3>
        <button
          className="side-panel-close"
          onClick={onClose}
          title="Close panel (Esc)"
        >
          <Icon name="close" size="medium" />
        </button>
      </div>

      {/* Tabs (only for features) */}
      {itemType === 'feature' && (
        <div className="side-panel-tabs">
          <button
            className={`side-panel-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`side-panel-tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
        </div>
      )}

      <div className="side-panel-content">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="side-panel-form">
          {/* Name field */}
          <div className="form-group">
            <label htmlFor="item-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="item-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${itemType} name`}
              required
              className={validationErrors.name ? 'input-error' : ''}
            />
            {validationErrors.name && (
              <div className="validation-error">{validationErrors.name}</div>
            )}
          </div>

          {/* Theme and Product selectors (for features only) */}
          {itemType === 'feature' && (
            <>
              <div className="form-group">
                <label htmlFor="item-theme">
                  Theme <span className="required">*</span>
                </label>
                
                {!showNewThemeInput ? (
                  <>
                    <div className="select-with-button">
                      <select
                        id="item-theme"
                        value={selectedThemeId}
                        onChange={(e) => {
                          setSelectedThemeId(e.target.value);
                          // Reset product selection when theme changes
                          setSelectedProductId('');
                        }}
                        required
                      >
                        <option value="">Select a theme...</option>
                        {roadmap.themes.map(theme => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button-inline-create"
                        onClick={() => setShowNewThemeInput(true)}
                        title="Create new theme"
                      >
                        + New
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="inline-create-form">
                    <input
                      type="text"
                      value={newThemeName}
                      onChange={(e) => setNewThemeName(e.target.value)}
                      placeholder="New theme name"
                      className={validationErrors.newTheme ? 'input-error' : ''}
                      autoFocus
                    />
                    {validationErrors.newTheme && <div className="validation-error">{validationErrors.newTheme}</div>}
                    <div className="inline-create-actions">
                      <button
                        type="button"
                        className="button-secondary-small"
                        onClick={() => {
                          setShowNewThemeInput(false);
                          setNewThemeName('');
                          const { newTheme: _, ...restErrors } = validationErrors;
                          setValidationErrors(restErrors);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="button-primary-small"
                        onClick={handleCreateNewTheme}
                      >
                        Create Theme
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="item-product">
                  Product <span className="required">*</span>
                </label>
                
                {!showNewProductInput ? (
                  <>
                    <div className="select-with-button">
                      <select
                        id="item-product"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        disabled={!selectedThemeId || availableProducts.length === 0}
                        required
                      >
                        <option value="">Select a product...</option>
                        {availableProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button-inline-create"
                        onClick={() => setShowNewProductInput(true)}
                        disabled={!selectedThemeId}
                        title="Create new product"
                      >
                        + New
                      </button>
                    </div>
                    {selectedThemeId && availableProducts.length === 0 && !showNewProductInput && (
                      <div className="validation-warning">No products in selected theme. Click "+ New" to create one.</div>
                    )}
                  </>
                ) : (
                  <div className="inline-create-form">
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="New product name"
                      className={validationErrors.newProduct ? 'input-error' : ''}
                      autoFocus
                    />
                    <div className="inline-date-fields">
                      <div>
                        <label>Start Date *</label>
                        <input
                          type="date"
                          value={newProductStartDate}
                          onChange={(e) => setNewProductStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label>End Date *</label>
                        <input
                          type="date"
                          value={newProductEndDate}
                          onChange={(e) => setNewProductEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    {validationErrors.newProduct && <div className="validation-error">{validationErrors.newProduct}</div>}
                    <div className="inline-create-actions">
                      <button
                        type="button"
                        className="button-secondary-small"
                        onClick={() => {
                          setShowNewProductInput(false);
                          setNewProductName('');
                          setNewProductStartDate('');
                          setNewProductEndDate('');
                          const { newProduct: _, ...restErrors } = validationErrors;
                          setValidationErrors(restErrors);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="button-primary-small"
                        onClick={handleCreateNewProduct}
                      >
                        Create Product
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Start Date field */}
          <div className="form-group">
            <label htmlFor="item-start-date">
              Start Date {hasRequiredDates && <span className="required">*</span>}
            </label>
            <input
              id="item-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required={hasRequiredDates}
              className={validationErrors.startDate || validationErrors.dateRange ? 'input-error' : ''}
            />
            {validationErrors.startDate && (
              <div className="validation-error">{validationErrors.startDate}</div>
            )}
          </div>

          {/* End Date field */}
          <div className="form-group">
            <label htmlFor="item-end-date">
              End Date {hasRequiredDates && <span className="required">*</span>}
            </label>
            <input
              id="item-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required={hasRequiredDates}
              className={validationErrors.endDate || validationErrors.dateRange ? 'input-error' : ''}
            />
            {validationErrors.endDate && (
              <div className="validation-error">{validationErrors.endDate}</div>
            )}
          </div>

          {/* Date range validation error */}
          {validationErrors.dateRange && (
            <div className="validation-error-block">
              <span className="validation-error-icon">✕</span>
              {validationErrors.dateRange}
            </div>
          )}

          {/* Form actions */}
          <div className="form-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={!isFormValid}
            >
              Save Changes
            </button>
          </div>
        </form>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && itemType === 'feature' && (
          <div className="side-panel-progress">
            {/* Progress Indicator */}
            {selectedItem && 'progress' in selectedItem && selectedItem.progress && (
              <div className="progress-section">
                <ProgressIndicator
                  status={selectedItem.progress.status}
                  percentComplete={selectedItem.progress.percentComplete}
                  size="large"
                />
              </div>
            )}

            {/* Add Update Button */}
            {!showAddUpdate && (
              <div className="progress-actions">
                <button
                  className="button-primary"
                  onClick={() => setShowAddUpdate(true)}
                >
                  + Add Update
                </button>
              </div>
            )}

            {/* Add Update Form */}
            {showAddUpdate && (
              <div className="add-update-form">
                <h4>Add Manual Update</h4>
                <div className="form-group">
                  <label htmlFor="update-summary">
                    Summary <span className="required">*</span>
                  </label>
                  <textarea
                    id="update-summary"
                    value={newUpdateSummary}
                    onChange={(e) => setNewUpdateSummary(e.target.value)}
                    placeholder="Describe the progress update..."
                    rows={3}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="update-status">Status</label>
                  <select
                    id="update-status"
                    value={newUpdateStatus}
                    onChange={(e) => setNewUpdateStatus(e.target.value)}
                  >
                    <option value="">No change</option>
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="complete">Complete</option>
                    <option value="on-hold">On Hold</option>
                    <option value="at-risk">At Risk</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="update-percent">Percentage Complete</label>
                  <input
                    id="update-percent"
                    type="number"
                    min="0"
                    max="100"
                    value={newUpdatePercent}
                    onChange={(e) => setNewUpdatePercent(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0-100"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setShowAddUpdate(false);
                      setNewUpdateSummary('');
                      setNewUpdateStatus('');
                      setNewUpdatePercent('');
                    }}
                    disabled={savingUpdate}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleAddUpdate}
                    disabled={!newUpdateSummary.trim() || savingUpdate}
                  >
                    {savingUpdate ? 'Saving...' : 'Add Update'}
                  </button>
                </div>
              </div>
            )}

            {/* Update Timeline */}
            <div className="progress-timeline">
              <h4>Update History</h4>
              <UpdateTimeline
                updates={updates}
                loading={loadingUpdates}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Determine the type of a roadmap item
 */
function getItemType(item: RoadmapItem): 'theme' | 'product' | 'feature' {
  if ('products' in item) {
    return 'theme';
  } else if ('features' in item) {
    return 'product';
  } else {
    return 'feature';
  }
}

/**
 * Format a Date object for HTML date input (YYYY-MM-DD)
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
