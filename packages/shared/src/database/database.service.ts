/**
 * Database Service
 *
 * Singleton PrismaClient wrapper for NestJS dependency injection.
 * Implements OnModuleInit and OnModuleDestroy for proper lifecycle management.
 */

/* eslint-disable @typescript-eslint/no-unsafe-call */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Default DATABASE_URL for development (Supabase local)
const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env['DATABASE_URL'] || DEFAULT_DATABASE_URL;

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log:
        process.env['NODE_ENV'] === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this['$connect']();
  }

  async onModuleDestroy(): Promise<void> {
    await this['$disconnect']();
  }

  /**
   * Health check for database connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this['$queryRaw']`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    latencyMs: number;
  }> {
    const start = Date.now();
    try {
      await this['$queryRaw']`SELECT 1`;
      return {
        connected: true,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        connected: false,
        latencyMs: Date.now() - start,
      };
    }
  }
}
