/**
 * THING - Council Component
 *
 * Multi-model deliberation and consensus system.
 * Named after the Norse assembly where decisions were made.
 *
 * AGI v2.0 additions:
 * - Shapley Attribution for fair contribution tracking
 * - Cooperative game theory for member valuation
 */

// Module
export * from './thing.module.js';

// Services
export * from './council.service.js';
export * from './voting.service.js';
export * from './shapley.service.js';

// Legacy member adapters
export * from './members/kvasir.adapter.js';
export * from './members/saga.adapter.js';
export * from './members/loki.adapter.js';

// LLM Adapters (production-ready)
export * from './adapters/index.js';
