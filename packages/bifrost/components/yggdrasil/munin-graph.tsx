/**
 * MuninGraph Component
 *
 * Interactive force-directed graph visualization of MUNIN memory.
 * Shows interactions, decisions, corrections, and checkpoints with
 * their causal relationships.
 *
 * Uses Bifrost Card, Button, and Badge components.
 */

'use client';

import { useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import {
  IconMessage,
  IconGitBranch,
  IconRefresh,
  IconFlag,
  IconZoomIn,
  IconZoomOut,
  IconFocus,
  IconX,
} from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MemoryGraph, MemoryNode, MemoryEdge } from '@/lib/yggdrasil/types';

// Dynamic import to avoid SSR issues with react-force-graph
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  ),
});

interface MuninGraphProps {
  graph: MemoryGraph;
  className?: string;
  height?: number;
  onNodeClick?: (node: MemoryNode) => void;
}

interface GraphNode extends MemoryNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: MemoryEdge['type'];
}

const nodeTypeConfig = {
  interaction: {
    color: '#3b82f6', // blue
    icon: IconMessage,
    label: 'Interaction',
  },
  decision: {
    color: '#8b5cf6', // purple
    icon: IconGitBranch,
    label: 'Decision',
  },
  correction: {
    color: '#f59e0b', // amber
    icon: IconRefresh,
    label: 'Correction',
  },
  checkpoint: {
    color: '#10b981', // emerald
    icon: IconFlag,
    label: 'Checkpoint',
  },
};

const edgeTypeConfig = {
  derives_from: { color: '#6366f1', label: 'Derives from' },
  references: { color: '#06b6d4', label: 'References' },
  invalidates: { color: '#ef4444', label: 'Invalidates' },
  supersedes: { color: '#f97316', label: 'Supersedes' },
};

export function MuninGraph({
  graph,
  className,
  height = 400,
  onNodeClick,
}: MuninGraphProps) {
  const fgRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MemoryNode | null>(null);

  // Transform data for react-force-graph
  const graphData = {
    nodes: graph.nodes.map((node) => ({ ...node })) as GraphNode[],
    links: graph.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
    })) as GraphLink[],
  };

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      onNodeClick?.(node);

      // Center on node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 500);
        fgRef.current.zoom(2, 500);
      }
    },
    [onNodeClick]
  );

  const handleZoomIn = useCallback(() => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 1.5, 300);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom / 1.5, 300);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(500, 50);
    }
    setSelectedNode(null);
  }, []);

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const config = nodeTypeConfig[node.type];
      const size = 6 + (node.importance / 100) * 4;
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = config.color;
      ctx.fill();

      // Draw selection/hover ring
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI, false);
        ctx.strokeStyle = isSelected ? '#fff' : config.color;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
      }

      // Draw label on hover/select
      if ((isSelected || isHovered) && globalScale > 1) {
        const label = node.content.slice(0, 30) + (node.content.length > 30 ? '...' : '');
        const fontSize = 10 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#fff';
        ctx.fillText(label, node.x!, node.y! + size + 2);
      }
    },
    [selectedNode, hoveredNode]
  );

  // Custom link rendering
  const linkCanvasObject = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D) => {
      const config = edgeTypeConfig[link.type];
      const source = link.source as GraphNode;
      const target = link.target as GraphNode;

      if (!source.x || !source.y || !target.x || !target.y) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw arrow
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowLength = 6;
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;

      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle - Math.PI / 6),
        midY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - arrowLength * Math.cos(angle + Math.PI / 6),
        midY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = config.color;
      ctx.stroke();
    },
    []
  );

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-0 relative">
        {/* Controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
            title="Zoom in"
          >
            <IconZoomIn size={16} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
            title="Zoom out"
          >
            <IconZoomOut size={16} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
            title="Reset view"
          >
            <IconFocus size={16} />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-2 max-w-[200px]">
          {Object.entries(nodeTypeConfig).map(([type, config]) => (
            <Badge
              key={type}
              variant="secondary"
              className="text-xs gap-1 opacity-80"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              {config.label}
            </Badge>
          ))}
        </div>

      {/* Graph */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={undefined}
        height={height}
        backgroundColor="transparent"
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
        nodeLabel={(node: GraphNode) => `${nodeTypeConfig[node.type].label}: ${node.content.slice(0, 50)}`}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.5}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
      />

        {/* Selected Node Details */}
        {selectedNode && (
          <Card className="absolute top-2 left-2 z-10 max-w-[250px] shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: nodeTypeConfig[selectedNode.type].color }}
                  />
                  <span className="text-sm font-medium">
                    {nodeTypeConfig[selectedNode.type].label}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedNode(null)}
                  className="h-6 w-6"
                >
                  <IconX size={14} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
                {selectedNode.content}
              </p>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedNode.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Importance: {selectedNode.importance}% | Created:{' '}
                {new Date(selectedNode.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Stats summary for the memory graph
 */
export function MuninStats({ graph }: { graph: MemoryGraph }) {
  const stats = {
    total: graph.nodes.length,
    interaction: graph.nodes.filter((n) => n.type === 'interaction').length,
    decision: graph.nodes.filter((n) => n.type === 'decision').length,
    correction: graph.nodes.filter((n) => n.type === 'correction').length,
    checkpoint: graph.nodes.filter((n) => n.type === 'checkpoint').length,
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="text-sm">
        Total: <span className="font-medium ml-1">{stats.total}</span>
      </Badge>
      {Object.entries(nodeTypeConfig).map(([type, config]) => {
        const count = stats[type as keyof typeof stats];
        if (typeof count !== 'number') return null;
        return (
          <Badge
            key={type}
            variant="secondary"
            className="text-sm gap-1"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.label}: <span className="font-medium">{count}</span>
          </Badge>
        );
      })}
    </div>
  );
}
