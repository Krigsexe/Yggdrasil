/**
 * Council Service
 *
 * Orchestrates deliberation between council members.
 *
 * Council Configuration (Dec 2024):
 * - KVASIR: Gemini 2.5 Pro (86.7% AIME 2025, 84% GPQA)
 * - BRAGI: Gemini 2.5 Flash (fast + thinking)
 * - NORNES: Qwen QWQ-32B via Groq (79.5% AIME 2024, 66.4% BFCL)
 * - SAGA: Llama 3.3 70B via Groq (131K context)
 * - SYN: Gemini 2.5 Pro (84.8% VideoMME)
 * - LOKI: DeepSeek R1 Distill via Groq (94.3% MATH-500)
 * - TYR: Voting system (no LLM)
 */

import { Injectable, Optional } from '@nestjs/common';
import {
  CouncilMember,
  CouncilResponse,
  CouncilDeliberation,
  LokiChallenge,
  TyrVerdict,
  createLogger,
  generateId,
} from '@yggdrasil/shared';
import { VotingService } from './voting.service.js';

// New primary adapters
import { KvasirGeminiAdapter } from './adapters/gemini.adapter.js';
import { BragiGeminiAdapter } from './adapters/gemini.adapter.js';
import { SynGeminiAdapter } from './adapters/gemini.adapter.js';
import { NornesGroqAdapter } from './adapters/groq.adapter.js';
import { SagaGroqAdapter } from './adapters/groq.adapter.js';
import { LokiGroqAdapter } from './adapters/groq.adapter.js';

// Legacy adapters (fallback)
import { KvasirAdapter } from './members/kvasir.adapter.js';
import { SagaAdapter } from './members/saga.adapter.js';
import { LokiAdapter } from './members/loki.adapter.js';

const logger = createLogger('CouncilService', 'info');

/**
 * Progress callback for real-time streaming during deliberation
 */
export type ProgressCallback = (phase: string, message: string) => Promise<void>;

export interface DeliberationRequest {
  query: string;
  members?: CouncilMember[];
  requireConsensus?: boolean;
  maxTimeMs?: number;
  onProgress?: ProgressCallback;
}

@Injectable()
export class CouncilService {
  constructor(
    // New primary adapters (Groq + Gemini)
    @Optional() private readonly kvasirGemini: KvasirGeminiAdapter,
    @Optional() private readonly bragiGemini: BragiGeminiAdapter,
    @Optional() private readonly synGemini: SynGeminiAdapter,
    @Optional() private readonly nornesGroq: NornesGroqAdapter,
    @Optional() private readonly sagaGroq: SagaGroqAdapter,
    @Optional() private readonly lokiGroq: LokiGroqAdapter,
    // Legacy adapters (fallback)
    private readonly kvasir: KvasirAdapter,
    private readonly saga: SagaAdapter,
    private readonly loki: LokiAdapter,
    private readonly voting: VotingService
  ) {}

  /**
   * Main deliberation method - orchestrates all council members
   * Now with real-time progress streaming via onProgress callback
   */
  async deliberate(request: DeliberationRequest): Promise<CouncilDeliberation> {
    const startTime = Date.now();
    const deliberationId = generateId();
    const onProgress = request.onProgress || (async () => {});

    // Default council members based on available adapters
    const members = request.members ?? this.getAvailableMembers();
    const activeMembers = members.filter(m => m !== CouncilMember.LOKI && m !== CouncilMember.TYR);

    logger.info('Deliberation started', {
      id: deliberationId,
      query: request.query.slice(0, 100),
      members,
      availableAdapters: this.getAdapterStatus(),
    });

    // Announce each member and gather responses with progress updates
    await onProgress('deliberating', `Le conseil se reunit: ${activeMembers.join(', ')}...`);

    const responses = await this.gatherResponsesWithProgress(request.query, activeMembers, onProgress);

    // LOKI challenges the responses
    await onProgress('deliberating', `LOKI examine les reponses...`);
    const challenges = await this.gatherChallengesWithProgress(responses, onProgress);

    // TYR renders verdict
    await onProgress('deliberating', `TYR rend son verdict...`);
    const tyrVerdict = this.voting.renderVerdict(responses, challenges);
    await onProgress('deliberating', `Verdict TYR: ${tyrVerdict.verdict}`);

    // Synthesize final proposal using BRAGI
    await onProgress('deliberating', `BRAGI synthetise la reponse finale...`);
    const finalProposal = await this.synthesizeFinalProposal(responses, tyrVerdict, request.query);

    const processingTimeMs = Date.now() - startTime;

    const deliberation: CouncilDeliberation = {
      id: deliberationId,
      requestId: deliberationId,
      query: request.query,
      responses,
      lokiChallenges: challenges,
      tyrVerdict,
      finalProposal,
      totalProcessingTimeMs: processingTimeMs,
      timestamp: new Date(),
    };

    logger.info('Deliberation completed', {
      id: deliberationId,
      verdict: tyrVerdict.verdict,
      responseCount: responses.length,
      challengeCount: challenges.length,
      processingTimeMs,
    });

    return deliberation;
  }

