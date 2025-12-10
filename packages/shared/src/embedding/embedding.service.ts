/**
 * Shared Embedding Service for YGGDRASIL
 *
 * Centralized embedding generation using Google Gemini API.
 * Used by MIMIR (sources) and MUNIN (memories) for semantic search.
 *
 * Provider: Google Gemini (gemini-embedding-001)
 * Dimensions: 1536 (truncated from 3072 via MRL)
 * Context: 8K tokens
 * Languages: 100+
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EmbeddingService', 'info');

export interface EmbeddingConfig {
  /** Embedding dimension (default: 1536, max: 3072) */
  dimension?: number;
  /** Task type for optimized embeddings */
  taskType?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION';
  /** Use development mode (deterministic mock embeddings) */
  devMode?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
  tokenCount?: number;
}

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly apiKey: string | undefined;
  private readonly dimension: number;
  private readonly devMode: boolean;
  private readonly model = 'gemini-embedding-001';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private isAvailable = false;

  constructor(config?: EmbeddingConfig) {
    this.apiKey = process.env['GOOGLE_GEMINI_API_KEY'];
    this.dimension = config?.dimension ?? 1536;
    this.devMode = config?.devMode ?? !this.apiKey;

    if (this.dimension > 3072) {
      throw new Error('Gemini embedding dimension cannot exceed 3072');
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.devMode) {
      logger.warn('EmbeddingService running in DEV MODE - using deterministic mock embeddings');
      this.isAvailable = true;
      return;
    }

    if (!this.apiKey) {
      logger.error('GOOGLE_GEMINI_API_KEY not set - embedding service unavailable');
      this.isAvailable = false;
      return;
    }

    // Test API connectivity
    try {
      const testResult = await this.generate('test connection');
      if (testResult.embedding.length === this.dimension) {
        this.isAvailable = true;
        logger.info('EmbeddingService initialized', {
          model: this.model,
          dimension: this.dimension,
          provider: 'Google Gemini',
        });
      }
    } catch (err) {
      logger.error('Failed to initialize EmbeddingService', err instanceof Error ? err : new Error(String(err)));
      this.isAvailable = false;
    }
  }

  /**
   * Generate embedding for a single text.
   */
  async generate(
    text: string,
    taskType: EmbeddingConfig['taskType'] = 'RETRIEVAL_DOCUMENT'
  ): Promise<EmbeddingResult> {
    if (this.devMode || !this.apiKey) {
      return this.generateDevMode(text);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: `models/${this.model}`,
            content: {
              parts: [{ text }],
            },
            taskType,
            outputDimensionality: this.dimension,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        embedding: { values: number[] };
        metadata?: { tokenCount?: number };
      };

      const embedding = data.embedding.values;

      // Ensure correct dimension (MRL truncation)
      const truncated =
        embedding.length > this.dimension
          ? embedding.slice(0, this.dimension)
          : embedding;

      // Normalize to unit vector
      const normalized = this.normalize(truncated);

      logger.debug('Embedding generated', {
        textLength: text.length,
        dimension: normalized.length,
        tokenCount: data.metadata?.tokenCount,
      });

      const result: EmbeddingResult = {
        embedding: normalized,
        dimension: normalized.length,
        model: this.model,
      };
      if (data.metadata?.tokenCount !== undefined) {
        result.tokenCount = data.metadata.tokenCount;
      }
      return result;
    } catch (err) {
      logger.error('Embedding generation failed', err instanceof Error ? err : new Error(String(err)), { textLength: text.length });

      // Fallback to dev mode on error
      if (process.env['NODE_ENV'] !== 'production') {
        logger.warn('Falling back to dev mode embedding');
        return this.generateDevMode(text);
      }

      throw err;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch.
   * Gemini API supports batch requests for efficiency.
   */
  async generateBatch(
    texts: string[],
    taskType: EmbeddingConfig['taskType'] = 'RETRIEVAL_DOCUMENT'
  ): Promise<EmbeddingResult[]> {
    if (this.devMode || !this.apiKey) {
      return texts.map((text) => this.generateDevModeSync(text));
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: texts.map((text) => ({
              model: `models/${this.model}`,
              content: {
                parts: [{ text }],
              },
              taskType,
              outputDimensionality: this.dimension,
            })),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini batch API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        embeddings: Array<{ values: number[] }>;
      };

      const results = data.embeddings.map((item) => {
        const embedding = item.values;
        const truncated =
          embedding.length > this.dimension
            ? embedding.slice(0, this.dimension)
            : embedding;
        const normalized = this.normalize(truncated);

        return {
          embedding: normalized,
          dimension: normalized.length,
          model: this.model,
        };
      });

      logger.debug('Batch embeddings generated', {
        count: texts.length,
        dimension: this.dimension,
      });

      return results;
    } catch (err) {
      logger.error('Batch embedding generation failed', err instanceof Error ? err : new Error(String(err)), { count: texts.length });

      // Fallback to individual requests or dev mode
      if (process.env['NODE_ENV'] !== 'production') {
        logger.warn('Falling back to dev mode batch embedding');
        return texts.map((text) => this.generateDevModeSync(text));
      }

      throw err;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings.
   * Returns a value between -1 and 1, where 1 means identical.
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get the embedding dimension.
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Check if the service is available.
   */
  isServiceAvailable(): boolean {
    return this.isAvailable || this.devMode;
  }

  /**
   * Check if running in dev mode.
   */
  isDevMode(): boolean {
    return this.devMode;
  }

  /**
   * Normalize vector to unit length.
   */
  private normalize(embedding: number[]): number[] {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) return embedding;

    return embedding.map((val) => val / magnitude);
  }

  /**
   * Generate deterministic dev mode embedding (async version).
   */
  private generateDevMode(text: string): Promise<EmbeddingResult> {
    return Promise.resolve(this.generateDevModeSync(text));
  }

  /**
   * Generate deterministic dev mode embedding (sync version).
   * Uses a hash-based approach for consistent results.
   *
   * NOTE: NOT suitable for production semantic search!
   */
  private generateDevModeSync(text: string): EmbeddingResult {
    const embedding: number[] = new Array<number>(this.dimension).fill(0);
    const normalized = text.toLowerCase().trim();

    // Deterministic pseudo-embedding based on character codes
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      embedding[index] = (embedding[index] ?? 0) + 1;
    }

    // Add some variance based on text structure
    const words = normalized.split(/\s+/);
    for (let w = 0; w < words.length; w++) {
      const word = words[w] ?? '';
      const wordHash = this.simpleHash(word);
      const index = wordHash % this.dimension;
      embedding[index] = (embedding[index] ?? 0) + 0.5;
    }

    // Normalize to unit vector
    const normalizedEmbedding = this.normalize(embedding);

    return {
      embedding: normalizedEmbedding,
      dimension: this.dimension,
      model: 'dev-mode-mock',
    };
  }

  /**
   * Simple string hash for dev mode.
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
