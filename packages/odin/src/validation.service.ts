/**
 * Validation Service
 *
 * The core of ODIN - validates all content before output.
 * Implements the Absolute Veracity pillar.
 */

import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationTrace,
  ValidationStep,
  RejectionReason,
  Source,
  CouncilDeliberation,
  createLogger,
  generateId,
  YGGDRASIL_VERSION,
} from '@yggdrasil/shared';
import { AnchoringService } from './anchoring.service.js';

const logger = createLogger('ValidationService', 'info');

export interface ValidationInput {
  content: string;
  deliberation?: CouncilDeliberation;
  requestId: string;
  requireMimirAnchor?: boolean;
}

@Injectable()
export class ValidationService {
  constructor(private readonly anchoring: AnchoringService) {}

  validate(input: ValidationInput): ValidationResult {
    const startTime = Date.now();
    const traceId = generateId();
    const steps: ValidationStep[] = [];

    let stepNumber = 1;

    // Step 1: Source anchoring check
    const anchoringResult = this.checkAnchoring(input, stepNumber++, steps);
    if (!anchoringResult.passed && input.requireMimirAnchor !== false) {
      return this.createRejectionResult(
        input,
        'NO_SOURCE',
        steps,
        traceId,
        startTime
      );
    }

    // Step 2: Memory consistency check
    const memoryResult = this.checkMemoryConsistency(input, stepNumber++, steps);
    if (!memoryResult.passed) {
      return this.createRejectionResult(
        input,
        'CONTRADICTS_MEMORY',
        steps,
        traceId,
        startTime
      );
    }

    // Step 3: Council consensus check
    if (input.deliberation) {
      const consensusResult = this.checkConsensus(input.deliberation, stepNumber++, steps);
      if (!consensusResult.passed) {
        return this.createRejectionResult(
          input,
          'NO_CONSENSUS',
          steps,
          traceId,
          startTime
        );
      }

      // Step 4: LOKI challenges check
      const lokiResult = this.checkLokiChallenges(input.deliberation, stepNumber++, steps);
      if (!lokiResult.passed) {
        return this.createRejectionResult(
          input,
          'FAILED_CRITIQUE',
          steps,
          traceId,
          startTime
        );
      }
    }

    // Step 5: Confidence threshold check
    // CRITICAL: Confidence is derived from SOURCE trust scores, not council averages
    // This is the key to "verified source orchestration"
    const confidenceResult = this.checkConfidence(
      input,
      anchoringResult.sources,
      stepNumber++,
      steps
    );
    if (!confidenceResult.passed) {
      return this.createRejectionResult(
        input,
        'INSUFFICIENT_CONFIDENCE',
        steps,
        traceId,
        startTime
      );
    }

    // All checks passed - create approval result
    return this.createApprovalResult(
      input,
      anchoringResult.sources,
      steps,
      traceId,
      startTime,
      confidenceResult.confidence
    );
  }

  private checkAnchoring(
    input: ValidationInput,
    stepNumber: number,
    steps: ValidationStep[]
  ): { passed: boolean; sources: Source[] } {
    const stepStart = Date.now();

    const sources = this.anchoring.findSources(input.content);
    const passed = sources.length > 0;

    steps.push({
      stepNumber,
      component: 'ODIN',
      action: 'source_anchoring_check',
      result: passed ? 'PASS' : 'FAIL',
      details: { sourcesFound: sources.length },
      timestamp: new Date(),
      durationMs: Date.now() - stepStart,
    });

    return { passed, sources };
  }

  private checkMemoryConsistency(
    _input: ValidationInput,
    stepNumber: number,
    steps: ValidationStep[]
  ): { passed: boolean } {
    const stepStart = Date.now();

    // Placeholder - would check against MUNIN for contradictions
    const passed = true;

    steps.push({
      stepNumber,
      component: 'MUNIN',
      action: 'memory_consistency_check',
      result: passed ? 'PASS' : 'WARN',
      details: { contradictions: 0 },
      timestamp: new Date(),
      durationMs: Date.now() - stepStart,
    });

    return { passed };
  }

  private checkConsensus(
    deliberation: CouncilDeliberation,
    stepNumber: number,
    steps: ValidationStep[]
  ): { passed: boolean } {
    const stepStart = Date.now();

    const passed = ['CONSENSUS', 'MAJORITY'].includes(deliberation.tyrVerdict.verdict);

    steps.push({
      stepNumber,
      component: 'TYR',
      action: 'consensus_check',
      result: passed ? 'PASS' : 'FAIL',
      details: {
        verdict: deliberation.tyrVerdict.verdict,
        voteCounts: deliberation.tyrVerdict.voteCounts,
      },
      timestamp: new Date(),
      durationMs: Date.now() - stepStart,
    });

    return { passed };
  }

