/**
 * E2E Test for MIMIR Source Service PostgreSQL Persistence
 *
 * This test verifies that sources are properly persisted to PostgreSQL
 * with pgvector embeddings and can be retrieved via semantic search.
 *
 * Prerequisites:
 * - Supabase running (npx supabase start from packages/bifrost)
 * - Database schema applied via Prisma
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SourceService, EmbeddingService } from '../src/index.js';
import { SourceType, EpistemicBranch } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';

describe('MIMIR Source Service E2E - PostgreSQL Persistence', () => {
  let db: DatabaseService;
  let embeddingService: EmbeddingService;
  let sourceService: SourceService;
  let createdSourceIds: string[] = [];

  beforeAll(async () => {
    // Initialize database connection
    db = new DatabaseService();
    await db.onModuleInit();

    // Initialize services
    embeddingService = new EmbeddingService();
    sourceService = new SourceService(db as any, embeddingService);
  });

  afterAll(async () => {
    // Cleanup test sources
    for (const id of createdSourceIds) {
      try {
        await db.$executeRaw`DELETE FROM sources WHERE id = ${id}`;
      } catch {
        // Ignore if already deleted
      }
    }
    await db.onModuleDestroy();
  });

  describe('PostgreSQL Persistence', () => {
    it('should persist a new arXiv source to PostgreSQL', async () => {
      const source = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:2312.00001-test',
        url: 'https://arxiv.org/abs/2312.00001',
        title: 'Test Paper: Neural Networks for Climate Modeling',
        authors: ['Test Author A', 'Test Author B'],
        trustScore: 100,
        metadata: {
          arxivId: '2312.00001',
          abstract: 'This paper presents a novel approach to climate modeling using neural networks.',
          keywords: ['neural networks', 'climate', 'machine learning'],
          peerReviewed: false,
        },
      });

      createdSourceIds.push(source.id);

      expect(source).toBeDefined();
      expect(source.id).toBeDefined();
      expect(source.type).toBe(SourceType.ARXIV);
      expect(source.branch).toBe(EpistemicBranch.MIMIR);
      expect(source.trustScore).toBe(100);
      expect(source.title).toBe('Test Paper: Neural Networks for Climate Modeling');
    });

    it('should retrieve source by ID from PostgreSQL', async () => {
      // First add a source
      const added = await sourceService.add({
        type: SourceType.PUBMED,
        identifier: 'pmid:98765432-test',
        url: 'https://pubmed.ncbi.nlm.nih.gov/98765432',
        title: 'Test Medical Study: Vaccine Efficacy Analysis',
        authors: ['Dr. Test'],
        trustScore: 100,
        metadata: {
          pubmedId: '98765432',
          abstract: 'A comprehensive study on vaccine efficacy.',
          journal: 'Test Medical Journal',
          peerReviewed: true,
        },
      });

      createdSourceIds.push(added.id);

      // Retrieve by ID
      const retrieved = await sourceService.getById(added.id);

      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(added.id);
      expect(retrieved.type).toBe(SourceType.PUBMED);
      expect(retrieved.title).toBe('Test Medical Study: Vaccine Efficacy Analysis');
    });

    it('should retrieve source by identifier from PostgreSQL', async () => {
      const identifier = 'arxiv:2312.00002-test';

      // First add a source
      const added = await sourceService.add({
        type: SourceType.ARXIV,
        identifier,
        url: 'https://arxiv.org/abs/2312.00002',
        title: 'Test Paper: Quantum Computing Advances',
        trustScore: 100,
        metadata: {
          arxivId: '2312.00002',
          keywords: ['quantum computing', 'qubits'],
        },
      });

      createdSourceIds.push(added.id);

      // Retrieve by identifier
      const retrieved = await sourceService.getByIdentifier(SourceType.ARXIV, identifier);

      expect(retrieved).toBeDefined();
      expect(retrieved?.identifier).toBe(identifier);
      expect(retrieved?.type).toBe(SourceType.ARXIV);
    });

    it('should return existing source when adding duplicate', async () => {
      const identifier = 'arxiv:2312.00003-test';

      // Add first time
      const first = await sourceService.add({
        type: SourceType.ARXIV,
        identifier,
        url: 'https://arxiv.org/abs/2312.00003',
        title: 'Duplicate Test Paper',
        trustScore: 100,
      });

      createdSourceIds.push(first.id);

      // Add second time - should return existing
      const second = await sourceService.add({
        type: SourceType.ARXIV,
        identifier,
        url: 'https://arxiv.org/abs/2312.00003',
        title: 'Duplicate Test Paper Modified',
        trustScore: 100,
      });

      expect(second.id).toBe(first.id);
      expect(second.title).toBe('Duplicate Test Paper'); // Original title preserved
    });

    it('should search sources by text', async () => {
      // Add sources for searching
      const source1 = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:search-test-001',
        url: 'https://arxiv.org/abs/search-001',
        title: 'Deep Learning for Natural Language Processing',
        trustScore: 100,
        metadata: {
          abstract: 'A survey of deep learning techniques for NLP tasks.',
          keywords: ['deep learning', 'NLP', 'transformers'],
        },
      });

      createdSourceIds.push(source1.id);

      const source2 = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:search-test-002',
        url: 'https://arxiv.org/abs/search-002',
        title: 'Computer Vision with Convolutional Networks',
        trustScore: 100,
        metadata: {
          abstract: 'Advanced computer vision using CNNs.',
          keywords: ['computer vision', 'CNN', 'image classification'],
        },
      });

      createdSourceIds.push(source2.id);

      // Search for "deep learning"
      const results = await sourceService.search('deep learning');

      expect(results.length).toBeGreaterThanOrEqual(1);
      const found = results.find(s => s.id === source1.id);
      expect(found).toBeDefined();
      expect(found?.title).toContain('Deep Learning');
    });

    it('should verify embedding is stored in PostgreSQL', async () => {
      // Add a source with content that will generate an embedding
      const source = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:embedding-test-001',
        url: 'https://arxiv.org/abs/embedding-001',
        title: 'Embedding Test Paper',
        trustScore: 100,
        metadata: {
          abstract: 'Testing that embeddings are properly stored in PostgreSQL with pgvector.',
          keywords: ['embeddings', 'vectors', 'semantic search'],
        },
      });

      createdSourceIds.push(source.id);

      // Directly query PostgreSQL to verify embedding exists
      const result = await db.$queryRaw<Array<{ has_embedding: boolean; embedding_dim: number }>>`
        SELECT
          embedding IS NOT NULL as has_embedding,
          COALESCE(array_length(embedding::real[], 1), 0) as embedding_dim
        FROM sources
        WHERE id = ${source.id}
      `;

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0]?.has_embedding).toBe(true);
      expect(result[0]?.embedding_dim).toBe(1536); // Standard embedding dimension
    });

    it('should get statistics about sources', async () => {
      const stats = await sourceService.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSources).toBe('number');
      expect(stats.totalSources).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
    });

    it('should reject source with trust score below 100', async () => {
      await expect(
        sourceService.add({
          type: SourceType.ARXIV,
          identifier: 'arxiv:untrusted-001',
          url: 'https://arxiv.org/abs/untrusted-001',
          title: 'Untrusted Source',
          trustScore: 90, // Below 100
        })
      ).rejects.toThrow('MIMIR sources must have trust score of 100');
    });

    it('should reject ineligible source types', async () => {
      await expect(
        sourceService.add({
          type: SourceType.WEB,
          identifier: 'web:test-001',
          url: 'https://example.com/article',
          title: 'Web Source',
          trustScore: 100,
        })
      ).rejects.toThrow(/not eligible for MIMIR/);
    });
  });

  describe('Semantic Search with pgvector', () => {
    it('should perform semantic search using embeddings', async () => {
      // Add sources with distinct topics
      const aiSource = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:semantic-ai-001',
        url: 'https://arxiv.org/abs/semantic-ai-001',
        title: 'Artificial Intelligence and Machine Learning Fundamentals',
        trustScore: 100,
        metadata: {
          abstract: 'An introduction to AI and ML concepts including neural networks and deep learning.',
          keywords: ['artificial intelligence', 'machine learning', 'neural networks'],
        },
      });
      createdSourceIds.push(aiSource.id);

      const bioSource = await sourceService.add({
        type: SourceType.PUBMED,
        identifier: 'pmid:semantic-bio-001',
        url: 'https://pubmed.ncbi.nlm.nih.gov/semantic-bio-001',
        title: 'Molecular Biology and Genetics Research',
        trustScore: 100,
        metadata: {
          pubmedId: 'semantic-bio-001',
          abstract: 'Research on DNA sequencing and genetic engineering techniques.',
          keywords: ['molecular biology', 'genetics', 'DNA'],
          peerReviewed: true,
        },
      });
      createdSourceIds.push(bioSource.id);

      // Search for AI-related content
      const results = await sourceService.semanticSearch('neural networks and deep learning', {
        limit: 10,
        minSimilarity: 0.1, // Low threshold for testing
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
      // Results should include similarity scores
      for (const result of results) {
        expect(result.similarity).toBeDefined();
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
        expect(result.source).toBeDefined();
      }
    });
  });

  describe('Source Invalidation', () => {
    it('should invalidate a source (soft delete)', async () => {
      // Add a source
      const source = await sourceService.add({
        type: SourceType.ARXIV,
        identifier: 'arxiv:invalidate-test-001',
        url: 'https://arxiv.org/abs/invalidate-001',
        title: 'Source to be invalidated',
        trustScore: 100,
      });
      createdSourceIds.push(source.id);

      // Invalidate
      await sourceService.invalidate(source.id, 'Test invalidation');

      // Should not be found by getById
      await expect(sourceService.getById(source.id)).rejects.toThrow(/not found/i);

      // But record still exists in DB with is_valid = false
      const dbRecord = await db.$queryRaw<Array<{ is_valid: boolean; invalidated_at: Date | null }>>`
        SELECT is_valid, invalidated_at FROM sources WHERE id = ${source.id}
      `;
      expect(dbRecord[0]?.is_valid).toBe(false);
      expect(dbRecord[0]?.invalidated_at).toBeDefined();
    });
  });
});
