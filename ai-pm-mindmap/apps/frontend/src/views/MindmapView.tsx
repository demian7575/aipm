import { hierarchy, tree as radialTree } from 'd3-hierarchy';
import { useMemo } from 'react';
import { StoryNode } from '../utils/api';
import clsx from 'clsx';

interface MindmapViewProps {
  treeData: StoryNode[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

interface MindmapNode {
  id: string;
  title: string;
  x: number;
  y: number;
  depth: number;
}

const MindmapView = ({ treeData, onSelect, selectedId }: MindmapViewProps) => {
  const nodes = useMemo(() => {
    if (treeData.length === 0) return [] as MindmapNode[];
    const root = hierarchy({ id: 'root', title: 'root', children: treeData } as any)
      .sum(() => 1)
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
    const layout = radialTree<any>().size([2 * Math.PI, 200]);
    layout(root);
    const mapped: MindmapNode[] = [];
    root.descendants().forEach((node) => {
      if (!node.data || node.data.id === 'root') return;
      const radius = node.y;
      const angle = node.x;
      const x = radius * Math.cos(angle - Math.PI / 2);
      const y = radius * Math.sin(angle - Math.PI / 2);
      mapped.push({
        id: node.data.id,
        title: node.data.title,
        x,
        y,
        depth: node.depth - 1,
      });
    });
    return mapped;
  }, [treeData]);

  const edges = useMemo(() => {
    if (treeData.length === 0) return [] as { from: MindmapNode; to: MindmapNode }[];
    const root = hierarchy({ id: 'root', title: 'root', children: treeData } as any)
      .sum(() => 1)
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
    const layout = radialTree<any>().size([2 * Math.PI, 200]);
    layout(root);
    const nodeLookup = new Map<string, { x: number; y: number; id: string }>();
    root.descendants().forEach((node) => {
      if (!node.data.id) return;
      const radius = node.y;
      const angle = node.x;
      const x = radius * Math.cos(angle - Math.PI / 2);
      const y = radius * Math.sin(angle - Math.PI / 2);
      nodeLookup.set(node.data.id, { id: node.data.id, x, y });
    });
    const connections: { from: MindmapNode; to: MindmapNode }[] = [];
    root.links().forEach((link) => {
      if (!link.source.data.id || !link.target.data.id) return;
      const source = nodeLookup.get(link.source.data.id);
      const target = nodeLookup.get(link.target.data.id);
      if (!source || !target) return;
      connections.push({
        from: { id: source.id, title: '', x: source.x, y: source.y, depth: 0 },
        to: { id: target.id, title: '', x: target.x, y: target.y, depth: 0 },
      });
    });
    return connections;
  }, [treeData]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded border border-slate-700/60 bg-slate-900">
      <svg className="h-full w-full" viewBox="-240 -240 480 480" role="presentation">
        <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth={1} fill="none">
          {edges.map((edge) => (
            <line
              key={`${edge.from.id}-${edge.to.id}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
            />
          ))}
        </g>
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}>
            <circle
              r={selectedId === node.id ? 18 : 14}
              className={clsx(
                'cursor-pointer transition-colors',
                selectedId === node.id ? 'fill-brand/80' : 'fill-slate-700',
              )}
              onClick={() => onSelect(node.id)}
            />
            <text
              textAnchor="middle"
              fill="white"
              fontSize={10}
              dy={selectedId === node.id ? 28 : 24}
            >
              {node.title.length > 20 ? `${node.title.slice(0, 20)}…` : node.title}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default MindmapView;
