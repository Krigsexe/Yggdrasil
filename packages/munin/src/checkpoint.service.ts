/**
 * Checkpoint Service
 *
 * Handles checkpoint creation and rollback for MUNIN memory system.
 * Implements the Reversibility pillar (Pilier V) of YGGDRASIL.
 *
 * "Toute action doit pouvoir etre annulee. Aucune perte de donnees n'est acceptable."
 */

import { Injectable } from '@nestjs/common';
import {
  Checkpoint,
  RollbackResult,
  createLogger,
  generateCheckpointId,
  NotFoundError,
  KnowledgeLedgerEntry,
  KnowledgeLedgerAction,
  MemoryState,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { createHash } from 'crypto';

const logger = createLogger('CheckpointService', 'info');

/**
 * Captured state of a KnowledgeNode at checkpoint time
 */
interface NodeSnapshot {
  nodeId: string;
  statement: string;
  currentState: string;
  epistemicBranch: string;
  confidenceScore: number;
  epistemicVelocity: number;
  priorityQueue: string;
  auditTrailLength: number;
}

/**
 * Extended checkpoint with full state capture
 */
interface CheckpointWithState extends Checkpoint {
  nodeSnapshots: NodeSnapshot[];
}

interface CheckpointRow {
  id: string;
  user_id: string;
  label: string;
  description: string | null;
  state_hash: string;
  memory_ids: string[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

interface KnowledgeNodeRow {
  id: string;
  statement: string;
  current_state: string;
  epistemic_branch: string;
  confidence_score: number;
  epistemic_velocity: number;
  priority_queue: string;
  audit_trail: KnowledgeLedgerEntry[];
}

@Injectable()
export class CheckpointService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a checkpoint capturing current state of specified knowledge nodes
   */
  async create(
    userId: string,
    label: string,
    nodeIds: string[],
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      type?: 'MANUAL' | 'AUTO' | 'PRE_CASCADE';
    }
  ): Promise<Checkpoint> {
    const id = generateCheckpointId();

    // Fetch current state of all nodes
    const nodeSnapshots = await this.captureNodeStates(nodeIds);

    // Generate hash from node states
    const stateHash = this.generateStateHash(nodeSnapshots);

    // Build metadata object
    const metadata = {
      type: options?.type ?? 'MANUAL',
      nodeSnapshots,
      ...(options?.metadata ?? {}),
    };

    // Store checkpoint in database using raw query to handle JSON properly
    await this.db.$executeRaw`
      INSERT INTO checkpoints (id, user_id, label, description, state_hash, memory_ids, metadata, created_at)
      VALUES (
        ${id},
        ${userId},
        ${label},
        ${options?.description ?? null},
        ${stateHash},
        ${nodeIds}::text[],
        ${JSON.stringify(metadata)}::jsonb,
        ${new Date()}
      )
    `;

    logger.info('Checkpoint created', {
      id,
      userId,
      label,
      nodeCount: nodeIds.length,
      type: options?.type ?? 'MANUAL',
    });

    return this.getById(id);
  }

  /**
   * Create automatic checkpoint before cascade invalidation
   */
  async createPreCascadeCheckpoint(
    userId: string,
    sourceNodeId: string,
    affectedNodeIds: string[]
  ): Promise<Checkpoint> {
    const allNodeIds = [sourceNodeId, ...affectedNodeIds];

    return this.create(
      userId,
      `Pre-cascade: ${sourceNodeId}`,
      allNodeIds,
      {
        description: `Automatic checkpoint before cascade invalidation from node ${sourceNodeId}`,
        type: 'PRE_CASCADE',
        metadata: {
          sourceNodeId,
          affectedCount: affectedNodeIds.length,
        },
      }
    );
  }

  /**
   * Get checkpoint by ID
   */
  async getById(id: string): Promise<Checkpoint> {
    const checkpoint = await this.db.checkpoint.findUnique({
      where: { id },
    });

    if (!checkpoint) {
      throw new NotFoundError('Checkpoint', id);
    }

    return this.rowToCheckpoint(checkpoint as unknown as CheckpointRow);
  }

  /**
   * List all checkpoints for a user
   */
  async listForUser(userId: string, options?: { limit?: number }): Promise<Checkpoint[]> {
    const checkpoints = await this.db.checkpoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
    });

    return checkpoints.map((c: unknown) => this.rowToCheckpoint(c as CheckpointRow));
  }

  /**
   * Rollback to a checkpoint - restore node states
   *
   * This will:
   * 1. Get all node snapshots from the checkpoint
   * 2. For nodes created AFTER the checkpoint: mark as DEPRECATED
   * 3. For nodes that existed at checkpoint: restore their state
   * 4. Record rollback in audit trail
   */
  async rollback(checkpointId: string, userId: string): Promise<RollbackResult> {
    const checkpoint = await this.getById(checkpointId);

    // Verify ownership
    if (checkpoint.userId !== userId) {
      throw new Error('Unauthorized: checkpoint belongs to different user');
    }

    const metadata = checkpoint.metadata as { nodeSnapshots?: NodeSnapshot[]; type?: string };
    const nodeSnapshots = metadata?.nodeSnapshots ?? [];

    if (nodeSnapshots.length === 0) {
      logger.warn('Checkpoint has no node snapshots', { checkpointId });
      return {
        success: true,
        checkpointId,
        invalidatedCount: 0,
        restoredCount: 0,
        timestamp: new Date(),
      };
    }

    const now = new Date();
    const errors: string[] = [];
    let invalidatedCount = 0;
    let restoredCount = 0;

    // Get all nodes created AFTER the checkpoint
    const nodesCreatedAfter = await this.db.$queryRaw<{ id: string }[]>`
      SELECT id FROM knowledge_nodes
      WHERE created_at > ${checkpoint.createdAt}
    `;

    // Mark nodes created after checkpoint as DEPRECATED
    for (const node of nodesCreatedAfter) {
      try {
        await this.deprecateNodeForRollback(node.id, checkpointId, now);
        invalidatedCount++;
      } catch (error) {
        errors.push(`Failed to deprecate node ${node.id}: ${error}`);
      }
    }

    // Restore states of nodes that existed at checkpoint time
    for (const snapshot of nodeSnapshots) {
      try {
        await this.restoreNodeState(snapshot, checkpointId, now);
        restoredCount++;
      } catch (error) {
        errors.push(`Failed to restore node ${snapshot.nodeId}: ${error}`);
      }
    }

    const result: RollbackResult = {
      success: errors.length === 0,
      checkpointId,
      invalidatedCount,
      restoredCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now,
    };

    logger.info('Rollback completed', {
      checkpointId,
      invalidatedCount,
      restoredCount,
      errorCount: errors.length,
    });

    return result;
  }

  /**
   * Delete a checkpoint
   */
  async delete(id: string, userId: string): Promise<void> {
    const checkpoint = await this.getById(id);

    if (checkpoint.userId !== userId) {
      throw new Error('Unauthorized: checkpoint belongs to different user');
    }

    await this.db.checkpoint.delete({
      where: { id },
    });

    logger.info('Checkpoint deleted', { id });
  }

  /**
   * Get checkpoint count for user
   */
  async getCount(userId: string): Promise<number> {
    return this.db.checkpoint.count({
      where: { userId },
    });
  }

  /**
   * Capture current state of knowledge nodes
   */
  private async captureNodeStates(nodeIds: string[]): Promise<NodeSnapshot[]> {
    if (nodeIds.length === 0) {
      return [];
    }

    const nodes = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, statement, current_state, epistemic_branch,
             confidence_score, epistemic_velocity, priority_queue, audit_trail
      FROM knowledge_nodes
      WHERE id = ANY(${nodeIds}::text[])
    `;

    return nodes.map((node: KnowledgeNodeRow) => ({
      nodeId: node.id,
      statement: node.statement,
      currentState: node.current_state,
      epistemicBranch: node.epistemic_branch,
      confidenceScore: node.confidence_score,
      epistemicVelocity: node.epistemic_velocity,
      priorityQueue: node.priority_queue,
      auditTrailLength: node.audit_trail?.length ?? 0,
    }));
  }

  /**
   * Generate hash from node states for integrity verification
   */
  private generateStateHash(snapshots: NodeSnapshot[]): string {
    const content = JSON.stringify(
      snapshots.sort((a, b) => a.nodeId.localeCompare(b.nodeId))
    );
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  /**
   * Mark a node as deprecated due to rollback
   */
  private async deprecateNodeForRollback(
    nodeId: string,
    checkpointId: string,
    timestamp: Date
  ): Promise<void> {
    // Get current node state
    const node = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, current_state, audit_trail FROM knowledge_nodes WHERE id = ${nodeId}
    `;

    if (node.length === 0) {
      return;
    }

    const currentNode = node[0]!;

    // Create audit entry for rollback deprecation
    const auditEntry: KnowledgeLedgerEntry = {
      timestamp: timestamp.toISOString(),
      action: KnowledgeLedgerAction.DEPRECATE,
      fromState: currentNode.current_state as MemoryState,
      toState: MemoryState.DEPRECATED,
      trigger: `ROLLBACK:${checkpointId}`,
      agent: 'MUNIN',
      reason: `Deprecated by rollback to checkpoint ${checkpointId}`,
    };

    const updatedAuditTrail = [...(currentNode.audit_trail ?? []), auditEntry];

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET current_state = ${MemoryState.DEPRECATED}::"MemoryState",
          audit_trail = ${JSON.stringify(updatedAuditTrail)}::jsonb,
          updated_at = ${timestamp}
      WHERE id = ${nodeId}
    `;
  }

  /**
   * Restore a node to its checkpoint state
   */
  private async restoreNodeState(
    snapshot: NodeSnapshot,
    checkpointId: string,
    timestamp: Date
  ): Promise<void> {
    // Get current node state
    const node = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, current_state, audit_trail FROM knowledge_nodes WHERE id = ${snapshot.nodeId}
    `;

    if (node.length === 0) {
      logger.warn('Node not found for restore', { nodeId: snapshot.nodeId });
      return;
    }

    const currentNode = node[0]!;

    // Create audit entry for state restoration
    const auditEntry: KnowledgeLedgerEntry = {
      timestamp: timestamp.toISOString(),
      action: KnowledgeLedgerAction.TRANSITION,
      fromState: currentNode.current_state as MemoryState,
      toState: snapshot.currentState as MemoryState,
      trigger: `ROLLBACK:${checkpointId}`,
      agent: 'MUNIN',
      reason: `State restored from checkpoint ${checkpointId}`,
      metadata: {
        restoredFrom: {
          confidenceScore: snapshot.confidenceScore,
          epistemicVelocity: snapshot.epistemicVelocity,
          priorityQueue: snapshot.priorityQueue,
        },
      },
    };

    const updatedAuditTrail = [...(currentNode.audit_trail ?? []), auditEntry];

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET current_state = ${snapshot.currentState}::"MemoryState",
          confidence_score = ${snapshot.confidenceScore},
          epistemic_velocity = ${snapshot.epistemicVelocity},
          priority_queue = ${snapshot.priorityQueue}::"PriorityQueue",
          audit_trail = ${JSON.stringify(updatedAuditTrail)}::jsonb,
          updated_at = ${timestamp}
      WHERE id = ${snapshot.nodeId}
    `;
  }

  /**
   * Convert database row to Checkpoint interface
   */
  private rowToCheckpoint(row: CheckpointRow): Checkpoint {
    return {
      id: row.id,
      userId: row.user_id,
      label: row.label,
      description: row.description ?? undefined,
      stateHash: row.state_hash,
      memoryIds: row.memory_ids,
      createdAt: row.created_at,
      metadata: row.metadata ?? {},
    };
  }
}
