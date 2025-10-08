import { cluster, hierarchy } from 'd3-hierarchy';
import type { RollupResult } from '@ai-pm/shared';
import type { LayoutMessage, LayoutResponse } from './layout-types.js';

type WorkerContext = (typeof globalThis) & { postMessage: (message: LayoutResponse) => void };

const ctx = self as unknown as WorkerContext;

const layout = cluster<RollupResult>().size([Math.PI * 2, 400]);

function toHierarchy(tree: RollupResult[]) {
  return hierarchy({ storyId: 'root', status: 'Root', children: tree } as RollupResult, (node) => node.children);
}

self.onmessage = (event: MessageEvent<LayoutMessage>) => {
  const root = toHierarchy(event.data.tree);
  const computed = layout(root);
  const nodes: LayoutResponse['nodes'] = [];
  const edges: LayoutResponse['edges'] = [];

  computed.each((node) => {
    if (!node.data.storyId || node.data.storyId === 'root') return;
    const angle = node.x;
    const radius = node.y;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    nodes.push({
      id: node.data.storyId,
      position: { x, y },
      data: { label: node.data.storyId, status: node.data.status }
    });
    if (node.parent && node.parent.data.storyId && node.parent.data.storyId !== 'root') {
      edges.push({ id: `${node.parent.data.storyId}-${node.data.storyId}`, source: node.parent.data.storyId, target: node.data.storyId });
    }
  });

  ctx.postMessage({ nodes, edges });
};
