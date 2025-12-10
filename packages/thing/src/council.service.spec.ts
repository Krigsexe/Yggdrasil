/**
 * Council Service Tests
 *
 * Tests for THING council deliberation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CouncilService } from './council.service.js';
import { KvasirAdapter } from './members/kvasir.adapter.js';
import { SagaAdapter } from './members/saga.adapter.js';
import { LokiAdapter } from './members/loki.adapter.js';
import { VotingService } from './voting.service.js';
import { CouncilMember } from '@yggdrasil/shared';

describe('CouncilService', () => {
  let service: CouncilService;

  beforeEach(() => {
    const kvasir = new KvasirAdapter();
    const saga = new SagaAdapter();
    const loki = new LokiAdapter();
    const voting = new VotingService();

    // Create service with legacy adapters only (no Groq/Gemini in tests)
    // Use null as any to bypass TypeScript for optional NestJS injections
    service = new CouncilService(
      null as any, // kvasirGemini
      null as any, // bragiGemini
      null as any, // synGemini
      null as any, // nornesGroq
      null as any, // sagaGroq
      null as any, // lokiGroq
      kvasir,
      saga,
      loki,
      voting
    );
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('deliberate', () => {
    it('should return a deliberation result', async () => {
      const result = await service.deliberate({
        query: 'What is the meaning of life?',
        members: [CouncilMember.KVASIR, CouncilMember.SAGA],
      });

      expect(result).toBeDefined();
      expect(result.query).toContain('What is the meaning of life?');
    });

    it('should include TYR verdict', async () => {
      const result = await service.deliberate({
        query: 'Test query',
        members: [CouncilMember.KVASIR],
      });

      expect(result.tyrVerdict).toBeDefined();
    });
  });
});
