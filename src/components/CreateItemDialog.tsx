/**
 * CreateItemDialog Component
 * Modal dialog for creating roadmap items with proper form controls
 * Supports inline creation of themes and products during feature creation
 */

import React, { useState, useEffect } from 'react';
import { Theme } from '../models';
import { Icon } from './Icon';
import './CreateItemDialog.css';

export type ItemType = 'theme' | 'product' | 'feature';

export interface CreateItemDialogProps {
  itemType: ItemType | null;
  themes: Theme[];
  onConfirm: (data: CreateItemData) => void;
  onCancel: () => void;
  onCreateTheme?: (name: string, description?: string) => Theme;
  onCreateProduct?: (themeId: string, name: string, description?: string, startDate?: Date, endDate?: Date) => void;
}

export interface CreateItemData {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  themeId?: string;
  productId?: string;
}

export function CreateItemDialog({ itemType: initialItemType, themes, onConfirm, onCancel, onCreateTheme, onCreateProduct }: CreateItemDialogProps) {
  const [itemType, setItemType] = useState<ItemType>(initialItemType || 'feature');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Inline creation states
  const [showNewThemeInput, setShowNewThemeInput] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  
  const [showNewProductInput, setShowNewProductInput] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductStartDate, setNewProductStartDate] = useState('');
  const [newProductEndDate, setNewProductEndDate] = useState('');

  // Get products for selected theme
  const availableProducts = selectedThemeId
    ? themes.find(t => t.id === selectedThemeId)?.products || []
    : [];

  // Auto-select first theme if creating product or feature
  useEffect(() => {
    if ((itemType === 'product' || itemType === 'feature') && themes.length > 0 && !selectedThemeId && !showNewThemeInput) {
      setSelectedThemeId(themes[0].id);
    }
  }, [itemType, themes, selectedThemeId, showNewThemeInput]);

  // Auto-select first product if creating feature
  useEffect(() => {
    if (itemType === 'feature' && availableProducts.length > 0 && !selectedProductId && !showNewProductInput) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [itemType, availableProducts, selectedProductId, showNewProductInput]);

  const handleCreateNewTheme = () => {
    if (!newThemeName.trim()) {
      setErrors({ ...errors, newTheme: 'Theme name is required' });
      return;
    }
    
    if (onCreateTheme) {
      const newTheme = onCreateTheme(newThemeName.trim());
      setSelectedThemeId(newTheme.id);
      setShowNewThemeInput(false);
      setNewThemeName('');
      const { newTheme: _, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const handleCreateNewProduct = () => {
    if (!newProductName.trim()) {
      setErrors({ ...errors, newProduct: 'Product name is required' });
      return;
    }
    
    if (!newProductStartDate || !newProductEndDate) {
      setErrors({ ...errors, newProduct: 'Start and end dates are required' });
      return;
    }
    
    const start = new Date(newProductStartDate);
    const end = new Date(newProductEndDate);
    if (start > end) {
      setErrors({ ...errors, newProduct: 'End date must be after start date' });
      return;
    }
    
    if (onCreateProduct && selectedThemeId) {
      onCreateProduct(
        selectedThemeId,
        newProductName.trim(),
        undefined,
        start,
        end
      );
      // The product will be available in the next render, so we'll need to select it
      setShowNewProductInput(false);
      setNewProductName('');
      setNewProductStartDate('');
      setNewProductEndDate('');
      const { newProduct: _, ...restErrors } = errors;
      setErrors(restErrors);
      
      // Find the newly created product and select it
      setTimeout(() => {
        const theme = themes.find(t => t.id === selectedThemeId);
        if (theme && theme.products.length > 0) {
          const lastProduct = theme.products[theme.products.length - 1];
          setSelectedProductId(lastProduct.id);
        }
      }, 100);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (itemType === 'product' || itemType === 'feature') {
      if (!startDate) {
        newErrors.startDate = 'Start date is required';
      }
      if (!endDate) {
        newErrors.endDate = 'End date is required';
      }
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
          newErrors.dateRange = 'End date must be after start date';
        }
      }
    }

    if (itemType === 'product' && !selectedThemeId && !showNewThemeInput) {
      newErrors.theme = 'Theme is required';
    }

    if (itemType === 'feature') {
      if (!selectedThemeId && !showNewThemeInput) {
        newErrors.theme = 'Theme is required';
      }
      if (!selectedProductId && !showNewProductInput) {
        newErrors.product = 'Product is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CreateItemData = {
      name: name.trim(),
    };

    if (startDate) {
      data.startDate = new Date(startDate);
    }
    if (endDate) {
      data.endDate = new Date(endDate);
    }
    if (selectedThemeId) {
      data.themeId = selectedThemeId;
    }
    if (selectedProductId) {
      data.productId = selectedProductId;
    }

    onConfirm(data);
  };

  const getTitle = () => {
    return 'Create New Item';
  };

  const requiresDates = itemType === 'product' || itemType === 'feature';

  return (
    <div className="create-item-dialog-overlay" onClick={onCancel}>
      <div className="create-item-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="create-item-dialog-header">
          <h3>{getTitle()}</h3>
          <button
            className="create-item-dialog-close"
            onClick={onCancel}
            title="Close (Esc)"
          >
            <Icon name="close" size="medium" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-item-dialog-form">
          {/* Item Type Selector */}
          <div className="form-group">
            <label htmlFor="item-type">
              What would you like to create? <span className="required">*</span>
            </label>
            <div className="item-type-selector">
              <button
                type="button"
                className={`item-type-button ${itemType === 'theme' ? 'active' : ''}`}
                onClick={() => {
                  setItemType('theme');
                  setSelectedThemeId('');
                  setSelectedProductId('');
                }}
              >
                <Icon name="theme" size="large" className="item-type-icon" />
                <span className="item-type-label">Theme</span>
              </button>
              <button
                type="button"
                className={`item-type-button ${itemType === 'product' ? 'active' : ''}`}
                onClick={() => {
                  setItemType('product');
                  setSelectedProductId('');
                }}
              >
                <Icon name="product" size="large" className="item-type-icon" />
                <span className="item-type-label">Product</span>
              </button>
              <button
                type="button"
                className={`item-type-button ${itemType === 'feature' ? 'active' : ''}`}
                onClick={() => setItemType('feature')}
              >
                <Icon name="feature" size="large" className="item-type-icon" />
                <span className="item-type-label">Feature</span>
              </button>
            </div>
          </div>

          {/* Name field */}
          <div className="form-group">
            <label htmlFor="create-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${itemType} name`}
              className={errors.name ? 'input-error' : ''}
              autoFocus
            />
            {errors.name && <div className="validation-error">{errors.name}</div>}
          </div>

          {/* Theme selector (for products and features) */}
          {(itemType === 'product' || itemType === 'feature') && (
            <div className="form-group">
              <label htmlFor="create-theme">
                Theme <span className="required">*</span>
              </label>
              
              {!showNewThemeInput ? (
                <>
                  <div className="select-with-button">
                    <select
                      id="create-theme"
                      value={selectedThemeId}
                      onChange={(e) => {
                        setSelectedThemeId(e.target.value);
                        if (itemType === 'feature') {
                          setSelectedProductId(''); // Reset product selection
                        }
                      }}
                      className={errors.theme ? 'input-error' : ''}
                    >
                      <option value="">Select a theme...</option>
                      {themes.map(theme => (
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
                  {errors.theme && <div className="validation-error">{errors.theme}</div>}
                </>
              ) : (
                <div className="inline-create-form">
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="New theme name"
                    className={errors.newTheme ? 'input-error' : ''}
                    autoFocus
                  />
                  {errors.newTheme && <div className="validation-error">{errors.newTheme}</div>}
                  <div className="inline-create-actions">
                    <button
                      type="button"
                      className="button-secondary-small"
                      onClick={() => {
                        setShowNewThemeInput(false);
                        setNewThemeName('');
                        const { newTheme: _, ...restErrors } = errors;
                        setErrors(restErrors);
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
          )}

          {/* Product selector (for features) */}
          {itemType === 'feature' && (
            <div className="form-group">
              <label htmlFor="create-product">
                Product <span className="required">*</span>
              </label>
              
              {!showNewProductInput ? (
                <>
                  <div className="select-with-button">
                    <select
                      id="create-product"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className={errors.product ? 'input-error' : ''}
                      disabled={!selectedThemeId || availableProducts.length === 0}
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
                  {errors.product && <div className="validation-error">{errors.product}</div>}
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
                    className={errors.newProduct ? 'input-error' : ''}
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
                  {errors.newProduct && <div className="validation-error">{errors.newProduct}</div>}
                  <div className="inline-create-actions">
                    <button
                      type="button"
                      className="button-secondary-small"
                      onClick={() => {
                        setShowNewProductInput(false);
                        setNewProductName('');
                        setNewProductStartDate('');
                        setNewProductEndDate('');
                        const { newProduct: _, ...restErrors } = errors;
                        setErrors(restErrors);
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
          )}

          {/* Start Date field */}
          <div className="form-group">
            <label htmlFor="create-start-date">
              Start Date {requiresDates && <span className="required">*</span>}
            </label>
            <input
              id="create-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={errors.startDate || errors.dateRange ? 'input-error' : ''}
            />
            {errors.startDate && <div className="validation-error">{errors.startDate}</div>}
          </div>

          {/* End Date field */}
          <div className="form-group">
            <label htmlFor="create-end-date">
              End Date {requiresDates && <span className="required">*</span>}
            </label>
            <input
              id="create-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={errors.endDate || errors.dateRange ? 'input-error' : ''}
            />
            {errors.endDate && <div className="validation-error">{errors.endDate}</div>}
          </div>

          {/* Date range error */}
          {errors.dateRange && (
            <div className="validation-error-block">
              <span className="validation-error-icon">✕</span>
              {errors.dateRange}
            </div>
          )}

          {/* Actions */}
          <div className="create-item-dialog-actions">
            <button type="button" className="button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="button-primary">
              Create {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
