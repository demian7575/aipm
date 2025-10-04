import { MouseEvent, ReactNode, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Edge, MarkerType, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { AcceptanceTestDraft, MergeRequestRoot, UserStoryNode } from '../types/mindmap';

interface MindmapTreeProps {
  mergeRequest: MergeRequestRoot;
  onSelectStory: (story: UserStoryNode) => void;
  selectedId?: string;
}

interface MindmapNodeData {
  label: ReactNode;
  story?: UserStoryNode;
  entityType: 'mr' | 'story' | 'test';
}

const RADIAL_STEP = 220;

export function MindmapTree({ mergeRequest, onSelectStory, selectedId }: MindmapTreeProps) {
  const { nodes, edges } = useMemo(() => buildGraph(mergeRequest, selectedId), [mergeRequest, selectedId]);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node<MindmapNodeData>) => {
      if (node.data?.story) {
        onSelectStory(node.data.story);
      }
    },
    [onSelectStory],
  );

  const hasStories = mergeRequest.userStories.length > 0;

  return (
    <div className="mindmap-graph" aria-label="Mindmap graph section">
      <h2 className="panel-title">Mindmap Overview</h2>
      {!hasStories ? (
        <p className="panel-empty">No user stories are attached to this merge request yet.</p>
      ) : (
        <div className="mindmap-graph__canvas" aria-label="Mindmap graph view">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
            onNodeClick={handleNodeClick}
          >
            <Background color="rgba(148, 163, 184, 0.45)" gap={48} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}

function buildGraph(mergeRequest: MergeRequestRoot, selectedId: string | undefined) {
  const nodes: Node<MindmapNodeData>[] = [];
  const edges: Edge[] = [];

  const rootId = `mr-${mergeRequest.id}`;
  nodes.push({
    id: rootId,
    data: {
      label: (
        <div className="mindmap-node__label">
          <span className="mindmap-node__eyebrow">Merge Request</span>
          <strong>{mergeRequest.title}</strong>
        </div>
      ),
      entityType: 'mr',
    },
    position: { x: 0, y: 0 },
    draggable: false,
    selectable: false,
    className: 'mindmap-node mindmap-node--mr',
    style: getNodeStyle('mr', mergeRequest.status, false),
  });

  if (mergeRequest.userStories.length === 0) {
    return { nodes, edges };
  }

  const totalWeight = mergeRequest.userStories.reduce((sum, story) => sum + getStoryWeight(story), 0);
  let angleCursor = 0;
  mergeRequest.userStories.forEach((story) => {
    const weight = getStoryWeight(story);
    const span = (weight / totalWeight) * Math.PI * 2;
    assignStory(story, 1, angleCursor, angleCursor + span, rootId, selectedId, nodes, edges);
    angleCursor += span;
  });

  return { nodes, edges };
}

function assignStory(
  story: UserStoryNode,
  depth: number,
  startAngle: number,
  endAngle: number,
  parentId: string,
  selectedId: string | undefined,
  nodes: Node<MindmapNodeData>[],
  edges: Edge[],
) {
  const angle = (startAngle + endAngle) / 2;
  const { x, y } = polarToCartesian(angle, depth * RADIAL_STEP);

  nodes.push({
    id: story.id,
    data: {
      label: (
        <div className="mindmap-node__label">
          <strong>{story.title}</strong>
          <span className="mindmap-node__meta">{story.acceptanceTests.length} acceptance tests</span>
        </div>
      ),
      story,
      entityType: 'story',
    },
    position: { x, y },
    draggable: false,
    selectable: false,
    className: getNodeClassName('story', story.id === selectedId),
    style: getNodeStyle('story', story.status, story.id === selectedId),
  });

  edges.push({
    id: `${parentId}->${story.id}`,
    source: parentId,
    target: story.id,
    type: 'smoothstep',
    animated: story.status === 'in-progress',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
  });

  const childEntities: Array<{ kind: 'story'; node: UserStoryNode; weight: number } | { kind: 'test'; node: AcceptanceTestDraft; weight: number }> = [
    ...story.children.map((child) => ({ kind: 'story' as const, node: child, weight: getStoryWeight(child) })),
    ...story.acceptanceTests.map((test) => ({ kind: 'test' as const, node: test, weight: 1 })),
  ];

  if (childEntities.length === 0) {
    return;
  }

  const totalChildWeight = childEntities.reduce((sum, entity) => sum + entity.weight, 0);
  let cursor = startAngle;

  childEntities.forEach((entity) => {
    const portion = (entity.weight / totalChildWeight) * (endAngle - startAngle);
    const segmentStart = cursor;
    const segmentEnd = cursor + portion;
    cursor = segmentEnd;

    if (entity.kind === 'story') {
      assignStory(entity.node, depth + 1, segmentStart, segmentEnd, story.id, selectedId, nodes, edges);
    } else {
      assignAcceptanceTest(entity.node, depth + 1, segmentStart, segmentEnd, story.id, nodes, edges);
    }
  });
}

function assignAcceptanceTest(
  test: AcceptanceTestDraft,
  depth: number,
  startAngle: number,
  endAngle: number,
  parentId: string,
  nodes: Node<MindmapNodeData>[],
  edges: Edge[],
) {
  const angle = (startAngle + endAngle) / 2;
  const { x, y } = polarToCartesian(angle, depth * RADIAL_STEP);
  const id = `test-${test.id}`;

  nodes.push({
    id,
    data: {
      label: (
        <div className="mindmap-node__label">
          <strong>{test.name}</strong>
          <span className="mindmap-node__meta">{formatTestStatus(test.status)}</span>
        </div>
      ),
      entityType: 'test',
    },
    position: { x, y },
    draggable: false,
    selectable: false,
    className: 'mindmap-node mindmap-node--test',
    style: getNodeStyle('test', test.status, false),
  });

  edges.push({
    id: `${parentId}->${id}`,
    source: parentId,
    target: id,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
  });
}

function polarToCartesian(angle: number, radius: number) {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function getStoryWeight(story: UserStoryNode): number {
  const childWeight = story.children.reduce((sum, child) => sum + getStoryWeight(child), 0);
  const acceptanceWeight = story.acceptanceTests.length || 1;
  return childWeight + acceptanceWeight;
}

function getNodeClassName(type: 'story' | 'test', isSelected: boolean) {
  return `mindmap-node mindmap-node--${type}${isSelected ? ' mindmap-node--selected' : ''}`;
}

function getNodeStyle(type: 'mr' | 'story' | 'test', status: string, isSelected: boolean) {
  const palette = {
    mr: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#f8fafc' },
    story: { background: '#ffffff', color: '#0f172a' },
    test: { background: '#f0f9ff', color: '#0c4a6e' },
  } as const;

  const accent = getStatusAccent(type, status);
  const borderColor = isSelected ? accent.active : accent.border;
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.18)' : accent.shadow;

  return {
    border: `2px solid ${borderColor}`,
    background: palette[type].background,
    color: palette[type].color,
    boxShadow: `0 12px 30px ${shadowColor}`,
    fontSize: type === 'test' ? '0.85rem' : '1rem',
    padding: type === 'test' ? '0.5rem 0.9rem' : '0.65rem 1.1rem',
    borderRadius: '999px',
    minWidth: type === 'mr' ? 220 : 200,
    textAlign: 'center' as const,
    cursor: type === 'story' ? 'pointer' : 'default',
  };
}

function getStatusAccent(type: 'mr' | 'story' | 'test', status: string) {
  if (type === 'story') {
    switch (status) {
      case 'done':
        return { border: '#22c55e', active: '#15803d', shadow: 'rgba(34, 197, 94, 0.18)' };
      case 'ready-for-test':
        return { border: '#0ea5e9', active: '#0369a1', shadow: 'rgba(14, 165, 233, 0.2)' };
      case 'in-progress':
        return { border: '#f97316', active: '#c2410c', shadow: 'rgba(249, 115, 22, 0.18)' };
      default:
        return { border: '#6366f1', active: '#4338ca', shadow: 'rgba(99, 102, 241, 0.18)' };
    }
  }

  if (type === 'test') {
    switch (status) {
      case 'passed':
        return { border: '#22c55e', active: '#15803d', shadow: 'rgba(34, 197, 94, 0.18)' };
      case 'blocked':
        return { border: '#ef4444', active: '#b91c1c', shadow: 'rgba(239, 68, 68, 0.18)' };
      case 'in-review':
        return { border: '#a855f7', active: '#7c3aed', shadow: 'rgba(168, 85, 247, 0.18)' };
      case 'ready':
        return { border: '#0ea5e9', active: '#0369a1', shadow: 'rgba(14, 165, 233, 0.18)' };
      default:
        return { border: '#94a3b8', active: '#475569', shadow: 'rgba(148, 163, 184, 0.18)' };
    }
  }

  return { border: '#4338ca', active: '#312e81', shadow: 'rgba(99, 102, 241, 0.18)' };
}

function formatTestStatus(status: AcceptanceTestDraft['status']) {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'blocked':
      return 'Blocked';
    case 'in-review':
      return 'In review';
    case 'ready':
      return 'Ready for execution';
    default:
      return 'Draft';
  }
}
