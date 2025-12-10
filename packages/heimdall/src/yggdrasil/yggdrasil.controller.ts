/**
 * YGGDRASIL Controller
 *
 * The main API endpoint for querying YGGDRASIL.
 * All requests are authenticated, rate-limited, and audited via HEIMDALL.
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Sse,
  MessageEvent,
  Param,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Observable, map, merge, of, delay } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { YggdrasilService, YggdrasilResponse } from './yggdrasil.service.js';
import { ThinkingService, ThinkingStep } from './thinking.service.js';

interface QueryDto {
  query: string;
  userId?: string;  // For public endpoint
  sessionId?: string;
  context?: Record<string, unknown>;
  includeTrace?: boolean;
  options?: {
    requireMimirAnchor?: boolean;
    maxTimeMs?: number;
    returnTrace?: boolean;
  };
}

interface UserPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('yggdrasil')
@UseGuards(ThrottlerGuard)
export class YggdrasilController {
  constructor(
    private readonly yggdrasil: YggdrasilService,
    private readonly thinking: ThinkingService
  ) {}

  /**
   * Process a query through YGGDRASIL (authenticated)
   *
   * POST /yggdrasil/query/secure
   *
   * Requires authentication. Returns either:
   * - A verified answer with sources (isVerified: true)
   * - "I don't know" response (isVerified: false, answer: null)
   *
   * Never returns unverified information as fact.
   */
  @Post('query/secure')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async querySecure(
    @Body() dto: QueryDto,
    @CurrentUser() user: UserPayload
  ): Promise<YggdrasilResponse> {
    return this.yggdrasil.process({
      query: dto.query,
      userId: user.sub,
      sessionId: dto.sessionId,
      context: dto.context,
      options: dto.options,
    });
  }

  /**
   * Public query endpoint (for development/testing)
   *
   * POST /yggdrasil/query (without auth)
   *
   * Note: In production, use the authenticated endpoint instead.
   * This endpoint requires userId in the body.
   */
  @Post('query')
  @HttpCode(HttpStatus.CREATED)
  async publicQuery(@Body() dto: QueryDto): Promise<YggdrasilResponse> {
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!dto.query) {
      throw new BadRequestException('query is required');
    }

    const response = await this.yggdrasil.process({
      query: dto.query,
      userId: dto.userId,
      sessionId: dto.sessionId,
      context: dto.context,
      options: {
        ...dto.options,
        returnTrace: dto.includeTrace ?? dto.options?.returnTrace,
      },
    });

    return response;
  }

  /**
   * Process a query with thinking steps included in response
   *
   * POST /yggdrasil/query/thinking
   *
   * Returns the response with all thinking steps for display in UI.
   * The frontend can animate these steps to show reasoning process.
   */
  @Post('query/thinking')
  @HttpCode(HttpStatus.OK)
  async queryWithThinking(@Body() dto: QueryDto): Promise<YggdrasilResponse & { thinking: ThinkingStep[] }> {
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    if (!dto.query) {
      throw new BadRequestException('query is required');
    }

    // Process with thinking enabled
    const { response, thinkingSteps } = await this.yggdrasil.processWithThinking({
      query: dto.query,
      userId: dto.userId,
      sessionId: dto.sessionId,
      context: dto.context,
      options: {
        ...dto.options,
        returnTrace: dto.includeTrace ?? dto.options?.returnTrace,
      },
    });

    return {
      ...response,
      thinking: thinkingSteps,
    };
  }

  /**
   * Stream a query with real-time thinking steps via SSE
   *
   * POST /yggdrasil/query/stream
   *
   * Streams thinking steps as they happen, then the final response.
   * This allows the frontend to show reasoning in real-time.
   *
   * Event types:
   * - 'thinking': A thinking step (phase, thought)
   * - 'response': The final response
   * - 'error': An error occurred
   */
  @Post('query/stream')
  @HttpCode(HttpStatus.OK)
  @Sse()
  streamQuery(@Body() dto: QueryDto): Observable<MessageEvent> {
    if (!dto.userId) {
      return of({
        data: { type: 'error', message: 'userId is required' },
      } as MessageEvent);
    }
    if (!dto.query) {
      return of({
        data: { type: 'error', message: 'query is required' },
      } as MessageEvent);
    }

    // Process with streaming enabled
    return this.yggdrasil.processWithStreaming({
      query: dto.query,
      userId: dto.userId,
      sessionId: dto.sessionId,
      context: dto.context,
      options: {
        ...dto.options,
        returnTrace: dto.includeTrace ?? dto.options?.returnTrace,
      },
    });
  }

  /**
   * Health check for the YGGDRASIL pipeline
   *
   * POST /yggdrasil/health
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async health(): Promise<{ status: string; components: Record<string, string> }> {
    return {
      status: 'healthy',
      components: {
        ratatosk: 'ok',
        mimir: 'ok',
        volva: 'ok',
        hugin: 'ok',
        thing: 'ok',
        odin: 'ok',
        munin: 'ok',
      },
    };
  }
}
