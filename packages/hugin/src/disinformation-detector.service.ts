/**
 * Disinformation Detector Service
 *
 * Advanced disinformation and misinformation detection for HUGIN.
 * Implements multi-layered analysis to identify unreliable content.
 *
 * Detection layers:
 * 1. Source credibility analysis
 * 2. Content linguistic patterns
 * 3. Claim verification signals
 * 4. Cross-reference inconsistencies
 * 5. Temporal anomalies
 *
 * "HUGIN voit tout, mais ne croit que ce qui est verifiable."
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@yggdrasil/shared';

const logger = createLogger('DisinformationDetector', 'info');

/**
 * Types of disinformation detected
 */
export enum DisinformationType {
  FABRICATED_CONTENT = 'FABRICATED_CONTENT', // Completely made up
  MANIPULATED_CONTENT = 'MANIPULATED_CONTENT', // Altered real content
  MISLEADING_CONTENT = 'MISLEADING_CONTENT', // Real but misleading framing
  FALSE_CONTEXT = 'FALSE_CONTEXT', // Real content, wrong context
  SATIRE_AS_NEWS = 'SATIRE_AS_NEWS', // Satire presented as real
  CLICKBAIT = 'CLICKBAIT', // Exaggerated to attract clicks
  PROPAGANDA = 'PROPAGANDA', // Political manipulation
  CONSPIRACY_THEORY = 'CONSPIRACY_THEORY', // Unfounded conspiracy claims
  OUTDATED_INFORMATION = 'OUTDATED_INFORMATION', // No longer accurate
  SCIENTIFIC_MISINFORMATION = 'SCIENTIFIC_MISINFORMATION', // False science claims
}

/**
 * Severity levels for detected issues
 */
export enum SeverityLevel {
  LOW = 'LOW', // Minor concerns
  MEDIUM = 'MEDIUM', // Significant concerns
  HIGH = 'HIGH', // Serious concerns
  CRITICAL = 'CRITICAL', // Block recommended
}

/**
 * Result of disinformation analysis
 */
export interface DisinformationAnalysis {
  /** Overall risk score (0-100, higher = more risky) */
  riskScore: number;

  /** Detected types of disinformation */
  detectedTypes: DisinformationType[];

  /** Severity level */
  severity: SeverityLevel;

  /** Detailed indicators found */
  indicators: DisinformationIndicator[];

  /** Recommendation */
  recommendation: 'ACCEPT' | 'REVIEW' | 'FLAG' | 'BLOCK';

  /** Human-readable explanation */
  explanation: string;

  /** Confidence in the analysis */
  confidence: number;
}

/**
 * Individual indicator of disinformation
 */
export interface DisinformationIndicator {
  type: string;
  description: string;
  evidence: string;
  weight: number; // Impact on risk score
}

/**
 * Known fact-checking organizations (domain-only)
 */
const FACT_CHECKER_DOMAINS = new Set([
  'snopes.com',
  'factcheck.org',
  'politifact.com',
  'fullfact.org',
]);

/**
 * Fact-checker URL patterns (domain + path)
 */
const FACT_CHECKER_URL_PATTERNS = [
  /reuters\.com\/fact-check/i,
  /apnews\.com\/ap-fact-check/i,
  /afp\.com\/.*afp-fact-check/i,
];

/**
 * Known satire sites that should not be treated as news
 */
const SATIRE_SITES = new Set([
  'theonion.com',
  'babylonbee.com',
  'clickhole.com',
  'newyorker.com/humor',
  'reductress.com',
  'thebeaverton.com',
  'thedailymash.co.uk',
  'newsthump.com',
  'waterfordwhispersnews.com',
]);

/**
 * Domains known for spreading disinformation
 */
const KNOWN_DISINFO_DOMAINS = new Set([
  // Add known problematic domains
  'example-fake-news.com',
  'totally-real-news.net',
]);

