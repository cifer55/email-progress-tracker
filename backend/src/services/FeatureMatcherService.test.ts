/**
 * FeatureMatcherService Tests
 * Tests for feature matching and fuzzy search
 */

import { FeatureMatcherService, Feature } from './FeatureMatcherService';
import { FeatureReference } from './EmailParserService';
import * as fc from 'fast-check';

describe('FeatureMatcherService', () => {
  let service: FeatureMatcherService;
  let mockFeatures: Feature[];

  beforeEach(() => {
    service = new FeatureMatcherService();
    mockFeatures = [
      { id: 'FEAT-001', name: 'User Authentication System' },
      { id: 'FEAT-002', name: 'Payment Gateway Integration' },
      { id: 'FEAT-003', name: 'Dashboard Analytics' },
      { id: 'FEAT-004', name: 'Email Notification Service' },
      { id: 'FEAT-005', name: 'API Rate Limiting' },
    ];
  });

  describe('findMatches', () => {
    it('should find exact ID match', async () => {
      const references: FeatureReference[] = [
        {
          featureId: 'FEAT-001',
          featureName: 'User Authentication',
          confidence: 0.9,
          matchType: 'id',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-001');
      expect(matches[0].featureName).toBe('User Authentication System');
      expect(matches[0].confidence).toBe(0.95);
      expect(matches[0].matchReason).toBe('Exact ID match');
    });

    it('should find fuzzy name match when ID not provided', async () => {
      const references: FeatureReference[] = [
        {
          featureId: '',
          featureName: 'User Authentication',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-001');
      expect(matches[0].confidence).toBeGreaterThan(0.7);
      expect(matches[0].matchReason).toContain('Fuzzy match');
    });

    it('should find fuzzy match with slight misspelling', async () => {
      const references: FeatureReference[] = [
        {
          featureId: '',
          featureName: 'Paymen Gateway',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-002');
    });

    it('should not match when confidence is too low', async () => {
      const references: FeatureReference[] = [
        {
          featureId: '',
          featureName: 'Completely Different Feature',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(0);
    });

    it('should handle multiple references', async () => {
      const references: FeatureReference[] = [
        {
          featureId: 'FEAT-001',
          featureName: 'User Authentication',
          confidence: 0.9,
          matchType: 'id',
        },
        {
          featureId: '',
          featureName: 'Dashboard',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(2);
      expect(matches[0].featureId).toBe('FEAT-001');
      expect(matches[1].featureId).toBe('FEAT-003');
    });

    it('should handle empty references', async () => {
      const matches = await service.findMatches([], mockFeatures);

      expect(matches).toHaveLength(0);
    });

    it('should handle empty features list', async () => {
      const references: FeatureReference[] = [
        {
          featureId: 'FEAT-001',
          featureName: 'User Authentication',
          confidence: 0.9,
          matchType: 'id',
        },
      ];

      const matches = await service.findMatches(references, []);

      expect(matches).toHaveLength(0);
    });

    it('should prioritize exact ID match over fuzzy name match', async () => {
      const references: FeatureReference[] = [
        {
          featureId: 'FEAT-002',
          featureName: 'User Authentication', // Wrong name but correct ID
          confidence: 0.9,
          matchType: 'id',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-002');
      expect(matches[0].matchReason).toBe('Exact ID match');
    });

    it('should handle case-insensitive matching', async () => {
      const references: FeatureReference[] = [
        {
          featureId: '',
          featureName: 'user authentication system',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-001');
    });

    it('should handle partial name matches', async () => {
      const references: FeatureReference[] = [
        {
          featureId: '',
          featureName: 'Email Notification',
          confidence: 0.8,
          matchType: 'partial',
        },
      ];

      const matches = await service.findMatches(references, mockFeatures);

      expect(matches).toHaveLength(1);
      expect(matches[0].featureId).toBe('FEAT-004');
    });
  });

  describe('fuzzyMatch', () => {
    it('should find exact match with high score', () => {
      const candidates = ['User Authentication System', 'Payment Gateway', 'Dashboard'];
      const results = service.fuzzyMatch('User Authentication System', candidates);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].match).toBe('User Authentication System');
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it('should find close match with good score', () => {
      const candidates = ['User Authentication System', 'Payment Gateway', 'Dashboard'];
      const results = service.fuzzyMatch('User Authentication', candidates);

      expect(results[0].match).toBe('User Authentication System');
      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it('should return results sorted by score', () => {
      const candidates = ['User Authentication System', 'User Profile', 'Dashboard'];
      const results = service.fuzzyMatch('User', candidates);

      // Results should be sorted by score (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should handle empty search term', () => {
      const candidates = ['Feature 1', 'Feature 2'];
      const results = service.fuzzyMatch('', candidates);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty candidates', () => {
      const results = service.fuzzyMatch('Search Term', []);

      expect(results).toHaveLength(0);
    });

    it('should handle special characters', () => {
      const candidates = ['API-Gateway', 'User@Auth', 'Payment$System'];
      const results = service.fuzzyMatch('API Gateway', candidates);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const candidates = ['User Authentication System'];
      const results1 = service.fuzzyMatch('user authentication', candidates);
      const results2 = service.fuzzyMatch('USER AUTHENTICATION', candidates);

      expect(results1[0].score).toBeCloseTo(results2[0].score, 1);
    });

    it('should handle typos', () => {
      const candidates = ['Authentication'];
      const results = service.fuzzyMatch('Authentcation', candidates);

      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it('should convert Fuse.js distance to similarity score', () => {
      const candidates = ['Exact Match'];
      const results = service.fuzzyMatch('Exact Match', candidates);

      // Score should be close to 1 for exact match
      expect(results[0].score).toBeGreaterThan(0.9);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property: findMatches always returns valid FeatureMatch structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              featureId: fc.string(),
              featureName: fc.string({ minLength: 1, maxLength: 50 }),
              confidence: fc.double({ min: 0, max: 1 }),
              matchType: fc.constantFrom('exact' as const, 'partial' as const, 'id' as const),
            }),
            { maxLength: 10 }
          ),
          async (references) => {
            const matches = await service.findMatches(references, mockFeatures);

            matches.forEach((match) => {
              expect(typeof match.featureId).toBe('string');
              expect(typeof match.featureName).toBe('string');
              expect(typeof match.confidence).toBe('number');
              expect(typeof match.matchReason).toBe('string');
              expect(match.confidence).toBeGreaterThanOrEqual(0);
              expect(match.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: exact ID matches always have 0.95 confidence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...mockFeatures.map((f) => f.id)),
          async (featureId) => {
            const references: FeatureReference[] = [
              {
                featureId,
                featureName: 'Any Name',
                confidence: 0.8,
                matchType: 'id',
              },
            ];

            const matches = await service.findMatches(references, mockFeatures);

            if (matches.length > 0) {
              expect(matches[0].confidence).toBe(0.95);
              expect(matches[0].matchReason).toBe('Exact ID match');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: fuzzy match scores are always between 0 and 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (searchTerm) => {
            const candidates = mockFeatures.map((f) => f.name);
            const results = service.fuzzyMatch(searchTerm, candidates);

            results.forEach((result) => {
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(result.score).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: fuzzy match results are sorted by score', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (searchTerm) => {
            const candidates = mockFeatures.map((f) => f.name);
            const results = service.fuzzyMatch(searchTerm, candidates);

            for (let i = 0; i < results.length - 1; i++) {
              expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: number of matches never exceeds number of references', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              featureId: fc.string(),
              featureName: fc.string({ minLength: 1, maxLength: 50 }),
              confidence: fc.double({ min: 0, max: 1 }),
              matchType: fc.constantFrom('exact' as const, 'partial' as const, 'id' as const),
            }),
            { maxLength: 20 }
          ),
          async (references) => {
            const matches = await service.findMatches(references, mockFeatures);

            expect(matches.length).toBeLessThanOrEqual(references.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
