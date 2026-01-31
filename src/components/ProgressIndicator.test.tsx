/**
 * ProgressIndicator Component Tests
 * Unit tests for the ProgressIndicator component
 * Requirements: 7.1, 7.2, 7.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from './ProgressIndicator';

describe('ProgressIndicator', () => {
  describe('Status Badge', () => {
    it('should render status badge with correct label', () => {
      render(<ProgressIndicator status="in-progress" percentComplete={50} />);
      
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('should render all status types correctly', () => {
      const statuses = [
        { status: 'not-started', label: 'Not Started' },
        { status: 'in-progress', label: 'In Progress' },
        { status: 'blocked', label: 'Blocked' },
        { status: 'complete', label: 'Complete' },
        { status: 'on-hold', label: 'On Hold' },
        { status: 'at-risk', label: 'At Risk' },
      ];

      statuses.forEach(({ status, label }) => {
        const { unmount } = render(<ProgressIndicator status={status} percentComplete={50} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });

    it('should handle unknown status gracefully', () => {
      render(<ProgressIndicator status="unknown-status" percentComplete={50} />);
      
      expect(screen.getByText('unknown-status')).toBeInTheDocument();
    });

    it('should handle case-insensitive status', () => {
      render(<ProgressIndicator status="IN-PROGRESS" percentComplete={50} />);
      
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar by default', () => {
      const { container } = render(<ProgressIndicator status="in-progress" percentComplete={50} />);
      
      expect(container.querySelector('.progress-bar-container')).toBeInTheDocument();
    });

    it('should display correct percentage', () => {
      render(<ProgressIndicator status="in-progress" percentComplete={75} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should clamp percentage to 0-100 range', () => {
      const { rerender } = render(<ProgressIndicator status="in-progress" percentComplete={-10} />);
      expect(screen.getByText('0%')).toBeInTheDocument();

      rerender(<ProgressIndicator status="in-progress" percentComplete={150} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should hide progress bar when showBar is false', () => {
      const { container } = render(
        <ProgressIndicator status="in-progress" percentComplete={50} showBar={false} />
      );
      
      expect(container.querySelector('.progress-bar-container')).not.toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <ProgressIndicator status="in-progress" percentComplete={50} showPercentage={false} />
      );
      
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should render progress bar fill with correct width', () => {
      const { container } = render(<ProgressIndicator status="in-progress" percentComplete={60} />);
      
      const fill = container.querySelector('.progress-bar-fill') as HTMLElement;
      expect(fill).toBeInTheDocument();
      expect(fill.style.width).toBe('60%');
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      const { container } = render(
        <ProgressIndicator status="in-progress" percentComplete={50} size="small" />
      );
      
      expect(container.querySelector('.progress-indicator-small')).toBeInTheDocument();
    });

    it('should render with medium size by default', () => {
      const { container } = render(<ProgressIndicator status="in-progress" percentComplete={50} />);
      
      expect(container.querySelector('.progress-indicator-medium')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      const { container } = render(
        <ProgressIndicator status="in-progress" percentComplete={50} size="large" />
      );
      
      expect(container.querySelector('.progress-indicator-large')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should apply correct color for each status', () => {
      const statusColors = [
        { status: 'not-started', color: 'rgb(135, 149, 150)' },
        { status: 'in-progress', color: 'rgb(0, 113, 133)' },
        { status: 'blocked', color: 'rgb(177, 39, 4)' },
        { status: 'complete', color: 'rgb(6, 125, 98)' },
        { status: 'on-hold', color: 'rgb(199, 81, 31)' },
        { status: 'at-risk', color: 'rgb(255, 153, 0)' },
      ];

      statusColors.forEach(({ status, color }) => {
        const { container, unmount } = render(
          <ProgressIndicator status={status} percentComplete={50} />
        );
        
        const badge = container.querySelector('.progress-status-badge') as HTMLElement;
        expect(badge.style.backgroundColor).toBe(color);
        
        unmount();
      });
    });

    it('should apply default color for unknown status', () => {
      const { container } = render(<ProgressIndicator status="unknown" percentComplete={50} />);
      
      const badge = container.querySelector('.progress-status-badge') as HTMLElement;
      expect(badge.style.backgroundColor).toBe('rgb(135, 149, 150)'); // Default color
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute on status badge', () => {
      const { container } = render(<ProgressIndicator status="in-progress" percentComplete={50} />);
      
      const badge = container.querySelector('.progress-status-badge') as HTMLElement;
      expect(badge.getAttribute('title')).toBe('Status: In Progress');
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0% progress', () => {
      render(<ProgressIndicator status="not-started" percentComplete={0} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle 100% progress', () => {
      render(<ProgressIndicator status="complete" percentComplete={100} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle decimal percentages', () => {
      render(<ProgressIndicator status="in-progress" percentComplete={45.7} />);
      
      expect(screen.getByText('45.7%')).toBeInTheDocument();
    });
  });
});