/**
 * Scientific consensus topics that are often targets of misinformation
 */
const SCIENTIFIC_CONSENSUS_TOPICS = [
  {
    topic: 'climate_change',
    consensus: 'human-caused climate change is real',
    misinfo_patterns: [/climate.*hoax/i, /global warming.*fake/i, /climate.*scam/i],
  },
  {
    topic: 'vaccines',
    consensus: 'vaccines are safe and effective',
    misinfo_patterns: [/vaccines?.*cause.*autism/i, /vaccines?.*dangerous/i, /anti-?vax/i],
  },
  {
    topic: 'evolution',
    consensus: 'evolution is scientific fact',
    misinfo_patterns: [/evolution.*lie/i, /darwin.*wrong/i],
  },
  {
    topic: 'earth_shape',
    consensus: 'earth is an oblate spheroid',
    misinfo_patterns: [/flat earth/i, /earth.*flat/i],
  },
];

/**
 * Conspiracy theory patterns
 */
const CONSPIRACY_PATTERNS = [
  /deep state/i,
  /new world order/i,
  /illuminati/i,
  /chemtrails/i,
  /5g.*covid/i,
  /microchip.*vaccine/i,
  /lizard people/i,
  /secret cabal/i,
  /global elite.*control/i,
  /they don'?t want you to know/i,
  /mainstream media.*lying/i,
  /wake up.*sheeple/i,
];

/**
 * Emotional manipulation patterns
 */
const EMOTIONAL_MANIPULATION_PATTERNS = [
  /you won'?t believe/i,
  /shocking.*truth/i,
  /what.*doesn'?t want you to know/i,
  /bombshell/i,
  /exposed/i,
  /scandal/i,
  /outrage/i,
  /destroyed/i,
  /slammed/i,
  /epic fail/i,
  /this changes everything/i,
  /doctors.*hate.*this/i,
];

/**
 * Patterns indicating lack of attribution
 */
const VAGUE_ATTRIBUTION_PATTERNS = [
  /sources say/i,
  /people are saying/i,
  /many believe/i,
  /experts claim/i,
  /studies show/i,
  /research proves/i,
  /it is known/i,
  /everyone knows/i,
];

@Injectable()
export class DisinformationDetectorService {
  /**
   * Analyze content for disinformation
   */
  analyze(url: string, content: string, metadata?: ContentMetadata): DisinformationAnalysis {
    const domain = this.extractDomain(url);
    const indicators: DisinformationIndicator[] = [];

    // Layer 1: Source credibility
    this.analyzeSourceCredibility(domain, indicators);

    // Layer 2: Content linguistic patterns
    this.analyzeContentPatterns(content, indicators);

    // Layer 3: Claim verification signals
    this.analyzeClaimSignals(content, indicators);

    // Layer 4: Scientific misinformation
    this.analyzeScientificContent(content, indicators);

    // Layer 5: Temporal analysis
    if (metadata?.publishDate) {
      this.analyzeTemporalAspects(content, metadata.publishDate, indicators);
    }

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(indicators);

    // Determine detected types
    const detectedTypes = this.categorizeTypes(indicators);

    // Determine severity
    const severity = this.determineSeverity(riskScore, detectedTypes);

    // Generate recommendation
    const recommendation = this.generateRecommendation(riskScore, severity, domain, url);

    // Generate explanation
    const explanation = this.generateExplanation(indicators, riskScore, detectedTypes);

    // Calculate confidence
    const confidence = this.calculateConfidence(indicators);

    const analysis: DisinformationAnalysis = {
      riskScore,
      detectedTypes,
      severity,
      indicators,
      recommendation,
      explanation,
      confidence,
    };

    logger.info('Disinformation analysis complete', {
      domain,
      riskScore,
      severity,
      recommendation,
      indicatorCount: indicators.length,
    });

    return analysis;
  }

