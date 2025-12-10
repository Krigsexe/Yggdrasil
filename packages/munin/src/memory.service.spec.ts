/**
 * Memory Service Tests
 *
 * Tests for MUNIN's chrono-semantic memory system.
 * Uses mock DatabaseService for unit testing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryService } from './memory.service.js';
import { EmbeddingService } from './embedding.service.js';
import { MemoryType } from '@yggdrasil/shared';

// Mock DatabaseService
const createMockDb = () => {
  const memories = new Map<string, unknown>();
  const dependencies = new Map<string, { memoryId: string; dependsOnId: string }>();

  return {
    $executeRaw: vi.fn().mockImplementation(async () => {
      // Simulates raw query execution
      return 1;
    }),
    $queryRaw: vi.fn().mockImplementation(async () => {
      // Returns empty array by default
      return [];
    }),
    $queryRawUnsafe: vi.fn().mockImplementation(async () => {
      return [];
    }),
    memory: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    memoryDependency: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    _memories: memories,
    _dependencies: dependencies,
  };
};

describe('MemoryService', () => {
  let service: MemoryService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    const embedding = new EmbeddingService();
    mockDb = createMockDb();
    service = new MemoryService(mockDb as any, embedding);
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a memory entry', async () => {
      const memory = await service.create(
        'test-user',
        MemoryType.INTERACTION,
        { query: 'What is the speed of light?' }
      );

      expect(memory).toBeDefined();
      expect(memory.id).toBeDefined();
      expect(memory.userId).toBe('test-user');
      expect(memory.type).toBe(MemoryType.INTERACTION);
      expect(mockDb.$executeRaw).toHaveBeenCalled();
    });

    it('should generate embedding for content', async () => {
      const memory = await service.create(
        'test-user',
        MemoryType.DECISION,
        { decision: 'approve' }
      );

      expect(memory.embedding).toBeDefined();
      expect(memory.embedding?.length).toBe(1536);
    });

    it('should handle options correctly', async () => {
      const memory = await service.create(
        'test-user',
        MemoryType.INTERACTION,
        { test: true },
        {
          sessionId: 'session-123',
          tags: ['test', 'validation'],
          importance: 80,
        }
      );

      expect(memory.sessionId).toBe('session-123');
      expect(memory.metadata.tags).toContain('test');
      expect(memory.metadata.importance).toBe(80);
    });
  });

  describe('getById', () => {
    it('should retrieve memory by ID and update access count', async () => {
      const mockRow = {
        id: 'mem-123',
        user_id: 'test-user',
        session_id: null,
        type: 'INTERACTION',
        content: { query: 'test' },
        tags: ['test'],
        importance: 50,
        access_count: 1,
        last_accessed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        valid_until: null,
        invalidated_at: null,
        invalidated_by: null,
        invalidation_reason: null,
      };

      mockDb.$queryRaw.mockResolvedValueOnce([mockRow]);

      const found = await service.getById('mem-123');

      expect(found).toBeDefined();
      expect(found.id).toBe('mem-123');
      expect(found.userId).toBe('test-user');
    });

    it('should throw NotFoundError for non-existent ID', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.getById('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getUserMemoryCount', () => {
    it('should count memories for a user', async () => {
      mockDb.memory.count.mockResolvedValueOnce(5);

      const count = await service.getUserMemoryCount('count-user');

      expect(count).toBe(5);
      expect(mockDb.memory.count).toHaveBeenCalledWith({
        where: {
          userId: 'count-user',
          invalidatedAt: null,
        },
      });
    });
  });

  describe('invalidate', () => {
    it('should invalidate a memory', async () => {
      mockDb.memory.update.mockResolvedValueOnce({ id: 'mem-123' });

      await service.invalidate('mem-123', 'system', 'Source invalidated');

      expect(mockDb.memory.update).toHaveBeenCalledWith({
        where: { id: 'mem-123' },
        data: {
          invalidatedAt: expect.any(Date),
          invalidatedBy: 'system',
          invalidationReason: 'Source invalidated',
        },
      });
    });
  });

  describe('cascadeInvalidate', () => {
    it('should invalidate memory and all dependents', async () => {
      // Setup mock for cascade
      mockDb.memory.update.mockResolvedValue({ id: 'any' });
      mockDb.memoryDependency.findMany
        .mockResolvedValueOnce([{ memoryId: 'dep-1' }, { memoryId: 'dep-2' }])
        .mockResolvedValueOnce([{ memoryId: 'dep-3' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const count = await service.cascadeInvalidate(
        'root-mem',
        'system',
        'Root invalidation'
      );

      // Should invalidate root + 3 dependents
      expect(count).toBe(4);
      expect(mockDb.memory.update).toHaveBeenCalledTimes(4);
    });
  });

  describe('addDependency', () => {
    it('should create memory dependency', async () => {
      await service.addDependency('mem-1', 'mem-2', 'DERIVES_FROM');

      expect(mockDb.memoryDependency.create).toHaveBeenCalledWith({
        data: {
          memoryId: 'mem-1',
          dependsOnId: 'mem-2',
          dependencyType: 'DERIVES_FROM',
        },
      });
    });
  });
});