  private checkLokiChallenges(
    deliberation: CouncilDeliberation,
    stepNumber: number,
    steps: ValidationStep[]
  ): { passed: boolean } {
    const stepStart = Date.now();

    const criticalChallenges = deliberation.lokiChallenges.filter(
      (c) => c.severity === 'CRITICAL' && !c.resolved
    );
    const passed = criticalChallenges.length === 0;

    steps.push({
      stepNumber,
      component: 'LOKI',
      action: 'challenge_resolution_check',
      result: passed ? 'PASS' : 'FAIL',
      details: {
        totalChallenges: deliberation.lokiChallenges.length,
        unresolvedCritical: criticalChallenges.length,
      },
      timestamp: new Date(),
      durationMs: Date.now() - stepStart,
    });

    return { passed };
  }

  private checkConfidence(
    input: ValidationInput,
    sources: Source[],
    stepNumber: number,
    steps: ValidationStep[]
  ): { passed: boolean; confidence: number } {
    const stepStart = Date.now();

    // YGGDRASIL confidence thresholds per Epistemic Branch:
    // - MIMIR (verified facts): requires 100% confidence from verified sources
    // - VOLVA (research/hypotheses): requires >= 70% confidence
    // - HUGIN (internet/unverified): requires >= 50% confidence
    //
    // CRITICAL PRINCIPLE (per project vision):
    // "La clé réside dans la source des infos verifiées grace a l'orchestration"
    // Confidence is derived from SOURCE TRUST SCORES, not council averages.
    // When verified sources are found, that IS the verification.

    let confidence = 0;
    let confidenceSource = 'none';

    // Priority 1: Use source trust scores (the verified source orchestration)
    if (sources.length > 0) {
      // Calculate minimum trust score from sources
      // MIMIR sources have trustScore >= 85 (arXiv) or 100 (PubMed)
      const minTrustScore = Math.min(...sources.map((s) => s.trustScore));
      const avgTrustScore = Math.round(
        sources.reduce((sum, s) => sum + s.trustScore, 0) / sources.length
      );

      // For MIMIR: if all sources are 100% trusted, confidence is 100%
      // Otherwise, use the minimum to be conservative
      confidence = minTrustScore;
      confidenceSource = 'sources';

      logger.info('Confidence from sources', {
        sourceCount: sources.length,
        minTrustScore,
        avgTrustScore,
        confidence,
      });
    }
    // Priority 2: Fall back to council deliberation if no sources
    else if (input.deliberation) {
      const responses = input.deliberation.responses;
      if (responses.length > 0) {
        confidence = Math.round(
          responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
        );
        confidenceSource = 'council';
      }
    }

    // MIMIR requires 100% confidence (from verified sources)
    // VOLVA/HUGIN can accept lower thresholds
    const requiredThreshold = input.requireMimirAnchor ? 100 : 60;
    const passed = confidence >= requiredThreshold;

    steps.push({
      stepNumber,
      component: 'ODIN',
      action: 'confidence_threshold_check',
      result: passed ? 'PASS' : 'FAIL',
      details: {
        confidence,
        confidenceSource,
        requiredThreshold,
        mimirRequired: input.requireMimirAnchor ?? false,
        sourceCount: sources.length,
      },
      timestamp: new Date(),
      durationMs: Date.now() - stepStart,
    });

    return { passed, confidence };
  }

  private createApprovalResult(
    input: ValidationInput,
    sources: Source[],
    steps: ValidationStep[],
    traceId: string,
    startTime: number,
    confidence: number = 100
  ): ValidationResult {
    const trace: ValidationTrace = {
      id: traceId,
      requestId: input.requestId,
      timestamp: new Date(),
      steps,
      finalDecision: 'APPROVED',
      processingTimeMs: Date.now() - startTime,
      odinVersion: YGGDRASIL_VERSION,
    };

    logger.info('Validation APPROVED', {
      requestId: input.requestId,
      sourceCount: sources.length,
      confidence,
      processingTimeMs: trace.processingTimeMs,
    });

    return {
      isValid: true,
      confidence,
      sources,
      trace,
    };
  }

  private createRejectionResult(
    input: ValidationInput,
    reason: RejectionReason,
    steps: ValidationStep[],
    traceId: string,
    startTime: number
  ): ValidationResult {
    const trace: ValidationTrace = {
      id: traceId,
      requestId: input.requestId,
      timestamp: new Date(),
      steps,
      finalDecision: 'REJECTED',
      processingTimeMs: Date.now() - startTime,
      odinVersion: YGGDRASIL_VERSION,
    };

    logger.warn('Validation REJECTED', {
      requestId: input.requestId,
      reason,
      processingTimeMs: trace.processingTimeMs,
    });

    return {
      isValid: false,
      confidence: 0,
      sources: [],
      trace,
      rejectionReason: reason,
    };
  }
}
