/**
 * ConfidenceBadge Component
 *
 * Visual indicator for YGGDRASIL epistemic confidence levels.
 * Uses Bifrost Badge and Tooltip components.
 */

'use client';

import { cn } from '@/lib/utils';
import {
  IconCheck,
  IconFlask,
  IconAlertTriangle,
  IconQuestionMark,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EpistemicBranch } from '@/lib/yggdrasil/types';

interface ConfidenceBadgeProps {
  branch: EpistemicBranch;
  confidence: number;
  isVerified: boolean;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const branchConfig = {
  [EpistemicBranch.MIMIR]: {
    label: 'VERIFIED',
    description: 'Validated by MIMIR - 100% confidence with peer-reviewed sources',
    icon: IconCheck,
    variant: 'default' as const,
    colorClass: 'bg-emerald-500 hover:bg-emerald-500/90',
  },
  [EpistemicBranch.VOLVA]: {
    label: 'RESEARCH',
    description: 'From VOLVA - Research-grade with 50-99% confidence',
    icon: IconFlask,
    variant: 'secondary' as const,
    colorClass: 'bg-amber-500 hover:bg-amber-500/90 text-white',
  },
  [EpistemicBranch.HUGIN]: {
    label: 'UNVERIFIED',
    description: 'From HUGIN - Web sources with 0-49% confidence',
    icon: IconAlertTriangle,
    variant: 'destructive' as const,
    colorClass: '',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function ConfidenceBadge({
  branch,
  confidence,
  isVerified,
  className,
  showLabel = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const config = branchConfig[branch];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">{config.label}</div>
      <div className="text-xs text-muted-foreground">{config.description}</div>
      <div className="text-xs">
        Confidence: <span className="font-mono">{confidence}%</span>
      </div>
      {isVerified && (
        <div className="text-xs text-emerald-500 flex items-center gap-1">
          <IconCheck size={12} /> Validated by ODIN
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'gap-1 cursor-default',
              config.colorClass,
              sizeConfig[size],
              className
            )}
          >
            <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
            {showLabel && <span>{config.label}</span>}
            <span className="font-mono opacity-80">{confidence}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple confidence indicator without branch info
 */
export function ConfidenceIndicator({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  let variant: 'default' | 'secondary' | 'destructive' = 'destructive';
  let icon = IconAlertTriangle;

  if (confidence >= 90) {
    variant = 'default';
    icon = IconCheck;
  } else if (confidence >= 50) {
    variant = 'secondary';
    icon = IconFlask;
  }

  const Icon = icon;

  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      <Icon size={12} />
      <span className="font-mono text-xs">{confidence}%</span>
    </Badge>
  );
}

/**
 * "I don't know" badge for null responses
 */
export function UnknownBadge({
  reason,
  className,
}: {
  reason?: string;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('gap-1', className)}>
            <IconQuestionMark size={14} />
            <span>I DON'T KNOW</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold">YGGDRASIL cannot verify this</div>
            <div className="text-xs text-muted-foreground">
              {reason || 'No verified sources found for this query'}
            </div>
            <div className="text-xs text-emerald-500">
              Honesty is a pillar of YGGDRASIL
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
