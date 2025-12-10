/**
 * Router Service
 *
 * Routes requests to the appropriate epistemic branch.
 */

import { Injectable } from '@nestjs/common';
import {
  EpistemicBranch,
  CouncilMember,
  createLogger,
} from '@yggdrasil/shared';
import { ClassifierService, QueryClassification } from './classifier.service.js';

const logger = createLogger('RouterService', 'info');

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
export class RouterService {
  constructor(private readonly classifier: ClassifierService) {}

  route(query: string, _context?: Record<string, unknown>): RouteDecision {
    const classification = this.classifier.classify(query);

    const primaryBranch = this.determinePrimaryBranch(classification);
    const secondaryBranches = this.determineSecondaryBranches(classification, primaryBranch);
    const councilMembers = this.determineCouncilMembers(classification);
    const complexity = this.determineComplexity(classification);
    const requiresDeliberation = this.requiresDeliberation(classification);
    const estimatedTokens = this.estimateTokens(classification);
    const isConversational = classification.type === 'conversational';

    const decision: RouteDecision = {
      primaryBranch,
      secondaryBranches,
      councilMembers,
      complexity,
      requiresDeliberation,
      estimatedTokens,
      isConversational,
    };

    logger.info('Route decision made', {
      queryLength: query.length,
      primaryBranch,
      complexity,
      requiresDeliberation,
    });

    return decision;
  }

  private determinePrimaryBranch(classification: QueryClassification): EpistemicBranch {
    // Conversational queries (greetings, chat) don't need verification
    // Route to HUGIN with simple direct response
    if (classification.type === 'conversational') {
      return EpistemicBranch.HUGIN;
    }

    // Creative queries don't need strict verification
    if (classification.type === 'creative') {
      return EpistemicBranch.HUGIN;
    }

    // Factual queries requiring verified sources go to MIMIR
    if (classification.type === 'factual' && classification.requiresVerification) {
      return EpistemicBranch.MIMIR;
    }

    // Research and theoretical queries go to VOLVA
    if (classification.type === 'research' || classification.type === 'theoretical') {
      return EpistemicBranch.VOLVA;
    }

    // Current events and real-time info go to HUGIN
    if (classification.type === 'current_events' || classification.requiresRealtime) {
      return EpistemicBranch.HUGIN;
    }

    // Procedural (how-to) queries go to HUGIN for general knowledge
    if (classification.type === 'procedural') {
      return EpistemicBranch.HUGIN;
    }

    // Unknown queries - go to HUGIN, let the council figure it out
    if (classification.type === 'unknown') {
      return EpistemicBranch.HUGIN;
    }

    // Default to MIMIR for verified information
    return EpistemicBranch.MIMIR;
  }

  private determineSecondaryBranches(
    classification: QueryClassification,
    primary: EpistemicBranch
  ): EpistemicBranch[] {
    const secondary: EpistemicBranch[] = [];

    // Complex queries may need multiple branches
    if (classification.complexity === 'complex') {
      if (primary !== EpistemicBranch.MIMIR) {
        secondary.push(EpistemicBranch.MIMIR);
      }
      if (primary !== EpistemicBranch.VOLVA && classification.type === 'research') {
        secondary.push(EpistemicBranch.VOLVA);
      }
    }

    return secondary;
  }

  private determineCouncilMembers(classification: QueryClassification): CouncilMember[] {
    // Conversational queries only need KVASIR for direct response
    if (classification.type === 'conversational') {
      return [CouncilMember.KVASIR];
    }

    const members: CouncilMember[] = [CouncilMember.KVASIR]; // Always include KVASIR for reasoning

    // Add specialists based on query type
    if (classification.domain === 'mathematics' || classification.domain === 'logic') {
      members.push(CouncilMember.NORNES);
    }

    if (classification.domain === 'creative' || classification.type === 'creative') {
      members.push(CouncilMember.BRAGI);
    }

    if (classification.domain === 'history' || classification.domain === 'general') {
      members.push(CouncilMember.SAGA);
    }

    // Always add LOKI for critique on complex queries
    if (classification.complexity === 'complex') {
      members.push(CouncilMember.LOKI);
    }

    // Always add TYR for arbitration (except for simple conversational)
    members.push(CouncilMember.TYR);

    return [...new Set(members)];
  }

  private determineComplexity(
    classification: QueryClassification
  ): 'simple' | 'moderate' | 'complex' {
    return classification.complexity;
  }

  private requiresDeliberation(classification: QueryClassification): boolean {
    // Conversational queries never need deliberation
    if (classification.type === 'conversational') {
      return false;
    }

    return (
      classification.complexity === 'complex' ||
      classification.requiresMultipleSources ||
      classification.controversial
    );
  }

  private estimateTokens(classification: QueryClassification): number {
    const baseTokens = 1000;
    const complexityMultiplier = {
      simple: 1,
      moderate: 2,
      complex: 4,
    };

    return baseTokens * complexityMultiplier[classification.complexity];
  }
}
