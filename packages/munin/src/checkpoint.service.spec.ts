/**
 * Checkpoint Service Tests
 *
 * Tests for checkpoint creation and rollback functionality.
 * Supports the Reversibility pillar (Pilier V) of YGGDRASIL.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckpointService } from './checkpoint.service';
import { NotFoundError, MemoryState, KnowledgeLedgerAction } from '@yggdrasil/shared';

// Mock DatabaseService
const mockDb = {
  checkpoint: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

describe('CheckpointService', () => {
  let service: CheckpointService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckpointService(mockDb as any);
  });

  describe('create', () => {
    it('should create a checkpoint with node snapshots', async () => {
      const userId = 'user-123';
      const label = 'Test Checkpoint';
      const nodeIds = ['node-1', 'node-2'];

      // Mock node query
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'node-1',
          statement: 'Fact 1',
          current_state: MemoryState.VERIFIED,
          epistemic_branch: 'MIMIR',
          confidence_score: 100,
          epistemic_velocity: 0,
          priority_queue: 'COLD',
          audit_trail: [],
        },
        {
          id: 'node-2',
          statement: 'Fact 2',
          current_state: MemoryState.WATCHING,
          epistemic_branch: 'VOLVA',
          confidence_score: 75,
          epistemic_velocity: 0.1,
          priority_queue: 'WARM',
          audit_trail: [{ action: 'CREATE' }],
        },
      ]);

      // Mock checkpoint creation
      mockDb.checkpoint.create.mockResolvedValueOnce({});

      // Mock getById after creation
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-test',
        user_id: userId,
        label,
        description: null,
        state_hash: 'abc123',
        memory_ids: nodeIds,
        metadata: { type: 'MANUAL', nodeSnapshots: [] },
        created_at: new Date(),
      });

      const result = await service.create(userId, label, nodeIds);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.label).toBe(label);
      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1); // Uses raw SQL for JSON handling
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('should handle empty node list', async () => {
      const userId = 'user-123';
      const label = 'Empty Checkpoint';

      mockDb.$executeRaw.mockResolvedValueOnce(1);
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-empty',
        user_id: userId,
        label,
        description: null,
        state_hash: 'empty',
        memory_ids: [],
        metadata: { type: 'MANUAL', nodeSnapshots: [] },
        created_at: new Date(),
      });

      const result = await service.create(userId, label, []);

      expect(result).toBeDefined();
      expect(result.memoryIds).toEqual([]);
    });
  });

  describe('createPreCascadeCheckpoint', () => {
    it('should create pre-cascade checkpoint with correct metadata', async () => {
      const userId = 'user-123';
      const sourceNodeId = 'source-node';
      const affectedNodeIds = ['affected-1', 'affected-2'];

      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          id: 'source-node',
          statement: 'Source',
          current_state: MemoryState.VERIFIED,
          epistemic_branch: 'MIMIR',
          confidence_score: 100,
          epistemic_velocity: 0,
          priority_queue: 'COLD',
          audit_trail: [],
        },
      ]);

      mockDb.$executeRaw.mockResolvedValueOnce(1);
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-cascade',
        user_id: userId,
        label: `Pre-cascade: ${sourceNodeId}`,
        description: `Automatic checkpoint before cascade invalidation from node ${sourceNodeId}`,
        state_hash: 'hash',
        memory_ids: [sourceNodeId, ...affectedNodeIds],
        metadata: {
          type: 'PRE_CASCADE',
          sourceNodeId,
          affectedCount: affectedNodeIds.length,
          nodeSnapshots: [],
        },
        created_at: new Date(),
      });

      const result = await service.createPreCascadeCheckpoint(
        userId,
        sourceNodeId,
        affectedNodeIds
      );

      expect(result).toBeDefined();
      expect(result.label).toContain('Pre-cascade');
      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1); // Uses raw SQL for JSON handling
    });
  });

  describe('getById', () => {
    it('should return checkpoint when found', async () => {
      const checkpointId = 'chk-123';
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: checkpointId,
        user_id: 'user-123',
        label: 'Test',
        description: 'Test checkpoint',
        state_hash: 'hash',
        memory_ids: ['node-1'],
        metadata: {},
        created_at: new Date(),
      });

      const result = await service.getById(checkpointId);

      expect(result).toBeDefined();
      expect(result.id).toBe(checkpointId);
    });

    it('should throw NotFoundError when checkpoint not found', async () => {
      mockDb.checkpoint.findUnique.mockResolvedValueOnce(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listForUser', () => {
    it('should return checkpoints sorted by creation date', async () => {
      const userId = 'user-123';
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);

      mockDb.checkpoint.findMany.mockResolvedValueOnce([
        {
          id: 'chk-2',
          user_id: userId,
          label: 'Recent',
          description: null,
          state_hash: 'hash2',
          memory_ids: [],
          metadata: {},
          created_at: now,
        },
        {
          id: 'chk-1',
          user_id: userId,
          label: 'Earlier',
          description: null,
          state_hash: 'hash1',
          memory_ids: [],
          metadata: {},
          created_at: earlier,
        },
      ]);

      const result = await service.listForUser(userId);

      expect(result).toHaveLength(2);
      expect(mockDb.checkpoint.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should respect limit option', async () => {
      mockDb.checkpoint.findMany.mockResolvedValueOnce([]);

      await service.listForUser('user-123', { limit: 10 });

      expect(mockDb.checkpoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe('rollback', () => {
    it('should restore node states from checkpoint', async () => {
      const checkpointId = 'chk-rollback';
      const userId = 'user-123';
      const checkpointDate = new Date('2024-01-01');

      const nodeSnapshot = {
        nodeId: 'node-1',
        statement: 'Original fact',
        currentState: MemoryState.VERIFIED,
        epistemicBranch: 'MIMIR',
        confidenceScore: 100,
        epistemicVelocity: 0,
        priorityQueue: 'COLD',
        auditTrailLength: 1,
      };

      // Mock getById
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: checkpointId,
        user_id: userId,
        label: 'Rollback Test',
        description: null,
        state_hash: 'hash',
        memory_ids: ['node-1'],
        metadata: {
          type: 'MANUAL',
          nodeSnapshots: [nodeSnapshot],
        },
        created_at: checkpointDate,
      });

      // Mock nodes created after checkpoint
      mockDb.$queryRaw
        .mockResolvedValueOnce([{ id: 'new-node-1' }]) // nodesCreatedAfter
        .mockResolvedValueOnce([
          // deprecateNodeForRollback query
          {
            id: 'new-node-1',
            current_state: MemoryState.PENDING_PROOF,
            audit_trail: [],
          },
        ])
        .mockResolvedValueOnce([
          // restoreNodeState query
          {
            id: 'node-1',
            current_state: MemoryState.DEPRECATED,
            audit_trail: [{ action: 'CREATE' }],
          },
        ]);

      mockDb.$executeRaw.mockResolvedValue(1);

      const result = await service.rollback(checkpointId, userId);

      expect(result.success).toBe(true);
      expect(result.checkpointId).toBe(checkpointId);
      expect(result.invalidatedCount).toBe(1); // new-node-1 deprecated
      expect(result.restoredCount).toBe(1); // node-1 restored
    });

    it('should reject rollback from different user', async () => {
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-123',
        user_id: 'user-123',
        label: 'Test',
        description: null,
        state_hash: 'hash',
        memory_ids: [],
        metadata: { nodeSnapshots: [] },
        created_at: new Date(),
      });

      await expect(service.rollback('chk-123', 'different-user')).rejects.toThrow('Unauthorized');
    });

    it('should handle empty nodeSnapshots gracefully', async () => {
      const checkpointId = 'chk-empty';
      const userId = 'user-123';

      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: checkpointId,
        user_id: userId,
        label: 'Empty',
        description: null,
        state_hash: 'hash',
        memory_ids: [],
        metadata: { type: 'MANUAL' }, // No nodeSnapshots
        created_at: new Date(),
      });

      const result = await service.rollback(checkpointId, userId);

      expect(result.success).toBe(true);
      expect(result.invalidatedCount).toBe(0);
      expect(result.restoredCount).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete checkpoint for authorized user', async () => {
      const checkpointId = 'chk-delete';
      const userId = 'user-123';

      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: checkpointId,
        user_id: userId,
        label: 'To Delete',
        description: null,
        state_hash: 'hash',
        memory_ids: [],
        metadata: {},
        created_at: new Date(),
      });

      mockDb.checkpoint.delete.mockResolvedValueOnce({});

      await service.delete(checkpointId, userId);

      expect(mockDb.checkpoint.delete).toHaveBeenCalledWith({
        where: { id: checkpointId },
      });
    });

    it('should reject deletion from different user', async () => {
      mockDb.checkpoint.findUnique.mockResolvedValueOnce({
        id: 'chk-123',
        user_id: 'user-123',
        label: 'Test',
        description: null,
        state_hash: 'hash',
        memory_ids: [],
        metadata: {},
        created_at: new Date(),
      });

      await expect(service.delete('chk-123', 'different-user')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getCount', () => {
    it('should return checkpoint count for user', async () => {
      mockDb.checkpoint.count.mockResolvedValueOnce(5);

      const count = await service.getCount('user-123');

      expect(count).toBe(5);
      expect(mockDb.checkpoint.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
