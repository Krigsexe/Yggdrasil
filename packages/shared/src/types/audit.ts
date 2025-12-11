/**
 * Audit types for YGGDRASIL
 *
 * Complete traceability is a core pillar.
 * Every action is logged and auditable.
 */

export enum AuditAction {
  // Auth actions
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  TOKEN_REFRESH = 'auth.token_refresh',
  PASSWORD_CHANGE = 'auth.password_change',

  // Query actions
  QUERY_SUBMIT = 'query.submit',
  QUERY_COMPLETE = 'query.complete',
  QUERY_FAIL = 'query.fail',

  // Validation actions
  VALIDATION_START = 'validation.start',
  VALIDATION_PASS = 'validation.pass',
  VALIDATION_FAIL = 'validation.fail',

  // Memory actions
  MEMORY_CREATE = 'memory.create',
  MEMORY_UPDATE = 'memory.update',
  MEMORY_DELETE = 'memory.delete',
  MEMORY_INVALIDATE = 'memory.invalidate',
  CHECKPOINT_CREATE = 'memory.checkpoint_create',
  ROLLBACK = 'memory.rollback',

  // Source actions
  SOURCE_ADD = 'source.add',
  SOURCE_VALIDATE = 'source.validate',
  SOURCE_INVALIDATE = 'source.invalidate',

  // Admin actions
  USER_CREATE = 'admin.user_create',
  USER_UPDATE = 'admin.user_update',
  USER_DELETE = 'admin.user_delete',
  CONFIG_UPDATE = 'admin.config_update',
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId?: string;
  resourceType: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface AuditQuery {
  userId?: string;
  actions?: AuditAction[];
  resourceType?: string;
  resourceId?: string;
  fromDate?: Date;
  toDate?: Date;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalLogs: number;
  actionCounts: Record<AuditAction, number>;
  averageResponseTime: number;
  errorRate: number;
  period: {
    from: Date;
    to: Date;
  };
}

// =============================================================================
// KNOWLEDGE LEDGER - AGI v2.0
// Immutable temporal ledger for knowledge state tracking
// =============================================================================

/**
 * Actions specific to Knowledge Ledger state transitions
 */
export enum KnowledgeLedgerAction {
  CREATE = 'CREATE',
  TRANSITION = 'TRANSITION',
  DELIBERATE = 'DELIBERATE',
  ESCALATE = 'ESCALATE',
  CASCADE_INVALIDATE = 'CASCADE_INVALIDATE',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
  VELOCITY_UPDATE = 'VELOCITY_UPDATE',
  QUEUE_CHANGE = 'QUEUE_CHANGE',
}

/**
 * Single entry in the Knowledge Ledger audit trail
 * Every state change is recorded immutably
 */
export interface KnowledgeLedgerEntry {
  timestamp: string; // ISO8601
  action: KnowledgeLedgerAction;
  fromState: string | null;
  toState: string;
  trigger: string; // What caused this change
  agent: string; // Which component initiated (ODIN, HUGIN, etc.)
  confidenceDelta?: string; // e.g., "+0.05" or "-0.10"
  reason: string;
  voteRecord?: Record<string, string>; // THING council votes
  metadata?: Record<string, unknown>;
}

/**
 * Shapley attribution for THING council contributions
 * Tracks responsibility of each member in decisions
 */
export interface ShapleyAttribution {
  KVASIR?: number;
  BRAGI?: number;
  NORNES?: number;
  SAGA?: number;
  SYN?: number;
  LOKI?: number;
  TYR?: number;
  HUGIN?: number;
}

/**
 * Memory dependency relationship
 */
export interface MemoryDependencyRelation {
  nodeId: string;
  relation: 'DERIVED_FROM' | 'ASSUMES' | 'SUPPORTS' | 'CONTRADICTS';
  strength: number; // 0.0 - 1.0
}

/**
 * Watch configuration for HUGIN daemon surveillance
 */
export interface WatchConfiguration {
  priorityQueue: 'HOT' | 'WARM' | 'COLD';
  scanIntervalHours: number;
  lastScan: Date | null;
  nextScan: Date | null;
  idleCycles: number;
  maxIdleBeforeDowngrade: number;
}

/**
 * Full Knowledge Node as stored in the ledger
 * Implements MUNIN v2 structure from YGGDRASIL-MASTER.md
 */
export interface KnowledgeNode {
  id: string;
  statement: string;
  domain?: string;
  tags: string[];

  // State management
  currentState: string; // MemoryState enum value
  epistemicBranch: string; // EpistemicBranch enum value
  confidenceScore: number;
  epistemicVelocity: number;

  // Graph relationships
  dependencies: MemoryDependencyRelation[];
  dependents: MemoryDependencyRelation[];

  // Attribution
  shapleyAttribution: ShapleyAttribution;

  // Audit trail (immutable append-only)
  auditTrail: KnowledgeLedgerEntry[];

  // Surveillance config
  watchConfig: WatchConfiguration;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of cascade invalidation operation
 */
export interface CascadeInvalidationResult {
  sourceNodeId: string;
  invalidatedCount: number;
  reviewScheduledCount: number;
  invalidatedNodes: string[];
  reviewScheduledNodes: string[];
  timestamp: Date;
  duration: number;
}
