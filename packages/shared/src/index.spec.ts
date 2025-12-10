/**
 * Shared Package Tests
 *
 * Tests for core types, utilities, and validators.
 */

import { describe, it, expect } from 'vitest';
import {
  // Types
  EpistemicBranch,
  Role,
  SourceType,
  AuditAction,
  CouncilMember,

  // Constants
  YGGDRASIL_VERSION,
  SEVEN_PILLARS,
  SEVEN_LAWS,

  // Errors
  YggdrasilError,
  ValidationError,
  NotFoundError,
  EpistemicContaminationError,
  InvalidCredentialsError,
  TokenExpiredError,

  // Utils
  generateId,
  createLogger,
} from './index.js';

describe('YGGDRASIL Shared Package', () => {
  describe('Enums', () => {
    it('should have correct EpistemicBranch values', () => {
      expect(EpistemicBranch.MIMIR).toBe('MIMIR');
      expect(EpistemicBranch.VOLVA).toBe('VOLVA');
      expect(EpistemicBranch.HUGIN).toBe('HUGIN');
    });

    it('should have correct Role values', () => {
      expect(Role.USER).toBe('USER');
      expect(Role.ADMIN).toBe('ADMIN');
      expect(Role.SYSTEM).toBe('SYSTEM');
    });

    it('should have correct SourceType values', () => {
      // SourceType uses lowercase values
      expect(SourceType.ARXIV).toBe('arxiv');
      expect(SourceType.PUBMED).toBe('pubmed');
      expect(SourceType.ISO).toBe('iso');
      expect(SourceType.RFC).toBe('rfc');
      expect(SourceType.WIKIDATA).toBe('wikidata');
      expect(SourceType.WEB).toBe('web');
    });

    it('should have correct AuditAction values', () => {
      // AuditAction uses dotted notation
      expect(AuditAction.LOGIN).toBe('auth.login');
      expect(AuditAction.LOGOUT).toBe('auth.logout');
      expect(AuditAction.QUERY_SUBMIT).toBe('query.submit');
    });

    it('should have correct CouncilMember values', () => {
      expect(CouncilMember.KVASIR).toBe('KVASIR');
      expect(CouncilMember.SAGA).toBe('SAGA');
      expect(CouncilMember.LOKI).toBe('LOKI');
      expect(CouncilMember.TYR).toBe('TYR');
    });
  });

  describe('Constants', () => {
    it('should have YGGDRASIL_VERSION defined', () => {
      expect(YGGDRASIL_VERSION).toBeDefined();
      expect(typeof YGGDRASIL_VERSION).toBe('string');
      expect(YGGDRASIL_VERSION).toBe('0.1.0');
    });

    it('should have SEVEN_PILLARS as object with 7 pillars', () => {
      expect(SEVEN_PILLARS).toBeDefined();
      expect(Object.keys(SEVEN_PILLARS)).toHaveLength(7);
      expect(SEVEN_PILLARS.ABSOLUTE_VERACITY).toBeDefined();
      expect(SEVEN_PILLARS.SUSTAINABILITY).toBeDefined();
    });

    it('should have pillar structure with required fields', () => {
      const pillar = SEVEN_PILLARS.ABSOLUTE_VERACITY;
      expect(pillar.id).toBe('ABSOLUTE_VERACITY');
      expect(pillar.name).toBe('Absolute Veracity');
      expect(pillar.description).toBeDefined();
      expect(pillar.principle).toBeDefined();
      expect(pillar.implementation).toBeDefined();
    });

    it('should have SEVEN_LAWS as object with 7 laws', () => {
      expect(SEVEN_LAWS).toBeDefined();
      expect(Object.keys(SEVEN_LAWS)).toHaveLength(7);
      expect(SEVEN_LAWS.PRIMACY_OF_TRUTH).toBeDefined();
      expect(SEVEN_LAWS.PERPETUAL_OPENNESS).toBeDefined();
    });

    it('should have law structure with required fields', () => {
      const law = SEVEN_LAWS.PRIMACY_OF_TRUTH;
      expect(law.id).toBe('PRIMACY_OF_TRUTH');
      expect(law.number).toBe(1);
      expect(law.name).toBe('Primacy of Truth');
      expect(law.statement).toBe('YGGDRASIL never lies');
    });
  });

  describe('Errors', () => {
    it('should create YggdrasilError correctly', () => {
      const error = new YggdrasilError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('YggdrasilError');
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Validation failed');
      expect(error.message).toContain('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('User');
      expect(error.message).toContain('User');
      expect(error.message).toContain('not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create EpistemicContaminationError correctly', () => {
      const error = new EpistemicContaminationError('MIMIR', 'HUGIN');
      expect(error.code).toBe('EPISTEMIC_CONTAMINATION');
      expect(error.message).toContain('MIMIR');
      expect(error.message).toContain('HUGIN');
    });

    it('should create InvalidCredentialsError correctly', () => {
      const error = new InvalidCredentialsError();
      // Inherits from AuthenticationError
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toContain('Invalid');
    });

    it('should create TokenExpiredError correctly', () => {
      const error = new TokenExpiredError('access');
      // Inherits from AuthenticationError
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toContain('access');
      expect(error.message).toContain('expired');
    });
  });

  describe('Utils', () => {
    describe('generateId', () => {
      it('should generate a valid UUID', () => {
        const id = generateId();
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });

      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          ids.add(generateId());
        }
        expect(ids.size).toBe(100);
      });
    });

    describe('createLogger', () => {
      it('should create a logger with the specified context', () => {
        const logger = createLogger('TestContext', 'info');
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
      });
    });
  });
});
