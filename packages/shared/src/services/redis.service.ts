/**
 * Redis Service
 *
 * Centralized Redis client for caching and session management.
 * Used by MUNIN for memory caching and HEIMDALL for rate limiting.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('RedisService', 'info');

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly redisUrl: string | undefined;

  constructor() {
    this.redisUrl = process.env['REDIS_URL'];
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisUrl) {
      logger.warn('REDIS_URL not configured, Redis features disabled');
      return;
    }

    try {
      this.client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
        lazyConnect: true,
      });

      await this.client.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', error as Error);
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.client.status === 'ready';
  }

  getClient(): Redis | null {
    return this.client;
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    if (!this.client) {
      return { ok: false, latencyMs: 0 };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      return { ok: true, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch {
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch {
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.incr(key);
    } catch {
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch {
      return false;
    }
  }
}
