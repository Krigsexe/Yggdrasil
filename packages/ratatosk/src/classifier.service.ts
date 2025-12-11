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
  | 'conversational' // Greetings, simple chat, no verification needed
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
    // English factual patterns
    /what is|what are|who is|who was|when did|where is|how many|how much/i,
    /define|explain|describe/i,
    /\d{4}.*happened|historical/i,
    // French factual patterns
    /qu.?est.ce que|quelle? est|quels? sont|qui est|qui .tait/i,
    /combien|o. est|o. se trouve|quand|d.finir|d.finis|expliquer|d.crire/i,
    /quelle est la vitesse|quelle est la valeur|quel est le/i,
  ];

  private readonly researchPatterns = [
    // English research patterns
    /research|study|studies|paper|journal|publication/i,
    /according to|evidence|data shows/i,
    // French research patterns
    /recherche|.tude|.tudes|article|revue|publication/i,
    /selon|d.apr.s|preuve|donn.es montrent/i,
  ];

  private readonly currentEventPatterns = [
    // English current events patterns
    /latest|recent|today|yesterday|this week|this month|current/i,
    /news|update|happening|live/i,
    // French current events patterns
    /dernier|r.cent|aujourd.hui|hier|cette semaine|ce mois|actuel/i,
    /actualit.|mise . jour|en cours|direct/i,
  ];

  private readonly creativePatterns = [
    // English creative patterns
    /write|create|generate|compose|imagine|story|poem/i,
    /design|brainstorm|suggest ideas/i,
    // French creative patterns
    /.crire|.cris|cr.er|g.n.rer|composer|imaginer|histoire|po.me/i,
    /concevoir|brainstorm|proposer des id.es/i,
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
    if (
      query.includes('theory') ||
      query.includes('hypothesis') ||
      query.includes('theorie') ||
      query.includes('hypothese')
    ) {
      return 'theoretical';
    }
    if (
      query.includes('how to') ||
      query.includes('steps to') ||
      query.includes('comment faire') ||
      query.includes('etapes pour')
    ) {
      return 'procedural';
    }

    return 'unknown';
  }

  private classifyDomain(query: string): QueryDomain {
    const domainKeywords: Record<QueryDomain, string[]> = {
      // Bilingual keywords (English + French)
      science: [
        'physics', 'chemistry', 'biology', 'science', 'scientific', 'experiment',
        'physique', 'chimie', 'biologie', 'scientifique', 'lumiere', 'vitesse', 'vide',
      ],
      mathematics: [
        'math', 'calculate', 'equation', 'formula', 'number', 'algebra', 'geometry',
        'calcul', 'calculer', 'nombre', 'algebre', 'geometrie',
      ],
      history: [
        'history', 'historical', 'century', 'ancient', 'war', 'civilization',
        'histoire', 'historique', 'siecle', 'ancien', 'guerre', 'civilisation',
      ],
      technology: [
        'computer', 'software', 'programming', 'technology', 'digital', 'internet',
        'ordinateur', 'logiciel', 'programmation', 'technologie', 'numerique',
      ],
      medicine: [
        'medical', 'health', 'disease', 'treatment', 'doctor', 'symptom',
        'medical', 'sante', 'maladie', 'traitement', 'medecin', 'symptome',
      ],
      law: [
        'legal', 'law', 'court', 'rights', 'regulation', 'contract',
        'juridique', 'loi', 'tribunal', 'droits', 'reglement', 'contrat',
      ],
      philosophy: [
        'philosophy', 'ethics', 'moral', 'meaning', 'existence',
        'philosophie', 'ethique', 'morale', 'sens', 'existence',
      ],
      creative: [
        'art', 'music', 'literature', 'creative', 'design', 'writing',
        'musique', 'litterature', 'creatif', 'conception', 'ecriture',
      ],
      logic: [
        'logic', 'reasoning', 'proof', 'argument', 'fallacy',
        'logique', 'raisonnement', 'preuve', 'argumentation', 'sophisme',
      ],
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
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'ought',
      'used',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'again',
      'further',
      'then',
      'once',
      'what',
      'who',
      'when',
      'where',
      'why',
      'how',
      'which',
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
