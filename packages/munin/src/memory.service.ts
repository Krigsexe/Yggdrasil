/**
 * Memory Service
 *
 * Handles storage and retrieval of chrono-semantic memories using PostgreSQL + pgvector.
 * Implements the MUNIN component of YGGDRASIL.
 */

import { Injectable } from '@nestjs/common';
import {
  MemoryEntry,
  MemoryType,
  MemoryQuery,
  MemorySearchResult,
  createLogger,
  generateMemoryId,
  NotFoundError,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { EmbeddingService } from '@yggdrasil/shared/embedding';

const logger = createLogger('MemoryService', 'info');

// Prisma MemoryType enum values as string literals
type PrismaMemoryType = 'INTERACTION' | 'DECISION' | 'CORRECTION' | 'CHECKPOINT' | 'INVALIDATION';

// Map between YGGDRASIL MemoryType and Prisma MemoryType
function toPrismaMemoryType(type: MemoryType): PrismaMemoryType {
  const mapping: Record<MemoryType, PrismaMemoryType> = {
    [MemoryType.INTERACTION]: 'INTERACTION',
    [MemoryType.DECISION]: 'DECISION',
    [MemoryType.CORRECTION]: 'CORRECTION',
    [MemoryType.CHECKPOINT]: 'CHECKPOINT',
    [MemoryType.INVALIDATION]: 'INVALIDATION',
  };
  return mapping[type];
}

function fromPrismaMemoryType(type: PrismaMemoryType): MemoryType {
  const mapping: Record<PrismaMemoryType, MemoryType> = {
    INTERACTION: MemoryType.INTERACTION,
    DECISION: MemoryType.DECISION,
    CORRECTION: MemoryType.CORRECTION,
    CHECKPOINT: MemoryType.CHECKPOINT,
    INVALIDATION: MemoryType.CORRECTION, // Map INVALIDATION to CORRECTION
  };
  return mapping[type] ?? MemoryType.INTERACTION;
}

interface MemoryRow {
  id: string;
  user_id: string;
  session_id: string | null;
  type: PrismaMemoryType;
  content: unknown;
  tags: string[];
  importance: number;
  access_count: number;
  last_accessed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  valid_until: Date | null;
  invalidated_at: Date | null;
  invalidated_by: string | null;
  invalidation_reason: string | null;
}

interface MemoryWithSimilarity extends MemoryRow {
  similarity?: number;
}

@Injectable()
export class MemoryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async create(
    userId: string,
    type: MemoryType,
    content: unknown,
    options?: {
      sessionId?: string;
      tags?: string[];
      importance?: number;
    }
  ): Promise<MemoryEntry> {
    const id = generateMemoryId();
    const now = new Date();

    // Generate embedding for semantic search
    const contentString = typeof content === 'string' ? content : JSON.stringify(content);
    const embeddingResult = await this.embeddingService.generate(
      contentString,
      'RETRIEVAL_DOCUMENT'
    );
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    // Use raw SQL to handle pgvector type
    await this.db.$executeRaw`
      INSERT INTO memories (
        id, user_id, session_id, type, content, tags, importance,
        access_count, created_at, updated_at, embedding
      ) VALUES (
        ${id},
        ${userId},
        ${options?.sessionId ?? null},
        ${toPrismaMemoryType(type)}::"MemoryType",
        ${JSON.stringify(content)}::jsonb,
        ${options?.tags ?? []}::text[],
        ${options?.importance ?? 50},
        0,
        ${now},
        ${now},
        ${embeddingVector}::vector
      )
    `;

    const entry: MemoryEntry = {
      id,
      userId,
      sessionId: options?.sessionId,
      type,
      content,
      embedding: embeddingResult.embedding,
      metadata: {
        tags: options?.tags ?? [],
        importance: options?.importance ?? 50,
        accessCount: 0,
        relatedMemories: [],
      },
      createdAt: now,
      updatedAt: now,
    };

    logger.info('Memory created', { id, userId, type });

    return entry;
  }

  async getById(id: string): Promise<MemoryEntry> {
    // Update access count and get the record
    const result = await this.db.$queryRaw<MemoryRow[]>`
      UPDATE memories
      SET access_count = access_count + 1,
          last_accessed_at = NOW()
      WHERE id = ${id}
      RETURNING id, user_id, session_id, type, content, tags, importance,
                access_count, last_accessed_at, created_at, updated_at,
                valid_until, invalidated_at, invalidated_by, invalidation_reason
    `;

    if (!result || result.length === 0) {
      throw new NotFoundError('Memory', id);
    }

    const row = result[0];
    if (!row) {
      throw new NotFoundError('Memory', id);
    }

    return this.rowToMemoryEntry(row);
  }

  async query(query: MemoryQuery): Promise<MemorySearchResult> {
    // Build WHERE clauses dynamically
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [query.userId];
    let paramIndex = 2;

    if (query.sessionId) {
      conditions.push(`session_id = $${paramIndex++}`);
      params.push(query.sessionId);
    }

    if (query.types && query.types.length > 0) {
      const typeConditions = query.types.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`type IN (${typeConditions})`);
      params.push(...query.types.map(toPrismaMemoryType));
    }

    if (query.tags && query.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}::text[]`);
      params.push(query.tags);
    }

    if (query.fromDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(query.fromDate);
    }

    if (query.toDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(query.toDate);
    }

    if (!query.includeInvalidated) {
      conditions.push('invalidated_at IS NULL');
    }

    const whereClause = conditions.join(' AND ');
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;

    let results: MemoryWithSimilarity[];
    let semanticScores: Map<string, number> | undefined;

    if (query.semanticQuery) {
      // Semantic search using pgvector cosine similarity (RETRIEVAL_QUERY optimized)
      const queryResult = await this.embeddingService.generate(
        query.semanticQuery,
        'RETRIEVAL_QUERY'
      );
      const queryVector = `[${queryResult.embedding.join(',')}]`;

      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<MemoryWithSimilarity[]>(
        `
        SELECT id, user_id, session_id, type, content, tags, importance,
               access_count, last_accessed_at, created_at, updated_at,
               valid_until, invalidated_at, invalidated_by, invalidation_reason,
               1 - (embedding <=> '${queryVector}'::vector) as similarity
        FROM memories
        WHERE ${whereClause} AND embedding IS NOT NULL
        ORDER BY embedding <=> '${queryVector}'::vector
        LIMIT ${limit} OFFSET ${offset}
      `,
        ...params
      );

      semanticScores = new Map();
      for (const row of results) {
        if (row.similarity !== undefined) {
          semanticScores.set(row.id, row.similarity);
        }
      }
    } else {
      // Regular query, order by creation date
      results = await (
        this.db as unknown as {
          $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
        }
      ).$queryRawUnsafe<MemoryRow[]>(
        `
        SELECT id, user_id, session_id, type, content, tags, importance,
               access_count, last_accessed_at, created_at, updated_at,
               valid_until, invalidated_at, invalidated_by, invalidation_reason
        FROM memories
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
        ...params
      );
    }

    // Get total count
    const countResult = await (
      this.db as unknown as { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> }
    ).$queryRawUnsafe<{ count: bigint }[]>(
      `
      SELECT COUNT(*) as count
      FROM memories
      WHERE ${whereClause}
    `,
      ...params
    );

    const totalCount = Number(countResult[0]?.count ?? 0);

    return {
      memories: results.map((row) => this.rowToMemoryEntry(row)),
      totalCount,
      semanticScores,
    };
  }

  async invalidate(id: string, invalidatedBy: string, reason: string): Promise<void> {
    const result = await this.db.memory.update({
      where: { id },
      data: {
        invalidatedAt: new Date(),
        invalidatedBy,
        invalidationReason: reason,
      },
    });

    if (!result) {
      throw new NotFoundError('Memory', id);
    }

    logger.info('Memory invalidated', { id, invalidatedBy, reason });
  }

  async getRelated(id: string, limit = 10): Promise<MemoryEntry[]> {
    // Get the memory and its embedding
    const memory = await this.db.memory.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!memory) {
      throw new NotFoundError('Memory', id);
    }

    // Find similar memories using pgvector
    const results = await this.db.$queryRaw<MemoryRow[]>`
      SELECT m2.id, m2.user_id, m2.session_id, m2.type, m2.content, m2.tags,
             m2.importance, m2.access_count, m2.last_accessed_at, m2.created_at,
             m2.updated_at, m2.valid_until, m2.invalidated_at, m2.invalidated_by,
             m2.invalidation_reason
      FROM memories m1, memories m2
      WHERE m1.id = ${id}
        AND m2.id != ${id}
        AND m2.user_id = ${memory.userId}
        AND m2.invalidated_at IS NULL
        AND m1.embedding IS NOT NULL
        AND m2.embedding IS NOT NULL
      ORDER BY m1.embedding <=> m2.embedding
      LIMIT ${limit}
    `;

    return results.map((row: MemoryRow) => this.rowToMemoryEntry(row));
  }

  async getUserMemoryCount(userId: string): Promise<number> {
    const result = await this.db.memory.count({
      where: {
        userId,
        invalidatedAt: null,
      },
    });

    return result;
  }

  async addDependency(
    memoryId: string,
    dependsOnId: string,
    dependencyType: 'DERIVES_FROM' | 'REFERENCES' | 'INVALIDATES' | 'SUPERSEDES'
  ): Promise<void> {
    await this.db.memoryDependency.create({
      data: {
        memoryId,
        dependsOnId,
        dependencyType,
      },
    });

    logger.info('Memory dependency added', { memoryId, dependsOnId, dependencyType });
  }

  async getDependents(memoryId: string): Promise<MemoryEntry[]> {
    const dependencies = await this.db.memoryDependency.findMany({
      where: { dependsOnId: memoryId },
      include: { memory: true },
    });

    return Promise.all(dependencies.map((dep: { memoryId: string }) => this.getById(dep.memoryId)));
  }

  async cascadeInvalidate(id: string, invalidatedBy: string, reason: string): Promise<number> {
    // First invalidate the target memory
    await this.invalidate(id, invalidatedBy, reason);

    // Find all dependent memories recursively
    const invalidated = new Set<string>([id]);
    const queue = [id];
    let invalidatedCount = 1;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const dependents = await this.db.memoryDependency.findMany({
        where: { dependsOnId: currentId },
        select: { memoryId: true },
      });

      for (const dep of dependents) {
        if (!invalidated.has(dep.memoryId)) {
          await this.invalidate(
            dep.memoryId,
            invalidatedBy,
            `Cascade invalidation from ${id}: ${reason}`
          );
          invalidated.add(dep.memoryId);
          queue.push(dep.memoryId);
          invalidatedCount++;
        }
      }
    }

    logger.info('Cascade invalidation complete', {
      sourceId: id,
      totalInvalidated: invalidatedCount,
    });

    return invalidatedCount;
  }

  private rowToMemoryEntry(row: MemoryRow): MemoryEntry {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id ?? undefined,
      type: fromPrismaMemoryType(row.type),
      content: row.content,
      metadata: {
        tags: row.tags,
        importance: row.importance,
        accessCount: row.access_count,
        lastAccessedAt: row.last_accessed_at ?? undefined,
        relatedMemories: [],
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      validUntil: row.valid_until ?? undefined,
      invalidatedAt: row.invalidated_at ?? undefined,
      invalidatedBy: row.invalidated_by ?? undefined,
      invalidationReason: row.invalidation_reason ?? undefined,
    };
  }
}
