/**
 * Gemini Adapter
 *
 * Adapter for Google Gemini API.
 * Used by KVASIR (gemini-2.5-pro), BRAGI (gemini-2.5-flash), and SYN (gemini-2.5-pro).
 *
 * Available Models (Dec 2024):
 * - gemini-2.5-pro: SOTA reasoning (86.7% AIME 2025, 84% GPQA, 70.4% LiveCodeBench)
 * - gemini-2.5-flash: Fast reasoning with thinking capabilities
 * - gemini-2.5-flash-lite: Most cost-efficient
 * - gemini-2.0-flash: Multimodal with native audio
 *
 * @see https://ai.google.dev/gemini-api/docs/models
 */

import { Injectable } from '@nestjs/common';
import { CouncilMember, createLogger } from '@yggdrasil/shared';
import {
  ILLMAdapter,
  CouncilMemberResponse,
  COUNCIL_SYSTEM_PROMPTS,
} from './llm.adapter.js';

const logger = createLogger('GeminiAdapter', 'info');

interface GeminiContent {
  parts: Array<{ text: string }>;
  role?: 'user' | 'model';
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

export interface GeminiAdapterConfig {
  member: CouncilMember;
  defaultModel: string;
  modelEnvVar?: string;
  maxTokens?: number;
  temperature?: number;
  enableThinking?: boolean;
}

/**
 * Gemini Models Configuration
 * Optimized selection based on benchmarks
 */
export const GEMINI_MODELS = {
  // Deep Reasoning - Best for KVASIR (86.7% AIME 2025, 84% GPQA)
  GEMINI_2_5_PRO: 'gemini-2.5-pro',

  // Fast with Thinking - Best for BRAGI
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',

  // Cost-efficient
  GEMINI_2_5_FLASH_LITE: 'gemini-2.5-flash-lite',

  // Multimodal - Best for SYN (84.8% VideoMME)
  GEMINI_2_0_FLASH: 'gemini-2.0-flash',
} as const;

@Injectable()
export class GeminiAdapter implements ILLMAdapter {
  readonly member: CouncilMember;
  readonly modelId: string;
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly enableThinking: boolean;

