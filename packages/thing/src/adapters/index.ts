/**
 * LLM Adapters Index
 *
 * Exports all LLM adapter implementations for the THING council.
 *
 * Provider Support (Dec 2024):
 * - Groq: qwen-qwq-32b, deepseek-r1-distill-qwen-32b, llama-3.3-70b-versatile
 * - Gemini: gemini-2.5-pro, gemini-2.5-flash
 */

// Base interfaces and types
export * from './llm.adapter.js';

// Provider-specific adapters (legacy)
export { AnthropicAdapter } from './anthropic.adapter.js';
export {
  OpenAICompatibleAdapter,
  NornesAdapter as NornesOpenAIAdapter,
  BragiAdapter as BragiOpenAIAdapter,
} from './openai.adapter.js';
export { OllamaAdapter } from './ollama.adapter.js';

// Groq adapters (NORNES, SAGA, LOKI)
export {
  GroqAdapter,
  NornesGroqAdapter,
  SagaGroqAdapter,
  LokiGroqAdapter,
  GROQ_MODELS,
} from './groq.adapter.js';

// Gemini adapters (KVASIR, BRAGI, SYN)
export {
  GeminiAdapter,
  KvasirGeminiAdapter,
  BragiGeminiAdapter,
  SynGeminiAdapter,
  GEMINI_MODELS,
} from './gemini.adapter.js';
