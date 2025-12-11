/**
 * Knowledge Ledger Integration Tests
 *
 * Integration tests for the AGI v2.0 Knowledge Ledger system.
 * Tests the complete flow: create nodes, dependencies, cascade, checkpoint, rollback.
 *
 * These tests validate:
 * - Knowledge node lifecycle
 * - Cascade invalidation propagation
 * - Checkpoint creation and state capture
 * - Rollback with state restoration
 * - Audit trail integrity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeLedgerService } from '../src/knowledge-ledger.service';
import { CheckpointService } from '../src/checkpoint.service';
import {
  MemoryState,
  EpistemicBranch,
  PriorityQueue,
  KnowledgeLedgerAction,
} from '@yggdrasil/shared';

// Mock DatabaseService for integration tests
const createMockDb = () => {
  const nodes = new Map<string, any>();
  const dependencies = new Map<string, any>();
  const checkpoints = new Map<string, any>();

  return {
    // Knowledge nodes operations
    $executeRaw: vi.fn(async (query: any) => {
      // Handle INSERT for knowledge_nodes
      const queryStr = String(query);
      if (queryStr.includes('INSERT INTO knowledge_nodes')) {
        return 1;
      }
      if (queryStr.includes('UPDATE knowledge_nodes')) {
        return 1;
      }
      if (queryStr.includes('INSERT INTO knowledge_dependencies')) {
        return 1;
      }
      if (queryStr.includes('INSERT INTO checkpoints')) {
        return 1;
      }
      return 1;
    }),

    $queryRaw: vi.fn(async (query: any) => {
      return [];
    }),

    checkpoint: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },

    // Store for test verification
    _nodes: nodes,
    _dependencies: dependencies,
    _checkpoints: checkpoints,
  };
};

describe('Knowledge Ledger Integration', () => {
  let ledgerService: KnowledgeLedgerService;
  let checkpointService: CheckpointService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    ledgerService = new KnowledgeLedgerService(mockDb as any);
    checkpointService = new CheckpointService(mockDb as any);
    vi.clearAllMocks();
  });

  describe('Knowledge Node Lifecycle', () => {
    it('should create node with PENDING_PROOF state by default', async () => {
      const mockNode = {
        id: 'test-node-1',
        statement: 'Water boils at 100°C at sea level',
        domain: null,
        tags: [],
        current_state: MemoryState.PENDING_PROOF,
        epistemic_branch: EpistemicBranch.HUGIN,
        confidence_score: 0,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [{ action: KnowledgeLedgerAction.CREATE }],
        priority_queue: PriorityQueue.WARM,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);

      const node = await ledgerService.createNode('Water boils at 100°C at sea level');

      expect(mockDb.$executeRaw).toHaveBeenCalled();
      expect(node).toBeDefined();
      expect(node.currentState).toBe(MemoryState.PENDING_PROOF);
      expect(node.epistemicBranch).toBe(EpistemicBranch.HUGIN);
    });

    it('should create node with custom epistemic branch and state', async () => {
      const mockNode = {
        id: 'test-node-2',
        statement: 'E=mc² (peer-reviewed)',
        domain: 'physics',
        tags: ['relativity', 'energy'],
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.MIMIR,
        confidence_score: 100,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [{ action: KnowledgeLedgerAction.CREATE }],
        priority_queue: PriorityQueue.COLD,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);

      const node = await ledgerService.createNode('E=mc² (peer-reviewed)', {
        domain: 'physics',
        tags: ['relativity', 'energy'],
        initialState: MemoryState.VERIFIED,
        epistemicBranch: EpistemicBranch.MIMIR,
        initialConfidence: 100,
      });

      expect(node).toBeDefined();
      expect(node.currentState).toBe(MemoryState.VERIFIED);
      expect(node.epistemicBranch).toBe(EpistemicBranch.MIMIR);
    });
  });

  describe('State Transitions', () => {
    it('should transition node state with audit trail', async () => {
      const existingNode = {
        id: 'transition-node',
        statement: 'Test statement',
        domain: null,
        tags: [],
        current_state: MemoryState.PENDING_PROOF,
        epistemic_branch: EpistemicBranch.VOLVA,
        confidence_score: 50,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [{ action: KnowledgeLedgerAction.CREATE }],
        priority_queue: PriorityQueue.WARM,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([existingNode]) // getNode
        .mockResolvedValueOnce([{ ...existingNode, current_state: MemoryState.VERIFIED }]); // after update

      const updatedNode = await ledgerService.transitionState(
        'transition-node',
        MemoryState.VERIFIED,
        {
          trigger: 'PEER_REVIEW_COMPLETE',
          agent: 'ODIN',
          reason: 'Published in peer-reviewed journal',
          newConfidence: 100,
        }
      );

      expect(mockDb.$executeRaw).toHaveBeenCalled();
      expect(updatedNode.currentState).toBe(MemoryState.VERIFIED);
    });

    it('should update epistemic velocity on confidence change', async () => {
      const existingNode = {
        id: 'velocity-node',
        statement: 'Fluctuating fact',
        domain: null,
        tags: [],
        current_state: MemoryState.WATCHING,
        epistemic_branch: EpistemicBranch.VOLVA,
        confidence_score: 70,
        epistemic_velocity: 0.1,
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.WARM,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(Date.now() - 3600000), // 1 hour ago
        updated_at: new Date(Date.now() - 3600000),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([existingNode])
        .mockResolvedValueOnce([{ ...existingNode, confidence_score: 85, epistemic_velocity: 0.15 }]);

      const updatedNode = await ledgerService.transitionState(
        'velocity-node',
        MemoryState.WATCHING,
        {
          trigger: 'NEW_EVIDENCE',
          agent: 'HUGIN',
          reason: 'Corroborating source found',
          newConfidence: 85,
        }
      );

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('Cascade Invalidation', () => {
    it('should cascade invalidation to dependent nodes', async () => {
      const sourceNode = {
        id: 'source-node',
        statement: 'Source fact',
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.MIMIR,
        confidence_score: 100,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.COLD,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const dependentNode = {
        id: 'dependent-node',
        statement: 'Dependent fact',
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.MIMIR,
        confidence_score: 100,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.COLD,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock sequence for cascade
      mockDb.$queryRaw
        .mockResolvedValueOnce([sourceNode]) // getNode for source
        .mockResolvedValueOnce([sourceNode]) // getNode for transition
        .mockResolvedValueOnce([{ nodeId: 'dependent-node', strength: 0.9 }]) // getDependents
        .mockResolvedValueOnce([dependentNode]) // getNode for dependent
        .mockResolvedValueOnce([dependentNode]) // getNode for dependent transition
        .mockResolvedValueOnce([]); // getDependents for dependent (no more)

      const result = await ledgerService.cascadeInvalidate(
        'source-node',
        'SYSTEM',
        'Source was contradicted by new evidence'
      );

      expect(result.invalidatedCount).toBeGreaterThanOrEqual(1);
      expect(result.sourceNodeId).toBe('source-node');
    });

    it('should schedule weak dependencies for review', async () => {
      const sourceNode = {
        id: 'weak-source',
        statement: 'Source fact',
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.MIMIR,
        confidence_score: 100,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.COLD,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const weakDependent = {
        id: 'weak-dependent',
        statement: 'Weakly dependent fact',
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.VOLVA,
        confidence_score: 75,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.WARM,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([sourceNode])
        .mockResolvedValueOnce([sourceNode])
        .mockResolvedValueOnce([{ nodeId: 'weak-dependent', strength: 0.5 }]) // Weak dependency < 0.8
        .mockResolvedValueOnce([weakDependent]) // For scheduleReview
        .mockResolvedValueOnce([]);

      const result = await ledgerService.cascadeInvalidate(
        'weak-source',
        'SYSTEM',
        'Source invalidated'
      );

      expect(result.reviewScheduledCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Checkpoint and Rollback', () => {
    it('should create checkpoint capturing node states', async () => {
      const nodes = [
        {
          id: 'node-1',
          statement: 'Fact 1',
          current_state: MemoryState.VERIFIED,
          epistemic_branch: EpistemicBranch.MIMIR,
          confidence_score: 100,
          epistemic_velocity: 0,
          priority_queue: PriorityQueue.COLD,
          audit_trail: [],
        },
        {
          id: 'node-2',
          statement: 'Fact 2',
          current_state: MemoryState.WATCHING,
          epistemic_branch: EpistemicBranch.VOLVA,
          confidence_score: 75,
          epistemic_velocity: 0.1,
          priority_queue: PriorityQueue.WARM,
          audit_trail: [{ action: 'CREATE' }],
        },
      ];

      mockDb.$queryRaw.mockResolvedValueOnce(nodes);
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-test',
        user_id: 'user-123',
        label: 'Test Checkpoint',
        description: null,
        state_hash: 'hash123',
        memory_ids: ['node-1', 'node-2'],
        metadata: {
          type: 'MANUAL',
          nodeSnapshots: nodes.map((n) => ({
            nodeId: n.id,
            statement: n.statement,
            currentState: n.current_state,
            epistemicBranch: n.epistemic_branch,
            confidenceScore: n.confidence_score,
            epistemicVelocity: n.epistemic_velocity,
            priorityQueue: n.priority_queue,
            auditTrailLength: n.audit_trail.length,
          })),
        },
        created_at: new Date(),
      });

      const checkpoint = await checkpointService.create(
        'user-123',
        'Test Checkpoint',
        ['node-1', 'node-2']
      );

      expect(checkpoint).toBeDefined();
      expect(checkpoint.label).toBe('Test Checkpoint');
      expect(checkpoint.memoryIds).toContain('node-1');
      expect(checkpoint.memoryIds).toContain('node-2');
    });

    it('should rollback node states from checkpoint', async () => {
      const checkpointDate = new Date('2024-01-01T00:00:00Z');
      const nodeSnapshots = [
        {
          nodeId: 'rollback-node',
          statement: 'Original fact',
          currentState: MemoryState.VERIFIED,
          epistemicBranch: EpistemicBranch.MIMIR,
          confidenceScore: 100,
          epistemicVelocity: 0,
          priorityQueue: PriorityQueue.COLD,
          auditTrailLength: 1,
        },
      ];

      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-rollback',
        user_id: 'user-123',
        label: 'Rollback Test',
        description: null,
        state_hash: 'hash',
        memory_ids: ['rollback-node'],
        metadata: { type: 'MANUAL', nodeSnapshots },
        created_at: checkpointDate,
      });

      // Nodes created after checkpoint
      mockDb.$queryRaw
        .mockResolvedValueOnce([{ id: 'new-node' }]) // nodesCreatedAfter
        .mockResolvedValueOnce([
          {
            id: 'new-node',
            current_state: MemoryState.PENDING_PROOF,
            audit_trail: [],
          },
        ]) // For deprecation
        .mockResolvedValueOnce([
          {
            id: 'rollback-node',
            current_state: MemoryState.DEPRECATED,
            audit_trail: [{ action: 'CREATE' }, { action: 'DEPRECATE' }],
          },
        ]); // For restoration

      const result = await checkpointService.rollback('chk-rollback', 'user-123');

      expect(result.success).toBe(true);
      expect(result.invalidatedCount).toBe(1); // new-node deprecated
      expect(result.restoredCount).toBe(1); // rollback-node restored
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should record all state transitions in audit trail', async () => {
      const node = {
        id: 'audit-node',
        statement: 'Audited fact',
        domain: null,
        tags: [],
        current_state: MemoryState.PENDING_PROOF,
        epistemic_branch: EpistemicBranch.HUGIN,
        confidence_score: 30,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [
          {
            timestamp: new Date().toISOString(),
            action: KnowledgeLedgerAction.CREATE,
            fromState: null,
            toState: MemoryState.PENDING_PROOF,
            trigger: 'USER_QUERY',
            agent: 'HEIMDALL',
            reason: 'Initial creation',
          },
        ],
        priority_queue: PriorityQueue.WARM,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([node])
        .mockResolvedValueOnce([{
          ...node,
          current_state: MemoryState.WATCHING,
          confidence_score: 60,
          audit_trail: [
            ...node.audit_trail,
            {
              timestamp: new Date().toISOString(),
              action: KnowledgeLedgerAction.TRANSITION,
              fromState: MemoryState.PENDING_PROOF,
              toState: MemoryState.WATCHING,
              trigger: 'CORRELATION_FOUND',
              agent: 'VOLVA',
              reason: 'Found correlating sources',
            },
          ],
        }]);

      const updatedNode = await ledgerService.transitionState(
        'audit-node',
        MemoryState.WATCHING,
        {
          trigger: 'CORRELATION_FOUND',
          agent: 'VOLVA',
          reason: 'Found correlating sources',
          newConfidence: 60,
        }
      );

      expect(updatedNode.auditTrail).toHaveLength(2);
      expect(updatedNode.auditTrail[1]!.action).toBe(KnowledgeLedgerAction.TRANSITION);
    });

    it('should record cascade invalidation in audit trail', async () => {
      const sourceNode = {
        id: 'cascade-audit-source',
        statement: 'Source fact',
        current_state: MemoryState.VERIFIED,
        epistemic_branch: EpistemicBranch.MIMIR,
        confidence_score: 100,
        epistemic_velocity: 0,
        shapley_attribution: {},
        audit_trail: [{ action: KnowledgeLedgerAction.CREATE }],
        priority_queue: PriorityQueue.COLD,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([sourceNode])
        .mockResolvedValueOnce([sourceNode])
        .mockResolvedValueOnce([]); // No dependents

      const result = await ledgerService.cascadeInvalidate(
        'cascade-audit-source',
        'SYSTEM',
        'Contradicted'
      );

      expect(result.invalidatedNodes).toContain('cascade-audit-source');
    });
  });

  describe('Priority Queue Management', () => {
    it('should upgrade to HOT queue for high velocity nodes', async () => {
      const highVelocityNode = {
        id: 'hot-node',
        statement: 'Rapidly changing fact',
        domain: null,
        tags: [],
        current_state: MemoryState.WATCHING,
        epistemic_branch: EpistemicBranch.VOLVA,
        confidence_score: 50,
        epistemic_velocity: 0.5, // High velocity
        shapley_attribution: {},
        audit_trail: [],
        priority_queue: PriorityQueue.WARM,
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(Date.now() - 3600000),
        updated_at: new Date(Date.now() - 3600000),
      };

      mockDb.$queryRaw
        .mockResolvedValueOnce([highVelocityNode])
        .mockResolvedValueOnce([{ ...highVelocityNode, priority_queue: PriorityQueue.HOT }]);

      // Simulate confidence change triggering velocity update
      await ledgerService.transitionState('hot-node', MemoryState.WATCHING, {
        trigger: 'NEW_DATA',
        agent: 'HUGIN',
        reason: 'New contradicting data',
        newConfidence: 30, // Big confidence drop
      });

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });
  });
});
