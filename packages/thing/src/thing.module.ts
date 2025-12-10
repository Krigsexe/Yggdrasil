/**
 * THING Module
 *
 * Multi-model council for deliberation and consensus.
 *
 * Council Configuration (Dec 2024):
 * - KVASIR: Deep reasoning → Gemini 2.5 Pro (86.7% AIME 2025)
 * - BRAGI: Creativity → Gemini 2.5 Flash (fast + thinking)
 * - NORNES: Logic/Math → Qwen QWQ-32B via Groq (79.5% AIME 2024)
 * - SAGA: General knowledge → Llama 3.3 70B via Groq (131K context)
 * - SYN: Vision/Multimodal → Gemini 2.5 Pro (84.8% VideoMME)
 * - LOKI: Adversarial critique → DeepSeek R1 Distill via Groq (94.3% MATH-500)
 * - TYR: Arbiter (voting system - no LLM)
 */

import { Module } from '@nestjs/common';
import { CouncilService } from './council.service.js';
import { VotingService } from './voting.service.js';

// Legacy adapters (for backwards compatibility)
import { KvasirAdapter } from './members/kvasir.adapter.js';
import { SagaAdapter } from './members/saga.adapter.js';
import { LokiAdapter } from './members/loki.adapter.js';
import { AnthropicAdapter } from './adapters/anthropic.adapter.js';
import { NornesAdapter as NornesOpenAIAdapter, BragiAdapter as BragiOpenAIAdapter } from './adapters/openai.adapter.js';
import { OllamaAdapter } from './adapters/ollama.adapter.js';

// New Groq adapters (NORNES, SAGA, LOKI)
import {
  NornesGroqAdapter,
  SagaGroqAdapter,
  LokiGroqAdapter,
} from './adapters/groq.adapter.js';

// New Gemini adapters (KVASIR, BRAGI, SYN)
import {
  KvasirGeminiAdapter,
  BragiGeminiAdapter,
  SynGeminiAdapter,
} from './adapters/gemini.adapter.js';

@Module({
  providers: [
    CouncilService,
    VotingService,

    // === PRIMARY ADAPTERS (Groq + Gemini) ===
    // Gemini-based council members
    KvasirGeminiAdapter,
    BragiGeminiAdapter,
    SynGeminiAdapter,
    // Groq-based council members
    NornesGroqAdapter,
    SagaGroqAdapter,
    LokiGroqAdapter,

    // === LEGACY ADAPTERS (fallback) ===
    KvasirAdapter,
    SagaAdapter,
    LokiAdapter,
    AnthropicAdapter,
    NornesOpenAIAdapter,
    BragiOpenAIAdapter,
    OllamaAdapter,
  ],
  exports: [
    CouncilService,
    VotingService,
    // Primary adapters
    KvasirGeminiAdapter,
    BragiGeminiAdapter,
    SynGeminiAdapter,
    NornesGroqAdapter,
    SagaGroqAdapter,
    LokiGroqAdapter,
    // Legacy adapters
    AnthropicAdapter,
    NornesOpenAIAdapter,
    BragiOpenAIAdapter,
    OllamaAdapter,
  ],
})
export class ThingModule {}
