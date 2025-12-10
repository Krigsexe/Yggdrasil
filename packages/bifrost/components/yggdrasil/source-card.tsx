/**
 * SourceCard Component
 *
 * Displays a source used to anchor a YGGDRASIL response.
 * Uses Bifrost Card, Badge, and Tooltip components.
 */

'use client';

import { cn } from '@/lib/utils';
import {
  IconArticle,
  IconTestPipe,
  IconCertificate,
  IconFileCode,
  IconDatabase,
  IconWorld,
  IconBook,
  IconNews,
  IconExternalLink,
  IconCheck,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { Source, SourceType, EpistemicBranch } from '@/lib/yggdrasil/types';

interface SourceCardProps {
  source: Source;
  className?: string;
  compact?: boolean;
}

const sourceTypeConfig: Record<
  SourceType,
  { label: string; icon: typeof IconArticle; color: string }
> = {
  arxiv: {
    label: 'arXiv',
    icon: IconArticle,
    color: 'text-red-500',
  },
  pubmed: {
    label: 'PubMed',
    icon: IconTestPipe,
    color: 'text-blue-500',
  },
  iso: {
    label: 'ISO',
    icon: IconCertificate,
    color: 'text-purple-500',
  },
  rfc: {
    label: 'RFC',
    icon: IconFileCode,
    color: 'text-orange-500',
  },
  wikidata: {
    label: 'Wikidata',
    icon: IconDatabase,
    color: 'text-green-500',
  },
  web: {
    label: 'Web',
    icon: IconWorld,
    color: 'text-slate-500',
  },
  book: {
    label: 'Book',
    icon: IconBook,
    color: 'text-amber-500',
  },
  journal: {
    label: 'Journal',
    icon: IconNews,
    color: 'text-cyan-500',
  },
  other: {
    label: 'Source',
    icon: IconArticle,
    color: 'text-slate-400',
  },
};

const branchColors: Record<EpistemicBranch, string> = {
  MIMIR: 'border-l-emerald-500',
  VOLVA: 'border-l-amber-500',
  HUGIN: 'border-l-red-500',
};

export function SourceCard({ source, className, compact = false }: SourceCardProps) {
  const config = sourceTypeConfig[source.type] || sourceTypeConfig.other;
  const Icon = config.icon;
  const branchColor = branchColors[source.branch];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
                'bg-secondary/50 hover:bg-secondary text-xs',
                'transition-colors group',
                className
              )}
            >
              <Icon size={12} className={config.color} />
              <span className="truncate max-w-[150px]">{source.title}</span>
              <IconExternalLink
                size={10}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">{source.title}</div>
              <div className="text-xs text-muted-foreground">
                {config.label} - {source.identifier}
              </div>
              <div className="text-xs">Trust: {source.trustScore}%</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn('border-l-4', branchColor, className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg bg-secondary',
              config.color
            )}
          >
            <Icon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
              {source.trustScore >= 90 && (
                <Badge variant="default" className="text-xs bg-emerald-500 gap-1">
                  <IconCheck size={10} />
                  Verified
                </Badge>
              )}
            </div>

            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block mt-1"
            >
              <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {source.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <span className="truncate max-w-[200px]">{source.identifier}</span>
                <IconExternalLink
                  size={12}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                />
              </div>
            </a>

            {source.authors && source.authors.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {source.authors.slice(0, 3).join(', ')}
                {source.authors.length > 3 && ` +${source.authors.length - 3} more`}
              </p>
            )}
          </div>

          <div className="text-right">
            <Badge
              variant={
                source.trustScore >= 90
                  ? 'default'
                  : source.trustScore >= 50
                    ? 'secondary'
                    : 'destructive'
              }
              className="font-mono"
            >
              {source.trustScore}%
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-1">trust</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * SourceList - Display multiple sources
 */
export function SourceList({
  sources,
  className,
  maxVisible = 3,
  compact = false,
}: {
  sources: Source[];
  className?: string;
  maxVisible?: number;
  compact?: boolean;
}) {
  if (sources.length === 0) {
    return null;
  }

  const visibleSources = sources.slice(0, maxVisible);
  const hiddenCount = sources.length - maxVisible;

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {visibleSources.map((source, index) => (
          <SourceCard key={`${source.identifier}-${index}`} source={source} compact />
        ))}
        {hiddenCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{hiddenCount} more
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <IconArticle size={14} />
        Sources ({sources.length})
      </div>
      <div className="space-y-2">
        {visibleSources.map((source, index) => (
          <SourceCard key={`${source.identifier}-${index}`} source={source} />
        ))}
      </div>
      {hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="text-xs">
          Show {hiddenCount} more sources
        </Button>
      )}
    </div>
  );
}
