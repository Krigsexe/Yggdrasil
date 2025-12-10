/**
 * Source types for YGGDRASIL
 *
 * Sources are the foundation of YGGDRASIL's truth system.
 * Every claim must be anchored to verifiable sources.
 */

import { EpistemicBranch } from './epistemic.js';

export enum SourceType {
  ARXIV = 'arxiv',
  PUBMED = 'pubmed',
  ISO = 'iso',
  RFC = 'rfc',
  WIKIDATA = 'wikidata',
  WEB = 'web',
  BOOK = 'book',
  JOURNAL = 'journal',
  OTHER = 'other',
}

export interface Source {
  id: string;
  type: SourceType;
  identifier: string;
  url: string;
  title: string;
  authors: string[];
  publishedAt?: Date;
  fetchedAt: Date;
  trustScore: number;
  branch: EpistemicBranch;
  metadata?: SourceMetadata;
}

export interface SourceMetadata {
  doi?: string;
  isbn?: string;
  issn?: string;
  arxivId?: string;
  pubmedId?: string;
  abstract?: string;
  keywords?: string[];
  citations?: number;
  peerReviewed?: boolean;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  // arXiv-specific metadata
  pdfUrl?: string;
  primaryCategory?: string;
  updatedAt?: string;
  // Web-specific metadata
  domain?: string;
  warnings?: string[];
  language?: string;
}

export interface SourceValidation {
  sourceId: string;
  isValid: boolean;
  validatedAt: Date;
  validatedBy: string;
  notes?: string;
}

/**
 * Trust score ranges for different source types
 */
export const SOURCE_TRUST_SCORES: Record<SourceType, { min: number; max: number }> = {
  [SourceType.ARXIV]: { min: 70, max: 90 },
  [SourceType.PUBMED]: { min: 85, max: 100 },
  [SourceType.ISO]: { min: 95, max: 100 },
  [SourceType.RFC]: { min: 90, max: 100 },
  [SourceType.WIKIDATA]: { min: 60, max: 85 },
  [SourceType.WEB]: { min: 0, max: 50 },
  [SourceType.BOOK]: { min: 50, max: 90 },
  [SourceType.JOURNAL]: { min: 70, max: 100 },
  [SourceType.OTHER]: { min: 0, max: 50 },
};

/**
 * Determines if a source type is eligible for MIMIR
 */
export function isMimirEligible(type: SourceType): boolean {
  return [
    SourceType.ARXIV,    // Peer-reviewed preprints
    SourceType.PUBMED,   // Medical research
    SourceType.ISO,      // International standards
    SourceType.RFC,      // Internet standards
    SourceType.JOURNAL,  // Peer-reviewed journals
  ].includes(type);
}
