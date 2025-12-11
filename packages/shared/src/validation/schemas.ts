/**
 * Zod validation schemas for YGGDRASIL
 */

import { z } from 'zod';
import { EpistemicBranch } from '../types/epistemic.js';
import { SourceType } from '../types/source.js';
import { CouncilMember } from '../types/council.js';
import { Role } from '../types/auth.js';
import { MemoryType } from '../types/memory.js';

// ============================================================================
// Auth Schemas
// ============================================================================

export const emailSchema = z.string().email('Invalid email format').min(5).max(255);

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
    'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)'
  );

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(255).optional(),
});

export const roleSchema = z.nativeEnum(Role);

// ============================================================================
// Epistemic Schemas
// ============================================================================

export const epistemicBranchSchema = z.nativeEnum(EpistemicBranch);

export const confidenceSchema = z.number().int().min(0).max(100);

export const mimirConfidenceSchema = z.literal(100);

export const volvaConfidenceSchema = z.number().int().min(50).max(99);

export const huginConfidenceSchema = z.number().int().min(0).max(49);

// ============================================================================
// Source Schemas
// ============================================================================

export const sourceTypeSchema = z.nativeEnum(SourceType);

export const sourceSchema = z.object({
  id: z.string().uuid(),
  type: sourceTypeSchema,
  identifier: z.string().min(1).max(500),
  url: z.string().url(),
  title: z.string().min(1).max(1000),
  authors: z.array(z.string().min(1).max(255)),
  publishedAt: z.date().optional(),
  fetchedAt: z.date(),
  trustScore: confidenceSchema,
  branch: epistemicBranchSchema,
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// Council Schemas
// ============================================================================

export const councilMemberSchema = z.nativeEnum(CouncilMember);

export const councilResponseSchema = z.object({
  member: councilMemberSchema,
  content: z.string().min(1),
  confidence: confidenceSchema,
  reasoning: z.string().optional(),
  processingTimeMs: z.number().int().positive(),
  timestamp: z.date(),
});

// ============================================================================
// Memory Schemas
// ============================================================================

export const memoryTypeSchema = z.nativeEnum(MemoryType);

export const memoryEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  type: memoryTypeSchema,
  content: z.unknown(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  validUntil: z.date().optional(),
  invalidatedAt: z.date().optional(),
});

export const memoryQuerySchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  types: z.array(memoryTypeSchema).optional(),
  tags: z.array(z.string()).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  semanticQuery: z.string().max(1000).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  includeInvalidated: z.boolean().default(false),
});

// ============================================================================
// API Schemas
// ============================================================================

export const requestOptionsSchema = z.object({
  forceBranch: epistemicBranchSchema.optional(),
  councilMembers: z.array(councilMemberSchema).optional(),
  includeTrace: z.boolean().optional(),
  includeRawResponses: z.boolean().optional(),
  timeout: z.number().int().positive().max(300000).optional(),
  skipCache: z.boolean().optional(),
});

export const yggdrasilRequestSchema = z.object({
  id: z.string().uuid(),
  query: z.string().min(1).max(100000),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  context: z.record(z.unknown()).optional(),
  options: requestOptionsSchema.optional(),
  timestamp: z.date(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// ID Schemas
// ============================================================================

export const uuidSchema = z.string().uuid();

export const idParamSchema = z.object({
  id: uuidSchema,
});
