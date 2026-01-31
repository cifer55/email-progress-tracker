import nlp from 'compromise';
import logger from '../config/logger';

export interface Entity {
  type: 'feature' | 'person' | 'date' | 'organization';
  value: string;
  confidence: number;
}

export interface NLPResult {
  entities: Entity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  topics: string[];
  keyPhrases: string[];
}

export class NLPProcessorService {
  async processText(text: string): Promise<NLPResult> {
    logger.info('Processing text with NLP');

    const doc = nlp(text);

    // Extract entities
    const entities = await this.extractEntities(text);

    // Classify sentiment
    const sentiment = await this.classifySentiment(text);

    // Determine urgency
    const urgency = this.determineUrgency(text);

    // Extract topics
    const topics = this.extractTopics(doc);

    // Extract key phrases
    const keyPhrases = await this.extractKeyPhrases(text);

    return {
      entities,
      sentiment,
      urgency,
      topics,
      keyPhrases,
    };
  }

  async extractEntities(text: string): Promise<Entity[]> {
    const doc = nlp(text);
    const entities: Entity[] = [];

    // Extract people
    const people = doc.people().out('array');
    people.forEach((person: string) => {
      entities.push({
        type: 'person',
        value: person,
        confidence: 0.8,
      });
    });

    // Extract dates using match pattern
    const dateMatches = doc.match('#Date+').out('array');
    dateMatches.forEach((date: string) => {
      entities.push({
        type: 'date',
        value: date,
        confidence: 0.9,
      });
    });

    // Extract organizations
    const orgs = doc.organizations().out('array');
    orgs.forEach((org: string) => {
      entities.push({
        type: 'organization',
        value: org,
        confidence: 0.7,
      });
    });

    // Extract potential feature names (nouns followed by nouns)
    const nounPhrases = doc.match('#Noun+').out('array');
    nounPhrases.forEach((phrase: string) => {
      if (phrase.length > 3 && this.looksLikeFeature(phrase)) {
        entities.push({
          type: 'feature',
          value: phrase,
          confidence: 0.6,
        });
      }
    });

    return entities;
  }

  async classifySentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Simple sentiment analysis based on keywords
    const positiveWords = [
      'complete',
      'done',
      'success',
      'good',
      'great',
      'excellent',
      'progress',
      'ahead',
      'finished',
    ];
    const negativeWords = [
      'blocked',
      'issue',
      'problem',
      'delayed',
      'behind',
      'stuck',
      'failed',
      'error',
      'concern',
    ];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeCount += matches.length;
    });

    if (negativeCount > positiveCount * 1.5) {
      return 'negative';
    } else if (positiveCount > negativeCount * 1.5) {
      return 'positive';
    }
    return 'neutral';
  }

  determineUrgency(text: string): 'low' | 'medium' | 'high' {
    const urgentWords = [
      'urgent',
      'asap',
      'immediately',
      'critical',
      'emergency',
      'blocker',
      'blocked',
    ];
    const mediumWords = ['soon', 'important', 'priority', 'issue'];

    const lowerText = text.toLowerCase();

    // Check for urgent words
    for (const word of urgentWords) {
      if (lowerText.includes(word)) {
        return 'high';
      }
    }

    // Check for medium priority words
    for (const word of mediumWords) {
      if (lowerText.includes(word)) {
        return 'medium';
      }
    }

    return 'low';
  }

  extractTopics(doc: any): string[] {
    // Extract topics using compromise
    const topics = doc.topics().out('array');
    return topics.slice(0, 5); // Return top 5 topics
  }

  async extractKeyPhrases(text: string): Promise<string[]> {
    const doc = nlp(text);
    const phrases: string[] = [];

    // Extract noun phrases
    const nounPhrases = doc.match('#Noun+').out('array');
    phrases.push(...nounPhrases.slice(0, 10));

    // Extract verb phrases
    const verbPhrases = doc.match('#Verb+ #Noun+').out('array');
    phrases.push(...verbPhrases.slice(0, 5));

    // Remove duplicates and short phrases
    const uniquePhrases = [...new Set(phrases)].filter((p) => p.length > 3);

    return uniquePhrases.slice(0, 10);
  }

  private looksLikeFeature(text: string): boolean {
    const featureIndicators = [
      'feature',
      'component',
      'module',
      'service',
      'api',
      'system',
      'interface',
      'dashboard',
      'page',
      'form',
    ];

    const lowerText = text.toLowerCase();
    return featureIndicators.some((indicator) => lowerText.includes(indicator));
  }
}
