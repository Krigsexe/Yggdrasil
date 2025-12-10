/**
 * Filter Service
 *
 * Filters and scores web content for trustworthiness.
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@yggdrasil/shared';

const logger = createLogger('FilterService', 'info');

export type BiasIndicator =
  | 'political_bias'
  | 'commercial_bias'
  | 'sensationalism'
  | 'factual_errors'
  | 'outdated'
  | 'unverified_claims';

export interface FilterResult {
  trustScore: number;
  biasIndicators: BiasIndicator[];
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
}

@Injectable()
export class FilterService {
  // Known unreliable domains
  private readonly blockedDomains = new Set([
    'fake-news.example.com',
    'misinformation.example.com',
  ]);

  // Known reliable domains with higher base scores
  private readonly trustedDomains: Map<string, number> = new Map([
    ['wikipedia.org', 40],
    ['bbc.com', 45],
    ['reuters.com', 45],
    ['nytimes.com', 40],
    ['nature.com', 48],
    ['sciencedirect.com', 48],
  ]);

  // Domains with known bias
  private readonly biasedDomains: Map<string, BiasIndicator[]> = new Map([
    ['example-political-left.com', ['political_bias']],
    ['example-political-right.com', ['political_bias']],
    ['advertorial-site.com', ['commercial_bias']],
  ]);

  filter(url: string, content: string): FilterResult {
    const domain = this.extractDomain(url);

    // Check if domain is blocked
    if (this.blockedDomains.has(domain)) {
      logger.warn('Blocked domain accessed', { domain });
      return {
        trustScore: 0,
        biasIndicators: [],
        warnings: ['Domain is on blocklist'],
        blocked: true,
        blockReason: 'Known misinformation source',
      };
    }

    const trustScore = this.calculateTrustScore(domain);
    const biasIndicators = this.detectBias(domain, content);
    const warnings = this.getWarnings(domain);

    // Add content-based warnings
    if (this.containsSensationalism(content)) {
      biasIndicators.push('sensationalism');
      warnings.push('Content may contain sensationalist language');
    }

    if (this.containsUnverifiedClaims(content)) {
      biasIndicators.push('unverified_claims');
      warnings.push('Content contains unverified claims');
    }

    logger.info('Content filtered', { domain, trustScore, warningCount: warnings.length });

    return {
      trustScore,
      biasIndicators,
      warnings,
      blocked: false,
    };
  }

  calculateTrustScore(domain: string): number {
    // Check trusted domains
    const trustedScore = this.trustedDomains.get(domain);
    if (trustedScore !== undefined) {
      return trustedScore;
    }

    // Check if it's a known biased domain
    if (this.biasedDomains.has(domain)) {
      return 20;
    }

    // Default score for unknown domains
    return 30;
  }

  getWarnings(domain: string): string[] {
    const warnings: string[] = [];

    // Check for known biases
    const biases = this.biasedDomains.get(domain);
    if (biases) {
      biases.forEach((bias) => {
        warnings.push(`Domain has known ${bias.replace('_', ' ')}`);
      });
    }

    // Unknown domain warning
    if (!this.trustedDomains.has(domain) && !this.biasedDomains.has(domain)) {
      warnings.push('Unknown domain - verify with additional sources');
    }

    return warnings;
  }

  private detectBias(domain: string, _content: string): BiasIndicator[] {
    const indicators: BiasIndicator[] = [];

    // Domain-based bias
    const domainBias = this.biasedDomains.get(domain);
    if (domainBias) {
      indicators.push(...domainBias);
    }

    return indicators;
  }

  private containsSensationalism(content: string): boolean {
    const sensationalistPatterns = [
      /BREAKING/i,
      /SHOCKING/i,
      /YOU WON'T BELIEVE/i,
      /MUST SEE/i,
      /EXPLOSIVE/i,
    ];

    return sensationalistPatterns.some((pattern) => pattern.test(content));
  }

  private containsUnverifiedClaims(content: string): boolean {
    const unverifiedPatterns = [
      /sources say/i,
      /reportedly/i,
      /allegedly/i,
      /unconfirmed reports/i,
      /rumors suggest/i,
    ];

    return unverifiedPatterns.some((pattern) => pattern.test(content));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}
