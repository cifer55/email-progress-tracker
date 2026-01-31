/**
 * Banner Component
 * Displays warnings and errors with dismiss button
 * Requirements: 6.3, 6.5, 9.1, 9.2, 9.3, 9.5
 */

import './Banner.css';

export type BannerType = 'warning' | 'error';

export interface BannerProps {
  type: BannerType;
  message: string;
  onClose: () => void;
}

export function Banner({ type, message, onClose }: BannerProps) {
  const icon = type === 'error' ? '✕' : '⚠';
  const className = `banner banner-${type}`;

  return (
    <div className={className} role="alert">
      <div className="banner-content">
        <span className="banner-icon">{icon}</span>
        <span className="banner-message">{message}</span>
      </div>
      <button
        className="banner-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
