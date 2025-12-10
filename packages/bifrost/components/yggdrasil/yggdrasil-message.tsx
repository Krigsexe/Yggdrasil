/**
 * YggdrasilMessage Component
 *
 * Enhanced message display for YGGDRASIL responses.
 * Shows confidence badge, sources, and ODIN trace.
 *
 * Uses Bifrost Button and Badge components.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { IconTree, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBadge, UnknownBadge } from './confidence-badge';
import { SourceList } from './source-card';
import { OdinTraceToggle } from './odin-trace';
import { ThinkingBlock } from './thinking-block';
import type { YggdrasilResponse, YggdrasilResponseWithThinking, ThinkingStep } from '@/lib/yggdrasil/types';

interface YggdrasilMessageProps {
  response: YggdrasilResponse | YggdrasilResponseWithThinking;
  className?: string;
  showDetails?: boolean;
  isLoading?: boolean;
}

export function YggdrasilMessage({
  response,
  className,
  showDetails = true,
  isLoading = false,
}: YggdrasilMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if response has thinking steps
  const thinkingSteps: ThinkingStep[] = 'thinking' in response ? response.thinking : [];

  // If answer is null, YGGDRASIL says "I don't know"
  if (response.answer === null) {
    return (
      <div className={cn('mt-4 border-t pt-4', className)}>
        {/* Thinking steps - shown first */}
        {thinkingSteps.length > 0 && (
          <ThinkingBlock steps={thinkingSteps} isLoading={isLoading} />
        )}

        <div className="flex items-center gap-2 mb-2">
          <IconTree size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            YGGDRASIL Response
          </span>
          <UnknownBadge reason={response.rejectionReason} />
        </div>
        <p className="text-sm text-muted-foreground italic">
          I cannot provide a verified answer for this query.
          {response.rejectionReason && (
            <span className="block mt-1">
              Reason: {formatRejectionReason(response.rejectionReason)}
            </span>
          )}
        </p>
        {response.trace && showDetails && (
          <OdinTraceToggle trace={response.trace} className="mt-3" />
        )}
      </div>
    );
  }

  return (
    <div className={cn('mt-4 border-t pt-4', className)}>
      {/* Thinking steps - shown first, before the response */}
      {thinkingSteps.length > 0 && (
        <ThinkingBlock steps={thinkingSteps} isLoading={isLoading} />
      )}

      {/* Header with confidence */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <IconTree size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            YGGDRASIL Response
          </span>
        </div>
        <ConfidenceBadge
          branch={response.epistemicBranch}
          confidence={response.confidence}
          isVerified={response.isVerified}
          size="sm"
        />
      </div>

      {/* Collapsible details */}
      {showDetails && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <IconChevronUp size={14} className="mr-1" />
            ) : (
              <IconChevronDown size={14} className="mr-1" />
            )}
            {isExpanded ? 'Hide details' : 'Show details'}
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {response.processingTimeMs}ms
            </Badge>
          </Button>

          {isExpanded && (
            <div className="mt-3 space-y-4">
              {/* Sources */}
              {response.sources.length > 0 && (
                <SourceList sources={response.sources} maxVisible={3} />
              )}

              {/* ODIN Trace */}
              {response.trace && (
                <OdinTraceToggle trace={response.trace} />
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Request ID: {response.requestId}</div>
                <div>
                  Timestamp:{' '}
                  {new Date(response.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Compact inline indicator for YGGDRASIL verification status
 */
export function YggdrasilInlineStatus({
  response,
  className,
}: {
  response: YggdrasilResponse;
  className?: string;
}) {
  if (response.answer === null) {
    return <UnknownBadge className={className} />;
  }

  return (
    <ConfidenceBadge
      branch={response.epistemicBranch}
      confidence={response.confidence}
      isVerified={response.isVerified}
      size="sm"
      showLabel={false}
      className={className}
    />
  );
}

function formatRejectionReason(reason: string): string {
  const reasons: Record<string, string> = {
    NO_SOURCE: 'No verified sources found',
    CONTRADICTS_MEMORY: 'Conflicts with previous verified information',
    FAILED_CRITIQUE: 'Failed LOKI adversarial review',
    NO_CONSENSUS: 'Council could not reach consensus',
    INSUFFICIENT_CONFIDENCE: 'Confidence level too low',
    CONTAMINATION_DETECTED: 'Epistemic contamination detected',
    TIMEOUT: 'Processing timeout',
    INTERNAL_ERROR: 'Internal processing error',
  };
  return reasons[reason] || reason;
}

/**
 * Loading state for YGGDRASIL query
 */
export function YggdrasilLoading({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 animate-pulse', className)}>
      <IconTree size={16} className="text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        YGGDRASIL is processing...
      </span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
