/**
 * YGGDRASIL Controller
 *
 * The main API endpoint for querying YGGDRASIL.
 * All requests are authenticated, rate-limited, and audited via HEIMDALL.
 *
 * NEW: Memory persistence endpoints for absolute memory
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Sse,
  MessageEvent,
  Param,
  Query,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Observable, of } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { YggdrasilService, YggdrasilResponse } from './yggdrasil.service.js';
import { ThinkingService, ThinkingStep } from './thinking.service.js';
import { MuninBridge } from './bridges/munin.bridge.js';
import { FactState, StoredFact, PersistenceResult } from '@yggdrasil/munin';

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

interface ProcessMessageDto {
  userId: string;
  chatId: string;
  messageId: string;
  content: string;
  userEmail: string;
}

interface VerifyFactDto {
  factId: string;
  verifiedBy: string;
  approve: boolean;
}

@Controller('yggdrasil')
@UseGuards(ThrottlerGuard)
export class YggdrasilController {
  constructor(
    private readonly yggdrasil: YggdrasilService,
    private readonly thinking: ThinkingService,
    private readonly munin: MuninBridge
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
  health(): { status: string; components: Record<string, string> } {
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

  // ============================================================================
  // MEMORY PERSISTENCE ENDPOINTS (MUNIN)
  // ============================================================================

  /**
   * Process a message and extract/persist important facts
   *
   * POST /yggdrasil/memory/process
   *
   * Called by BIFROST after each user message to extract and persist facts.
   * Only verified users (email verified) can have identity facts stored as VERIFIED.
   */
  @Post('memory/process')
  @HttpCode(HttpStatus.OK)
  async processMessage(@Body() dto: ProcessMessageDto): Promise<PersistenceResult> {
    if (!dto.userId || !dto.chatId || !dto.content || !dto.userEmail) {
      throw new BadRequestException('userId, chatId, content, and userEmail are required');
    }

    return this.munin.processMessageForFacts(
      dto.userId,
      dto.chatId,
      dto.messageId || `msg_${Date.now()}`,
      dto.content,
      dto.userEmail
    );
  }

  /**
   * Get user context for personalized responses
   *
   * POST /yggdrasil/memory/context
   *
   * Returns the user's identity and relevant facts for the given query.
   * Used to inject context into YGGDRASIL responses.
   */
  @Post('memory/context')
  @HttpCode(HttpStatus.OK)
  async getUserContext(
    @Body() dto: { userId: string; query: string }
  ): Promise<{ identity: StoredFact | null; relevantFacts: StoredFact[] }> {
    if (!dto.userId || !dto.query) {
      throw new BadRequestException('userId and query are required');
    }

    return this.munin.getUserContext(dto.userId, dto.query);
  }

  /**
   * Get all facts for a user
   *
   * GET /yggdrasil/memory/facts/:userId
   *
   * Optional query params: factTypes (comma-separated), state, limit
   */
  @Get('memory/facts/:userId')
  @HttpCode(HttpStatus.OK)
  async getUserFacts(
    @Param('userId') userId: string,
    @Query('state') state?: string,
    @Query('limit') limit?: string
  ): Promise<StoredFact[]> {
    return this.munin.getUserFacts(userId, {
      state: state as FactState | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Admin: Verify or reject a pending fact
   *
   * POST /yggdrasil/memory/verify
   *
   * Only admins can verify facts. Requires authentication.
   */
  @Post('memory/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyFact(
    @Body() dto: VerifyFactDto,
    @CurrentUser() user: UserPayload
  ): Promise<{ success: boolean }> {
    if (user.role !== 'ADMIN' && user.role !== 'SYSTEM') {
      throw new BadRequestException('Only admins can verify facts');
    }

    await this.munin.verifyFact(dto.factId, dto.verifiedBy || user.email, dto.approve);
    return { success: true };
  }
}
