import { useMemo } from 'react';
import type { TreeNode } from '../store/useStoryStore';
import { useStoryStore } from '../store/useStoryStore';
import { useTreeNavigation } from '../hooks/useTreeNavigation';

interface OutlineTreeProps {
  onPersistExpansion?: (expanded: Record<string, boolean>) => void;
}

export function OutlineTree({ onPersistExpansion }: OutlineTreeProps) {
  const { tree, expanded, toggleExpanded, selectStory, selectedStoryId, setExpanded } = useStoryStore((state) => ({
    tree: state.tree,
    expanded: state.expanded,
    toggleExpanded: state.toggleExpanded,
    selectStory: state.selectStory,
    selectedStoryId: state.selectedStoryId,
    setExpanded: state.setExpanded
  }));

  const navigation = useTreeNavigation(tree, {
    expanded,
    onSelect: (id) => selectStory(id),
    onToggle: (id) => toggleExpanded(id)
  });

  const nodes = useMemo(() => tree, [tree]);

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

  return (
    <div
      className="tree-container"
      role="tree"
      tabIndex={0}
      aria-label="User stories"
      onKeyDown={navigation.onKeyDown}
    >
      {nodes.length === 0 ? (
        <div className="empty-state">No stories yet</div>
      ) : (
        <ul className="story-tree">{nodes.map((node) => renderNode(node, 0))}</ul>
      )}
    </div>
  );

  function renderNode(node: TreeNode, depth: number): JSX.Element {
    const isExpanded = expanded[node.id];
    const isFocused = navigation.focused === node.id;
    const isSelected = selectedStoryId === node.id;
    return (
      <li key={node.id} role="treeitem" aria-expanded={node.children.length > 0 ? isExpanded : undefined}>
        <div
          className={`story-node ${isFocused ? 'focused' : ''}`}
          style={{ marginLeft: depth * 16 }}
          onMouseEnter={() => navigation.setFocused(node.id)}
        >
          {node.children.length > 0 ? (
            <button
              className="toggle"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={(event) => handleToggle(node, event.shiftKey)}
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span style={{ width: 24 }} />
          )}
          <button
            className="title"
            onClick={() => selectStory(node.id)}
            aria-selected={isSelected}
          >
            {node.title}
          </button>
        </div>
        {node.children.length > 0 && isExpanded && (
          <ul role="group">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  }
}

function applyRecursive(node: TreeNode, next: boolean, map: Record<string, boolean>) {
  map[node.id] = next;
  node.children.forEach((child) => applyRecursive(child, next, map));
}