  /**
   * Get list of available council members based on configured adapters
   */
  private getAvailableMembers(): CouncilMember[] {
    const members: CouncilMember[] = [];

    // Gemini-based members
    if (this.kvasirGemini?.isAvailable()) members.push(CouncilMember.KVASIR);
    if (this.bragiGemini?.isAvailable()) members.push(CouncilMember.BRAGI);
    if (this.synGemini?.isAvailable()) members.push(CouncilMember.SYN);

    // Groq-based members
    if (this.nornesGroq?.isAvailable()) members.push(CouncilMember.NORNES);
    if (this.sagaGroq?.isAvailable()) members.push(CouncilMember.SAGA);

    // LOKI and TYR always available (LOKI via Groq or fallback, TYR is voting system)
    members.push(CouncilMember.LOKI);
    members.push(CouncilMember.TYR);

    // If no primary adapters available, use legacy
    if (members.length <= 2) {
      logger.warn('No primary adapters available, using legacy adapters');
      return [CouncilMember.KVASIR, CouncilMember.SAGA, CouncilMember.LOKI, CouncilMember.TYR];
    }

    return members;
  }

  /**
   * Get adapter availability status for logging
   */
  private getAdapterStatus(): Record<string, boolean> {
    return {
      kvasirGemini: this.kvasirGemini?.isAvailable() ?? false,
      bragiGemini: this.bragiGemini?.isAvailable() ?? false,
      synGemini: this.synGemini?.isAvailable() ?? false,
      nornesGroq: this.nornesGroq?.isAvailable() ?? false,
      sagaGroq: this.sagaGroq?.isAvailable() ?? false,
      lokiGroq: this.lokiGroq?.isAvailable() ?? false,
    };
  }

  /**
   * Gather responses from all council members with real-time progress updates
   * Each member's response is streamed as it arrives
   */
  private async gatherResponsesWithProgress(
    query: string,
    members: CouncilMember[],
    onProgress: ProgressCallback
  ): Promise<CouncilResponse[]> {
    const responses: CouncilResponse[] = [];

    // Create promises for each member with progress tracking
    const memberPromises = members.map(async (member) => {
      await onProgress('deliberating', `${member} analyse la question...`);

      const response = await this.getMemberResponse(member, query);

      if (response) {
        await onProgress('deliberating', `${member} a repondu (confiance: ${response.confidence}%)`);
        return response;
      }

      await onProgress('deliberating', `${member} n'a pas pu repondre`);
      return null;
    });

    // Execute in parallel but stream results as they complete
    const results = await Promise.allSettled(memberPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        responses.push(result.value);
      }
    }

