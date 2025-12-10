/**
 * THING - Council Component
 *
 * Multi-model deliberation and consensus system.
 * Named after the Norse assembly where decisions were made.
 */

// Module
export * from './thing.module.js';

// Services
export * from './council.service.js';
export * from './voting.service.js';

// Legacy member adapters
export * from './members/kvasir.adapter.js';
export * from './members/saga.adapter.js';
export * from './members/loki.adapter.js';

// LLM Adapters (production-ready)
export * from './adapters/index.js';
