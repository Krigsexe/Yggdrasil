/**
 * Source Service Tests
 *
 * Tests for MIMIR source management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SourceService } from './source.service.js';
import { SourceType, EpistemicBranch } from '@yggdrasil/shared';

describe('SourceService', () => {
  let service: SourceService;

  beforeEach(() => {
    service = new SourceService();
  });

  describe('instantiation', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('add', () => {
    it('should add a new source', () => {
      const source = service.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:2301.00001',
        url: 'https://arxiv.org/abs/2301.00001',
        title: 'Test Paper',
        authors: ['Author One', 'Author Two'],
        trustScore: 100,
      });

      expect(source).toBeDefined();
      expect(source.id).toBeDefined();
      expect(source.type).toBe(SourceType.ARXIV);
    });
  });

  describe('getById', () => {
    it('should retrieve a source by ID', () => {
      const added = service.add({
        type: SourceType.PUBMED,
        identifier: 'pmid:12345678',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12345678',
        title: 'Medical Study',
        authors: ['Dr. Research'],
        trustScore: 100,
      });

      const found = service.getById(added.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(added.id);
    });

    it('should throw NotFoundError for non-existent ID', () => {
      expect(() => service.getById('non-existent-id')).toThrow();
    });
  });

  describe('search', () => {
    it('should search sources by query', () => {
      service.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:quantum-1',
        url: 'https://arxiv.org/abs/quantum-1',
        title: 'Quantum Computing Advances',
        authors: ['Quantum Researcher'],
        trustScore: 100,
      });

      const results = service.search('quantum');

      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return statistics about sources', () => {
      const stats = service.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalSources).toBeGreaterThanOrEqual(0);
    });
  });
});
