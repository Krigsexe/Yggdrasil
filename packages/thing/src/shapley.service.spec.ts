/**
 * Shapley Service Tests
 *
 * Tests for Shapley value calculation in THING council.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShapleyService, DeliberationAttribution } from './shapley.service.js';
import {
  CouncilMember,
  CouncilDeliberation,
  CouncilResponse,
  LokiChallenge,
  TyrVerdict,
} from '@yggdrasil/shared';

// Mock DatabaseService
const mockDb = {
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
};

// Helper to create a valid CouncilResponse
function createResponse(
  member: CouncilMember,
  content: string,
  confidence: number,
  reasoning?: string
): CouncilResponse {
  return {
    member,
    content,
    confidence,
    reasoning,
    processingTimeMs: 100,
    timestamp: new Date(),
  };
}

// Helper to create a valid TyrVerdict
function createVerdict(
  verdict: 'CONSENSUS' | 'MAJORITY' | 'SPLIT' | 'DEADLOCK',
  voteCounts: Record<string, number>,
  reasoning: string,
  dissent?: string[]
): TyrVerdict {
  return {
    verdict,
    voteCounts,
    reasoning,
    dissent,
    timestamp: new Date(),
  };
}

// Helper to create a valid LokiChallenge
function createChallenge(
  targetMember: CouncilMember,
  challenge: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): LokiChallenge {
  return {
    id: `challenge-${Date.now()}`,
    targetMember,
    challenge,
    severity,
    resolved: false,
    timestamp: new Date(),
  };
}

// Helper to create a valid CouncilDeliberation
function createDeliberation(
  id: string,
  query: string,
  responses: CouncilResponse[],
  lokiChallenges: LokiChallenge[],
  tyrVerdict: TyrVerdict
): CouncilDeliberation {
  return {
    id,
    requestId: `req-${id}`,
    query,
    responses,
    lokiChallenges,
    tyrVerdict,
    finalProposal: 'Final proposal based on deliberation',
    totalProcessingTimeMs: 1000,
    timestamp: new Date(),
  };
}

describe('ShapleyService', () => {
  let service: ShapleyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShapleyService(mockDb as any);
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateShapleyValues', () => {
    it('should return empty attribution for empty deliberation', () => {
      const deliberation = createDeliberation(
        'test-id',
        'Test query',
        [],
        [],
        createVerdict('CONSENSUS', { yes: 0 }, 'No responses')
      );

      const result = service.calculateShapleyValues(deliberation);

      expect(result.deliberationId).toBe('test-id');
      expect(result.members).toHaveLength(0);
      expect(result.totalValue).toBe(0);
    });

    it('should calculate Shapley values for single member', () => {
      const response = createResponse(
        CouncilMember.KVASIR,
        'Test response',
        80,
        'Test reasoning that is long enough to get bonus points for detailed reasoning and quality'
      );

      const deliberation = createDeliberation(
        'test-id',
        'Test query',
        [response],
        [],
        createVerdict('CONSENSUS', { yes: 1 }, 'All agree')
      );

      const result = service.calculateShapleyValues(deliberation);

      expect(result.members).toHaveLength(1);
      expect(result.members[0]!.member).toBe(CouncilMember.KVASIR);
      expect(result.members[0]!.shapleyValue).toBeGreaterThan(0);
      expect(result.members[0]!.percentageContribution).toBe(100);
    });

    it('should calculate Shapley values for multiple members', () => {
      const responses: CouncilResponse[] = [
        createResponse(
          CouncilMember.KVASIR,
          'Kvasir response',
          80,
          'Detailed reasoning from Kvasir about this test query which is sufficient length for bonus'
        ),
        createResponse(CouncilMember.SAGA, 'Saga response', 75, 'Saga reasoning'),
        createResponse(CouncilMember.BRAGI, 'Bragi response', 70, 'Bragi reasoning'),
      ];

      const deliberation = createDeliberation(
        'test-id',
        'Test query',
        responses,
        [],
        createVerdict('MAJORITY', { yes: 2, no: 1 }, 'Most agree')
      );

      const result = service.calculateShapleyValues(deliberation);

      expect(result.members).toHaveLength(3);
      expect(result.totalValue).toBeGreaterThan(0);

      // Verify percentage contributions sum to 100
      const totalPercentage = result.members.reduce((sum, m) => sum + m.percentageContribution, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);

      // Members should be sorted by contribution (highest first)
      for (let i = 1; i < result.members.length; i++) {
        expect(result.members[i - 1]!.shapleyValue).toBeGreaterThanOrEqual(
          result.members[i]!.shapleyValue
        );
      }
    });

    it('should include LOKI when challenges exist', () => {
      const response = createResponse(CouncilMember.KVASIR, 'Test response', 80, 'Test');
      const challenge = createChallenge(CouncilMember.KVASIR, 'I challenge this assertion', 'HIGH');

      const deliberation = createDeliberation(
        'test-id',
        'Test query',
        [response],
        [challenge],
        createVerdict('SPLIT', { yes: 1, no: 1 }, 'Disagreement exists', [CouncilMember.LOKI])
      );

      const result = service.calculateShapleyValues(deliberation);

      const members = result.members.map((m) => m.member);
      expect(members).toContain(CouncilMember.LOKI);
    });

    it('should reduce challenge impact for challenged members', () => {
      const responses: CouncilResponse[] = [
        createResponse(CouncilMember.KVASIR, 'Kvasir response', 80, 'Detailed reasoning'),
        createResponse(CouncilMember.SAGA, 'Saga response', 80, 'Same confidence'),
      ];

      const challenge = createChallenge(CouncilMember.KVASIR, 'Critical flaw detected', 'CRITICAL');

      const deliberation = createDeliberation(
        'test-id',
        'Test query',
        responses,
        [challenge],
        createVerdict('MAJORITY', { yes: 1, partial: 1 }, 'Some disagreement')
      );

      const result = service.calculateShapleyValues(deliberation);

      const kvasir = result.members.find((m) => m.member === CouncilMember.KVASIR);
      const saga = result.members.find((m) => m.member === CouncilMember.SAGA);

      // KVASIR should have lower challenge impact due to CRITICAL challenge
      expect(kvasir!.challengeImpact).toBeLessThan(saga!.challengeImpact);
    });

    it('should handle DEADLOCK verdict', () => {
      const responses: CouncilResponse[] = [
        createResponse(CouncilMember.KVASIR, 'Yes', 90, 'Definitely yes'),
        createResponse(CouncilMember.SAGA, 'No', 90, 'Definitely no'),
      ];

      const deliberation = createDeliberation(
        'test-id',
        'Is this true?',
        responses,
        [],
        createVerdict('DEADLOCK', { yes: 1, no: 1 }, 'Cannot resolve', [CouncilMember.SAGA])
      );

      const result = service.calculateShapleyValues(deliberation);

      // In deadlock, consensus alignment should be low
      for (const member of result.members) {
        expect(member.consensusAlignment).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('toKnowledgeLedgerFormat', () => {
    it('should convert attribution to KnowledgeLedger format', () => {
      const attribution: DeliberationAttribution = {
        deliberationId: 'test-id',
        members: [
          {
            member: CouncilMember.KVASIR,
            shapleyValue: 30,
            percentageContribution: 50,
            responseQuality: 80,
            challengeImpact: 100,
            consensusAlignment: 90,
          },
          {
            member: CouncilMember.SAGA,
            shapleyValue: 30,
            percentageContribution: 50,
            responseQuality: 75,
            challengeImpact: 100,
            consensusAlignment: 85,
          },
        ],
        totalValue: 60,
        timestamp: new Date(),
      };

      const result = service.toKnowledgeLedgerFormat(attribution);

      expect(result.KVASIR).toBe(30);
      expect(result.SAGA).toBe(30);
    });
  });

  describe('saveAttribution', () => {
    it('should save attribution to database', async () => {
      const attribution: DeliberationAttribution = {
        deliberationId: 'test-id',
        members: [
          {
            member: CouncilMember.KVASIR,
            shapleyValue: 30,
            percentageContribution: 100,
            responseQuality: 80,
            challengeImpact: 100,
            consensusAlignment: 90,
          },
        ],
        totalValue: 30,
        timestamp: new Date(),
      };

      await service.saveAttribution(attribution);

      expect(mockDb.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMemberPerformanceHistory', () => {
    it('should return null for member with no history', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([]);

      const result = await service.getMemberPerformanceHistory(CouncilMember.KVASIR);

      expect(result).toBeNull();
    });

    it('should return performance history for member', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          member: 'KVASIR',
          total_deliberations: BigInt(10),
          avg_shapley_value: 25.5,
          cumulative_contribution: 255,
        },
      ]);

      const result = await service.getMemberPerformanceHistory(CouncilMember.KVASIR);

      expect(result).not.toBeNull();
      expect(result!.member).toBe(CouncilMember.KVASIR);
      expect(result!.totalDeliberations).toBe(10);
      expect(result!.averageShapleyValue).toBe(25.5);
      expect(result!.cumulativeContribution).toBe(255);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top performers sorted by average Shapley value', async () => {
      mockDb.$queryRaw.mockResolvedValueOnce([
        {
          member: 'KVASIR',
          total_deliberations: BigInt(20),
          avg_shapley_value: 35.0,
          cumulative_contribution: 700,
        },
        {
          member: 'SAGA',
          total_deliberations: BigInt(15),
          avg_shapley_value: 28.0,
          cumulative_contribution: 420,
        },
      ]);

      const result = await service.getTopPerformers(5);

      expect(result).toHaveLength(2);
      expect(result[0]!.averageShapleyValue).toBeGreaterThan(result[1]!.averageShapleyValue);
    });
  });
});
