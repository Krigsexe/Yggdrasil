/**
 * Knowledge Watcher Service
 *
 * AGI v2.0 Daemon for proactive surveillance of knowledge nodes.
 * Implements the priority queue system from YGGDRASIL-MASTER.md.
 *
 * "HUGIN surveille. ODIN valide. MUNIN mémorise."
 *
 * Features:
 * - Priority-based scanning (HOT: 1h, WARM: 24h, COLD: 7d)
 * - Automatic queue promotion/demotion based on epistemic velocity
 * - Integration with Knowledge Ledger for audit trail
 * - Proactive contradiction detection
 * - Alert system for significant changes
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createLogger,
  PriorityQueue,
  PRIORITY_QUEUE_CONFIG,
  EpistemicVelocity,
  calculateEpistemicVelocity,
  getPriorityQueueForVelocity,
  KnowledgeLedgerAction,
} from '@yggdrasil/shared';
import { DatabaseService } from '@yggdrasil/shared/database';
import { WebService } from './web.service.js';

const logger = createLogger('KnowledgeWatcherService', 'info');

// Batch size for processing nodes
const BATCH_SIZE = 50;

// Maximum concurrent checks
const MAX_CONCURRENT_CHECKS = 10;

// Alert thresholds
const VELOCITY_ALERT_THRESHOLD = 0.1; // Alert if velocity exceeds this
const CONTRADICTION_CONFIDENCE_DROP = 0.3; // Alert if confidence drops more than 30%

export interface WatcherStats {
  hotQueueSize: number;
  warmQueueSize: number;
  coldQueueSize: number;
  totalScansToday: number;
  contradictionsDetected: number;
  alertsSent: number;
  lastScanTime: Date | null;
}

export interface ScanResult {
  nodeId: string;
  changed: boolean;
  newConfidence?: number;
  previousConfidence: number;
  velocity: EpistemicVelocity;
  contradictionDetected: boolean;
  alertTriggered: boolean;
}

export interface Alert {
  id: string;
  type: 'VELOCITY_SPIKE' | 'CONTRADICTION' | 'CONFIDENCE_DROP' | 'NEW_SOURCE';
  nodeId: string;
  statement: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  acknowledged: boolean;
}

interface KnowledgeNodeRow {
  id: string;
  statement: string;
  domain: string | null;
  current_state: string;
  confidence_score: number;
  epistemic_velocity: number;
  priority_queue: string;
  last_scan: Date | null;
  next_scan: Date | null;
  idle_cycles: number;
}

@Injectable()
export class KnowledgeWatcherService implements OnModuleInit, OnModuleDestroy {
  private queueTimers: Map<PriorityQueue, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private stats: WatcherStats = {
    hotQueueSize: 0,
    warmQueueSize: 0,
    coldQueueSize: 0,
    totalScansToday: 0,
    contradictionsDetected: 0,
    alertsSent: 0,
    lastScanTime: null,
  };
  private alerts: Alert[] = [];

  constructor(
    private readonly db: DatabaseService,
    private readonly webService: WebService
  ) {}

  async onModuleInit(): Promise<void> {
    logger.info('Initializing HUGIN Knowledge Watcher daemon');
    await this.startDaemon();
  }

  onModuleDestroy(): void {
    logger.info('Shutting down HUGIN Knowledge Watcher daemon');
    this.stopDaemon();
  }

  /**
   * Start the watcher daemon with priority queue timers
   */
  async startDaemon(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Daemon already running');
      return;
    }

    this.isRunning = true;
    await this.updateQueueStats();

    // Start timers for each priority queue
    for (const queue of [PriorityQueue.HOT, PriorityQueue.WARM, PriorityQueue.COLD]) {
      const config = PRIORITY_QUEUE_CONFIG[queue];
      const timer = setInterval(() => {
        void this.processQueue(queue);
      }, config.intervalMs);

      this.queueTimers.set(queue, timer);

      logger.info('Queue timer started', {
        queue,
        intervalMs: config.intervalMs,
        description: config.description,
      });
    }

    // Run initial scan for HOT queue immediately
    void this.processQueue(PriorityQueue.HOT);

    logger.info('Knowledge Watcher daemon started', { stats: this.stats });
  }

  /**
   * Stop the watcher daemon
   */
  stopDaemon(): void {
    for (const [queue, timer] of this.queueTimers) {
      clearInterval(timer);
      logger.info('Queue timer stopped', { queue });
    }
    this.queueTimers.clear();
    this.isRunning = false;
  }

  /**
   * Process all nodes in a priority queue
   */
  async processQueue(queue: PriorityQueue): Promise<void> {
    logger.info('Processing queue', { queue });

    const nodes = await this.getNodesDueForScan(queue, BATCH_SIZE);

    if (nodes.length === 0) {
      logger.debug('No nodes due for scan', { queue });
      return;
    }

    logger.info('Processing nodes', { queue, count: nodes.length });

    // Process in batches with concurrency limit
    const results: ScanResult[] = [];
    for (let i = 0; i < nodes.length; i += MAX_CONCURRENT_CHECKS) {
      const batch = nodes.slice(i, i + MAX_CONCURRENT_CHECKS);
      const batchResults = await Promise.all(batch.map((node) => this.scanNode(node)));
      results.push(...batchResults);
    }

    // Update stats
    this.stats.totalScansToday += results.length;
    this.stats.lastScanTime = new Date();
    this.stats.contradictionsDetected += results.filter((r) => r.contradictionDetected).length;
    this.stats.alertsSent += results.filter((r) => r.alertTriggered).length;

    await this.updateQueueStats();

    logger.info('Queue processing complete', {
      queue,
      processed: results.length,
      changed: results.filter((r) => r.changed).length,
      contradictions: results.filter((r) => r.contradictionDetected).length,
      alerts: results.filter((r) => r.alertTriggered).length,
    });
  }

  /**
   * Scan a single knowledge node for updates
   */
  async scanNode(node: KnowledgeNodeRow): Promise<ScanResult> {
    const startTime = Date.now();
    let changed = false;
    let newConfidence = node.confidence_score;
    let contradictionDetected = false;
    let alertTriggered = false;

    try {
      // Search for new information related to this node
      const searchResults = await this.webService.search(node.statement);

      if (searchResults.length > 0) {
        // Analyze search results for changes
        const analysis = this.analyzeSearchResults(node, searchResults);
        changed = analysis.changed;
        newConfidence = analysis.newConfidence;
        contradictionDetected = analysis.contradictionDetected;
      }

      // Calculate epistemic velocity
      const deltaTimeMs = node.last_scan
        ? Date.now() - node.last_scan.getTime()
        : PRIORITY_QUEUE_CONFIG[PriorityQueue.WARM].intervalMs;

      const velocity = calculateEpistemicVelocity(
        node.confidence_score,
        newConfidence,
        deltaTimeMs
      );

      // Determine new priority queue based on velocity
      const newQueue = getPriorityQueueForVelocity(velocity);
      const currentQueue = node.priority_queue as PriorityQueue;

      // Check if we need to trigger alerts
      if (Math.abs(velocity.value) > VELOCITY_ALERT_THRESHOLD) {
        alertTriggered = true;
        await this.createAlert({
          type: 'VELOCITY_SPIKE',
          nodeId: node.id,
          statement: node.statement,
          severity: Math.abs(velocity.value) > 0.2 ? 'HIGH' : 'MEDIUM',
          message: `Epistemic velocity spike detected: ${velocity.value.toFixed(4)}`,
          metadata: { velocity, previousConfidence: node.confidence_score, newConfidence },
        });
      }

      if (contradictionDetected) {
        alertTriggered = true;
        await this.createAlert({
          type: 'CONTRADICTION',
          nodeId: node.id,
          statement: node.statement,
          severity: 'CRITICAL',
          message: 'Potential contradiction detected in source material',
          metadata: { searchResultCount: searchResults.length },
        });
      }

      const confidenceDrop = node.confidence_score - newConfidence;
      if (confidenceDrop > CONTRADICTION_CONFIDENCE_DROP) {
        alertTriggered = true;
        await this.createAlert({
          type: 'CONFIDENCE_DROP',
          nodeId: node.id,
          statement: node.statement,
          severity: 'HIGH',
          message: `Significant confidence drop: ${(confidenceDrop * 100).toFixed(1)}%`,
          metadata: { previousConfidence: node.confidence_score, newConfidence, drop: confidenceDrop },
        });
      }

      // Update node in database
      await this.updateNodeAfterScan(node.id, {
        newConfidence,
        velocity: velocity.value,
        newQueue,
        changed,
        idleCycles: changed ? 0 : node.idle_cycles + 1,
      });

      // Log queue change if applicable
      if (newQueue !== currentQueue) {
        logger.info('Node queue changed', {
          nodeId: node.id,
          from: currentQueue,
          to: newQueue,
          reason: velocity.trend,
        });
      }

      const result: ScanResult = {
        nodeId: node.id,
        changed,
        newConfidence,
        previousConfidence: node.confidence_score,
        velocity,
        contradictionDetected,
        alertTriggered,
      };

      logger.debug('Node scan complete', {
        nodeId: node.id,
        durationMs: Date.now() - startTime,
        changed,
        velocity: velocity.value,
      });

      return result;
    } catch (error) {
      logger.error('Node scan failed', error as Error, { nodeId: node.id });

      // Return unchanged result on error
      return {
        nodeId: node.id,
        changed: false,
        previousConfidence: node.confidence_score,
        velocity: calculateEpistemicVelocity(node.confidence_score, node.confidence_score, 0),
        contradictionDetected: false,
        alertTriggered: false,
      };
    }
  }

  /**
   * Analyze search results for a node
   */
  private analyzeSearchResults(
    node: KnowledgeNodeRow,
    searchResults: Array<{ content: string; trustScore: number }>
  ): { changed: boolean; newConfidence: number; contradictionDetected: boolean } {
    // Simple heuristic analysis - in production this would use LLM analysis
    let totalTrustScore = 0;
    let contradictionSignals = 0;

    for (const result of searchResults) {
      totalTrustScore += result.trustScore;

      // Simple contradiction detection based on negation patterns
      const contentLower = result.content.toLowerCase();
      const statementLower = node.statement.toLowerCase();

      // Check for negation patterns near key terms
      const negationPatterns = ['not true', 'false', 'incorrect', 'wrong', 'debunked', 'disproven'];
      for (const pattern of negationPatterns) {
        if (contentLower.includes(pattern)) {
          // Check if the negation is related to the statement
          const words = statementLower.split(/\s+/).filter((w) => w.length > 4);
          const matchingWords = words.filter((w) => contentLower.includes(w));
          if (matchingWords.length > 2) {
            contradictionSignals++;
          }
        }
      }
    }

    const averageTrustScore = searchResults.length > 0 ? totalTrustScore / searchResults.length : 0;
    const contradictionDetected = contradictionSignals >= 2;

    // Calculate new confidence based on findings
    let newConfidence = node.confidence_score;

    if (searchResults.length > 0) {
      // Weighted adjustment based on source quality
      const adjustment = (averageTrustScore / 100 - 0.5) * 0.1; // Max ±5% adjustment
      newConfidence = Math.max(0, Math.min(100, node.confidence_score + adjustment * 100));

      // Reduce confidence if contradictions detected
      if (contradictionDetected) {
        newConfidence = Math.max(0, newConfidence - 20);
      }
    }

    const changed = Math.abs(newConfidence - node.confidence_score) > 1;

    return { changed, newConfidence, contradictionDetected };
  }

  /**
   * Get nodes due for scanning in a priority queue
   */
  private async getNodesDueForScan(
    queue: PriorityQueue,
    limit: number
  ): Promise<KnowledgeNodeRow[]> {
    const results = await this.db.$queryRaw<KnowledgeNodeRow[]>`
      SELECT id, statement, domain, current_state, confidence_score,
             epistemic_velocity, priority_queue, last_scan, next_scan, idle_cycles
      FROM knowledge_nodes
      WHERE priority_queue = ${queue}::"PriorityQueue"
        AND current_state NOT IN ('DEPRECATED', 'REJECTED')
        AND (next_scan IS NULL OR next_scan <= NOW())
      ORDER BY next_scan ASC NULLS FIRST
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Update a node after scanning
   */
  private async updateNodeAfterScan(
    nodeId: string,
    update: {
      newConfidence: number;
      velocity: number;
      newQueue: PriorityQueue;
      changed: boolean;
      idleCycles: number;
    }
  ): Promise<void> {
    const now = new Date();
    const intervalMs = PRIORITY_QUEUE_CONFIG[update.newQueue].intervalMs;
    const nextScan = new Date(now.getTime() + intervalMs);

    // Get current audit trail
    const currentNode = await this.db.$queryRaw<Array<{ audit_trail: unknown[] }>>`
      SELECT audit_trail FROM knowledge_nodes WHERE id = ${nodeId}
    `;

    const auditTrail = currentNode[0]?.audit_trail ?? [];

    // Add scan entry to audit trail
    const auditEntry = {
      timestamp: now.toISOString(),
      action: KnowledgeLedgerAction.VELOCITY_UPDATE,
      fromState: null,
      toState: null,
      trigger: 'HUGIN_SCAN',
      agent: 'HUGIN',
      confidenceDelta: update.changed
        ? `${update.newConfidence > 0 ? '+' : ''}${update.velocity.toFixed(4)}`
        : undefined,
      reason: `Scheduled scan (${update.newQueue} queue)`,
    };

    const updatedAuditTrail = [...auditTrail, auditEntry];

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET confidence_score = ${update.newConfidence},
          epistemic_velocity = ${update.velocity},
          priority_queue = ${update.newQueue}::"PriorityQueue",
          last_scan = ${now},
          next_scan = ${nextScan},
          idle_cycles = ${update.idleCycles},
          audit_trail = ${JSON.stringify(updatedAuditTrail)}::jsonb,
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;
  }

  /**
   * Create an alert
   */
  private async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Promise<void> {
    const fullAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date(),
      acknowledged: false,
    };

    this.alerts.push(fullAlert);

    // Keep only last 1000 alerts in memory
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Also persist to database
    await this.db.$executeRaw`
      INSERT INTO hugin_alerts (id, type, node_id, statement, severity, message, metadata, created_at, acknowledged)
      VALUES (
        ${fullAlert.id},
        ${fullAlert.type},
        ${fullAlert.nodeId},
        ${fullAlert.statement},
        ${fullAlert.severity},
        ${fullAlert.message},
        ${JSON.stringify(fullAlert.metadata)}::jsonb,
        ${fullAlert.createdAt},
        false
      )
    `;

    logger.warn('Alert created', {
      type: fullAlert.type,
      severity: fullAlert.severity,
      nodeId: fullAlert.nodeId,
    });
  }

  /**
   * Update queue statistics
   */
  private async updateQueueStats(): Promise<void> {
    const counts = await this.db.$queryRaw<Array<{ queue: string; count: bigint }>>`
      SELECT priority_queue as queue, COUNT(*) as count
      FROM knowledge_nodes
      WHERE current_state NOT IN ('DEPRECATED', 'REJECTED')
      GROUP BY priority_queue
    `;

    for (const row of counts) {
      const count = Number(row.count);
      switch (row.queue) {
        case 'HOT':
          this.stats.hotQueueSize = count;
          break;
        case 'WARM':
          this.stats.warmQueueSize = count;
          break;
        case 'COLD':
          this.stats.coldQueueSize = count;
          break;
      }
    }
  }

  /**
   * Get current watcher statistics
   */
  getStats(): WatcherStats {
    return { ...this.stats };
  }

  /**
   * Get recent alerts
   */
  getAlerts(options?: {
    type?: Alert['type'];
    severity?: Alert['severity'];
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = this.alerts;

    if (options?.type) {
      filtered = filtered.filter((a) => a.type === options.type);
    }
    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter((a) => a.acknowledged === options.acknowledged);
    }

    const limit = options?.limit ?? 100;
    return filtered.slice(-limit).reverse();
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }

    await this.db.$executeRaw`
      UPDATE hugin_alerts
      SET acknowledged = true
      WHERE id = ${alertId}
    `;
  }

  /**
   * Manually promote a node to HOT queue for urgent monitoring
   */
  async promoteToHotQueue(nodeId: string, reason: string): Promise<void> {
    const now = new Date();

    await this.db.$executeRaw`
      UPDATE knowledge_nodes
      SET priority_queue = 'HOT'::"PriorityQueue",
          next_scan = ${now},
          idle_cycles = 0,
          updated_at = ${now}
      WHERE id = ${nodeId}
    `;

    logger.info('Node promoted to HOT queue', { nodeId, reason });
    await this.updateQueueStats();
  }

  /**
   * Get queue health metrics
   */
  async getQueueHealth(): Promise<{
    hot: { size: number; avgAge: number; oldestNode: Date | null };
    warm: { size: number; avgAge: number; oldestNode: Date | null };
    cold: { size: number; avgAge: number; oldestNode: Date | null };
  }> {
    const health = await this.db.$queryRaw<
      Array<{
        queue: string;
        size: bigint;
        avg_age_hours: number;
        oldest: Date | null;
      }>
    >`
      SELECT
        priority_queue as queue,
        COUNT(*) as size,
        AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(last_scan, created_at))) / 3600) as avg_age_hours,
        MIN(COALESCE(last_scan, created_at)) as oldest
      FROM knowledge_nodes
      WHERE current_state NOT IN ('DEPRECATED', 'REJECTED')
      GROUP BY priority_queue
    `;

    const result = {
      hot: { size: 0, avgAge: 0, oldestNode: null as Date | null },
      warm: { size: 0, avgAge: 0, oldestNode: null as Date | null },
      cold: { size: 0, avgAge: 0, oldestNode: null as Date | null },
    };

    for (const row of health) {
      const queueKey = row.queue.toLowerCase() as 'hot' | 'warm' | 'cold';
      result[queueKey] = {
        size: Number(row.size),
        avgAge: row.avg_age_hours,
        oldestNode: row.oldest,
      };
    }

    return result;
  }
}
