/**
 * Knowledge Ledger Service Tests
 *
 * Tests for MUNIN Knowledge Ledger and cascade invalidation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeLedgerService } from './knowledge-ledger.service.js';
import {
  MemoryState,
  EpistemicBranch,
  PriorityQueue,
  KnowledgeLedgerAction,
} from '@yggdrasil/shared';

// Mock DatabaseService
const mockDb = {
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
};

describe('KnowledgeLedgerService', () => {
  let service: KnowledgeLedgerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KnowledgeLedgerService(mockDb as any);
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createNode', () => {
    it('should create a knowledge node with defaults', async () => {
      const statement = 'The speed of light is 299,792,458 m/s';

      // Mock the getNode call that happens after insert
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'test-id',
          statement,
          domain: null,
          tags: [],
          current_state: 'PENDING_PROOF',
          epistemic_branch: 'HUGIN',
          confidence_score: 0,
          epistemic_velocity: 0,
          shapley_attribution: null,
          audit_trail: [
            {
              timestamp: new Date().toISOString(),
              action: 'CREATE',
              fromState: null,
              toState: 'PENDING_PROOF',
              trigger: 'USER_QUERY',
              agent: 'HEIMDALL',
              reason: 'Initial knowledge node creation',
            },
          ],
          priority_queue: 'WARM',
          last_scan: null,
          next_scan: null,
          idle_cycles: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.createNode(statement);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.statement).toBe(statement);
      expect(result.currentState).toBe(MemoryState.PENDING_PROOF);
      expect(result.epistemicBranch).toBe(EpistemicBranch.HUGIN);
      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });

    it('should create node with custom options', async () => {
      const statement = 'Water boils at 100°C at sea level';

      // Mock the getNode call that happens after insert
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'test-id',
          statement,
          domain: 'physics',
          tags: ['thermodynamics', 'water'],
          current_state: 'VERIFIED',
          epistemic_branch: 'MIMIR',
          confidence_score: 100,
          epistemic_velocity: 0,
          shapley_attribution: null,
          audit_trail: [
            {
              timestamp: new Date().toISOString(),
              action: 'CREATE',
              fromState: null,
              toState: 'VERIFIED',
              trigger: 'SCIENTIFIC_SOURCE',
              agent: 'MIMIR',
              reason: 'Initial knowledge node creation',
            },
          ],
          priority_queue: 'WARM',
          last_scan: null,
          next_scan: null,
          idle_cycles: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.createNode(statement, {
        domain: 'physics',
        tags: ['thermodynamics', 'water'],
        initialState: MemoryState.VERIFIED,
        epistemicBranch: EpistemicBranch.MIMIR,
        initialConfidence: 100,
        trigger: 'SCIENTIFIC_SOURCE',
        agent: 'MIMIR',
      });

      expect(result.currentState).toBe(MemoryState.VERIFIED);
      expect(result.epistemicBranch).toBe(EpistemicBranch.MIMIR);
      expect(result.confidenceScore).toBe(100);
    });

    it('should include audit trail entry for creation', async () => {
      const statement = 'Test statement';

      // Mock the getNode call that happens after insert
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'test-id',
          statement,
          domain: null,
          tags: [],
          current_state: 'PENDING_PROOF',
          epistemic_branch: 'HUGIN',
          confidence_score: 0,
          epistemic_velocity: 0,
          shapley_attribution: null,
          audit_trail: [
            {
              timestamp: new Date().toISOString(),
              action: 'CREATE',
              fromState: null,
              toState: 'PENDING_PROOF',
              trigger: 'USER_QUERY',
              agent: 'HEIMDALL',
              reason: 'Initial knowledge node creation',
            },
          ],
          priority_queue: 'WARM',
          last_scan: null,
          next_scan: null,
          idle_cycles: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const result = await service.createNode(statement);

      expect(result.auditTrail).toHaveLength(1);
      expect(result.auditTrail[0]!.action).toBe(KnowledgeLedgerAction.CREATE);
      expect(result.auditTrail[0]!.toState).toBe(MemoryState.PENDING_PROOF);
    });
  });

  describe('getNode', () => {
    it('should return null for non-existent node', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getNode('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return node when found', async () => {
      const mockNode = {
        id: 'test-id',
        statement: 'Test statement',
        domain: 'test',
        tags: ['test'],
        current_state: 'VERIFIED',
        epistemic_branch: 'MIMIR',
        confidence_score: 95,
        epistemic_velocity: 0.001,
        shapley_attribution: null,
        audit_trail: [],
        priority_queue: 'COLD',
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);

      const result = await service.getNode('test-id');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('test-id');
      expect(result!.currentState).toBe('VERIFIED');
    });
  });

  describe('transitionState', () => {
    it('should call database for state transition', async () => {
      const mockNode = {
        id: 'test-id',
        statement: 'Test statement',
        domain: 'test',
        tags: [],
        current_state: 'PENDING_PROOF',
        epistemic_branch: 'VOLVA',
        confidence_score: 60,
        epistemic_velocity: 0.002,
        shapley_attribution: null,
        audit_trail: [],
        priority_queue: 'WARM',
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // First call gets the node, second returns the updated node
      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);
      mockDb.$queryRaw.mockResolvedValueOnce([{ ...mockNode, current_state: 'VERIFIED', confidence_score: 95 }]);

      await service.transitionState(
        'test-id',
        MemoryState.VERIFIED,
        {
          trigger: 'COUNCIL_DELIBERATION',
          agent: 'THING',
          reason: 'Consensus reached',
          newConfidence: 95,
        }
      );

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });

    it('should reject transition for non-existent node', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.transitionState('non-existent', MemoryState.VERIFIED, {
          trigger: 'TEST',
          agent: 'TEST',
          reason: 'Test reason',
        })
      ).rejects.toThrow('Knowledge node not found');
    });

    it('should call database for transition with audit trail', async () => {
      const mockNode = {
        id: 'test-id',
        statement: 'Test statement',
        domain: 'test',
        tags: [],
        current_state: 'WATCHING',
        epistemic_branch: 'HUGIN',
        confidence_score: 40,
        epistemic_velocity: 0.005,
        shapley_attribution: null,
        audit_trail: [
          {
            timestamp: new Date().toISOString(),
            action: 'CREATE',
            fromState: null,
            toState: 'WATCHING',
            trigger: 'INITIAL',
            agent: 'SYSTEM',
          },
        ],
        priority_queue: 'HOT',
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);
      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]); // For getNode after update

      await service.transitionState(
        'test-id',
        MemoryState.REJECTED,
        {
          trigger: 'CONTRADICTION_DETECTED',
          agent: 'HUGIN',
          reason: 'Multiple sources contradict this claim',
        }
      );

      // Verify database was called
      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('cascadeInvalidate', () => {
    it('should return cascade invalidation result', async () => {
      // Mock the node for transitionState
      const mockNode = {
        id: 'source-id',
        statement: 'Test statement',
        domain: 'test',
        tags: [],
        current_state: 'VERIFIED',
        epistemic_branch: 'MIMIR',
        confidence_score: 80,
        epistemic_velocity: 0.001,
        shapley_attribution: null,
        audit_trail: [],
        priority_queue: 'WARM',
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // First call: getNode in transitionState
      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);
      // Second call: getNode after update
      mockDb.$queryRaw.mockResolvedValueOnce([{ ...mockNode, current_state: 'DEPRECATED' }]);
      // Third call: getDependents (empty - no cascade)
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.cascadeInvalidate(
        'source-id',
        'HUGIN',
        'Source was contradicted'
      );

      // Verify result structure
      expect(result.sourceNodeId).toBe('source-id');
      expect(result.invalidatedNodes).toBeDefined();
      expect(result.reviewScheduledNodes).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('scheduleReview', () => {
    it('should schedule node for review in HOT queue', async () => {
      const mockNode = {
        id: 'test-id',
        statement: 'Test statement',
        domain: 'test',
        tags: [],
        current_state: 'VERIFIED',
        epistemic_branch: 'MIMIR',
        confidence_score: 80,
        epistemic_velocity: 0.001,
        shapley_attribution: null,
        audit_trail: [],
        priority_queue: 'COLD',
        last_scan: null,
        next_scan: null,
        idle_cycles: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockNode]);

      await service.scheduleReview('test-id', PriorityQueue.HOT);

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('addDependency', () => {
    it('should add dependency between nodes', async () => {
      await service.addDependency(
        'source-id',
        'target-id',
        'SUPPORTS',
        0.85
      );

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });

    it('should use default strength of 1.0', async () => {
      await service.addDependency('source-id', 'target-id', 'ASSUMES');

      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getDependents', () => {
    it('should return nodes that depend on given node', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([
        { id: 'd1', source_id: 'source', target_id: 'dependent1', relation: 'SUPPORTS', strength: 0.9, created_at: new Date() },
        { id: 'd2', source_id: 'source', target_id: 'dependent2', relation: 'DERIVED_FROM', strength: 0.7, created_at: new Date() },
      ]);

      const result = await service.getDependents('source');

      expect(result).toHaveLength(2);
      expect(result[0]!.nodeId).toBe('dependent1');
    });

    it('should return empty array when no dependents', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getDependents('source');

      expect(result).toHaveLength(0);
    });
  });

  describe('getNodesDueForScan', () => {
    it('should return nodes due for scan in given priority queue', async () => {
      const mockNodes = [
        {
          id: 'hot-node',
          statement: 'Hot node',
          domain: 'test',
          tags: [],
          current_state: 'WATCHING',
          epistemic_branch: 'HUGIN',
          confidence_score: 55,
          epistemic_velocity: 0.01,
          shapley_attribution: null,
          audit_trail: [],
          priority_queue: 'HOT',
          last_scan: null,
          next_scan: new Date(Date.now() - 1000),
          idle_cycles: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDb.$queryRaw.mockResolvedValueOnce(mockNodes);

      const result = await service.getNodesDueForScan(PriorityQueue.HOT, 10);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('hot-node');
    });
  });
});
