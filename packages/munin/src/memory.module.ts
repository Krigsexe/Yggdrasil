/**
 * Memory Module
 *
 * MUNIN - The chrono-semantic memory system of YGGDRASIL.
 * Handles storage, retrieval, and invalidation of memories with pgvector embeddings.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@yggdrasil/shared/database';
import { MemoryService } from './memory.service.js';
import { CheckpointService } from './checkpoint.service.js';
import { EmbeddingService } from './embedding.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [MemoryService, CheckpointService, EmbeddingService],
  exports: [MemoryService, CheckpointService, EmbeddingService],
})
export class MemoryModule {}
