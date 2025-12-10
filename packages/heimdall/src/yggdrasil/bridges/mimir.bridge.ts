/**
 * MIMIR Bridge
 *
 * Connects to the MIMIR validated knowledge branch.
 * The well of wisdom where Odin sacrificed his eye for knowledge.
 *
 * MIMIR only returns 100% verified information with sources.
 * Epistemic Branch: VERIFIED (100% confidence)
 */

import { Injectable } from '@nestjs/common';
import { EpistemicBranch, SourceType, createLogger } from '@yggdrasil/shared';
import { SourceService } from '@yggdrasil/mimir';

const logger = createLogger('MimirBridge', 'info');

export interface MimirResult {
  content: string;
  confidence: number;
  sources: Array<{
    type: string;
    identifier: string;
    url: string;
    title: string;
  }>;
  branch: EpistemicBranch;
}

@Injectable()
export class MimirBridge {
  private readonly sourceService: SourceService;

  constructor() {
    this.sourceService = new SourceService();
  }

  async query(query: string): Promise<MimirResult> {
    logger.info('Querying MIMIR', { queryLength: query.length });

    // Extract keywords from query for source search
    const keywords = this.extractKeywords(query);

    // Search for relevant sources in MIMIR
    const sourceResults = this.sourceService.search(keywords.join(' '));

    if (sourceResults.length === 0) {
      // MIMIR returns nothing if no verified sources found
      logger.info('No verified sources found in MIMIR');
      return {
        content: '',
        confidence: 0,
        sources: [],
        branch: EpistemicBranch.MIMIR,
      };
    }

    // Build response from verified sources
    interface SourceResult {
      type: string;
      identifier: string;
      url: string;
      title: string;
      authors?: string[];
    }

    const content = this.buildContent(query, sourceResults);
    const sources = sourceResults.map((s: SourceResult) => ({
      type: s.type,
      identifier: s.identifier,
      url: s.url,
      title: s.title,
    }));

    return {
      content,
      confidence: 100, // MIMIR always returns 100% confidence
      sources,
      branch: EpistemicBranch.MIMIR,
    };
  }

  /**
   * Add a verified source to MIMIR
   */
  async addSource(source: {
    type: SourceType;
    identifier: string;
    url: string;
    title: string;
    authors: string[];
  }): Promise<void> {
    this.sourceService.add({
      type: source.type,
      identifier: source.identifier,
      url: source.url,
      title: source.title,
      authors: source.authors,
      trustScore: 100, // MIMIR requires 100% trust
    });

    logger.info('Source added to MIMIR', { identifier: source.identifier });
  }

  private extractKeywords(query: string): string[] {
    // Simple keyword extraction - remove common words
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'how', 'why', 'when', 'where',
      'who', 'which', 'do', 'does', 'can', 'could', 'would', 'should',
      'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by', 'from',
      'about', 'into', 'through', 'during', 'before', 'after',
    ]);

    return query
      .toLowerCase()
      .replace(/[?!.,;:'"]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private buildContent(
    _query: string,
    sources: Array<{ title: string; identifier: string }>
  ): string {
    // In production, this would use an LLM to synthesize the answer
    // from the verified sources. For now, we return a placeholder.
    const sourceList = sources
      .map((s) => `- ${s.title} (${s.identifier})`)
      .join('\n');

    return `Based on verified sources:\n${sourceList}`;
  }
}
