/**
 * Memory Persistence Service
 *
 * Handles automatic persistence of important facts from conversations.
 * Only verified users can have their stated facts stored as VERIFIED in MUNIN.
 *
 * Flow:
 * 1. Message received from BIFROST
 * 2. Check user verification status
 * 3. Extract facts using FactExtractorService
 * 4. Store facts in MUNIN with appropriate trust level
 *
 * Security:
 * - Unverified users: Facts stored as PENDING (require admin approval)
 * - Verified users: Facts stored as VERIFIED
 * - Admin users: Facts stored as VERIFIED with SYSTEM trust
 */

import { Injectable } from '@nestjs/common';
import { createLogger, generateMemoryId } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { FactExtractorService, ExtractedFact, FactType } from './fact-extractor.service.js';
import { EmbeddingService } from '@yggdrasil/shared/embedding';

const logger = createLogger('MemoryPersistence', 'info');

export enum UserVerificationLevel {
  UNVERIFIED = 'UNVERIFIED', // Anonymous or unverified user
  VERIFIED = 'VERIFIED', // Email verified user
  TRUSTED = 'TRUSTED', // Trusted contributor
  ADMIN = 'ADMIN', // System administrator
  CREATOR = 'CREATOR', // System creator (highest trust)
}

export enum FactState {
  PENDING = 'PENDING', // Awaiting verification
  VERIFIED = 'VERIFIED', // Confirmed as true
  REJECTED = 'REJECTED', // Marked as false
}

