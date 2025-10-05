import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MarkerType,
  Node,
  NodeProps,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { AcceptanceTestDraft, MergeRequestRoot, UserStoryNode } from '../types/mindmap';

interface MindmapTreeProps {
  mergeRequest: MergeRequestRoot;
  onSelectStory: (story: UserStoryNode) => void;
  selectedId?: string;
}

interface MindmapNodeData {
  eyebrow: string;
  title: string;
  meta?: string;
  badge: string;
  badgeTone: string;
  entity: 'mr' | 'story' | 'test';
  story?: UserStoryNode;
  isSelected?: boolean;
}

const nodeTypes = { mindmap: MindmapNode };
const HORIZONTAL_GAP = 240;
const VERTICAL_GAP = 140;
const TEST_HORIZONTAL_GAP = 140;
const TEST_VERTICAL_GAP = 90;

export function MindmapTree({ mergeRequest, onSelectStory, selectedId }: MindmapTreeProps) {
  const storedPositions = useRef(new Map<string, { x: number; y: number }>());

  const graph = useMemo(
    () => buildGraph(mergeRequest, selectedId, storedPositions.current),
    [mergeRequest, selectedId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges] = useEdgesState(graph.edges);

  useEffect(() => {
    const nextPositions = new Map(storedPositions.current);
    for (const node of graph.nodes) {
      nextPositions.set(node.id, node.position);
    }
    for (const key of Array.from(nextPositions.keys())) {
      if (!graph.nodes.some((node) => node.id === key)) {
        nextPositions.delete(key);
      }
    }
    storedPositions.current = nextPositions;
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node<MindmapNodeData>) => {
      if (node.data?.story) {
        onSelectStory(node.data.story);
      }
    },
    [onSelectStory],
  );

  const handleNodeDragStop = useCallback((_: unknown, node: Node<MindmapNodeData>) => {
    storedPositions.current.set(node.id, node.position);
  }, []);

  const hasStories = mergeRequest.userStories.length > 0;

  return (
    <section className="panel mindmap" aria-label="Mindmap panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Mindmap</h2>
          <p className="panel-subtitle">Drag nodes to reorganize user stories and acceptance tests.</p>
        </div>
      </div>
      {!hasStories ? (
        <p className="panel-empty">No user stories are attached to this merge request yet.</p>
      ) : (
        <div className="mindmap__canvas" aria-label="Interactive mindmap canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesConnectable={false}
            panOnScroll
            zoomOnScroll
            onNodeClick={handleNodeClick}
            onNodesChange={onNodesChange}
            onNodeDragStop={handleNodeDragStop}
            nodesDraggable
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(148, 163, 184, 0.4)" gap={48} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        </div>
      )}
    </section>
  );
}

function MindmapNode({ data }: NodeProps<MindmapNodeData>) {
  const selectionClass = data.isSelected ? ' mindmap-node--selected' : '';
  return (
    <div className={`mindmap-node mindmap-node--${data.entity} mindmap-node--${data.badgeTone}${selectionClass}`}>
      <span className="mindmap-node__eyebrow">{data.eyebrow}</span>
      <strong className="mindmap-node__title">{data.title}</strong>
      {data.meta && <span className="mindmap-node__meta">{data.meta}</span>}
      <span className="mindmap-node__badge">{data.badge}</span>
    </div>
  );
}

function buildGraph(
  mergeRequest: MergeRequestRoot,
  selectedId: string | undefined,
  cachedPositions: Map<string, { x: number; y: number }>,
) {
  const nodes: Node<MindmapNodeData>[] = [];
  const edges: Edge[] = [];

  const rootId = `mr:${mergeRequest.id}`;
  const rootPosition = cachedPositions.get(rootId) ?? { x: 0, y: 0 };

  nodes.push({
    id: rootId,
    type: 'mindmap',
    position: rootPosition,
    data: {
      eyebrow: 'Merge Request',
      title: mergeRequest.title,
      meta: mergeRequest.description ? summarise(mergeRequest.description) : undefined,
      badge: mergeRequest.status,
      badgeTone: toneFromStatus(mergeRequest.status),
      entity: 'mr',
    },
    draggable: true,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const stories = mergeRequest.userStories;
  const midpoint = Math.ceil(stories.length / 2);
  const rightBranch = stories.slice(0, midpoint);
  const leftBranch = stories.slice(midpoint);

  layoutStoryBranch({
    branch: rightBranch,
    direction: 1,
    parentId: rootId,
    parentPosition: rootPosition,
    selectedId,
    nodes,
    edges,
    cache: cachedPositions,
  });

  layoutStoryBranch({
    branch: leftBranch,
    direction: -1,
    parentId: rootId,
    parentPosition: rootPosition,
    selectedId,
    nodes,
    edges,
    cache: cachedPositions,
  });

  return { nodes, edges };
}

interface StoryBranchContext {
  branch: UserStoryNode[];
  direction: 1 | -1;
  parentId: string;
  parentPosition: { x: number; y: number };
  selectedId: string | undefined;
  nodes: Node<MindmapNodeData>[];
  edges: Edge[];
  cache: Map<string, { x: number; y: number }>;
}

function layoutStoryBranch(context: StoryBranchContext) {
  const { branch, direction, parentId, parentPosition, selectedId, nodes, edges, cache } = context;
  const count = branch.length;

  branch.forEach((story, index) => {
    const yOffset = (index - (count - 1) / 2) * VERTICAL_GAP;
    const defaultPosition = {
      x: parentPosition.x + direction * HORIZONTAL_GAP,
      y: parentPosition.y + yOffset,
    };

    const position = cache.get(story.id) ?? defaultPosition;

    nodes.push({
      id: story.id,
      type: 'mindmap',
      position,
      data: {
        eyebrow: story.parentId ? 'Child Story' : 'User Story',
        title: story.title,
        meta: `${story.acceptanceTests.length} acceptance test${story.acceptanceTests.length === 1 ? '' : 's'}`,
        badge: story.status,
        badgeTone: toneFromStatus(story.status),
        entity: 'story',
        story,
        isSelected: story.id === selectedId,
      },
      draggable: true,
      sourcePosition: direction === 1 ? Position.Right : Position.Left,
      targetPosition: direction === 1 ? Position.Left : Position.Right,
    });

    edges.push({
      id: `${parentId}->${story.id}`,
      source: parentId,
      target: story.id,
      type: 'smoothstep',
      animated: story.status === 'in-progress',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#4338ca' },
    });

    layoutAcceptanceTests({
      tests: story.acceptanceTests,
      direction,
      parentId: story.id,
      parentPosition: position,
      nodes,
      edges,
      cache,
    });

    if (story.children.length > 0) {
      layoutStoryBranch({
        branch: story.children,
        direction,
        parentId: story.id,
        parentPosition: position,
        selectedId,
        nodes,
        edges,
        cache,
      });
    }
  });
}

interface AcceptanceTestContext {
  tests: AcceptanceTestDraft[];
  direction: 1 | -1;
  parentId: string;
  parentPosition: { x: number; y: number };
  nodes: Node<MindmapNodeData>[];
  edges: Edge[];
  cache: Map<string, { x: number; y: number }>;
}

function layoutAcceptanceTests(context: AcceptanceTestContext) {
  const { tests, direction, parentId, parentPosition, nodes, edges, cache } = context;
  const count = tests.length;

  tests.forEach((test, index) => {
    const nodeId = `test:${test.id}`;
    const yOffset = (index - (count - 1) / 2) * TEST_VERTICAL_GAP;
    const defaultPosition = {
      x: parentPosition.x + direction * TEST_HORIZONTAL_GAP,
      y: parentPosition.y + yOffset,
    };
    const position = cache.get(nodeId) ?? defaultPosition;

    nodes.push({
      id: nodeId,
      type: 'mindmap',
      position,
      data: {
        eyebrow: 'Acceptance Test',
        title: test.name,
        meta: `Given ${summarise(test.given)} · When ${summarise(test.when)} · Then ${summarise(test.then)}`,
        badge: test.status,
        badgeTone: toneFromStatus(test.status),
        entity: 'test',
      },
      draggable: true,
      sourcePosition: direction === 1 ? Position.Right : Position.Left,
      targetPosition: direction === 1 ? Position.Left : Position.Right,
    });

    edges.push({
      id: `${parentId}->${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    });
  });
}

function toneFromStatus(status: string) {
  const token = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (token.includes('pass') || token.includes('complete')) {
    return 'positive';
  }
  if (token.includes('progress') || token.includes('ready')) {
    return 'warning';
  }
  if (token.includes('block') || token.includes('fail')) {
    return 'negative';
  }
  return 'neutral';
}

function summarise(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 42) {
    return trimmed;
  }
  return `${trimmed.slice(0, 39)}…`;
}
