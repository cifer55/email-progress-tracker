/**
 * UpdateTimeline Component Tests
 * Unit tests for the UpdateTimeline component
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateTimeline } from './UpdateTimeline';
import { Update } from '../services/ProgressService';

const mockUpdate: Update = {
  id: 'update-1',
  featureId: 'feature-1',
  timestamp: new Date('2024-01-15T10:00:00Z'),
  sender: 'test@example.com',
  summary: 'Test update summary',
  status: 'in-progress',
  percentComplete: 50,
  blockers: ['Blocker 1', 'Blocker 2'],
  actionItems: ['Action 1', 'Action 2'],
  sentiment: 'positive',
  urgency: 'normal',
  source: 'email',
  emailId: 'email-1',
  createdBy: null,
};

describe('UpdateTimeline', () => {
  describe('Loading State', () => {
    it('should show loading message when loading with no updates', () => {
      render(<UpdateTimeline updates={[]} loading={true} />);
      
      expect(screen.getByText('Loading updates...')).toBeInTheDocument();
    });

    it('should not show loading message when loading with existing updates', () => {
      render(<UpdateTimeline updates={[mockUpdate]} loading={true} />);
      
      expect(screen.queryByText('Loading updates...')).not.toBeInTheDocument();
      expect(screen.getByText('Test update summary')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no updates', () => {
      render(<UpdateTimeline updates={[]} />);
      
      expect(screen.getByText('No updates yet')).toBeInTheDocument();
      expect(screen.getByText('Updates will appear here as progress is tracked')).toBeInTheDocument();
    });
  });

  describe('Update Display', () => {
    it('should render update summary', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('Test update summary')).toBeInTheDocument();
    });

    it('should render sender', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should render status badge', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('in-progress')).toBeInTheDocument();
    });

    it('should render percentage when present', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should not render percentage when null', () => {
      const updateWithoutPercent = { ...mockUpdate, percentComplete: null };
      render(<UpdateTimeline updates={[updateWithoutPercent]} />);
      
      expect(screen.queryByText('Progress:')).not.toBeInTheDocument();
    });

    it('should render sentiment when present', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('positive')).toBeInTheDocument();
    });

    it('should render urgency when present', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('normal')).toBeInTheDocument();
    });

    it('should render blockers list', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('Blockers:')).toBeInTheDocument();
      expect(screen.getByText('Blocker 1')).toBeInTheDocument();
      expect(screen.getByText('Blocker 2')).toBeInTheDocument();
    });

    it('should render action items list', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.getByText('Action Items:')).toBeInTheDocument();
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
    });

    it('should not render empty blockers list', () => {
      const updateWithoutBlockers = { ...mockUpdate, blockers: [] };
      render(<UpdateTimeline updates={[updateWithoutBlockers]} />);
      
      expect(screen.queryByText('Blockers:')).not.toBeInTheDocument();
    });

    it('should not render empty action items list', () => {
      const updateWithoutActions = { ...mockUpdate, actionItems: [] };
      render(<UpdateTimeline updates={[updateWithoutActions]} />);
      
      expect(screen.queryByText('Action Items:')).not.toBeInTheDocument();
    });
  });

  describe('Source Indicator', () => {
    it('should show email indicator for email updates', () => {
      const { container } = render(<UpdateTimeline updates={[mockUpdate]} />);
      
      const dot = container.querySelector('.timeline-dot-email');
      expect(dot).toBeInTheDocument();
      expect(dot?.getAttribute('title')).toBe('From email');
    });

    it('should show manual indicator for manual updates', () => {
      const manualUpdate = { ...mockUpdate, source: 'manual' as const };
      const { container } = render(<UpdateTimeline updates={[manualUpdate]} />);
      
      const dot = container.querySelector('.timeline-dot-manual');
      expect(dot).toBeInTheDocument();
      expect(dot?.getAttribute('title')).toBe('Manual update');
    });
  });

  describe('Email Link', () => {
    it('should render email link when emailId present and onEmailClick provided', () => {
      const onEmailClick = vi.fn();
      render(<UpdateTimeline updates={[mockUpdate]} onEmailClick={onEmailClick} />);
      
      expect(screen.getByText('View original email →')).toBeInTheDocument();
    });

    it('should call onEmailClick when email link clicked', () => {
      const onEmailClick = vi.fn();
      render(<UpdateTimeline updates={[mockUpdate]} onEmailClick={onEmailClick} />);
      
      const link = screen.getByText('View original email →');
      fireEvent.click(link);
      
      expect(onEmailClick).toHaveBeenCalledWith('email-1');
    });

    it('should not render email link when emailId is null', () => {
      const updateWithoutEmail = { ...mockUpdate, emailId: null };
      const onEmailClick = vi.fn();
      render(<UpdateTimeline updates={[updateWithoutEmail]} onEmailClick={onEmailClick} />);
      
      expect(screen.queryByText('View original email →')).not.toBeInTheDocument();
    });

    it('should not render email link when onEmailClick not provided', () => {
      render(<UpdateTimeline updates={[mockUpdate]} />);
      
      expect(screen.queryByText('View original email →')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Updates', () => {
    it('should render multiple updates', () => {
      const updates = [
        mockUpdate,
        { ...mockUpdate, id: 'update-2', summary: 'Second update' },
        { ...mockUpdate, id: 'update-3', summary: 'Third update' },
      ];
      
      render(<UpdateTimeline updates={updates} />);
      
      expect(screen.getByText('Test update summary')).toBeInTheDocument();
      expect(screen.getByText('Second update')).toBeInTheDocument();
      expect(screen.getByText('Third update')).toBeInTheDocument();
    });
  });

  describe('Load More', () => {
    it('should render load more button when hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(<UpdateTimeline updates={[mockUpdate]} hasMore={true} onLoadMore={onLoadMore} />);
      
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('should not render load more button when hasMore is false', () => {
      const onLoadMore = vi.fn();
      render(<UpdateTimeline updates={[mockUpdate]} hasMore={false} onLoadMore={onLoadMore} />);
      
      expect(screen.queryByText('Load More')).not.toBeInTheDocument();
    });

    it('should call onLoadMore when button clicked', () => {
      const onLoadMore = vi.fn().mockResolvedValue(undefined);
      render(<UpdateTimeline updates={[mockUpdate]} hasMore={true} onLoadMore={onLoadMore} />);
      
      const button = screen.getByText('Load More');
      fireEvent.click(button);
      
      expect(onLoadMore).toHaveBeenCalled();
    });

    it('should show loading state when loading more', async () => {
      const onLoadMore = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<UpdateTimeline updates={[mockUpdate]} hasMore={true} onLoadMore={onLoadMore} />);
      
      const button = screen.getByText('Load More');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should disable button while loading more', async () => {
      const onLoadMore = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<UpdateTimeline updates={[mockUpdate]} hasMore={true} onLoadMore={onLoadMore} />);
      
      const button = screen.getByText('Load More') as HTMLButtonElement;
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format recent timestamps as relative time', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const recentUpdate = { ...mockUpdate, timestamp: fiveMinutesAgo };
      
      render(<UpdateTimeline updates={[recentUpdate]} />);
      
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should format hour-old timestamps', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const recentUpdate = { ...mockUpdate, timestamp: twoHoursAgo };
      
      render(<UpdateTimeline updates={[recentUpdate]} />);
      
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should format day-old timestamps', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const recentUpdate = { ...mockUpdate, timestamp: threeDaysAgo };
      
      render(<UpdateTimeline updates={[recentUpdate]} />);
      
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color to status badge', () => {
      const { container } = render(<UpdateTimeline updates={[mockUpdate]} />);
      
      const badge = container.querySelector('.timeline-status-badge') as HTMLElement;
      expect(badge.style.backgroundColor).toBe('rgb(0, 113, 133)'); // in-progress color
    });

    it('should handle unknown status with default color', () => {
      const unknownStatusUpdate = { ...mockUpdate, status: 'unknown-status' };
      const { container } = render(<UpdateTimeline updates={[unknownStatusUpdate]} />);
      
      const badge = container.querySelector('.timeline-status-badge') as HTMLElement;
      expect(badge.style.backgroundColor).toBe('rgb(135, 149, 150)'); // default color
    });
  });
});
