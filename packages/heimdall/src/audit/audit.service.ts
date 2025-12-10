/**
 * Audit Service
 *
 * Logs all actions for complete traceability.
 */

import { Injectable } from '@nestjs/common';
import {
  AuditLog,
  AuditAction,
  AuditQuery,
  createLogger,
  generateId,
} from '@yggdrasil/shared';

const logger = createLogger('AuditService', 'info');

// In-memory audit store for development
// TODO: Replace with Prisma when database is set up
const auditLogs: AuditLog[] = [];

@Injectable()
export class AuditService {
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const auditLog: AuditLog = {
      id: generateId(),
      ...entry,
      timestamp: new Date(),
    };

    auditLogs.push(auditLog);

    // Also log to structured logger
    logger.info('Audit log created', {
      action: auditLog.action,
      userId: auditLog.userId,
      resourceType: auditLog.resourceType,
      resourceId: auditLog.resourceId,
      statusCode: auditLog.statusCode,
      durationMs: auditLog.durationMs,
    });

    return auditLog;
  }

  query(query: AuditQuery): AuditLog[] {
    let results = [...auditLogs];

    if (query.userId) {
      results = results.filter((log) => log.userId === query.userId);
    }

    if (query.actions && query.actions.length > 0) {
      results = results.filter((log) => query.actions?.includes(log.action as AuditAction));
    }

    if (query.resourceType) {
      results = results.filter((log) => log.resourceType === query.resourceType);
    }

    if (query.resourceId) {
      results = results.filter((log) => log.resourceId === query.resourceId);
    }

    if (query.fromDate) {
      results = results.filter((log) => log.timestamp >= query.fromDate!);
    }

    if (query.toDate) {
      results = results.filter((log) => log.timestamp <= query.toDate!);
    }

    if (query.statusCode) {
      results = results.filter((log) => log.statusCode === query.statusCode);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  getById(id: string): AuditLog | undefined {
    return auditLogs.find((log) => log.id === id);
  }

  getStats(fromDate: Date, toDate: Date) {
    const logsInRange = auditLogs.filter(
      (log) => log.timestamp >= fromDate && log.timestamp <= toDate
    );

    const actionCounts: Record<string, number> = {};
    let totalResponseTime = 0;
    let errorCount = 0;

    for (const log of logsInRange) {
      actionCounts[log.action] = (actionCounts[log.action] ?? 0) + 1;
      totalResponseTime += log.durationMs;
      if (log.statusCode >= 400) {
        errorCount++;
      }
    }

    return {
      totalLogs: logsInRange.length,
      actionCounts,
      averageResponseTime: logsInRange.length > 0 ? totalResponseTime / logsInRange.length : 0,
      errorRate: logsInRange.length > 0 ? errorCount / logsInRange.length : 0,
      period: { from: fromDate, to: toDate },
    };
  }
}
