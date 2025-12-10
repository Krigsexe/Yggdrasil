/**
 * VOLVA Bridge
 *
 * Connects to the VOLVA research/hypotheses branch.
 * The seeress who explores the unknown.
 *
 * VOLVA handles hypotheses and research (50-99% confidence).
 * Epistemic Branch: RESEARCH
 */

import { Injectable } from '@nestjs/common';
import { EpistemicBranch, createLogger } from '@yggdrasil/shared';
import { HypothesisService } from '@yggdrasil/volva';

const logger = createLogger('VolvaBridge', 'info');

export interface VolvaResult {
  content: string;
  confidence: number;
  sources: Array<{
    type: string;
    identifier: string;
    url: string;
    title: string;
  }>;
  branch: EpistemicBranch;
  hypotheses: Array<{
    statement: string;
    confidence: number;
    status: string;
  }>;
}

interface HypothesisResult {
  id: string;
  statement: string;
  confidence: number;
  status: string;
}

@Injectable()
export class VolvaBridge {
  private readonly hypothesisService: HypothesisService;

  constructor() {
    this.hypothesisService = new HypothesisService();
  }

  async query(query: string): Promise<VolvaResult> {
    logger.info('Querying VOLVA', { queryLength: query.length });

    // Search for relevant hypotheses
    const keywords = this.extractKeywords(query);
    const hypotheses = this.hypothesisService.search(keywords.join(' '));

    if (hypotheses.length === 0) {
      logger.info('No relevant hypotheses found in VOLVA');
      return {
        content: '',
        confidence: 0,
        sources: [],
        branch: EpistemicBranch.VOLVA,
        hypotheses: [],
      };
    }

    // Calculate average confidence from hypotheses
    const avgConfidence = Math.round(
      hypotheses.reduce((sum: number, h: HypothesisResult) => sum + h.confidence, 0) / hypotheses.length
    );

    // Build response from hypotheses
    const content = this.buildContent(hypotheses);

    return {
      content,
      confidence: avgConfidence, // VOLVA returns 50-99% confidence
      sources: [], // Hypotheses may not have final sources yet
      branch: EpistemicBranch.VOLVA,
      hypotheses: hypotheses.map((h: HypothesisResult) => ({
        statement: h.statement,
        confidence: h.confidence,
        status: h.status,
      })),
    };
  }

  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'how', 'why', 'when', 'where',
      'who', 'which', 'do', 'does', 'can', 'could', 'would', 'should',
      'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
    ]);

    return query
      .toLowerCase()
      .replace(/[?!.,;:'"]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private buildContent(hypotheses: HypothesisResult[]): string {
    const hypothesisList = hypotheses
      .map((h) => `- [${h.status}] ${h.statement} (${h.confidence}% confidence)`)
      .join('\n');

    return `Research hypotheses (not verified facts):\n${hypothesisList}`;
  }
}
