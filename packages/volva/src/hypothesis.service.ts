/**
 * Hypothesis Service
 *
 * Manages hypotheses and theories in VOLVA.
 * Confidence ranges from 50-99%.
 */

import { Injectable } from '@nestjs/common';
import {
  Source,
  createLogger,
  generateId,
  NotFoundError,
} from '@yggdrasil/shared';

const logger = createLogger('HypothesisService', 'info');

export type HypothesisStatus = 'emerging' | 'debated' | 'promising' | 'declining';

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  status: HypothesisStatus;
  supportingEvidence: Source[];
  contradictingEvidence: Source[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    field?: string;
    keywords?: string[];
    citations?: number;
  };
}

// In-memory store
const hypotheses = new Map<string, Hypothesis>();

@Injectable()
export class HypothesisService {
  create(
    statement: string,
    confidence: number,
    supportingEvidence: Source[] = []
  ): Hypothesis {
    // Validate confidence range for VOLVA (50-99)
    if (confidence < 50 || confidence > 99) {
      throw new Error('VOLVA confidence must be between 50 and 99');
    }

    const id = generateId();
    const now = new Date();

    const hypothesis: Hypothesis = {
      id,
      statement,
      confidence,
      status: this.determineStatus(confidence, supportingEvidence.length),
      supportingEvidence,
      contradictingEvidence: [],
      createdAt: now,
      updatedAt: now,
    };

    hypotheses.set(id, hypothesis);

    logger.info('Hypothesis created', { id, confidence, status: hypothesis.status });

    return hypothesis;
  }

  getById(id: string): Hypothesis {
    const hypothesis = hypotheses.get(id);
    if (!hypothesis) {
      throw new NotFoundError('Hypothesis', id);
    }
    return hypothesis;
  }

  search(query: string): Hypothesis[] {
    const normalizedQuery = query.toLowerCase();

    return Array.from(hypotheses.values())
      .filter((h) => h.statement.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.confidence - a.confidence);
  }

  addEvidence(
    id: string,
    evidence: Source,
    supports: boolean
  ): Hypothesis {
    const hypothesis = this.getById(id);

    if (supports) {
      hypothesis.supportingEvidence.push(evidence);
    } else {
      hypothesis.contradictingEvidence.push(evidence);
    }

    // Recalculate confidence based on evidence
    hypothesis.confidence = this.recalculateConfidence(hypothesis);
    hypothesis.status = this.determineStatus(
      hypothesis.confidence,
      hypothesis.supportingEvidence.length
    );
    hypothesis.updatedAt = new Date();

    logger.info('Evidence added to hypothesis', {
      id,
      supports,
      newConfidence: hypothesis.confidence,
    });

    return hypothesis;
  }

  promoteToMimir(id: string): { eligible: boolean; reason?: string } {
    const hypothesis = this.getById(id);

    // Check promotion criteria
    if (hypothesis.confidence < 95) {
      return {
        eligible: false,
        reason: 'Confidence must be at least 95% for MIMIR promotion',
      };
    }

    if (hypothesis.supportingEvidence.length < 3) {
      return {
        eligible: false,
        reason: 'At least 3 supporting sources required for MIMIR promotion',
      };
    }

    if (hypothesis.contradictingEvidence.length > 0) {
      return {
        eligible: false,
        reason: 'Cannot promote hypothesis with contradicting evidence',
      };
    }

    // Check that all supporting evidence is peer-reviewed
    const allPeerReviewed = hypothesis.supportingEvidence.every(
      (s) => s.metadata?.peerReviewed === true
    );

    if (!allPeerReviewed) {
      return {
        eligible: false,
        reason: 'All supporting evidence must be peer-reviewed for MIMIR promotion',
      };
    }

    return { eligible: true };
  }

  private determineStatus(confidence: number, supportCount: number): HypothesisStatus {
    if (confidence >= 85 && supportCount >= 3) return 'promising';
    if (confidence >= 70) return 'debated';
    if (confidence >= 50 && supportCount >= 1) return 'emerging';
    return 'declining';
  }

  private recalculateConfidence(hypothesis: Hypothesis): number {
    const supportWeight = 5;
    const contradictWeight = -10;

    let confidence = 60; // Base confidence
    confidence += hypothesis.supportingEvidence.length * supportWeight;
    confidence += hypothesis.contradictingEvidence.length * contradictWeight;

    // Clamp to VOLVA range (50-99)
    return Math.max(50, Math.min(99, confidence));
  }
}
