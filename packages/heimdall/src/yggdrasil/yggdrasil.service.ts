/**
 * YGGDRASIL Service
 *
 * The central orchestrator that implements the full query pipeline:
 * 1. RATATOSK classifies and routes the query
 * 2. Epistemic branches (MIMIR/VOLVA/HUGIN) gather information
 * 3. THING council deliberates on the response
 * 4. ODIN validates and anchors to sources
 * 5. MUNIN stores the interaction in memory
 *
 * "Verified + sources" or "I don't know" - never "probably true"
 */

import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import {
  EpistemicBranch,
  ValidationResult,
  CouncilDeliberation,
  createLogger,
  generateId,
} from '@yggdrasil/shared';
import { RatatoaskBridge } from './bridges/ratatosk.bridge.js';
import { MimirBridge } from './bridges/mimir.bridge.js';
import { VolvaBridge } from './bridges/volva.bridge.js';
import { HuginBridge } from './bridges/hugin.bridge.js';
import { ThingBridge } from './bridges/thing.bridge.js';
import { OdinBridge } from './bridges/odin.bridge.js';
import { MuninBridge } from './bridges/munin.bridge.js';
import { ThinkingService, ThinkingStep } from './thinking.service.js';

const logger = createLogger('YggdrasilService', 'info');

export interface YggdrasilRequest {
  query: string;
  userId: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  options?: {
    requireMimirAnchor?: boolean;
    maxTimeMs?: number;
    returnTrace?: boolean;
  };
}

export interface YggdrasilResponse {
  requestId: string;
  answer: string | null;
  isVerified: boolean;
  confidence: number;
  sources: Array<{
    type: string;
    identifier: string;
    url: string;
    title: string;
  }>;
  epistemicBranch: EpistemicBranch;
  trace?: {
    routingDecision: unknown;
    branchResults: Record<string, unknown>;
    deliberation?: unknown;
    validation: unknown;
  };
  processingTimeMs: number;
  timestamp: Date;
}

interface BranchResult {
  branch: EpistemicBranch;
  content: string;
  confidence: number;
  sources: Array<{ type: string; identifier: string; url: string; title: string }>;
}

@Injectable()
export class YggdrasilService {
  constructor(
    private readonly ratatosk: RatatoaskBridge,
    private readonly mimir: MimirBridge,
    private readonly volva: VolvaBridge,
    private readonly hugin: HuginBridge,
    private readonly thing: ThingBridge,
    private readonly odin: OdinBridge,
    private readonly munin: MuninBridge,
    private readonly thinking: ThinkingService
  ) {}

