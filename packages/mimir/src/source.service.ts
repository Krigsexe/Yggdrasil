/**
 * Source Service
 *
 * Manages verified sources in MIMIR.
 */

import { Injectable } from '@nestjs/common';
import {
  Source,
  SourceType,
  EpistemicBranch,
  createLogger,
  generateId,
  NotFoundError,
  isMimirEligible,
} from '@yggdrasil/shared';

const logger = createLogger('SourceService', 'info');

// In-memory store for development
const sources = new Map<string, Source>();

@Injectable()
export class SourceService {
  add(source: Omit<Source, 'id' | 'fetchedAt' | 'branch'>): Source {
    // Validate source type is eligible for MIMIR
    if (!isMimirEligible(source.type)) {
      throw new Error(`Source type ${source.type} is not eligible for MIMIR`);
    }

    // Validate trust score is 100 for MIMIR
    if (source.trustScore !== 100) {
      throw new Error('MIMIR sources must have trust score of 100');
    }

    const id = generateId();
    const newSource: Source = {
      ...source,
      id,
      branch: EpistemicBranch.MIMIR,
      fetchedAt: new Date(),
    };

    sources.set(id, newSource);

    logger.info('Source added to MIMIR', {
      id,
      type: source.type,
      identifier: source.identifier,
    });

    return newSource;
  }

  getById(id: string): Source {
    const source = sources.get(id);
    if (!source) {
      throw new NotFoundError('Source', id);
    }
    return source;
  }

  getByIdentifier(type: SourceType, identifier: string): Source | null {
    return Array.from(sources.values()).find(
      (s) => s.type === type && s.identifier === identifier
    ) ?? null;
  }

  search(query: string, options?: {
    types?: SourceType[];
    limit?: number;
  }): Source[] {
    const normalizedQuery = query.toLowerCase();
    let results = Array.from(sources.values());

    // Filter by type
    if (options?.types && options.types.length > 0) {
      results = results.filter((s) => options.types?.includes(s.type));
    }

    // Search in title and keywords
    results = results.filter((s) => {
      const searchText = [
        s.title,
        ...(s.metadata?.keywords ?? []),
        s.metadata?.abstract ?? '',
      ].join(' ').toLowerCase();

      return searchText.includes(normalizedQuery);
    });

    // Sort by publication date descending
    results.sort((a, b) => {
      const dateA = a.publishedAt?.getTime() ?? 0;
      const dateB = b.publishedAt?.getTime() ?? 0;
      return dateB - dateA;
    });

    // Apply limit
    const limit = options?.limit ?? 100;
    return results.slice(0, limit);
  }

  validate(id: string): boolean {
    const source = this.getById(id);

    // In a real implementation, this would:
    // 1. Re-fetch the source from its origin
    // 2. Verify it still exists and hasn't been retracted
    // 3. Check for any updates or corrections

    logger.info('Source validated', { id, type: source.type });
    return true;
  }

  invalidate(id: string, reason: string): void {
    const source = this.getById(id);
    sources.delete(id);

    logger.warn('Source invalidated from MIMIR', {
      id,
      type: source.type,
      identifier: source.identifier,
      reason,
    });
  }

  getStats(): {
    totalSources: number;
    byType: Record<SourceType, number>;
  } {
    const allSources = Array.from(sources.values());
    const byType = {} as Record<SourceType, number>;

    for (const source of allSources) {
      byType[source.type] = (byType[source.type] ?? 0) + 1;
    }

    return {
      totalSources: allSources.length,
      byType,
    };
  }
}
