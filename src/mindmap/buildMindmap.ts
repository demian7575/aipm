import type { Edge, Node } from 'reactflow';
import type { AppState, AcceptanceTest, MergeRequest, UserStory } from '../state/types';
import type { MindmapNodeData } from '../components/MindmapNode';

interface MindmapTreeNode {
  id: string;
  kind: 'mergeRequest' | 'story' | 'acceptance';
  label: string;
  status: string;
  referenceId: string;
  children: MindmapTreeNode[];
  meta?: {
    hiddenStoryChildren: number;
    hiddenAcceptanceTests: number;
  };
  controls?: {
    storyChildrenCollapsed: boolean;
    storyChildCount: number;
    acceptanceCollapsed: boolean;
    acceptanceCount: number;
  };
}

const RADIUS_STEP = 220;

interface PositionedNode {
  node: MindmapTreeNode;
  depth: number;
  angle: number;
}

export function buildMindmap(state: AppState, mergeRequest: MergeRequest | null): LayoutResult {
  if (!mergeRequest) {
    return { nodes: [], edges: [] };
  }

  const root: MindmapTreeNode = {
    id: `mr-${mergeRequest.id}`,
    kind: 'mergeRequest',
    label: mergeRequest.title,
    status: mergeRequest.status,
    referenceId: mergeRequest.id,
    children: mergeRequest.storyIds
      .map((storyId) => state.userStories[storyId])
      .filter(Boolean)
      .map((story) =>
        buildStoryNode(story, state, state.collapsedStoryChildren, state.collapsedAcceptanceTests)
      )
  };

  const positioned = positionTree(root);
  const nodes = positioned.map((entry) => createFlowNode(entry));
  const edges = collectEdges(root);

  return { nodes, edges };
}

function buildStoryNode(
  story: UserStory,
  state: AppState,
  collapsedStoryChildren: Record<string, boolean>,
  collapsedAcceptanceTests: Record<string, boolean>
): MindmapTreeNode {
  const storyChildrenCollapsed = !!collapsedStoryChildren[story.id];
  const acceptanceCollapsed = !!collapsedAcceptanceTests[story.id];

  const acceptanceChildren = acceptanceCollapsed
    ? []
    : story.acceptanceTestIds
        .map((id) => state.acceptanceTests[id])
        .filter(Boolean)
        .map((test) => createAcceptanceNode(test));

  const storyChildren = storyChildrenCollapsed
    ? []
    : story.childStoryIds
        .map((id) => state.userStories[id])
        .filter(Boolean)
        .map((child) =>
          buildStoryNode(child, state, collapsedStoryChildren, collapsedAcceptanceTests)
        );

  return {
    id: `story-${story.id}`,
    kind: 'story',
    label: `${story.asA} / ${story.iWant}`,
    status: story.status,
    referenceId: story.id,
    children: [...storyChildren, ...acceptanceChildren],
    meta: {
      hiddenStoryChildren: storyChildrenCollapsed ? story.childStoryIds.length : 0,
      hiddenAcceptanceTests: acceptanceCollapsed ? story.acceptanceTestIds.length : 0
    },
    controls: {
      storyChildrenCollapsed: storyChildrenCollapsed,
      storyChildCount: story.childStoryIds.length,
      acceptanceCollapsed: acceptanceCollapsed,
      acceptanceCount: story.acceptanceTestIds.length
    }
  };
}

function createAcceptanceNode(test: AcceptanceTest): MindmapTreeNode {
  return {
    id: `acceptance-${test.id}`,
    kind: 'acceptance',
    label: test.title || `${test.given} → ${test.then}`,
    status: test.status,
    referenceId: test.id,
    children: []
  };
}

interface EdgeDecoration {
  tone: string;
  className: string;
  animated: boolean;
}

function collectEdges(node: MindmapTreeNode): Edge[] {
  const edges: Edge[] = [];
  for (const child of node.children) {
    const decoration = resolveEdgeDecoration(node.kind, child.kind);
    edges.push({
      id: `${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      animated: decoration.animated,
      className: decoration.className,
      style: { stroke: decoration.tone, strokeWidth: 2 }
    });
    edges.push(...collectEdges(child));
  }
  return edges;
}

function resolveEdgeDecoration(
  parent: MindmapTreeNode['kind'],
  child: MindmapTreeNode['kind']
): EdgeDecoration {
  if (parent === 'story' && child === 'story') {
    return {
      tone: '#38bdf8',
      className: 'edge-story-hierarchy',
      animated: false
    };
  }
  if (child === 'acceptance') {
    return {
      tone: '#f97316',
      className: 'edge-acceptance-link',
      animated: true
    };
  }
  return {
    tone: '#c084fc',
    className: 'edge-merge-request',
    animated: false
  };
}

function positionTree(root: MindmapTreeNode): PositionedNode[] {
  const positioned: PositionedNode[] = [];

  function countLeaves(node: MindmapTreeNode): number {
    if (node.children.length === 0) return 1;
    return node.children.map(countLeaves).reduce((acc, value) => acc + value, 0);
  }

  function assign(node: MindmapTreeNode, depth: number, start: number, end: number) {
    const angle = (start + end) / 2;
    positioned.push({ node, depth, angle });

    if (node.children.length === 0) {
      return;
    }

    const total = node.children.map(countLeaves);
    const totalLeaves = total.reduce((acc, value) => acc + value, 0);
    let current = start;

    node.children.forEach((child, index) => {
      const fraction = total[index] / totalLeaves;
      const childStart = current;
      const childEnd = current + (end - start) * fraction;
      assign(child, depth + 1, childStart, childEnd);
      current = childEnd;
    });
  }

  assign(root, 0, -Math.PI + 0.35, Math.PI - 0.35);

  return positioned;
}

function createFlowNode({ node, depth, angle }: PositionedNode): Node<MindmapNodeData> {
  const radius = depth * RADIUS_STEP;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);

  const tone =
    node.kind === 'mergeRequest'
      ? 'tone-mr'
      : node.kind === 'story'
      ? `tone-story tone-story--${node.status}`
      : `tone-acceptance tone-acceptance--${node.status}`;

  return {
    id: node.id,
    type: 'mindmap',
    position: { x, y },
    data: {
      label: node.label,
      status: node.status,
      kind: node.kind,
      tone,
      referenceId: node.referenceId,
      meta: node.meta,
      controls: node.controls
    }
  };
}
