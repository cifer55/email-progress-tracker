/**
 * Unit tests for EmailParserService
 * Requirements: 2.2, 2.3, 2.4
 */

import * as fc from 'fast-check';
import { EmailParserService } from './EmailParserService';

describe('EmailParserService', () => {
  let service: EmailParserService;

  beforeEach(() => {
    service = new EmailParserService();
  });

  describe('parseEmail', () => {
    it('should parse a basic email', async () => {
      const rawEmail = {
        id: 'email-123',
        from: 'user@example.com',
        subject: 'Feature #123 Update',
        body: 'The feature is 50% complete and in progress.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.id).toBe('email-123');
      expect(parsed.from).toBe('user@example.com');
      expect(parsed.subject).toBe('Feature #123 Update');
      expect(parsed.featureReferences.length).toBeGreaterThan(0);
      expect(parsed.progressIndicators.length).toBeGreaterThan(0);
    });

    it('should extract feature ID from subject', async () => {
      const rawEmail = {
        id: 'email-1',
        from: 'dev@example.com',
        subject: 'Update on Feature #456',
        body: 'Making good progress.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.featureReferences).toContainEqual(
        expect.objectContaining({
          featureId: '456',
          matchType: 'id',
        })
      );
    });

    it('should extract quoted feature names', async () => {
      const rawEmail = {
        id: 'email-2',
        from: 'pm@example.com',
        subject: 'Progress Update',
        body: 'Working on "User Authentication Feature" and making progress.',
      };

      const parsed = await service.parseEmail(rawEmail);

      const quotedRef = parsed.featureReferences.find(
        (ref) => ref.featureName === 'User Authentication Feature'
      );
      expect(quotedRef).toBeDefined();
      expect(quotedRef?.matchType).toBe('exact');
    });

    it('should extract status indicators', async () => {
      const rawEmail = {
        id: 'email-3',
        from: 'dev@example.com',
        subject: 'Status Update',
        body: 'Feature #123 is blocked by infrastructure issues.',
      };

      const parsed = await service.parseEmail(rawEmail);

      const blockedIndicator = parsed.progressIndicators.find(
        (ind) => ind.type === 'status' && ind.value === 'blocked'
      );
      expect(blockedIndicator).toBeDefined();
    });

    it('should extract percentage completion', async () => {
      const rawEmail = {
        id: 'email-4',
        from: 'dev@example.com',
        subject: 'Progress',
        body: 'The feature is 75% complete.',
      };

      const parsed = await service.parseEmail(rawEmail);

      const percentIndicator = parsed.progressIndicators.find(
        (ind) => ind.type === 'percentage' && ind.value === '75'
      );
      expect(percentIndicator).toBeDefined();
      expect(parsed.extractedInfo.percentComplete).toBe(75);
    });

    it('should extract blockers', async () => {
      const rawEmail = {
        id: 'email-5',
        from: 'dev@example.com',
        subject: 'Blocked',
        body: 'Blocker: Waiting for API access from infrastructure team.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.extractedInfo.blockers.length).toBeGreaterThan(0);
      expect(parsed.extractedInfo.blockers[0]).toContain('API access');
    });

    it('should extract action items', async () => {
      const rawEmail = {
        id: 'email-6',
        from: 'pm@example.com',
        subject: 'Action Items',
        body: 'Action item: Review the design document by Friday.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.extractedInfo.actionItems.length).toBeGreaterThan(0);
      expect(parsed.extractedInfo.actionItems[0]).toContain('Review the design document');
    });

    it('should extract dates', async () => {
      const rawEmail = {
        id: 'email-7',
        from: 'pm@example.com',
        subject: 'Timeline',
        body: 'Expected completion date is 12/31/2024.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.extractedInfo.dates).toContain('12/31/2024');
    });

    it('should handle HTML email body', async () => {
      const rawEmail = {
        id: 'email-8',
        from: 'user@example.com',
        subject: 'Update',
        body: '',
        htmlBody: '<html><body><p>Feature #789 is <strong>completed</strong>.</p></body></html>',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.body).toContain('Feature #789');
      expect(parsed.body).toContain('completed');
      expect(parsed.body).not.toContain('<html>');
    });

    it('should sanitize malicious HTML', async () => {
      const rawEmail = {
        id: 'email-9',
        from: 'user@example.com',
        subject: 'Update',
        body: '',
        htmlBody: '<script>alert("XSS")</script><p>Safe content</p>',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.body).not.toContain('<script>');
      expect(parsed.body).not.toContain('alert');
      expect(parsed.body).toContain('Safe content');
    });

    it('should calculate confidence score', async () => {
      const rawEmail = {
        id: 'email-10',
        from: 'dev@example.com',
        subject: 'Feature #123 Update',
        body: 'Feature is 80% complete and in progress.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.confidence).toBeGreaterThan(0);
      expect(parsed.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle email with no feature references', async () => {
      const rawEmail = {
        id: 'email-11',
        from: 'user@example.com',
        subject: 'General Update',
        body: 'Just a general status update with no specific features.',
      };

      const parsed = await service.parseEmail(rawEmail);

      expect(parsed.featureReferences.length).toBe(0);
      expect(parsed.confidence).toBe(0);
    });
  });

  describe('extractTextFromHtml', () => {
    it('should extract text from simple HTML', () => {
      const html = '<html><body><p>Hello World</p></body></html>';
      const text = service.extractTextFromHtml(html);

      expect(text).toBe('Hello World');
    });

    it('should remove script tags', () => {
      const html = '<html><body><script>alert("XSS")</script><p>Content</p></body></html>';
      const text = service.extractTextFromHtml(html);

      expect(text).not.toContain('alert');
      expect(text).toContain('Content');
    });

    it('should remove style tags', () => {
      const html = '<html><body><style>body{color:red}</style><p>Content</p></body></html>';
      const text = service.extractTextFromHtml(html);

      expect(text).not.toContain('color:red');
      expect(text).toContain('Content');
    });

    it('should handle nested elements', () => {
      const html = '<div><p>Outer <span>Inner</span> Text</p></div>';
      const text = service.extractTextFromHtml(html);

      expect(text).toContain('Outer');
      expect(text).toContain('Inner');
      expect(text).toContain('Text');
    });

    it('should normalize whitespace', () => {
      const html = '<p>Multiple    spaces   and\n\nnewlines</p>';
      const text = service.extractTextFromHtml(html);

      expect(text).toBe('Multiple spaces and newlines');
    });
  });

  describe('extractFeatureReferences', () => {
    it('should extract Feature # pattern', () => {
      const text = 'Working on Feature #123 and Feature #456';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(2);
      expect(refs[0].featureId).toBe('123');
      expect(refs[1].featureId).toBe('456');
    });

    it('should extract FEAT- pattern', () => {
      const text = 'Completed FEAT-789';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(1);
      expect(refs[0].featureId).toBe('789');
      expect(refs[0].matchType).toBe('id');
    });

    it('should extract FT- pattern', () => {
      const text = 'Working on FT-101';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(1);
      expect(refs[0].featureId).toBe('101');
    });

    it('should extract quoted feature names', () => {
      const text = 'Implementing "User Authentication System"';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(1);
      expect(refs[0].featureName).toBe('User Authentication System');
      expect(refs[0].matchType).toBe('exact');
    });

    it('should ignore short quoted strings', () => {
      const text = 'The "OK" button is ready';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(0);
    });

    it('should handle case insensitive patterns', () => {
      const text = 'feature #123 and FEATURE #456';
      const refs = service.extractFeatureReferences(text);

      expect(refs.length).toBe(2);
    });
  });

  describe('extractProgressIndicators', () => {
    it('should extract completion status', () => {
      const indicators = service.extractProgressIndicators('The feature is completed');

      const statusInd = indicators.find((i) => i.type === 'status' && i.value === 'complete');
      expect(statusInd).toBeDefined();
    });

    it('should extract in-progress status', () => {
      const indicators = service.extractProgressIndicators('Work is in progress');

      const statusInd = indicators.find((i) => i.type === 'status' && i.value === 'in-progress');
      expect(statusInd).toBeDefined();
    });

    it('should extract blocked status', () => {
      const indicators = service.extractProgressIndicators('Currently blocked by dependencies');

      const statusInd = indicators.find((i) => i.type === 'status' && i.value === 'blocked');
      expect(statusInd).toBeDefined();
    });

    it('should extract delayed status', () => {
      const indicators = service.extractProgressIndicators('Project is delayed');

      const statusInd = indicators.find((i) => i.type === 'status' && i.value === 'delayed');
      expect(statusInd).toBeDefined();
    });

    it('should extract on-hold status', () => {
      const indicators = service.extractProgressIndicators('Work is on hold');

      const statusInd = indicators.find((i) => i.type === 'status' && i.value === 'on-hold');
      expect(statusInd).toBeDefined();
    });

    it('should extract percentage with "complete"', () => {
      const indicators = service.extractProgressIndicators('80% complete');

      const percentInd = indicators.find((i) => i.type === 'percentage' && i.value === '80');
      expect(percentInd).toBeDefined();
    });

    it('should extract percentage with "done"', () => {
      const indicators = service.extractProgressIndicators('50% done');

      const percentInd = indicators.find((i) => i.type === 'percentage' && i.value === '50');
      expect(percentInd).toBeDefined();
    });

    it('should extract blockers', () => {
      const indicators = service.extractProgressIndicators(
        'Blocker: Waiting for API approval'
      );

      const blockerInd = indicators.find((i) => i.type === 'blocker');
      expect(blockerInd).toBeDefined();
      expect(blockerInd?.value).toContain('API approval');
    });

    it('should extract multiple indicators', () => {
      const text = 'Feature is 60% complete but blocked by infrastructure issues';
      const indicators = service.extractProgressIndicators(text);

      expect(indicators.length).toBeGreaterThanOrEqual(2);
      expect(indicators.some((i) => i.type === 'percentage')).toBe(true);
      expect(indicators.some((i) => i.type === 'status')).toBe(true);
    });
  });

  describe('extractInfo', () => {
    it('should extract status from indicators', () => {
      const indicators = [{ type: 'status' as const, value: 'complete', confidence: 0.8 }];
      const info = service.extractInfo('test text', indicators);

      expect(info.status).toBe('complete');
    });

    it('should extract percentage from indicators', () => {
      const indicators = [{ type: 'percentage' as const, value: '75', confidence: 0.9 }];
      const info = service.extractInfo('test text', indicators);

      expect(info.percentComplete).toBe(75);
    });

    it('should extract blockers from indicators', () => {
      const indicators = [
        { type: 'blocker' as const, value: 'API not ready', confidence: 0.7 },
      ];
      const info = service.extractInfo('test text', indicators);

      expect(info.blockers).toContain('API not ready');
    });

    it('should extract action items', () => {
      const text = 'Action item: Complete code review by Friday';
      const info = service.extractInfo(text, []);

      expect(info.actionItems.length).toBeGreaterThan(0);
      expect(info.actionItems[0]).toContain('Complete code review');
    });

    it('should extract next steps', () => {
      const text = 'Next step: Deploy to staging environment';
      const info = service.extractInfo(text, []);

      expect(info.nextSteps.length).toBeGreaterThan(0);
      expect(info.nextSteps[0]).toContain('Deploy to staging');
    });

    it('should extract dates in MM/DD/YYYY format', () => {
      const text = 'Expected completion: 12/31/2024';
      const info = service.extractInfo(text, []);

      expect(info.dates).toContain('12/31/2024');
    });

    it('should extract dates in YYYY-MM-DD format', () => {
      const text = 'Launch date: 2024-12-31';
      const info = service.extractInfo(text, []);

      expect(info.dates).toContain('2024-12-31');
    });

    it('should create summary from text', () => {
      const longText = 'a'.repeat(300);
      const info = service.extractInfo(longText, []);

      expect(info.summary.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(info.summary).toContain('...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short update';
      const info = service.extractInfo(shortText, []);

      expect(info.summary).toBe(shortText);
      expect(info.summary).not.toContain('...');
    });
  });

  // Property-based tests
  describe('Property-Based Tests', () => {
    it('Property 1: Email Processing Completeness - All emails produce valid parsed output', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1 }),
            from: fc.emailAddress(),
            subject: fc.string(),
            body: fc.string(),
          }),
          async (rawEmail) => {
            const parsed = await service.parseEmail(rawEmail);
            return (
              parsed.id === rawEmail.id &&
              parsed.from.length > 0 &&
              parsed.confidence >= 0 &&
              parsed.confidence <= 1
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2: Feature Identification Accuracy - Feature IDs are always numeric', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const refs = service.extractFeatureReferences(text);
          return refs
            .filter((ref) => ref.featureId)
            .every((ref) => /^\d+$/.test(ref.featureId!));
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Confidence score is always between 0 and 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.string({ minLength: 1 }),
            from: fc.emailAddress(),
            subject: fc.string(),
            body: fc.string(),
          }),
          async (rawEmail) => {
            const parsed = await service.parseEmail(rawEmail);
            return parsed.confidence >= 0 && parsed.confidence <= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Extracted text never contains script tags', () => {
      fc.assert(
        fc.property(fc.string(), (html) => {
          const text = service.extractTextFromHtml(html);
          return !text.toLowerCase().includes('<script');
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Summary is never longer than 203 characters', () => {
      fc.assert(
        fc.property(fc.string(), (text) => {
          const info = service.extractInfo(text, []);
          return info.summary.length <= 203;
        }),
        { numRuns: 100 }
      );
    });
  });
});
