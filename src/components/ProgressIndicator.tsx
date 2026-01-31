/**
 * ProgressIndicator Component
 * Displays progress status badge and percentage bar
 * Requirements: 7.1, 7.2, 7.5
 */

import React from 'react';
import './ProgressIndicator.css';

export interface ProgressIndicatorProps {
  status: string;
  percentComplete: number;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  showBar?: boolean;
}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  'not-started': '#879596', // Amazon Gray
  'in-progress': '#007185', // Amazon Blue
  'blocked': '#B12704', // Amazon Red
  'complete': '#067D62', // Amazon Green
  'on-hold': '#C7511F', // Amazon Dark Orange
  'at-risk': '#FF9900', // Amazon Orange
};

// Status display names
const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'blocked': 'Blocked',
  'complete': 'Complete',
  'on-hold': 'On Hold',
  'at-risk': 'At Risk',
};

export function ProgressIndicator({
  status,
  percentComplete,
  size = 'medium',
  showPercentage = true,
  showBar = true,
}: ProgressIndicatorProps) {
  const normalizedStatus = status.toLowerCase();
  const color = STATUS_COLORS[normalizedStatus] || STATUS_COLORS['not-started'];
  const label = STATUS_LABELS[normalizedStatus] || status;
  const clampedPercent = Math.max(0, Math.min(100, percentComplete));

  return (
    <div className={`progress-indicator progress-indicator-${size}`}>
      {/* Status Badge */}
      <div
        className="progress-status-badge"
        style={{ backgroundColor: color }}
        title={`Status: ${label}`}
      >
        <span className="progress-status-label">{label}</span>
      </div>

      {/* Progress Bar */}
      {showBar && (
        <div className="progress-bar-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${clampedPercent}%`,
                backgroundColor: color,
              }}
            />
          </div>
          {showPercentage && (
            <span className="progress-percentage">{clampedPercent}%</span>
          )}
        </div>
      )}
    </div>
  );
}
