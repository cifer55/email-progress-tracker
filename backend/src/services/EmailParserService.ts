import * as cheerio from 'cheerio';
import logger from '../config/logger';
import { sanitizeHtml, sanitizeInput, truncateString } from '../utils/sanitization';

export interface FeatureReference {
  featureName: string;
  featureId?: string;
  confidence: number;
  matchType: 'exact' | 'partial' | 'id';
}

export interface ProgressIndicator {
  type: 'status' | 'percentage' | 'blocker' | 'date';
  value: string;
  confidence: number;
}

export interface ExtractedInfo {
  status?: string;
  percentComplete?: number;
  blockers: string[];
  actionItems: string[];
  nextSteps: string[];
  dates: string[];
  summary: string;
}

export interface ParsedEmail {
  id: string;
  from: string;
  subject: string;
  body: string;
  featureReferences: FeatureReference[];
  progressIndicators: ProgressIndicator[];
  extractedInfo: ExtractedInfo;
  confidence: number;
}

export class EmailParserService {
  async parseEmail(rawEmail: {
    id: string;
    from: string;
    subject: string;
    body: string;
    htmlBody?: string;
  }): Promise<ParsedEmail> {
    logger.info(`Parsing email: ${rawEmail.id}`);

    // Extract plain text from HTML if needed
    let text = rawEmail.htmlBody
      ? this.extractTextFromHtml(rawEmail.htmlBody)
      : rawEmail.body;
    
    // Sanitize the text content
    text = sanitizeInput(text);
    const sanitizedSubject = sanitizeInput(rawEmail.subject);

    // Combine subject and body for analysis
    const fullText = `${sanitizedSubject}\n\n${text}`;

    // Extract feature references
    const featureReferences = this.extractFeatureReferences(fullText);

    // Extract progress indicators
    const progressIndicators = this.extractProgressIndicators(fullText);

    // Extract structured information
    const extractedInfo = this.extractInfo(fullText, progressIndicators);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(featureReferences, progressIndicators);

    return {
      id: rawEmail.id,
      from: sanitizeInput(rawEmail.from),
      subject: sanitizedSubject,
      body: text,
      featureReferences,
      progressIndicators,
      extractedInfo,
      confidence,
    };
  }

  extractTextFromHtml(html: string): string {
    // Sanitize HTML first to remove dangerous content
    const sanitizedHtml = sanitizeHtml(html);
    const $ = cheerio.load(sanitizedHtml);
    // Remove script and style elements
    $('script, style').remove();
    // Get text content
    return $('body').text().trim().replace(/\s+/g, ' ');
  }

  extractFeatureReferences(text: string): FeatureReference[] {
    const references: FeatureReference[] = [];

    // Pattern 1: Feature ID references like "Feature #123" or "[FEAT-123]"
    const idPattern = /(?:Feature\s*#|FEAT-|FT-)(\d+)/gi;
    let match;
    while ((match = idPattern.exec(text)) !== null) {
      references.push({
        featureName: sanitizeInput(match[0]),
        featureId: sanitizeInput(match[1]),
        confidence: 0.9,
        matchType: 'id',
      });
    }

    // Pattern 2: Quoted feature names
    const quotedPattern = /"([^"]{3,50})"/g;
    while ((match = quotedPattern.exec(text)) !== null) {
      if (this.looksLikeFeatureName(match[1])) {
        references.push({
          featureName: truncateString(sanitizeInput(match[1]), 100),
          confidence: 0.7,
          matchType: 'exact',
        });
      }
    }

    return references;
  }

  extractProgressIndicators(text: string): ProgressIndicator[] {
    const indicators: ProgressIndicator[] = [];

    // Status keywords
    const statusPatterns = [
      { pattern: /\b(completed?|done|finished)\b/gi, value: 'complete' },
      { pattern: /\b(in progress|ongoing|working on)\b/gi, value: 'in-progress' },
      { pattern: /\b(blocked?|stuck|waiting)\b/gi, value: 'blocked' },
      { pattern: /\b(delayed?|behind schedule)\b/gi, value: 'delayed' },
      { pattern: /\b(on hold|paused)\b/gi, value: 'on-hold' },
    ];

    for (const { pattern, value } of statusPatterns) {
      if (pattern.test(text)) {
        indicators.push({
          type: 'status',
          value,
          confidence: 0.8,
        });
      }
    }

    // Percentage completion
    const percentPattern = /(\d+)%\s*(?:complete|done|finished)/gi;
    let match;
    while ((match = percentPattern.exec(text)) !== null) {
      indicators.push({
        type: 'percentage',
        value: match[1],
        confidence: 0.9,
      });
    }

    // Blockers
    const blockerPattern = /(?:blocker|blocked by|issue):\s*([^\n.]+)/gi;
    while ((match = blockerPattern.exec(text)) !== null) {
      indicators.push({
        type: 'blocker',
        value: truncateString(sanitizeInput(match[1].trim()), 200),
        confidence: 0.7,
      });
    }

    return indicators;
  }

  extractInfo(text: string, indicators: ProgressIndicator[]): ExtractedInfo {
    // Extract status from indicators
    const statusIndicator = indicators.find((i) => i.type === 'status');
    const status = statusIndicator?.value;

    // Extract percentage
    const percentIndicator = indicators.find((i) => i.type === 'percentage');
    const percentComplete = percentIndicator
      ? parseInt(percentIndicator.value)
      : undefined;

    // Extract blockers
    const blockers = indicators
      .filter((i) => i.type === 'blocker')
      .map((i) => i.value);

    // Extract action items (simple pattern)
    const actionItems: string[] = [];
    const actionPattern = /(?:action item|todo|task):\s*([^\n.]+)/gi;
    let match;
    while ((match = actionPattern.exec(text)) !== null) {
      actionItems.push(truncateString(sanitizeInput(match[1].trim()), 200));
    }

    // Extract next steps
    const nextSteps: string[] = [];
    const nextStepPattern = /(?:next step|next):\s*([^\n.]+)/gi;
    while ((match = nextStepPattern.exec(text)) !== null) {
      nextSteps.push(truncateString(sanitizeInput(match[1].trim()), 200));
    }

    // Extract dates (simple pattern)
    const dates: string[] = [];
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
    while ((match = datePattern.exec(text)) !== null) {
      dates.push(match[1]);
    }

    // Create summary (first 200 chars)
    const summary = text.substring(0, 200).trim() + (text.length > 200 ? '...' : '');

    return {
      status,
      percentComplete,
      blockers,
      actionItems,
      nextSteps,
      dates,
      summary,
    };
  }

  private looksLikeFeatureName(text: string): boolean {
    // Simple heuristic: contains common feature-related words
    const featureWords = /\b(feature|component|module|service|api|ui|system)\b/i;
    return featureWords.test(text);
  }

  private calculateConfidence(
    references: FeatureReference[],
    indicators: ProgressIndicator[]
  ): number {
    if (references.length === 0) return 0;

    const avgRefConfidence =
      references.reduce((sum, ref) => sum + ref.confidence, 0) / references.length;
    const hasProgressInfo = indicators.length > 0 ? 0.2 : 0;

    return Math.min(avgRefConfidence + hasProgressInfo, 1.0);
  }
}
