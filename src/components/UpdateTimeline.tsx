/**
 * UpdateTimeline Component
 * Displays chronological timeline of feature updates
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React, { useState, useEffect } from 'react';
import { Update } from '../services/ProgressService';
import './UpdateTimeline.css';

export interface UpdateTimelineProps {
  updates: Update[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onEmailClick?: (emailId: string) => void;
}

// Status color mapping (same as ProgressIndicator)
const STATUS_COLORS: Record<string, string> = {
  'not-started': '#879596',
  'in-progress': '#007185',
  'blocked': '#B12704',
  'complete': '#067D62',
  'on-hold': '#C7511F',
  'at-risk': '#FF9900',
};

export function UpdateTimeline({
  updates,
  loading = false,
  onLoadMore,
  hasMore = false,
  onEmailClick,
}: UpdateTimelineProps) {
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingMore(false);
    }
  }, [loading]);

  const handleLoadMore = async () => {
    if (onLoadMore && !loadingMore) {
      setLoadingMore(true);
      await onLoadMore();
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getStatusColor = (status: string): string => {
    const normalized = status.toLowerCase();
    return STATUS_COLORS[normalized] || STATUS_COLORS['not-started'];
  };

  if (loading && updates.length === 0) {
    return (
      <div className="update-timeline">
        <div className="update-timeline-loading">
          <p>Loading updates...</p>
        </div>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="update-timeline">
        <div className="update-timeline-empty">
          <p>No updates yet</p>
          <p>Updates will appear here as progress is tracked</p>
        </div>
      </div>
    );
  }

  return (
    <div className="update-timeline">
      {updates.map((update) => (
        <div key={update.id} className="timeline-item">
          {/* Timeline Dot */}
          <div
            className={`timeline-dot ${
              update.source === 'email' ? 'timeline-dot-email' : 'timeline-dot-manual'
            }`}
            title={update.source === 'email' ? 'From email' : 'Manual update'}
          />

          {/* Timeline Content */}
          <div className="timeline-content">
            {/* Header */}
            <div className="timeline-header">
              <span className="timeline-sender">{update.sender}</span>
              <span className="timeline-timestamp">
                {formatTimestamp(update.timestamp)}
              </span>
            </div>

            {/* Summary */}
            <div className="timeline-summary">{update.summary}</div>

            {/* Metadata */}
            <div className="timeline-metadata">
              {/* Status */}
              {update.status && (
                <div className="timeline-meta-item">
                  <span
                    className="timeline-status-badge"
                    style={{ backgroundColor: getStatusColor(update.status) }}
                  >
                    {update.status}
                  </span>
                </div>
              )}

              {/* Percentage */}
              {update.percentComplete !== null && (
                <div className="timeline-meta-item">
                  <span className="timeline-meta-label">Progress:</span>
                  <span className="timeline-meta-value">{update.percentComplete}%</span>
                </div>
              )}

              {/* Sentiment */}
              {update.sentiment && (
                <div className="timeline-meta-item">
                  <span className="timeline-meta-label">Sentiment:</span>
                  <span className="timeline-meta-value">{update.sentiment}</span>
                </div>
              )}

              {/* Urgency */}
              {update.urgency && (
                <div className="timeline-meta-item">
                  <span className="timeline-meta-label">Urgency:</span>
                  <span className="timeline-meta-value">{update.urgency}</span>
                </div>
              )}
            </div>

            {/* Blockers */}
            {update.blockers && update.blockers.length > 0 && (
              <div>
                <div className="timeline-list-title">Blockers:</div>
                <ul className="timeline-list">
                  {update.blockers.map((blocker, index) => (
                    <li key={index}>{blocker}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {update.actionItems && update.actionItems.length > 0 && (
              <div>
                <div className="timeline-list-title">Action Items:</div>
                <ul className="timeline-list">
                  {update.actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Email Link */}
            {update.emailId && onEmailClick && (
              <a
                href="#"
                className="timeline-email-link"
                onClick={(e) => {
                  e.preventDefault();
                  onEmailClick(update.emailId!);
                }}
              >
                View original email →
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="timeline-load-more">
          <button
            className="timeline-load-more-button"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
