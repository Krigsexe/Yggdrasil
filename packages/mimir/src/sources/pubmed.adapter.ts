/**
 * PubMed Adapter
 *
 * Fetches peer-reviewed medical/biomedical literature from NCBI PubMed.
 * Uses the E-utilities API for searching and retrieving article metadata.
 *
 * API Documentation: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 *
 * @note PubMed articles are peer-reviewed, so trustScore is 100%
 * @note Rate limit: 3 requests per second without API key, 10 with key
 */

import { Injectable } from '@nestjs/common';
import { Source, SourceType, createLogger } from '@yggdrasil/shared';

const logger = createLogger('PubmedAdapter', 'info');

const NCBI_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  abstract: string;
  journal: string;
  pubDate: string;
  doi?: string;
  keywords: string[];
}

@Injectable()
export class PubmedAdapter {
  private lastRequestTime = 0;
  private readonly minRequestInterval = 334; // ~3 requests per second
  private readonly apiKey = process.env.NCBI_API_KEY; // Optional for higher rate limit

  /**
   * Search PubMed for articles matching the query
   */
  async search(
    query: string,
    maxResults = 5
  ): Promise<Omit<Source, 'id' | 'fetchedAt' | 'branch'>[]> {
    try {
      // Step 1: Use esearch to get PMIDs
      const pmids = await this.esearch(query, maxResults);

      if (pmids.length === 0) {
        logger.info('PubMed search: no results', { query });
        return [];
      }

      // Step 2: Use efetch to get article details
      const articles = await this.efetch(pmids);

      logger.info('PubMed search results', {
        query,
        resultsCount: articles.length,
      });

      return articles.map((article) => this.pubmedToSource(article));
    } catch (error) {
      logger.error('PubMed search failed', error as Error);
      return [];
    }
  }

  /**
   * Fetch a specific article by PMID
   */
  async getByPmid(
    pmid: string
  ): Promise<Omit<Source, 'id' | 'fetchedAt' | 'branch'> | null> {
    try {
      const articles = await this.efetch([pmid]);

      if (articles.length === 0) {
        return null;
      }

      return this.pubmedToSource(articles[0]!);
    } catch (error) {
      logger.error('PubMed fetch by PMID failed', error as Error);
      return null;
    }
  }

  /**
   * Fetch article by DOI (searches for DOI in PubMed)
   */
  async getByDoi(
    doi: string
  ): Promise<Omit<Source, 'id' | 'fetchedAt' | 'branch'> | null> {
    try {
      // Search PubMed by DOI
      const pmids = await this.esearch(`${doi}[doi]`, 1);

      if (pmids.length === 0) {
        return null;
      }

      return this.getByPmid(pmids[0]!);
    } catch (error) {
      logger.error('PubMed fetch by DOI failed', error as Error);
      return null;
    }
  }

