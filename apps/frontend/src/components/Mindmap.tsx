import { useMemo } from 'react';
import clsx from 'clsx';
import * as d3 from 'd3';
import type { StoryTreeNode } from '@ai-pm/shared/types';
import { useStoriesStore } from '../store/useStoriesStore';

interface MindmapProps {
  nodes: StoryTreeNode[];
  onSelect: (id: string) => void;
  className?: string;
  hidden?: boolean;
}

export default function Mindmap({ nodes, onSelect, className, hidden }: MindmapProps) {
  const selectedId = useStoriesStore((state) => state.selectedStoryId);
  const treeData = useMemo(() => buildHierarchy(nodes), [nodes]);

  if (!treeData) {
    return <div className={clsx('mindmap', className)} aria-label="Mindmap" role="tree" aria-hidden={hidden} />;
  }

  const root = d3.hierarchy(treeData);
  const treeLayout = d3.tree<any>().size([2 * Math.PI, 250]);
  const layout = treeLayout(root);
  const links = layout.links();
  const nodesFlat = layout.descendants();

  return (
    <svg
      className={clsx('mindmap', className)}
      viewBox="-300 -300 600 600"
      role="tree"
      aria-hidden={hidden}
    >
      <g>
        {links.map((link, index) => {
          const path = d3.linkRadial<any, any>()({
            source: [link.source.x, link.source.y],
            target: [link.target.x, link.target.y]
          });
          return <path key={index} d={path ?? ''} stroke="#d1d5db" fill="none" strokeWidth={1.5} />;
        })}
      </g>
      <g>
        {nodesFlat.map((node) => {
          const angle = node.x - Math.PI / 2;
          const radius = node.y;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <g
              key={node.data.id}
              transform={`translate(${x}, ${y})`}
              onClick={() => onSelect(node.data.id)}
              role="treeitem"
              tabIndex={0}
            >
              <circle r={selectedId === node.data.id ? 18 : 12} fill={selectedId === node.data.id ? '#2563eb' : '#4f46e5'} />
              <text
                dy="0.35em"
                x={Math.cos(angle) >= 0 ? 16 : -16}
                textAnchor={Math.cos(angle) >= 0 ? 'start' : 'end'}
                fill="#111827"
                fontSize={12}
              >
                {node.data.title}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function buildHierarchy(nodes: StoryTreeNode[]): { id: string; title: string; children?: any[] } | null {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) {
    return mapNode(nodes[0]);
  }
  return {
    id: 'root',
    title: 'root',
    children: nodes.map(mapNode)
  };
}

function mapNode(node: StoryTreeNode): any {
  return {
    id: node.story.id,
    title: node.story.title,
    children: node.children.map(mapNode)
  };
}