  constructor(config: GeminiAdapterConfig) {
    this.member = config.member;
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.modelId = config.modelEnvVar
      ? (process.env[config.modelEnvVar] ?? config.defaultModel)
      : config.defaultModel;
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.enableThinking = config.enableThinking ?? false;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async query(prompt: string): Promise<CouncilMemberResponse> {
    if (!this.isAvailable()) {
      logger.warn(`${this.member} Gemini API key not configured, using placeholder`);
      return this.placeholderResponse(prompt);
    }

    try {
      const systemPrompt = COUNCIL_SYSTEM_PROMPTS[this.member];
      const fullPrompt = `${systemPrompt}\n\n---\n\nUser Query: ${prompt}`;

      const contents: GeminiContent[] = [
        {
          parts: [{ text: fullPrompt }],
          role: 'user',
        },
      ];

      const requestBody: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
          topP: 0.95,
          topK: 40,
        },
      };

      // Enable thinking mode for supported models
      if (this.enableThinking && this.modelId.includes('2.5')) {
        requestBody.generationConfig = {
          ...(requestBody.generationConfig as object),
          thinkingConfig: {
            thinkingBudget: 1024, // Allow up to 1024 tokens for thinking
          },
        };
      }

      const url = `${this.baseUrl}/models/${this.modelId}:generateContent?key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GeminiResponse;

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No candidates in Gemini response');
      }

      const content = data.candidates[0]?.content.parts
        .map((p) => p.text)
        .join('') ?? '';

      logger.info(`${this.member} Gemini response received`, {
        model: data.modelVersion || this.modelId,
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
        finishReason: data.candidates[0]?.finishReason,
      });

      return {
        content,
        confidence: this.estimateConfidence(content),
        reasoning: `Response generated by ${this.modelId}`,
        model: data.modelVersion || this.modelId,
      };
    } catch (error) {
      logger.error(`${this.member} Gemini API call failed`, error as Error);
      return this.placeholderResponse(prompt);
    }
  }

  private placeholderResponse(prompt: string): CouncilMemberResponse {
    return {
      content: `[${this.member} placeholder] Query: "${prompt.slice(0, 50)}..."`,
      confidence: 50,
      reasoning: `Placeholder - ${this.member} Gemini API not available`,
    };
  }

  private estimateConfidence(content: string): number {
    const uncertainWords = ['might', 'maybe', 'possibly', 'uncertain', 'unclear', 'perhaps', 'could be'];
    const confidentWords = ['definitely', 'certainly', 'clearly', 'verified', 'proven', 'confirmed', 'evidence shows'];

    const lowerContent = content.toLowerCase();
    let confidence = 70;

    for (const word of uncertainWords) {
      if (lowerContent.includes(word)) confidence -= 5;
    }
    for (const word of confidentWords) {
      if (lowerContent.includes(word)) confidence += 5;
    }

    return Math.max(30, Math.min(95, confidence));
  }
}

/**
 * KVASIR Adapter - Deep Reasoning Specialist
 * Uses Gemini 2.5 Pro for state-of-the-art reasoning
 * Benchmarks: 86.7% AIME 2025, 84% GPQA, 70.4% LiveCodeBench
 */
@Injectable()
export class KvasirGeminiAdapter extends GeminiAdapter {
  constructor() {
    super({
      member: CouncilMember.KVASIR,
      defaultModel: GEMINI_MODELS.GEMINI_2_5_PRO,
      modelEnvVar: 'GEMINI_KVASIR_MODEL',
      temperature: 0.4, // Lower for precise reasoning
      enableThinking: true, // Enable thinking mode for deep analysis
    });
  }

  /**
   * Deep analysis capability for KVASIR
   * Extracts claims and evaluates their validity
   */
  async analyze(content: string, context?: string): Promise<{
    claims: string[];
    confidence: number;
    concerns: string[];
    sources: string[];
  }> {
    const analysisPrompt = `As KVASIR, analyze the following content and extract:
1. Key claims being made (list each claim)
2. Your confidence level in the overall content (0-100)
3. Any concerns or red flags
4. Any sources or evidence mentioned

Content to analyze:
"${content}"

${context ? `Additional context: ${context}` : ''}

Provide a structured analysis.`;

    try {
      const result = await this.query(analysisPrompt);

      // Parse the response (simplified - in production use structured output)
      const claims: string[] = [];
      const concerns: string[] = [];
      const sources: string[] = [];

      const lines = result.content.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().includes('claim')) currentSection = 'claims';
        else if (trimmed.toLowerCase().includes('concern') || trimmed.toLowerCase().includes('red flag'))
          currentSection = 'concerns';
        else if (trimmed.toLowerCase().includes('source') || trimmed.toLowerCase().includes('evidence'))
          currentSection = 'sources';
        else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
          const item = trimmed.replace(/^[-*\d.]+\s*/, '');
          if (currentSection === 'claims') claims.push(item);
          else if (currentSection === 'concerns') concerns.push(item);
          else if (currentSection === 'sources') sources.push(item);
        }
      }

      return {
        claims,
        confidence: result.confidence,
        concerns,
        sources,
      };
    } catch (error) {
      logger.error('KVASIR analysis failed', error as Error);
      return {
        claims: [],
        confidence: 50,
        concerns: ['Analysis failed'],
        sources: [],
      };
    }
  }
}

/**
 * BRAGI Adapter - Creative & Eloquent Specialist
 * Uses Gemini 2.5 Flash for fast creative responses
 * Features: Thinking capabilities, fast inference
 */
@Injectable()
export class BragiGeminiAdapter extends GeminiAdapter {
  constructor() {
    super({
      member: CouncilMember.BRAGI,
      defaultModel: GEMINI_MODELS.GEMINI_2_5_FLASH,
      modelEnvVar: 'GEMINI_BRAGI_MODEL',
      temperature: 0.8, // Higher for creativity
      enableThinking: true,
    });
  }
}

/**
 * SYN Adapter - Vision & Multimodal Specialist
 * Uses Gemini 2.5 Pro for superior multimodal understanding
 * Benchmarks: 84.8% VideoMME
 */
@Injectable()
export class SynGeminiAdapter extends GeminiAdapter {
  constructor() {
    super({
      member: CouncilMember.SYN,
      defaultModel: GEMINI_MODELS.GEMINI_2_5_PRO,
      modelEnvVar: 'GEMINI_SYN_MODEL',
      temperature: 0.5,
      enableThinking: true,
    });
  }

  /**
   * Multimodal query capability for SYN
   * In production, this would handle images, video, and audio
   */
  async queryWithImage(
    prompt: string,
    _imageBase64: string,
    _mimeType: string = 'image/jpeg'
  ): Promise<CouncilMemberResponse> {
    // Placeholder - in production, would include image in the request
    logger.info('SYN multimodal query (image support placeholder)');
    return this.query(prompt);
  }
}
