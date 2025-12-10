/**
 * Query Service
 *
 * Queries MIMIR for verified information.
 */

import { Injectable } from '@nestjs/common';
import { Source, createLogger } from '@yggdrasil/shared';
import { SourceService } from './source.service.js';
import { ArxivAdapter } from './sources/arxiv.adapter.js';
import { PubmedAdapter } from './sources/pubmed.adapter.js';

const logger = createLogger('MimirQueryService', 'info');

export interface MimirQueryResult {
  query: string;
  sources: Source[];
  confidence: 100 | 0;
  answer?: string;
  trace: {
    sourcesSearched: number;
    sourcesMatched: number;
    processingTimeMs: number;
  };
}

@Injectable()
export class QueryService {
  constructor(
    private readonly sourceService: SourceService,
    private readonly arxiv: ArxivAdapter,
    private readonly pubmed: PubmedAdapter
  ) {}

  async query(query: string): Promise<MimirQueryResult> {
    const startTime = Date.now();

    // Search local sources first
    const sources = this.sourceService.search(query);

    // If no local sources, try external adapters
    if (sources.length === 0) {
      const [arxivResults, pubmedResults] = await Promise.all([
        this.arxiv.search(query),
        this.pubmed.search(query),
      ]);

      // Add fetched sources to MIMIR
      for (const source of [...arxivResults, ...pubmedResults]) {
        try {
          const added = this.sourceService.add(source);
          sources.push(added);
        } catch {
          // Skip sources that fail validation
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // MIMIR returns 100% confidence only if sources found
    const confidence = sources.length > 0 ? 100 : 0;

    const result: MimirQueryResult = {
      query,
      sources,
      confidence,
      trace: {
        sourcesSearched: sources.length,
        sourcesMatched: sources.length,
        processingTimeMs,
      },
    };

    if (sources.length > 0) {
      result.answer = this.synthesizeAnswer(query, sources);
    }

    logger.info('MIMIR query completed', {
      query: query.slice(0, 100),
      sourcesFound: sources.length,
      confidence,
      processingTimeMs,
    });

    return result;
  }

  verifyStatement(statement: string): {
    verified: boolean;
    confidence: 100 | 0;
    supportingSources: Source[];
    contradictingSources: Source[];
  } {
    const sources = this.sourceService.search(statement);

    // In a real implementation, this would:
    // 1. Parse the statement into claims
    // 2. Check each claim against sources
    // 3. Return detailed verification results

    return {
      verified: sources.length > 0,
      confidence: sources.length > 0 ? 100 : 0,
      supportingSources: sources,
      contradictingSources: [],
    };
  }

  private synthesizeAnswer(query: string, sources: Source[]): string {
    // In a real implementation, this would use the LLM to synthesize
    // an answer based on the verified sources

    const sourceList = sources
      .slice(0, 5)
      .map((s) => `- ${s.title} (${s.type})`)
      .join('\n');

    return `Based on ${sources.length} verified source(s):\n${sourceList}`;
  }
}
