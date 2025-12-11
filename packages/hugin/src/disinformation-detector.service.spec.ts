/**
 * Disinformation Detector Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DisinformationDetectorService,
  DisinformationType,
  SeverityLevel,
} from './disinformation-detector.service';

describe('DisinformationDetectorService', () => {
  let service: DisinformationDetectorService;

  beforeEach(() => {
    service = new DisinformationDetectorService();
  });

  describe('analyze', () => {
    it('should return low risk for clean content from trusted source', () => {
      const url = 'https://reuters.com/article/clean-article';
      const content =
        'Scientists at the University of Cambridge have published new research in the journal Nature, demonstrating advances in quantum computing.';

      const result = service.analyze(url, content);

      expect(result.riskScore).toBeLessThan(25);
      expect(result.severity).toBe(SeverityLevel.LOW);
      expect(result.recommendation).toBe('ACCEPT');
    });

    it('should detect emotional manipulation patterns', () => {
      const url = 'https://unknown-news.com/article';
      const content =
        "YOU WON'T BELIEVE what happened next! SHOCKING truth EXPOSED! This BOMBSHELL revelation changes EVERYTHING!";

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'EMOTIONAL_MANIPULATION')).toBe(true);
      expect(result.detectedTypes).toContain(DisinformationType.CLICKBAIT);
      expect(result.riskScore).toBeGreaterThan(20);
    });

    it('should detect conspiracy theory content', () => {
      const url = 'https://example-site.com/article';
      const content =
        "The deep state and the Illuminati are controlling everything. They don't want you to know the truth. Wake up sheeple!";

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'CONSPIRACY_CONTENT')).toBe(true);
      expect(result.detectedTypes).toContain(DisinformationType.FABRICATED_CONTENT);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
    });

    it('should detect scientific misinformation', () => {
      const url = 'https://fake-health-news.com/vaccines';
      const content =
        'Studies prove that vaccines cause autism. This dangerous practice should be stopped immediately.';

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'SCIENTIFIC_MISINFORMATION')).toBe(true);
      expect(result.detectedTypes).toContain(DisinformationType.SCIENTIFIC_MISINFORMATION);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
    });

    it('should detect climate change misinformation', () => {
      const url = 'https://news-site.com/climate';
      const content = 'Climate change is a hoax perpetrated by scientists for funding.';

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'SCIENTIFIC_MISINFORMATION')).toBe(true);
    });

    it('should detect vague attribution patterns', () => {
      const url = 'https://news-site.com/article';
      const content =
        'Sources say the government is hiding something. People are saying this is a coverup. Experts claim the truth is being suppressed. Many believe there is more to this story.';

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'VAGUE_ATTRIBUTION')).toBe(true);
    });

    it('should detect excessive caps usage', () => {
      const url = 'https://news-site.com/article';
      const content = 'THIS IS VERY IMPORTANT NEWS. EVERYONE MUST READ THIS. THE TRUTH IS HERE.';

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'EXCESSIVE_CAPS')).toBe(true);
    });

    it('should detect artificial urgency', () => {
      const url = 'https://news-site.com/article';
      const content =
        "ACT NOW before it's too late! Share this before they delete it! Limited time to expose the truth!";

      const result = service.analyze(url, content);

      expect(result.indicators.some((i) => i.type === 'ARTIFICIAL_URGENCY')).toBe(true);
      expect(result.detectedTypes).toContain(DisinformationType.MISLEADING_CONTENT);
    });

    it('should provide higher confidence with more indicators', () => {
      const lowIndicatorContent = 'This is a normal news article.';
      const highIndicatorContent =
        "SHOCKING! YOU WON'T BELIEVE! Sources say the deep state is hiding this. Act now before they delete it!";

      const lowResult = service.analyze('https://example.com/a', lowIndicatorContent);
      const highResult = service.analyze('https://example.com/b', highIndicatorContent);

      expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
    });
  });

  describe('shouldBlock', () => {
    it('should block known disinformation sources', () => {
      const result = service.shouldBlock('https://example-fake-news.com/article');

      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('Known disinformation source');
    });

    it('should not block unknown sources', () => {
      const result = service.shouldBlock('https://regular-news.com/article');

      expect(result.blocked).toBe(false);
    });
  });

  describe('isSatire', () => {
    it('should identify The Onion as satire', () => {
      expect(service.isSatire('https://theonion.com/article')).toBe(true);
    });

    it('should identify Babylon Bee as satire', () => {
      expect(service.isSatire('https://babylonbee.com/article')).toBe(true);
    });

    it('should not flag regular news as satire', () => {
      expect(service.isSatire('https://reuters.com/article')).toBe(false);
    });
  });

  describe('isFactChecker', () => {
    it('should identify Snopes as fact-checker', () => {
      expect(service.isFactChecker('https://snopes.com/fact-check/article')).toBe(true);
    });

    it('should identify PolitiFact as fact-checker', () => {
      expect(service.isFactChecker('https://politifact.com/article')).toBe(true);
    });

    it('should identify Reuters Fact Check as fact-checker', () => {
      expect(service.isFactChecker('https://reuters.com/fact-check/article')).toBe(true);
    });

    it('should not flag regular news as fact-checker', () => {
      expect(service.isFactChecker('https://example-news.com/article')).toBe(false);
    });
  });

  describe('severity determination', () => {
    it('should assign CRITICAL severity to fabricated content', () => {
      const url = 'https://site.com/article';
      const content =
        'The deep state conspiracy is real. The Illuminati controls the government. Wake up sheeple!';

      const result = service.analyze(url, content);

      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.recommendation).toBe('BLOCK');
    });

    it('should assign HIGH severity to high risk score', () => {
      const url = 'https://news24123.com/article';
      const content =
        "SHOCKING revelation! Sources say something big is happening. You won't believe this explosive news! People are saying this is HUGE. Experts claim it's true. Many believe the truth is being hidden. ACT NOW before they delete this!";

      const result = service.analyze(url, content);

      expect([SeverityLevel.HIGH, SeverityLevel.CRITICAL]).toContain(result.severity);
      expect(['FLAG', 'BLOCK']).toContain(result.recommendation);
    });
  });

  describe('recommendation generation', () => {
    it('should recommend ACCEPT for fact-checkers', () => {
      const url = 'https://snopes.com/fact-check/claim';
      const content = 'We investigated this claim and found it to be false.';

      const result = service.analyze(url, content);

      expect(result.recommendation).toBe('ACCEPT');
    });

    it('should recommend FLAG for suspicious content', () => {
      const url = 'https://breaking-real-news.com/article';
      const content =
        "This explosive report will shock you! Sources say the truth is being hidden. People are saying this is a scandal. Experts claim this is being covered up. Share before they delete it! Act now before it's too late!";

      const result = service.analyze(url, content);

      expect(['FLAG', 'REVIEW', 'BLOCK']).toContain(result.recommendation);
    });
  });

  describe('temporal analysis', () => {
    it('should detect old content presented as current', () => {
      const url = 'https://news-site.com/article';
      const content = 'BREAKING NEWS: This just happened today! Major developments this week.';
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const result = service.analyze(url, content, { publishDate: oldDate });

      expect(result.indicators.some((i) => i.type === 'TEMPORAL_MISMATCH')).toBe(true);
      expect(result.detectedTypes).toContain(DisinformationType.OUTDATED_INFORMATION);
    });

    it('should not flag recent content using current language', () => {
      const url = 'https://news-site.com/article';
      const content = 'This happened today in the ongoing story.';
      const recentDate = new Date();

      const result = service.analyze(url, content, { publishDate: recentDate });

      expect(result.indicators.some((i) => i.type === 'TEMPORAL_MISMATCH')).toBe(false);
    });
  });

  describe('explanation generation', () => {
    it('should provide clear explanation for risky content', () => {
      const url = 'https://suspicious.com/article';
      const content =
        "SHOCKING! The deep state doesn't want you to know this! Act now before it's deleted!";

      const result = service.analyze(url, content);

      expect(result.explanation).toContain('Risk score');
      expect(result.explanation.length).toBeGreaterThan(50);
    });

    it('should indicate no issues for clean content', () => {
      const url = 'https://reuters.com/article';
      const content =
        'The European Central Bank announced interest rate decisions in their monthly meeting.';

      const result = service.analyze(url, content);

      expect(result.explanation.toLowerCase()).toContain('no significant');
    });
  });
});
