/**
 * Shapley Attribution Service
 *
 * Calculates Shapley values for THING council members to track
 * their individual contributions to knowledge validation.
 *
 * Based on cooperative game theory:
 * φ_i(v) = Σ_{S⊆N\{i}} [|S|!(n-|S|-1)!/n!] × [v(S∪{i}) - v(S)]
 *
 * Where:
 * - φ_i = Shapley value for player i
 * - v(S) = value function for coalition S
 * - N = set of all players (council members)
 *
 * This enables:
 * - Fair attribution of responsibility for decisions
 * - Identification of most valuable council members
 * - Detection of consistently wrong members
 * - Adaptive weighting in future deliberations
 */

import { Injectable } from '@nestjs/common';
import {
  CouncilMember,
  CouncilResponse,
  CouncilDeliberation,
  createLogger,
  ShapleyAttribution,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';

const logger = createLogger('ShapleyService', 'info');

// Factorial cache for performance
const factorialCache: Map<number, number> = new Map();

function factorial(n: number): number {
  if (n <= 1) return 1;
  if (factorialCache.has(n)) return factorialCache.get(n)!;
  const result = n * factorial(n - 1);
  factorialCache.set(n, result);
  return result;
}

// Generate all subsets of a set (powerset)
function* powerset<T>(array: T[]): Generator<T[]> {
  const length = 2 ** array.length;
  for (let i = 0; i < length; i++) {
    const subset: T[] = [];
    for (let j = 0; j < array.length; j++) {
      if (i & (1 << j)) {
        subset.push(array[j]!);
      }
    }
    yield subset;
  }
}

export interface MemberContribution {
  member: CouncilMember;
  shapleyValue: number;
  percentageContribution: number;
  responseQuality: number;
  challengeImpact: number;
  consensusAlignment: number;
}

export interface DeliberationAttribution {
  deliberationId: string;
  members: MemberContribution[];
  totalValue: number;
  timestamp: Date;
}

export interface MemberPerformanceHistory {
  member: CouncilMember;
  totalDeliberations: number;
  averageShapleyValue: number;
  cumulativeContribution: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracyRate: number;
}

@Injectable()
export class ShapleyService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Calculate Shapley values for all members in a deliberation
   */
  calculateShapleyValues(deliberation: CouncilDeliberation): DeliberationAttribution {
    const members = this.extractParticipatingMembers(deliberation);
    const n = members.length;

    if (n === 0) {
      return {
        deliberationId: deliberation.id,
        members: [],
        totalValue: 0,
        timestamp: new Date(),
      };
    }

    // Calculate the value function for each coalition
    const coalitionValues = new Map<string, number>();

    for (const coalition of powerset(members)) {
      const key = coalition.sort().join(',');
      const value = this.calculateCoalitionValue(coalition, deliberation);
      coalitionValues.set(key, value);
    }

    // Calculate Shapley value for each member
    const contributions: MemberContribution[] = [];
    let totalShapleyValue = 0;

    for (const member of members) {
      const shapleyValue = this.calculateMemberShapleyValue(
        member,
        members,
        coalitionValues
      );

      const responseQuality = this.calculateResponseQuality(member, deliberation);
      const challengeImpact = this.calculateChallengeImpact(member, deliberation);
      const consensusAlignment = this.calculateConsensusAlignment(member, deliberation);

      contributions.push({
        member,
        shapleyValue,
        percentageContribution: 0, // Will be calculated after total
        responseQuality,
        challengeImpact,
        consensusAlignment,
      });

      totalShapleyValue += shapleyValue;
    }

    // Calculate percentage contributions
    for (const contribution of contributions) {
      contribution.percentageContribution =
        totalShapleyValue > 0
          ? (contribution.shapleyValue / totalShapleyValue) * 100
          : 100 / contributions.length;
    }

    // Sort by contribution
    contributions.sort((a, b) => b.shapleyValue - a.shapleyValue);

    const attribution: DeliberationAttribution = {
      deliberationId: deliberation.id,
      members: contributions,
      totalValue: totalShapleyValue,
      timestamp: new Date(),
    };

    logger.info('Shapley values calculated', {
      deliberationId: deliberation.id,
      memberCount: contributions.length,
      totalValue: totalShapleyValue,
      topContributor: contributions[0]?.member,
    });

    return attribution;
  }

  /**
   * Calculate Shapley value for a single member
   * φ_i(v) = Σ_{S⊆N\{i}} [|S|!(n-|S|-1)!/n!] × [v(S∪{i}) - v(S)]
   */
  private calculateMemberShapleyValue(
    member: CouncilMember,
    allMembers: CouncilMember[],
    coalitionValues: Map<string, number>
  ): number {
    const n = allMembers.length;
    const othersWithoutMember = allMembers.filter((m) => m !== member);

    let shapleyValue = 0;

    // Iterate over all coalitions not containing the member
    for (const coalition of powerset(othersWithoutMember)) {
      const s = coalition.length;
      const coefficient = (factorial(s) * factorial(n - s - 1)) / factorial(n);

      const coalitionWithMember = [...coalition, member].sort();
      const keyWithMember = coalitionWithMember.join(',');
      const keyWithoutMember = coalition.sort().join(',');

      const valueWithMember = coalitionValues.get(keyWithMember) ?? 0;
      const valueWithoutMember = coalitionValues.get(keyWithoutMember) ?? 0;

      const marginalContribution = valueWithMember - valueWithoutMember;
      shapleyValue += coefficient * marginalContribution;
    }

    return shapleyValue;
  }

  /**
   * Calculate the value function for a coalition
   * This represents how well the coalition performs at validation
   */
  private calculateCoalitionValue(
    coalition: CouncilMember[],
    deliberation: CouncilDeliberation
  ): number {
    if (coalition.length === 0) return 0;

    const coalitionResponses = deliberation.responses.filter((r) =>
      coalition.includes(r.member)
    );

    if (coalitionResponses.length === 0) return 0;

    // Value based on:
    // 1. Average confidence of coalition members
    // 2. Agreement between members
    // 3. Alignment with final verdict

    const avgConfidence =
      coalitionResponses.reduce((sum, r) => sum + r.confidence, 0) /
      coalitionResponses.length;

    // Calculate agreement between members
    const agreementScore = this.calculateAgreementScore(coalitionResponses);

    // Check alignment with final verdict
    const verdictAlignment = this.checkVerdictAlignment(coalition, deliberation);

    // Weighted combination
    const value =
      avgConfidence * 0.3 + agreementScore * 0.3 + verdictAlignment * 0.4;

    return value;
  }

  /**
   * Calculate agreement score between responses
   */
  private calculateAgreementScore(responses: CouncilResponse[]): number {
    if (responses.length < 2) return 100;

    // Simple heuristic: check if confidence levels are similar
    const confidences = responses.map((r) => r.confidence);
    const avgConfidence =
      confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance =
      confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) /
      confidences.length;

    // Lower variance = higher agreement
    const agreementScore = Math.max(0, 100 - Math.sqrt(variance));

    return agreementScore;
  }

  /**
   * Check alignment with final verdict
   */
  private checkVerdictAlignment(
    coalition: CouncilMember[],
    deliberation: CouncilDeliberation
  ): number {
    const verdict = deliberation.tyrVerdict.verdict;

    // For CONSENSUS or MAJORITY verdicts, members who contributed
    // to the winning side get higher alignment
    const coalitionResponses = deliberation.responses.filter((r) =>
      coalition.includes(r.member)
    );

    if (coalitionResponses.length === 0) return 0;

    // Calculate average confidence - higher confidence members
    // aligned with CONSENSUS get more credit
    const avgConfidence =
      coalitionResponses.reduce((sum, r) => sum + r.confidence, 0) /
      coalitionResponses.length;

    switch (verdict) {
      case 'CONSENSUS':
        return avgConfidence * 1.0; // Full credit for consensus
      case 'MAJORITY':
        return avgConfidence * 0.8;
      case 'SPLIT':
        return avgConfidence * 0.5;
      case 'DEADLOCK':
        return avgConfidence * 0.3;
      default:
        return avgConfidence * 0.5;
    }
  }

  /**
   * Calculate response quality for a specific member
   */
  private calculateResponseQuality(
    member: CouncilMember,
    deliberation: CouncilDeliberation
  ): number {
    const response = deliberation.responses.find((r) => r.member === member);
    if (!response) return 0;

    // Quality based on confidence and reasoning presence
    let quality = response.confidence;

    if (response.reasoning && response.reasoning.length > 100) {
      quality += 10; // Bonus for detailed reasoning
    }

    return Math.min(100, quality);
  }

  /**
   * Calculate LOKI challenge impact for a member
   */
  private calculateChallengeImpact(
    member: CouncilMember,
    deliberation: CouncilDeliberation
  ): number {
    if (member !== CouncilMember.LOKI) {
      // For non-LOKI members, check if they were challenged
      const challenges = deliberation.lokiChallenges.filter(
        (c) => c.targetMember === member
      );

      if (challenges.length === 0) return 100; // No challenges = good

      // Reduce score based on challenge severity
      let impact = 100;
      for (const challenge of challenges) {
        switch (challenge.severity) {
          case 'CRITICAL':
            impact -= 40;
            break;
          case 'HIGH':
            impact -= 25;
            break;
          case 'MEDIUM':
            impact -= 15;
            break;
          case 'LOW':
            impact -= 5;
            break;
        }
      }

      return Math.max(0, impact);
    }

    // For LOKI, measure the quality of challenges
    const challengeCount = deliberation.lokiChallenges.length;
    const criticalChallenges = deliberation.lokiChallenges.filter(
      (c) => c.severity === 'CRITICAL' || c.severity === 'HIGH'
    ).length;

    // LOKI gets credit for finding important issues
    return challengeCount > 0
      ? Math.min(100, 50 + criticalChallenges * 20)
      : 50;
  }

  /**
   * Calculate consensus alignment for a member
   */
  private calculateConsensusAlignment(
    member: CouncilMember,
    deliberation: CouncilDeliberation
  ): number {
    const response = deliberation.responses.find((r) => r.member === member);
    if (!response) return 0;

    // Check if member's confidence aligns with the final verdict
    const verdict = deliberation.tyrVerdict;

    switch (verdict.verdict) {
      case 'CONSENSUS':
        return response.confidence >= 70 ? 100 : response.confidence;
      case 'MAJORITY':
        return response.confidence >= 50 ? 80 : response.confidence * 0.8;
      case 'SPLIT':
        return 50; // Everyone equally (mis)aligned in a split
      case 'DEADLOCK':
        return 30;
      default:
        return 50;
    }
  }

  /**
   * Extract participating members from a deliberation
   */
  private extractParticipatingMembers(
    deliberation: CouncilDeliberation
  ): CouncilMember[] {
    const members = new Set<CouncilMember>();

    for (const response of deliberation.responses) {
      members.add(response.member);
    }

    // LOKI always participates if there are challenges
    if (deliberation.lokiChallenges.length > 0) {
      members.add(CouncilMember.LOKI);
    }

    return Array.from(members);
  }

  /**
   * Convert Shapley attribution to the format used in Knowledge Ledger
   */
  toKnowledgeLedgerFormat(attribution: DeliberationAttribution): ShapleyAttribution {
    const result: ShapleyAttribution = {};

    for (const contribution of attribution.members) {
      const memberKey = contribution.member.toUpperCase() as keyof ShapleyAttribution;
      result[memberKey] = contribution.shapleyValue;
    }

    return result;
  }

  /**
   * Save attribution to database
   */
  async saveAttribution(attribution: DeliberationAttribution): Promise<void> {
    const now = new Date();

    // Save each member's contribution
    for (const contribution of attribution.members) {
      await this.db.$executeRaw`
        INSERT INTO shapley_attributions (
          deliberation_id, member, shapley_value, percentage_contribution,
          response_quality, challenge_impact, consensus_alignment, created_at
        ) VALUES (
          ${attribution.deliberationId},
          ${contribution.member}::"CouncilMember",
          ${contribution.shapleyValue},
          ${contribution.percentageContribution},
          ${contribution.responseQuality},
          ${contribution.challengeImpact},
          ${contribution.consensusAlignment},
          ${now}
        )
        ON CONFLICT (deliberation_id, member) DO UPDATE
        SET shapley_value = ${contribution.shapleyValue},
            percentage_contribution = ${contribution.percentageContribution},
            response_quality = ${contribution.responseQuality},
            challenge_impact = ${contribution.challengeImpact},
            consensus_alignment = ${contribution.consensusAlignment}
      `;
    }

    logger.info('Attribution saved', {
      deliberationId: attribution.deliberationId,
      memberCount: attribution.members.length,
    });
  }

  /**
   * Get historical performance for a member
   */
  async getMemberPerformanceHistory(
    member: CouncilMember
  ): Promise<MemberPerformanceHistory | null> {
    const results = await this.db.$queryRaw<
      Array<{
        member: string;
        total_deliberations: bigint;
        avg_shapley_value: number;
        cumulative_contribution: number;
      }>
    >`
      SELECT
        member,
        COUNT(*) as total_deliberations,
        AVG(shapley_value) as avg_shapley_value,
        SUM(shapley_value) as cumulative_contribution
      FROM shapley_attributions
      WHERE member = ${member}::"CouncilMember"
      GROUP BY member
    `;

    if (results.length === 0) return null;

    const row = results[0]!;

    return {
      member,
      totalDeliberations: Number(row.total_deliberations),
      averageShapleyValue: row.avg_shapley_value,
      cumulativeContribution: row.cumulative_contribution,
      correctPredictions: 0, // Would need validation history
      incorrectPredictions: 0,
      accuracyRate: 0,
    };
  }

  /**
   * Get top performing members across all deliberations
   */
  async getTopPerformers(limit: number = 10): Promise<MemberPerformanceHistory[]> {
    const results = await this.db.$queryRaw<
      Array<{
        member: string;
        total_deliberations: bigint;
        avg_shapley_value: number;
        cumulative_contribution: number;
      }>
    >`
      SELECT
        member,
        COUNT(*) as total_deliberations,
        AVG(shapley_value) as avg_shapley_value,
        SUM(shapley_value) as cumulative_contribution
      FROM shapley_attributions
      GROUP BY member
      ORDER BY avg_shapley_value DESC
      LIMIT ${limit}
    `;

    return results.map((row) => ({
      member: row.member as CouncilMember,
      totalDeliberations: Number(row.total_deliberations),
      averageShapleyValue: row.avg_shapley_value,
      cumulativeContribution: row.cumulative_contribution,
      correctPredictions: 0,
      incorrectPredictions: 0,
      accuracyRate: 0,
    }));
  }
}
