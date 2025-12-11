/**
 * Health Controller
 *
 * Provides real health checks for database and services.
 */

import { Controller, Get, Optional } from '@nestjs/common';
import { HealthStatus, ComponentHealth, YGGDRASIL_VERSION, RedisService } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly redis?: RedisService
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const components = await this.checkComponents();
    const overallStatus = this.determineOverallStatus(components);

    return {
      status: overallStatus,
      version: YGGDRASIL_VERSION,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      components,
      timestamp: new Date(),
    };
  }

  @Get('ready')
  async ready(): Promise<{ ready: boolean }> {
    // Check if all critical components are healthy
    const components = await this.checkComponents();
    const ready = components.every((c) => c.status === 'healthy' || c.status === 'degraded');
    return { ready };
  }

  @Get('live')
  live(): { live: boolean } {
    // Simple liveness check
    return { live: true };
  }

  private async checkComponents(): Promise<ComponentHealth[]> {
    const components: ComponentHealth[] = [];

    // HEIMDALL (self)
    components.push({
      name: 'HEIMDALL',
      status: 'healthy',
      latencyMs: 0,
      message: 'Gateway operational',
    });

    // Database check (real Prisma connection)
    const dbHealth = await this.checkDatabase();
    components.push(dbHealth);

    // Redis check
    const redisHealth = await this.checkRedis();
    components.push(redisHealth);

    return components;
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Execute a simple query to test the connection
      await this.db.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;

      return {
        name: 'DATABASE',
        status: 'healthy',
        latencyMs,
        message: 'PostgreSQL connected',
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        name: 'DATABASE',
        status: 'unhealthy',
        latencyMs,
        message: `PostgreSQL error: ${errorMessage}`,
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    if (!this.redis) {
      return {
        name: 'REDIS',
        status: 'degraded',
        latencyMs: 0,
        message: 'Redis service not injected',
      };
    }

    const pingResult = await this.redis.ping();

    if (pingResult.ok) {
      return {
        name: 'REDIS',
        status: 'healthy',
        latencyMs: pingResult.latencyMs,
        message: 'Redis connected',
      };
    }

    return {
      name: 'REDIS',
      status: this.redis.isAvailable() ? 'degraded' : 'unhealthy',
      latencyMs: pingResult.latencyMs,
      message: 'Redis not available (REDIS_URL not configured or connection failed)',
    };
  }

  private determineOverallStatus(
    components: ComponentHealth[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const hasUnhealthy = components.some((c) => c.status === 'unhealthy');
    const hasDegraded = components.some((c) => c.status === 'degraded');

    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}
