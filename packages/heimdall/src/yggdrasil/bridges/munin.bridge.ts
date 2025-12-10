/**
 * MUNIN Bridge
 *
 * Connects to the MUNIN memory component with Prisma persistence.
 * The raven "Memory" who remembers everything for Odin.
 *
 * MUNIN stores all interactions, decisions, and validations
 * for future reference, learning, and rollback capabilities.
 */

import { Injectable } from '@nestjs/common';
import {
  MemoryType,
  ValidationResult,
  createLogger,
  generateId,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import type { YggdrasilResponse } from '../yggdrasil.service.js';

const logger = createLogger('MuninBridge', 'info');

export interface InteractionData {
  userId: string;
  sessionId?: string;
  requestId: string;
  query: string;
  response: YggdrasilResponse;
  validation: ValidationResult;
}

@Injectable()
export class MuninBridge {
  constructor(private readonly db: DatabaseService) {}

  async storeInteraction(data: InteractionData): Promise<void> {
    logger.info('Storing interaction in MUNIN', {
      userId: data.userId,
      requestId: data.requestId,
      isVerified: data.response.isVerified,
    });

    const now = new Date();

    // Store the interaction
    const interactionId = generateId();
    const interactionContent = {
      requestId: data.requestId,
      sessionId: data.sessionId,
      query: data.query,
      response: {
        answer: data.response.answer,
        isVerified: data.response.isVerified,
        confidence: data.response.confidence,
        sourceCount: data.response.sources.length,
        epistemicBranch: data.response.epistemicBranch,
      },
      timestamp: data.response.timestamp.toISOString(),
    };

    await this.db.$executeRaw`
      INSERT INTO memories (
        id, user_id, session_id, type, content, tags, importance,
        access_count, created_at, updated_at
      ) VALUES (
        ${interactionId},
        ${data.userId},
        ${data.sessionId ?? null},
        'INTERACTION'::"MemoryType",
        ${JSON.stringify(interactionContent)}::jsonb,
        ${['interaction', data.response.epistemicBranch]}::text[],
        50,
        0,
        ${now},
        ${now}
      )
    `;

    // Store the decision (validation result)
    const decisionId = generateId();
    const decisionContent = {
      requestId: data.requestId,
      validation: {
        isValid: data.validation.isValid,
        confidence: data.validation.confidence,
        rejectionReason: data.validation.rejectionReason,
        sourceCount: data.validation.sources.length,
      },
      trace: {
        id: data.validation.trace.id,
        finalDecision: data.validation.trace.finalDecision,
        stepCount: data.validation.trace.steps.length,
        processingTimeMs: data.validation.trace.processingTimeMs,
      },
      timestamp: new Date().toISOString(),
    };

    await this.db.$executeRaw`
      INSERT INTO memories (
        id, user_id, session_id, type, content, tags, importance,
        access_count, created_at, updated_at
      ) VALUES (
        ${decisionId},
        ${data.userId},
        ${data.sessionId ?? null},
        'DECISION'::"MemoryType",
        ${JSON.stringify(decisionContent)}::jsonb,
        ${['validation', data.response.epistemicBranch]}::text[],
        ${data.validation.isValid ? 70 : 50},
        0,
        ${now},
        ${now}
      )
    `;

    // Create dependency: decision depends on interaction
    await this.db.memoryDependency.create({
      data: {
        memoryId: decisionId,
        dependsOnId: interactionId,
        dependencyType: 'DERIVES_FROM',
      },
    });

    logger.info('Interaction stored in MUNIN', {
      interactionId,
      decisionId,
    });
  }

  /**
   * Retrieve user's recent interactions
   */
  async getRecentInteractions(
    userId: string,
    limit: number = 10
  ): Promise<Array<{ query: string; isVerified: boolean; timestamp: string }>> {
    logger.info('Retrieving recent interactions', { userId, limit });

    const memories = await this.db.memory.findMany({
      where: {
        userId,
        type: 'INTERACTION',
        invalidatedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return memories.map((m) => {
      const content = m.content as {
        query: string;
        response: { isVerified: boolean };
        timestamp: string;
      };
      return {
        query: content.query,
        isVerified: content.response.isVerified,
        timestamp: content.timestamp,
      };
    });
  }

  /**
   * Create a checkpoint for rollback capability
   */
  async createCheckpoint(
    userId: string,
    reason: string
  ): Promise<{ checkpointId: string }> {
    const now = new Date();
    const checkpointId = generateId();

    const checkpointContent = {
      reason,
      timestamp: now.toISOString(),
      state: 'active',
    };

    await this.db.$executeRaw`
      INSERT INTO memories (
        id, user_id, type, content, tags, importance,
        access_count, created_at, updated_at
      ) VALUES (
        ${checkpointId},
        ${userId},
        'CHECKPOINT'::"MemoryType",
        ${JSON.stringify(checkpointContent)}::jsonb,
        ${'checkpoint'}::text[],
        90,
        0,
        ${now},
        ${now}
      )
    `;

    logger.info('Checkpoint created', {
      userId,
      checkpointId,
      reason,
    });

    return { checkpointId };
  }

  /**
   * Invalidate a memory and optionally cascade to dependents
   */
  async invalidateMemory(
    memoryId: string,
    invalidatedBy: string,
    reason: string,
    cascade: boolean = false
  ): Promise<{ invalidatedCount: number }> {
    logger.info('Invalidating memory', { memoryId, invalidatedBy, reason, cascade });

    if (cascade) {
      // BFS to find and invalidate all dependent memories
      const invalidated = new Set<string>([memoryId]);
      const queue = [memoryId];
      let count = 0;

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        await this.db.memory.update({
          where: { id: currentId },
          data: {
            invalidatedAt: new Date(),
            invalidatedBy,
            invalidationReason: count === 0 ? reason : `Cascade from ${memoryId}: ${reason}`,
          },
        });
        count++;

        const dependents = await this.db.memoryDependency.findMany({
          where: { dependsOnId: currentId },
          select: { memoryId: true },
        });

        for (const dep of dependents) {
          if (!invalidated.has(dep.memoryId)) {
            invalidated.add(dep.memoryId);
            queue.push(dep.memoryId);
          }
        }
      }

      return { invalidatedCount: count };
    } else {
      await this.db.memory.update({
        where: { id: memoryId },
        data: {
          invalidatedAt: new Date(),
          invalidatedBy,
          invalidationReason: reason,
        },
      });

      return { invalidatedCount: 1 };
    }
  }

  /**
   * Get memory count for a user
   */
  async getUserMemoryCount(userId: string): Promise<number> {
    return this.db.memory.count({
      where: {
        userId,
        invalidatedAt: null,
      },
    });
  }

  /**
   * Search memories semantically (requires embedding)
   */
  async searchMemories(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<Array<{ id: string; type: string; content: unknown; similarity?: number }>> {
    logger.info('Searching memories', { userId, query, limit });

    // For now, do a simple tag/content search
    // Full semantic search requires embedding generation
    const memories = await this.db.memory.findMany({
      where: {
        userId,
        invalidatedAt: null,
        OR: [
          { tags: { hasSome: query.toLowerCase().split(' ') } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return memories.map((m) => ({
      id: m.id,
      type: m.type,
      content: m.content,
    }));
  }
}
