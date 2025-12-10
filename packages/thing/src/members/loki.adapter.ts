/**
 * LOKI Adapter
 *
 * Adversarial critic member of the council.
 * Challenges and stress-tests other responses.
 */

import { Injectable } from '@nestjs/common';
import { CouncilResponse, createLogger } from '@yggdrasil/shared';

const logger = createLogger('LokiAdapter', 'info');

export type ChallengeSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface LokiChallenge {
  challenge: string;
  severity: ChallengeSeverity;
  targetClaim?: string;
}

@Injectable()
export class LokiAdapter {
  private readonly challengeThreshold = 0.7;

  challenge(response: CouncilResponse): LokiChallenge | null {
    logger.info('LOKI analyzing response', {
      member: response.member,
      confidence: response.confidence,
    });

    // Check for overconfidence
    if (response.confidence > 90) {
      const challenge = this.checkOverconfidence(response);
      if (challenge) return challenge;
    }

    // Check for logical fallacies
    const fallacyChallenge = this.checkLogicalFallacies(response.content);
    if (fallacyChallenge) return fallacyChallenge;

    // Check for unsupported claims
    const unsupportedChallenge = this.checkUnsupportedClaims(response);
    if (unsupportedChallenge) return unsupportedChallenge;

    // Check for edge cases
    const edgeCaseChallenge = this.checkEdgeCases(response.content);
    if (edgeCaseChallenge) return edgeCaseChallenge;

    return null;
  }

  critique(content: string): {
    issues: string[];
    suggestions: string[];
    severity: ChallengeSeverity;
  } {
    logger.info('LOKI critique', { contentLength: content.length });

    // Placeholder - would perform deep critique
    return {
      issues: [],
      suggestions: [],
      severity: 'LOW',
    };
  }

  private checkOverconfidence(response: CouncilResponse): LokiChallenge | null {
    // High confidence should be backed by sources
    if (!response.sources || response.sources.length === 0) {
      return {
        challenge: `${response.member} claims ${response.confidence}% confidence without providing sources`,
        severity: 'HIGH',
        targetClaim: response.content.slice(0, 100),
      };
    }

    return null;
  }

  private checkLogicalFallacies(content: string): LokiChallenge | null {
    const fallacyPatterns = [
      {
        pattern: /everyone knows|obviously|clearly|it's obvious/i,
        fallacy: 'appeal to common knowledge',
      },
      {
        pattern: /always|never|all|none/i,
        fallacy: 'absolute statement without nuance',
      },
      {
        pattern: /experts say|studies show/i,
        fallacy: 'appeal to vague authority',
      },
    ];

    for (const { pattern, fallacy } of fallacyPatterns) {
      if (pattern.test(content)) {
        return {
          challenge: `Potential ${fallacy} detected in response`,
          severity: 'MEDIUM',
          targetClaim: content.match(pattern)?.[0],
        };
      }
    }

    return null;
  }

  private checkUnsupportedClaims(response: CouncilResponse): LokiChallenge | null {
    // Check for claims that should have sources but don't
    const claimPatterns = [
      /according to|research shows|data indicates|statistics show/i,
    ];

    for (const pattern of claimPatterns) {
      if (pattern.test(response.content) && (!response.sources || response.sources.length === 0)) {
        return {
          challenge: 'Response makes claims about research/data without citing sources',
          severity: 'HIGH',
        };
      }
    }

    return null;
  }

  private checkEdgeCases(content: string): LokiChallenge | null {
    // Check if edge cases were considered
    if (content.length > 200 && !content.includes('however') && !content.includes('although')) {
      return {
        challenge: 'Response may not consider alternative perspectives or edge cases',
        severity: 'LOW',
      };
    }

    return null;
  }
}