export interface StoredFact {
  id: string;
  userId: string;
  chatId: string;
  messageId: string;
  factType: FactType;
  content: string;
  state: FactState;
  confidence: number;
  keywords: string[];
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface PersistenceResult {
  factsExtracted: number;
  factsStored: number;
  factsPending: number;
  storedFacts: StoredFact[];
}

// Mapping from Supabase user metadata to verification level
interface UserVerificationInfo {
  level: UserVerificationLevel;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  isCreator: boolean;
}

@Injectable()
export class MemoryPersistenceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly factExtractor: FactExtractorService,
    private readonly embeddingService: EmbeddingService
  ) {}

  /**
   * Ensure user exists in database (upsert pattern)
   * Creates user if not exists, returns the database user ID
   */
  private async ensureUserExists(userId: string, userEmail: string): Promise<string> {
    // Check for creator emails (highest trust)
    const creatorEmails = ['geleej@gmail.com', 'julien@alixia.ch'];
    const isCreator = creatorEmails.includes(userEmail.toLowerCase());
    const role = isCreator ? 'ADMIN' : 'USER';

    try {
      // Try to find existing user by email first
      let user = await this.db.user.findFirst({
        where: {
          OR: [{ id: userId }, { email: userEmail }],
        },
      });

      if (user) {
        return user.id;
      }

      // Create new user with placeholder password (they'll use OAuth/Supabase)
      user = await this.db.user.create({
        data: {
          id: userId,
          email: userEmail,
          passwordHash: 'oauth-placeholder', // Placeholder for OAuth users
          role: role as 'USER' | 'ADMIN',
          name: userEmail.split('@')[0],
        },
      });

      logger.info('Created new user for memory persistence', {
        userId: user.id,
        email: userEmail,
        role,
      });

      return user.id;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to ensure user exists', error, { userId, userEmail });
      // Fall back to using provided userId (may fail on FK constraint)
      return userId;
    }
  }

  /**
   * Process a message and persist extracted facts
   */
  async processMessage(
    userId: string,
    chatId: string,
    messageId: string,
    content: string,
    userEmail: string
  ): Promise<PersistenceResult> {
    // Ensure user exists in database (upsert)
    const dbUserId = await this.ensureUserExists(userId, userEmail);

    // Get user verification level
    const verification = await this.getUserVerificationLevel(dbUserId, userEmail);

    logger.info('Processing message for facts', {
      userId: dbUserId,
      chatId,
      verificationLevel: verification.level,
      contentLength: content.length,
    });

    // Extract facts from message using LLM (ODIN Step 1)
    const facts = await this.factExtractor.extract(content);

    if (facts.length === 0) {
      return {
        factsExtracted: 0,
        factsStored: 0,
        factsPending: 0,
        storedFacts: [],
      };
    }

    logger.info('Facts extracted', { count: facts.length, types: facts.map((f) => f.type) });

    // Store facts based on verification level
    const storedFacts: StoredFact[] = [];
    let factsStored = 0;
    let factsPending = 0;

    for (const fact of facts) {
      const stored = await this.storeFact(dbUserId, chatId, messageId, fact, verification);

      if (stored) {
        storedFacts.push(stored);
        if (stored.state === FactState.VERIFIED) {
          factsStored++;
        } else {
          factsPending++;
        }
      }
    }

    return {
      factsExtracted: facts.length,
      factsStored,
      factsPending,
      storedFacts,
    };
  }

  /**
   * Get user verification level based on their account status
   */
  private async getUserVerificationLevel(
    userId: string,
    userEmail: string
  ): Promise<UserVerificationInfo> {
    // Check for creator email (highest trust)
    const creatorEmails = ['geleej@gmail.com', 'julien@alixia.ch'];
    const isCreator = creatorEmails.includes(userEmail.toLowerCase());

    if (isCreator) {
      return {
        level: UserVerificationLevel.CREATOR,
        email: userEmail,
        emailVerified: true,
        isAdmin: true,
        isCreator: true,
      };
    }

    // Check if user exists in YGGDRASIL users table
    try {
      const user = await this.db.user.findFirst({
        where: {
          OR: [{ id: userId }, { email: userEmail }],
        },
      });

      if (user) {
        const isAdmin = user.role === 'ADMIN' || user.role === 'SYSTEM';
        return {
          level: isAdmin ? UserVerificationLevel.ADMIN : UserVerificationLevel.VERIFIED,
          email: user.email,
          emailVerified: true,
          isAdmin,
          isCreator: false,
        };
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.warn('Error checking user in YGGDRASIL DB', { userId, errorMessage: error.message });
    }

    // Default to unverified
    return {
      level: UserVerificationLevel.UNVERIFIED,
      email: userEmail,
      emailVerified: false,
      isAdmin: false,
      isCreator: false,
    };
  }

  /**
   * Store a fact in MUNIN
   */
  private async storeFact(
    userId: string,
    chatId: string,
    messageId: string,
    fact: ExtractedFact,
    verification: UserVerificationInfo
  ): Promise<StoredFact | null> {
    // Determine fact state based on verification level and fact requirements
    let state: FactState;

    if (fact.requiresVerification && verification.level === UserVerificationLevel.UNVERIFIED) {
      state = FactState.PENDING;
    } else if (
      verification.level === UserVerificationLevel.CREATOR ||
      verification.level === UserVerificationLevel.ADMIN ||
      verification.level === UserVerificationLevel.TRUSTED
    ) {
      state = FactState.VERIFIED;
    } else if (
      verification.level === UserVerificationLevel.VERIFIED &&
      !fact.requiresVerification
    ) {
      state = FactState.VERIFIED;
    } else {
      state = FactState.PENDING;
    }

    const id = generateMemoryId();
    const now = new Date();

    // Determine importance based on fact type
    const importance = this.getFactImportance(fact.type);

    // Generate embedding for semantic search
    const embeddingResult = await this.embeddingService.generate(
      fact.content,
      'RETRIEVAL_DOCUMENT'
    );
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    try {
      // Store in MUNIN memories table using $queryRawUnsafe for complex types
      const contentJson = JSON.stringify({
        factType: fact.type,
        content: fact.content,
        confidence: fact.confidence,
        state,
        source: {
          chatId,
          messageId,
        },
        verificationLevel: verification.level,
      });

      // Format tags array for PostgreSQL
      const tagsArray = `{${fact.keywords.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(',')}}`;

      // Note: session_id is NULL because chatId from BIFROST/Supabase doesn't exist in sessions table
      // The chatId is stored in content.source.chatId for reference
      await this.db.$queryRawUnsafe(
        `
        INSERT INTO memories (
          id, user_id, session_id, type, content, tags, importance,
          access_count, created_at, updated_at, embedding
        ) VALUES (
          $1,
          $2,
          NULL,
          'INTERACTION'::"MemoryType",
          $3::jsonb,
          $4::text[],
          $5,
          0,
          $6,
          $6,
          $7::vector
        )
      `,
        id,
        userId,
        contentJson,
        tagsArray,
        importance,
        now,
        embeddingVector
      );

      const storedFact: StoredFact = {
        id,
        userId,
        chatId,
        messageId,
        factType: fact.type,
        content: fact.content,
        state,
        confidence: fact.confidence,
        keywords: fact.keywords,
        createdAt: now,
        verifiedAt: state === FactState.VERIFIED ? now : undefined,
        verifiedBy: state === FactState.VERIFIED ? verification.email : undefined,
      };

      logger.info('Fact stored in MUNIN', {
        id,
        factType: fact.type,
        state,
        verificationLevel: verification.level,
      });

      return storedFact;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // Print full error for debugging
      console.error('=== FACT STORAGE ERROR ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('UserId:', userId);
      console.error('FactType:', fact.type);
      console.error('=========================');
      logger.error('Failed to store fact', error, { factType: fact.type });
      return null;
    }
  }

  /**
   * Get importance level based on fact type
   */
  private getFactImportance(type: FactType): number {
    const importanceMap: Record<FactType, number> = {
      [FactType.IDENTITY]: 100, // Highest priority - who is talking
      [FactType.RELATIONSHIP]: 95, // System relationships
      [FactType.INSTRUCTION]: 90, // Direct instructions
      [FactType.GOAL]: 80, // User objectives
      [FactType.CONTEXT]: 70, // Background info
      [FactType.PREFERENCE]: 60, // Preferences
      [FactType.DECLARATION]: 50, // General declarative facts
    };

    return importanceMap[type] ?? 50;
  }

  /**
   * Retrieve user facts from MUNIN
   */
  async getUserFacts(
    userId: string,
    options?: {
      factTypes?: FactType[];
      state?: FactState;
      limit?: number;
    }
  ): Promise<StoredFact[]> {
    const limit = options?.limit ?? 100;

    interface MemoryRow {
      id: string;
      user_id: string;
      session_id: string | null;
      content: {
        factType: FactType;
        content: string;
        confidence: number;
        state: FactState;
        source: { chatId: string; messageId: string };
        verificationLevel: string;
      };
      tags: string[];
      created_at: Date;
    }

    const results = await this.db.$queryRaw<MemoryRow[]>`
      SELECT id, user_id, session_id, content, tags, created_at
      FROM memories
      WHERE user_id = ${userId}
        AND invalidated_at IS NULL
        AND content->>'factType' IS NOT NULL
      ORDER BY importance DESC, created_at DESC
      LIMIT ${limit}
    `;

    return results
      .map((row: MemoryRow) => ({
        id: row.id,
        userId: row.user_id,
        chatId: row.session_id ?? '',
        messageId: row.content.source?.messageId ?? '',
        factType: row.content.factType,
        content: row.content.content,
        state: row.content.state,
        confidence: row.content.confidence,
        keywords: row.tags,
        createdAt: row.created_at,
      }))
      .filter((fact: StoredFact) => {
        if (options?.factTypes && !options.factTypes.includes(fact.factType)) {
          return false;
        }
        if (options?.state && fact.state !== options.state) {
          return false;
        }
        return true;
      });
  }

  /**
   * Get context for a query based on stored facts
   */
  async getContextForQuery(
    userId: string,
    query: string
  ): Promise<{
    identity: StoredFact | null;
    relevantFacts: StoredFact[];
  }> {
    // Get all user facts
    const allFacts = await this.getUserFacts(userId, { state: FactState.VERIFIED });

    // Find identity fact
    const identity = allFacts.find((f) => f.factType === FactType.IDENTITY) ?? null;

    // Find relevant facts using semantic search (RETRIEVAL_QUERY optimized)
    const queryResult = await this.embeddingService.generate(query, 'RETRIEVAL_QUERY');
    const queryVector = `[${queryResult.embedding.join(',')}]`;

    interface MemoryWithSimilarity {
      id: string;
      user_id: string;
      session_id: string | null;
      content: {
        factType: FactType;
        content: string;
        confidence: number;
        state: FactState;
        source: { chatId: string; messageId: string };
      };
      tags: string[];
      created_at: Date;
      similarity: number;
    }

    const relevantResults = await (
      this.db as unknown as { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> }
    ).$queryRawUnsafe<MemoryWithSimilarity[]>(
      `
      SELECT id, user_id, session_id, content, tags, created_at,
             1 - (embedding <=> '${queryVector}'::vector) as similarity
      FROM memories
      WHERE user_id = $1
        AND invalidated_at IS NULL
        AND content->>'factType' IS NOT NULL
        AND content->>'state' = 'VERIFIED'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> '${queryVector}'::vector
      LIMIT 10
    `,
      userId
    );

    const relevantFacts: StoredFact[] = relevantResults
      .filter((r: MemoryWithSimilarity) => r.similarity > 0.3) // Only include if similarity > 30%
      .map((row: MemoryWithSimilarity) => ({
        id: row.id,
        userId: row.user_id,
        chatId: row.session_id ?? '',
        messageId: row.content.source?.messageId ?? '',
        factType: row.content.factType,
        content: row.content.content,
        state: row.content.state,
        confidence: row.content.confidence,
        keywords: row.tags,
        createdAt: row.created_at,
      }));

    return { identity, relevantFacts };
  }

  /**
   * Admin: Verify a pending fact
   */
  async verifyFact(factId: string, verifiedBy: string, approve: boolean): Promise<void> {
    const newState = approve ? FactState.VERIFIED : FactState.REJECTED;
    const now = new Date();

    await this.db.$executeRaw`
      UPDATE memories
      SET content = jsonb_set(
            jsonb_set(content, '{state}', ${JSON.stringify(newState)}::jsonb),
            '{verifiedAt}', ${JSON.stringify(now.toISOString())}::jsonb
          ),
          updated_at = ${now}
      WHERE id = ${factId}
    `;

    logger.info('Fact verification updated', { factId, newState, verifiedBy });
  }
}
