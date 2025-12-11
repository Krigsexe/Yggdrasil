/**
 * Knowledge Ledger Service
 *
 * Implements AGI v2.0 Knowledge Ledger - an immutable temporal ledger
 * for knowledge state tracking and cascade invalidation.
 *
 * "Une AGI Épistémique ne sait pas tout faire, mais sur la Vérité, elle est surhumaine."
 */

import { Injectable } from '@nestjs/common';
import {
  createLogger,
  generateId,
  KnowledgeLedgerAction,
  KnowledgeLedgerEntry,
  KnowledgeNode,
  CascadeInvalidationResult,
  MemoryState,
  EpistemicBranch,
  PriorityQueue,
  calculateEpistemicVelocity,
  getPriorityQueueForVelocity,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';

const logger = createLogger('KnowledgeLedgerService', 'info');

// Threshold for direct invalidation vs review scheduling
const STRONG_DEPENDENCY_THRESHOLD = 0.8;

// Max idle cycles before downgrading queue priority
const MAX_IDLE_BEFORE_DOWNGRADE = 3;

interface DependencyRow {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
  strength: number;
  created_at: Date;
}

interface KnowledgeNodeRow {
  id: string;
  statement: string;
  domain: string | null;
  tags: string[];
  current_state: string;
  epistemic_branch: string;
  confidence_score: number;
  epistemic_velocity: number;
  shapley_attribution: Record<string, number> | null;
  audit_trail: KnowledgeLedgerEntry[];
  priority_queue: string;
  last_scan: Date | null;
  next_scan: Date | null;
  idle_cycles: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class KnowledgeLedgerService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new knowledge node in the ledger
   */
  async createNode(
    statement: string,
    options?: {
      domain?: string;
      tags?: string[];
      initialState?: MemoryState;
      epistemicBranch?: EpistemicBranch;
      initialConfidence?: number;
      trigger?: string;
      agent?: string;
    }
  ): Promise<KnowledgeNode> {
    const id = generateId();
    const now = new Date();

    const initialState = options?.initialState ?? MemoryState.PENDING_PROOF;
    const epistemicBranch = options?.epistemicBranch ?? EpistemicBranch.HUGIN;
    const initialConfidence = options?.initialConfidence ?? 0;

    // Create initial audit trail entry
    const auditEntry: KnowledgeLedgerEntry = {
      timestamp: now.toISOString(),
      action: KnowledgeLedgerAction.CREATE,
      fromState: null,
      toState: initialState,
      trigger: options?.trigger ?? 'USER_QUERY',
      agent: options?.agent ?? 'HEIMDALL',
      reason: 'Initial knowledge node creation',
    };

    await this.db.$executeRaw`
      INSERT INTO knowledge_nodes (
        id, statement, domain, tags, current_state, epistemic_branch,
        confidence_score, epistemic_velocity, shapley_attribution,
        audit_trail, priority_queue, idle_cycles, created_at, updated_at
      ) VALUES (
        ${id},
        ${statement},
        ${options?.domain ?? null},
        ${options?.tags ?? []}::text[],
        ${initialState}::"MemoryState",
        ${epistemicBranch}::"EpistemicBranch",
        ${initialConfidence},
        0,
        ${JSON.stringify({})}::jsonb,
        ${JSON.stringify([auditEntry])}::jsonb,
        ${PriorityQueue.WARM}::"PriorityQueue",
        0,
        ${now},
        ${now}
      )
    `;

    logger.info('Knowledge node created', { id, statement: statement.substring(0, 50) });

    return this.getNode(id) as Promise<KnowledgeNode>;
  }

  /**
   * Get a knowledge node by ID
   */
  async getNode(id: string): Promise<KnowledgeNode | null> {
    const results = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, statement, domain, tags, current_state, epistemic_branch,
             confidence_score, epistemic_velocity, shapley_attribution,
             audit_trail, priority_queue, last_scan, next_scan, idle_cycles,
             created_at, updated_at
      FROM knowledge_nodes
      WHERE id = ${id}
    `;

    if (results.length === 0) {
      return null;
    }

    return this.rowToKnowledgeNode(results[0]!);
  }

  /**
   * Transition a knowledge node to a new state
   * Records the transition in the immutable audit trail
   */
  async transitionState(
    nodeId: string,
    newState: MemoryState,
    options: {
      trigger: string;
      agent: string;
      reason: string;
      newConfidence?: number;
      voteRecord?: Record<string, string>;
    }
  ): Promise<KnowledgeNode> {
    const node = await this.getNode(nodeId);
    if (!node) {
      throw new Error(`Knowledge node not found: ${nodeId}`);
    }

    const now = new Date();
    const oldConfidence = node.confidenceScore;
    const newConfidence = options.newConfidence ?? oldConfidence;

    // Calculate epistemic velocity if confidence changed
    let newVelocity = node.epistemicVelocity;
    let newPriorityQueue = node.watchConfig.priorityQueue;

    if (newConfidence !== oldConfidence) {
      const deltaTimeMs = now.getTime() - node.updatedAt.getTime();
      const velocity = calculateEpistemicVelocity(oldConfidence, newConfidence, deltaTimeMs);
      newVelocity = velocity.value;

      // Determine new priority queue based on velocity
      const queue = getPriorityQueueForVelocity(velocity);
      newPriorityQueue = queue;
    }

    // Create audit entry
    const auditEntry: KnowledgeLedgerEntry = {
      timestamp: now.toISOString(),
      action: KnowledgeLedgerAction.TRANSITION,
      fromState: node.currentState,
      toState: newState,
      trigger: options.trigger,
      agent: options.agent,
      confidenceDelta:
        newConfidence !== oldConfidence
          ? `${newConfidence > oldConfidence ? '+' : ''}${(newConfidence - oldConfidence).toFixed(2)}`
          : undefined,
      reason: options.reason,
      voteRecord: options.voteRecord,
    };

    // Update node with new state and append to audit trail
    const updatedAuditTrail = [...node.auditTrail, auditEntry];

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET current_state = ${newState}::"MemoryState",
          confidence_score = ${newConfidence},
          epistemic_velocity = ${newVelocity},
          priority_queue = ${newPriorityQueue}::"PriorityQueue",
          audit_trail = ${JSON.stringify(updatedAuditTrail)}::jsonb,
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;

    logger.info('Knowledge node state transition', {
      nodeId,
      from: node.currentState,
      to: newState,
      trigger: options.trigger,
    });

    return this.getNode(nodeId) as Promise<KnowledgeNode>;
  }

  /**
   * Add a dependency between two knowledge nodes
   */
  async addDependency(
    sourceId: string,
    targetId: string,
    relation: 'DERIVED_FROM' | 'ASSUMES' | 'SUPPORTS' | 'CONTRADICTS',
    strength: number = 1.0
  ): Promise<void> {
    const id = generateId();
    const now = new Date();

    await this.db.$executeRaw`
      INSERT INTO knowledge_dependencies (id, source_id, target_id, relation, strength, created_at)
      VALUES (${id}, ${sourceId}, ${targetId}, ${relation}, ${strength}, ${now})
      ON CONFLICT (source_id, target_id) DO UPDATE
      SET relation = ${relation}, strength = ${strength}
    `;

    logger.info('Knowledge dependency added', { sourceId, targetId, relation, strength });
  }

  /**
   * Get all nodes that depend on a given node
   */
  async getDependents(nodeId: string): Promise<Array<{ nodeId: string; strength: number }>> {
    const results = await this.db.$queryRaw<DependencyRow[]>`
      SELECT id, source_id, target_id, relation, strength, created_at
      FROM knowledge_dependencies
      WHERE source_id = ${nodeId}
    `;

    return results.map((row: DependencyRow) => ({
      nodeId: row.target_id,
      strength: row.strength,
    }));
  }

  /**
   * Cascade invalidation with strength-based propagation
   * Implements the AGI v2.0 cascade invalidation algorithm from YGGDRASIL-MASTER.md
   *
   * O(|V| + |E|) complexity
   */
  async cascadeInvalidate(
    sourceNodeId: string,
    invalidatedBy: string,
    reason: string
  ): Promise<CascadeInvalidationResult> {
    const startTime = Date.now();
    const invalidated = new Set<string>();
    const toReview = new Set<string>();
    const queue: string[] = [sourceNodeId];

    logger.info('Starting cascade invalidation', { sourceNodeId, reason });

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (invalidated.has(currentId)) {
        continue;
      }

      invalidated.add(currentId);

      // Transition the node to DEPRECATED state
      await this.transitionState(currentId, MemoryState.DEPRECATED, {
        trigger: `CASCADE_INVALIDATE:${sourceNodeId}`,
        agent: 'MUNIN',
        reason: currentId === sourceNodeId ? reason : `Cascade from ${sourceNodeId}: ${reason}`,
      });

      // Get all dependent nodes
      const dependents = await this.getDependents(currentId);

      for (const dependent of dependents) {
        if (invalidated.has(dependent.nodeId)) {
          continue;
        }

        if (dependent.strength >= STRONG_DEPENDENCY_THRESHOLD) {
          // Strong dependency: direct invalidation
          queue.push(dependent.nodeId);
        } else {
          // Weak dependency: schedule for review
          toReview.add(dependent.nodeId);
        }
      }
    }

    // Schedule weak dependencies for review (upgrade to HOT queue)
    for (const nodeId of toReview) {
      await this.scheduleReview(nodeId, PriorityQueue.HOT);
    }

    const duration = Date.now() - startTime;

    const result: CascadeInvalidationResult = {
      sourceNodeId,
      invalidatedCount: invalidated.size,
      reviewScheduledCount: toReview.size,
      invalidatedNodes: Array.from(invalidated),
      reviewScheduledNodes: Array.from(toReview),
      timestamp: new Date(),
      duration,
    };

    logger.info('Cascade invalidation complete', {
      sourceNodeId,
      invalidatedCount: invalidated.size,
      reviewScheduledCount: toReview.size,
      durationMs: duration,
    });

    return result;
  }

  /**
   * Schedule a node for review by updating its priority queue
   */
  async scheduleReview(nodeId: string, priorityQueue: PriorityQueue): Promise<void> {
    const node = await this.getNode(nodeId);
    if (!node) {
      throw new Error(`Knowledge node not found: ${nodeId}`);
    }

    const now = new Date();

    // Create audit entry for queue change
    const auditEntry: KnowledgeLedgerEntry = {
      timestamp: now.toISOString(),
      action: KnowledgeLedgerAction.QUEUE_CHANGE,
      fromState: node.currentState,
      toState: node.currentState,
      trigger: 'REVIEW_SCHEDULED',
      agent: 'MUNIN',
      reason: `Scheduled for review in ${priorityQueue} queue`,
    };

    const updatedAuditTrail = [...node.auditTrail, auditEntry];

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET priority_queue = ${priorityQueue}::"PriorityQueue",
          idle_cycles = 0,
          audit_trail = ${JSON.stringify(updatedAuditTrail)}::jsonb,
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;

    logger.info('Node scheduled for review', { nodeId, priorityQueue });
  }

  /**
   * Get nodes due for scanning based on priority queue
   */
  async getNodesDueForScan(
    priorityQueue: PriorityQueue,
    limit: number = 100
  ): Promise<KnowledgeNode[]> {
    const results = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, statement, domain, tags, current_state, epistemic_branch,
             confidence_score, epistemic_velocity, shapley_attribution,
             audit_trail, priority_queue, last_scan, next_scan, idle_cycles,
             created_at, updated_at
      FROM knowledge_nodes
      WHERE priority_queue = ${priorityQueue}::"PriorityQueue"
        AND current_state NOT IN ('DEPRECATED', 'REJECTED')
        AND (next_scan IS NULL OR next_scan <= NOW())
      ORDER BY next_scan ASC NULLS FIRST
      LIMIT ${limit}
    `;

    return results.map((row: KnowledgeNodeRow) => this.rowToKnowledgeNode(row));
  }

  /**
   * Update scan status after a node has been checked
   */
  async updateScanStatus(
    nodeId: string,
    result: {
      changed: boolean;
      newConfidence?: number;
    }
  ): Promise<void> {
    const node = await this.getNode(nodeId);
    if (!node) {
      throw new Error(`Knowledge node not found: ${nodeId}`);
    }

    const now = new Date();
    let newIdleCycles = result.changed ? 0 : node.watchConfig.idleCycles + 1;
    let newPriorityQueue = node.watchConfig.priorityQueue;

    // Downgrade queue if idle for too long
    if (newIdleCycles >= MAX_IDLE_BEFORE_DOWNGRADE) {
      if (newPriorityQueue === 'HOT') {
        newPriorityQueue = 'WARM';
        newIdleCycles = 0;
      } else if (newPriorityQueue === 'WARM') {
        newPriorityQueue = 'COLD';
        newIdleCycles = 0;
      }
    }

    // Calculate next scan time based on priority queue
    const intervalMs =
      newPriorityQueue === 'HOT'
        ? 60 * 60 * 1000 // 1 hour
        : newPriorityQueue === 'WARM'
          ? 24 * 60 * 60 * 1000 // 24 hours
          : 7 * 24 * 60 * 60 * 1000; // 7 days

    const nextScan = new Date(now.getTime() + intervalMs);

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET last_scan = ${now},
          next_scan = ${nextScan},
          idle_cycles = ${newIdleCycles},
          priority_queue = ${newPriorityQueue}::"PriorityQueue",
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;

    logger.debug('Scan status updated', { nodeId, changed: result.changed, newPriorityQueue });
  }

  /**
   * Get audit trail for a specific node
   */
  async getAuditTrail(nodeId: string): Promise<KnowledgeLedgerEntry[]> {
    const node = await this.getNode(nodeId);
    if (!node) {
      throw new Error(`Knowledge node not found: ${nodeId}`);
    }

    return node.auditTrail;
  }

  /**
   * Update Shapley attribution for a node after THING deliberation
   */
  async updateShapleyAttribution(
    nodeId: string,
    attribution: Record<string, number>
  ): Promise<void> {
    const now = new Date();

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET shapley_attribution = ${JSON.stringify(attribution)}::jsonb,
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;

    logger.info('Shapley attribution updated', { nodeId, attribution });
  }

  /**
   * Convert database row to KnowledgeNode
   */
  private rowToKnowledgeNode(row: KnowledgeNodeRow): KnowledgeNode {
    return {
      id: row.id,
      statement: row.statement,
      domain: row.domain ?? undefined,
      tags: row.tags,
      currentState: row.current_state,
      epistemicBranch: row.epistemic_branch,
      confidenceScore: row.confidence_score,
      epistemicVelocity: row.epistemic_velocity,
      dependencies: [], // Loaded separately if needed
      dependents: [], // Loaded separately if needed
      shapleyAttribution: row.shapley_attribution ?? {},
      auditTrail: row.audit_trail,
      watchConfig: {
        priorityQueue: row.priority_queue as 'HOT' | 'WARM' | 'COLD',
        scanIntervalHours:
          row.priority_queue === 'HOT' ? 1 : row.priority_queue === 'WARM' ? 24 : 168,
        lastScan: row.last_scan,
        nextScan: row.next_scan,
        idleCycles: row.idle_cycles,
        maxIdleBeforeDowngrade: MAX_IDLE_BEFORE_DOWNGRADE,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
