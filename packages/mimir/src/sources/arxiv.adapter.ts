/**
 * arXiv Adapter
 *
 * Fetches academic papers from the arXiv API.
 * arXiv is an open-access repository of electronic preprints and
 * published papers in physics, mathematics, computer science, and more.
 *
 * API Documentation: https://info.arxiv.org/help/api/user-manual.html
 *
 * @note arXiv papers are preprints (not peer-reviewed) so trustScore is 85%, not 100%
 * @note Rate limit: 1 request per 3 seconds recommended
 */

import { Injectable } from '@nestjs/common';
import { Source, SourceType, createLogger } from '@yggdrasil/shared';

const logger = createLogger('ArxivAdapter', 'info');

const ARXIV_API_URL = 'https://export.arxiv.org/api/query';

interface ArxivEntry {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  updated: string;
  categories: string[];
  links: Array<{ href: string; type?: string; rel?: string }>;
}

@Injectable()
export class ArxivAdapter {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 3000; // 3 seconds per arXiv guidelines

  /**
   * Search arXiv for papers matching the query
   */
  async search(
    query: string,
    maxResults = 5
  ): Promise<Omit<Source, 'id' | 'fetchedAt' | 'branch'>[]> {
    try {
      await this.respectRateLimit();

      const encodedQuery = encodeURIComponent(query);
      const url = `${ARXIV_API_URL}?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}`;

      logger.info('arXiv API request', { query, maxResults });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YGGDRASIL/1.0 (Academic Research; contact@yggdrasil.dev)',
        },
      });

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
      }

      const xml = await response.text();
      const entries = this.parseArxivResponse(xml);

      logger.info('arXiv search results', {
        query,
        resultsCount: entries.length,
      });

      return entries.map((entry) => this.arxivToSource(entry));
    } catch (error) {
      logger.error('arXiv search failed', error as Error);
      return [];
    }
  }

  /**
   * Fetch a specific paper by its arXiv ID
   */
  async getByArxivId(
    arxivId: string
  ): Promise<Omit<Source, 'id' | 'fetchedAt' | 'branch'> | null> {
    try {
      await this.respectRateLimit();

      // Clean the arXiv ID (remove version if present for search)
      const cleanId = arxivId.replace(/v\d+$/, '');
      const url = `${ARXIV_API_URL}?id_list=${cleanId}`;

      logger.info('arXiv fetch by ID', { arxivId: cleanId });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YGGDRASIL/1.0 (Academic Research; contact@yggdrasil.dev)',
        },
      });

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.status}`);
      }

      const xml = await response.text();
      const entries = this.parseArxivResponse(xml);

      if (entries.length === 0) {
        return null;
      }

      return this.arxivToSource(entries[0]!);
    } catch (error) {
      logger.error('arXiv fetch by ID failed', error as Error);
      return null;
    }
  }

  /**
   * Parse arXiv Atom XML response
   * The arXiv API returns Atom 1.0 format
   */
  private parseArxivResponse(xml: string): ArxivEntry[] {
    const entries: ArxivEntry[] = [];

    // Extract all <entry> blocks
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1] ?? '';

      // Extract ID (full URL, we'll parse the arXiv ID from it)
      const idMatch = /<id>([^<]+)<\/id>/.exec(entryXml);
      const fullId = idMatch?.[1] ?? '';
      const arxivId = fullId.replace('http://arxiv.org/abs/', '');

      // Extract title (may span multiple lines)
      const titleMatch = /<title>([^<]+)<\/title>/s.exec(entryXml);
      const title = this.cleanText(titleMatch?.[1] ?? 'Untitled');

      // Extract authors
      const authors: string[] = [];
      const authorRegex = /<author>\s*<name>([^<]+)<\/name>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
        authors.push(this.cleanText(authorMatch[1] ?? ''));
      }

      // Extract summary/abstract
      const summaryMatch = /<summary>([^<]+)<\/summary>/s.exec(entryXml);
      const summary = this.cleanText(summaryMatch?.[1] ?? '');

      // Extract dates
      const publishedMatch = /<published>([^<]+)<\/published>/.exec(entryXml);
      const published = publishedMatch?.[1] ?? '';

      const updatedMatch = /<updated>([^<]+)<\/updated>/.exec(entryXml);
      const updated = updatedMatch?.[1] ?? published;

      // Extract categories
      const categories: string[] = [];
      const categoryRegex = /<category[^>]+term="([^"]+)"/g;
      let catMatch;
      while ((catMatch = categoryRegex.exec(entryXml)) !== null) {
        categories.push(catMatch[1] ?? '');
      }

      // Extract links (PDF and abstract)
      const links: ArxivEntry['links'] = [];
      const linkRegex = /<link([^>]+)\/>/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(entryXml)) !== null) {
        const linkAttrs = linkMatch[1] ?? '';
        const hrefMatch = /href="([^"]+)"/.exec(linkAttrs);
        const typeMatch = /type="([^"]+)"/.exec(linkAttrs);
        const relMatch = /rel="([^"]+)"/.exec(linkAttrs);

        if (hrefMatch?.[1]) {
          links.push({
            href: hrefMatch[1],
            type: typeMatch?.[1],
            rel: relMatch?.[1],
          });
        }
      }

      entries.push({
        id: arxivId,
        title,
        authors,
        summary,
        published,
        updated,
        categories,
        links,
      });
    }

    return entries;
  }

  /**
   * Convert arXiv entry to YGGDRASIL Source format
   */
  private arxivToSource(
    entry: ArxivEntry
  ): Omit<Source, 'id' | 'fetchedAt' | 'branch'> {
    // Find PDF link
    const pdfLink = entry.links.find(
      (l) => l.type === 'application/pdf' || l.href.includes('/pdf/')
    );
    const pdfUrl = pdfLink?.href ?? `https://arxiv.org/pdf/${entry.id}`;

    return {
      type: SourceType.ARXIV,
      identifier: entry.id,
      url: `https://arxiv.org/abs/${entry.id}`,
      title: entry.title,
      authors: entry.authors,
      publishedAt: new Date(entry.published),
      // arXiv is preprint (not peer-reviewed), so 85% trust
      // Peer-reviewed versions would need to be checked via DOI
      trustScore: 85,
      metadata: {
        arxivId: entry.id,
        abstract: entry.summary,
        keywords: entry.categories,
        pdfUrl,
        updatedAt: entry.updated,
        peerReviewed: false,
        primaryCategory: entry.categories[0] ?? 'unknown',
      },
    };
  }

  /**
   * Respect arXiv rate limit (1 request per 3 seconds)
   */
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Clean text by removing extra whitespace and newlines
   */
  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