  /**
   * ESearch - Search PubMed and return PMIDs
   */
  private async esearch(query: string, maxResults: number): Promise<string[]> {
    await this.respectRateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: maxResults.toString(),
      retmode: 'json',
      sort: 'relevance',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const url = `${NCBI_BASE_URL}/esearch.fcgi?${params.toString()}`;

    logger.info('PubMed esearch', { query, maxResults });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YGGDRASIL/1.0 (Academic Research; contact@yggdrasil.dev)',
      },
    });

    if (!response.ok) {
      throw new Error(`PubMed esearch error: ${response.status}`);
    }

    const data = await response.json() as {
      esearchresult?: {
        idlist?: string[];
        count?: string;
      };
    };

    return data.esearchresult?.idlist ?? [];
  }

  /**
   * EFetch - Fetch article details by PMIDs
   */
  private async efetch(pmids: string[]): Promise<PubMedArticle[]> {
    if (pmids.length === 0) return [];

    await this.respectRateLimit();

    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'xml',
      rettype: 'abstract',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const url = `${NCBI_BASE_URL}/efetch.fcgi?${params.toString()}`;

    logger.info('PubMed efetch', { pmidCount: pmids.length });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YGGDRASIL/1.0 (Academic Research; contact@yggdrasil.dev)',
      },
    });

    if (!response.ok) {
      throw new Error(`PubMed efetch error: ${response.status}`);
    }

    const xml = await response.text();
    return this.parsePubmedXml(xml);
  }

  /**
   * Parse PubMed XML response
   */
  private parsePubmedXml(xml: string): PubMedArticle[] {
    const articles: PubMedArticle[] = [];

    // Extract all <PubmedArticle> blocks
    const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
    let match;

    while ((match = articleRegex.exec(xml)) !== null) {
      const articleXml = match[1] ?? '';

      // Extract PMID
      const pmidMatch = /<PMID[^>]*>(\d+)<\/PMID>/.exec(articleXml);
      const pmid = pmidMatch?.[1] ?? '';

      // Extract title
      const titleMatch = /<ArticleTitle>([^<]+)<\/ArticleTitle>/s.exec(articleXml);
      const title = this.cleanText(titleMatch?.[1] ?? 'Untitled');

      // Extract authors
      const authors: string[] = [];
      const authorRegex = /<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<ForeName>([^<]*)<\/ForeName>[\s\S]*?<\/Author>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(articleXml)) !== null) {
        const lastName = authorMatch[1] ?? '';
        const foreName = authorMatch[2] ?? '';
        authors.push(`${foreName} ${lastName}`.trim());
      }

      // Extract abstract
      const abstractMatch = /<AbstractText[^>]*>([^<]+)<\/AbstractText>/s.exec(articleXml);
      const abstract = this.cleanText(abstractMatch?.[1] ?? '');

      // Extract journal
      const journalMatch = /<Title>([^<]+)<\/Title>/.exec(articleXml);
      const journal = this.cleanText(journalMatch?.[1] ?? '');

      // Extract publication date
      let pubDate = '';
      const pubDateMatch = /<PubDate>([\s\S]*?)<\/PubDate>/.exec(articleXml);
      if (pubDateMatch) {
        const yearMatch = /<Year>(\d+)<\/Year>/.exec(pubDateMatch[1] ?? '');
        const monthMatch = /<Month>(\w+|\d+)<\/Month>/.exec(pubDateMatch[1] ?? '');
        const dayMatch = /<Day>(\d+)<\/Day>/.exec(pubDateMatch[1] ?? '');

        const year = yearMatch?.[1] ?? new Date().getFullYear().toString();
        const month = monthMatch?.[1] ?? '01';
        const day = dayMatch?.[1] ?? '01';

        pubDate = `${year}-${this.parseMonth(month)}-${day.padStart(2, '0')}`;
      }

      // Extract DOI
      const doiMatch = /<ArticleId IdType="doi">([^<]+)<\/ArticleId>/.exec(articleXml);
      const doi = doiMatch?.[1];

      // Extract keywords
      const keywords: string[] = [];
      const keywordRegex = /<Keyword[^>]*>([^<]+)<\/Keyword>/g;
      let kwMatch;
      while ((kwMatch = keywordRegex.exec(articleXml)) !== null) {
        keywords.push(this.cleanText(kwMatch[1] ?? ''));
      }

      if (pmid) {
        articles.push({
          pmid,
          title,
          authors,
          abstract,
          journal,
          pubDate,
          doi,
          keywords,
        });
      }
    }

    return articles;
  }

  /**
   * Convert PubMed article to YGGDRASIL Source format
   */
  private pubmedToSource(
    article: PubMedArticle
  ): Omit<Source, 'id' | 'fetchedAt' | 'branch'> {
    return {
      type: SourceType.PUBMED,
      identifier: article.pmid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      title: article.title,
      authors: article.authors,
      publishedAt: new Date(article.pubDate),
      // PubMed is peer-reviewed, 100% trust for MIMIR
      trustScore: 100,
      metadata: {
        pubmedId: article.pmid,
        doi: article.doi,
        abstract: article.abstract,
        journal: article.journal,
        keywords: article.keywords,
        peerReviewed: true,
      },
    };
  }

  /**
   * Respect NCBI rate limit
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
   * Parse month string (name or number) to 2-digit string
   */
  private parseMonth(month: string): string {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04',
      may: '05', jun: '06', jul: '07', aug: '08',
      sep: '09', oct: '10', nov: '11', dec: '12',
    };

    const lower = month.toLowerCase().slice(0, 3);
    return months[lower] ?? month.padStart(2, '0');
  }

  /**
   * Clean text by removing extra whitespace
   */
  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }
}
