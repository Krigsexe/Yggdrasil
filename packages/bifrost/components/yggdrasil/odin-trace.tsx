/**
 * OdinTrace Component
 *
 * Displays the ODIN validation trace including:
 * - Council deliberation votes from THING members
 * - LOKI challenges
 * - TYR verdict
 * - Processing steps timeline
 *
 * Uses Bifrost Collapsible, Card, and Badge components.
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  IconChevronDown,
  IconChevronUp,
  IconBrain,
  IconPalette,
  IconMath,
  IconBook,
  IconEye,
  IconAlertTriangle,
  IconScale,
  IconCheck,
  IconX,
  IconClock,
  IconArrowRight,
} from '@tabler/icons-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  ValidationTrace,
  CouncilVote,
  LokiChallenge,
  CouncilMember,
  CouncilVerdict,
  TraceStep,
} from '@/lib/yggdrasil/types';

interface OdinTraceProps {
  trace: ValidationTrace;
  className?: string;
  defaultOpen?: boolean;
}

const memberConfig: Record<
  CouncilMember,
  { label: string; icon: typeof IconBrain; color: string; description: string }
> = {
  KVASIR: {
    label: 'KVASIR',
    icon: IconBrain,
    color: 'text-purple-500',
    description: 'Deep reasoning (Claude)',
  },
  BRAGI: {
    label: 'BRAGI',
    icon: IconPalette,
    color: 'text-pink-500',
    description: 'Creativity (Grok)',
  },
  NORNES: {
    label: 'NORNES',
    icon: IconMath,
    color: 'text-blue-500',
    description: 'Logic & Math (DeepSeek)',
  },
  SAGA: {
    label: 'SAGA',
    icon: IconBook,
    color: 'text-amber-500',
    description: 'Knowledge (Llama)',
  },
  SYN: {
    label: 'SYN',
    icon: IconEye,
    color: 'text-cyan-500',
    description: 'Vision (Gemini)',
  },
  LOKI: {
    label: 'LOKI',
    icon: IconAlertTriangle,
    color: 'text-red-500',
    description: 'Adversarial Critic',
  },
  TYR: {
    label: 'TYR',
    icon: IconScale,
    color: 'text-emerald-500',
    description: 'Final Arbiter',
  },
};

const verdictConfig: Record<CouncilVerdict, { label: string; color: string }> = {
  CONSENSUS: { label: 'Consensus', color: 'text-emerald-500' },
  MAJORITY: { label: 'Majority', color: 'text-amber-500' },
  SPLIT: { label: 'Split', color: 'text-orange-500' },
  DEADLOCK: { label: 'Deadlock', color: 'text-red-500' },
};

function CouncilVoteCard({ vote }: { vote: CouncilVote }) {
  const config = memberConfig[vote.member];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded',
              'bg-secondary/50',
              config.color
            )}
          >
            <Icon size={14} />
          </div>
          <div>
            <span className={cn('text-sm font-medium', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {config.description}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant={
                vote.confidence >= 80
                  ? 'default'
                  : vote.confidence >= 50
                    ? 'secondary'
                    : 'destructive'
              }
              className="font-mono text-xs"
            >
              {vote.confidence}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {vote.processingTimeMs}ms
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{vote.content}</p>
        {vote.reasoning && (
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            {vote.reasoning}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LokiChallengeCard({ challenge }: { challenge: LokiChallenge }) {
  const targetConfig = memberConfig[challenge.targetMember];
  const TargetIcon = targetConfig.icon;

  const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    LOW: 'outline',
    MEDIUM: 'secondary',
    HIGH: 'secondary',
    CRITICAL: 'destructive',
  };

  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <IconAlertTriangle size={16} className="text-red-500" />
          <span className="text-sm font-medium text-red-500">LOKI Challenge</span>
          <IconArrowRight size={12} className="text-muted-foreground" />
          <div className="flex items-center gap-1">
            <TargetIcon size={14} className={targetConfig.color} />
            <span className={cn('text-sm', targetConfig.color)}>
              {targetConfig.label}
            </span>
          </div>
          <Badge variant={severityVariant[challenge.severity]} className="ml-auto text-xs">
            {challenge.severity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{challenge.challenge}</p>
        {challenge.response && (
          <div className="mt-2 pl-3 border-l-2 border-emerald-500/50">
            <p className="text-xs text-emerald-500/80">{challenge.response}</p>
          </div>
        )}
        <div className="mt-2 flex items-center gap-1">
          {challenge.resolved ? (
            <Badge variant="default" className="text-xs gap-1 bg-emerald-500">
              <IconCheck size={12} /> Resolved
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs gap-1">
              <IconX size={12} /> Unresolved
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessingTimeline({ steps }: { steps: TraceStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              step.status === 'success'
                ? 'bg-emerald-500'
                : step.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            )}
          />
          <span className="text-muted-foreground w-20 truncate">
            {step.component}
          </span>
          <span className="flex-1 truncate">{step.step}</span>
          <span className="font-mono text-muted-foreground">{step.durationMs}ms</span>
        </div>
      ))}
    </div>
  );
}

export function OdinTrace({ trace, className, defaultOpen = false }: OdinTraceProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const verdictInfo = verdictConfig[trace.tyrVerdict];

  const totalTime = trace.processingSteps.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="flex w-full items-center justify-start gap-2 h-auto p-2"
        >
          <IconScale size={16} className="text-emerald-500" />
          <span className="text-sm font-medium">ODIN Trace</span>
          <Badge
            variant={
              trace.tyrVerdict === 'CONSENSUS'
                ? 'default'
                : trace.tyrVerdict === 'MAJORITY'
                  ? 'secondary'
                  : 'destructive'
            }
            className="text-xs"
          >
            {verdictInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <IconClock size={12} />
            {totalTime}ms
          </span>
          {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-4">
        {/* Council Votes */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <IconBrain size={14} />
            THING Council Deliberation
          </h4>
          <div className="space-y-2">
            {trace.councilDeliberation.map((vote, index) => (
              <CouncilVoteCard key={`${vote.member}-${index}`} vote={vote} />
            ))}
          </div>
        </div>

        {/* LOKI Challenges */}
        {trace.lokiChallenges.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <IconAlertTriangle size={14} />
              LOKI Challenges ({trace.lokiChallenges.length})
            </h4>
            <div className="space-y-2">
              {trace.lokiChallenges.map((challenge, index) => (
                <LokiChallengeCard key={index} challenge={challenge} />
              ))}
            </div>
          </div>
        )}

        {/* TYR Verdict */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <IconScale size={18} className="text-emerald-500" />
              <span className="text-sm font-medium text-emerald-500">TYR Verdict</span>
              <Badge
                variant={
                  trace.tyrVerdict === 'CONSENSUS'
                    ? 'default'
                    : trace.tyrVerdict === 'MAJORITY'
                      ? 'secondary'
                      : 'destructive'
                }
                className="ml-auto"
              >
                {verdictInfo.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Processing Timeline */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <IconClock size={14} />
              Processing Timeline
            </h4>
            <ProcessingTimeline steps={trace.processingSteps} />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Compact ODIN trace toggle button
 */
export function OdinTraceToggle({
  trace,
  className,
}: {
  trace: ValidationTrace;
  className?: string;
}) {
  const [showTrace, setShowTrace] = useState(false);
  const verdictInfo = verdictConfig[trace.tyrVerdict];

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowTrace(!showTrace)}
        className="text-xs text-muted-foreground hover:text-foreground h-auto py-1 px-2"
      >
        <IconScale size={12} className={cn('mr-1', verdictInfo.color)} />
        <span>Show ODIN trace</span>
        {showTrace ? (
          <IconChevronUp size={12} className="ml-1" />
        ) : (
          <IconChevronDown size={12} className="ml-1" />
        )}
      </Button>
      {showTrace && <OdinTrace trace={trace} className="mt-2" defaultOpen />}
    </div>
  );
}
