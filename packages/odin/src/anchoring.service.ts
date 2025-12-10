/**
 * Anchoring Service
 *
 * Anchors claims to verified MIMIR sources.
 * Implements the Total Traceability pillar.
 */

import { Injectable } from '@nestjs/common';
import {
  Source,
  EpistemicBranch,
  createLogger,
} from '@yggdrasil/shared';

const logger = createLogger('AnchoringService', 'info');

export interface AnchoringResult {
  claim: string;
  anchored: boolean;
  sources: Source[];
  confidence: number;
}

@Injectable()
export class AnchoringService {
  findSources(content: string): Source[] {
    // Extract claims from content
    const claims = this.extractClaims(content);

    logger.info('Finding sources for claims', { claimCount: claims.length });

    // Find sources for each claim
    const allSources: Source[] = [];

    for (const claim of claims) {
      const sources = this.findSourcesForClaim(claim);
      allSources.push(...sources);
    }

    // Deduplicate sources
    const uniqueSources = this.deduplicateSources(allSources);

    logger.info('Sources found', { sourceCount: uniqueSources.length });

    return uniqueSources;
  }

  anchorClaims(content: string): AnchoringResult[] {
    const claims = this.extractClaims(content);
    const results: AnchoringResult[] = [];

    for (const claim of claims) {
      const sources = this.findSourcesForClaim(claim);
      results.push({
        claim,
        anchored: sources.length > 0,
        sources,
        confidence: sources.length > 0 ? 100 : 0,
      });
    }

    return results;
  }

  verifySource(source: Source): boolean {
    // Verify source is from MIMIR branch
    if (source.branch !== EpistemicBranch.MIMIR) {
      logger.warn('Source not from MIMIR', { sourceId: source.id, branch: source.branch });
      return false;
    }

    // Verify trust score is 100
    if (source.trustScore !== 100) {
      logger.warn('Source trust score not 100', { sourceId: source.id, trustScore: source.trustScore });
      return false;
    }

    // In production, would also:
    // - Check source still exists at URL
    // - Check source hasn't been retracted
    // - Verify DOI/identifier is valid

    return true;
  }

  private extractClaims(content: string): string[] {
    // Split content into sentences
    const sentences = content
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // Filter to likely factual claims
    const factualClaims = sentences.filter((s) => {
      // Contains numbers or dates
      if (/\d/.test(s)) return true;
      // Contains factual indicators
      if (/is|are|was|were|has|have|had/.test(s)) return true;
      return false;
    });

    return factualClaims.slice(0, 10); // Limit to first 10 claims
  }

  private findSourcesForClaim(claim: string): Source[] {
    // Placeholder - would search MIMIR database
    // In production:
    // 1. Search MIMIR for matching sources
    // 2. Use semantic similarity to find relevant sources
    // 3. Verify sources actually support the claim

    logger.debug('Finding sources for claim', { claim: claim.slice(0, 50) });

    return [];
  }

  private deduplicateSources(sources: Source[]): Source[] {
    const seen = new Set<string>();
    return sources.filter((source) => {
      const key = `${source.type}:${source.identifier}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
