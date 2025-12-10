/**
 * HUGIN Module
 *
 * The raven "Thought" - Internet/real-time information branch.
 * Fetches, filters, and watches web content with trust scoring.
 * All content is marked as unverified (max 49% trust).
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@yggdrasil/shared/database';
import { WebService } from './web.service.js';
import { FilterService } from './filter.service.js';
import { WatcherService } from './watcher.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [FilterService, WebService, WatcherService],
  exports: [WebService, FilterService, WatcherService],
})
export class HuginModule {}