  /**
   * Quick check if content should be immediately blocked
   */
  shouldBlock(url: string): { blocked: boolean; reason?: string } {
    const domain = this.extractDomain(url);

    if (KNOWN_DISINFO_DOMAINS.has(domain)) {
      return { blocked: true, reason: 'Known disinformation source' };
    }

    return { blocked: false };
  }

  /**
   * Check if source is a satire site
   */
  isSatire(url: string): boolean {
    const domain = this.extractDomain(url);
    return SATIRE_SITES.has(domain);
  }

  /**
   * Check if source is a fact-checker
   */
  isFactChecker(url: string): boolean {
    const domain = this.extractDomain(url);

    // Check domain-only fact-checkers
    if (FACT_CHECKER_DOMAINS.has(domain)) {
      return true;
    }

    // Check URL pattern fact-checkers
    return FACT_CHECKER_URL_PATTERNS.some((pattern) => pattern.test(url));
  }

  // ============================================================================
  // Analysis Layers
  // ============================================================================

  private analyzeSourceCredibility(domain: string, indicators: DisinformationIndicator[]): void {
    // Check known disinformation domains
    if (KNOWN_DISINFO_DOMAINS.has(domain)) {
      indicators.push({
        type: 'KNOWN_DISINFO_SOURCE',
        description: 'Domain is flagged as a known disinformation source',
        evidence: `Domain: ${domain}`,
        weight: 50,
      });
    }

    // Check satire sites
    if (SATIRE_SITES.has(domain)) {
      indicators.push({
        type: 'SATIRE_SOURCE',
        description: 'Source is a satire/parody site',
        evidence: `Domain: ${domain} is a known satire site`,
        weight: 30,
      });
    }

    // Check for suspicious domain patterns
    if (this.hasSuspiciousDomainPattern(domain)) {
      indicators.push({
        type: 'SUSPICIOUS_DOMAIN',
        description: 'Domain name has suspicious patterns',
        evidence: `Domain: ${domain}`,
        weight: 15,
      });
    }
  }

