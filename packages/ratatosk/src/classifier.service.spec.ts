/**
 * Classifier Service Tests
 *
 * Tests for query classification logic.
 */

import { describe, it, expect } from 'vitest';
import { ClassifierService } from './classifier.service.js';

describe('ClassifierService', () => {
  const service = new ClassifierService();

  describe('classify', () => {
    it('should classify factual queries', () => {
      const result = service.classify('What is the speed of light?');

      expect(result).toBeDefined();
      expect(result.type).toBe('factual');
      expect(result.requiresVerification).toBe(true);
    });

    it('should classify creative queries', () => {
      const result = service.classify('Write me a poem about stars');

      expect(result.type).toBe('creative');
    });

    it('should classify historical queries', () => {
      const result = service.classify('When did the ancient Roman civilization fall?');

      expect(result.type).toBe('factual');
      expect(result.domain).toBe('history');
    });

    it('should classify current events queries', () => {
      const result = service.classify('What are the latest news in technology?');

      expect(result.type).toBe('current_events');
      expect(result.requiresRealtime).toBe(true);
    });

    it('should classify research queries', () => {
      const result = service.classify('What studies show about quantum computing?');

      expect(result.type).toBe('research');
      expect(result.requiresVerification).toBe(true);
    });

    it('should extract keywords from queries', () => {
      const result = service.classify('What is quantum entanglement?');

      expect(result.keywords).toBeDefined();
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should assign complexity based on query length and structure', () => {
      const simpleQuery = service.classify('Hello');
      const moderateQuery = service.classify(
        'Can you explain the relationship between quantum mechanics and general relativity in the context of black hole information paradox?'
      );

      expect(simpleQuery.complexity).toBe('simple');
      expect(moderateQuery.complexity).toBe('moderate');
    });

    it('should detect controversial topics', () => {
      const result = service.classify('What are your thoughts on the election results?');

      expect(result.controversial).toBe(true);
    });

    it('should identify the domain of queries', () => {
      const scienceQuery = service.classify('What is the physics of black holes?');
      const mathQuery = service.classify('How do you calculate the area of a circle?');

      expect(scienceQuery.domain).toBe('science');
      expect(mathQuery.domain).toBe('mathematics');
    });
  });
});
