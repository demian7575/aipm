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
import { MindmapNode, type MindmapNodeData } from './MindmapNode';

interface MindmapCanvasProps {
  nodes: Node<MindmapNodeData>[];
  edges: Edge[];
  onNodeSelect: (id: string) => void;
  selectedNodeId: string | null;
  onToggleStoryChildren: (storyId: string) => void;
  onToggleAcceptanceTests: (storyId: string) => void;
}

const nodeTypes = { mindmap: MindmapNode };

export function MindmapCanvas({
  nodes,
  edges,
  onNodeSelect,
  selectedNodeId,
  onToggleStoryChildren,
  onToggleAcceptanceTests
}: MindmapCanvasProps) {
  const decoratedNodes = useMemo(
    () => attachNodeInteractions(nodes, onToggleStoryChildren, onToggleAcceptanceTests),
    [nodes, onToggleStoryChildren, onToggleAcceptanceTests]
  );

  const [internalNodes, setNodes, onNodesChange] = useNodesState(decoratedNodes);
  const [internalEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => {
    setNodes((prev) => mergeNodes(prev, decoratedNodes));
    setEdges(edges);
  }, [decoratedNodes, edges, setNodes, setEdges]);

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

function mergeNodes(
  previous: Node<MindmapNodeData>[],
  next: Node<MindmapNodeData>[]
): Node<MindmapNodeData>[] {
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

function attachNodeInteractions(
  nodes: Node<MindmapNodeData>[],
  onToggleStoryChildren: (storyId: string) => void,
  onToggleAcceptanceTests: (storyId: string) => void
): Node<MindmapNodeData>[] {
  return nodes.map((node) => {
    if (node.type !== 'mindmap') {
      return node;
    }

    const data = node.data;
    if (!data || data.kind !== 'story') {
      return node;
    }

    const toggleStoryChildren =
      data.controls && data.controls.storyChildCount > 0
        ? () => onToggleStoryChildren(data.referenceId)
        : undefined;
    const toggleAcceptance =
      data.controls && data.controls.acceptanceCount > 0
        ? () => onToggleAcceptanceTests(data.referenceId)
        : undefined;

    if (!toggleStoryChildren && !toggleAcceptance) {
      return node;
    }

    return {
      ...node,
      data: {
        ...data,
        onToggleChildStories: toggleStoryChildren,
        onToggleAcceptance: toggleAcceptance
      }
    };
  });
}
