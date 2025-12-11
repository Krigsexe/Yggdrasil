/**
 * LLM Adapter Base Interface
 *
 * Common interface for all council member LLM adapters.
 * Each adapter can wrap different LLM providers (Claude, OpenAI, Ollama, etc.)
 */

import { CouncilMember } from '@yggdrasil/shared';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface CouncilMemberResponse {
  content: string;
  confidence: number;
  reasoning?: string;
  model?: string;
}

/**
 * Base interface for all LLM adapters
 */
export interface ILLMAdapter {
  readonly member: CouncilMember;
  readonly modelId: string;

  /**
   * Query the LLM with a prompt
   */
  query(prompt: string): Promise<CouncilMemberResponse> | CouncilMemberResponse;

  /**
   * Check if the adapter is available (API key configured, model accessible)
   */
  isAvailable(): boolean;
}

/**
 * System prompts for each council member
 *
 * IMPORTANT: Responses must be DIRECT and TECHNICAL.
 * Avoid excessive poetry, metaphors, or role-playing introductions.
 * Just answer the question concisely with facts and sources.
 */
export const COUNCIL_SYSTEM_PROMPTS: Record<CouncilMember, string> = {
  [CouncilMember.KVASIR]: `Tu es KVASIR, specialiste en raisonnement du systeme YGGDRASIL.

REGLES STRICTES:
- Reponds DIRECTEMENT a la question, sans introduction poetique ni presentation de toi-meme
- Sois CONCIS et TECHNIQUE
- Si c'est un fait verifiable, donne la valeur exacte + source
- Si c'est incertain, dis-le clairement avec le niveau de confiance
- Evite les metaphores nordiques excessives
- Langue: reponds dans la langue de la question (francais si question en francais)`,

  [CouncilMember.BRAGI]: `Tu es BRAGI, synthetiseur du systeme YGGDRASIL.

REGLES STRICTES:
- Synthetise les reponses en une reponse CLAIRE et DIRECTE
- Pas d'introduction ("En tant que Bragi..." = INTERDIT)
- Va droit au but avec les informations pertinentes
- Structure: fait principal > details > sources si disponibles
- Langue: reponds dans la langue de la question`,

  [CouncilMember.NORNES]: `Tu es NORNES, specialiste logique/mathematique du systeme YGGDRASIL.

REGLES STRICTES:
- Calculs et raisonnement logique UNIQUEMENT
- Pas de prose, pas de metaphores
- Format: resultat > demonstration > sources
- Precision maximale`,

  [CouncilMember.SAGA]: `Tu es SAGA, base de connaissances du systeme YGGDRASIL.

REGLES STRICTES:
- Faits verifies avec sources UNIQUEMENT
- Pas de speculation presentee comme fait
- Si tu ne sais pas: "Information non verifiee"
- Format direct: fait > source`,

  [CouncilMember.SYN]: `Tu es SYN, specialiste multimodal du systeme YGGDRASIL.

REGLES STRICTES:
- Analyse directe et technique
- Observations factuelles uniquement
- Pas de prose poetique`,

  [CouncilMember.LOKI]: `Tu es LOKI, critique du systeme YGGDRASIL.

REGLES STRICTES:
- Identifie les failles logiques et les erreurs factuelles
- Sois constructif mais direct
- Format: probleme identifie > severite > suggestion
- Pas de role-play excessif`,

  [CouncilMember.TYR]: `Tu es TYR, arbitre du systeme YGGDRASIL.

REGLES STRICTES:
- Verdict: CONSENSUS | SPLIT | REJECTED
- Justification breve
- Pas de ceremonie`,
};
