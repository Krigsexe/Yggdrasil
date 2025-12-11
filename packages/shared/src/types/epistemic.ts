/**
 * Epistemic types for YGGDRASIL
 *
 * These types define the three branches of knowledge:
 * - MIMIR: Validated, 100% confidence
 * - VOLVA: Research/hypotheses, variable confidence
 * - HUGIN: Internet/unverified, low confidence
 *
 * AGI v2.0 additions:
 * - MemoryState: Dynamic states for knowledge nodes
 * - PriorityQueue: HOT/WARM/COLD surveillance queues
 * - EpistemicVelocity: Rate of confidence change
 */

export enum EpistemicBranch {
  MIMIR = 'MIMIR',
  VOLVA = 'VOLVA',
  HUGIN = 'HUGIN',
}

/**
 * Memory states for AGI v2.0
 * Enables dynamic state management and proactive surveillance
 */
export enum MemoryState {
  // Stable states
  VERIFIED = 'VERIFIED', // (MIMIR) Absolute truth, κ = 1.0
  REJECTED = 'REJECTED', // (ODIN) Proven false or hallucination detected

  // Transitory states
  PENDING_PROOF = 'PENDING_PROOF', // (VOLVA) Plausible, awaiting validation
  WATCHING = 'WATCHING', // (HUGIN) Active surveillance (hot topic)

  // Historical state
  DEPRECATED = 'DEPRECATED', // Former truth now refuted (kept for audit)
}

/**
 * Priority queues for HUGIN Watcher daemon
 * Determines surveillance frequency based on epistemic velocity
 */
export enum PriorityQueue {
  HOT = 'HOT', // 1 hour interval - Breaking news, crises
  WARM = 'WARM', // 24 hours interval - Science, tech
  COLD = 'COLD', // 7 days interval - Established facts
}

/**
 * Priority queue configuration
 */
export const PRIORITY_QUEUE_CONFIG = {
  [PriorityQueue.HOT]: {
    intervalMs: 60 * 60 * 1000, // 1 hour
    description: 'Breaking news, crises, high epistemic velocity',
  },
  [PriorityQueue.WARM]: {
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    description: 'Science, tech, moderate evolution',
  },
  [PriorityQueue.COLD]: {
    intervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    description: 'Established facts, non-regression verification',
  },
} as const;

/**
 * Epistemic velocity - measures rate of confidence change
 * v_ε(t) = (κ_t - κ_{t-1}) / Δt
 */
export interface EpistemicVelocity {
  value: number; // Δκ/Δt
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  lastUpdate: Date;
  previousConfidence: number;
  currentConfidence: number;
  deltaTimeMs: number;
}

/**
 * Velocity thresholds for queue assignment
 */
export const VELOCITY_THRESHOLDS = {
  HOT_POSITIVE: 0.05, // Trending positive → HOT queue
  HOT_NEGATIVE: -0.05, // Trending negative → HOT queue + Alert
  STABLE_RANGE: [-0.02, 0.02], // Stable → downgrade to WARM/COLD
} as const;

/**
 * Calculate epistemic velocity
 */
export function calculateEpistemicVelocity(
  previousConfidence: number,
  currentConfidence: number,
  deltaTimeMs: number
): EpistemicVelocity {
  const value = deltaTimeMs > 0 ? (currentConfidence - previousConfidence) / deltaTimeMs : 0;

  let trend: EpistemicVelocity['trend'] = 'STABLE';
  if (value > VELOCITY_THRESHOLDS.STABLE_RANGE[1]) {
    trend = 'INCREASING';
  } else if (value < VELOCITY_THRESHOLDS.STABLE_RANGE[0]) {
    trend = 'DECREASING';
  }

  return {
    value,
    trend,
    lastUpdate: new Date(),
    previousConfidence,
    currentConfidence,
    deltaTimeMs,
  };
}

/**
 * Determine priority queue based on velocity
 */
export function getPriorityQueueForVelocity(velocity: EpistemicVelocity): PriorityQueue {
  const absVelocity = Math.abs(velocity.value);

  if (absVelocity > Math.abs(VELOCITY_THRESHOLDS.HOT_POSITIVE)) {
    return PriorityQueue.HOT;
  }

  if (velocity.trend === 'STABLE') {
    return PriorityQueue.COLD;
  }

  return PriorityQueue.WARM;
}

export interface ConfidenceLevel {
  value: number;
  branch: EpistemicBranch;
  label: ConfidenceLabel;
}

export type ConfidenceLabel = 'VERIFIED' | 'THEORETICAL' | 'UNVERIFIED';

export interface EpistemicMetadata {
  branch: EpistemicBranch;
  confidence: number;
  verifiedAt?: Date;
  verifiedBy?: string;
  sourceCount: number;
}

/**
 * Confidence thresholds for each branch
 */
export const CONFIDENCE_THRESHOLDS = {
  [EpistemicBranch.MIMIR]: { min: 100, max: 100 },
  [EpistemicBranch.VOLVA]: { min: 50, max: 99 },
  [EpistemicBranch.HUGIN]: { min: 0, max: 49 },
} as const;

/**
 * Determines the epistemic branch based on confidence level
 */
export function getBranchForConfidence(confidence: number): EpistemicBranch {
  if (confidence === 100) return EpistemicBranch.MIMIR;
  if (confidence >= 50) return EpistemicBranch.VOLVA;
  return EpistemicBranch.HUGIN;
}

/**
 * Gets the confidence label for display
 */
export function getConfidenceLabel(branch: EpistemicBranch): ConfidenceLabel {
  switch (branch) {
    case EpistemicBranch.MIMIR:
      return 'VERIFIED';
    case EpistemicBranch.VOLVA:
      return 'THEORETICAL';
    case EpistemicBranch.HUGIN:
      return 'UNVERIFIED';
  }
}

/**
 * Validates that a confidence value is within valid range for a branch
 */
export function isValidConfidenceForBranch(confidence: number, branch: EpistemicBranch): boolean {
  const threshold = CONFIDENCE_THRESHOLDS[branch];
  return confidence >= threshold.min && confidence <= threshold.max;
}
