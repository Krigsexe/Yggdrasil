/**
 * HEIMDALL App Module
 *
 * The root module that assembles all YGGDRASIL components.
 * HEIMDALL is the guardian - all requests pass through here.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@yggdrasil/shared/database';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { HealthModule } from './health/health.module.js';
import { YggdrasilModule } from './yggdrasil/yggdrasil.module.js';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database (Prisma)
    DatabaseModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3600000,
        limit: 1000,
      },
    ]),

    // Feature modules
    AuthModule,
    AuditModule,
    HealthModule,

    // Main YGGDRASIL pipeline
    YggdrasilModule,
  ],
})
export class AppModule {}
