/**
 * Filter Service Tests
 *
 * Tests for HUGIN content filtering and trust scoring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FilterService } from './filter.service.js';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    service = new FilterService();
  });

  describe('filter', () => {
    it('should return a filter result for web content', () => {
      const result = service.filter(
        'https://en.wikipedia.org/wiki/Test',
        'This is test content from Wikipedia.'
      );

      expect(result).toBeDefined();
      expect(result.blocked).toBeDefined();
      expect(result.trustScore).toBeDefined();
    });

    it('should assign trust score below HUGIN threshold', () => {
      const result = service.filter(
        'https://example.com/article',
        'Some web content'
      );

      // HUGIN content should have trust score <= 49
      expect(result.trustScore).toBeLessThanOrEqual(49);
    });

    it('should detect bias indicators', () => {
      const result = service.filter(
        'https://partisan-site.com/news',
        'Content with strong opinions'
      );

      expect(result.biasIndicators).toBeDefined();
      expect(Array.isArray(result.biasIndicators)).toBe(true);
    });
  });

  describe('Trust Scoring', () => {
    it('should give higher trust to known reputable sources', () => {
      const wikipedia = service.filter(
        'https://en.wikipedia.org/wiki/Science',
        'Scientific content'
      );

      const unknownSite = service.filter(
        'https://random-unknown-site.xyz/article',
        'Random content'
      );

      expect(wikipedia.trustScore).toBeGreaterThanOrEqual(unknownSite.trustScore);
    });

    it('should block content from blocked sources', () => {
      const result = service.filter(
        'https://fake-news.example.com/fake-news',
        'Misleading content'
      );

      expect(result.blocked).toBe(true);
      expect(result.trustScore).toBe(0);
    });
  });

  describe('Content Analysis', () => {
    it('should add warnings for unknown domains', () => {
      const result = service.filter(
        'https://news.example.com/article',
        'Scientists discovered that the universe is 13.8 billion years old.'
      );

      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should detect sensationalist content', () => {
      const result = service.filter(
        'https://example.com/article',
        'BREAKING NEWS: SHOCKING discovery you must see!'
      );

      expect(result.biasIndicators).toContain('sensationalism');
    });

    it('should detect unverified claims', () => {
      const result = service.filter(
        'https://example.com/article',
        'Sources say that reportedly the company is allegedly in trouble.'
      );

      expect(result.biasIndicators).toContain('unverified_claims');
    });
  });

  describe('Epistemic Integrity', () => {
    it('should never elevate HUGIN content to MIMIR trust levels', () => {
      // Even the most trusted web source should not reach MIMIR level (100)
      const result = service.filter(
        'https://nature.com/articles/study',
        'Peer-reviewed scientific article summary'
      );

      expect(result.trustScore).toBeLessThan(50);
    });

    it('should process content from academic sources', () => {
      const result = service.filter(
        'https://arxiv.org/abs/2301.00001',
        'Preprint research paper'
      );

      // Content from academic sources is processed normally
      expect(result).toBeDefined();
      expect(result.blocked).toBe(false);
    });
  });
});
