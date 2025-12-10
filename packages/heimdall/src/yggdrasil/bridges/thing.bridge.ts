/**
 * THING Bridge
 *
 * Connects to the THING council component.
 * The Norse assembly where gods made collective decisions.
 *
 * THING orchestrates multi-model deliberation for complex queries.
 *
 * Council Configuration (Dec 2024):
 * - KVASIR: Gemini 2.5 Pro (86.7% AIME 2025)
 * - BRAGI: Gemini 2.5 Flash (fast + thinking)
 * - NORNES: Qwen QWQ-32B via Groq (79.5% AIME 2024)
 * - SAGA: Llama 3.3 70B via Groq (131K context)
 * - LOKI: DeepSeek R1 Distill via Groq (94.3% MATH-500)
 */

import { Injectable } from '@nestjs/common';
import {
  CouncilMember,
  CouncilDeliberation,
  EpistemicBranch,
  createLogger,
} from '@yggdrasil/shared';
import {
  CouncilService,
  VotingService,
  // Groq adapters
  NornesGroqAdapter,
  SagaGroqAdapter,
  LokiGroqAdapter,
  // Gemini adapters
  KvasirGeminiAdapter,
  BragiGeminiAdapter,
  SynGeminiAdapter,
  // Legacy adapters (fallback)
  KvasirAdapter,
  SagaAdapter,
  LokiAdapter,
  // Types
  ProgressCallback,
} from '@yggdrasil/thing';

const logger = createLogger('ThingBridge', 'info');

interface BranchResult {
  branch: EpistemicBranch;
  content: string;
  confidence: number;
}

export interface DeliberationInput {
  query: string;
  members: CouncilMember[];
  branchResults: BranchResult[];
  onProgress?: ProgressCallback;
}

@Injectable()
export class ThingBridge {
  private readonly council: CouncilService;
  private readonly adapterStatus: Record<string, boolean>;

  constructor() {
    // Initialize adapters
    const kvasirGemini = new KvasirGeminiAdapter();
    const bragiGemini = new BragiGeminiAdapter();
    const synGemini = new SynGeminiAdapter();
    const nornesGroq = new NornesGroqAdapter();
    const sagaGroq = new SagaGroqAdapter();
    const lokiGroq = new LokiGroqAdapter();

    // Legacy fallbacks
    const kvasir = new KvasirAdapter();
    const saga = new SagaAdapter();
    const loki = new LokiAdapter();
    const voting = new VotingService();

    // Track adapter availability
    this.adapterStatus = {
      kvasirGemini: kvasirGemini.isAvailable(),
      bragiGemini: bragiGemini.isAvailable(),
      synGemini: synGemini.isAvailable(),
      nornesGroq: nornesGroq.isAvailable(),
      sagaGroq: sagaGroq.isAvailable(),
      lokiGroq: lokiGroq.isAvailable(),
    };

    logger.info('THING Bridge initialized', { adapterStatus: this.adapterStatus });

    // Create council with all adapters
    this.council = new CouncilService(
      kvasirGemini,
      bragiGemini,
      synGemini,
      nornesGroq,
      sagaGroq,
      lokiGroq,
      kvasir,
      saga,
      loki,
      voting
    );
  }

  /**
   * Get current adapter availability status
   */
  getAdapterStatus(): Record<string, boolean> {
    return { ...this.adapterStatus };
  }

  async deliberate(input: DeliberationInput): Promise<CouncilDeliberation> {
    logger.info('Starting THING deliberation', {
      queryLength: input.query.length,
      memberCount: input.members.length,
      branchResultCount: input.branchResults.length,
      adapterStatus: this.adapterStatus,
    });

    // Build context from branch results
    const context = this.buildContext(input.branchResults);

    // Start council deliberation (now async) with optional progress callback
    const deliberation = await this.council.deliberate({
      query: `${input.query}\n\nContext from epistemic branches:\n${context}`,
      members: input.members,
      requireConsensus: true,
      onProgress: input.onProgress,
    });

    logger.info('THING deliberation complete', {
      verdict: deliberation.tyrVerdict.verdict,
      responseCount: deliberation.responses.length,
      challengeCount: deliberation.lokiChallenges.length,
      totalProcessingTimeMs: deliberation.totalProcessingTimeMs,
    });

    return deliberation;
  }

  private buildContext(branchResults: BranchResult[]): string {
    if (branchResults.length === 0) {
      return 'No context available from epistemic branches.';
    }

    return branchResults
      .map((result) => {
        const branchLabel = this.getBranchLabel(result.branch);
        return `[${branchLabel}] (${result.confidence}% confidence)\n${result.content}`;
      })
      .join('\n\n---\n\n');
  }

  private getBranchLabel(branch: EpistemicBranch): string {
    switch (branch) {
      case EpistemicBranch.MIMIR:
        return 'VERIFIED KNOWLEDGE';
      case EpistemicBranch.VOLVA:
        return 'RESEARCH/HYPOTHESIS';
      case EpistemicBranch.HUGIN:
        return 'UNVERIFIED WEB';
      default:
        return 'UNKNOWN';
    }
  }
}
