/**
 * ReviewQueue Component Tests
 * Unit tests for the ReviewQueue component
 * Requirements: 10.1, 10.2, 10.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewQueue, UnmatchedEmail } from './ReviewQueue';
import { Feature } from '../models';

const mockEmail: UnmatchedEmail = {
  id: 'email-1',
  from: 'sender@example.com',
  subject: 'Feature Update',
  body: 'This is a test email body with some content about the feature progress.',
  receivedAt: new Date('2024-01-15T10:00:00Z'),
  suggestedMatches: [
    {
      featureId: 'feature-1',
      featureName: 'Test Feature',
      productName: 'Test Product',
      themeName: 'Test Theme',
      confidence: 0.85,
    },
    {
      featureId: 'feature-2',
      featureName: 'Another Feature',
      productName: 'Test Product',
      themeName: 'Test Theme',
      confidence: 0.45,
    },
  ],
};

const mockFeatures: Feature[] = [
  {
    id: 'feature-1',
    name: 'Test Feature',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-01'),
    productId: 'product-1',
    themeId: 'theme-1',
  },
  {
    id: 'feature-2',
    name: 'Another Feature',
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-01'),
    productId: 'product-1',
    themeId: 'theme-1',
  },
];

describe('ReviewQueue', () => {
  describe('Loading State', () => {
    it('should show loading message when loading with no emails', () => {
      render(
        <ReviewQueue
          emails={[]}
          features={mockFeatures}
          loading={true}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Loading unmatched emails...')).toBeInTheDocument();
    });

    it('should not show loading message when loading with existing emails', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          loading={true}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.queryByText('Loading unmatched emails...')).not.toBeInTheDocument();
      expect(screen.getByText('Feature Update')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no emails', () => {
      render(
        <ReviewQueue
          emails={[]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText('No emails need review')).toBeInTheDocument();
    });
  });

  describe('Email Display', () => {
    it('should render email sender', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('sender@example.com')).toBeInTheDocument();
    });

    it('should render email subject', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Feature Update')).toBeInTheDocument();
    });

    it('should render email body preview', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText(/This is a test email body/)).toBeInTheDocument();
    });

    it('should truncate long email bodies', () => {
      const longEmail = {
        ...mockEmail,
        body: 'a'.repeat(400),
      };
      
      const { container } = render(
        <ReviewQueue
          emails={[longEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const bodyElement = container.querySelector('.review-email-body');
      expect(bodyElement?.textContent?.length).toBeLessThan(400);
      expect(bodyElement?.textContent).toContain('...');
    });

    it('should render multiple emails', () => {
      const emails = [
        mockEmail,
        { ...mockEmail, id: 'email-2', subject: 'Second Email' },
      ];
      
      render(
        <ReviewQueue
          emails={emails}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Feature Update')).toBeInTheDocument();
      expect(screen.getByText('Second Email')).toBeInTheDocument();
    });
  });

  describe('Suggested Matches', () => {
    it('should render suggested matches', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Suggested Matches:')).toBeInTheDocument();
      expect(screen.getByText('Test Feature')).toBeInTheDocument();
      expect(screen.getByText('Another Feature')).toBeInTheDocument();
    });

    it('should display confidence levels', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('High')).toBeInTheDocument(); // 0.85 confidence
      expect(screen.getByText('Medium')).toBeInTheDocument(); // 0.45 confidence
    });

    it('should display feature path', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const paths = screen.getAllByText(/Test Theme → Test Product/);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should call onLink when suggested match clicked', async () => {
      const onLink = vi.fn().mockResolvedValue(undefined);
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={onLink}
          onDismiss={vi.fn()}
        />
      );
      
      const match = screen.getByText('Test Feature');
      fireEvent.click(match);
      
      await waitFor(() => {
        expect(onLink).toHaveBeenCalledWith('email-1', 'feature-1');
      });
    });

    it('should not render suggested matches section when no matches', () => {
      const emailWithoutMatches = { ...mockEmail, suggestedMatches: [] };
      render(
        <ReviewQueue
          emails={[emailWithoutMatches]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.queryByText('Suggested Matches:')).not.toBeInTheDocument();
    });
  });

  describe('Manual Linking', () => {
    it('should show manual link button', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Link Manually')).toBeInTheDocument();
    });

    it('should show feature selector when manual link clicked', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const button = screen.getByText('Link Manually');
      fireEvent.click(button);
      
      expect(screen.getByText('Link to Feature:')).toBeInTheDocument();
      expect(screen.getByText('Select a feature...')).toBeInTheDocument();
    });

    it('should populate feature dropdown with all features', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const button = screen.getByText('Link Manually');
      fireEvent.click(button);
      
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options.length).toBe(3); // 1 placeholder + 2 features
    });

    it('should call onLink when manual link submitted', async () => {
      const onLink = vi.fn().mockResolvedValue(undefined);
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={onLink}
          onDismiss={vi.fn()}
        />
      );
      
      // Open manual link form
      const manualButton = screen.getByText('Link Manually');
      fireEvent.click(manualButton);
      
      // Select a feature
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'feature-1' } });
      
      // Submit
      const linkButton = screen.getByText('Link');
      fireEvent.click(linkButton);
      
      await waitFor(() => {
        expect(onLink).toHaveBeenCalledWith('email-1', 'feature-1');
      });
    });

    it('should disable link button when no feature selected', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const manualButton = screen.getByText('Link Manually');
      fireEvent.click(manualButton);
      
      const linkButton = screen.getByText('Link') as HTMLButtonElement;
      expect(linkButton.disabled).toBe(true);
    });

    it('should close manual link form when cancel clicked', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      const manualButton = screen.getByText('Link Manually');
      fireEvent.click(manualButton);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Link to Feature:')).not.toBeInTheDocument();
    });
  });

  describe('Dismiss', () => {
    it('should render dismiss button', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss clicked', async () => {
      const onDismiss = vi.fn().mockResolvedValue(undefined);
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={onDismiss}
        />
      );
      
      const button = screen.getByText('Dismiss');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledWith('email-1');
      });
    });

    it('should show dismissing state', async () => {
      const onDismiss = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={onDismiss}
        />
      );
      
      const button = screen.getByText('Dismiss');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Dismissing...')).toBeInTheDocument();
      });
    });
  });

  describe('Load More', () => {
    it('should render load more button when hasMore is true', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
          hasMore={true}
          onLoadMore={vi.fn()}
        />
      );
      
      const buttons = screen.getAllByText('Load More');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should call onLoadMore when button clicked', () => {
      const onLoadMore = vi.fn();
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );
      
      const buttons = screen.getAllByText('Load More');
      fireEvent.click(buttons[buttons.length - 1]);
      
      expect(onLoadMore).toHaveBeenCalled();
    });

    it('should not render load more button when hasMore is false', () => {
      render(
        <ReviewQueue
          emails={[mockEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
          hasMore={false}
        />
      );
      
      // Should only have "Link Manually" button, not "Load More"
      const allButtons = screen.getAllByRole('button');
      const loadMoreButtons = allButtons.filter(btn => btn.textContent === 'Load More');
      expect(loadMoreButtons.length).toBe(0);
    });
  });

  describe('Date Formatting', () => {
    it('should format recent dates as relative time', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const recentEmail = { ...mockEmail, receivedAt: fiveMinutesAgo };
      
      render(
        <ReviewQueue
          emails={[recentEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    });

    it('should format hour-old dates', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const recentEmail = { ...mockEmail, receivedAt: twoHoursAgo };
      
      render(
        <ReviewQueue
          emails={[recentEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });
  });

  describe('Confidence Levels', () => {
    it('should classify high confidence correctly', () => {
      const highConfidenceEmail = {
        ...mockEmail,
        suggestedMatches: [{
          featureId: 'feature-1',
          featureName: 'Test Feature',
          productName: 'Test Product',
          themeName: 'Test Theme',
          confidence: 0.9,
        }],
      };
      
      render(
        <ReviewQueue
          emails={[highConfidenceEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should classify medium confidence correctly', () => {
      const mediumConfidenceEmail = {
        ...mockEmail,
        suggestedMatches: [{
          featureId: 'feature-1',
          featureName: 'Test Feature',
          productName: 'Test Product',
          themeName: 'Test Theme',
          confidence: 0.5,
        }],
      };
      
      render(
        <ReviewQueue
          emails={[mediumConfidenceEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('should classify low confidence correctly', () => {
      const lowConfidenceEmail = {
        ...mockEmail,
        suggestedMatches: [{
          featureId: 'feature-1',
          featureName: 'Test Feature',
          productName: 'Test Product',
          themeName: 'Test Theme',
          confidence: 0.2,
        }],
      };
      
      render(
        <ReviewQueue
          emails={[lowConfidenceEmail]}
          features={mockFeatures}
          onLink={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });
});
