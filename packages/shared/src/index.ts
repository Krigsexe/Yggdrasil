/**
 * @yggdrasil/shared
 *
 * Shared types, constants, errors, validation schemas, and utilities
 * for the YGGDRASIL ecosystem.
 */

// Types
export * from './types/index.js';

// Errors
export * from './errors/index.js';

// Constants
export * from './constants/index.js';

// Validation
export * from './validation/index.js';

// Utils
export * from './utils/index.js';

// Services
export * from './services/index.js';

// Database exports are available via '@yggdrasil/shared/database'
// Import directly to avoid Prisma binary issues in test environments:
// import { DatabaseModule, DatabaseService } from '@yggdrasil/shared/database';

// Embedding exports are available via '@yggdrasil/shared/embedding'
// import { EmbeddingModule, EmbeddingService } from '@yggdrasil/shared/embedding';
