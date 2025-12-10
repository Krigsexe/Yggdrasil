/**
 * Thinking Service
 *
 * Generates human-readable reasoning steps that can be streamed to the user.
 * Like Claude's "thinking" mode - transparent reasoning process.
 */

import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { EpistemicBranch, CouncilMember } from '@yggdrasil/shared';

export interface ThinkingStep {
  id: string;
  phase: 'routing' | 'gathering' | 'deliberating' | 'validating' | 'responding';
  thought: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ThinkingService {
  private subjects = new Map<string, Subject<ThinkingStep>>();

  /**
   * Create a new thinking stream for a request
   */
  createStream(requestId: string): Subject<ThinkingStep> {
    const subject = new Subject<ThinkingStep>();
    this.subjects.set(requestId, subject);
    return subject;
  }

  /**
   * Get the thinking stream for a request
   */
  getStream(requestId: string): Subject<ThinkingStep> | undefined {
    return this.subjects.get(requestId);
  }

  /**
   * Emit a thinking step
   */
  emit(requestId: string, step: Omit<ThinkingStep, 'id' | 'timestamp'>): void {
    const subject = this.subjects.get(requestId);
    if (subject) {
      subject.next({
        ...step,
        id: `${requestId}-${Date.now()}`,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Complete and cleanup a stream
   */
  complete(requestId: string): void {
    const subject = this.subjects.get(requestId);
    if (subject) {
      subject.complete();
      this.subjects.delete(requestId);
    }
  }

  // ============================================================================
  // HUMAN-READABLE THOUGHT GENERATORS
  // ============================================================================

  /**
   * Generate thought for receiving a query
   */
  thinkReceiving(requestId: string, query: string): void {
    const shortQuery = query.length > 50 ? query.slice(0, 50) + '...' : query;
    this.emit(requestId, {
      phase: 'routing',
      thought: `Je reçois une question : "${shortQuery}"`,
    });
  }

  /**
   * Generate thought for classification
   */
  thinkClassifying(
    requestId: string,
    queryType: string,
    isConversational: boolean
  ): void {
    if (isConversational) {
      this.emit(requestId, {
        phase: 'routing',
        thought: `C'est une conversation simple, pas besoin de vérification approfondie.`,
      });
    } else {
      const typeDescriptions: Record<string, string> = {
        factual: 'une question factuelle qui nécessite des sources vérifiées',
        research: 'une question de recherche qui demande des études',
        current_events: "une question sur l'actualité",
        creative: 'une demande créative',
        procedural: 'une question de type "comment faire"',
        theoretical: 'une question théorique',
        unknown: 'une question que je dois analyser plus en détail',
      };
      this.emit(requestId, {
        phase: 'routing',
        thought: `J'identifie ${typeDescriptions[queryType] || 'le type de question'}...`,
      });
    }
  }

  /**
   * Generate thought for branch routing
   */
  thinkRouting(requestId: string, branch: EpistemicBranch): void {
    const branchDescriptions: Record<EpistemicBranch, string> = {
      [EpistemicBranch.MIMIR]: 'Je consulte MIMIR, ma base de connaissances vérifiées...',
      [EpistemicBranch.VOLVA]: 'Je consulte VOLVA pour explorer les hypothèses de recherche...',
      [EpistemicBranch.HUGIN]: 'Je consulte HUGIN pour les informations générales...',
    };
    this.emit(requestId, {
      phase: 'gathering',
      thought: branchDescriptions[branch],
    });
  }

  /**
   * Generate thought for council deliberation
   */
  thinkDeliberating(requestId: string, members: CouncilMember[]): void {
    if (members.length === 1 && members[0] === CouncilMember.KVASIR) {
      this.emit(requestId, {
        phase: 'deliberating',
        thought: 'Je réfléchis à la meilleure façon de répondre...',
      });
    } else {
      const memberNames = members.map(m => {
        const names: Record<CouncilMember, string> = {
          [CouncilMember.KVASIR]: 'le Sage',
          [CouncilMember.BRAGI]: 'le Poète',
          [CouncilMember.NORNES]: 'les Tisseuses',
          [CouncilMember.SAGA]: 'la Conteuse',
          [CouncilMember.SYN]: 'la Gardienne',
          [CouncilMember.LOKI]: 'le Critique',
          [CouncilMember.TYR]: 'le Juge',
        };
        return names[m];
      });
      this.emit(requestId, {
        phase: 'deliberating',
        thought: `Le conseil délibère : ${memberNames.join(', ')} examinent la question...`,
      });
    }
  }

  /**
   * Generate thought for council member response
   */
  thinkMemberResponse(requestId: string, member: CouncilMember): void {
    const thoughts: Record<CouncilMember, string> = {
      [CouncilMember.KVASIR]: 'KVASIR apporte sa sagesse...',
      [CouncilMember.BRAGI]: 'BRAGI formule une réponse éloquente...',
      [CouncilMember.NORNES]: 'Les NORNES calculent les possibilités...',
      [CouncilMember.SAGA]: 'SAGA puise dans les connaissances...',
      [CouncilMember.SYN]: 'SYN examine attentivement...',
      [CouncilMember.LOKI]: 'LOKI questionne et critique...',
      [CouncilMember.TYR]: 'TYR rend son verdict...',
    };
    this.emit(requestId, {
      phase: 'deliberating',
      thought: thoughts[member],
    });
  }

  /**
   * Generate thought for validation
   */
  thinkValidating(requestId: string, isConversational: boolean): void {
    if (isConversational) {
      this.emit(requestId, {
        phase: 'validating',
        thought: 'Conversation simple - validation automatique.',
      });
    } else {
      this.emit(requestId, {
        phase: 'validating',
        thought: 'ODIN vérifie la cohérence et les sources...',
      });
    }
  }

  /**
   * Generate thought for validation result
   */
  thinkValidationResult(
    requestId: string,
    isValid: boolean,
    confidence: number
  ): void {
    if (isValid) {
      this.emit(requestId, {
        phase: 'validating',
        thought: `Validation réussie (confiance: ${confidence}%)`,
      });
    } else {
      this.emit(requestId, {
        phase: 'validating',
        thought: `Je ne peux pas confirmer cette information avec certitude.`,
      });
    }
  }

  /**
   * Generate thought for final response
   */
  thinkResponding(requestId: string): void {
    this.emit(requestId, {
      phase: 'responding',
      thought: 'Je formule ma réponse...',
    });
  }

  /**
   * Generate thought for error/unknown
   */
  thinkError(requestId: string, reason: string): void {
    this.emit(requestId, {
      phase: 'responding',
      thought: `Je ne peux pas répondre : ${reason}`,
    });
  }
}
