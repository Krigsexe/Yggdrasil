/**
 * RATATOSK Bridge
 *
 * Connects to the RATATOSK routing component.
 * The squirrel that runs along Yggdrasil carrying messages.
 */

import { Injectable } from '@nestjs/common';
import {
  EpistemicBranch,
  CouncilMember,
  createLogger,
} from '@yggdrasil/shared';
import { RouterService, ClassifierService } from '@yggdrasil/ratatosk';

const logger = createLogger('RatatoaskBridge', 'info');

export interface RouteDecision {
  primaryBranch: EpistemicBranch;
  secondaryBranches: EpistemicBranch[];
  councilMembers: CouncilMember[];
  complexity: 'simple' | 'moderate' | 'complex';
  requiresDeliberation: boolean;
  estimatedTokens: number;
  isConversational: boolean;
}

@Injectable()
export class RatatoaskBridge {
  private readonly router: RouterService;

  constructor() {
    // In production, these would be injected via dependency injection
    const classifier = new ClassifierService();
    this.router = new RouterService(classifier);
  }

  route(query: string, context?: Record<string, unknown>): RouteDecision {
    logger.info('Routing query', { queryLength: query.length });

    const decision = this.router.route(query, context);

    return {
      primaryBranch: decision.primaryBranch,
      secondaryBranches: decision.secondaryBranches,
      councilMembers: decision.councilMembers,
      complexity: decision.complexity,
      requiresDeliberation: decision.requiresDeliberation,
      estimatedTokens: decision.estimatedTokens,
      isConversational: decision.isConversational,
    };
  }
}
