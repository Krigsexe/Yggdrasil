/**
 * Audit Interceptor
 *
 * Automatically logs all HTTP requests for traceability.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service.js';
import { AuditAction, User } from '@yggdrasil/shared';

interface RequestWithUser {
  method: string;
  url: string;
  ip?: string;
  headers: {
    'user-agent'?: string;
    'x-request-id'?: string;
  };
  user?: User;
}

interface ResponseWithStatusCode {
  statusCode: number;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<ResponseWithStatusCode>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, response, startTime);
        },
        error: () => {
          this.logRequest(request, response, startTime);
        },
      })
    );
  }

  private logRequest(
    request: RequestWithUser,
    response: ResponseWithStatusCode,
    startTime: number
  ): void {
    const durationMs = Date.now() - startTime;
    const action = this.getActionFromRequest(request);

    void this.auditService.log({
      action,
      userId: request.user?.id,
      resourceType: this.getResourceType(request.url),
      resourceId: this.getResourceId(request.url),
      method: request.method,
      path: request.url,
      statusCode: response.statusCode,
      durationMs,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        requestId: request.headers['x-request-id'],
      },
    });
  }

  private getActionFromRequest(request: RequestWithUser): AuditAction {
    const path = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    if (path.includes('/auth/login')) return AuditAction.LOGIN;
    if (path.includes('/auth/logout')) return AuditAction.LOGOUT;
    if (path.includes('/auth/register')) return AuditAction.REGISTER;
    if (path.includes('/auth/refresh')) return AuditAction.TOKEN_REFRESH;

    if (path.includes('/query')) {
      if (method === 'POST') return AuditAction.QUERY_SUBMIT;
    }

    if (path.includes('/memory')) {
      if (method === 'POST') return AuditAction.MEMORY_CREATE;
      if (method === 'PUT' || method === 'PATCH') return AuditAction.MEMORY_UPDATE;
      if (method === 'DELETE') return AuditAction.MEMORY_DELETE;
    }

    if (path.includes('/source')) {
      if (method === 'POST') return AuditAction.SOURCE_ADD;
    }

    // Default based on method
    return AuditAction.QUERY_SUBMIT;
  }

  private getResourceType(url: string): string {
    const segments = url.split('/').filter(Boolean);
    // Skip 'api' and 'v1' prefixes
    const resourceSegment = segments.find(
      (s) => !['api', 'v1', 'v2'].includes(s)
    );
    return resourceSegment ?? 'unknown';
  }

  private getResourceId(url: string): string | undefined {
    const segments = url.split('/').filter(Boolean);
    // Look for UUID-like segments
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return segments.find((s) => uuidPattern.test(s));
  }
}
