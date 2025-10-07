import { useMemo } from 'react';
import type { TreeNode } from '../store/useStoryStore';

interface MindmapViewProps {
  tree: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface PositionedNode extends TreeNode {
  x: number;
  y: number;
}

export function MindmapView({ tree, selectedId, onSelect }: MindmapViewProps) {
  const nodes = useMemo(() => layout(tree), [tree]);

  return (
    <div className="mindmap-canvas" role="presentation">
      {nodes.map((node) => (
        <div
          key={node.id}
          className={`mindmap-node ${selectedId === node.id ? 'selected' : ''}`}
          style={{
            left: `${node.x * 50 + 50}%`,
            top: `${node.y * 50 + 50}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={() => onSelect(node.id)}
        >
          <div style={{ fontWeight: 600 }}>{node.title}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{node.status}</div>
        </div>
      ))}
    </div>
  );
}

function layout(tree: TreeNode[]): PositionedNode[] {
  const positioned: PositionedNode[] = [];
  const radiusStep = 0.3;

  function traverse(nodes: TreeNode[], depth: number, startAngle: number, endAngle: number) {
    const span = endAngle - startAngle;
    nodes.forEach((node, index) => {
      const angle = startAngle + (span / Math.max(nodes.length, 1)) * (index + 0.5);
      const radius = depth * radiusStep;
      positioned.push({
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        children: node.children
      });
      if (node.children.length > 0) {
        traverse(node.children, depth + 1, angle - span / nodes.length / 2, angle + span / nodes.length / 2);
      }
    });
  }

  if (tree.length === 0) {
    return positioned;
  }

  positioned.push({
    ...tree[0],
    x: 0,
    y: 0,
    children: tree[0].children
  });
  if (tree[0].children.length > 0) {
    traverse(tree[0].children, 1, 0, Math.PI * 2);
  }

  for (let i = 1; i < tree.length; i++) {
    const angle = (Math.PI * 2 * i) / tree.length;
    const radius = 0.4;
    const node = tree[i];
    positioned.push({ ...node, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, children: node.children });
    if (node.children.length > 0) {
      traverse(node.children, 1, angle - Math.PI / tree.length, angle + Math.PI / tree.length);
    }
  }

  return positioned;
}
