import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { RollupResult } from '@ai-pm/shared';
import { useWorkspaceStore } from '../../state/useWorkspaceStore.js';

interface VisibleNode {
  storyId: string;
  depth: number;
  label: string;
  title: string;
  status: string;
  hasChildren: boolean;
  rollup: RollupResult;
}

function flatten(
  tree: RollupResult[],
  expanded: Record<string, boolean>,
  prefix: number[] = []
): VisibleNode[] {
  const list: VisibleNode[] = [];
  tree.forEach((node, index) => {
    const label = `US${[...prefix, index + 1].join('-')}`;
    list.push({
      storyId: node.storyId,
      depth: prefix.length,
      label,
      title: node.storyId,
      status: node.status,
      hasChildren: node.children.length > 0,
      rollup: node
    });
    if (node.children.length > 0 && expanded[node.storyId]) {
      list.push(...flatten(node.children, expanded, [...prefix, index + 1]));
    }
  });
  return list;
}

export default function OutlineTree() {
  const tree = useWorkspaceStore((state) => state.tree);
  const stories = useWorkspaceStore((state) => state.stories);
  const expanded = useWorkspaceStore((state) => state.expanded);
  const selectStory = useWorkspaceStore((state) => state.selectStory);
  const selectedStoryId = useWorkspaceStore((state) => state.selectedStoryId);
  const toggleExpand = useWorkspaceStore((state) => state.toggleExpand);
  const expandAll = useWorkspaceStore((state) => state.expandAll);
  const collapseAll = useWorkspaceStore((state) => state.collapseAll);
  const expandToDepth = useWorkspaceStore((state) => state.expandToDepth);
  const addChild = useWorkspaceStore((state) => state.addChild);
  const addTest = useWorkspaceStore((state) => state.addTest);

  const nodes = useMemo(() => flatten(tree, expanded), [tree, expanded]);
  const containerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 10
  });

  const onToggle = (storyId: string, recursive = false) => {
    const next = !(expanded[storyId] ?? false);
    if (recursive) {
      const story = stories[storyId];
      if (!story) return;
      const traverse = (id: string, open: boolean) => {
        toggleExpand(id, open);
        stories[id]?.childrenIds.forEach((childId) => traverse(childId, open));
      };
      traverse(storyId, next);
    } else {
      toggleExpand(storyId, next);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = nodes.findIndex((node) => node.storyId === selectedStoryId);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = nodes[Math.min(nodes.length - 1, Math.max(0, currentIndex + 1))];
      if (next) selectStory(next.storyId);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = nodes[Math.max(0, currentIndex - 1)];
      if (next) selectStory(next.storyId);
    }
    if (event.key === 'ArrowRight' && selectedStoryId) {
      event.preventDefault();
      toggleExpand(selectedStoryId, true);
    }
    if (event.key === 'ArrowLeft' && selectedStoryId) {
      event.preventDefault();
      toggleExpand(selectedStoryId, false);
    }
    if (event.key === 'A' && selectedStoryId) {
      event.preventDefault();
      addChild(selectedStoryId);
    }
    if (event.key === 'S') {
      event.preventDefault();
      addChild(null);
    }
    if (event.key === 'T' && selectedStoryId) {
      event.preventDefault();
      addTest(selectedStoryId);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 bg-slate-800 rounded" onClick={() => expandAll()}>
          Expand All
        </button>
        <button className="px-2 py-1 bg-slate-800 rounded" onClick={() => collapseAll()}>
          Collapse All
        </button>
        <button className="px-2 py-1 bg-slate-800 rounded" onClick={() => expandToDepth(2)}>
          Depth 2
        </button>
      </div>
      <div
        ref={containerRef}
        role="tree"
        aria-label="User story outline"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-auto focus:outline-none focus:ring-2 focus:ring-primary/60 rounded"
      >
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const node = nodes[virtualRow.index];
            const story = stories[node.storyId];
            if (!story) return null;
            const selected = node.storyId === selectedStoryId;
            return (
              <div
                key={node.storyId}
                role="treeitem"
                aria-selected={selected}
                aria-expanded={expanded[node.storyId] ?? false}
                aria-level={node.depth + 1}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`
                }}
                className={`flex items-center gap-2 px-2 py-2 border-b border-slate-800 cursor-pointer ${
                  selected ? 'bg-slate-800' : 'hover:bg-slate-800/60'
                }`}
                onClick={(event) => {
                  const recursive = event.shiftKey;
                  if (node.hasChildren) {
                    onToggle(node.storyId, recursive);
                  }
                  selectStory(node.storyId);
                }}
              >
                <span style={{ paddingLeft: node.depth * 16 }}>
                  {node.hasChildren ? (expanded[node.storyId] ? '▼' : '▶') : '•'}
                </span>
                <span className="font-mono text-xs text-slate-400">{node.label}</span>
                <span className="font-semibold">{story.title}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    node.status === 'Approved'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : node.status === 'Ready'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {node.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
