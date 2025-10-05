import { useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnNodesChange,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import './MindmapCanvas.css';
import { MindmapNode } from './MindmapNode';

interface MindmapCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect: (id: string) => void;
  selectedNodeId: string | null;
}

const nodeTypes = { mindmap: MindmapNode };

export function MindmapCanvas({ nodes, edges, onNodeSelect, selectedNodeId }: MindmapCanvasProps) {
  const [internalNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [internalEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setNodes((prev) => mergeNodes(prev, nodes));
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId
      }))
    );
  }, [selectedNodeId, setNodes]);

  const onNodeClick = useMemo(
    () =>
      function handleNodeClick(_: unknown, node: Node) {
        onNodeSelect(node.id);
      },
    [onNodeSelect]
  );

  return (
    <section className="mindmap-canvas" aria-label="AI planning mindmap">
      <ReactFlow
        nodes={internalNodes}
        edges={internalEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange as OnNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        nodesDraggable
        panOnDrag={true}
      >
        <MiniMap zoomable pannable />
        <Controls showInteractive={false} />
        <Background color="#1e293b" gap={32} />
      </ReactFlow>
    </section>
  );
}

function mergeNodes(previous: Node[], next: Node[]): Node[] {
  return next.map((node) => {
    const existing = previous.find((prev) => prev.id === node.id);
    if (!existing) {
      return node;
    }
    return {
      ...node,
      position: existing.position,
      positionAbsolute: existing.positionAbsolute,
      dragging: false,
      selected: existing.selected ?? node.selected
    };
  });
}
