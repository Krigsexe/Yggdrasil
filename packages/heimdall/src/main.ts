/**
 * HEIMDALL - Gateway Entry Point
 *
 * The guardian of YGGDRASIL. All requests must pass through HEIMDALL.
 */

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { createLogger } from '@yggdrasil/shared';

const logger = createLogger('HEIMDALL', 'info');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
    })
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS configuration - allow Bifrost (3001) and Heimdall (3000)
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const envOrigins = process.env['CORS_ORIGINS']?.split(',').filter(Boolean) ?? [];
  const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen(port, host);

  logger.info('HEIMDALL is watching', {
    port,
    host,
    environment: process.env['NODE_ENV'] ?? 'development',
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start HEIMDALL', error as Error);
  process.exit(1);
});
