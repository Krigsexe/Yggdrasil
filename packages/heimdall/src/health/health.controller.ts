/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { HealthStatus, ComponentHealth, YGGDRASIL_VERSION } from '@yggdrasil/shared';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  check(): HealthStatus {
    const components = this.checkComponents();
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
  ready(): { ready: boolean } {
    // Check if all critical components are healthy
    const components = this.checkComponents();
    const ready = components.every(
      (c) => c.status === 'healthy' || c.status === 'degraded'
    );
    return { ready };
  }

  @Get('live')
  live(): { live: boolean } {
    // Simple liveness check
    return { live: true };
  }

  private checkComponents(): ComponentHealth[] {
    const components: ComponentHealth[] = [];

    // HEIMDALL (self)
    components.push({
      name: 'HEIMDALL',
      status: 'healthy',
      latencyMs: 0,
      message: 'Gateway operational',
    });

    // Database check (placeholder)
    components.push({
      name: 'DATABASE',
      status: 'healthy', // TODO: Actual check when Prisma is set up
      latencyMs: 1,
      message: 'In-memory store active',
    });

    // Redis check (placeholder)
    components.push({
      name: 'REDIS',
      status: 'healthy', // TODO: Actual check when Redis is set up
      latencyMs: 1,
      message: 'Not configured',
    });

    return components;
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
