/**
 * Ollama Adapter
 *
 * Adapter for local LLM models via Ollama.
 * Used by SAGA (Llama) for sovereign, local processing.
 * Supports data sovereignty - no data leaves local infrastructure.
 */

import { Injectable } from '@nestjs/common';
import { CouncilMember, createLogger } from '@yggdrasil/shared';
import {
  ILLMAdapter,
  CouncilMemberResponse,
  COUNCIL_SYSTEM_PROMPTS,
} from './llm.adapter.js';

const logger = createLogger('OllamaAdapter', 'info');

interface OllamaResponse {
  model: string;
  created_at: string;
  response?: string;
  message?: { role: string; content: string };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

@Injectable()
export class OllamaAdapter implements ILLMAdapter {
  readonly member = CouncilMember.SAGA;
  readonly modelId: string;
  private readonly baseUrl: string;
  private available: boolean | null = null;

  constructor() {
    this.baseUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    this.modelId = process.env['OLLAMA_MODEL'] ?? 'llama3.1:8b';
  }

  isAvailable(): boolean {
    // Cache availability check
    if (this.available !== null) return this.available;

    // Will be checked on first query
    return true;
  }

  async query(prompt: string): Promise<CouncilMemberResponse> {
    try {
      // Check if Ollama is available
      const tagsResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!tagsResponse.ok) {
        this.available = false;
        logger.warn('Ollama not available, using placeholder');
        return this.placeholderResponse(prompt);
      }

      this.available = true;

      // Use chat endpoint for conversation-style interaction
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            { role: 'system', content: COUNCIL_SYSTEM_PROMPTS[this.member] },
            { role: 'user', content: prompt },
          ],
          stream: false,
          options: {
            num_predict: 2048,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as OllamaResponse;
      const content = data.message?.content ?? data.response ?? '';

      logger.info('SAGA (Ollama) response received', {
        model: data.model,
        promptTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        durationMs: data.total_duration ? data.total_duration / 1e6 : undefined,
      });

      return {
        content,
        confidence: this.estimateConfidence(content),
        reasoning: `Response generated locally by ${data.model} via Ollama`,
        model: data.model,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        this.available = false;
        logger.warn('Ollama connection timed out');
      } else {
        logger.error('Ollama API call failed', error as Error);
      }
      return this.placeholderResponse(prompt);
    }
  }

  private placeholderResponse(prompt: string): CouncilMemberResponse {
    return {
      content: `[SAGA/Ollama placeholder] Query: "${prompt.slice(0, 50)}..."`,
      confidence: 50,
      reasoning: 'Placeholder - Ollama not available. Start Ollama with: ollama serve',
    };
  }

  private estimateConfidence(content: string): number {
    const uncertainWords = ['might', 'maybe', 'possibly', 'uncertain', 'unclear'];
    const confidentWords = ['definitely', 'certainly', 'clearly', 'verified'];

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

  /**
   * Check available models on Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = (await response.json()) as { models: Array<{ name: string }> };
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  /**
   * Pull a model if not available
   */
  async ensureModel(model: string = this.modelId): Promise<boolean> {
    try {
      const models = await this.listModels();
      if (models.includes(model)) return true;

      logger.info(`Pulling model ${model}...`);

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
