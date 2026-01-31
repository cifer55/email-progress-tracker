/**
 * Toolbar Component
 * Provides main action buttons for the roadmap visualizer
 * Requirements: 1.1, 1.2, 1.3, 5.2, 5.3, 5.5, 7.1
 */

import { Icon } from './Icon';
import './Toolbar.css';

export interface ToolbarProps {
  onCreate: () => void;
  onImportCSV: () => void;
  onExport: (format: 'png' | 'json') => void;
}

export function Toolbar({
  onCreate,
  onImportCSV,
  onExport,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          className="toolbar-button toolbar-button-primary"
          onClick={onCreate}
          title="Create new item (Ctrl+N)"
        >
          <Icon name="plus" size="medium" />
          <span>Create</span>
        </button>
        <button
          className="toolbar-button"
          onClick={onImportCSV}
          title="Bulk import features from CSV file"
        >
          <Icon name="upload" size="small" />
          <span>Import CSV</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className="toolbar-button"
          onClick={() => onExport('png')}
          title="Export as PNG image"
        >
          <Icon name="download" size="small" />
          <span>PNG</span>
        </button>
        <button
          className="toolbar-button"
          onClick={() => onExport('json')}
          title="Export as JSON data"
        >
          <Icon name="export" size="small" />
          <span>JSON</span>
        </button>
      </div>
    </div>
  );
}
