/**
 * Web Service
 *
 * Fetches and manages web content in HUGIN.
 * All content is marked as unverified with max 49% trust score.
 *
 * Implements real URL fetching with HTML parsing and content extraction.
 */

import { Injectable } from '@nestjs/common';
import { Source, SourceType, createLogger, generateId } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { FilterService } from './filter.service.js';
import * as cheerio from 'cheerio';

const logger = createLogger('WebService', 'info');

export interface WebContent {
  id: string;
  url: string;
  title: string;
  content: string;
  fetchedAt: Date;
  trustScore: number;
  warnings: string[];
  metadata?: {
    domain: string;
    language?: string;
    author?: string;
    publishedAt?: Date;
    description?: string;
  };
}

interface WebContentRow {
  id: string;
  url: string;
  title: string;
  content: string;
  fetched_at: Date;
  trust_score: number;
  domain: string;
  language: string | null;
  author: string | null;
  published_at: Date | null;
  description: string | null;
  warnings: string[];
}

// User-agent for web requests
const USER_AGENT = 'YggdrasilBot/1.0 (HUGIN; +https://github.com/Krigsexe/yggdrasil)';

// Request timeout
const FETCH_TIMEOUT = 10000; // 10 seconds

@Injectable()
export class WebService {
  constructor(
    private readonly db: DatabaseService,
    private readonly filterService: FilterService
  ) {}

  /**
   * Fetch content from a URL with real HTTP request
   */
  async fetch(url: string): Promise<WebContent> {
    const id = generateId();
    const domain = this.extractDomain(url);
    const now = new Date();

    logger.info('Fetching URL', { id, url, domain });

    try {
      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parsed = this.parseHtml(html, url);

      // Run through filter service
      const filterResult = this.filterService.filter(url, parsed.content);

      if (filterResult.blocked) {
        logger.warn('URL blocked by filter', { url, reason: filterResult.blockReason });
        throw new Error(`Blocked: ${filterResult.blockReason}`);
      }

      const content: WebContent = {
        id,
        url,
        title: parsed.title,
        content: parsed.content,
        fetchedAt: now,
        trustScore: Math.min(filterResult.trustScore, 49), // HUGIN max is 49
        warnings: filterResult.warnings,
        metadata: {
          domain,
          language: parsed.language,
          author: parsed.author,
          publishedAt: parsed.publishedAt,
          description: parsed.description,
        },
      };

      // Store in database
      await this.storeContent(content);

      logger.info('URL fetched and stored', {
        id,
        url,
        trustScore: content.trustScore,
        contentLength: content.content.length,
      });

      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to fetch URL', new Error(errorMessage), { url });

      // Return error content with 0 trust
      return {
        id,
        url,
        title: 'Fetch Error',
        content: '',
        fetchedAt: now,
        trustScore: 0,
        warnings: [`Failed to fetch: ${errorMessage}`],
        metadata: { domain },
      };
    }
  }

  /**
   * Search cached web content
   * Security: Uses parameterized query to prevent SQL injection
   */
  async search(query: string, limit = 10): Promise<WebContent[]> {
    // Input validation to prevent ReDoS and excessive memory usage
    const maxQueryLength = 500;
    const maxLimit = 100;

    if (query.length > maxQueryLength) {
      logger.warn('Search query too long, truncating', { originalLength: query.length });
      query = query.substring(0, maxQueryLength);
    }

    const safeLimit = Math.min(Math.max(1, limit), maxLimit);

    logger.info('Searching web content', { query: query.substring(0, 50), limit: safeLimit });

    const normalizedQuery = query.toLowerCase().trim();

    // Escape special LIKE characters to prevent pattern injection
    const escapedQuery = normalizedQuery
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    const searchPattern = `%${escapedQuery}%`;

    // Search in database using properly parameterized query
    const results = await this.db.$queryRaw<WebContentRow[]>`
      SELECT id, url, title, content, fetched_at, trust_score, domain,
             language, author, published_at, description, warnings
      FROM web_content
      WHERE trust_score > 10
        AND (
          LOWER(title) LIKE ${searchPattern}
          OR LOWER(content) LIKE ${searchPattern}
        )
      ORDER BY trust_score DESC, fetched_at DESC
      LIMIT ${safeLimit}
    `;

    return results.map((row: WebContentRow) => this.rowToWebContent(row));
  }

  /**
   * Get content by ID
   */
  async getById(id: string): Promise<WebContent | null> {
    const result = await this.db.$queryRaw<WebContentRow[]>`
      SELECT id, url, title, content, fetched_at, trust_score, domain,
             language, author, published_at, description, warnings
      FROM web_content
      WHERE id = ${id}
    `;

    if (result.length === 0) {
      return null;
    }

    return this.rowToWebContent(result[0]!);
  }