    return responses;
  }

  /**
   * Legacy gather responses (without progress)
   */
  private async gatherResponses(
    query: string,
    members: CouncilMember[]
  ): Promise<CouncilResponse[]> {
    return this.gatherResponsesWithProgress(query, members, async () => {});
  }

  /**
   * Get response from a specific council member
   * Uses primary adapters (Groq/Gemini) if available, falls back to legacy
   */
  private async getMemberResponse(
    member: CouncilMember,
    query: string
  ): Promise<CouncilResponse | null> {
    const startTime = Date.now();

    try {
      let response: { content: string; confidence: number; reasoning?: string; model?: string };

      switch (member) {
        case CouncilMember.KVASIR:
          if (this.kvasirGemini?.isAvailable()) {
            response = await this.kvasirGemini.query(query);
          } else {
            response = this.kvasir.query(query);
          }
          break;

        case CouncilMember.BRAGI:
          if (this.bragiGemini?.isAvailable()) {
            response = await this.bragiGemini.query(query);
          } else {
            // Fallback to KVASIR if no BRAGI available
            response = { content: '[BRAGI unavailable]', confidence: 0, reasoning: 'No adapter' };
          }
          break;

        case CouncilMember.SYN:
          if (this.synGemini?.isAvailable()) {
            response = await this.synGemini.query(query);
          } else {
            response = { content: '[SYN unavailable]', confidence: 0, reasoning: 'No adapter' };
          }
          break;

        case CouncilMember.NORNES:
          if (this.nornesGroq?.isAvailable()) {
            response = await this.nornesGroq.query(query);
          } else {
            response = { content: '[NORNES unavailable]', confidence: 0, reasoning: 'No adapter' };
          }
          break;

        case CouncilMember.SAGA:
          if (this.sagaGroq?.isAvailable()) {
            response = await this.sagaGroq.query(query);
          } else {
            response = this.saga.query(query);
          }
          break;

        default:
          return null;
      }

      return {
        member,
        content: response.content,
        confidence: response.confidence,
        reasoning: response.reasoning,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to get response from ${member}`, error as Error);
      return null;
    }
  }

  /**
   * LOKI challenges all responses with real-time progress updates
   */
  private async gatherChallengesWithProgress(
    responses: CouncilResponse[],
    onProgress: ProgressCallback
  ): Promise<LokiChallenge[]> {
    const challenges: LokiChallenge[] = [];

    for (const response of responses) {
      try {
        await onProgress('deliberating', `LOKI examine la reponse de ${response.member}...`);

        let lokiResponse: { challenge: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } | null;

        // Use Groq adapter if available (DeepSeek R1 Distill)
        if (this.lokiGroq?.isAvailable()) {
          lokiResponse = await this.lokiGroq.challenge(response);
        } else {
          // Fallback to legacy adapter
          const legacyResponse = this.loki.challenge(response);
          if (legacyResponse) {
            lokiResponse = {
              challenge: legacyResponse.challenge,
              severity: legacyResponse.severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
            };
          } else {
            lokiResponse = null;
          }
        }

        if (lokiResponse) {
          await onProgress('deliberating', `LOKI challenge ${response.member}: ${lokiResponse.severity}`);
          challenges.push({
            id: generateId(),
            targetMember: response.member,
            challenge: lokiResponse.challenge,
            severity: lokiResponse.severity,
            resolved: false,
            timestamp: new Date(),
          });
        } else {
          await onProgress('deliberating', `LOKI: pas de challenge pour ${response.member}`);
        }
      } catch (error) {
        logger.error(`LOKI challenge failed for ${response.member}`, error as Error);
        await onProgress('deliberating', `LOKI: erreur pour ${response.member}`);
      }
    }

    return challenges;
  }

  /**
   * Legacy LOKI challenges (without progress)
   */
  private async gatherChallenges(responses: CouncilResponse[]): Promise<LokiChallenge[]> {
    return this.gatherChallengesWithProgress(responses, async () => {});
  }

  /**
   * Synthesize final proposal using BRAGI (creative synthesis)
   */
  private async synthesizeFinalProposal(
    responses: CouncilResponse[],
    verdict: TyrVerdict,
    originalQuery: string
  ): Promise<string> {
    if (responses.length === 0) {
      return 'No consensus reached - insufficient responses from council members.';
    }

    // Find highest confidence response
    const bestResponse = responses.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // If BRAGI available, use it to synthesize a better response
    if (this.bragiGemini?.isAvailable() && responses.length > 1) {
      try {
        const synthesisPrompt = `En tant que BRAGI, synthetise ces reponses du conseil en une reponse claire et eloquente.

IMPORTANT: Tu DOIS repondre en FRANCAIS.

Question originale: ${originalQuery}

Reponses du conseil:
${responses.map(r => `- ${r.member} (${r.confidence}% confiance): ${r.content.slice(0, 500)}`).join('\n')}

Verdict TYR: ${verdict.verdict} (${Object.values(verdict.voteCounts).reduce((a, b) => a + b, 0)} votes)

Fournis une reponse unifiee et bien structuree qui:
1. Repond directement a la question originale
2. Incorpore les meilleures idees de chaque membre du conseil
3. Reconnait les incertitudes ou limitations
4. Maintient la rigueur epistemique de YGGDRASIL (faits verifies uniquement)
5. Est redigee en francais clair et accessible`;

        const synthesis = await this.bragiGemini.query(synthesisPrompt);
        return `[${verdict.verdict}] ${synthesis.content}`;
      } catch (error) {
        logger.error('BRAGI synthesis failed, using best response', error as Error);
      }
    }

    return `[${verdict.verdict}] ${bestResponse.content}`;
  }
}
