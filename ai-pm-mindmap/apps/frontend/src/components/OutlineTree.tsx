import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import type { AcceptanceTest } from '@ai-pm-mindmap/shared';
import type { TreeNode } from '../store/useStoryStore';
import { selectCurrentMergeRequest, useStoryStore } from '../store/useStoryStore';
import { useTreeNavigation } from '../hooks/useTreeNavigation';

interface OutlineTreeProps {
  onPersistExpansion?: (expanded: Record<string, boolean>) => void;
}

export function OutlineTree({ onPersistExpansion }: OutlineTreeProps) {
  const {
    tree,
    expanded,
    toggleExpanded,
    selectStory,
    selectedStoryId,
    setExpanded,
    tests
  } = useStoryStore((state) => ({
    tree: state.tree,
    expanded: state.expanded,
    toggleExpanded: state.toggleExpanded,
    selectStory: state.selectStory,
    selectedStoryId: state.selectedStoryId,
    setExpanded: state.setExpanded,
    tests: state.tests
  }));
  const selectedMr = useStoryStore((state) => selectCurrentMergeRequest(state));

  const navigation = useTreeNavigation(tree, {
    expanded,
    onSelect: (id) => selectStory(id),
    onToggle: (id) => toggleExpanded(id)
  });

  const nodes = useMemo(() => tree, [tree]);
  const testsByStory = useMemo(() => {
    const map = new Map<string, AcceptanceTest[]>();
    tests.forEach((test) => {
      const existing = map.get(test.storyId) ?? [];
      existing.push(test);
      map.set(test.storyId, existing);
    });
    return map;
  }, [tests]);

  useEffect(() => {
    if (!selectedMr) return;
    const key = `mr:${selectedMr.id}`;
    if (expanded[key] === undefined) {
      const next = { ...expanded, [key]: true };
      setExpanded(next);
      onPersistExpansion?.(next);
    }
  }, [selectedMr, expanded, setExpanded, onPersistExpansion]);

  const rootKey = selectedMr ? `mr:${selectedMr.id}` : null;
  const rootExpanded = rootKey ? expanded[rootKey] ?? true : true;

  const handleToggle = (node: TreeNode, recursive: boolean) => {
    if (recursive) {
      const clone = { ...expanded };
      const next = !expanded[node.id];
      applyRecursive(node, next, clone);
      setExpanded(clone);
      onPersistExpansion?.(clone);
    } else {
      toggleExpanded(node.id);
      const clone = { ...expanded, [node.id]: !expanded[node.id] };
      onPersistExpansion?.(clone);
    }
  };

  const handleRootToggle = (recursive: boolean) => {
    if (!rootKey) return;
    const next = !rootExpanded;
    const clone = { ...expanded, [rootKey]: next };
    if (recursive) {
      nodes.forEach((node) => applyRecursive(node, next, clone));
    }
    setExpanded(clone);
    onPersistExpansion?.(clone);
  };

  const hasStories = nodes.length > 0;
  const rootCard = selectedMr ? (
    <div className="story-node root-node" aria-hidden>
      {hasStories ? (
        <button
          type="button"
          className="toggle"
          aria-label={rootExpanded ? 'Collapse stories' : 'Expand stories'}
          onClick={(event) => {
            event.stopPropagation();
            handleRootToggle(event.shiftKey);
          }}
        >
          {rootExpanded ? '▾' : '▸'}
        </button>
      ) : (
        <span className="node-spacer" aria-hidden />
      )}
      <span className="node-chip root">MR</span>
      <div className="node-content">
        <div className="node-title">{selectedMr.title}</div>
        <div className="node-subtitle">{selectedMr.id}</div>
      </div>
    </div>
  ) : null;

  return (
    <div className="panel tree-panel">
      <div className="tree-container">
        {!selectedMr ? (
          <div className="empty-state">No merge request selected</div>
        ) : !hasStories ? (
          <div className="tree-layout">
            <div className="root-column">{rootCard}</div>
            <div className="branches-column empty">
              <div className="empty-state">No stories yet</div>
            </div>
          </div>
        ) : (
          <div className="tree-layout">
            <div className="root-column">{rootCard}</div>
            <div className={clsx('branches-column', { collapsed: !rootExpanded })}>
              {rootExpanded && (
                <ul
                  className="story-tree"
                  role="tree"
                  tabIndex={0}
                  aria-label="User stories"
                  onKeyDown={navigation.onKeyDown}
                >
                  {nodes.map((node, index) => renderNode(node, 0, index === nodes.length - 1))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function renderNode(node: TreeNode, depth: number, isLast: boolean): JSX.Element {
    const storyTests = testsByStory.get(node.id) ?? [];
    const combined = [
      ...node.children.map((child) => ({ type: 'story' as const, value: child })),
      ...storyTests.map((test) => ({ type: 'test' as const, value: test }))
    ];
    const hasChildren = combined.length > 0;
    const isExpanded = expanded[node.id];
    const isFocused = navigation.focused === node.id;
    const isSelected = selectedStoryId === node.id;
    const isLeaf = !hasChildren || !isExpanded;
    const itemClass = clsx('tree-item', {
      last: isLast,
      leaf: isLeaf
    });
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        className={itemClass}
        data-depth={depth}
      >
        <div
          className={clsx('story-node', {
            focused: isFocused,
            selected: isSelected
          })}
          onMouseEnter={() => navigation.setFocused(node.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              className="toggle"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={(event) => handleToggle(node, event.shiftKey)}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="node-spacer" aria-hidden />
          )}
          <span className="node-chip">US</span>
          <button
            type="button"
            className="title"
            onClick={() => selectStory(node.id)}
            aria-selected={isSelected}
          >
            {node.title}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <ul role="group">
            {combined.map((item, index) => {
              const lastChild = index === combined.length - 1;
              if (item.type === 'story') {
                return renderNode(item.value, depth + 1, lastChild);
              }
              return renderTest(item.value, depth + 1, lastChild);
            })}
          </ul>
        )}
      </li>
    );
  }

  function renderTest(test: AcceptanceTest, depth: number, isLast: boolean): JSX.Element {
    const itemClass = clsx('tree-item', 'test', {
      last: isLast,
      leaf: true
    });
    return (
      <li key={test.id} className={itemClass} role="none" data-depth={depth}>
        <div className="story-node test-node">
          <span className="node-spacer" aria-hidden />
          <span className="node-chip test">AT</span>
          <span className="title read-only">{test.title}</span>
        </div>
      </li>
    );
  }
}

function applyRecursive(node: TreeNode, next: boolean, map: Record<string, boolean>) {
  map[node.id] = next;
  node.children.forEach((child) => applyRecursive(child, next, map));
}
