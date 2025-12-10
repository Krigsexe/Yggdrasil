/**
 * Checkpoint Service
 *
 * Handles checkpoint creation and rollback.
 * Supports the Reversibility pillar.
 */

import { Injectable } from '@nestjs/common';
import {
  Checkpoint,
  RollbackResult,
  createLogger,
  generateCheckpointId,
  NotFoundError,
} from '@yggdrasil/shared';
import { createHash } from 'crypto';

const logger = createLogger('CheckpointService', 'info');

// In-memory store for development
const checkpoints = new Map<string, Checkpoint>();

@Injectable()
export class CheckpointService {
  create(
    userId: string,
    label: string,
    memoryIds: string[],
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
    }
  ): Checkpoint {
    const id = generateCheckpointId();
    const stateHash = this.generateStateHash(memoryIds);

    const checkpoint: Checkpoint = {
      id,
      userId,
      label,
      description: options?.description,
      stateHash,
      memoryIds,
      createdAt: new Date(),
      metadata: options?.metadata ?? {},
    };

    checkpoints.set(id, checkpoint);

    logger.info('Checkpoint created', {
      id,
      userId,
      label,
      memoryCount: memoryIds.length,
    });

    return checkpoint;
  }

  getById(id: string): Checkpoint {
    const checkpoint = checkpoints.get(id);
    if (!checkpoint) {
      throw new NotFoundError('Checkpoint', id);
    }
    return checkpoint;
  }

  listForUser(userId: string): Checkpoint[] {
    return Array.from(checkpoints.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  rollback(checkpointId: string): RollbackResult {
    const checkpoint = this.getById(checkpointId);

    // In a real implementation, this would:
    // 1. Get all memories created after the checkpoint
    // 2. Mark them as invalidated
    // 3. Restore the state to the checkpoint

    logger.info('Rollback initiated', {
      checkpointId,
      userId: checkpoint.userId,
      label: checkpoint.label,
    });

    // For now, return a mock result
    return {
      success: true,
      checkpointId,
      invalidatedCount: 0,
      restoredCount: checkpoint.memoryIds.length,
      timestamp: new Date(),
    };
  }

  delete(id: string): void {
    if (!checkpoints.has(id)) {
      throw new NotFoundError('Checkpoint', id);
    }
    checkpoints.delete(id);
    logger.info('Checkpoint deleted', { id });
  }

  private generateStateHash(memoryIds: string[]): string {
    const sorted = [...memoryIds].sort();
    const content = sorted.join(',');
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
