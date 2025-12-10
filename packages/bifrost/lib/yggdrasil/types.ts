/**
 * YGGDRASIL API Types
 *
 * Types for interacting with the YGGDRASIL backend API.
 * These types mirror the backend types from @yggdrasil/shared.
 */

/** Epistemic branches - the three pillars of knowledge in YGGDRASIL */
export enum EpistemicBranch {
  /** MIMIR - Validated knowledge, 100% confidence */
  MIMIR = 'MIMIR',
  /** VOLVA - Research and hypotheses, 50-99% confidence */
  VOLVA = 'VOLVA',
  /** HUGIN - Internet sources, 0-49% confidence */
  HUGIN = 'HUGIN',
}

/** Council members who deliberate on responses */
export enum CouncilMember {
  /** KVASIR - Deep reasoning (Claude) */
  KVASIR = 'KVASIR',
  /** BRAGI - Creativity and eloquence (Grok) */
  BRAGI = 'BRAGI',
  /** NORNES - Logic and calculation (DeepSeek) */
  NORNES = 'NORNES',
  /** SAGA - General knowledge (Llama) */
  SAGA = 'SAGA',
  /** SYN - Multimodal vision (Gemini) */
  SYN = 'SYN',
  /** LOKI - Adversarial critique */
  LOKI = 'LOKI',
  /** TYR - Final arbiter */
  TYR = 'TYR',
}

/** Source types from the three epistemic branches */
export type SourceType =
  | 'arxiv'
  | 'pubmed'
  | 'iso'
  | 'rfc'
  | 'wikidata'
  | 'web'
  | 'book'
  | 'journal'
  | 'other';

/** A source used to anchor a response */
export interface Source {
  type: SourceType;
  identifier: string;
  url: string;
  title: string;
  authors?: string[];
  trustScore: number;
  branch: EpistemicBranch;
}

/** A vote from a council member */
export interface CouncilVote {
  member: CouncilMember;
  content: string;
  confidence: number;
  reasoning?: string;
  processingTimeMs: number;
}

/** A challenge raised by LOKI */
export interface LokiChallenge {
  targetMember: CouncilMember;
  challenge: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  response?: string;
  resolved: boolean;
}

/** Verdict from TYR after deliberation */
export type CouncilVerdict = 'CONSENSUS' | 'MAJORITY' | 'SPLIT' | 'DEADLOCK';

/** A step in the validation trace */
export interface TraceStep {
  step: string;
  component: string;
  status: 'success' | 'warning' | 'error';
  durationMs: number;
  details?: string;
}

/** Complete validation trace from ODIN */
export interface ValidationTrace {
  councilDeliberation: CouncilVote[];
  lokiChallenges: LokiChallenge[];
  tyrVerdict: CouncilVerdict;
  processingSteps: TraceStep[];
}

/** Rejection reasons when ODIN cannot validate */
export type RejectionReason =
  | 'NO_SOURCE'
  | 'CONTRADICTS_MEMORY'
  | 'FAILED_CRITIQUE'
  | 'NO_CONSENSUS'
  | 'INSUFFICIENT_CONFIDENCE'
  | 'CONTAMINATION_DETECTED'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

/** Request to query YGGDRASIL */
export interface YggdrasilQuery {
  query: string;
  userId: string;
  sessionId?: string;
  options?: {
    preferredBranch?: EpistemicBranch;
    maxSources?: number;
    includeTrace?: boolean;
  };
}

/** Response from YGGDRASIL */
export interface YggdrasilResponse {
  requestId: string;
  /** The answer, or null if YGGDRASIL says "I don't know" */
  answer: string | null;
  /** Whether the response is verified by ODIN */
  isVerified: boolean;
  /** Confidence level 0-100 */
  confidence: number;
  /** Sources used to anchor the response */
  sources: Source[];
  /** Which epistemic branch the response comes from */
  epistemicBranch: EpistemicBranch;
  /** Complete validation trace from ODIN */
  trace?: ValidationTrace;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Timestamp of the response */
  timestamp: Date;
  /** Rejection reason if answer is null */
  rejectionReason?: RejectionReason;
}

/** Health status of a component */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  details?: string;
}

/** Pipeline health response */
export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    heimdall: string;
    ratatosk: string;
    mimir: string;
    volva: string;
    hugin: string;
    thing: string;
    odin: string;
    munin: string;
  };
  timestamp: Date;
}

/** Memory node for MUNIN graph */
export interface MemoryNode {
  id: string;
  type: 'interaction' | 'decision' | 'correction' | 'checkpoint';
  content: string;
  createdAt: Date;
  importance: number;
  tags: string[];
}

/** Memory edge for MUNIN graph */
export interface MemoryEdge {
  source: string;
  target: string;
  type: 'derives_from' | 'references' | 'invalidates' | 'supersedes';
}

/** MUNIN memory graph */
export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  userId: string;
  totalMemories: number;
}

/** Thinking step phases */
export type ThinkingPhase =
  | 'routing'
  | 'gathering'
  | 'deliberating'
  | 'validating'
  | 'responding';

/** A thinking step from YGGDRASIL's reasoning process */
export interface ThinkingStep {
  id: string;
  phase: ThinkingPhase;
  thought: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Response from YGGDRASIL with thinking steps */
export interface YggdrasilResponseWithThinking extends YggdrasilResponse {
  thinking: ThinkingStep[];
}
