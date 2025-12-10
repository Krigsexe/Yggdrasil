/**
 * Voting Service (TYR)
 *
 * Handles consensus building and verdict rendering.
 * Named after the god of justice and law.
 */

import { Injectable } from '@nestjs/common';
import {
  CouncilResponse,
  LokiChallenge,
  TyrVerdict,
  CouncilVerdict,
  createLogger,
} from '@yggdrasil/shared';

const logger = createLogger('VotingService', 'info');

@Injectable()
export class VotingService {
  private readonly consensusThreshold = 0.66;

  renderVerdict(
    responses: CouncilResponse[],
    challenges: LokiChallenge[]
  ): TyrVerdict {
    if (responses.length === 0) {
      return {
        verdict: 'DEADLOCK',
        voteCounts: {},
        reasoning: 'No responses received from council members',
        timestamp: new Date(),
      };
    }

    // Group responses by their main position
    const positions = this.groupByPosition(responses);
    const voteCounts = this.countVotes(positions);
    const verdict = this.determineVerdict(responses, voteCounts);
    const reasoning = this.generateReasoning(responses, challenges, verdict);
    const dissent = this.collectDissent(responses, verdict);

    logger.info('Verdict rendered', {
      verdict,
      voteCounts,
      responseCount: responses.length,
      challengeCount: challenges.length,
    });

    return {
      verdict,
      voteCounts,
      reasoning,
      dissent: dissent.length > 0 ? dissent : undefined,
      timestamp: new Date(),
    };
  }

  private groupByPosition(responses: CouncilResponse[]): Map<string, CouncilResponse[]> {
    // In a real implementation, this would use semantic similarity
    // to group similar responses together
    const groups = new Map<string, CouncilResponse[]>();

    for (const response of responses) {
      // Simplified: use first 100 chars as position key
      const key = response.content.slice(0, 100);
      const existing = groups.get(key) ?? [];
      existing.push(response);
      groups.set(key, existing);
    }

    return groups;
  }

  private countVotes(positions: Map<string, CouncilResponse[]>): Record<string, number> {
    const counts: Record<string, number> = {};

    let i = 1;
    for (const [, responses] of positions) {
      const positionKey = `position_${i}`;
      counts[positionKey] = responses.length;
      i++;
    }

    return counts;
  }

  private determineVerdict(
    responses: CouncilResponse[],
    voteCounts: Record<string, number>
  ): CouncilVerdict {
    const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
    const maxVotes = Math.max(...Object.values(voteCounts));

    if (totalVotes === 0) {
      return 'DEADLOCK';
    }

    const maxRatio = maxVotes / totalVotes;

    // Check confidence levels
    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    if (avgConfidence < 50) {
      return 'DEADLOCK';
    }

    if (maxRatio >= 1) {
      return 'CONSENSUS';
    }

    if (maxRatio >= this.consensusThreshold) {
      return 'MAJORITY';
    }

    if (maxRatio >= 0.5) {
      return 'SPLIT';
    }

    return 'DEADLOCK';
  }

  private generateReasoning(
    responses: CouncilResponse[],
    challenges: LokiChallenge[],
    verdict: CouncilVerdict
  ): string {
    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    const unresolvedChallenges = challenges.filter((c) => !c.resolved);
    const criticalChallenges = challenges.filter((c) => c.severity === 'CRITICAL');

    let reasoning = `Verdict: ${verdict}. `;
    reasoning += `${responses.length} council members responded with average confidence of ${avgConfidence.toFixed(0)}%. `;

    if (unresolvedChallenges.length > 0) {
      reasoning += `${unresolvedChallenges.length} unresolved challenges remain. `;
    }

    if (criticalChallenges.length > 0) {
      reasoning += `WARNING: ${criticalChallenges.length} critical challenges were raised. `;
    }

    return reasoning;
  }

  private collectDissent(
    responses: CouncilResponse[],
    verdict: CouncilVerdict
  ): string[] {
    if (verdict === 'CONSENSUS') {
      return [];
    }

    // Find responses that differ significantly from the majority
    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

    return responses
      .filter((r) => Math.abs(r.confidence - avgConfidence) > 20)
      .map((r) => `${r.member}: ${r.reasoning ?? r.content.slice(0, 100)}`);
  }
}
