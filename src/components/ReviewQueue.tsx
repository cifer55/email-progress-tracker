/**
 * ReviewQueue Component
 * Displays unmatched emails for manual review and linking
 * Requirements: 10.1, 10.2, 10.3
 */

import { useState } from 'react';
import { Feature } from '../models';
import './ReviewQueue.css';

export interface UnmatchedEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
  suggestedMatches?: Array<{
    featureId: string;
    featureName: string;
    productName: string;
    themeName: string;
    confidence: number;
  }>;
}

export interface ReviewQueueProps {
  emails: UnmatchedEmail[];
  features: Feature[];
  loading?: boolean;
  onLink: (emailId: string, featureId: string) => Promise<void>;
  onDismiss: (emailId: string) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ReviewQueue({
  emails,
  features,
  loading = false,
  onLink,
  onDismiss,
  onLoadMore,
  hasMore = false,
}: ReviewQueueProps) {
  const [linkingEmailId, setLinkingEmailId] = useState<string | null>(null);
  const [dismissingEmailId, setDismissingEmailId] = useState<string | null>(null);
  const [manualLinkEmailId, setManualLinkEmailId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');

  const handleSuggestedMatch = async (emailId: string, featureId: string) => {
    setLinkingEmailId(emailId);
    try {
      await onLink(emailId, featureId);
    } finally {
      setLinkingEmailId(null);
    }
  };

  const handleManualLink = async (emailId: string) => {
    if (!selectedFeatureId) return;

    setLinkingEmailId(emailId);
    try {
      await onLink(emailId, selectedFeatureId);
      setManualLinkEmailId(null);
      setSelectedFeatureId('');
    } finally {
      setLinkingEmailId(null);
    }
  };

  const handleDismiss = async (emailId: string) => {
    setDismissingEmailId(emailId);
    try {
      await onDismiss(emailId);
    } finally {
      setDismissingEmailId(null);
    }
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.7) return 'review-match-confidence-high';
    if (confidence >= 0.4) return 'review-match-confidence-medium';
    return 'review-match-confidence-low';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.4) return 'Medium';
    return 'Low';
  };

  if (loading && emails.length === 0) {
    return (
      <div className="review-queue">
        <div className="review-queue-loading">
          <p>Loading unmatched emails...</p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="review-queue">
        <div className="review-queue-empty">
          <div className="review-queue-empty-icon">✓</div>
          <p>All caught up!</p>
          <p>No emails need review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-queue">
      {emails.map((email) => (
        <div key={email.id} className="review-email-card">
          {/* Email Header */}
          <div className="review-email-header">
            <div className="review-email-meta">
              <div className="review-email-from">{email.from}</div>
              <div className="review-email-subject">{email.subject}</div>
              <div className="review-email-date">{formatDate(email.receivedAt)}</div>
            </div>
            <div className="review-email-actions">
              <button
                className="review-button review-button-danger"
                onClick={() => handleDismiss(email.id)}
                disabled={dismissingEmailId === email.id}
              >
                {dismissingEmailId === email.id ? 'Dismissing...' : 'Dismiss'}
              </button>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="review-email-body">
            {email.body.substring(0, 300)}
            {email.body.length > 300 && '...'}
            {email.body.length > 150 && <div className="review-email-body-fade" />}
          </div>

          {/* Suggested Matches */}
          {email.suggestedMatches && email.suggestedMatches.length > 0 && (
            <div className="review-suggested-matches">
              <div className="review-suggested-title">Suggested Matches:</div>
              <div className="review-match-list">
                {email.suggestedMatches.map((match) => (
                  <div
                    key={match.featureId}
                    className="review-match-item"
                    onClick={() => handleSuggestedMatch(email.id, match.featureId)}
                  >
                    <div className="review-match-info">
                      <div className="review-match-name">{match.featureName}</div>
                      <div className="review-match-path">
                        {match.themeName} → {match.productName}
                      </div>
                    </div>
                    <div
                      className={`review-match-confidence ${getConfidenceClass(
                        match.confidence
                      )}`}
                    >
                      {getConfidenceLabel(match.confidence)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Link */}
          {manualLinkEmailId === email.id ? (
            <div className="review-manual-link">
              <div className="review-manual-link-title">Link to Feature:</div>
              <div className="review-manual-link-form">
                <select
                  className="review-manual-link-select"
                  value={selectedFeatureId}
                  onChange={(e) => setSelectedFeatureId(e.target.value)}
                >
                  <option value="">Select a feature...</option>
                  {features.map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.name}
                    </option>
                  ))}
                </select>
                <button
                  className="review-button review-button-primary"
                  onClick={() => handleManualLink(email.id)}
                  disabled={!selectedFeatureId || linkingEmailId === email.id}
                >
                  {linkingEmailId === email.id ? 'Linking...' : 'Link'}
                </button>
                <button
                  className="review-button review-button-secondary"
                  onClick={() => {
                    setManualLinkEmailId(null);
                    setSelectedFeatureId('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="review-manual-link">
              <button
                className="review-button review-button-secondary"
                onClick={() => setManualLinkEmailId(email.id)}
              >
                Link Manually
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="review-load-more">
          <button className="review-button review-button-secondary" onClick={onLoadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
