/**
 * Database exports
 *
 * Note: Prisma types are NOT re-exported here to avoid conflicts
 * with the application-level types in @yggdrasil/shared/types.
 * Import Prisma types directly from '@prisma/client' when needed.
 */

export { DatabaseModule } from './database.module.js';
export { DatabaseService } from './database.service.js';

// Re-export only PrismaClient for direct usage
export { PrismaClient, Prisma } from '@prisma/client';
