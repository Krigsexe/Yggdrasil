/**
 * Health Module
 */

import { Module } from '@nestjs/common';
import { RedisService } from '@yggdrasil/shared';
import { HealthController } from './health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [RedisService],
})
export class HealthModule {}
