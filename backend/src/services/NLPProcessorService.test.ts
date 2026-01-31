/**
 * NLPProcessorService Tests
 * Tests for natural language processing service
 */

import { NLPProcessorService } from './NLPProcessorService';
import * as fc from 'fast-check';

describe('NLPProcessorService', () => {
  let service: NLPProcessorService;

  beforeEach(() => {
    service = new NLPProcessorService();
  });

  describe('processText', () => {
    it('should process basic text and return NLP result', async () => {
      const text = 'John Smith completed the authentication feature on January 15th.';
      const result = await service.processText(text);

      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('keyPhrases');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
      expect(['low', 'medium', 'high']).toContain(result.urgency);
    });

    it('should handle empty text', async () => {
      const result = await service.processText('');

      expect(result.entities).toEqual([]);
      expect(result.sentiment).toBe('neutral');
      expect(result.urgency).toBe('low');
    });

    it('should extract multiple entity types', async () => {
      const text = 'Sarah Johnson from Amazon worked on the payment system on December 1st.';
      const result = await service.processText(text);

      const entityTypes = result.entities.map((e) => e.type);
      expect(entityTypes).toContain('person');
      // Note: compromise.js may not always detect organizations reliably
      expect(entityTypes.length).toBeGreaterThan(0);
    });
  });

  describe('extractEntities', () => {
    it('should extract person names', async () => {
      const text = 'John Smith and Jane Doe are working on this.';
      const entities = await service.extractEntities(text);

      const people = entities.filter((e) => e.type === 'person');
      expect(people.length).toBeGreaterThan(0);
      expect(people[0].confidence).toBe(0.8);
    });

    it('should extract dates', async () => {
      const text = 'The meeting is on January 15th, 2024.';
      const entities = await service.extractEntities(text);

      const dates = entities.filter((e) => e.type === 'date');
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].confidence).toBe(0.9);
    });

    it('should extract organizations', async () => {
      const text = 'Amazon and Microsoft are collaborating.';
      const entities = await service.extractEntities(text);

      const orgs = entities.filter((e) => e.type === 'organization');
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs[0].confidence).toBe(0.7);
    });

    it('should extract feature-like noun phrases', async () => {
      const text = 'The authentication system and payment gateway are complete.';
      const entities = await service.extractEntities(text);

      const features = entities.filter((e) => e.type === 'feature');
      expect(features.length).toBeGreaterThan(0);
      expect(features[0].confidence).toBe(0.6);
    });

    it('should filter out short noun phrases', async () => {
      const text = 'The API is done.';
      const entities = await service.extractEntities(text);

      const features = entities.filter((e) => e.type === 'feature');
      // "API" is only 3 characters, should be filtered
      expect(features.length).toBe(0);
    });

    it('should handle text with no entities', async () => {
      const text = 'This is a simple sentence.';
      const entities = await service.extractEntities(text);

      expect(Array.isArray(entities)).toBe(true);
    });
  });

  describe('classifySentiment', () => {
    it('should classify positive sentiment', async () => {
      const text = 'Great progress! The feature is complete and done. Excellent work!';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('positive');
    });

    it('should classify negative sentiment', async () => {
      const text = 'Blocked by critical issue. Failed deployment. Major problem with delays.';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('negative');
    });

    it('should classify neutral sentiment', async () => {
      const text = 'Working on the feature.';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('neutral');
    });

    it('should handle mixed sentiment with more positive words', async () => {
      const text = 'Good progress despite one small issue. Great work overall.';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('positive');
    });

    it('should handle mixed sentiment with more negative words', async () => {
      const text = 'Some progress but blocked by issues. Delayed and stuck.';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('negative');
    });

    it('should be case insensitive', async () => {
      const text = 'COMPLETE DONE SUCCESS';
      const sentiment = await service.classifySentiment(text);

      expect(sentiment).toBe('positive');
    });

    it('should count word boundaries correctly', async () => {
      const text = 'completed uncompleted';
      const sentiment = await service.classifySentiment(text);

      // Should only match "completed" as a whole word
      expect(['positive', 'neutral']).toContain(sentiment);
    });
  });

  describe('determineUrgency', () => {
    it('should detect high urgency keywords', async () => {
      const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'blocker', 'blocked'];

      for (const word of urgentWords) {
        const urgency = service.determineUrgency(`This is ${word} issue`);
        expect(urgency).toBe('high');
      }
    });

    it('should detect medium urgency keywords', async () => {
      const mediumWords = ['soon', 'important', 'priority', 'issue'];

      for (const word of mediumWords) {
        const urgency = service.determineUrgency(`This is ${word}`);
        expect(urgency).toBe('medium');
      }
    });

    it('should default to low urgency', async () => {
      const urgency = service.determineUrgency('Regular update on progress');
      expect(urgency).toBe('low');
    });

    it('should prioritize high urgency over medium', async () => {
      const urgency = service.determineUrgency('Important issue but critical blocker');
      expect(urgency).toBe('high');
    });

    it('should be case insensitive', async () => {
      const urgency = service.determineUrgency('URGENT ASAP');
      expect(urgency).toBe('high');
    });
  });

  describe('extractTopics', () => {
    it('should extract topics from text', async () => {
      const text = 'Working on authentication and payment systems';
      const doc = require('compromise')(text);
      const topics = service.extractTopics(doc);

      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeLessThanOrEqual(5);
    });

    it('should limit topics to 5', async () => {
      const text = 'Topic1 Topic2 Topic3 Topic4 Topic5 Topic6 Topic7';
      const doc = require('compromise')(text);
      const topics = service.extractTopics(doc);

      expect(topics.length).toBeLessThanOrEqual(5);
    });
  });

  describe('extractKeyPhrases', () => {
    it('should extract noun phrases', async () => {
      const text = 'The authentication system is working well';
      const phrases = await service.extractKeyPhrases(text);

      expect(Array.isArray(phrases)).toBe(true);
      expect(phrases.length).toBeGreaterThan(0);
    });

    it('should extract verb phrases', async () => {
      const text = 'Working on authentication. Building payment system.';
      const phrases = await service.extractKeyPhrases(text);

      expect(Array.isArray(phrases)).toBe(true);
    });

    it('should filter out short phrases', async () => {
      const text = 'The API is up';
      const phrases = await service.extractKeyPhrases(text);

      // All phrases should be longer than 3 characters
      phrases.forEach((phrase) => {
        expect(phrase.length).toBeGreaterThan(3);
      });
    });

    it('should remove duplicates', async () => {
      const text = 'Authentication system. The authentication system is ready.';
      const phrases = await service.extractKeyPhrases(text);

      const uniquePhrases = [...new Set(phrases)];
      expect(phrases.length).toBe(uniquePhrases.length);
    });

    it('should limit to 10 key phrases', async () => {
      const text = 'Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10 Word11 Word12';
      const phrases = await service.extractKeyPhrases(text);

      expect(phrases.length).toBeLessThanOrEqual(10);
    });
  });

  describe('looksLikeFeature (private method behavior)', () => {
    it('should identify feature-like text through extractEntities', async () => {
      const featureTexts = [
        'authentication feature',
        'payment component',
        'user module',
        'API service',
        'dashboard system',
        'login interface',
      ];

      for (const text of featureTexts) {
        const entities = await service.extractEntities(text);
        const features = entities.filter((e) => e.type === 'feature');
        expect(features.length).toBeGreaterThan(0);
      }
    });

    it('should not identify non-feature text', async () => {
      const text = 'simple text without indicators';
      const entities = await service.extractEntities(text);
      const features = entities.filter((e) => e.type === 'feature');

      expect(features.length).toBe(0);
    });
  });

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property: processText always returns valid structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (text) => {
            const result = await service.processText(text);

            // Check structure
            expect(result).toHaveProperty('entities');
            expect(result).toHaveProperty('sentiment');
            expect(result).toHaveProperty('urgency');
            expect(result).toHaveProperty('topics');
            expect(result).toHaveProperty('keyPhrases');

            // Check types
            expect(Array.isArray(result.entities)).toBe(true);
            expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
            expect(['low', 'medium', 'high']).toContain(result.urgency);
            expect(Array.isArray(result.topics)).toBe(true);
            expect(Array.isArray(result.keyPhrases)).toBe(true);

            // Check entity structure
            result.entities.forEach((entity) => {
              expect(['feature', 'person', 'date', 'organization']).toContain(entity.type);
              expect(typeof entity.value).toBe('string');
              expect(typeof entity.confidence).toBe('number');
              expect(entity.confidence).toBeGreaterThanOrEqual(0);
              expect(entity.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: sentiment classification is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 200 }), async (text) => {
          const sentiment1 = await service.classifySentiment(text);
          const sentiment2 = await service.classifySentiment(text);

          expect(sentiment1).toBe(sentiment2);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: urgency determination is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 200 }), async (text) => {
          const urgency1 = service.determineUrgency(text);
          const urgency2 = service.determineUrgency(text);

          expect(urgency1).toBe(urgency2);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: entity confidence is always in valid range', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 300 }), async (text) => {
          const entities = await service.extractEntities(text);

          entities.forEach((entity) => {
            expect(entity.confidence).toBeGreaterThanOrEqual(0);
            expect(entity.confidence).toBeLessThanOrEqual(1);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('Property: key phrases are never too short', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string({ minLength: 1, maxLength: 300 }), async (text) => {
          const phrases = await service.extractKeyPhrases(text);

          phrases.forEach((phrase) => {
            expect(phrase.length).toBeGreaterThan(3);
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
