/**
 * Classifier Service
 *
 * Classifies queries to determine routing and handling.
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@yggdrasil/shared';

const logger = createLogger('ClassifierService', 'info');

export type QueryType =
  | 'factual'
  | 'research'
  | 'theoretical'
  | 'creative'
  | 'current_events'
  | 'personal'
  | 'procedural'
  | 'conversational'  // Greetings, simple chat, no verification needed
  | 'unknown';

export type QueryDomain =
  | 'science'
  | 'mathematics'
  | 'history'
  | 'technology'
  | 'medicine'
  | 'law'
  | 'philosophy'
  | 'creative'
  | 'logic'
  | 'general'
  | 'unknown';

export interface QueryClassification {
  type: QueryType;
  domain: QueryDomain;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresVerification: boolean;
  requiresRealtime: boolean;
  requiresMultipleSources: boolean;
  controversial: boolean;
  confidence: number;
  keywords: string[];
}

@Injectable()
export class ClassifierService {
  private readonly factualPatterns = [
    /what is|what are|who is|who was|when did|where is|how many|how much/i,
    /define|explain|describe/i,
    /\d{4}.*happened|historical/i,
  ];

  private readonly researchPatterns = [
    /research|study|studies|paper|journal|publication/i,
    /according to|evidence|data shows/i,
  ];

  private readonly currentEventPatterns = [
    /latest|recent|today|yesterday|this week|this month|current/i,
    /news|update|happening|live/i,
  ];

  private readonly creativePatterns = [
    /write|create|generate|compose|imagine|story|poem/i,
    /design|brainstorm|suggest ideas/i,
  ];

  private readonly conversationalPatterns = [
    // Greetings (multilingual) - ASCII-safe patterns
    /^(hi|hello|hey|bonjour|salut|coucou|yo|hola|ciao)\b/i,
    /^(good morning|good afternoon|good evening|bonsoir|bonne nuit)/i,
    // Presence checks - use .? for any Unicode character
    /^tu es l.[?]?$/i,
    /^es.tu l.[?]?$/i,
    /^(you there|are you there)[?]?$/i,
    /^t.es l.[?]?$/i,
    /^.a va[?]?$/i,
    // Simple acknowledgments
    /^(ok|okay|d.accord|merci|thanks|thank you|cool|nice|great|super|parfait)\s*[!?]?$/i,
    // Farewells - use . for special chars
    /^(bye|goodbye|au revoir|see you|ciao|salut|a plus|.+ plus)\s*[!]?$/i,
    // Simple yes/no
    /^(oui|non|yes|no|yep|nope|yeah|nah)\s*[!?]?$/i,
    // How are you - use . for special chars
    /^(how are you|comment .a va|comment vas.tu|.a va|quoi de neuf|what.s up)\s*[?]?$/i,
    // Very short queries (< 4 words, no question keywords)
    /^.{1,15}[!?]?$/i,
  ];

  private readonly controversialTopics = [
    /politics|political|election|vote/i,
    /religion|religious|faith|belief/i,
    /abortion|gun control|climate change debate/i,
  ];

  classify(query: string): QueryClassification {
    const normalizedQuery = query.toLowerCase().trim();

    const type = this.classifyType(normalizedQuery);
    const domain = this.classifyDomain(normalizedQuery);
    const complexity = this.classifyComplexity(normalizedQuery);
    const keywords = this.extractKeywords(normalizedQuery);

    const classification: QueryClassification = {
      type,
      domain,
      complexity,
      requiresVerification: type === 'factual' || type === 'research',
      requiresRealtime: type === 'current_events',
      requiresMultipleSources: complexity === 'complex',
      controversial: this.isControversial(normalizedQuery),
      confidence: this.calculateConfidence(type, domain),
      keywords,
    };

    logger.debug('Query classified', {
      queryLength: query.length,
      type,
      domain,
      complexity,
    });

    return classification;
  }

  private classifyType(query: string): QueryType {
    // Check conversational FIRST - greetings/chat don't need verification
    if (this.matchesPattern(query, this.conversationalPatterns)) {
      return 'conversational';
    }
    if (this.matchesPattern(query, this.currentEventPatterns)) {
      return 'current_events';
    }
    if (this.matchesPattern(query, this.creativePatterns)) {
      return 'creative';
    }
    if (this.matchesPattern(query, this.researchPatterns)) {
      return 'research';
    }
    if (this.matchesPattern(query, this.factualPatterns)) {
      return 'factual';
    }
    if (query.includes('theory') || query.includes('hypothesis')) {
      return 'theoretical';
    }
    if (query.includes('how to') || query.includes('steps to')) {
      return 'procedural';
    }

    return 'unknown';
  }

  private classifyDomain(query: string): QueryDomain {
    const domainKeywords: Record<QueryDomain, string[]> = {
      science: ['physics', 'chemistry', 'biology', 'science', 'scientific', 'experiment'],
      mathematics: ['math', 'calculate', 'equation', 'formula', 'number', 'algebra', 'geometry'],
      history: ['history', 'historical', 'century', 'ancient', 'war', 'civilization'],
      technology: ['computer', 'software', 'programming', 'technology', 'digital', 'internet'],
      medicine: ['medical', 'health', 'disease', 'treatment', 'doctor', 'symptom'],
      law: ['legal', 'law', 'court', 'rights', 'regulation', 'contract'],
      philosophy: ['philosophy', 'ethics', 'moral', 'meaning', 'existence'],
      creative: ['art', 'music', 'literature', 'creative', 'design', 'writing'],
      logic: ['logic', 'reasoning', 'proof', 'argument', 'fallacy'],
      general: [],
      unknown: [],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((kw) => query.includes(kw))) {
        return domain as QueryDomain;
      }
    }

    return 'general';
  }

  private classifyComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = query.split(/\s+/).length;
    const hasMultipleClauses = query.includes(' and ') || query.includes(' or ');
    const hasConditions = query.includes('if') || query.includes('when');

    if (wordCount > 50 || (hasMultipleClauses && hasConditions)) {
      return 'complex';
    }
    if (wordCount > 20 || hasMultipleClauses || hasConditions) {
      return 'moderate';
    }
    return 'simple';
  }

  private isControversial(query: string): boolean {
    return this.matchesPattern(query, this.controversialTopics);
  }

  private matchesPattern(query: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(query));
  }

  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once',
      'what', 'who', 'when', 'where', 'why', 'how', 'which',
    ]);

    return query
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private calculateConfidence(type: QueryType, domain: QueryDomain): number {
    let confidence = 70;

    if (type !== 'unknown') confidence += 15;
    if (domain !== 'unknown') confidence += 15;

    return Math.min(confidence, 100);
  }
}