  /**
   * Get recent content for a domain
   */
  async getByDomain(domain: string, limit = 20): Promise<WebContent[]> {
    const results = await this.db.$queryRaw<WebContentRow[]>`
      SELECT id, url, title, content, fetched_at, trust_score, domain,
             language, author, published_at, description, warnings
      FROM web_content
      WHERE domain = ${domain}
      ORDER BY fetched_at DESC
      LIMIT ${limit}
    `;

    return results.map((row: WebContentRow) => this.rowToWebContent(row));
  }

  /**
   * Convert to YGGDRASIL Source format
   */
  toSource(content: WebContent): Omit<Source, 'id' | 'fetchedAt' | 'branch'> {
    return {
      type: SourceType.WEB,
      identifier: content.url,
      url: content.url,
      title: content.title,
      authors: content.metadata?.author ? [content.metadata.author] : [],
      publishedAt: content.metadata?.publishedAt,
      trustScore: Math.min(content.trustScore, 49),
      metadata: {
        abstract: content.metadata?.description,
      },
    };
  }

  /**
   * Check if content can be promoted to VOLVA
   */
  promoteToVolva(content: WebContent): { eligible: boolean; reason?: string } {
    if (content.warnings.length > 0) {
      return {
        eligible: false,
        reason: `Content has warnings: ${content.warnings.join(', ')}`,
      };
    }

    if (content.trustScore < 40) {
      return {
        eligible: false,
        reason: 'Trust score too low for VOLVA promotion',
      };
    }

    // Requires independent verification
    return {
      eligible: false,
      reason: 'Requires independent source verification for VOLVA promotion',
    };
  }

  /**
   * Parse HTML and extract content
   */
  private parseHtml(
    html: string,
    url: string
  ): {
    title: string;
    content: string;
    language?: string;
    author?: string;
    publishedAt?: Date;
    description?: string;
  } {
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      new URL(url).hostname;

    // Extract language
    const language =
      $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');

    // Extract author
    const author =
      $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('[rel="author"]').first().text().trim();

    // Extract description
    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content');

    // Extract published date
    let publishedAt: Date | undefined;
    const dateString =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('time[datetime]').first().attr('datetime');

    if (dateString) {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    // Extract main content
    // Remove script, style, nav, header, footer, ads
    $(
      'script, style, nav, header, footer, aside, .ads, .advertisement, #ads, .sidebar, .comments'
    ).remove();

    // Try to find main content area
    let content = '';
    const mainSelectors = [
      'article',
      '[role="main"]',
      'main',
      '.content',
      '.post-content',
      '.article-content',
      '#content',
      '.entry-content',
    ];

    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) break;
      }
    }

    // Fall back to body text
    if (!content || content.length < 100) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
      .slice(0, 10000); // Limit content length

    return {
      title: title.slice(0, 500),
      content,
      language: language?.slice(0, 10),
      author: author?.slice(0, 200),
      publishedAt,
      description: description?.slice(0, 500),
    };
  }

  /**
   * Store content in database
   */
  private async storeContent(content: WebContent): Promise<void> {
    await this.db.$executeRaw`
      INSERT INTO web_content (
        id, url, title, content, fetched_at, trust_score,
        domain, language, author, published_at, description, warnings
      ) VALUES (
        ${content.id},
        ${content.url},
        ${content.title},
        ${content.content},
        ${content.fetchedAt},
        ${content.trustScore},
        ${content.metadata?.domain ?? ''},
        ${content.metadata?.language ?? null},
        ${content.metadata?.author ?? null},
        ${content.metadata?.publishedAt ?? null},
        ${content.metadata?.description ?? null},
        ${content.warnings}::text[]
      )
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        fetched_at = EXCLUDED.fetched_at,
        trust_score = EXCLUDED.trust_score,
        language = EXCLUDED.language,
        author = EXCLUDED.author,
        published_at = EXCLUDED.published_at,
        description = EXCLUDED.description,
        warnings = EXCLUDED.warnings
    `;
  }

  /**
   * Convert database row to WebContent
   */
  private rowToWebContent(row: WebContentRow): WebContent {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      content: row.content,
      fetchedAt: row.fetched_at,
      trustScore: row.trust_score,
      warnings: row.warnings ?? [],
      metadata: {
        domain: row.domain,
        language: row.language ?? undefined,
        author: row.author ?? undefined,
        publishedAt: row.published_at ?? undefined,
        description: row.description ?? undefined,
      },
    };
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}
