import { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { LayoutResponse } from '../../workers/layout-types.js';
import { useWorkspaceStore } from '../../state/useWorkspaceStore.js';

const worker = new Worker(new URL('../../workers/layout.worker.ts', import.meta.url), {
  type: 'module'
});

export default function MindmapView() {
  const tree = useWorkspaceStore((state) => state.tree);
  const selectStory = useWorkspaceStore((state) => state.selectStory);
  const selectedStoryId = useWorkspaceStore((state) => state.selectedStoryId);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const handler = (event: MessageEvent<LayoutResponse>) => {
      const mappedNodes = event.data.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: { label: node.data.label, status: node.data.status },
        style: {
          background: node.data.status === 'Approved' ? '#14532d' : '#1e293b',
          color: '#e2e8f0',
          border: selectedStoryId === node.id ? '2px solid #38bdf8' : '1px solid #334155'
        }
      }));
      setNodes(mappedNodes);
      setEdges(event.data.edges.map((edge) => ({ ...edge, type: 'smoothstep' })));
    };
    worker.addEventListener('message', handler);
    return () => worker.removeEventListener('message', handler);
  }, [setNodes, setEdges, selectedStoryId]);

  useEffect(() => {
    worker.postMessage({ tree });
  }, [tree]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        style: {
          ...node.style,
          border: selectedStoryId === node.id ? '2px solid #38bdf8' : '1px solid #334155'
        }
      }))
    );
  }, [selectedStoryId, setNodes]);

  const onNodeClick = (_: unknown, node: { id: string }) => {
    selectStory(node.id);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls />
    </ReactFlow>
  );
}
