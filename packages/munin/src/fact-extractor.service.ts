/**
 * Fact Extractor Service
 *
 * Extracts important facts from conversation messages using LLM analysis.
 * Follows ODIN's validation pipeline - Step 1: Extraction of claims.
 *
 * This service uses KVASIR (Claude) to intelligently identify facts from messages,
 * rather than relying on static regex patterns.
 *
 * Examples of extractable facts:
 * - Identity statements: "Je suis Julien, ton créateur"
 * - Relationship declarations: "Tu es relié à Yggdrasil"
 * - Context information: Documentation, preferences, goals
 * - Any declarative statement that should be remembered
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@yggdrasil/shared';

const logger = createLogger('FactExtractor', 'info');

export enum FactType {
  IDENTITY = 'IDENTITY',           // Who the user is
  RELATIONSHIP = 'RELATIONSHIP',   // How user relates to system
  PREFERENCE = 'PREFERENCE',       // User preferences
  CONTEXT = 'CONTEXT',             // Background information
  GOAL = 'GOAL',                   // User objectives
  INSTRUCTION = 'INSTRUCTION',     // Direct instructions to remember
  DECLARATION = 'DECLARATION',     // General declarative facts
}

export interface ExtractedFact {
  type: FactType;
  content: string;
  confidence: number;      // 0-100
  keywords: string[];
  requiresVerification: boolean;
}

interface LLMExtractedFact {
  type: string;
  content: string;
  confidence: number;
  requiresVerification: boolean;
}

interface ExtractionResponse {
  facts: LLMExtractedFact[];
  hasFactualContent: boolean;
}

// System prompt for fact extraction
const FACT_EXTRACTION_PROMPT = `Tu es un analyseur de faits pour YGGDRASIL, un système de mémoire absolue.

Ta mission est d'extraire TOUS les faits déclaratifs d'un message utilisateur.

Un fait est une affirmation qui devrait être mémorisée pour le futur, par exemple :
- Identité : "Je suis X", "Mon nom est X", "Je m'appelle X"
- Relations : "Tu es connecté à X", "Je suis ton créateur"
- Préférences : "Je préfère X", "J'aime X", "Je n'aime pas X"
- Contexte : Informations de fond, documentation, explications
- Objectifs : "Je veux X", "Mon but est X", "L'objectif est X"
- Instructions : "Souviens-toi que X", "N'oublie pas X", "Retiens X"
- Déclarations : Tout autre fait déclaratif important

IMPORTANT :
- Extrais TOUS les faits, même implicites
- Un message peut contenir 0, 1 ou plusieurs faits
- Inclus le contexte nécessaire dans chaque fait
- Les questions ne sont PAS des faits (sauf si elles contiennent des affirmations implicites)

Réponds en JSON strict avec ce format :
{
  "facts": [
    {
      "type": "IDENTITY|RELATIONSHIP|PREFERENCE|CONTEXT|GOAL|INSTRUCTION|DECLARATION",
      "content": "Le fait extrait avec son contexte",
      "confidence": 0-100,
      "requiresVerification": true/false
    }
  ],
  "hasFactualContent": true/false
}

Si le message ne contient aucun fait (question pure, salutation), réponds :
{"facts": [], "hasFactualContent": false}`;

@Injectable()
export class FactExtractorService {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  constructor() {
    this.apiKey = process.env['ANTHROPIC_API_KEY'];
    this.model = process.env['ANTHROPIC_MODEL'] ?? 'claude-3-5-sonnet-20241022';
  }

  /**
   * Check if LLM extraction is available
   */
  isLLMAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Extract facts from a message using LLM (KVASIR/Claude)
   */
  async extract(message: string): Promise<ExtractedFact[]> {
    // Skip very short messages or obvious non-factual content
    if (message.trim().length < 3) {
      return [];
    }

    // If LLM is available, use intelligent extraction
    if (this.isLLMAvailable()) {
      return this.extractWithLLM(message);
    }

    // Fallback to regex (degraded mode)
    logger.warn('LLM not available, using fallback regex extraction');
    return this.extractWithRegex(message);
  }

  /**
   * Extract facts using LLM (primary method)
   */
  private async extractWithLLM(message: string): Promise<ExtractedFact[]> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: FACT_EXTRACTION_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Analyse ce message et extrais tous les faits :\n\n"${message}"`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Anthropic API error', new Error(errorText));
        return this.extractWithRegex(message);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const content = data.content[0]?.text ?? '';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON found in LLM response', { content: content.slice(0, 200) });
        return this.extractWithRegex(message);
      }

      const parsed = JSON.parse(jsonMatch[0]) as ExtractionResponse;

      if (!parsed.hasFactualContent || !parsed.facts || parsed.facts.length === 0) {
        logger.debug('No facts found in message', { messagePreview: message.slice(0, 50) });
        return [];
      }

      const facts: ExtractedFact[] = parsed.facts.map((f: LLMExtractedFact) => ({
        type: this.normalizeFactType(f.type),
        content: f.content,
        confidence: f.confidence,
        keywords: this.extractKeywords(f.content),
        requiresVerification: f.requiresVerification,
      }));

      logger.info('Facts extracted via LLM', {
        count: facts.length,
        types: facts.map(f => f.type),
      });

      return facts;
    } catch (error) {
      logger.error('LLM extraction failed', error as Error);
      return this.extractWithRegex(message);
    }
  }

  /**
   * Normalize fact type from LLM response
   */
  private normalizeFactType(type: string): FactType {
    const normalized = type.toUpperCase();
    if (Object.values(FactType).includes(normalized as FactType)) {
      return normalized as FactType;
    }
    return FactType.DECLARATION;
  }

  /**
   * Fallback: Extract facts using regex patterns (degraded mode)
   */
  private extractWithRegex(message: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];

    const patterns: Array<{
      pattern: RegExp;
      type: FactType;
      confidence: number;
      requiresVerification: boolean;
    }> = [
      // Identity patterns (French & English)
      {
        pattern: /(?:je\s+(?:suis|m'appelle)|my\s+name\s+is|i\s+am)\s+([^.,!?]+)/i,
        type: FactType.IDENTITY,
        confidence: 90,
        requiresVerification: true,
      },
      {
        pattern: /(?:je\s+suis\s+(?:ton|votre)\s+créateur|i\s+(?:am|'m)\s+your\s+creator)/i,
        type: FactType.IDENTITY,
        confidence: 95,
        requiresVerification: true,
      },
      // Relationship patterns
      {
        pattern: /(?:tu\s+es\s+(?:maintenant\s+)?(?:relié|connecté)\s+à|you\s+are\s+(?:now\s+)?connected\s+to)\s+([^.,!?]+)/i,
        type: FactType.RELATIONSHIP,
        confidence: 80,
        requiresVerification: true,
      },
      // Instruction patterns
      {
        pattern: /(?:souviens[\s-]toi\s+(?:que|de)|remember\s+(?:that|to))\s+([^.,!?]+)/i,
        type: FactType.INSTRUCTION,
        confidence: 95,
        requiresVerification: false,
      },
      {
        pattern: /(?:n'oublie\s+(?:pas|jamais)|don't\s+forget)\s+([^.,!?]+)/i,
        type: FactType.INSTRUCTION,
        confidence: 95,
        requiresVerification: false,
      },
      // Goal patterns
      {
        pattern: /(?:je\s+(?:veux|souhaite|cherche\s+à)|i\s+want\s+to|my\s+goal\s+is)\s+([^.,!?]+)/i,
        type: FactType.GOAL,
        confidence: 85,
        requiresVerification: false,
      },
      // Preference patterns
      {
        pattern: /(?:je\s+préfère|i\s+prefer)\s+([^.,!?]+)/i,
        type: FactType.PREFERENCE,
        confidence: 80,
        requiresVerification: false,
      },
    ];

    for (const { pattern, type, confidence, requiresVerification } of patterns) {
      const match = message.match(pattern);
      if (match) {
        const content = match[1]?.trim() || match[0].trim();
        facts.push({
          type,
          content,
          confidence,
          keywords: this.extractKeywords(content),
          requiresVerification,
        });
      }
    }

    return facts;
  }

  /**
   * Extract keywords from content for semantic indexing
   */
  private extractKeywords(content: string): string[] {
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'à', 'au', 'aux',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi',
      'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on',
      'est', 'sont', 'suis', 'es', 'sommes', 'êtes', 'être', 'avoir',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    ]);

    return content
      .toLowerCase()
      .replace(/[^a-zàâäéèêëïîôùûüç\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20);
  }
}
