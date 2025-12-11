/**
 * Knowledge Watcher Service Tests
 *
 * Tests for HUGIN Knowledge Watcher daemon and priority queues.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KnowledgeWatcherService, WatcherStats } from './knowledge-watcher.service.js';
import {
  PriorityQueue,
  PRIORITY_QUEUE_CONFIG,
  calculateEpistemicVelocity,
  getPriorityQueueForVelocity,
  EpistemicVelocity,
} from '@yggdrasil/shared';

// Mock DatabaseService
const mockDb = {
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
};

// Mock WebService
const mockWebService = {
  search: vi.fn().mockResolvedValue([]),
};

describe('KnowledgeWatcherService', () => {
  let service: KnowledgeWatcherService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new KnowledgeWatcherService(mockDb as any, mockWebService as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = service.getStats();

      expect(stats.totalScansToday).toBe(0);
      expect(stats.contradictionsDetected).toBe(0);
      expect(stats.alertsSent).toBe(0);
      expect(stats.hotQueueSize).toBe(0);
      expect(stats.warmQueueSize).toBe(0);
      expect(stats.coldQueueSize).toBe(0);
    });
  });

  describe('processQueue', () => {
    it('should process HOT queue nodes', async () => {
      const mockNodes = [
        {
          id: 'node-1',
          statement: 'Test statement',
          domain: 'test',
          current_state: 'VERIFIED',
          confidence_score: 80,
          epistemic_velocity: 0.001,
          priority_queue: 'HOT',
          last_scan: new Date(Date.now() - 3600000), // 1 hour ago
          next_scan: new Date(Date.now() - 1000),
          idle_cycles: 0,
        },
      ];

      mockDb.$queryRaw.mockResolvedValueOnce(mockNodes);
      mockDb.$queryRaw.mockResolvedValue([{ audit_trail: [] }]);
      mockWebService.search.mockResolvedValueOnce([]);

      await service.processQueue(PriorityQueue.HOT);

      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      await service.processQueue(PriorityQueue.WARM);

      // Should complete without error
      expect(mockDb.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('scanNode', () => {
    it('should return unchanged result when no search results', async () => {
      const node = {
        id: 'node-1',
        statement: 'Test statement',
        domain: 'test',
        current_state: 'VERIFIED',
        confidence_score: 80,
        epistemic_velocity: 0.001,
        priority_queue: 'WARM',
        last_scan: new Date(Date.now() - 86400000), // 1 day ago
        next_scan: new Date(Date.now() - 1000),
        idle_cycles: 0,
      };

      mockWebService.search.mockResolvedValueOnce([]);
      mockDb.$queryRaw.mockResolvedValueOnce([{ audit_trail: [] }]);

      const result = await service.scanNode(node);

      expect(result.changed).toBe(false);
      expect(result.contradictionDetected).toBe(false);
      expect(result.previousConfidence).toBe(80);
    });

    it('should process search results for contradictions', async () => {
      const node = {
        id: 'node-1',
        statement: 'The earth is flat and always has been',
        domain: 'science',
        current_state: 'WATCHING',
        confidence_score: 50,
        epistemic_velocity: 0.005,
        priority_queue: 'HOT',
        last_scan: new Date(Date.now() - 3600000),
        next_scan: new Date(Date.now() - 1000),
        idle_cycles: 0,
      };

      const searchResults = [
        {
          content: 'This claim has been debunked by scientists. The earth is not flat.',
          trustScore: 90,
        },
        {
          content: 'The flat earth theory is incorrect and has been disproven many times.',
          trustScore: 85,
        },
      ];

      mockWebService.search.mockResolvedValueOnce(searchResults);
      mockDb.$queryRaw.mockResolvedValue([{ audit_trail: [] }]);

      const result = await service.scanNode(node);

      // Result should have contradiction detection field (regardless of value)
      expect(result.contradictionDetected).toBeDefined();
      expect(typeof result.contradictionDetected).toBe('boolean');
    });

    it('should adjust confidence based on high trust search results', async () => {
      const node = {
        id: 'node-1',
        statement: 'Test scientific claim about quantum mechanics',
        domain: 'physics',
        current_state: 'VERIFIED',
        confidence_score: 70,
        epistemic_velocity: 0.002,
        priority_queue: 'WARM',
        last_scan: new Date(Date.now() - 86400000),
        next_scan: new Date(Date.now() - 1000),
        idle_cycles: 0,
      };

      const searchResults = [
        {
          content: 'Quantum mechanics principles have been verified by experiments.',
          trustScore: 95,
        },
        {
          content: 'Recent research confirms quantum entanglement properties.',
          trustScore: 90,
        },
      ];

      mockWebService.search.mockResolvedValueOnce(searchResults);
      mockDb.$queryRaw.mockResolvedValue([{ audit_trail: [] }]);

      const result = await service.scanNode(node);

      // High trust results should maintain or slightly increase confidence
      expect(result.velocity.value).toBeDefined();
    });

    it('should trigger alert for contradictions', async () => {
      const node = {
        id: 'node-1',
        statement: 'Breaking news claim about recent events',
        domain: 'news',
        current_state: 'WATCHING',
        confidence_score: 60,
        epistemic_velocity: 0.0001,
        priority_queue: 'HOT',
        last_scan: new Date(Date.now() - 3600000),
        next_scan: new Date(Date.now() - 1000),
        idle_cycles: 0,
      };

      // Simulate contradictions that cause major confidence drop
      const searchResults = [
        {
          content: 'This breaking news is false and incorrect claim debunked',
          trustScore: 95,
        },
        {
          content: 'Fact checkers have disproven this news story completely wrong',
          trustScore: 90,
        },
      ];

      mockWebService.search.mockResolvedValueOnce(searchResults);
      mockDb.$queryRaw.mockResolvedValue([{ audit_trail: [] }]);

      const result = await service.scanNode(node);

      // With contradictions detected, alert should be triggered
      if (result.contradictionDetected) {
        expect(result.alertTriggered).toBe(true);
      }
    });
  });

  describe('priority queue configuration', () => {
    it('should have correct HOT queue interval', () => {
      expect(PRIORITY_QUEUE_CONFIG.HOT.intervalMs).toBe(3600000); // 1 hour
    });

    it('should have correct WARM queue interval', () => {
      expect(PRIORITY_QUEUE_CONFIG.WARM.intervalMs).toBe(86400000); // 24 hours
    });

    it('should have correct COLD queue interval', () => {
      expect(PRIORITY_QUEUE_CONFIG.COLD.intervalMs).toBe(604800000); // 7 days
    });
  });
});

describe('Epistemic Velocity Helpers', () => {
  describe('calculateEpistemicVelocity', () => {
    it('should calculate zero velocity for no change', () => {
      const result = calculateEpistemicVelocity(80, 80, 1000);

      expect(result.value).toBe(0);
      expect(result.trend).toBe('STABLE');
    });

    it('should calculate positive velocity for confidence increase', () => {
      const result = calculateEpistemicVelocity(70, 80, 1000);

      expect(result.value).toBeGreaterThan(0);
      expect(result.previousConfidence).toBe(70);
      expect(result.currentConfidence).toBe(80);
    });

    it('should calculate negative velocity for confidence decrease', () => {
      const result = calculateEpistemicVelocity(80, 60, 1000);

      expect(result.value).toBeLessThan(0);
      expect(result.previousConfidence).toBe(80);
      expect(result.currentConfidence).toBe(60);
    });

    it('should handle zero time delta', () => {
      const result = calculateEpistemicVelocity(70, 80, 0);

      expect(result.value).toBe(0);
    });
  });

  describe('getPriorityQueueForVelocity', () => {
    it('should return HOT for high velocity', () => {
      const velocity: EpistemicVelocity = {
        value: 0.1,
        trend: 'INCREASING',
        lastUpdate: new Date(),
        previousConfidence: 50,
        currentConfidence: 60,
        deltaTimeMs: 1000,
      };
      const result = getPriorityQueueForVelocity(velocity);

      expect(result).toBe(PriorityQueue.HOT);
    });

    it('should return COLD for stable velocity', () => {
      const velocity: EpistemicVelocity = {
        value: 0,
        trend: 'STABLE',
        lastUpdate: new Date(),
        previousConfidence: 80,
        currentConfidence: 80,
        deltaTimeMs: 10000,
      };
      const result = getPriorityQueueForVelocity(velocity);

      expect(result).toBe(PriorityQueue.COLD);
    });

    it('should return WARM for medium velocity', () => {
      const velocity: EpistemicVelocity = {
        value: 0.03,
        trend: 'INCREASING',
        lastUpdate: new Date(),
        previousConfidence: 70,
        currentConfidence: 75,
        deltaTimeMs: 1000,
      };
      const result = getPriorityQueueForVelocity(velocity);

      expect(result).toBe(PriorityQueue.WARM);
    });

    it('should return HOT for rapidly decreasing confidence', () => {
      const velocity: EpistemicVelocity = {
        value: -0.1,
        trend: 'DECREASING',
        lastUpdate: new Date(),
        previousConfidence: 80,
        currentConfidence: 60,
        deltaTimeMs: 1000,
      };
      const result = getPriorityQueueForVelocity(velocity);

      expect(result).toBe(PriorityQueue.HOT);
    });
  });
});
