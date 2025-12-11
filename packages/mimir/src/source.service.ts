/**
 * Source Service
 *
 * Manages verified sources in MIMIR using PostgreSQL + pgvector.
 * Implements persistent storage with semantic search capabilities.
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
import { DatabaseService } from '@yggdrasil/shared/database';
import { EmbeddingService } from '@yggdrasil/shared/embedding';

const logger = createLogger('SourceService', 'info');

// Prisma SourceType enum values as string literals
type PrismaSourceType =
  | 'ARXIV'
  | 'PUBMED'
  | 'ISO'
  | 'RFC'
  | 'WIKIDATA'
  | 'WEB'
  | 'BOOK'
  | 'JOURNAL'
  | 'OTHER';
type PrismaEpistemicBranch = 'MIMIR' | 'VOLVA' | 'HUGIN';

// Map between YGGDRASIL SourceType and Prisma SourceType
function toPrismaSourceType(type: SourceType): PrismaSourceType {
  const mapping: Record<SourceType, PrismaSourceType> = {
    [SourceType.ARXIV]: 'ARXIV',
    [SourceType.PUBMED]: 'PUBMED',
    [SourceType.ISO]: 'ISO',
    [SourceType.RFC]: 'RFC',
    [SourceType.WIKIDATA]: 'WIKIDATA',
    [SourceType.WEB]: 'WEB',
    [SourceType.BOOK]: 'BOOK',
    [SourceType.JOURNAL]: 'JOURNAL',
    [SourceType.OTHER]: 'OTHER',
  };
  return mapping[type];
}

function fromPrismaSourceType(type: PrismaSourceType): SourceType {
  const mapping: Record<PrismaSourceType, SourceType> = {
    ARXIV: SourceType.ARXIV,
    PUBMED: SourceType.PUBMED,
    ISO: SourceType.ISO,
    RFC: SourceType.RFC,
    WIKIDATA: SourceType.WIKIDATA,
    WEB: SourceType.WEB,
    BOOK: SourceType.BOOK,
    JOURNAL: SourceType.JOURNAL,
    OTHER: SourceType.OTHER,
  };
  return mapping[type] ?? SourceType.OTHER;
}

function fromPrismaEpistemicBranch(branch: PrismaEpistemicBranch): EpistemicBranch {
  const mapping: Record<PrismaEpistemicBranch, EpistemicBranch> = {
    MIMIR: EpistemicBranch.MIMIR,
    VOLVA: EpistemicBranch.VOLVA,
    HUGIN: EpistemicBranch.HUGIN,
  };
  return mapping[branch] ?? EpistemicBranch.MIMIR;
}

interface SourceRow {
  id: string;
  type: PrismaSourceType;
  identifier: string;
  url: string;
  title: string;
  authors: string[];
  published_at: Date | null;
  fetched_at: Date;
  trust_score: number;
  branch: PrismaEpistemicBranch;
  is_valid: boolean;
  invalidated_at: Date | null;
  doi: string | null;
  isbn: string | null;
  issn: string | null;
  arxiv_id: string | null;
  pubmed_id: string | null;
  abstract: string | null;
  keywords: string[];
  citations: number | null;
  peer_reviewed: boolean | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
}

interface SourceWithSimilarity extends SourceRow {
  similarity?: number;
}

export interface SourceInput {
  type: SourceType;
  identifier: string;
  url: string;
  title: string;
  authors?: string[];
  publishedAt?: Date;
  trustScore: number;
  metadata?: {
    doi?: string;
    isbn?: string;
    issn?: string;
    arxivId?: string;
    pubmedId?: string;
    abstract?: string;
    keywords?: string[];
    citations?: number;
    peerReviewed?: boolean;
    journal?: string;
    volume?: string;
    issue?: string;
    pages?: string;
  };
}

@Injectable()
export class SourceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly embeddingService: EmbeddingService
  ) {}

  /**
   * Add a source to MIMIR with validation.
   * Only sources with trustScore 100 and eligible types are accepted.
   */
  async add(input: SourceInput): Promise<Source> {
    // Validate source type is eligible for MIMIR
    if (!isMimirEligible(input.type)) {
      throw new Error(`Source type ${input.type} is not eligible for MIMIR`);
    }

    // Validate trust score is 100 for MIMIR
    if (input.trustScore !== 100) {
      throw new Error('MIMIR sources must have trust score of 100');
    }

    // Check if source already exists
    const existing = await this.getByIdentifier(input.type, input.identifier);
    if (existing) {
      logger.info('Source already exists in MIMIR', {
        id: existing.id,
        type: input.type,
        identifier: input.identifier,
      });
      return existing;
    }

    const id = generateId();
    const now = new Date();

    // Generate embedding for semantic search
    const contentForEmbedding = [
      input.title,
      input.metadata?.abstract ?? '',
      ...(input.metadata?.keywords ?? []),
    ].join(' ');
    const embeddingResult = await this.embeddingService.generate(
      contentForEmbedding,
      'RETRIEVAL_DOCUMENT'
    );
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    // Insert using raw SQL to handle pgvector type
    await this.db.$executeRaw`
      INSERT INTO sources (
        id, type, identifier, url, title, authors,
        published_at, fetched_at, trust_score, branch, is_valid,
        doi, isbn, issn, arxiv_id, pubmed_id,
        abstract, keywords, citations, peer_reviewed,
        journal, volume, issue, pages,
        embedding, embedding_updated_at
      ) VALUES (
        ${id},
        ${toPrismaSourceType(input.type)}::"SourceType",
        ${input.identifier},
        ${input.url},
        ${input.title},
        ${input.authors ?? []}::text[],
        ${input.publishedAt ?? null},
        ${now},
        ${input.trustScore},
        'MIMIR'::"EpistemicBranch",
        true,
        ${input.metadata?.doi ?? null},
        ${input.metadata?.isbn ?? null},
        ${input.metadata?.issn ?? null},
        ${input.metadata?.arxivId ?? null},
        ${input.metadata?.pubmedId ?? null},
        ${input.metadata?.abstract ?? null},
        ${input.metadata?.keywords ?? []}::text[],
        ${input.metadata?.citations ?? null},
        ${input.metadata?.peerReviewed ?? null},
        ${input.metadata?.journal ?? null},
        ${input.metadata?.volume ?? null},
        ${input.metadata?.issue ?? null},
        ${input.metadata?.pages ?? null},
        ${embeddingVector}::vector,
        ${now}
      )
    `;

    const source: Source = {
      id,
      type: input.type,
      identifier: input.identifier,
      url: input.url,
      title: input.title,
      authors: input.authors ?? [],
      publishedAt: input.publishedAt,
      fetchedAt: now,
      trustScore: input.trustScore,
      branch: EpistemicBranch.MIMIR,
      metadata: input.metadata,
    };

    logger.info('Source added to MIMIR', {
      id,
      type: input.type,
      identifier: input.identifier,
    });

    return source;
  }

  /**
   * Get a source by ID.
   */
  async getById(id: string): Promise<Source> {
    const result = await this.db.$queryRaw<SourceRow[]>`
      SELECT id, type, identifier, url, title, authors,
             published_at, fetched_at, trust_score, branch, is_valid,
             invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
             abstract, keywords, citations, peer_reviewed,
             journal, volume, issue, pages
      FROM sources
      WHERE id = ${id} AND is_valid = true
    `;

    if (!result || result.length === 0) {
      throw new NotFoundError('Source', id);
    }

    const row = result[0];
    if (!row) {
      throw new NotFoundError('Source', id);
    }

    return this.rowToSource(row);
  }

  /**
   * Get a source by type and identifier.
   */
  async getByIdentifier(type: SourceType, identifier: string): Promise<Source | null> {
    const result = await this.db.$queryRaw<SourceRow[]>`
      SELECT id, type, identifier, url, title, authors,
             published_at, fetched_at, trust_score, branch, is_valid,
             invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
             abstract, keywords, citations, peer_reviewed,
             journal, volume, issue, pages
      FROM sources
      WHERE type = ${toPrismaSourceType(type)}::"SourceType"
        AND identifier = ${identifier}
        AND is_valid = true
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    if (!row) {
      return null;
    }

    return this.rowToSource(row);
  }

  /**
   * Search sources using text matching.
   */
  async search(
    query: string,
    options?: {
      types?: SourceType[];
      limit?: number;
    }
  ): Promise<Source[]> {
    const limit = options?.limit ?? 100;
    const types = options?.types?.map(toPrismaSourceType) ?? [];
    const normalizedQuery = `%${query.toLowerCase()}%`;

    let results: SourceRow[];

    if (types.length > 0) {
      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<SourceRow[]>(
        `
        SELECT id, type, identifier, url, title, authors,
               published_at, fetched_at, trust_score, branch, is_valid,
               invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
               abstract, keywords, citations, peer_reviewed,
               journal, volume, issue, pages
        FROM sources
        WHERE is_valid = true
          AND branch = 'MIMIR'
          AND type = ANY($1::"SourceType"[])
          AND (
            LOWER(title) LIKE $2
            OR LOWER(abstract) LIKE $2
            OR $3 = ANY(keywords)
          )
        ORDER BY published_at DESC NULLS LAST
        LIMIT $4
      `,
        types,
        normalizedQuery,
        query.toLowerCase(),
        limit
      );
    } else {
      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<SourceRow[]>(
        `
        SELECT id, type, identifier, url, title, authors,
               published_at, fetched_at, trust_score, branch, is_valid,
               invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
               abstract, keywords, citations, peer_reviewed,
               journal, volume, issue, pages
        FROM sources
        WHERE is_valid = true
          AND branch = 'MIMIR'
          AND (
            LOWER(title) LIKE $1
            OR LOWER(abstract) LIKE $1
            OR $2 = ANY(keywords)
          )
        ORDER BY published_at DESC NULLS LAST
        LIMIT $3
      `,
        normalizedQuery,
        query.toLowerCase(),
        limit
      );
    }

    return results.map((row) => this.rowToSource(row));
  }

  /**
   * Semantic search using pgvector embeddings.
   */
  async semanticSearch(
    query: string,
    options?: {
      types?: SourceType[];
      limit?: number;
      minSimilarity?: number;
    }
  ): Promise<Array<{ source: Source; similarity: number }>> {
    const limit = options?.limit ?? 20;
    const minSimilarity = options?.minSimilarity ?? 0.5;

    // Generate query embedding (RETRIEVAL_QUERY optimized for search)
    const queryResult = await this.embeddingService.generate(query, 'RETRIEVAL_QUERY');
    const queryVector = `[${queryResult.embedding.join(',')}]`;

    const types = options?.types?.map(toPrismaSourceType) ?? [];

    let results: SourceWithSimilarity[];

    if (types.length > 0) {
      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<SourceWithSimilarity[]>(
        `
        SELECT id, type, identifier, url, title, authors,
               published_at, fetched_at, trust_score, branch, is_valid,
               invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
               abstract, keywords, citations, peer_reviewed,
               journal, volume, issue, pages,
               1 - (embedding <=> '${queryVector}'::vector) as similarity
        FROM sources
        WHERE is_valid = true
          AND branch = 'MIMIR'
          AND embedding IS NOT NULL
          AND type = ANY($1::"SourceType"[])
        ORDER BY embedding <=> '${queryVector}'::vector
        LIMIT $2
      `,
        types,
        limit
      );
    } else {
      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<SourceWithSimilarity[]>(
        `
        SELECT id, type, identifier, url, title, authors,
               published_at, fetched_at, trust_score, branch, is_valid,
               invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
               abstract, keywords, citations, peer_reviewed,
               journal, volume, issue, pages,
               1 - (embedding <=> '${queryVector}'::vector) as similarity
        FROM sources
        WHERE is_valid = true
          AND branch = 'MIMIR'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> '${queryVector}'::vector
        LIMIT $1
      `,
        limit
      );
    }

    return results
      .filter((row) => (row.similarity ?? 0) >= minSimilarity)
      .map((row) => ({
        source: this.rowToSource(row),
        similarity: row.similarity ?? 0,
      }));
  }

  /**
   * Validate a source (check if still valid).
   */
  async validate(id: string): Promise<boolean> {
    const source = await this.getById(id);

    // In a full implementation, this would:
    // 1. Re-fetch the source from its origin
    // 2. Verify it still exists and hasn't been retracted
    // 3. Check for any updates or corrections

    logger.info('Source validated', { id, type: source.type });
    return true;
  }

  /**
   * Invalidate a source (soft delete).
   */
  async invalidate(id: string, reason: string): Promise<void> {
    const source = await this.getById(id);

    await this.db.$executeRaw`
      UPDATE sources
      SET is_valid = false,
          invalidated_at = ${new Date()}
      WHERE id = ${id}
    `;

    logger.warn('Source invalidated from MIMIR', {
      id,
      type: source.type,
      identifier: source.identifier,
      reason,
    });
  }

  /**
   * Get statistics about sources in MIMIR.
   */
  async getStats(): Promise<{
    totalSources: number;
    byType: Record<string, number>;
  }> {
    const countResult = await this.db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM sources WHERE is_valid = true AND branch = 'MIMIR'
    `;

    const byTypeResult = await this.db.$queryRaw<{ type: PrismaSourceType; count: bigint }[]>`
      SELECT type, COUNT(*) as count
      FROM sources
      WHERE is_valid = true AND branch = 'MIMIR'
      GROUP BY type
    `;

    const byType: Record<string, number> = {};
    for (const row of byTypeResult) {
      byType[row.type] = Number(row.count);
    }

    return {
      totalSources: Number(countResult[0]?.count ?? 0),
      byType,
    };
  }

  /**
   * Get sources by arXiv ID.
   */
  async getByArxivId(arxivId: string): Promise<Source | null> {
    const result = await this.db.$queryRaw<SourceRow[]>`
      SELECT id, type, identifier, url, title, authors,
             published_at, fetched_at, trust_score, branch, is_valid,
             invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
             abstract, keywords, citations, peer_reviewed,
             journal, volume, issue, pages
      FROM sources
      WHERE arxiv_id = ${arxivId} AND is_valid = true
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return row ? this.rowToSource(row) : null;
  }

  /**
   * Get sources by PubMed ID.
   */
  async getByPubmedId(pubmedId: string): Promise<Source | null> {
    const result = await this.db.$queryRaw<SourceRow[]>`
      SELECT id, type, identifier, url, title, authors,
             published_at, fetched_at, trust_score, branch, is_valid,
             invalidated_at, doi, isbn, issn, arxiv_id, pubmed_id,
             abstract, keywords, citations, peer_reviewed,
             journal, volume, issue, pages
      FROM sources
      WHERE pubmed_id = ${pubmedId} AND is_valid = true
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return row ? this.rowToSource(row) : null;
  }

  /**
   * Convert database row to Source object.
   */
  private rowToSource(row: SourceRow): Source {
    return {
      id: row.id,
      type: fromPrismaSourceType(row.type),
      identifier: row.identifier,
      url: row.url,
      title: row.title,
      authors: row.authors,
      publishedAt: row.published_at ?? undefined,
      fetchedAt: row.fetched_at,
      trustScore: row.trust_score,
      branch: fromPrismaEpistemicBranch(row.branch),
      metadata: {
        doi: row.doi ?? undefined,
        isbn: row.isbn ?? undefined,
        issn: row.issn ?? undefined,
        arxivId: row.arxiv_id ?? undefined,
        pubmedId: row.pubmed_id ?? undefined,
        abstract: row.abstract ?? undefined,
        keywords: row.keywords,
        citations: row.citations ?? undefined,
        peerReviewed: row.peer_reviewed ?? undefined,
        journal: row.journal ?? undefined,
        volume: row.volume ?? undefined,
        issue: row.issue ?? undefined,
        pages: row.pages ?? undefined,
      },
    };
  }
}
