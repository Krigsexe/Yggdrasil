/**
 * Watcher Service
 *
 * Monitors web sources for changes and updates.
 * Implements the "watching eye" aspect of HUGIN (Thought).
 *
 * Can watch:
 * - Specific URLs for content changes
 * - Domains for new content
 * - Search queries for new results
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createLogger, generateId } from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { WebService } from './web.service.js';

const logger = createLogger('WatcherService', 'info');

export type WatchType = 'URL' | 'DOMAIN' | 'SEARCH';

export interface WatchConfig {
  id: string;
  name: string;
  watchType: WatchType;
  url?: string;
  domain?: string;
  searchQuery?: string;
  intervalMs: number;
  isActive: boolean;
  lastCheckedAt?: Date;
  lastChangeAt?: Date;
}

interface WatchRow {
  id: string;
  name: string;
  url: string | null;
  domain: string | null;
  search_query: string | null;
  watch_type: WatchType;
  interval_ms: number;
  is_active: boolean;
  last_checked_at: Date | null;
  last_change_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Default check interval: 1 hour
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

// Minimum check interval: 5 minutes
const MIN_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class WatcherService implements OnModuleInit, OnModuleDestroy {
  private watchTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly webService: WebService
  ) {}

  /**
   * Start watching on module initialization
   */
  async onModuleInit(): Promise<void> {
    logger.info('Initializing HUGIN Watcher');
    await this.startAllWatches();
  }

  /**
   * Stop all watches on module destruction
   */
  onModuleDestroy(): void {
    logger.info('Shutting down HUGIN Watcher');
    this.stopAllWatches();
  }

  /**
   * Create a new URL watch
   */
  async watchUrl(
    name: string,
    url: string,
    intervalMs = DEFAULT_INTERVAL_MS
  ): Promise<WatchConfig> {
    return this.createWatch({
      name,
      watchType: 'URL',
      url,
      intervalMs: Math.max(intervalMs, MIN_INTERVAL_MS),
    });
  }

  /**
   * Create a new domain watch
   */
  async watchDomain(
    name: string,
    domain: string,
    intervalMs = DEFAULT_INTERVAL_MS
  ): Promise<WatchConfig> {
    return this.createWatch({
      name,
      watchType: 'DOMAIN',
      domain,
      intervalMs: Math.max(intervalMs, MIN_INTERVAL_MS),
    });
  }

  /**
   * Create a new search query watch
   */
  async watchSearch(
    name: string,
    searchQuery: string,
    intervalMs = DEFAULT_INTERVAL_MS
  ): Promise<WatchConfig> {
    return this.createWatch({
      name,
      watchType: 'SEARCH',
      searchQuery,
      intervalMs: Math.max(intervalMs, MIN_INTERVAL_MS),
    });
  }

  /**
   * Get all watches
   */
  async getAllWatches(): Promise<WatchConfig[]> {
    const results = await this.db.$queryRaw<WatchRow[]>`
      SELECT id, name, url, domain, search_query, watch_type, interval_ms,
             is_active, last_checked_at, last_change_at, created_at, updated_at
      FROM web_watches
      ORDER BY created_at DESC
    `;

    return results.map((row: WatchRow) => this.rowToWatchConfig(row));
  }

  /**
   * Get active watches
   */
  async getActiveWatches(): Promise<WatchConfig[]> {
    const results = await this.db.$queryRaw<WatchRow[]>`
      SELECT id, name, url, domain, search_query, watch_type, interval_ms,
             is_active, last_checked_at, last_change_at, created_at, updated_at
      FROM web_watches
      WHERE is_active = true
      ORDER BY last_checked_at ASC NULLS FIRST
    `;

    return results.map((row: WatchRow) => this.rowToWatchConfig(row));
  }

  /**
   * Get watch by ID
   */
  async getWatch(id: string): Promise<WatchConfig | null> {
    const results = await this.db.$queryRaw<WatchRow[]>`
      SELECT id, name, url, domain, search_query, watch_type, interval_ms,
             is_active, last_checked_at, last_change_at, created_at, updated_at
      FROM web_watches
      WHERE id = ${id}
    `;

    if (results.length === 0) {
      return null;
    }

    return this.rowToWatchConfig(results[0]!);
  }

  /**
   * Pause a watch
   */
  async pauseWatch(id: string): Promise<void> {
    await this.db.$executeRaw`
      UPDATE web_watches
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `;

    // Stop the timer
    const timer = this.watchTimers.get(id);
    if (timer) {
      clearInterval(timer);
      this.watchTimers.delete(id);
    }

    logger.info('Watch paused', { id });
  }

  /**
   * Resume a watch
   */
  async resumeWatch(id: string): Promise<void> {
    await this.db.$executeRaw`
      UPDATE web_watches
      SET is_active = true, updated_at = NOW()
      WHERE id = ${id}
    `;

    const watch = await this.getWatch(id);
    if (watch) {
      this.startWatch(watch);
    }

    logger.info('Watch resumed', { id });
  }

  /**
   * Delete a watch
   */
  async deleteWatch(id: string): Promise<void> {
    // Stop the timer
    const timer = this.watchTimers.get(id);
    if (timer) {
      clearInterval(timer);
      this.watchTimers.delete(id);
    }

    await this.db.$executeRaw`
      DELETE FROM web_watches WHERE id = ${id}
    `;

    logger.info('Watch deleted', { id });
  }

  /**
   * Manually trigger a check for a specific watch
   */
  async checkNow(id: string): Promise<{ changed: boolean; contentCount: number }> {
    const watch = await this.getWatch(id);
    if (!watch) {
      throw new Error(`Watch not found: ${id}`);
    }

    return this.executeCheck(watch);
  }

  /**
   * Start all active watches
   */
  private async startAllWatches(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    const watches = await this.getActiveWatches();

    logger.info('Starting watches', { count: watches.length });

    for (const watch of watches) {
      this.startWatch(watch);
    }
  }

  /**
   * Stop all watches
   */
  private stopAllWatches(): void {
    for (const [id, timer] of this.watchTimers) {
      clearInterval(timer);
      logger.info('Watch stopped', { id });
    }
    this.watchTimers.clear();
    this.isRunning = false;
  }

  /**
   * Start a single watch
   */
  private startWatch(watch: WatchConfig): void {
    if (this.watchTimers.has(watch.id)) {
      return;
    }

    // Execute immediately on start
    this.executeCheck(watch).catch((error) => {
      logger.error('Watch check failed', error as Error, { watchId: watch.id });
    });

    // Set up interval for future checks
    const timer = setInterval(() => {
      void (async () => {
        try {
          await this.executeCheck(watch);
        } catch (error) {
          logger.error('Watch check failed', error as Error, { watchId: watch.id });
        }
      })();
    }, watch.intervalMs);

    this.watchTimers.set(watch.id, timer);

    logger.info('Watch started', {
      id: watch.id,
      name: watch.name,
      type: watch.watchType,
      intervalMs: watch.intervalMs,
    });
  }

  /**
   * Execute a check for a watch
   */
  private async executeCheck(
    watch: WatchConfig
  ): Promise<{ changed: boolean; contentCount: number }> {
    logger.info('Executing watch check', { id: watch.id, type: watch.watchType });

    let changed = false;
    let contentCount = 0;

    try {
      switch (watch.watchType) {
        case 'URL':
          if (watch.url) {
            const content = await this.webService.fetch(watch.url);
            contentCount = content.content.length > 0 ? 1 : 0;
            // Check if content has changed
            const existing = await this.webService.getById(content.id);
            changed = !existing || existing.content !== content.content;
          }
          break;

        case 'DOMAIN':
          if (watch.domain) {
            const domainContent = await this.webService.getByDomain(watch.domain);
            contentCount = domainContent.length;
          }
          break;

        case 'SEARCH':
          if (watch.searchQuery) {
            const searchResults = await this.webService.search(watch.searchQuery);
            contentCount = searchResults.length;
          }
          break;
      }

      // Update last checked timestamp
      await this.db.$executeRaw`
        UPDATE web_watches
        SET last_checked_at = NOW(),
            last_change_at = ${changed ? new Date() : (watch.lastChangeAt ?? null)},
            updated_at = NOW()
        WHERE id = ${watch.id}
      `;

      logger.info('Watch check complete', {
        id: watch.id,
        changed,
        contentCount,
      });
    } catch (error) {
      logger.error('Watch check error', error as Error, { watchId: watch.id });
      throw error;
    }

    return { changed, contentCount };
  }

  /**
   * Create a new watch
   */
  private async createWatch(config: {
    name: string;
    watchType: WatchType;
    url?: string;
    domain?: string;
    searchQuery?: string;
    intervalMs: number;
  }): Promise<WatchConfig> {
    const id = generateId();
    const now = new Date();

    await this.db.$executeRaw`
      INSERT INTO web_watches (
        id, name, url, domain, search_query, watch_type, interval_ms,
        is_active, created_at, updated_at
      ) VALUES (
        ${id},
        ${config.name},
        ${config.url ?? null},
        ${config.domain ?? null},
        ${config.searchQuery ?? null},
        ${config.watchType}::"WebWatchType",
        ${config.intervalMs},
        true,
        ${now},
        ${now}
      )
    `;

    const watch: WatchConfig = {
      id,
      name: config.name,
      watchType: config.watchType,
      url: config.url,
      domain: config.domain,
      searchQuery: config.searchQuery,
      intervalMs: config.intervalMs,
      isActive: true,
    };

    // Start watching immediately
    if (this.isRunning) {
      this.startWatch(watch);
    }

    logger.info('Watch created', { id, name: config.name, type: config.watchType });

    return watch;
  }

  /**
   * Convert database row to WatchConfig
   */
  private rowToWatchConfig(row: WatchRow): WatchConfig {
    return {
      id: row.id,
      name: row.name,
      watchType: row.watch_type,
      url: row.url ?? undefined,
      domain: row.domain ?? undefined,
      searchQuery: row.search_query ?? undefined,
      intervalMs: row.interval_ms,
      isActive: row.is_active,
      lastCheckedAt: row.last_checked_at ?? undefined,
      lastChangeAt: row.last_change_at ?? undefined,
    };
  }
}
