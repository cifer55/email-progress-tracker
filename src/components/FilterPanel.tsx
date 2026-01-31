/**
 * FilterPanel Component
 * Provides filter controls for themes, products, and date ranges
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import React from 'react';
import { Theme, Product } from '../models';
import { Icon } from './Icon';
import './FilterPanel.css';

export interface FilterPanelProps {
  themes: Theme[];
  products: Product[];
  activeThemeIds: string[];
  activeProductIds: string[];
  onThemeFilterChange: (themeIds: string[]) => void;
  onProductFilterChange: (productIds: string[]) => void;
  onClearFilters: () => void;
}

export function FilterPanel({
  themes,
  products,
  activeThemeIds,
  activeProductIds,
  onThemeFilterChange,
  onProductFilterChange,
  onClearFilters,
}: FilterPanelProps) {
  const handleThemeToggle = (themeId: string) => {
    const newThemeIds = activeThemeIds.includes(themeId)
      ? activeThemeIds.filter((id) => id !== themeId)
      : [...activeThemeIds, themeId];
    onThemeFilterChange(newThemeIds);
  };

  const handleProductToggle = (productId: string) => {
    const newProductIds = activeProductIds.includes(productId)
      ? activeProductIds.filter((id) => id !== productId)
      : [...activeProductIds, productId];
    onProductFilterChange(newProductIds);
  };

  const hasActiveFilters =
    activeThemeIds.length > 0 ||
    activeProductIds.length > 0;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <div className="filter-panel-title">
          <Icon name="filter" size="medium" />
          <h3>Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            className="filter-clear-button"
            onClick={onClearFilters}
            title="Clear all filters"
          >
            <Icon name="close" size="small" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Theme Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">Themes</h4>
        <div className="filter-list">
          {themes.length === 0 ? (
            <p className="filter-empty">No themes available</p>
          ) : (
            themes.map((theme) => (
              <label key={theme.id} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={activeThemeIds.includes(theme.id)}
                  onChange={() => handleThemeToggle(theme.id)}
                />
                <span>{theme.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Product Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">Products</h4>
        <div className="filter-list">
          {products.length === 0 ? (
            <p className="filter-empty">No products available</p>
          ) : (
            products.map((product) => (
              <label key={product.id} className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={activeProductIds.includes(product.id)}
                  onChange={() => handleProductToggle(product.id)}
                />
                <span>{product.name}</span>
              </label>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
