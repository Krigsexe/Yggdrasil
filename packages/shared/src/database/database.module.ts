/**
 * Database Module
 *
 * Global NestJS module for database access across all YGGDRASIL components.
 * Uses Prisma Client as the ORM layer.
 */

import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