  private analyzeContentPatterns(content: string, indicators: DisinformationIndicator[]): void {
    // Check emotional manipulation
    const emotionalMatches = EMOTIONAL_MANIPULATION_PATTERNS.filter((p) => p.test(content));
    if (emotionalMatches.length > 0) {
      indicators.push({
        type: 'EMOTIONAL_MANIPULATION',
        description: 'Content uses emotionally manipulative language',
        evidence: `Found ${emotionalMatches.length} manipulation patterns`,
        weight: Math.min(emotionalMatches.length * 5, 25),
      });
    }

    // Check conspiracy patterns
    const conspiracyMatches = CONSPIRACY_PATTERNS.filter((p) => p.test(content));
    if (conspiracyMatches.length > 0) {
      indicators.push({
        type: 'CONSPIRACY_CONTENT',
        description: 'Content contains conspiracy theory language',
        evidence: `Found ${conspiracyMatches.length} conspiracy patterns`,
        weight: Math.min(conspiracyMatches.length * 10, 40),
      });
    }

    // Check vague attribution
    const vagueMatches = VAGUE_ATTRIBUTION_PATTERNS.filter((p) => p.test(content));
    if (vagueMatches.length > 2) {
      indicators.push({
        type: 'VAGUE_ATTRIBUTION',
        description: 'Content lacks specific source attribution',
        evidence: `Found ${vagueMatches.length} vague attribution patterns`,
        weight: Math.min(vagueMatches.length * 3, 15),
      });
    }

    // Check all caps usage (often indicates sensationalism)
    const capsRatio = this.calculateCapsRatio(content);
    if (capsRatio > 0.15) {
      indicators.push({
        type: 'EXCESSIVE_CAPS',
        description: 'Excessive use of capital letters',
        evidence: `${(capsRatio * 100).toFixed(1)}% caps usage`,
        weight: 10,
      });
    }

    // Check exclamation mark abuse
    const exclamationCount = (content.match(/!/g) || []).length;
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 0 && exclamationCount / sentenceCount > 0.3) {
      indicators.push({
        type: 'EXCLAMATION_ABUSE',
        description: 'Excessive use of exclamation marks',
        evidence: `${exclamationCount} exclamation marks in ${sentenceCount} sentences`,
        weight: 8,
      });
    }
  }

  private analyzeClaimSignals(content: string, indicators: DisinformationIndicator[]): void {
    // Check for absolute claims without evidence
    const absolutePatterns = [
      /100% proven/i,
      /scientifically proven/i,
      /undeniable proof/i,
      /irrefutable evidence/i,
      /beyond doubt/i,
    ];

    const absoluteMatches = absolutePatterns.filter((p) => p.test(content));
    if (absoluteMatches.length > 0) {
      indicators.push({
        type: 'UNSUBSTANTIATED_ABSOLUTE_CLAIMS',
        description: 'Content makes absolute claims without proper evidence',
        evidence: `Found ${absoluteMatches.length} absolute claim patterns`,
        weight: 15,
      });
    }

    // Check for urgent/time-pressure language
    const urgencyPatterns = [
      /act now/i,
      /limited time/i,
      /before it'?s too late/i,
      /share before.*deleted/i,
      /they'?re trying to hide/i,
    ];

    const urgencyMatches = urgencyPatterns.filter((p) => p.test(content));
    if (urgencyMatches.length > 0) {
      indicators.push({
        type: 'ARTIFICIAL_URGENCY',
        description: 'Content creates artificial urgency',
        evidence: `Found ${urgencyMatches.length} urgency patterns`,
        weight: 12,
      });
    }
  }

  private analyzeScientificContent(content: string, indicators: DisinformationIndicator[]): void {
    for (const topic of SCIENTIFIC_CONSENSUS_TOPICS) {
      const hasDisinfo = topic.misinfo_patterns.some((p) => p.test(content));
      if (hasDisinfo) {
        indicators.push({
          type: 'SCIENTIFIC_MISINFORMATION',
          description: `Content contradicts scientific consensus on ${topic.topic.replace('_', ' ')}`,
          evidence: `Scientific consensus: ${topic.consensus}`,
          weight: 35,
        });
      }
    }
  }

  private analyzeTemporalAspects(
    content: string,
    publishDate: Date,
    indicators: DisinformationIndicator[]
  ): void {
    const now = new Date();
    const ageInDays = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

    // Check for outdated content presented as current
    if (ageInDays > 365) {
      // Check if content mentions "today", "this week", etc.
      const currentTimePatterns = [/today/i, /this week/i, /just happened/i, /breaking/i];

      if (currentTimePatterns.some((p) => p.test(content))) {
        indicators.push({
          type: 'TEMPORAL_MISMATCH',
          description: 'Old content presented as current news',
          evidence: `Content is ${Math.floor(ageInDays)} days old but uses current-time language`,
          weight: 25,
        });
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateRiskScore(indicators: DisinformationIndicator[]): number {
    const totalWeight = indicators.reduce((sum, ind) => sum + ind.weight, 0);
    return Math.min(totalWeight, 100);
  }

  private categorizeTypes(indicators: DisinformationIndicator[]): DisinformationType[] {
    const types = new Set<DisinformationType>();

    for (const indicator of indicators) {
      switch (indicator.type) {
        case 'KNOWN_DISINFO_SOURCE':
        case 'CONSPIRACY_CONTENT':
          types.add(DisinformationType.FABRICATED_CONTENT);
          break;
        case 'EMOTIONAL_MANIPULATION':
        case 'EXCLAMATION_ABUSE':
        case 'EXCESSIVE_CAPS':
          types.add(DisinformationType.CLICKBAIT);
          break;
        case 'SATIRE_SOURCE':
          types.add(DisinformationType.SATIRE_AS_NEWS);
          break;
        case 'SCIENTIFIC_MISINFORMATION':
          types.add(DisinformationType.SCIENTIFIC_MISINFORMATION);
          break;
        case 'TEMPORAL_MISMATCH':
          types.add(DisinformationType.OUTDATED_INFORMATION);
          types.add(DisinformationType.FALSE_CONTEXT);
          break;
        case 'ARTIFICIAL_URGENCY':
        case 'UNSUBSTANTIATED_ABSOLUTE_CLAIMS':
          types.add(DisinformationType.MISLEADING_CONTENT);
          break;
      }
    }

    return Array.from(types);
  }

  private determineSeverity(
    riskScore: number,
    detectedTypes: DisinformationType[]
  ): SeverityLevel {
    // Critical if fabricated or scientific misinfo
    if (
      detectedTypes.includes(DisinformationType.FABRICATED_CONTENT) ||
      detectedTypes.includes(DisinformationType.SCIENTIFIC_MISINFORMATION)
    ) {
      return SeverityLevel.CRITICAL;
    }

    if (riskScore >= 70) return SeverityLevel.CRITICAL;
    if (riskScore >= 45) return SeverityLevel.HIGH;
    if (riskScore >= 25) return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  private generateRecommendation(
    riskScore: number,
    severity: SeverityLevel,
    domain: string,
    url?: string
  ): 'ACCEPT' | 'REVIEW' | 'FLAG' | 'BLOCK' {
    // Always block known disinfo
    if (KNOWN_DISINFO_DOMAINS.has(domain)) {
      return 'BLOCK';
    }

    // Fact-checkers are always accepted
    if (FACT_CHECKER_DOMAINS.has(domain)) {
      return 'ACCEPT';
    }
    if (url && FACT_CHECKER_URL_PATTERNS.some((pattern) => pattern.test(url))) {
      return 'ACCEPT';
    }

    if (severity === SeverityLevel.CRITICAL || riskScore >= 70) {
      return 'BLOCK';
    }

    if (severity === SeverityLevel.HIGH || riskScore >= 45) {
      return 'FLAG';
    }

    if (severity === SeverityLevel.MEDIUM || riskScore >= 25) {
      return 'REVIEW';
    }

    return 'ACCEPT';
  }

  private generateExplanation(
    indicators: DisinformationIndicator[],
    riskScore: number,
    detectedTypes: DisinformationType[]
  ): string {
    if (indicators.length === 0) {
      return 'No significant disinformation indicators detected.';
    }

    const typeDescriptions = detectedTypes.map((t) => t.replace(/_/g, ' ').toLowerCase());
    const topIndicators = indicators
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((i) => i.description);

    return `Risk score: ${riskScore}/100. Detected issues: ${typeDescriptions.join(', ')}. Key concerns: ${topIndicators.join('; ')}.`;
  }

  private calculateConfidence(indicators: DisinformationIndicator[]): number {
    // More indicators = higher confidence in detection
    // But diminishing returns
    const indicatorBonus = Math.min(indicators.length * 10, 40);
    const baseConfidence = 50;
    return Math.min(baseConfidence + indicatorBonus, 95);
  }

  private hasSuspiciousDomainPattern(domain: string): boolean {
    const suspiciousPatterns = [
      /news24\d+/i,
      /breaking.*news/i,
      /truth.*news/i,
      /real.*news/i,
      /daily.*patriot/i,
      /freedom.*press/i,
      /-news-\d+/i,
    ];

    return suspiciousPatterns.some((p) => p.test(domain));
  }

  private calculateCapsRatio(content: string): number {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length === 0) return 0;

    const caps = letters.replace(/[^A-Z]/g, '');
    return caps.length / letters.length;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}

/**
 * Optional metadata for enhanced analysis
 */
export interface ContentMetadata {
  publishDate?: Date;
  author?: string;
  title?: string;
  description?: string;
}