  /**
   * Process a query through the full YGGDRASIL pipeline
   */
  async process(request: YggdrasilRequest): Promise<YggdrasilResponse> {
    const startTime = Date.now();
    const requestId = generateId();

    logger.info('Processing query', {
      requestId,
      userId: request.userId,
      queryLength: request.query.length,
    });

    try {
      // Step 1: RATATOSK routes the query
      const routingDecision = await this.ratatosk.route(request.query, request.context);

      logger.info('Routing decision', {
        requestId,
        primaryBranch: routingDecision.primaryBranch,
        requiresDeliberation: routingDecision.requiresDeliberation,
      });

      // Step 2: Query epistemic branches
      const branchResults = await this.queryBranches(
        request.query,
        routingDecision.primaryBranch,
        routingDecision.secondaryBranches
      );

      // Check if primary branch has any content
      const primaryResult = branchResults.find(
        (r) => r.branch === routingDecision.primaryBranch
      );
      const primaryBranchEmpty = !primaryResult?.content || primaryResult.content.length === 0;

      // Step 3: THING council deliberates
      // Force deliberation if router says so OR if primary branch (MIMIR) has no content
      let deliberation: CouncilDeliberation | undefined;
      const shouldDeliberate = routingDecision.requiresDeliberation || primaryBranchEmpty;

      if (shouldDeliberate) {
        logger.info('Triggering THING deliberation', {
          requestId,
          reason: primaryBranchEmpty ? 'primary_branch_empty' : 'router_decision',
          primaryBranch: routingDecision.primaryBranch,
        });

        deliberation = await this.thing.deliberate({
          query: request.query,
          members: routingDecision.councilMembers,
          branchResults,
        });
      }

      // Step 4: ODIN validates the response
      // Use deliberation result if available, otherwise branch content
      const contentToValidate = deliberation?.finalProposal ?? primaryResult?.content ?? '';

      // Skip ODIN validation for conversational queries (greetings, simple chat)
      // These don't need source anchoring or LOKI challenges
      let validation: ValidationResult;

      if (routingDecision.isConversational && deliberation?.finalProposal) {
        // For conversational queries, auto-approve with moderate confidence
        logger.info('Skipping ODIN validation for conversational query', {
          requestId,
          isConversational: true,
        });

        validation = {
          isValid: true,
          confidence: 80, // Conversational responses don't need source verification
          sources: [],
          trace: {
            id: requestId,
            requestId,
            timestamp: new Date(),
            steps: [{
              stepNumber: 1,
              component: 'ODIN',
              action: 'conversational_bypass',
              result: 'PASS',
              details: { reason: 'Conversational query - no source verification required' },
              timestamp: new Date(),
              durationMs: 0,
            }],
            finalDecision: 'APPROVED',
            processingTimeMs: 0,
            odinVersion: 'YGGDRASIL-0.1.0',
          },
        };
      } else {
        validation = await this.odin.validate({
          content: contentToValidate,
          deliberation,
          requestId,
          requireMimirAnchor: request.options?.requireMimirAnchor ??
            routingDecision.primaryBranch === EpistemicBranch.MIMIR,
        });
      }

      // Step 5: Build response based on validation
      const response = this.buildResponse(
        requestId,
        validation,
        routingDecision,
        branchResults,
        deliberation,
        startTime,
        request.options?.returnTrace ?? false
      );

      // Step 6: MUNIN stores the interaction (non-fatal if it fails)
      try {
        await this.munin.storeInteraction({
          userId: request.userId,
          sessionId: request.sessionId,
          requestId,
          query: request.query,
          response,
          validation,
        });
      } catch (muninError) {
        // MUNIN storage failure shouldn't prevent returning a valid response
        logger.warn('Failed to store interaction in MUNIN', {
          requestId,
          userId: request.userId,
          error: (muninError as Error).message,
        });
      }

      logger.info('Query processed', {
        requestId,
        isVerified: response.isVerified,
        processingTimeMs: response.processingTimeMs,
      });

      return response;
    } catch (error) {
      logger.error('Failed to process query', error as Error, { requestId });

      // Return "I don't know" response on error
      return {
        requestId,
        answer: null,
        isVerified: false,
        confidence: 0,
        sources: [],
        epistemicBranch: EpistemicBranch.HUGIN,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Query the appropriate epistemic branches
   */
  private async queryBranches(
    query: string,
    primaryBranch: EpistemicBranch,
    secondaryBranches: EpistemicBranch[]
  ): Promise<BranchResult[]> {
    const results: BranchResult[] = [];
    const allBranches = [primaryBranch, ...secondaryBranches];

    // Query branches in parallel
    const branchPromises = allBranches.map(async (branch) => {
      switch (branch) {
        case EpistemicBranch.MIMIR:
          return this.mimir.query(query);
        case EpistemicBranch.VOLVA:
          return this.volva.query(query);
        case EpistemicBranch.HUGIN:
          return this.hugin.query(query);
        default:
          return null;
      }
    });

    const branchResponses = await Promise.all(branchPromises);

    for (let i = 0; i < allBranches.length; i++) {
      const branch = allBranches[i];
      const response = branchResponses[i];

      if (response && branch) {
        results.push({
          branch,
          content: response.content,
          confidence: response.confidence,
          sources: response.sources,
        });
      }
    }

    return results;
  }

  /**
   * Build the final response
   */
  private buildResponse(
    requestId: string,
    validation: ValidationResult,
    routingDecision: Awaited<ReturnType<typeof this.ratatosk.route>>,
    branchResults: BranchResult[],
    deliberation: CouncilDeliberation | undefined,
    startTime: number,
    includeTrace: boolean
  ): YggdrasilResponse {
    const primaryResult = branchResults.find(
      (r) => r.branch === routingDecision.primaryBranch
    );

    // If validated, return the answer with sources
    // If not validated, return "I don't know" with explanation
    // Prefer deliberation's finalProposal if available (from THING council)
    let answer: string | null = null;
    if (validation.isValid) {
      answer = deliberation?.finalProposal ?? primaryResult?.content ?? null;
    } else if (deliberation?.finalProposal) {
      // Even if not fully validated, return the deliberation result with isVerified=false
      answer = deliberation.finalProposal;
    }

    const response: YggdrasilResponse = {
      requestId,
      answer,
      isVerified: validation.isValid,
      confidence: validation.confidence,
      sources: validation.sources.map((s) => ({
        type: s.type,
        identifier: s.identifier,
        url: s.url,
        title: s.title,
      })),
      epistemicBranch: routingDecision.primaryBranch,
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date(),
    };

    // Include trace if requested
    if (includeTrace) {
      response.trace = {
        routingDecision: {
          ...routingDecision,
          secondaryBranches: routingDecision.secondaryBranches,
          requiresDeliberation: routingDecision.requiresDeliberation,
        },
        branchResults: Object.fromEntries(
          branchResults.map((r) => [r.branch, {
            confidence: r.confidence,
            contentLength: r.content?.length ?? 0,
          }])
        ),
        deliberation: deliberation ? {
          verdict: deliberation.tyrVerdict.verdict,
          responseCount: deliberation.responses.length,
          challengeCount: deliberation.lokiChallenges.length,
          // Include full council member responses for transparency
          responses: deliberation.responses.map((r) => ({
            member: r.member,
            confidence: r.confidence,
            content: r.content,
            reasoning: r.reasoning,
          })),
          // Include LOKI challenges
          challenges: deliberation.lokiChallenges.map((c) => ({
            target: c.targetMember,
            severity: c.severity,
            challenge: c.challenge,
            resolved: c.resolved,
          })),
          // Voting details
          voteCounts: deliberation.tyrVerdict.voteCounts,
        } : undefined,
        validation: {
          decision: validation.trace.finalDecision,
          steps: validation.trace.steps.length,
          processingTimeMs: validation.trace.processingTimeMs,
          rejectionReason: validation.rejectionReason,
        },
      };
    }

    return response;
  }

  /**
   * Process a query with thinking steps collection
   * Returns both the response and the thinking steps for UI display
   */
  async processWithThinking(
    request: YggdrasilRequest
  ): Promise<{ response: YggdrasilResponse; thinkingSteps: ThinkingStep[] }> {
    const startTime = Date.now();
    const requestId = generateId();
    const thinkingSteps: ThinkingStep[] = [];

    // Helper to add a thinking step
    const addThought = (
      phase: ThinkingStep['phase'],
      thought: string
    ): void => {
      thinkingSteps.push({
        id: `${requestId}-${thinkingSteps.length}`,
        phase,
        thought,
        timestamp: new Date(),
      });
    };

    logger.info('Processing query with thinking', {
      requestId,
      userId: request.userId,
      queryLength: request.query.length,
    });

    try {
      // Step 1: Receive and analyze
      const shortQuery =
        request.query.length > 50
          ? request.query.slice(0, 50) + '...'
          : request.query;
      addThought('routing', `Je recois une question : "${shortQuery}"`);

      // Step 2: RATATOSK routes the query
      const routingDecision = await this.ratatosk.route(
        request.query,
        request.context
      );

      if (routingDecision.isConversational) {
        addThought(
          'routing',
          `C'est une conversation simple, pas besoin de verification approfondie.`
        );
      } else {
        const branchNames: Record<EpistemicBranch, string> = {
          [EpistemicBranch.MIMIR]: 'MIMIR (connaissances verifiees)',
          [EpistemicBranch.VOLVA]: 'VOLVA (recherche)',
          [EpistemicBranch.HUGIN]: 'HUGIN (informations generales)',
        };
        addThought(
          'routing',
          `J'identifie le type de question et je route vers ${branchNames[routingDecision.primaryBranch]}...`
        );
      }

      // Step 3: Query epistemic branches
      addThought('gathering', `Je consulte mes sources de connaissances...`);

      const branchResults = await this.queryBranches(
        request.query,
        routingDecision.primaryBranch,
        routingDecision.secondaryBranches
      );

      const primaryResult = branchResults.find(
        (r) => r.branch === routingDecision.primaryBranch
      );
      const primaryBranchEmpty =
        !primaryResult?.content || primaryResult.content.length === 0;

      // Step 4: THING council deliberates
      let deliberation: CouncilDeliberation | undefined;
      const shouldDeliberate =
        routingDecision.requiresDeliberation || primaryBranchEmpty;

      if (shouldDeliberate) {
        if (
          routingDecision.councilMembers.length === 1 &&
          routingDecision.isConversational
        ) {
          addThought(
            'deliberating',
            `Je reflechis a la meilleure facon de repondre...`
          );
        } else {
          addThought(
            'deliberating',
            `Le conseil delibere... ${routingDecision.councilMembers.length} membres examinent la question.`
          );
        }

        deliberation = await this.thing.deliberate({
          query: request.query,
          members: routingDecision.councilMembers,
          branchResults,
        });

        if (deliberation) {
          addThought(
            'deliberating',
            `Deliberation terminee - verdict: ${deliberation.tyrVerdict.verdict}`
          );
        }
      }

      // Step 5: ODIN validates
      const contentToValidate =
        deliberation?.finalProposal ?? primaryResult?.content ?? '';

      let validation: ValidationResult;

      if (routingDecision.isConversational && deliberation?.finalProposal) {
        addThought('validating', `Conversation simple - validation automatique.`);

        validation = {
          isValid: true,
          confidence: 80,
          sources: [],
          trace: {
            id: requestId,
            requestId,
            timestamp: new Date(),
            steps: [
              {
                stepNumber: 1,
                component: 'ODIN',
                action: 'conversational_bypass',
                result: 'PASS',
                details: {
                  reason: 'Conversational query - no source verification required',
                },
                timestamp: new Date(),
                durationMs: 0,
              },
            ],
            finalDecision: 'APPROVED',
            processingTimeMs: 0,
            odinVersion: 'YGGDRASIL-0.1.0',
          },
        };
      } else {
        addThought('validating', `ODIN verifie la coherence et les sources...`);

        validation = await this.odin.validate({
          content: contentToValidate,
          deliberation,
          requestId,
          requireMimirAnchor:
            request.options?.requireMimirAnchor ??
            routingDecision.primaryBranch === EpistemicBranch.MIMIR,
        });

        if (validation.isValid) {
          addThought(
            'validating',
            `Validation reussie (confiance: ${validation.confidence}%)`
          );
        } else {
          addThought(
            'validating',
            `Je ne peux pas confirmer cette information avec certitude.`
          );
        }
      }

      // Step 6: Build response
      addThought('responding', `Je formule ma reponse...`);

      const response = this.buildResponse(
        requestId,
        validation,
        routingDecision,
        branchResults,
        deliberation,
        startTime,
        request.options?.returnTrace ?? false
      );

      // Step 7: MUNIN stores (non-fatal)
      try {
        await this.munin.storeInteraction({
          userId: request.userId,
          sessionId: request.sessionId,
          requestId,
          query: request.query,
          response,
          validation,
        });
      } catch (muninError) {
        logger.warn('Failed to store interaction in MUNIN', {
          requestId,
          userId: request.userId,
          error: (muninError as Error).message,
        });
      }

      logger.info('Query processed with thinking', {
        requestId,
        isVerified: response.isVerified,
        thinkingStepsCount: thinkingSteps.length,
        processingTimeMs: response.processingTimeMs,
      });

      return { response, thinkingSteps };
    } catch (error) {
      logger.error('Failed to process query with thinking', error as Error, {
        requestId,
      });

      addThought('responding', `Une erreur s'est produite pendant le traitement.`);

      return {
        response: {
          requestId,
          answer: null,
          isVerified: false,
          confidence: 0,
          sources: [],
          epistemicBranch: EpistemicBranch.HUGIN,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date(),
        },
        thinkingSteps,
      };
    }
  }

  /**
   * Process a query with real-time streaming of thinking steps via SSE
   * Returns an Observable that emits events as processing happens
   */
  processWithStreaming(request: YggdrasilRequest): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const startTime = Date.now();
    const requestId = generateId();

    // Helper to emit a thinking step with immediate flush
    // Uses micro-delay to force SSE event transmission
    const emitThought = async (phase: ThinkingStep['phase'], thought: string): Promise<void> => {
      subject.next({
        data: {
          type: 'thinking',
          step: {
            id: `${requestId}-${Date.now()}`,
            phase,
            thought,
            timestamp: new Date().toISOString(),
          },
        },
      } as MessageEvent);
      // Micro-delay to force event loop flush and SSE transmission
      await new Promise(resolve => setImmediate(resolve));
    };

    // Process asynchronously
    (async () => {
      try {
        // Step 1: Receive and analyze
        const shortQuery =
          request.query.length > 50
            ? request.query.slice(0, 50) + '...'
            : request.query;
        await emitThought('routing', `Je recois une question : "${shortQuery}"`);

        // Step 2: RATATOSK routes the query
        const routingDecision = await this.ratatosk.route(
          request.query,
          request.context
        );

        if (routingDecision.isConversational) {
          await emitThought(
            'routing',
            `C'est une conversation simple, pas besoin de verification approfondie.`
          );
        } else {
          const branchNames: Record<EpistemicBranch, string> = {
            [EpistemicBranch.MIMIR]: 'MIMIR (connaissances verifiees)',
            [EpistemicBranch.VOLVA]: 'VOLVA (recherche)',
            [EpistemicBranch.HUGIN]: 'HUGIN (informations generales)',
          };
          await emitThought(
            'routing',
            `J'identifie le type de question et je route vers ${branchNames[routingDecision.primaryBranch]}...`
          );
        }

        // Step 3: Query epistemic branches
        await emitThought('gathering', `Je consulte mes sources de connaissances...`);

        const branchResults = await this.queryBranches(
          request.query,
          routingDecision.primaryBranch,
          routingDecision.secondaryBranches
        );

        const primaryResult = branchResults.find(
          (r) => r.branch === routingDecision.primaryBranch
        );
        const primaryBranchEmpty =
          !primaryResult?.content || primaryResult.content.length === 0;

        // Step 4: THING council deliberates
        let deliberation: CouncilDeliberation | undefined;
        const shouldDeliberate =
          routingDecision.requiresDeliberation || primaryBranchEmpty;

        if (shouldDeliberate) {
          if (
            routingDecision.councilMembers.length === 1 &&
            routingDecision.isConversational
          ) {
            await emitThought(
              'deliberating',
              `Je reflechis a la meilleure facon de repondre...`
            );
          } else {
            await emitThought(
              'deliberating',
              `Le conseil delibere... ${routingDecision.councilMembers.length} membres examinent la question.`
            );
          }

          // Adapter emitThought to ProgressCallback signature for council events
          const councilProgress = async (phase: string, message: string): Promise<void> => {
            // All council progress events are in 'deliberating' phase
            await emitThought('deliberating', message);
          };

          deliberation = await this.thing.deliberate({
            query: request.query,
            members: routingDecision.councilMembers,
            branchResults,
            onProgress: councilProgress,
          });

          if (deliberation) {
            await emitThought(
              'deliberating',
              `Deliberation terminee - verdict: ${deliberation.tyrVerdict.verdict}`
            );
          }
        }

        // Step 5: ODIN validates
        const contentToValidate =
          deliberation?.finalProposal ?? primaryResult?.content ?? '';

        let validation: ValidationResult;

        if (routingDecision.isConversational && deliberation?.finalProposal) {
          await emitThought('validating', `Conversation simple - validation automatique.`);

          validation = {
            isValid: true,
            confidence: 80,
            sources: [],
            trace: {
              id: requestId,
              requestId,
              timestamp: new Date(),
              steps: [
                {
                  stepNumber: 1,
                  component: 'ODIN',
                  action: 'conversational_bypass',
                  result: 'PASS',
                  details: {
                    reason: 'Conversational query - no source verification required',
                  },
                  timestamp: new Date(),
                  durationMs: 0,
                },
              ],
              finalDecision: 'APPROVED',
              processingTimeMs: 0,
              odinVersion: 'YGGDRASIL-0.1.0',
            },
          };
        } else {
          await emitThought('validating', `ODIN verifie la coherence et les sources...`);

          validation = await this.odin.validate({
            content: contentToValidate,
            deliberation,
            requestId,
            requireMimirAnchor:
              request.options?.requireMimirAnchor ??
              routingDecision.primaryBranch === EpistemicBranch.MIMIR,
          });

          if (validation.isValid) {
            await emitThought(
              'validating',
              `Validation reussie (confiance: ${validation.confidence}%)`
            );
          } else {
            await emitThought(
              'validating',
              `Je ne peux pas confirmer cette information avec certitude.`
            );
          }
        }

        // Step 6: Build response
        await emitThought('responding', `Je formule ma reponse...`);

        const response = this.buildResponse(
          requestId,
          validation,
          routingDecision,
          branchResults,
          deliberation,
          startTime,
          request.options?.returnTrace ?? false
        );

        // Step 7: MUNIN stores (non-fatal)
        try {
          await this.munin.storeInteraction({
            userId: request.userId,
            sessionId: request.sessionId,
            requestId,
            query: request.query,
            response,
            validation,
          });
        } catch (muninError) {
          logger.warn('Failed to store interaction in MUNIN', {
            requestId,
            userId: request.userId,
            error: (muninError as Error).message,
          });
        }

        // Stream the answer WORD BY WORD for typewriter effect
        if (response.answer) {
          // Clean verdict tags before streaming
          const cleanAnswer = response.answer
            .replace(/^\[(SPLIT|CONSENSUS|MAJORITY|DEADLOCK)\]\s*/i, '')
            .trim();

          // Split into words (keeping whitespace for accurate reconstruction)
          const words = cleanAnswer.split(/(\s+)/);

          for (const word of words) {
            if (word) {
              subject.next({
                data: {
                  type: 'answer_chunk',
                  chunk: word,
                },
              } as MessageEvent);
              // Micro-delay between words for visible streaming effect
              await new Promise(resolve => setTimeout(resolve, 15));
            }
          }
        }

        // Emit final response metadata (without answer since it was streamed)
        subject.next({
          data: {
            type: 'response',
            response: {
              ...response,
              answer: null, // Already streamed word-by-word
            },
          },
        } as MessageEvent);

        subject.complete();
      } catch (error) {
        logger.error('Failed to process streaming query', error as Error, {
          requestId,
        });

        await emitThought('responding', `Une erreur s'est produite pendant le traitement.`);

        subject.next({
          data: {
            type: 'response',
            response: {
              requestId,
              answer: null,
              isVerified: false,
              confidence: 0,
              sources: [],
              epistemicBranch: EpistemicBranch.HUGIN,
              processingTimeMs: Date.now() - startTime,
              timestamp: new Date(),
            },
          },
        } as MessageEvent);

        subject.complete();
      }
    })();

    return subject.asObservable();
  }
}
