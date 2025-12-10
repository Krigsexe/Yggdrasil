/**
 * ThinkingBlock Component
 *
 * Displays YGGDRASIL's reasoning process in a collapsible format.
 * Similar to Claude's "thinking" mode - shows transparent reasoning steps.
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  IconBrain,
  IconChevronDown,
  IconChevronRight,
  IconRoute,
  IconSearch,
  IconUsers,
  IconShieldCheck,
  IconMessage,
  IconLoader2,
} from '@tabler/icons-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ThinkingStep, ThinkingPhase } from '@/lib/yggdrasil/types';

interface ThinkingBlockProps {
  steps: ThinkingStep[];
  isLoading?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

/** Phase icons and colors */
const phaseConfig: Record<
  ThinkingPhase,
  { icon: typeof IconBrain; label: string; color: string }
> = {
  routing: {
    icon: IconRoute,
    label: 'Analyse',
    color: 'text-muted-foreground',
  },
  gathering: {
    icon: IconSearch,
    label: 'Recherche',
    color: 'text-muted-foreground',
  },
  deliberating: {
    icon: IconUsers,
    label: 'Deliberation',
    color: 'text-muted-foreground',
  },
  validating: {
    icon: IconShieldCheck,
    label: 'Validation',
    color: 'text-muted-foreground',
  },
  responding: {
    icon: IconMessage,
    label: 'Reponse',
    color: 'text-muted-foreground',
  },
};

/**
 * Single thinking step display
 */
function ThinkingStepItem({
  step,
  isLatest,
}: {
  step: ThinkingStep;
  isLatest?: boolean;
}) {
  const config = phaseConfig[step.phase];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-3 rounded-md transition-colors',
        isLatest && 'bg-muted/50'
      )}
    >
      <div className={cn('mt-0.5 flex-shrink-0', config.color)}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90 leading-relaxed">
          {step.thought}
        </p>
      </div>
    </div>
  );
}

/**
 * Animated loading indicator during thinking
 */
function ThinkingLoader() {
  return (
    <div className="flex items-center gap-2 py-2 px-3 text-muted-foreground">
      <IconLoader2 size={16} className="animate-spin" />
      <span className="text-sm italic">Je reflechis...</span>
    </div>
  );
}

/**
 * Main thinking block component
 */
export function ThinkingBlock({
  steps,
  isLoading = false,
  defaultOpen = false,
  className,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Auto-open when new steps arrive during loading
  useEffect(() => {
    if (isLoading && steps.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [isLoading, steps.length, isOpen]);

  if (steps.length === 0 && !isLoading) {
    return null;
  }

  // Get current phase for header display
  const currentPhase = steps.length > 0 ? steps[steps.length - 1].phase : 'routing';
  const currentConfig = phaseConfig[currentPhase];

  return (
    <div className={cn('mb-3', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
              'bg-muted/30 hover:bg-muted/50 cursor-pointer',
              'border border-border/50'
            )}
          >
            {/* Expand/collapse icon */}
            <div className="text-muted-foreground">
              {isOpen ? (
                <IconChevronDown size={16} />
              ) : (
                <IconChevronRight size={16} />
              )}
            </div>

            {/* Brain icon */}
            <IconBrain size={18} className="text-muted-foreground" />

            {/* Title */}
            <span className="text-sm font-medium text-foreground/80">
              Raisonnement YGGDRASIL
            </span>

            {/* Current phase indicator */}
            {isLoading && (
              <div className={cn('flex items-center gap-1.5 ml-2', currentConfig.color)}>
                <IconLoader2 size={14} className="animate-spin" />
                <span className="text-xs">{currentConfig.label}</span>
              </div>
            )}

            {/* Step count badge */}
            {!isLoading && steps.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {steps.length} etape{steps.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className={cn(
              'mt-1 rounded-lg border border-border/50 overflow-hidden',
              'bg-gradient-to-b from-muted/20 to-transparent'
            )}
          >
            {/* Phase progress bar */}
            <ThinkingProgressBar steps={steps} isLoading={isLoading} />

            {/* Steps list */}
            <div className="divide-y divide-border/30">
              {steps.map((step, index) => (
                <ThinkingStepItem
                  key={step.id}
                  step={step}
                  isLatest={isLoading && index === steps.length - 1}
                />
              ))}
              {isLoading && <ThinkingLoader />}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Progress bar showing which phases have been completed
 */
function ThinkingProgressBar({
  steps,
  isLoading,
}: {
  steps: ThinkingStep[];
  isLoading: boolean;
}) {
  const phases: ThinkingPhase[] = [
    'routing',
    'gathering',
    'deliberating',
    'validating',
    'responding',
  ];

  // Find which phases have been started
  const completedPhases = new Set(steps.map((s) => s.phase));
  const currentPhase = steps.length > 0 ? steps[steps.length - 1].phase : null;

  return (
    <div className="flex items-center px-3 py-2 border-b border-border/30 bg-muted/10">
      {phases.map((phase, index) => {
        const config = phaseConfig[phase];
        const Icon = config.icon;
        const isCompleted = completedPhases.has(phase);
        const isCurrent = phase === currentPhase && isLoading;

        return (
          <div key={phase} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors',
                isCompleted && !isCurrent && 'text-foreground/70',
                isCurrent && cn(config.color, 'bg-muted'),
                !isCompleted && 'text-muted-foreground/40'
              )}
            >
              <Icon size={12} className={cn(isCurrent && 'animate-pulse')} />
              <span className="hidden sm:inline">{config.label}</span>
            </div>
            {index < phases.length - 1 && (
              <div
                className={cn(
                  'w-4 h-px mx-1',
                  isCompleted ? 'bg-border' : 'bg-border/30'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact inline thinking indicator (for streaming)
 */
export function ThinkingIndicator({
  phase,
  className,
}: {
  phase?: ThinkingPhase;
  className?: string;
}) {
  const config = phase ? phaseConfig[phase] : phaseConfig.routing;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-muted/50 text-sm text-muted-foreground',
        className
      )}
    >
      <IconBrain size={14} className="text-muted-foreground" />
      <span>YGGDRASIL</span>
      <div className={cn('flex items-center gap-1', config.color)}>
        <Icon size={14} className="animate-pulse" />
        <span>{config.label}...</span>
      </div>
    </div>
  );
}

/**
 * Export for use as streaming thinking block
 */
export function StreamingThinkingBlock({
  steps,
  className,
}: {
  steps: ThinkingStep[];
  className?: string;
}) {
  return (
    <ThinkingBlock
      steps={steps}
      isLoading={true}
      defaultOpen={true}
      className={className}
    />
  );
}
