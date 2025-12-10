/**
 * Hypothesis Service Tests
 *
 * Tests for VOLVA hypothesis management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HypothesisService } from './hypothesis.service.js';

describe('HypothesisService', () => {
  let service: HypothesisService;

  beforeEach(() => {
    service = new HypothesisService();
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new hypothesis', () => {
      const hypothesis = service.create('Test hypothesis', 75, []);

      expect(hypothesis).toBeDefined();
      expect(hypothesis.id).toBeDefined();
      expect(hypothesis.statement).toBe('Test hypothesis');
      expect(hypothesis.confidence).toBe(75);
    });

    it('should reject confidence outside VOLVA range (50-99)', () => {
      // VOLVA enforces strict epistemic separation - no clamping, only rejection
      expect(() => service.create('Low confidence', 30, [])).toThrow();
      expect(() => service.create('High confidence', 100, [])).toThrow();

      // Valid range should work
      const validHypothesis = service.create('Valid confidence', 75, []);
      expect(validHypothesis.confidence).toBe(75);
    });
  });

  describe('getById', () => {
    it('should retrieve a hypothesis by ID', () => {
      const created = service.create('Retrievable hypothesis', 60, []);
      const found = service.getById(created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
  });

  describe('search', () => {
    it('should search hypotheses by query', () => {
      service.create('Quantum gravity hypothesis', 70, []);
      service.create('Dark energy expansion', 65, []);

      const results = service.search('quantum');

      expect(results.length).toBe(1);
    });
  });
});
