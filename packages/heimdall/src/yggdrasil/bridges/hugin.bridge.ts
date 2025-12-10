/**
 * HUGIN Bridge
 *
 * Connects to the HUGIN internet/real-time branch.
 * The raven "Thought" who explores the world for Odin.
 *
 * HUGIN handles unverified web content (0-49% confidence).
 * Epistemic Branch: INTERNET (unverified)
 */

import { Injectable } from '@nestjs/common';
import { EpistemicBranch, createLogger } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { WebService, FilterService, WebContent } from '@yggdrasil/hugin';

const logger = createLogger('HuginBridge', 'info');

export interface HuginResult {
  content: string;
  confidence: number;
  sources: Array<{
    type: string;
    identifier: string;
    url: string;
    title: string;
  }>;
  branch: EpistemicBranch;
  warnings: string[];
}

@Injectable()
export class HuginBridge {
  private readonly webService: WebService;
  private readonly filterService: FilterService;
  private readonly db: DatabaseService;

  constructor() {
    this.filterService = new FilterService();
    this.db = new DatabaseService();
    this.webService = new WebService(this.db, this.filterService);
  }

  async query(query: string): Promise<HuginResult> {
    logger.info('Querying HUGIN', { queryLength: query.length });

    // Search web content
    const searchResults = await this.webService.search(query);

    if (searchResults.length === 0) {
      logger.info('No web content found in HUGIN');
      return {
        content: '',
        confidence: 0,
        sources: [],
        branch: EpistemicBranch.HUGIN,
        warnings: ['No web content found'],
      };
    }

    // Filter out very low trust content
    const validResults = searchResults.filter(
      (r: WebContent) => r.trustScore > 10
    );

    if (validResults.length === 0) {
      return {
        content: '',
        confidence: 0,
        sources: [],
        branch: EpistemicBranch.HUGIN,
        warnings: ['All sources too low trust'],
      };
    }

    // Calculate average confidence (max 49% for HUGIN)
    const avgTrustScore = Math.round(
      validResults.reduce((sum: number, r: WebContent) => sum + r.trustScore, 0) / validResults.length
    );
    const confidence = Math.min(avgTrustScore, 49); // HUGIN max is 49%

    // Build response with warnings
    const warnings = this.collectWarnings(searchResults);
    const content = this.buildContent(validResults);

    return {
      content,
      confidence,
      sources: validResults.map((r: WebContent) => ({
        type: 'web',
        identifier: r.url,
        url: r.url,
        title: r.title ?? r.url,
      })),
      branch: EpistemicBranch.HUGIN,
      warnings,
    };
  }

  private collectWarnings(results: WebContent[]): string[] {
    const warnings: string[] = [];

    // Add warning about epistemic status
    warnings.push('UNVERIFIED: This information comes from web sources and has not been scientifically validated.');

    // Count low trust sources
    const lowTrustCount = results.filter((r) => r.trustScore < 20).length;
    if (lowTrustCount > 0) {
      warnings.push(`${lowTrustCount} source(s) have low credibility`);
    }

    // Collect warnings from results
    const allWarnings = results
      .flatMap((r) => r.warnings ?? [])
      .filter((w, i, arr) => arr.indexOf(w) === i);

    if (allWarnings.length > 0) {
      warnings.push(...allWarnings);
    }

    return warnings;
  }

  private buildContent(results: WebContent[]): string {
    const sourceList = results
      .map((r) => `- ${r.title ?? 'Untitled'}: ${r.url}`)
      .join('\n');

    return `Web sources (unverified):\n${sourceList}\n\nNote: This information has not been verified against scientific sources.`;
  }
}
