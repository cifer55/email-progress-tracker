import Fuse from 'fuse.js';
import logger from '../config/logger';
import { FeatureReference } from './EmailParserService';

export interface Feature {
  id: string;
  name: string;
}

export interface FeatureMatch {
  featureId: string;
  featureName: string;
  confidence: number;
  matchReason: string;
}

export class FeatureMatcherService {
  async findMatches(
    featureReferences: FeatureReference[],
    existingFeatures: Feature[]
  ): Promise<FeatureMatch[]> {
    const matches: FeatureMatch[] = [];

    for (const ref of featureReferences) {
      // Try exact ID match first
      if (ref.featureId) {
        const exactMatch = existingFeatures.find((f) => f.id === ref.featureId);
        if (exactMatch) {
          matches.push({
            featureId: exactMatch.id,
            featureName: exactMatch.name,
            confidence: 0.95,
            matchReason: 'Exact ID match',
          });
          continue;
        }
      }

      // Try fuzzy name matching
      const fuzzyMatches = this.fuzzyMatch(
        ref.featureName,
        existingFeatures.map((f) => f.name)
      );

      if (fuzzyMatches.length > 0 && fuzzyMatches[0].score > 0.7) {
        const matchedFeature = existingFeatures.find(
          (f) => f.name === fuzzyMatches[0].match
        );
        if (matchedFeature) {
          matches.push({
            featureId: matchedFeature.id,
            featureName: matchedFeature.name,
            confidence: fuzzyMatches[0].score,
            matchReason: `Fuzzy match (score: ${fuzzyMatches[0].score.toFixed(2)})`,
          });
        }
      }
    }

    logger.info(`Found ${matches.length} feature matches`);
    return matches;
  }

  fuzzyMatch(
    searchTerm: string,
    candidates: string[]
  ): { match: string; score: number }[] {
    const fuse = new Fuse(candidates, {
      includeScore: true,
      threshold: 0.4,
      keys: ['name'],
    });

    const results = fuse.search(searchTerm);

    return results.map((result) => ({
      match: result.item,
      score: 1 - (result.score || 0), // Convert distance to similarity
    }));
  }
}
